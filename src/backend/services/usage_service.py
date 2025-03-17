from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.payment import Subscription, SubscriptionPlan
from ..core.cache import cached, cache_clear
from ..core.logger import logger

class UsageService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.usage_collection = db.usage_metrics
        self.subscription_collection = db.subscriptions
        self.plans_collection = db.subscription_plans

    async def track_usage(
        self,
        user_id: str,
        metric_name: str,
        quantity: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Track usage for a specific metric."""
        try:
            # Get user's active subscription
            subscription = await self._get_active_subscription(user_id)
            if not subscription:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No active subscription found"
                )

            # Get subscription plan limits
            plan = await self._get_subscription_plan(subscription.plan_id)
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subscription plan not found"
                )

            # Check if metric is within limits
            current_usage = await self.get_current_usage(user_id, metric_name)
            limit = plan.limits.get(metric_name)
            
            if limit and current_usage + quantity > limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Usage limit exceeded for {metric_name}"
                )

            # Record usage
            usage_record = {
                "user_id": user_id,
                "subscription_id": str(subscription.id),
                "metric_name": metric_name,
                "quantity": quantity,
                "timestamp": datetime.utcnow(),
                "metadata": metadata or {}
            }
            
            await self.usage_collection.insert_one(usage_record)
            await self._update_cache(user_id, metric_name)
            
            return {
                "status": "success",
                "current_usage": current_usage + quantity,
                "limit": limit
            }

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Error tracking usage: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error tracking usage"
            )

    @cached(key_prefix="usage", expire=300)  # Cache for 5 minutes
    async def get_current_usage(
        self,
        user_id: str,
        metric_name: str,
        start_time: Optional[datetime] = None
    ) -> int:
        """Get current usage for a specific metric."""
        try:
            if not start_time:
                # Default to start of current billing period
                subscription = await self._get_active_subscription(user_id)
                if not subscription:
                    return 0
                start_time = subscription.current_period_start

            pipeline = [
                {
                    "$match": {
                        "user_id": user_id,
                        "metric_name": metric_name,
                        "timestamp": {"$gte": start_time}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": "$quantity"}
                    }
                }
            ]

            result = await self.usage_collection.aggregate(pipeline).to_list(1)
            return result[0]["total"] if result else 0

        except Exception as e:
            logger.error(f"Error getting usage: {str(e)}")
            return 0

    async def get_usage_report(
        self,
        user_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate usage report for all metrics."""
        try:
            if not start_time:
                start_time = datetime.utcnow() - timedelta(days=30)
            if not end_time:
                end_time = datetime.utcnow()

            pipeline = [
                {
                    "$match": {
                        "user_id": user_id,
                        "timestamp": {
                            "$gte": start_time,
                            "$lte": end_time
                        }
                    }
                },
                {
                    "$group": {
                        "_id": "$metric_name",
                        "total": {"$sum": "$quantity"},
                        "daily_usage": {
                            "$push": {
                                "date": "$timestamp",
                                "quantity": "$quantity"
                            }
                        }
                    }
                }
            ]

            results = await self.usage_collection.aggregate(pipeline).to_list(None)
            
            # Get subscription plan limits
            subscription = await self._get_active_subscription(user_id)
            plan = await self._get_subscription_plan(subscription.plan_id) if subscription else None
            
            usage_report = {
                "period_start": start_time,
                "period_end": end_time,
                "metrics": {}
            }

            for result in results:
                metric_name = result["_id"]
                usage_report["metrics"][metric_name] = {
                    "total": result["total"],
                    "limit": plan.limits.get(metric_name) if plan else None,
                    "daily_usage": self._aggregate_daily_usage(
                        result["daily_usage"],
                        start_time,
                        end_time
                    )
                }

            return usage_report

        except Exception as e:
            logger.error(f"Error generating usage report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error generating usage report"
            )

    def _aggregate_daily_usage(
        self,
        usage_data: List[Dict[str, Any]],
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        """Aggregate usage data by day."""
        daily_usage = {}
        current_date = start_time.date()
        end_date = end_time.date()

        while current_date <= end_date:
            daily_usage[current_date] = 0
            current_date += timedelta(days=1)

        for usage in usage_data:
            date = usage["date"].date()
            daily_usage[date] = daily_usage.get(date, 0) + usage["quantity"]

        return [
            {"date": date, "quantity": quantity}
            for date, quantity in daily_usage.items()
        ]

    async def _get_active_subscription(self, user_id: str) -> Optional[Subscription]:
        """Get user's active subscription."""
        subscription = await self.subscription_collection.find_one({
            "user_id": user_id,
            "status": "active"
        })
        return Subscription(**subscription) if subscription else None

    async def _get_subscription_plan(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan."""
        plan = await self.plans_collection.find_one({"_id": plan_id})
        return SubscriptionPlan(**plan) if plan else None

    async def _update_cache(self, user_id: str, metric_name: str) -> None:
        """Clear usage cache for user and metric."""
        cache_key = f"usage:{user_id}:{metric_name}"
        await cache_clear(cache_key) 