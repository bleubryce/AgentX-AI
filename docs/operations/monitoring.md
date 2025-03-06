# System Monitoring

## Overview

The AI SaaS platform includes comprehensive monitoring capabilities to track system performance, health, and usage metrics. This document outlines the monitoring features and how to access them.

## Available Metrics

### Request Metrics
- Total requests per agent
- Request success/failure rates
- Response times
- Active concurrent requests

### Cache Performance
- Cache hit/miss rates
- Cache size and utilization
- Cache eviction rates

### System Health
- API endpoint availability
- Database connection status
- Redis connection status
- Memory usage
- CPU utilization

### Error Tracking
- Error rates by type
- Error distribution across agents
- Error resolution times

## Accessing Metrics

### Prometheus Endpoints

The platform exposes Prometheus metrics at `/metrics` endpoint:

```bash
curl http://your-api-url/metrics
```

Key metrics include:
- `agent_requests_total`: Total number of requests per agent
- `agent_response_time_seconds`: Response time distribution
- `agent_active_requests`: Current active requests
- `agent_errors_total`: Error counts by type
- `agent_cache_hits_total`: Cache hit counts
- `agent_cache_misses_total`: Cache miss counts

### Redis Metrics

Agent-specific metrics are stored in Redis with the following keys:
- `monitoring:active_requests:{agent_id}`: Current active requests
- `monitoring:metrics:{agent_id}`: Historical metrics
- `agent:{agent_id}:stats`: Agent statistics

## Monitoring Dashboard

Access the monitoring dashboard at `/monitoring` to view:
- Real-time system status
- Performance graphs
- Error rates
- Resource utilization

## Alerting

### Alert Thresholds
- Error rate > 5% for 5 minutes
- Response time > 2 seconds
- Cache hit rate < 80%
- Memory usage > 80%

### Alert Channels
- Email notifications
- Slack integration
- PagerDuty integration

## Best Practices

1. **Regular Monitoring**
   - Check system health daily
   - Review error rates weekly
   - Monitor performance trends monthly

2. **Alert Management**
   - Configure appropriate thresholds
   - Set up escalation policies
   - Review and adjust alerts regularly

3. **Performance Optimization**
   - Monitor cache effectiveness
   - Track response times
   - Identify bottlenecks

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check API rate limits
   - Verify database connections
   - Review recent code changes

2. **Slow Response Times**
   - Monitor cache hit rates
   - Check database performance
   - Review API endpoint load

3. **Cache Issues**
   - Verify Redis connection
   - Check cache configuration
   - Monitor memory usage

### Resolution Steps

1. **For API Issues**
   ```bash
   # Check API health
   curl http://your-api-url/health
   
   # View recent errors
   curl http://your-api-url/metrics | grep error
   ```

2. **For Cache Issues**
   ```bash
   # Check Redis status
   redis-cli ping
   
   # View cache stats
   redis-cli info | grep cache
   ```

3. **For Performance Issues**
   ```bash
   # Check system resources
   top
   
   # View application logs
   tail -f /var/log/application.log
   ```

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Redis Monitoring Guide](https://redis.io/topics/monitoring)
- [Alerting Best Practices](https://prometheus.io/docs/practices/alerting/) 