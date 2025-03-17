from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Any, List
import uuid
from ....core.deps import create_access_token, get_current_user, get_current_realtor
from ....core.config import settings
from ....models.user import (
    User, UserCreate, UserResponse, Token, RefreshToken,
    SessionInfo
)
from ....services.user_service import UserService
from ....core.security import SecurityUtils
from ....core.auth import (
    get_current_user,
    AuthMiddleware
)
from ....core.cache import rate_limit

router = APIRouter()

@router.post("/register", response_model=User)
@rate_limit(max_requests=10, window=3600)  # 10 registrations per hour
async def register(
    user_data: UserCreate,
    user_service: UserService = Depends()
) -> Any:
    """Register a new user."""
    return await user_service.create_user(user_data)

@router.post("/login", response_model=Token)
@rate_limit(max_requests=5, window=300)  # 5 attempts per 5 minutes
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends()
) -> Any:
    """Login user and return tokens."""
    # Get device info
    device_info = {
        "ip": request.client.host,
        "user_agent": request.headers.get("user-agent"),
        "device": request.headers.get("sec-ch-ua")
    }
    
    # Authenticate user
    user, session_id, refresh_expires = await user_service.authenticate(
        form_data.username,
        form_data.password,
        device_info
    )
    
    # Create access token
    access_token = SecurityUtils.create_access_token(
        user.id,
        session_id,
        user.roles
    )
    
    # Create refresh token
    refresh_token, _ = SecurityUtils.create_refresh_token(
        user.id,
        session_id
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_token_expires_in=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: RefreshToken,
    user_service: UserService = Depends()
) -> Any:
    """Refresh access token."""
    try:
        # Verify refresh token
        token_data = SecurityUtils.verify_token(
            refresh_token.refresh_token,
            token_type="refresh"
        )
        
        # Get user
        user = await user_service.get_by_id(token_data.sub)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify session is still valid
        if not await user_service.is_valid_session(
            user.id,
            token_data.session_id
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been invalidated"
            )
        
        # Create new access token
        access_token = SecurityUtils.create_access_token(
            user.id,
            token_data.session_id,
            user.roles
        )
        
        # Create new refresh token
        new_refresh_token, refresh_expires = SecurityUtils.create_refresh_token(
            user.id,
            token_data.session_id
        )
        
        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token_expires_in=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """Logout user and invalidate current session."""
    # Get current session ID from token
    token_data = SecurityUtils.verify_token(current_user.access_token)
    
    # Invalidate session
    await user_service.invalidate_session(
        current_user.id,
        token_data.session_id
    )
    
    return {"message": "Successfully logged out"}

@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """Logout user from all sessions."""
    await user_service.invalidate_all_sessions(current_user.id)
    return {"message": "Successfully logged out from all sessions"}

@router.post("/verify-email/{token}")
@rate_limit(max_requests=5, window=3600)  # 5 attempts per hour
async def verify_email(
    token: str,
    user_service: UserService = Depends()
) -> Any:
    """Verify user's email address."""
    if await user_service.verify_email(token):
        return {"message": "Email successfully verified"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired verification token"
    )

@router.post("/request-password-reset")
@rate_limit(max_requests=3, window=3600)  # 3 attempts per hour
async def request_password_reset(
    email: str,
    user_service: UserService = Depends()
) -> Any:
    """Request password reset token."""
    token = await user_service.request_password_reset(email)
    if token:
        # TODO: Send email with reset token
        return {"message": "Password reset instructions sent to email"}
    return {"message": "If email exists, password reset instructions will be sent"}

@router.post("/reset-password/{token}")
@rate_limit(max_requests=3, window=3600)  # 3 attempts per hour
async def reset_password(
    token: str,
    new_password: str,
    user_service: UserService = Depends()
) -> Any:
    """Reset password using reset token."""
    if await user_service.reset_password(token, new_password):
        return {"message": "Password successfully reset"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token"
    )

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get current user information."""
    return current_user

@router.get("/sessions", response_model=list[SessionInfo])
async def get_active_sessions(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get user's active sessions."""
    return current_user.active_sessions

@router.get("/sessions", response_model=List[SessionInfo])
async def list_active_sessions(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """List all active sessions for the current user."""
    return await user_service.get_active_sessions(current_user.id)

@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """Terminate a specific session."""
    success = await user_service.remove_session(current_user.id, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return {"message": "Session terminated successfully"}

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    user_service: UserService = Depends()
) -> Any:
    """Register new user."""
    user = await user_service.get_user_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = await user_service.create_user(user_in)
    return user

@router.post("/password-reset")
async def request_password_reset(
    email: str,
    user_service: UserService = Depends()
) -> Any:
    """Request password reset."""
    user = await user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    token = await user_service.set_password_reset_token(user.id)
    # TODO: Send password reset email
    return {"message": "Password reset email sent"}

@router.post("/password-reset/{token}")
async def reset_password(
    token: str,
    new_password: str,
    user_service: UserService = Depends()
) -> Any:
    """Reset password using token."""
    # TODO: Implement password reset logic
    return {"message": "Password reset successful"}

@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """Update current user."""
    user = await user_service.update_user(current_user.id, user_update)
    return user

@router.post("/me/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """Change current user's password."""
    user = await user_service.authenticate_user(current_user.email, current_password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    success = await user_service.reset_password(current_user.id, new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update password"
        )
    
    return {"message": "Password updated successfully"} 