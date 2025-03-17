import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware, errorMetricsMiddleware } from '../metrics.middleware';
import { monitoringService } from '../../services/monitoring/monitoring.service';

jest.mock('../../services/monitoring/monitoring.service', () => ({
    monitoringService: {
        trackSystemMetrics: jest.fn()
    }
}));

describe('Metrics Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            method: 'GET',
            path: '/test',
            startTime: Date.now()
        };
        mockRes = {
            statusCode: 200,
            end: jest.fn(),
            json: jest.fn(),
        };
        nextFunction = jest.fn();
    });

    describe('metricsMiddleware', () => {
        it('should track metrics for normal response', () => {
            const middleware = metricsMiddleware();
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            // Simulate response end
            mockRes.end!();

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                requestsPerSecond: 1,
                errorRate: 0
            });
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should track metrics for error response', () => {
            const middleware = metricsMiddleware();
            mockRes.statusCode = 500;
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            // Simulate response end
            mockRes.end!();

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                requestsPerSecond: 1,
                errorRate: 1
            });
        });

        it('should track metrics for JSON response', () => {
            const middleware = metricsMiddleware();
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            // Simulate JSON response
            mockRes.json!({ data: 'test' });

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                requestsPerSecond: 1,
                errorRate: 0
            });
        });

        it('should preserve original response methods', () => {
            const middleware = metricsMiddleware();
            const originalEnd = mockRes.end;
            const originalJson = mockRes.json;

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.end).not.toBe(originalEnd);
            expect(mockRes.json).not.toBe(originalJson);

            // Should still call original methods
            mockRes.end!();
            expect(originalEnd).toHaveBeenCalled();

            mockRes.json!({ data: 'test' });
            expect(originalJson).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should track response time', async () => {
            const middleware = metricsMiddleware();
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            // Simulate some delay
            await new Promise(resolve => setTimeout(resolve, 10));

            mockRes.end!();

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalled();
            const calls = (monitoringService.trackSystemMetrics as jest.Mock).mock.calls;
            expect(calls[0][0]).toHaveProperty('requestsPerSecond', 1);
        });
    });

    describe('errorMetricsMiddleware', () => {
        it('should track error metrics', () => {
            const middleware = errorMetricsMiddleware();
            const error = new Error('Test error');

            middleware(error, mockReq as Request, mockRes as Response, nextFunction);

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                requestsPerSecond: 1,
                errorRate: 1
            });
            expect(nextFunction).toHaveBeenCalledWith(error);
        });

        it('should track response time for errors', async () => {
            const middleware = errorMetricsMiddleware();
            const error = new Error('Test error');

            // Simulate some delay
            await new Promise(resolve => setTimeout(resolve, 10));

            middleware(error, mockReq as Request, mockRes as Response, nextFunction);

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalled();
            const calls = (monitoringService.trackSystemMetrics as jest.Mock).mock.calls;
            expect(calls[0][0]).toHaveProperty('requestsPerSecond', 1);
            expect(calls[0][0]).toHaveProperty('errorRate', 1);
        });

        it('should pass error to next middleware', () => {
            const middleware = errorMetricsMiddleware();
            const error = new Error('Test error');

            middleware(error, mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(error);
        });
    });
}); 