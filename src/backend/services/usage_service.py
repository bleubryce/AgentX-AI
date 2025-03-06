from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from ..models.usage import (
    Usage, UsageLimit, UsageUpdate, UsageSummary
)
from ..db.mongodb import mongodb_client
from ..services.payment_service import PaymentService

class UsageService:
    def __init__(self):
        self.usage_collection = mongodb_client.get_collection("usage")
        self.limits_collection = mongodb_client.get_collection("usage_limits")
        self.payment_service = PaymentService()

    async def get_usage_limit(self, plan_id: str, feature: str) -> Optional[UsageLimit]:
        """Get usage limit for a feature in a plan."""
        limit = await self.limits_collection.find_one({
            "plan_id": plan_id,
            "feature": feature
        })
        if limit:
            return UsageLimit(**limit)
        return None

    async def get_current_usage(
        self,
        user_id: str,
        subscription_id: str,
        feature: str
    ) -> Optional[Usage]:
        """Get current usage for a feature."""
        usage = await self.usage_collection.find_one({
            "user_id": user_id,
            "subscription_id": subscription_id,
            "feature": feature,
            "period_end": {"$gt": datetime.utcnow()}
        })
        if usage:
            return Usage(**usage)
        return None

    async def create_usage_record(
        self,
        user_id: str,
        subscription_id: str,
        feature: str,
        limit: UsageLimit
    ) -> Usage:
        """Create a new usage record."""
        now = datetime.utcnow()
        period_start = now
        period_end = now + self._get_period_timedelta(limit.period)

        usage = Usage(
            user_id=user_id,
            subscription_id=subscription_id,
            feature=feature,
            count=0,
            period_start=period_start,
            period_end=period_end,
            last_reset=now
        )

        result = await self.usage_collection.insert_one(usage.dict())
        usage.id = str(result.inserted_id)
        return usage

    async def increment_usage(
        self,
        user_id: str,
        subscription_id: str,
        feature: str,
        count: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Usage:
        """Increment usage for a feature."""
        # Get subscription and plan
        subscription = await self.payment_service.get_subscription(subscription_id)
        if not subscription:
            raise ValueError("Subscription not found")

        # Get usage limit
        limit = await self.get_usage_limit(subscription.plan_id, feature)
        if not limit:
            raise ValueError(f"No usage limit found for feature: {feature}")

        # Get or create usage record
        usage = await self.get_current_usage(user_id, subscription_id, feature)
        if not usage:
            usage = await self.create_usage_record(user_id, subscription_id, feature, limit)

        # Check if we need to reset the counter
        if datetime.utcnow() > usage.period_end:
            usage = await self.reset_usage(user_id, subscription_id, feature, limit)

        # Check if we've exceeded the limit
        if usage.count + count > limit.limit:
            raise ValueError(f"Usage limit exceeded for feature: {feature}")

        # Update usage count
        update_dict = {
            "count": usage.count + count,
            "updated_at": datetime.utcnow()
        }
        if metadata:
            update_dict["metadata"] = metadata

        result = await self.usage_collection.find_one_and_update(
            {"_id": ObjectId(usage.id)},
            {"$set": update_dict},
            return_document=True
        )
        return Usage(**result)

    async def reset_usage(
        self,
        user_id: str,
        subscription_id: str,
        feature: str,
        limit: UsageLimit
    ) -> Usage:
        """Reset usage counter for a feature."""
        now = datetime.utcnow()
        period_start = now
        period_end = now + self._get_period_timedelta(limit.period)

        result = await self.usage_collection.find_one_and_update(
            {
                "user_id": user_id,
                "subscription_id": subscription_id,
                "feature": feature
            },
            {
                "$set": {
                    "count": 0,
                    "period_start": period_start,
                    "period_end": period_end,
                    "last_reset": now,
                    "updated_at": now
                }
            },
            return_document=True
        )
        return Usage(**result)

    async def get_usage_summary(
        self,
        user_id: str,
        subscription_id: str,
        feature: str
    ) -> Optional[UsageSummary]:
        """Get usage summary for a feature."""
        usage = await self.get_current_usage(user_id, subscription_id, feature)
        if not usage:
            return None

        subscription = await self.payment_service.get_subscription(subscription_id)
        if not subscription:
            return None

        limit = await self.get_usage_limit(subscription.plan_id, feature)
        if not limit:
            return None

        return UsageSummary(
            feature=feature,
            current_usage=usage.count,
            limit=limit.limit,
            remaining=limit.limit - usage.count,
            period_start=usage.period_start,
            period_end=usage.period_end,
            last_reset=usage.last_reset
        )

    async def get_all_usage_summaries(
        self,
        user_id: str,
        subscription_id: str
    ) -> List[UsageSummary]:
        """Get usage summaries for all features."""
        subscription = await self.payment_service.get_subscription(subscription_id)
        if not subscription:
            return []

        limits = await self.limits_collection.find({"plan_id": subscription.plan_id}).to_list(length=None)
        summaries = []

        for limit in limits:
            summary = await self.get_usage_summary(user_id, subscription_id, limit["feature"])
            if summary:
                summaries.append(summary)

        return summaries

    def _get_period_timedelta(self, period: str) -> timedelta:
        """Convert period string to timedelta."""
        if period == "daily":
            return timedelta(days=1)
        elif period == "monthly":
            return timedelta(days=30)
        elif period == "yearly":
            return timedelta(days=365)
        else:
            raise ValueError(f"Invalid period: {period}") 