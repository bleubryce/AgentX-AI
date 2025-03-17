from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
from ..models.agent import Agent, AgentConfig, AgentRequest, AgentResponse, AgentLog, AgentCreate, AgentUpdate, AgentStatus, AgentStats
from ..db.mongodb import mongodb_client
from ..core.security import verify_token, get_password_hash
from ..core.config import settings
from ..services.usage_service import UsageService
from ..services.monitoring_service import MonitoringService
import asyncio
import aioredis
import json
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..core.cache import Cache

class AgentService:
    """Service for handling agent-related operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.agents
        self.agent_collection = mongodb_client.get_collection("agents")
        self.log_collection = mongodb_client.get_collection("agent_logs")
        self.usage_service = UsageService()
        self.monitoring = MonitoringService()
        self.redis = aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
        self.cache_ttl = 3600  # 1 hour cache TTL

    async def create_agent(
        self,
        agent_data: AgentCreate,
        user_id: str
    ) -> Agent:
        """Create a new agent."""
        # Check if agent with email already exists
        if await self.collection.find_one({"email": agent_data.email}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create agent document
        agent_dict = agent_data.dict(exclude={"password"})
        agent = Agent(
            **agent_dict,
            user_id=user_id,
            stats=AgentStats(),
            last_active=datetime.utcnow()
        )
        
        # Insert into database
        result = await self.collection.insert_one(agent.dict(by_alias=True))
        
        return await self.get_by_id(str(result.inserted_id))

    async def get_by_id(self, agent_id: str) -> Optional[Agent]:
        """Get agent by ID."""
        # Try cache first
        cache_key = f"agent:{agent_id}"
        agent_dict = await Cache.get(cache_key)
        
        if not agent_dict:
            # Get from database
            agent_dict = await self.collection.find_one(
                {"_id": ObjectId(agent_id)}
            )
            if agent_dict:
                # Cache the result
                await Cache.set(cache_key, agent_dict)
        
        return Agent(**agent_dict) if agent_dict else None

    async def get_by_user_id(self, user_id: str) -> Optional[Agent]:
        """Get agent by user ID."""
        agent_dict = await self.collection.find_one({"user_id": user_id})
        return Agent(**agent_dict) if agent_dict else None

    async def update(
        self,
        agent_id: str,
        agent_data: AgentUpdate
    ) -> Optional[Agent]:
        """Update agent."""
        # Prepare update data
        update_dict = agent_data.dict(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        # Update in database
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(agent_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        if result:
            # Clear cache
            await Cache.delete(f"agent:{agent_id}")
            return Agent(**result)
        
        return None

    async def delete(self, agent_id: str) -> bool:
        """Delete agent."""
        result = await self.collection.delete_one(
            {"_id": ObjectId(agent_id)}
        )
        if result.deleted_count:
            # Clear cache
            await Cache.delete(f"agent:{agent_id}")
            return True
        return False

    async def list_agents(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[AgentStatus] = None,
        specialty: Optional[str] = None,
        service_area: Optional[str] = None,
        search_query: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1
    ) -> List[Agent]:
        """List agents with filtering and pagination."""
        # Build query
        query = {}
        
        if status:
            query["status"] = status
        
        if specialty:
            query["specialties"] = specialty
        
        if service_area:
            query["service_areas"] = service_area
        
        if search_query:
            query["$or"] = [
                {"full_name": {"$regex": search_query, "$options": "i"}},
                {"email": {"$regex": search_query, "$options": "i"}},
                {"phone": {"$regex": search_query, "$options": "i"}},
                {"bio": {"$regex": search_query, "$options": "i"}}
            ]
        
        # Execute query
        cursor = self.collection.find(query)
        
        # Apply sorting
        cursor = cursor.sort(sort_by, sort_order)
        
        # Apply pagination
        cursor = cursor.skip(skip).limit(limit)
        
        # Get results
        agents = await cursor.to_list(length=limit)
        return [Agent(**agent) for agent in agents]

    async def update_stats(
        self,
        agent_id: str,
        stats_update: Dict[str, Any]
    ) -> bool:
        """Update agent statistics."""
        result = await self.collection.update_one(
            {"_id": ObjectId(agent_id)},
            {
                "$set": {
                    "stats": stats_update,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            # Clear cache
            await Cache.delete(f"agent:{agent_id}")
            return True
        return False

    async def update_rating(
        self,
        agent_id: str,
        new_rating: float
    ) -> bool:
        """Update agent's rating."""
        agent = await self.get_by_id(agent_id)
        if not agent:
            return False
        
        current_total = agent.rating * agent.review_count if agent.rating else 0
        new_count = agent.review_count + 1
        new_avg = (current_total + new_rating) / new_count
        
        result = await self.collection.update_one(
            {"_id": ObjectId(agent_id)},
            {
                "$set": {
                    "rating": round(new_avg, 2),
                    "review_count": new_count,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            # Clear cache
            await Cache.delete(f"agent:{agent_id}")
            return True
        return False

    async def update_last_active(self, agent_id: str) -> bool:
        """Update agent's last active timestamp."""
        result = await self.collection.update_one(
            {"_id": ObjectId(agent_id)},
            {
                "$set": {
                    "last_active": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            # Clear cache
            await Cache.delete(f"agent:{agent_id}")
            return True
        return False

    async def get_top_performers(
        self,
        limit: int = 10,
        metric: str = "closed_deals"
    ) -> List[Agent]:
        """Get top performing agents by specified metric."""
        valid_metrics = {
            "closed_deals": "stats.closed_deals",
            "revenue": "stats.revenue_generated",
            "rating": "rating",
            "satisfaction": "stats.customer_satisfaction"
        }
        
        if metric not in valid_metrics:
            raise ValueError(f"Invalid metric. Must be one of: {list(valid_metrics.keys())}")
        
        agents = await self.collection.find().sort(
            valid_metrics[metric],
            -1
        ).limit(limit).to_list(length=limit)
        
        return [Agent(**agent) for agent in agents]

    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get overall performance statistics."""
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_agents": {"$sum": 1},
                    "active_agents": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$status", AgentStatus.ACTIVE]},
                                1,
                                0
                            ]
                        }
                    },
                    "total_deals": {"$sum": "$stats.closed_deals"},
                    "total_revenue": {"$sum": "$stats.revenue_generated"},
                    "avg_satisfaction": {"$avg": "$stats.customer_satisfaction"},
                    "avg_rating": {"$avg": "$rating"}
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        return results[0] if results else {}

    async def process_request(self, agent_id: str, user_id: str, request: Dict[str, Any]) -> Dict[str, Any]:
        """Process the agent request with optimizations."""
        start_time = time.time()
        await self.monitoring.track_request_start(agent_id)
        
        try:
            # Check cache first
            cache_key = f"agent:{agent_id}:query:{json.dumps(request, sort_keys=True)}"
            cached_response = await self.redis.get(cache_key)
            if cached_response:
                await self.monitoring.track_cache_operation(agent_id, True)
                return json.loads(cached_response)
                
            await self.monitoring.track_cache_operation(agent_id, False)
            
            # Process request asynchronously
            ai_task = asyncio.create_task(self._process_ai_request(agent_id, request))
            stats_task = asyncio.create_task(self._update_agent_stats(agent_id))
            
            # Wait for both tasks
            response, _ = await asyncio.gather(ai_task, stats_task)
            
            # Cache the response
            await self.redis.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(response)
            )
            
            duration = time.time() - start_time
            await self.monitoring.track_request_end(agent_id, "success", duration)
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            await self.monitoring.track_request_end(
                agent_id,
                "error",
                duration,
                error_type=type(e).__name__
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process request: {str(e)}"
            )
        finally:
            # Ensure request is always marked as ended
            await self.monitoring.track_request_end(agent_id, "completed", time.time() - start_time)

    async def _process_ai_request(self, agent_id: str, request: Dict[str, Any]) -> Dict[str, Any]:
        """Process the AI request with optimized handling."""
        # Implement actual AI processing here
        # This is a placeholder that should be replaced with actual AI processing
        await asyncio.sleep(0.1)  # Simulate processing time
        return {
            "response": "AI processed response",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    async def _update_agent_stats(self, agent_id: str) -> None:
        """Update agent statistics asynchronously."""
        # Update last active timestamp
        await self.redis.hset(
            f"agent:{agent_id}:stats",
            mapping={
                "last_active": datetime.utcnow().isoformat(),
                "total_requests": await self.redis.hincrby(f"agent:{agent_id}:stats", "total_requests", 1)
            }
        )
        
    async def get_agent_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get agent statistics with caching."""
        cache_key = f"agent:{agent_id}:stats"
        cached_stats = await self.redis.get(cache_key)
        if cached_stats:
            return json.loads(cached_stats)
            
        stats = await self.redis.hgetall(f"agent:{agent_id}:stats")
        await self.redis.setex(
            cache_key,
            self.cache_ttl,
            json.dumps(stats)
        )
        return stats

    async def _check_rate_limit(self, agent: Agent) -> bool:
        """Check if agent is within rate limits."""
        # Get recent requests count
        recent_requests = await self.log_collection.count_documents({
            "agent_id": agent.id,
            "created_at": {
                "$gte": datetime.utcnow() - timedelta(minutes=1)
            }
        })
        return recent_requests < agent.config.rate_limit

    async def _check_usage_limit(self, agent: Agent) -> bool:
        """Check if agent is within daily usage limits."""
        # Get today's usage
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_usage = await self.log_collection.aggregate([
            {
                "$match": {
                    "agent_id": agent.id,
                    "created_at": {"$gte": today_start}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_tokens": {"$sum": "$tokens_used"}
                }
            }
        ]).to_list(length=None)

        total_tokens = today_usage[0]["total_tokens"] if today_usage else 0
        return total_tokens < agent.config.usage_limit

    async def _update_agent_usage(self, agent: Agent, tokens_used: int) -> None:
        """Update agent usage statistics."""
        await self.agent_collection.update_one(
            {"_id": ObjectId(agent.id)},
            {
                "$inc": {
                    "total_requests": 1,
                    "total_tokens": tokens_used
                },
                "$set": {
                    "last_used": datetime.utcnow()
                }
            }
        )

    async def _log_request(
        self,
        agent: Agent,
        request: AgentRequest,
        status: str,
        error_message: Optional[str] = None,
        response: Optional[AgentResponse] = None
    ) -> None:
        """Log agent request and response."""
        log = AgentLog(
            user_id=agent.user_id,
            agent_id=agent.id,
            request_id=response.request_id if response else str(uuid.uuid4()),
            prompt=request.prompt,
            response=response.response if response else "",
            tokens_used=response.tokens_used if response else 0,
            features_used=request.features,
            status=status,
            error_message=error_message,
            metadata=request.metadata
        )

        await self.log_collection.insert_one(log.dict()) 