from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from ....core.auth import get_current_admin
from ....models.user import User
from ....services.subscription_service import SubscriptionService
from ....services.payment_service import PaymentService
from ....services.usage_service import UsageService
from ....core.cache import cached

router = APIRouter()

@router.get("/subscriptions/overview")
@cached(key_prefix="subscription_overview", expire=300)  # Cache for 5 minutes
async def get_subscription_overview(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends(),
    payment_service: PaymentService = Depends()
) -> Dict[str, Any]:
    """Get subscription overview metrics."""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # Get subscription metrics
    subscription_metrics = await subscription_service.get_subscription_metrics(
        start_date=start_date,
        end_date=end_date
    )

    # Get revenue metrics
    revenue_metrics = await payment_service.get_revenue_metrics(
        start_date=start_date,
        end_date=end_date
    )

    return {
        "period": {
            "start": start_date,
            "end": end_date
        },
        "subscriptions": subscription_metrics,
        "revenue": revenue_metrics
    }

@router.get("/subscriptions/trends")
@cached(key_prefix="subscription_trends", expire=300)
async def get_subscription_trends(
    period: str = Query("30d", regex="^(7d|30d|90d|365d)$"),
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends()
) -> Dict[str, Any]:
    """Get subscription trend data."""
    periods = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "365d": 365
    }
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=periods[period])
    
    return await subscription_service.get_subscription_trends(
        start_date=start_date,
        end_date=end_date
    )

@router.get("/revenue/breakdown")
@cached(key_prefix="revenue_breakdown", expire=300)
async def get_revenue_breakdown(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    group_by: str = Query("plan", regex="^(plan|interval|status)$"),
    current_user: User = Depends(get_current_admin),
    payment_service: PaymentService = Depends()
) -> Dict[str, Any]:
    """Get revenue breakdown by different dimensions."""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    return await payment_service.get_revenue_breakdown(
        start_date=start_date,
        end_date=end_date,
        group_by=group_by
    )

@router.get("/usage/metrics")
@cached(key_prefix="usage_metrics", expire=300)
async def get_usage_metrics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    metric_names: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_admin),
    usage_service: UsageService = Depends()
) -> Dict[str, Any]:
    """Get usage metrics across all users."""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    return await usage_service.get_aggregated_usage_metrics(
        start_date=start_date,
        end_date=end_date,
        metric_names=metric_names
    )

@router.get("/churn/analysis")
@cached(key_prefix="churn_analysis", expire=300)
async def get_churn_analysis(
    period: str = Query("30d", regex="^(30d|90d|365d)$"),
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends()
) -> Dict[str, Any]:
    """Get churn analysis metrics."""
    periods = {
        "30d": 30,
        "90d": 90,
        "365d": 365
    }
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=periods[period])
    
    return await subscription_service.get_churn_metrics(
        start_date=start_date,
        end_date=end_date
    )

@router.get("/customer/lifetime-value")
@cached(key_prefix="customer_ltv", expire=3600)  # Cache for 1 hour
async def get_customer_lifetime_value(
    current_user: User = Depends(get_current_admin),
    payment_service: PaymentService = Depends()
) -> Dict[str, Any]:
    """Get customer lifetime value metrics."""
    return await payment_service.get_customer_lifetime_value() 