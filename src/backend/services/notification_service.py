from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..core.email import EmailClient
from ..core.logger import logger
from ..models.payment import Subscription, SubscriptionPlan
from ..models.user import User

class NotificationService:
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        email_client: EmailClient
    ):
        self.db = db
        self.email_client = email_client
        self.notifications_collection = db.notifications
        self.users_collection = db.users
        self.subscriptions_collection = db.subscriptions
        self.plans_collection = db.subscription_plans

    async def notify_subscription_created(
        self,
        user_id: str,
        subscription: Subscription,
        plan: SubscriptionPlan
    ) -> None:
        """Send notification for new subscription."""
        try:
            user = await self._get_user(user_id)
            if not user:
                logger.error(f"User not found for notification: {user_id}")
                return

            # Record notification
            await self._record_notification(
                user_id=user_id,
                type="subscription_created",
                data={
                    "subscription_id": str(subscription.id),
                    "plan_name": plan.name,
                    "amount": plan.amount,
                    "currency": plan.currency,
                    "interval": plan.interval
                }
            )

            # Send email
            await self.email_client.send_email(
                to_email=user.email,
                template="subscription_welcome",
                template_data={
                    "user_name": user.full_name,
                    "plan_name": plan.name,
                    "amount": plan.amount,
                    "currency": plan.currency,
                    "interval": plan.interval,
                    "features": plan.features
                }
            )

        except Exception as e:
            logger.error(f"Error sending subscription created notification: {str(e)}")

    async def notify_payment_failed(
        self,
        user_id: str,
        subscription: Subscription,
        payment_intent_id: str,
        error_message: str
    ) -> None:
        """Send notification for failed payment."""
        try:
            user = await self._get_user(user_id)
            if not user:
                logger.error(f"User not found for notification: {user_id}")
                return

            plan = await self._get_subscription_plan(subscription.plan_id)
            if not plan:
                logger.error(f"Plan not found for notification: {subscription.plan_id}")
                return

            # Record notification
            await self._record_notification(
                user_id=user_id,
                type="payment_failed",
                data={
                    "subscription_id": str(subscription.id),
                    "payment_intent_id": payment_intent_id,
                    "error_message": error_message,
                    "plan_name": plan.name,
                    "amount": plan.amount
                }
            )

            # Send email
            await self.email_client.send_email(
                to_email=user.email,
                template="payment_failed",
                template_data={
                    "user_name": user.full_name,
                    "plan_name": plan.name,
                    "amount": plan.amount,
                    "currency": plan.currency,
                    "error_message": error_message
                }
            )

        except Exception as e:
            logger.error(f"Error sending payment failed notification: {str(e)}")

    async def notify_subscription_canceled(
        self,
        user_id: str,
        subscription: Subscription,
        end_date: datetime
    ) -> None:
        """Send notification for subscription cancellation."""
        try:
            user = await self._get_user(user_id)
            if not user:
                logger.error(f"User not found for notification: {user_id}")
                return

            plan = await self._get_subscription_plan(subscription.plan_id)
            if not plan:
                logger.error(f"Plan not found for notification: {subscription.plan_id}")
                return

            # Record notification
            await self._record_notification(
                user_id=user_id,
                type="subscription_canceled",
                data={
                    "subscription_id": str(subscription.id),
                    "plan_name": plan.name,
                    "end_date": end_date.isoformat()
                }
            )

            # Send email
            await self.email_client.send_email(
                to_email=user.email,
                template="subscription_canceled",
                template_data={
                    "user_name": user.full_name,
                    "plan_name": plan.name,
                    "end_date": end_date.strftime("%B %d, %Y")
                }
            )

        except Exception as e:
            logger.error(f"Error sending subscription canceled notification: {str(e)}")

    async def notify_trial_ending(
        self,
        user_id: str,
        subscription: Subscription,
        days_remaining: int
    ) -> None:
        """Send notification for trial period ending."""
        try:
            user = await self._get_user(user_id)
            if not user:
                logger.error(f"User not found for notification: {user_id}")
                return

            plan = await self._get_subscription_plan(subscription.plan_id)
            if not plan:
                logger.error(f"Plan not found for notification: {subscription.plan_id}")
                return

            # Record notification
            await self._record_notification(
                user_id=user_id,
                type="trial_ending",
                data={
                    "subscription_id": str(subscription.id),
                    "plan_name": plan.name,
                    "days_remaining": days_remaining,
                    "trial_end": subscription.trial_end.isoformat()
                }
            )

            # Send email
            await self.email_client.send_email(
                to_email=user.email,
                template="trial_ending",
                template_data={
                    "user_name": user.full_name,
                    "plan_name": plan.name,
                    "days_remaining": days_remaining,
                    "amount": plan.amount,
                    "currency": plan.currency,
                    "interval": plan.interval
                }
            )

        except Exception as e:
            logger.error(f"Error sending trial ending notification: {str(e)}")

    async def notify_usage_limit(
        self,
        user_id: str,
        metric_name: str,
        current_usage: int,
        limit: int,
        percentage: float
    ) -> None:
        """Send notification for usage limit approaching."""
        try:
            user = await self._get_user(user_id)
            if not user:
                logger.error(f"User not found for notification: {user_id}")
                return

            # Record notification
            await self._record_notification(
                user_id=user_id,
                type="usage_limit",
                data={
                    "metric_name": metric_name,
                    "current_usage": current_usage,
                    "limit": limit,
                    "percentage": percentage
                }
            )

            # Send email
            await self.email_client.send_email(
                to_email=user.email,
                template="usage_limit",
                template_data={
                    "user_name": user.full_name,
                    "metric_name": metric_name,
                    "current_usage": current_usage,
                    "limit": limit,
                    "percentage": int(percentage * 100)
                }
            )

        except Exception as e:
            logger.error(f"Error sending usage limit notification: {str(e)}")

    async def _record_notification(
        self,
        user_id: str,
        type: str,
        data: Dict[str, Any]
    ) -> None:
        """Record notification in database."""
        notification = {
            "user_id": user_id,
            "type": type,
            "data": data,
            "created_at": datetime.utcnow(),
            "read": False
        }
        await self.notifications_collection.insert_one(notification)

    async def _get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        user = await self.users_collection.find_one({"_id": user_id})
        return User(**user) if user else None

    async def _get_subscription_plan(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by ID."""
        plan = await self.plans_collection.find_one({"_id": plan_id})
        return SubscriptionPlan(**plan) if plan else None 