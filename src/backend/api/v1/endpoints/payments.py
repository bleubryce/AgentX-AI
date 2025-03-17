from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from ....models.payment import (
    SubscriptionPlan, Subscription, PaymentTransaction,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    PaymentTransactionResponse,
    Payment,
    PaymentCreate,
    PaymentUpdate,
    PaymentStatus,
    PaymentType
)
from ....services.payment_service import PaymentService
from ....core.deps import get_current_user
from ....models.user import User
from ....core.auth import get_current_admin
from ....core.cache import rate_limit, cached

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

@router.post("", response_model=Payment)
@rate_limit(max_requests=100, window=3600)  # 100 payments per hour
async def create_payment(
    payment_in: PaymentCreate,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> Payment:
    """Create a new payment."""
    return await payment_service.create_payment(payment_in)

@router.get("/{payment_id}", response_model=Payment)
@cached(key_prefix="payment", expire=300)  # Cache for 5 minutes
async def get_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> Payment:
    """Get payment by ID."""
    payment = await payment_service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check if user has access to this payment
    if payment.user_id != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this payment"
        )
    
    return payment

@router.put("/{payment_id}", response_model=Payment)
async def update_payment(
    payment_id: str,
    payment_in: PaymentUpdate,
    current_user: User = Depends(get_current_admin),
    payment_service: PaymentService = Depends()
) -> Payment:
    """Update payment status. Admin only."""
    payment = await payment_service.update(payment_id, payment_in)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    return payment

@router.get("", response_model=List[Payment])
@cached(
    key_prefix="payments_list",
    expire=300,
    include_query_params=True
)
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[PaymentStatus] = None,
    payment_type: Optional[PaymentType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = Query("created_at", regex="^[a-zA-Z_]+$"),
    sort_order: int = Query(-1, ge=-1, le=1),
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> List[Payment]:
    """List payments with filtering and pagination."""
    # If not admin, only show user's payments
    user_id = None if current_user.is_admin else str(current_user.id)
    
    return await payment_service.list_payments(
        user_id=user_id,
        status=status,
        payment_type=payment_type,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.post("/{payment_id}/refund")
@rate_limit(max_requests=50, window=3600)  # 50 refunds per hour
async def refund_payment(
    payment_id: str,
    amount: Decimal = Query(..., gt=0),
    reason: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_admin),
    payment_service: PaymentService = Depends()
) -> Payment:
    """Process a refund for a payment. Admin only."""
    return await payment_service.process_refund(
        payment_id=payment_id,
        amount=amount,
        reason=reason
    )

@router.get("/stats/overview", response_model=Dict[str, Any])
@cached(key_prefix="payment_stats", expire=3600)  # Cache for 1 hour
async def get_payment_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
) -> Dict[str, Any]:
    """Get payment statistics."""
    # If not admin, only show user's stats
    user_id = None if current_user.is_admin else str(current_user.id)
    
    return await payment_service.get_payment_stats(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date
    ) 