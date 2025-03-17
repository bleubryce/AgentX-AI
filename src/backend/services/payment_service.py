from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import stripe
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.payment import (
    Subscription, PaymentTransaction, SubscriptionPlan,
    SubscriptionCreate, SubscriptionUpdate,
    Payment,
    PaymentCreate,
    PaymentUpdate,
    PaymentStatus,
    PaymentType,
    RefundInfo
)
from ..db.mongodb import mongodb_client
from ..core.config import settings
from ..core.cache import Cache
from stripe.error import StripeError

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:
    """Service for handling payment-related operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.payments
        self.subscriptions_collection = mongodb_client.get_collection("subscriptions")
        self.transactions_collection = mongodb_client.get_collection("transactions")
        self.plans_collection = mongodb_client.get_collection("subscription_plans")

    async def get_plan(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by ID."""
        plan = await self.plans_collection.find_one({"_id": ObjectId(plan_id)})
        if plan:
            return SubscriptionPlan(**plan)
        return None

    async def get_active_subscription(self, user_id: str) -> Optional[Subscription]:
        """Get user's active subscription."""
        subscription = await self.subscriptions_collection.find_one({
            "user_id": user_id,
            "status": "active"
        })
        if subscription:
            return Subscription(**subscription)
        return None

    async def create_subscription(
        self,
        user_id: str,
        subscription_data: SubscriptionCreate
    ) -> Optional[Subscription]:
        """Create a new subscription."""
        # Check for existing active subscription
        existing_sub = await self.get_active_subscription(user_id)
        if existing_sub:
            raise ValueError("User already has an active subscription")

        # Get plan details
        plan = await self.get_plan(subscription_data.plan_id)
        if not plan:
            raise ValueError("Invalid plan ID")

        try:
            # Create or get Stripe customer
            customer = await self._get_or_create_stripe_customer(user_id)

            # Create Stripe subscription
            stripe_subscription = stripe.Subscription.create(
                customer=customer.id,
                items=[{"price": plan.price_id}],
                payment_behavior="default_incomplete",
                payment_settings={"save_default_payment_method": "on_subscription"},
                expand=["latest_invoice.payment_intent"],
                trial_period_days=subscription_data.trial_period_days,
                metadata={"user_id": user_id, "plan_id": str(plan.id)}
            )

            # Create subscription record
            subscription = Subscription(
                user_id=user_id,
                plan_id=str(plan.id),
                stripe_subscription_id=stripe_subscription.id,
                stripe_customer_id=customer.id,
                status=stripe_subscription.status,
                current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
                cancel_at_period_end=stripe_subscription.cancel_at_period_end,
                canceled_at=datetime.fromtimestamp(stripe_subscription.canceled_at) if stripe_subscription.canceled_at else None,
                trial_end=datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None,
                quantity=stripe_subscription.quantity
            )

            result = await self.subscriptions_collection.insert_one(subscription.dict())
            subscription.id = str(result.inserted_id)
            return subscription

        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")

    async def update_subscription(
        self,
        subscription_id: str,
        update_data: SubscriptionUpdate
    ) -> Optional[Subscription]:
        """Update an existing subscription."""
        subscription = await self.subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
        if not subscription:
            raise ValueError("Subscription not found")

        try:
            stripe_subscription = stripe.Subscription.modify(
                subscription["stripe_subscription_id"],
                cancel_at_period_end=update_data.cancel_at_period_end,
                quantity=update_data.quantity
            )

            if update_data.plan_id:
                # Handle plan change
                new_plan = await self.get_plan(update_data.plan_id)
                if not new_plan:
                    raise ValueError("Invalid plan ID")

                stripe_subscription = stripe.Subscription.modify(
                    subscription["stripe_subscription_id"],
                    items=[{"price": new_plan.price_id}],
                    proration_behavior="always_invoice"
                )

            # Update subscription record
            update_dict = {
                "status": stripe_subscription.status,
                "current_period_start": datetime.fromtimestamp(stripe_subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(stripe_subscription.current_period_end),
                "cancel_at_period_end": stripe_subscription.cancel_at_period_end,
                "canceled_at": datetime.fromtimestamp(stripe_subscription.canceled_at) if stripe_subscription.canceled_at else None,
                "trial_end": datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None,
                "quantity": stripe_subscription.quantity,
                "updated_at": datetime.utcnow()
            }

            if update_data.plan_id:
                update_dict["plan_id"] = update_data.plan_id

            result = await self.subscriptions_collection.find_one_and_update(
                {"_id": ObjectId(subscription_id)},
                {"$set": update_dict},
                return_document=True
            )
            return Subscription(**result) if result else None

        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")

    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription."""
        subscription = await self.subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
        if not subscription:
            raise ValueError("Subscription not found")

        try:
            stripe.Subscription.delete(subscription["stripe_subscription_id"])
            await self.subscriptions_collection.update_one(
                {"_id": ObjectId(subscription_id)},
                {
                    "$set": {
                        "status": "canceled",
                        "canceled_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return True

        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")

    async def record_transaction(
        self,
        user_id: str,
        subscription_id: Optional[str],
        amount: float,
        currency: str,
        stripe_payment_intent_id: str,
        status: str,
        payment_method: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> PaymentTransaction:
        """Record a payment transaction."""
        transaction = PaymentTransaction(
            user_id=user_id,
            subscription_id=subscription_id,
            amount=amount,
            currency=currency,
            stripe_payment_intent_id=stripe_payment_intent_id,
            status=status,
            payment_method=payment_method,
            description=description,
            metadata=metadata
        )

        result = await self.transactions_collection.insert_one(transaction.dict())
        transaction.id = str(result.inserted_id)
        return transaction

    async def get_user_transactions(
        self,
        user_id: str,
        limit: int = 10,
        offset: int = 0
    ) -> List[PaymentTransaction]:
        """Get user's payment transactions."""
        cursor = self.transactions_collection.find({"user_id": user_id})
        cursor = cursor.sort("created_at", -1).skip(offset).limit(limit)
        transactions = await cursor.to_list(length=limit)
        return [PaymentTransaction(**t) for t in transactions]

    async def _get_or_create_stripe_customer(self, user_id: str) -> stripe.Customer:
        """Get or create a Stripe customer for a user."""
        user = await self.subscriptions_collection.find_one({"user_id": user_id})
        if user and user.get("stripe_customer_id"):
            return stripe.Customer.retrieve(user["stripe_customer_id"])

        # Create new customer
        customer = stripe.Customer.create(
            metadata={"user_id": user_id}
        )
        return customer

    async def create_payment(
        self,
        payment_data: PaymentCreate
    ) -> Payment:
        """Create a new payment."""
        # Create payment document
        payment = Payment(
            **payment_data.dict(),
            status=PaymentStatus.PENDING,
            created_at=datetime.utcnow()
        )
        
        # Process payment based on provider
        try:
            if payment.provider == "stripe":
                await self._process_stripe_payment(payment)
            elif payment.provider == "paypal":
                await self._process_paypal_payment(payment)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported payment provider: {payment.provider}"
                )
        except Exception as e:
            # Log the error and update payment status
            payment.status = PaymentStatus.FAILED
            payment.error_message = str(e)
        
        # Insert into database
        result = await self.collection.insert_one(payment.dict(by_alias=True))
        payment.id = str(result.inserted_id)
        
        return payment

    async def get_by_id(self, payment_id: str) -> Optional[Payment]:
        """Get payment by ID."""
        # Try cache first
        cache_key = f"payment:{payment_id}"
        payment_dict = await Cache.get(cache_key)
        
        if not payment_dict:
            # Get from database
            payment_dict = await self.collection.find_one(
                {"_id": ObjectId(payment_id)}
            )
            if payment_dict:
                # Cache the result
                await Cache.set(cache_key, payment_dict, expire=300)
        
        return Payment(**payment_dict) if payment_dict else None

    async def update(
        self,
        payment_id: str,
        payment_data: PaymentUpdate
    ) -> Optional[Payment]:
        """Update payment."""
        update_dict = payment_data.dict(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(payment_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        if result:
            # Clear cache
            await Cache.delete(f"payment:{payment_id}")
            return Payment(**result)
        
        return None

    async def list_payments(
        self,
        user_id: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        payment_type: Optional[PaymentType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_order: int = -1
    ) -> List[Payment]:
        """List payments with filtering and pagination."""
        # Build query
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if status:
            query["status"] = status
        
        if payment_type:
            query["payment_type"] = payment_type
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["created_at"] = date_query
        
        # Execute query
        cursor = self.collection.find(query)
        
        # Apply sorting
        cursor = cursor.sort(sort_by, sort_order)
        
        # Apply pagination
        cursor = cursor.skip(skip).limit(limit)
        
        # Get results
        payments = await cursor.to_list(length=limit)
        return [Payment(**payment) for payment in payments]

    async def process_refund(
        self,
        payment_id: str,
        amount: Decimal,
        reason: str
    ) -> Payment:
        """Process a refund for a payment."""
        payment = await self.get_by_id(payment_id)
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        if payment.status not in [PaymentStatus.COMPLETED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment cannot be refunded"
            )
        
        if amount > (payment.amount - payment.refunded_amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund amount exceeds available amount"
            )
        
        try:
            # Process refund with payment provider
            if payment.provider == "stripe":
                refund_result = await self._process_stripe_refund(payment, amount)
            elif payment.provider == "paypal":
                refund_result = await self._process_paypal_refund(payment, amount)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported payment provider: {payment.provider}"
                )
            
            # Create refund record
            refund = RefundInfo(
                amount=amount,
                reason=reason,
                status=PaymentStatus.COMPLETED,
                refund_id=refund_result["id"],
                processed_at=datetime.utcnow(),
                processor_response=refund_result
            )
            
            # Update payment
            update_dict = {
                "refunds": [*payment.refunds, refund],
                "refunded_amount": payment.refunded_amount + amount,
                "status": PaymentStatus.PARTIALLY_REFUNDED
                if amount < payment.amount
                else PaymentStatus.REFUNDED,
                "updated_at": datetime.utcnow()
            }
            
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(payment_id)},
                {"$set": update_dict},
                return_document=True
            )
            
            if result:
                # Clear cache
                await Cache.delete(f"payment:{payment_id}")
                return Payment(**result)
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process refund: {str(e)}"
            )

    async def get_payment_stats(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get payment statistics."""
        # Build match stage
        match_stage = {}
        
        if user_id:
            match_stage["user_id"] = user_id
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            match_stage["created_at"] = date_query
        
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": None,
                    "total_payments": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"},
                    "total_fees": {"$sum": "$fees"},
                    "total_refunds": {"$sum": "$refunded_amount"},
                    "net_amount": {"$sum": "$net_amount"},
                    "avg_amount": {"$avg": "$amount"},
                    "payment_counts": {
                        "$push": {
                            "status": "$status",
                            "type": "$payment_type"
                        }
                    }
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        if not results:
            return {
                "total_payments": 0,
                "total_amount": 0,
                "total_fees": 0,
                "total_refunds": 0,
                "net_amount": 0,
                "avg_amount": 0,
                "status_breakdown": {},
                "type_breakdown": {}
            }
        
        stats = results[0]
        
        # Calculate status and type breakdowns
        status_counts = {}
        type_counts = {}
        for payment in stats["payment_counts"]:
            status_counts[payment["status"]] = status_counts.get(payment["status"], 0) + 1
            type_counts[payment["type"]] = type_counts.get(payment["type"], 0) + 1
        
        del stats["payment_counts"]
        stats["status_breakdown"] = status_counts
        stats["type_breakdown"] = type_counts
        
        return stats

    async def _process_stripe_payment(self, payment: Payment) -> None:
        """Process payment through Stripe."""
        try:
            # Create Stripe payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(payment.amount * 100),  # Convert to cents
                currency=payment.currency.lower(),
                payment_method_types=["card"],
                metadata={
                    "payment_id": str(payment.id),
                    "user_id": payment.user_id,
                    "payment_type": payment.payment_type
                }
            )
            
            payment.processor_id = intent.id
            payment.processor_response = intent
            payment.status = PaymentStatus.PROCESSING
            
        except StripeError as e:
            payment.status = PaymentStatus.FAILED
            payment.error_message = str(e)

    async def _process_paypal_payment(self, payment: Payment) -> None:
        """Process payment through PayPal."""
        # Implement PayPal payment processing
        raise NotImplementedError("PayPal payment processing not implemented")

    async def _process_stripe_refund(
        self,
        payment: Payment,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Process refund through Stripe."""
        try:
            refund = stripe.Refund.create(
                payment_intent=payment.processor_id,
                amount=int(amount * 100)  # Convert to cents
            )
            return refund
            
        except StripeError as e:
            raise ValueError(f"Stripe refund failed: {str(e)}")

    async def _process_paypal_refund(
        self,
        payment: Payment,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Process refund through PayPal."""
        # Implement PayPal refund processing
        raise NotImplementedError("PayPal refund processing not implemented") 