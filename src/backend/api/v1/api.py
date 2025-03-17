from fastapi import APIRouter
from .endpoints import (
    auth,
    users,
    payments,
    subscriptions,
    analytics,
    reports,
    agents,
    webhooks,
    leads
)

api_router = APIRouter()

# Auth routes
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# User routes
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)

# Payment routes
api_router.include_router(
    payments.router,
    prefix="/payments",
    tags=["Payments"]
)

# Subscription routes
api_router.include_router(
    subscriptions.router,
    prefix="/subscriptions",
    tags=["Subscriptions"]
)

# Analytics routes
api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Analytics"]
)

# Reports routes
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"]
)

# Agent routes
api_router.include_router(
    agents.router,
    prefix="/agents",
    tags=["Agents"]
)

# Lead routes
api_router.include_router(
    leads.router,
    prefix="/leads",
    tags=["Leads"]
)

# Webhooks routes
api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["Webhooks"]
) 