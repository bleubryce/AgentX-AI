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

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends()
) -> Any:
    """OAuth2 compatible token login with refresh token."""
    user = await user_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        await user_service.increment_failed_login_attempts(user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Create access and refresh tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=7)
    
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "type": "access",
            "session_id": session_id
        },
        expires_delta=access_token_expires
    )
    
    refresh_token = create_access_token(
        data={
            "sub": str(user.id),
            "type": "refresh",
            "session_id": session_id
        },
        expires_delta=refresh_token_expires
    )
    
    # Store session information
    await user_service.add_session(
        user.id,
        session_id,
        request.client.host,
        request.headers.get("user-agent")
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_token": refresh_token,
        "refresh_token_expires_in": 7 * 24 * 60 * 60  # 7 days in seconds
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: RefreshToken,
    user_service: UserService = Depends()
) -> Any:
    """Refresh access token using refresh token."""
    try:
        payload = jwt.decode(
            refresh_token.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        
        if not user_id or not session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user = await user_service.get_user(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Verify session is still valid
        if not await user_service.verify_session(user_id, session_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "type": "access",
                "session_id": session_id
            },
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_token": refresh_token.refresh_token,
            "refresh_token_expires_in": 7 * 24 * 60 * 60
        }
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends()
) -> Any:
    """Logout user and invalidate session."""
    await user_service.remove_session(current_user.id)
    return {"message": "Successfully logged out"}

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

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get current user."""
    return current_user

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