from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
from pydantic import ValidationError

class APIError(HTTPException):
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code)
        self.message = message
        self.error_code = error_code
        self.details = details or {}

class DatabaseError(APIError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            error_code="DATABASE_ERROR",
            details=details
        )

class NotFoundError(APIError):
    def __init__(self, resource: str, resource_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"{resource} with id {resource_id} not found",
            error_code="RESOURCE_NOT_FOUND",
            details={"resource": resource, "id": resource_id}
        )

class ValidationAPIError(APIError):
    def __init__(self, errors: list):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message="Validation error",
            error_code="VALIDATION_ERROR",
            details={"errors": errors}
        )

class AuthenticationError(APIError):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            error_code="AUTHENTICATION_ERROR"
        )

class AuthorizationError(APIError):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            error_code="AUTHORIZATION_ERROR"
        )

async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation error",
                "details": {
                    "errors": exc.errors()
                }
            }
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
            }
        }
    ) 