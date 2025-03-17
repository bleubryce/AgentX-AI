from prometheus_client import Counter, Histogram, Info
from functools import wraps
import time
import structlog
from typing import Any, Callable
from fastapi import Request

# Prometheus metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

lead_creation_total = Counter(
    'lead_creation_total',
    'Total number of leads created',
    ['source']
)

analytics_queries_total = Counter(
    'analytics_queries_total',
    'Total number of analytics queries',
    ['report_type']
)

# Structured logger setup
logger = structlog.get_logger()

def log_endpoint_access(func: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        request: Request = kwargs.get("request")
        start_time = time.time()
        
        try:
            response = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Update Prometheus metrics
            http_requests_total.labels(
                method=request.method,
                endpoint=request.url.path,
                status=200
            ).inc()
            
            http_request_duration_seconds.labels(
                method=request.method,
                endpoint=request.url.path
            ).observe(duration)
            
            # Structured logging
            logger.info(
                "endpoint_access",
                method=request.method,
                path=request.url.path,
                duration=duration,
                status_code=200
            )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Update Prometheus metrics for errors
            http_requests_total.labels(
                method=request.method,
                endpoint=request.url.path,
                status=500
            ).inc()
            
            # Log error
            logger.error(
                "endpoint_error",
                method=request.method,
                path=request.url.path,
                duration=duration,
                error=str(e),
                status_code=500
            )
            
            raise
            
    return wrapper

def track_lead_creation(source: str) -> None:
    """Track lead creation by source"""
    lead_creation_total.labels(source=source).inc()
    logger.info("lead_created", source=source)

def track_analytics_query(report_type: str) -> None:
    """Track analytics query by type"""
    analytics_queries_total.labels(report_type=report_type).inc()
    logger.info("analytics_query", report_type=report_type) 