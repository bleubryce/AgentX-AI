from fastapi import APIRouter
from .endpoints import auth, leads, market_analysis, payments, usage, agents

api_router = APIRouter()

# Include authentication endpoints
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"]
)

# Include lead generation endpoints
api_router.include_router(
    leads.router,
    prefix="/leads",
    tags=["leads"]
)

# Include market analysis endpoints
api_router.include_router(
    market_analysis.router,
    prefix="/market-analysis",
    tags=["market-analysis"]
)

# Include payment endpoints
api_router.include_router(
    payments.router,
    prefix="/payments",
    tags=["payments"]
)

# Include usage endpoints
api_router.include_router(
    usage.router,
    prefix="/usage",
    tags=["usage"]
)

# Include agent endpoints
api_router.include_router(
    agents.router,
    prefix="/agents",
    tags=["agents"]
) 