from typing import Optional, Dict, List, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator, condecimal
from enum import Enum
from decimal import Decimal
from .base import BaseDBModel
from bson import ObjectId

class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    WIRE_TRANSFER = "wire_transfer"
    PAYPAL = "paypal"
    STRIPE = "stripe"
    OTHER = "other"

class PaymentType(str, Enum):
    """Payment type enumeration."""
    LEAD_PURCHASE = "lead_purchase"
    SUBSCRIPTION = "subscription"
    COMMISSION = "commission"
    REFUND = "refund"
    SERVICE_FEE = "service_fee"
    OTHER = "other"

class PaymentProvider(str, Enum):
    """Payment provider enumeration."""
    STRIPE = "stripe"
    PAYPAL = "paypal"
    SQUARE = "square"
    BANK = "bank"
    OTHER = "other"

class CardInfo(BaseModel):
    """Card payment information."""
    last_four: str = Field(..., min_length=4, max_length=4)
    brand: str
    exp_month: int = Field(..., ge=1, le=12)
    exp_year: int
    card_holder: str
    
    @validator("exp_year")
    def validate_exp_year(cls, v):
        """Validate expiration year."""
        current_year = datetime.now().year
        if v < current_year:
            raise ValueError("Card has expired")
        if v > current_year + 20:
            raise ValueError("Invalid expiration year")
        return v

class BankInfo(BaseModel):
    """Bank transfer information."""
    bank_name: str
    account_last_four: str = Field(..., min_length=4, max_length=4)
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None

class RefundInfo(BaseModel):
    """Refund information."""
    amount: Decimal = Field(..., ge=0)
    reason: str
    status: PaymentStatus
    refund_id: str
    processed_at: datetime
    processor_response: Optional[Dict] = None

class PaymentBase(BaseModel):
    """Base Payment model."""
    amount: condecimal(ge=0, decimal_places=2) = Field(..., description="Payment amount")
    currency: str = Field(..., min_length=3, max_length=3, description="Currency code")
    payment_type: PaymentType = Field(..., description="Type of payment")
    payment_method: PaymentMethod = Field(..., description="Method of payment")
    provider: PaymentProvider = Field(..., description="Payment provider")
    description: Optional[str] = Field(None, max_length=500)
    metadata: Optional[Dict] = Field(None, description="Additional payment metadata")

class PaymentCreate(PaymentBase):
    """Create Payment model."""
    user_id: str = Field(..., description="ID of user making the payment")
    card_info: Optional[CardInfo] = None
    bank_info: Optional[BankInfo] = None
    
    @validator("card_info", "bank_info")
    def validate_payment_info(cls, v, values):
        """Validate payment information based on method."""
        method = values.get("payment_method")
        if method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD] and not v:
            raise ValueError("Card information required for card payments")
        if method == PaymentMethod.BANK_TRANSFER and not v:
            raise ValueError("Bank information required for bank transfers")
        return v

class PaymentUpdate(BaseModel):
    """Update Payment model."""
    status: Optional[PaymentStatus] = None
    processor_response: Optional[Dict] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict] = None

class Payment(PaymentBase, BaseDBModel):
    """Payment model with database fields."""
    user_id: str = Field(..., description="ID of user making the payment")
    status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    card_info: Optional[CardInfo] = None
    bank_info: Optional[BankInfo] = None
    processor_id: Optional[str] = Field(None, description="Payment processor's transaction ID")
    processor_response: Optional[Dict] = None
    error_message: Optional[str] = None
    refunds: List[RefundInfo] = Field(default_factory=list)
    refunded_amount: condecimal(ge=0, decimal_places=2) = Field(default=0)
    fees: condecimal(ge=0, decimal_places=2) = Field(default=0)
    net_amount: condecimal(ge=0, decimal_places=2) = Field(default=0)
    processed_at: Optional[datetime] = None
    
    @validator("net_amount", always=True)
    def calculate_net_amount(cls, v, values):
        """Calculate net amount after fees and refunds."""
        amount = values.get("amount", 0)
        fees = values.get("fees", 0)
        refunded = values.get("refunded_amount", 0)
        return amount - fees - refunded
    
    class Config:
        """Pydantic model configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: str(v)
        }

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    UNPAID = "unpaid"

class SubscriptionInterval(str, Enum):
    MONTH = "month"
    YEAR = "year"

class SubscriptionPlan(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    price_id: str  # Stripe price ID
    amount: float
    currency: str = "usd"
    interval: SubscriptionInterval
    features: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}

    @validator("amount")
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v

class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None
    trial_period_days: Optional[int] = None
    quantity: int = 1
    metadata: Dict[str, Any] = {}

    @validator("trial_period_days")
    def validate_trial_period(cls, v):
        if v is not None and (v < 0 or v > 365):
            raise ValueError("Trial period must be between 0 and 365 days")
        return v

    @validator("quantity")
    def validate_quantity(cls, v):
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v

class SubscriptionUpdate(BaseModel):
    plan_id: Optional[str] = None
    quantity: Optional[int] = None
    cancel_at_period_end: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

    @validator("quantity")
    def validate_quantity(cls, v):
        if v is not None and v < 1:
            raise ValueError("Quantity must be at least 1")
        return v

class Subscription(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    plan_id: str
    stripe_subscription_id: str
    stripe_customer_id: str
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    quantity: int = 1
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan: SubscriptionPlan
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: Optional[datetime]
    trial_end: Optional[datetime]
    quantity: int
    created_at: datetime
    updated_at: datetime

class SubscriptionStats(BaseModel):
    total_subscriptions: int
    active_subscriptions: int
    canceled_subscriptions: int
    trial_subscriptions: int
    plan_breakdown: Dict[str, int]
    revenue_stats: Optional[Dict[str, float]] = None

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