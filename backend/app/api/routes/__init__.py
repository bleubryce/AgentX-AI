from fastapi import APIRouter
from app.api.routes import leads, auth, analytics

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"]) 