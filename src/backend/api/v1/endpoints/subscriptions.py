from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from ....models.payment import (
    SubscriptionPlan,
    Subscription,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse
)
from ....services.subscription_service import SubscriptionService
from ....core.auth import get_current_user, get_current_admin
from ....models.user import User
from ....core.cache import rate_limit, cached

router = APIRouter()

# Plan Management Endpoints (Admin Only)
@router.post("/plans", response_model=SubscriptionPlan)
async def create_plan(
    name: str,
    price_id: str,
    amount: float,
    currency: str = "usd",
    interval: str = "month",
    features: List[str] = [],
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends()
) -> SubscriptionPlan:
    """Create a new subscription plan. Admin only."""
    return await subscription_service.create_plan(
        name=name,
        price_id=price_id,
        amount=amount,
        currency=currency,
        interval=interval,
        features=features
    )

@router.get("/plans", response_model=List[SubscriptionPlan])
@cached(key_prefix="subscription_plans", expire=3600)  # Cache for 1 hour
async def list_plans(
    active_only: bool = True,
    subscription_service: SubscriptionService = Depends()
) -> List[SubscriptionPlan]:
    """List available subscription plans."""
    return await subscription_service.list_plans(active_only=active_only)

@router.get("/plans/{plan_id}", response_model=SubscriptionPlan)
@cached(key_prefix="subscription_plan", expire=3600)  # Cache for 1 hour
async def get_plan(
    plan_id: str,
    subscription_service: SubscriptionService = Depends()
) -> SubscriptionPlan:
    """Get subscription plan by ID."""
    plan = await subscription_service.get_plan(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return plan

@router.put("/plans/{plan_id}", response_model=SubscriptionPlan)
async def update_plan(
    plan_id: str,
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends()
) -> SubscriptionPlan:
    """Update subscription plan. Admin only."""
    plan = await subscription_service.update_plan(plan_id, updates)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return plan

@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends()
) -> Dict[str, str]:
    """Delete subscription plan. Admin only."""
    try:
        if await subscription_service.delete_plan(plan_id):
            return {"message": "Plan deleted successfully"}
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Subscription Management Endpoints
@router.post("", response_model=SubscriptionResponse)
@rate_limit(max_requests=10, window=3600)  # 10 subscription creations per hour
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
) -> SubscriptionResponse:
    """Create a new subscription."""
    try:
        subscription = await subscription_service.create_subscription(
            str(current_user.id),
            subscription_data
        )
        
        plan = await subscription_service.get_plan(subscription.plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
        
        return SubscriptionResponse(
            id=subscription.id,
            user_id=subscription.user_id,
            plan=plan,
            status=subscription.status,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            cancel_at_period_end=subscription.cancel_at_period_end,
            canceled_at=subscription.canceled_at,
            trial_end=subscription.trial_end,
            quantity=subscription.quantity,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/current", response_model=Optional[SubscriptionResponse])
@cached(key_prefix="current_subscription", expire=300)  # Cache for 5 minutes
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
) -> Optional[SubscriptionResponse]:
    """Get current user's subscription."""
    subscription = await subscription_service.get_active_subscription(
        str(current_user.id)
    )
    if not subscription:
        return None
    
    plan = await subscription_service.get_plan(subscription.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    return SubscriptionResponse(
        id=subscription.id,
        user_id=subscription.user_id,
        plan=plan,
        status=subscription.status,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        canceled_at=subscription.canceled_at,
        trial_end=subscription.trial_end,
        quantity=subscription.quantity,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at
    )

@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    update_data: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
) -> SubscriptionResponse:
    """Update subscription."""
    try:
        # Verify ownership
        subscription = await subscription_service.get_subscription(subscription_id)
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        if subscription.user_id != str(current_user.id) and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this subscription"
            )
        
        updated = await subscription_service.update_subscription(
            subscription_id,
            update_data
        )
        
        plan = await subscription_service.get_plan(updated.plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
        
        return SubscriptionResponse(
            id=updated.id,
            user_id=updated.user_id,
            plan=plan,
            status=updated.status,
            current_period_start=updated.current_period_start,
            current_period_end=updated.current_period_end,
            cancel_at_period_end=updated.cancel_at_period_end,
            canceled_at=updated.canceled_at,
            trial_end=updated.trial_end,
            quantity=updated.quantity,
            created_at=updated.created_at,
            updated_at=updated.updated_at
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    immediate: bool = False,
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
) -> Dict[str, str]:
    """Cancel subscription."""
    try:
        # Verify ownership
        subscription = await subscription_service.get_subscription(subscription_id)
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        if subscription.user_id != str(current_user.id) and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this subscription"
            )
        
        await subscription_service.cancel_subscription(
            subscription_id,
            immediate=immediate
        )
        
        return {
            "message": "Subscription cancelled successfully"
            if immediate
            else "Subscription will be cancelled at the end of the billing period"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/stats", response_model=Dict[str, Any])
@cached(key_prefix="subscription_stats", expire=3600)  # Cache for 1 hour
async def get_subscription_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_admin),
    subscription_service: SubscriptionService = Depends()
) -> Dict[str, Any]:
    """Get subscription statistics. Admin only."""
    return await subscription_service.get_subscription_stats(
        start_date=start_date,
        end_date=end_date
    ) 