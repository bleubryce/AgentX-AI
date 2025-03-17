from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
from fastapi import HTTPException
import time
from collections import defaultdict
from typing import DefaultDict, Tuple

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm="HS256"
    )
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        response = await call_next(request)
        
        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(), "
            "usb=()"
        )
        
        return response

def setup_security_headers(app: FastAPI) -> None:
    """Add security headers middleware to FastAPI application"""
    app.add_middleware(SecurityHeadersMiddleware)

class RateLimitExceeded(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )

class RateLimitingMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: FastAPI,
        requests_per_minute: int = 60
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: DefaultDict[str, list[float]] = defaultdict(list)
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        client_ip = request.client.host
        now = time.time()
        
        # Remove requests older than 1 minute
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < 60
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            raise RateLimitExceeded()
        
        # Add current request
        self.requests[client_ip].append(now)
        
        return await call_next(request)

def setup_rate_limiting(
    app: FastAPI,
    requests_per_minute: int = 60
) -> None:
    """Add rate limiting middleware to FastAPI application"""
    app.add_middleware(
        RateLimitingMiddleware,
        requests_per_minute=requests_per_minute
    ) 