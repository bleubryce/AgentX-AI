from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import stripe
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.payment import (
    Subscription,
    SubscriptionPlan,
    SubscriptionCreate,
    SubscriptionUpdate,
    PaymentTransaction,
    PaymentType,
    PaymentMethod
)
from ..core.cache import Cache
from ..core.config import settings
from .payment_service import PaymentService

class SubscriptionService:
    """Service for handling subscription-related operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.subscriptions
        self.plans_collection = db.subscription_plans
        self.payment_service = PaymentService(db)
        stripe.api_key = settings.STRIPE_SECRET_KEY
    
    async def create_plan(
        self,
        name: str,
        price_id: str,
        amount: float,
        currency: str,
        interval: str,
        features: List[str]
    ) -> SubscriptionPlan:
        """Create a new subscription plan."""
        plan = SubscriptionPlan(
            name=name,
            price_id=price_id,
            amount=amount,
            currency=currency,
            interval=interval,
            features=features
        )
        
        # Check if plan with same name exists
        existing = await self.plans_collection.find_one({"name": name})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan with this name already exists"
            )
        
        # Insert plan
        result = await self.plans_collection.insert_one(plan.dict())
        plan.id = str(result.inserted_id)
        
        # Cache the plan
        await Cache.set(f"plan:{plan.id}", plan.dict(), expire=3600)
        
        return plan
    
    async def get_plan(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by ID."""
        # Try cache first
        cache_key = f"plan:{plan_id}"
        plan_dict = await Cache.get(cache_key)
        
        if not plan_dict:
            # Get from database
            plan_dict = await self.plans_collection.find_one(
                {"_id": ObjectId(plan_id)}
            )
            if plan_dict:
                # Cache the result
                await Cache.set(cache_key, plan_dict, expire=3600)
        
        return SubscriptionPlan(**plan_dict) if plan_dict else None
    
    async def list_plans(
        self,
        active_only: bool = True
    ) -> List[SubscriptionPlan]:
        """List subscription plans."""
        query = {"is_active": True} if active_only else {}
        plans = await self.plans_collection.find(query).to_list(None)
        return [SubscriptionPlan(**plan) for plan in plans]
    
    async def update_plan(
        self,
        plan_id: str,
        updates: Dict[str, Any]
    ) -> Optional[SubscriptionPlan]:
        """Update subscription plan."""
        result = await self.plans_collection.find_one_and_update(
            {"_id": ObjectId(plan_id)},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            # Clear cache
            await Cache.delete(f"plan:{plan_id}")
            return SubscriptionPlan(**result)
        
        return None
    
    async def delete_plan(self, plan_id: str) -> bool:
        """Delete subscription plan."""
        # Check if plan has active subscriptions
        active_subs = await self.collection.count_documents({
            "plan_id": plan_id,
            "status": "active"
        })
        
        if active_subs > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete plan with active subscriptions"
            )
        
        result = await self.plans_collection.delete_one(
            {"_id": ObjectId(plan_id)}
        )
        
        if result.deleted_count:
            # Clear cache
            await Cache.delete(f"plan:{plan_id}")
            return True
        
        return False
    
    async def create_subscription(
        self,
        user_id: str,
        subscription_data: SubscriptionCreate
    ) -> Subscription:
        """Create a new subscription."""
        # Check for existing active subscription
        existing = await self.get_active_subscription(user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active subscription"
            )
        
        # Get plan details
        plan = await self.get_plan(subscription_data.plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid plan ID"
            )
        
        try:
            # Create or get Stripe customer
            customer = await self.payment_service._get_or_create_stripe_customer(user_id)
            
            # Create Stripe subscription
            stripe_subscription = stripe.Subscription.create(
                customer=customer.id,
                items=[{"price": plan.price_id}],
                payment_behavior="default_incomplete",
                payment_settings={"save_default_payment_method": "on_subscription"},
                expand=["latest_invoice.payment_intent"],
                trial_period_days=subscription_data.trial_period_days,
                metadata={
                    "user_id": user_id,
                    "plan_id": str(plan.id)
                }
            )
            
            # Create subscription record
            subscription = Subscription(
                user_id=user_id,
                plan_id=str(plan.id),
                stripe_subscription_id=stripe_subscription.id,
                stripe_customer_id=customer.id,
                status=stripe_subscription.status,
                current_period_start=datetime.fromtimestamp(
                    stripe_subscription.current_period_start
                ),
                current_period_end=datetime.fromtimestamp(
                    stripe_subscription.current_period_end
                ),
                cancel_at_period_end=stripe_subscription.cancel_at_period_end,
                canceled_at=datetime.fromtimestamp(stripe_subscription.canceled_at)
                if stripe_subscription.canceled_at else None,
                trial_end=datetime.fromtimestamp(stripe_subscription.trial_end)
                if stripe_subscription.trial_end else None,
                quantity=stripe_subscription.quantity
            )
            
            result = await self.collection.insert_one(subscription.dict())
            subscription.id = str(result.inserted_id)
            
            # Record initial payment transaction
            await self.payment_service.record_transaction(
                user_id=user_id,
                subscription_id=str(subscription.id),
                amount=plan.amount,
                currency=plan.currency,
                stripe_payment_intent_id=stripe_subscription.latest_invoice.payment_intent.id,
                status="pending",
                payment_method=PaymentMethod.STRIPE,
                description=f"Initial payment for {plan.name} subscription",
                metadata={
                    "subscription_id": subscription.id,
                    "plan_id": str(plan.id)
                }
            )
            
            return subscription
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
    
    async def get_subscription(
        self,
        subscription_id: str
    ) -> Optional[Subscription]:
        """Get subscription by ID."""
        subscription = await self.collection.find_one(
            {"_id": ObjectId(subscription_id)}
        )
        return Subscription(**subscription) if subscription else None
    
    async def get_active_subscription(
        self,
        user_id: str
    ) -> Optional[Subscription]:
        """Get user's active subscription."""
        subscription = await self.collection.find_one({
            "user_id": user_id,
            "status": "active"
        })
        return Subscription(**subscription) if subscription else None
    
    async def update_subscription(
        self,
        subscription_id: str,
        update_data: SubscriptionUpdate
    ) -> Optional[Subscription]:
        """Update subscription."""
        subscription = await self.get_subscription(subscription_id)
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        try:
            stripe_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=update_data.cancel_at_period_end,
                quantity=update_data.quantity
            )
            
            if update_data.plan_id:
                # Handle plan change
                new_plan = await self.get_plan(update_data.plan_id)
                if not new_plan:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Invalid plan ID"
                    )
                
                stripe_subscription = stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    items=[{"price": new_plan.price_id}],
                    proration_behavior="always_invoice"
                )
            
            # Update subscription record
            update_dict = {
                "status": stripe_subscription.status,
                "current_period_start": datetime.fromtimestamp(
                    stripe_subscription.current_period_start
                ),
                "current_period_end": datetime.fromtimestamp(
                    stripe_subscription.current_period_end
                ),
                "cancel_at_period_end": stripe_subscription.cancel_at_period_end,
                "canceled_at": datetime.fromtimestamp(stripe_subscription.canceled_at)
                if stripe_subscription.canceled_at else None,
                "trial_end": datetime.fromtimestamp(stripe_subscription.trial_end)
                if stripe_subscription.trial_end else None,
                "quantity": stripe_subscription.quantity,
                "updated_at": datetime.utcnow()
            }
            
            if update_data.plan_id:
                update_dict["plan_id"] = update_data.plan_id
            
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(subscription_id)},
                {"$set": update_dict},
                return_document=True
            )
            
            return Subscription(**result) if result else None
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        immediate: bool = False
    ) -> bool:
        """Cancel subscription."""
        subscription = await self.get_subscription(subscription_id)
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        try:
            if immediate:
                # Cancel immediately
                stripe.Subscription.delete(subscription.stripe_subscription_id)
                status_update = "canceled"
            else:
                # Cancel at period end
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                status_update = "active"
            
            # Update subscription record
            await self.collection.update_one(
                {"_id": ObjectId(subscription_id)},
                {
                    "$set": {
                        "status": status_update,
                        "cancel_at_period_end": True,
                        "canceled_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return True
            
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stripe error: {str(e)}"
            )
    
    async def get_subscription_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get subscription statistics."""
        match_stage = {}
        
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
                    "total_subscriptions": {"$sum": 1},
                    "active_subscriptions": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$status", "active"]},
                                1,
                                0
                            ]
                        }
                    },
                    "canceled_subscriptions": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$status", "canceled"]},
                                1,
                                0
                            ]
                        }
                    },
                    "trial_subscriptions": {
                        "$sum": {
                            "$cond": [
                                {"$ne": ["$trial_end", None]},
                                1,
                                0
                            ]
                        }
                    },
                    "plans": {
                        "$push": "$plan_id"
                    }
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        if not results:
            return {
                "total_subscriptions": 0,
                "active_subscriptions": 0,
                "canceled_subscriptions": 0,
                "trial_subscriptions": 0,
                "plan_breakdown": {}
            }
        
        stats = results[0]
        
        # Calculate plan breakdown
        plan_counts = {}
        for plan_id in stats["plans"]:
            plan_counts[plan_id] = plan_counts.get(plan_id, 0) + 1
        
        del stats["plans"]
        stats["plan_breakdown"] = plan_counts
        
        return stats 