from typing import Optional, List, Dict
from datetime import datetime, timedelta
import stripe
from bson import ObjectId
from ..models.payment import (
    Subscription, PaymentTransaction, SubscriptionPlan,
    SubscriptionCreate, SubscriptionUpdate
)
from ..db.mongodb import mongodb_client
from ..core.config import settings

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:
    def __init__(self):
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