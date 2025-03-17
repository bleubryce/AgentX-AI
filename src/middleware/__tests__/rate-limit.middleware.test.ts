import { Request, Response, NextFunction } from 'express';
import { rateLimit } from '../rate-limit.middleware';
import { monitoringService } from '../../services/monitoring/monitoring.service';

jest.mock('../../services/monitoring/monitoring.service', () => ({
    monitoringService: {
        trackSystemMetrics: jest.fn()
    }
}));

describe('Rate Limit Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;
    let mockJson: jest.Mock;
    let mockSetHeader: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            ip: '127.0.0.1',
            method: 'GET',
            path: '/test'
        };
        mockJson = jest.fn();
        mockSetHeader = jest.fn();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: mockJson,
            setHeader: mockSetHeader
        };
        nextFunction = jest.fn();
    });

    describe('Rate Limiting', () => {
        it('should allow requests within limit', () => {
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledTimes(2);
            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '2');
            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        });

        it('should block requests exceeding limit', () => {
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests, please try again later',
                    details: expect.any(Object)
                }
            });
        });

        it('should reset limit after window expires', async () => {
            const middleware = rateLimit({
                windowMs: 100,
                maxRequests: 2
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledTimes(3);
        });

        it('should use custom key generator', () => {
            const customKey = 'custom-key';
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2,
                keyGenerator: () => customKey
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(429);
        });

        it('should handle missing IP address', () => {
            const reqWithoutIp = {
                method: 'GET',
                path: '/test'
            };
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2
            });

            middleware(reqWithoutIp as Request, mockRes as Response, nextFunction);
            middleware(reqWithoutIp as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledTimes(2);
        });

        it('should track rate limit exceeded in monitoring', () => {
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                errorRate: 1,
                requestsPerSecond: 0
            });
        });
    });

    describe('Response Headers', () => {
        it('should set rate limit headers correctly', () => {
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '2');
            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');
            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
        });

        it('should update remaining requests header', () => {
            const middleware = rateLimit({
                windowMs: 1000,
                maxRequests: 2
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            expect(mockSetHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        });
    });
}); 