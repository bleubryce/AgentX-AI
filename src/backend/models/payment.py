from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseDBModel

class SubscriptionPlan(BaseModel):
    name: str  # e.g., "Basic", "Pro", "Premium"
    price_id: str  # Stripe price ID
    amount: float
    currency: str = "usd"
    interval: str  # "month" or "year"
    features: List[str]

class Subscription(BaseDBModel):
    user_id: str
    plan_id: str
    stripe_subscription_id: str
    stripe_customer_id: str
    status: str  # "active", "canceled", "past_due", "unpaid"
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    quantity: int = 1

class PaymentTransaction(BaseDBModel):
    user_id: str
    subscription_id: Optional[str] = None
    amount: float
    currency: str = "usd"
    stripe_payment_intent_id: str
    status: str  # "succeeded", "failed", "pending"
    payment_method: str
    description: Optional[str] = None
    metadata: Optional[dict] = None

class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: str
    trial_period_days: Optional[int] = None

class SubscriptionUpdate(BaseModel):
    plan_id: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None
    quantity: Optional[int] = None

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan: SubscriptionPlan
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: Optional[datetime]
    trial_end: Optional[datetime]
    quantity: int
    created_at: datetime
    updated_at: datetime

class PaymentTransactionResponse(BaseModel):
    id: str
    user_id: str
    subscription_id: Optional[str]
    amount: float
    currency: str
    status: str
    payment_method: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: datetime
    updated_at: datetime 