from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from .base import BaseDBModel

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_superuser: bool = False
    roles: List[str] = ["user"]
    is_realtor: bool = False
    realtor_license: Optional[str] = None
    brokerage: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    roles: Optional[List[str]] = None
    is_realtor: Optional[bool] = None
    realtor_license: Optional[str] = None
    brokerage: Optional[str] = None

class UserInDB(UserBase, BaseDBModel):
    hashed_password: str
    last_login: Optional[str] = None
    failed_login_attempts: int = 0
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[str] = None
    refresh_token: Optional[str] = None
    refresh_token_expires: Optional[str] = None
    active_sessions: List[str] = []

class User(UserBase, BaseDBModel):
    pass

class UserResponse(User):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    refresh_token_expires_in: int

class TokenPayload(BaseModel):
    sub: str
    exp: int
    iat: int
    type: str = "access"
    session_id: str

class RefreshToken(BaseModel):
    refresh_token: str

class SessionInfo(BaseModel):
    session_id: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    last_active: str
    created_at: str 