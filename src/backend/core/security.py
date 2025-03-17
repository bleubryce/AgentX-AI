from datetime import datetime, timedelta
from typing import Optional, Union
import uuid
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status
from .config import settings
from ..models.user import TokenPayload

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityUtils:
    """Security utilities for authentication and authorization."""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generate password hash."""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(
        subject: Union[str, int],
        session_id: str,
        roles: list[str],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode = {
            "sub": str(subject),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
            "session_id": session_id,
            "roles": roles
        }
        
        return jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
    
    @staticmethod
    def create_refresh_token(
        subject: Union[str, int],
        session_id: str
    ) -> tuple[str, datetime]:
        """Create refresh token and its expiration."""
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        
        to_encode = {
            "sub": str(subject),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
            "session_id": session_id
        }
        
        token = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        return token, expire
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> TokenPayload:
        """Verify JWT token and return payload."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type}",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            token_data = TokenPayload(
                sub=payload["sub"],
                exp=payload["exp"],
                iat=payload["iat"],
                type=payload["type"],
                session_id=payload["session_id"],
                roles=payload.get("roles", ["user"])
            )
            
            return token_data
            
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def generate_verification_token() -> str:
        """Generate email verification token."""
        return str(uuid.uuid4())
    
    @staticmethod
    def generate_password_reset_token() -> str:
        """Generate password reset token."""
        return str(uuid.uuid4())
    
    @staticmethod
    def generate_session_id() -> str:
        """Generate unique session ID."""
        return str(uuid.uuid4())
    
    @staticmethod
    def is_token_expired(exp_timestamp: int) -> bool:
        """Check if token is expired."""
        return datetime.utcnow().timestamp() > exp_timestamp
    
    @staticmethod
    def get_token_expiration(token: str) -> datetime:
        """Get token expiration datetime."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            return datetime.fromtimestamp(payload["exp"])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            ) 