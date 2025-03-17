from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, BaseSettings, EmailStr, validator
from pydantic_settings import BaseSettings
import os
from functools import lru_cache

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Lead Generation Platform"
    VERSION: str = "1.0.0"
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Security Settings
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # MongoDB Settings
    MONGODB_URL: str
    MONGODB_DB_NAME: str = "lead_generation"
    
    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    # Email Settings
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    @validator("EMAILS_FROM_NAME")
    def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if not v:
            return values["PROJECT_NAME"]
        return v
    
    # AWS Settings
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = None
    
    # External API Settings
    OPENAI_API_KEY: Optional[str] = None
    RENTCAST_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_DEFAULT_REQUESTS: int = 100
    RATE_LIMIT_DEFAULT_WINDOW: int = 3600  # 1 hour
    
    # Cache Settings
    CACHE_DEFAULT_TIMEOUT: int = 3600  # 1 hour
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = [
        ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"
    ]
    
    # Subscription Plans
    SUBSCRIPTION_PLANS: Dict[str, Dict[str, Any]] = {
        "free": {
            "price": 0,
            "leads_per_month": 10,
            "features": ["basic_search", "lead_tracking"]
        },
        "pro": {
            "price": 49.99,
            "leads_per_month": 100,
            "features": [
                "basic_search",
                "lead_tracking",
                "advanced_analytics",
                "email_automation"
            ]
        },
        "enterprise": {
            "price": 199.99,
            "leads_per_month": -1,  # unlimited
            "features": [
                "basic_search",
                "lead_tracking",
                "advanced_analytics",
                "email_automation",
                "api_access",
                "dedicated_support"
            ]
        }
    }
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

def validate_settings() -> None:
    """Validate required settings on startup."""
    required_settings = {
        "SECRET_KEY": "Required for JWT token generation",
        "MONGODB_URL": "Required for database connection",
    }
    
    missing_settings = []
    for setting, description in required_settings.items():
        if not getattr(settings, setting, None):
            missing_settings.append(f"{setting}: {description}")
    
    if missing_settings:
        raise ValueError(
            "Missing required settings:\n" + "\n".join(missing_settings)
        ) 