from typing import Dict, Any, Optional
from datetime import datetime
import json
import aioredis
from prometheus_client import Counter, Histogram, Gauge
from ..core.config import settings

class MonitoringService:
    def __init__(self):
        self.redis = aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
        
        # Prometheus metrics
        self.request_counter = Counter(
            'agent_requests_total',
            'Total number of agent requests',
            ['agent_id', 'status']
        )
        
        self.response_time = Histogram(
            'agent_response_time_seconds',
            'Agent response time in seconds',
            ['agent_id']
        )
        
        self.active_requests = Gauge(
            'agent_active_requests',
            'Number of active requests per agent',
            ['agent_id']
        )
        
        self.error_counter = Counter(
            'agent_errors_total',
            'Total number of agent errors',
            ['agent_id', 'error_type']
        )
        
        self.cache_hits = Counter(
            'agent_cache_hits_total',
            'Total number of cache hits',
            ['agent_id']
        )
        
        self.cache_misses = Counter(
            'agent_cache_misses_total',
            'Total number of cache misses',
            ['agent_id']
        )
        
    async def track_request_start(self, agent_id: str) -> None:
        """Track the start of a new request."""
        self.active_requests.inc(agent_id)
        await self.redis.incr(f"monitoring:active_requests:{agent_id}")
        
    async def track_request_end(
        self,
        agent_id: str,
        status: str,
        duration: float,
        error_type: Optional[str] = None
    ) -> None:
        """Track the end of a request with metrics."""
        self.active_requests.dec(agent_id)
        self.request_counter.labels(agent_id=agent_id, status=status).inc()
        self.response_time.labels(agent_id=agent_id).observe(duration)
        
        if error_type:
            self.error_counter.labels(
                agent_id=agent_id,
                error_type=error_type
            ).inc()
            
        await self.redis.decr(f"monitoring:active_requests:{agent_id}")
        
    async def track_cache_operation(
        self,
        agent_id: str,
        is_hit: bool
    ) -> None:
        """Track cache operations."""
        if is_hit:
            self.cache_hits.labels(agent_id=agent_id).inc()
        else:
            self.cache_misses.labels(agent_id=agent_id).inc()
            
    async def get_agent_metrics(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive metrics for an agent."""
        metrics = {
            "active_requests": int(await self.redis.get(f"monitoring:active_requests:{agent_id}") or 0),
            "total_requests": self.request_counter.labels(agent_id=agent_id)._value.get(),
            "total_errors": self.error_counter.labels(agent_id=agent_id)._value.get(),
            "cache_hits": self.cache_hits.labels(agent_id=agent_id)._value.get(),
            "cache_misses": self.cache_misses.labels(agent_id=agent_id)._value.get(),
            "average_response_time": self.response_time.labels(agent_id=agent_id)._sum.get() / 
                                  max(self.response_time.labels(agent_id=agent_id)._count.get(), 1)
        }
        
        # Store metrics in Redis for historical tracking
        await self.redis.hset(
            f"monitoring:metrics:{agent_id}",
            mapping={
                "last_updated": datetime.utcnow().isoformat(),
                "metrics": json.dumps(metrics)
            }
        )
        
        return metrics
        
    async def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health metrics."""
        return {
            "total_active_requests": sum(
                int(await self.redis.get(f"monitoring:active_requests:{agent_id}") or 0)
                for agent_id in await self.redis.keys("monitoring:active_requests:*")
            ),
            "total_requests": sum(
                self.request_counter.labels(agent_id=agent_id)._value.get()
                for agent_id in self.request_counter._labelvalues
            ),
            "total_errors": sum(
                self.error_counter.labels(agent_id=agent_id)._value.get()
                for agent_id in self.error_counter._labelvalues
            ),
            "cache_hit_rate": sum(
                self.cache_hits.labels(agent_id=agent_id)._value.get()
                for agent_id in self.cache_hits._labelvalues
            ) / max(sum(
                self.cache_hits.labels(agent_id=agent_id)._value.get() +
                self.cache_misses.labels(agent_id=agent_id)._value.get()
                for agent_id in self.cache_hits._labelvalues
            ), 1)
        } 