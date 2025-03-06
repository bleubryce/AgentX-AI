from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from ....models.payment import (
    SubscriptionPlan, Subscription, PaymentTransaction,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    PaymentTransactionResponse
)
from ....services.payment_service import PaymentService
from ....core.deps import get_current_user
from ....models.user import User

router = APIRouter()

@router.get("/plans", response_model=List[SubscriptionPlan])
async def list_subscription_plans(
    payment_service: PaymentService = Depends()
) -> List[SubscriptionPlan]:
    """List available subscription plans."""
    plans = await payment_service.plans_collection.find().to_list(length=None)
    return [SubscriptionPlan(**plan) for plan in plans]

@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> Optional[SubscriptionResponse]:
    """Get current user's subscription."""
    subscription = await payment_service.get_active_subscription(current_user.id)
    if not subscription:
        return None
    
    plan = await payment_service.get_plan(subscription.plan_id)
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

@router.post("/subscription", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> SubscriptionResponse:
    """Create a new subscription."""
    try:
        subscription = await payment_service.create_subscription(
            current_user.id,
            subscription_data
        )
        
        plan = await payment_service.get_plan(subscription.plan_id)
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/subscription/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    update_data: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> SubscriptionResponse:
    """Update an existing subscription."""
    try:
        subscription = await payment_service.update_subscription(
            subscription_id,
            update_data
        )
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        plan = await payment_service.get_plan(subscription.plan_id)
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/subscription/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> dict:
    """Cancel a subscription."""
    try:
        success = await payment_service.cancel_subscription(subscription_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        return {"message": "Subscription cancelled successfully"}
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/transactions", response_model=List[PaymentTransactionResponse])
async def list_transactions(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> List[PaymentTransactionResponse]:
    """List user's payment transactions."""
    transactions = await payment_service.get_user_transactions(
        current_user.id,
        limit=limit,
        offset=offset
    )
    return [
        PaymentTransactionResponse(**t.dict())
        for t in transactions
    ] 