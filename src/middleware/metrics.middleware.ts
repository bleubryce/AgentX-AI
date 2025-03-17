import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring/monitoring.service';

interface RequestMetrics {
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    timestamp: string;
}

const metricsMiddleware = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        const originalEnd = res.end;
        const originalJson = res.json;

        // Track response time
        res.end = function (chunk?: any, encoding?: any, callback?: any) {
            const responseTime = Date.now() - startTime;
            const metrics: RequestMetrics = {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime,
                timestamp: new Date().toISOString()
            };

            // Update system metrics
            monitoringService.trackSystemMetrics({
                requestsPerSecond: 1, // Will be averaged over time by the monitoring service
                errorRate: res.statusCode >= 400 ? 1 : 0
            });

            // Call original end
            return originalEnd.call(this, chunk, encoding, callback);
        };

        // Track JSON responses
        res.json = function (body: any) {
            const responseTime = Date.now() - startTime;
            const metrics: RequestMetrics = {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime,
                timestamp: new Date().toISOString()
            };

            // Update system metrics
            monitoringService.trackSystemMetrics({
                requestsPerSecond: 1,
                errorRate: res.statusCode >= 400 ? 1 : 0
            });

            // Call original json
            return originalJson.call(this, body);
        };

        next();
    };
};

// Error tracking middleware
const errorMetricsMiddleware = () => {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        const responseTime = Date.now() - (req as any).startTime;
        const metrics: RequestMetrics = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            timestamp: new Date().toISOString()
        };

        // Update system metrics with error
        monitoringService.trackSystemMetrics({
            requestsPerSecond: 1,
            errorRate: 1
        });

        next(err);
    };
};

export { metricsMiddleware, errorMetricsMiddleware }; 