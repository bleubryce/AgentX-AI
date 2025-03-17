from typing import Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from .security import SecurityUtils
from ..models.user import User, TokenPayload
from ..services.user_service import UserService
from .cache import Cache

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/auth/login")

class AuthMiddleware:
    """Authentication middleware for protecting routes."""
    
    def __init__(self, user_service: UserService):
        self.user_service = user_service
    
    async def get_current_user(
        self,
        token: str = Depends(oauth2_scheme),
        required_roles: Optional[list[str]] = None
    ) -> User:
        """Get current authenticated user from token."""
        try:
            token_data = SecurityUtils.verify_token(token)
            
            # Check if token is expired
            if SecurityUtils.is_token_expired(token_data.exp):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Get user from cache or database
            cache_key = f"user:{token_data.sub}"
            user = await Cache.get(cache_key)
            
            if not user:
                user = await self.user_service.get_by_id(token_data.sub)
                if user:
                    await Cache.set(cache_key, user.dict())
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Convert dict to User model if from cache
            if isinstance(user, dict):
                user = User(**user)
            
            # Check if user is active
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inactive user"
                )
            
            # Verify session is still valid
            if not await self.user_service.is_valid_session(
                user.id,
                token_data.session_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session has been invalidated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check required roles
            if required_roles:
                if not any(role in user.roles for role in required_roles):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient permissions"
                    )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    def requires_auth(
        self,
        roles: Optional[list[str]] = None
    ) -> Callable:
        """Decorator for protecting routes with authentication."""
        async def wrapper(
            request: Request,
            user: User = Depends(get_current_user)
        ):
            # User is already authenticated by get_current_user
            # Just attach user to request for convenience
            request.state.user = user
            return user
        return wrapper

# Dependency for getting the current user in routes
async def get_current_user(
    auth: AuthMiddleware = Depends(),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency for getting the current authenticated user."""
    return await auth.get_current_user(token)

# Dependency for getting the current superuser
async def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency for getting the current superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

# Dependency for getting the current realtor
async def get_current_realtor(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency for getting the current realtor."""
    if not current_user.is_realtor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a realtor"
        )
    return current_user 