from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator, constr
from .base import BaseDBModel

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    full_name: constr(min_length=2, max_length=100) = Field(..., description="User's full name")
    is_active: bool = Field(default=True, description="Whether the user account is active")
    is_superuser: bool = Field(default=False, description="Whether the user has superuser privileges")
    roles: List[str] = Field(default=["user"], description="User's roles")
    is_realtor: bool = Field(default=False, description="Whether the user is a realtor")
    realtor_license: Optional[str] = Field(None, description="Realtor's license number")
    brokerage: Optional[str] = Field(None, description="Realtor's brokerage name")
    phone: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$', description="User's phone number")
    timezone: str = Field(default="UTC", description="User's timezone")

    @validator('roles')
    def validate_roles(cls, v):
        valid_roles = {"user", "admin", "realtor", "agent"}
        if not all(role in valid_roles for role in v):
            raise ValueError(f"Invalid roles. Must be one of: {valid_roles}")
        return v

    @validator('realtor_license')
    def validate_realtor_license(cls, v, values):
        if values.get('is_realtor') and not v:
            raise ValueError("Realtor license is required for realtors")
        return v

class UserCreate(UserBase):
    password: constr(min_length=8) = Field(
        ...,
        description="User's password",
        regex=r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$'
    )

    @validator('password')
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in '@$!%*#?&' for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[constr(min_length=2, max_length=100)] = None
    password: Optional[constr(min_length=8)] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    roles: Optional[List[str]] = None
    is_realtor: Optional[bool] = None
    realtor_license: Optional[str] = None
    brokerage: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None

class UserInDB(UserBase, BaseDBModel):
    hashed_password: str = Field(..., description="Hashed password")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    failed_login_attempts: int = Field(default=0, description="Number of failed login attempts")
    password_reset_token: Optional[str] = Field(None, description="Password reset token")
    password_reset_expires: Optional[datetime] = Field(None, description="Password reset token expiration")
    refresh_token: Optional[str] = Field(None, description="Refresh token")
    refresh_token_expires: Optional[datetime] = Field(None, description="Refresh token expiration")
    active_sessions: List[str] = Field(default_factory=list, description="Active session IDs")
    last_password_change: Optional[datetime] = Field(None, description="Last password change timestamp")
    account_locked_until: Optional[datetime] = Field(None, description="Account lock expiration timestamp")
    verification_token: Optional[str] = Field(None, description="Email verification token")
    is_email_verified: bool = Field(default=False, description="Whether email is verified")

class User(UserBase, BaseDBModel):
    last_login: Optional[datetime] = None
    is_email_verified: bool = Field(default=False)

class UserResponse(User):
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class Token(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")
    refresh_token: str = Field(..., description="Refresh token")
    refresh_token_expires_in: int = Field(..., description="Refresh token expiration in seconds")

class TokenPayload(BaseModel):
    sub: str = Field(..., description="Subject (user ID)")
    exp: int = Field(..., description="Expiration timestamp")
    iat: int = Field(..., description="Issued at timestamp")
    type: str = Field(default="access", description="Token type")
    session_id: str = Field(..., description="Session ID")
    roles: List[str] = Field(default=["user"], description="User roles")

class RefreshToken(BaseModel):
    refresh_token: str = Field(..., description="Refresh token")

class SessionInfo(BaseModel):
    session_id: str = Field(..., description="Session ID")
    device_info: Optional[str] = Field(None, description="Device information")
    ip_address: Optional[str] = Field(None, description="IP address")
    last_active: datetime = Field(..., description="Last activity timestamp")
    created_at: datetime = Field(..., description="Session creation timestamp")
    user_agent: Optional[str] = Field(None, description="User agent string")
    location: Optional[str] = Field(None, description="Geographic location")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()} 