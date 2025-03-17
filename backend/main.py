from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import (
    APIError,
    api_error_handler,
    validation_error_handler,
    http_exception_handler
)
from app.core.security import setup_security_headers, setup_rate_limiting
from app.core.monitoring import setup_monitoring

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for Lead Generation and Sales Platform",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up security headers and rate limiting
setup_security_headers(app)
setup_rate_limiting(app, requests_per_minute=60)

# Set up monitoring
setup_monitoring(app)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add exception handlers
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(ValidationError, validation_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 