from functools import wraps
from typing import Any, Callable, Optional, Union
import json
from datetime import datetime, timedelta
import redis.asyncio as redis
from fastapi import HTTPException
from .config import settings

# Redis client instance
redis_client: Optional[redis.Redis] = None

async def init_redis_pool() -> redis.Redis:
    """Initialize Redis connection pool."""
    global redis_client
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=settings.REDIS_PASSWORD,
        decode_responses=True
    )
    return redis_client

async def close_redis_pool() -> None:
    """Close Redis connection pool."""
    if redis_client:
        await redis_client.close()

def serialize_value(value: Any) -> str:
    """Serialize value to JSON string."""
    if isinstance(value, datetime):
        return value.isoformat()
    return json.dumps(value)

def deserialize_value(value: str) -> Any:
    """Deserialize value from JSON string."""
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value

class Cache:
    """Cache decorator and utility methods."""
    
    @staticmethod
    async def get(key: str) -> Any:
        """Get value from cache."""
        if not redis_client:
            return None
        value = await redis_client.get(key)
        return deserialize_value(value) if value else None
    
    @staticmethod
    async def set(key: str, value: Any, expire: int = 3600) -> bool:
        """Set value in cache with expiration."""
        if not redis_client:
            return False
        try:
            serialized_value = serialize_value(value)
            await redis_client.set(key, serialized_value, ex=expire)
            return True
        except Exception:
            return False
    
    @staticmethod
    async def delete(key: str) -> bool:
        """Delete value from cache."""
        if not redis_client:
            return False
        return bool(await redis_client.delete(key))
    
    @staticmethod
    async def clear_pattern(pattern: str) -> int:
        """Clear all keys matching pattern."""
        if not redis_client:
            return 0
        keys = await redis_client.keys(pattern)
        if keys:
            return await redis_client.delete(*keys)
        return 0

def cached(
    key_prefix: str,
    expire: int = 3600,
    include_user_id: bool = False,
    include_query_params: bool = False
) -> Callable:
    """Cache decorator for FastAPI endpoints."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not redis_client:
                return await func(*args, **kwargs)
            
            # Build cache key
            cache_key = [key_prefix]
            
            # Add user_id to cache key if required
            if include_user_id:
                request = kwargs.get('request')
                if request and hasattr(request, 'user'):
                    cache_key.append(str(request.user.id))
            
            # Add query params to cache key if required
            if include_query_params:
                request = kwargs.get('request')
                if request and request.query_params:
                    params = dict(request.query_params)
                    cache_key.append(
                        '_'.join(f"{k}:{v}" for k, v in sorted(params.items()))
                    )
            
            # Add function args to cache key
            cache_key.extend(str(arg) for arg in args)
            cache_key.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            
            final_key = ':'.join(cache_key)
            
            # Try to get from cache
            cached_value = await Cache.get(final_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await Cache.set(final_key, result, expire)
            return result
            
        return wrapper
    return decorator

class RateLimiter:
    """Rate limiting utility."""
    
    @staticmethod
    async def check_rate_limit(
        key: str,
        max_requests: int,
        window: int
    ) -> tuple[bool, int]:
        """
        Check if request is within rate limit.
        Returns (is_allowed, remaining_requests).
        """
        if not redis_client:
            return True, max_requests
        
        pipe = redis_client.pipeline()
        now = datetime.utcnow().timestamp()
        window_key = f"{key}:{int(now / window)}"
        
        try:
            # Get current request count
            requests = await redis_client.get(window_key)
            current = int(requests) if requests else 0
            
            if current >= max_requests:
                return False, 0
            
            # Increment request count
            await pipe.incr(window_key)
            await pipe.expire(window_key, window)
            await pipe.execute()
            
            return True, max_requests - (current + 1)
        except Exception:
            return True, max_requests

def rate_limit(
    max_requests: int = 100,
    window: int = 3600,
    key_prefix: str = "rate_limit"
) -> Callable:
    """Rate limiting decorator for FastAPI endpoints."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get('request')
            if not request:
                return await func(*args, **kwargs)
            
            # Get client IP
            client_ip = request.client.host if request.client else "unknown"
            key = f"{key_prefix}:{client_ip}"
            
            # Check rate limit
            is_allowed, remaining = await RateLimiter.check_rate_limit(
                key,
                max_requests,
                window
            )
            
            if not is_allowed:
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests"
                )
            
            # Add rate limit headers
            response = await func(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Remaining'] = str(remaining)
                response.headers['X-RateLimit-Limit'] = str(max_requests)
                response.headers['X-RateLimit-Window'] = str(window)
            
            return response
            
        return wrapper
    return decorator 