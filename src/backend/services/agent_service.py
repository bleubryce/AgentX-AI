from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
from ..models.agent import Agent, AgentConfig, AgentRequest, AgentResponse, AgentLog
from ..db.mongodb import mongodb_client
from ..core.security import verify_token
from ..core.config import settings
from ..services.usage_service import UsageService
from ..services.monitoring_service import MonitoringService
import asyncio
import aioredis
import json
from fastapi import HTTPException
import time

class AgentService:
    def __init__(self):
        self.agent_collection = mongodb_client.get_collection("agents")
        self.log_collection = mongodb_client.get_collection("agent_logs")
        self.usage_service = UsageService()
        self.monitoring = MonitoringService()
        self.redis = aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
        self.cache_ttl = 3600  # 1 hour cache TTL

    async def get_agent(self, agent_id: str, user_id: str) -> Optional[Agent]:
        """Get an agent by ID, ensuring user can only access their own agents."""
        agent = await self.agent_collection.find_one({
            "_id": ObjectId(agent_id),
            "user_id": user_id
        })
        if agent:
            return Agent(**agent)
        return None

    async def list_agents(self, user_id: str) -> List[Agent]:
        """List all agents for a user."""
        agents = await self.agent_collection.find({"user_id": user_id}).to_list(length=None)
        return [Agent(**agent) for agent in agents]

    async def create_agent(
        self,
        user_id: str,
        name: str,
        description: str,
        config: AgentConfig
    ) -> Optional[Agent]:
        """Create a new agent, checking for duplicates."""
        # Check for existing agent with same name for this user
        existing = await self.agent_collection.find_one({
            "user_id": user_id,
            "name": name
        })
        if existing:
            return None

        agent = Agent(
            user_id=user_id,
            name=name,
            description=description,
            config=config,
            is_active=True,
            total_requests=0,
            total_tokens=0
        )

        result = await self.agent_collection.insert_one(agent.dict())
        agent.id = str(result.inserted_id)
        return agent

    async def update_agent(
        self,
        agent_id: str,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Agent]:
        """Update an agent, ensuring user can only update their own agents."""
        result = await self.agent_collection.find_one_and_update(
            {"_id": ObjectId(agent_id), "user_id": user_id},
            {"$set": updates},
            return_document=True
        )
        if result:
            return Agent(**result)
        return None

    async def delete_agent(self, agent_id: str, user_id: str) -> bool:
        """Delete an agent, ensuring user can only delete their own agents."""
        result = await self.agent_collection.delete_one({
            "_id": ObjectId(agent_id),
            "user_id": user_id
        })
        return result.deleted_count > 0

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