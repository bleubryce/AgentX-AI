import { Request, Response, NextFunction } from 'express';
import { proxyMiddleware } from '../proxy.middleware';
import { monitoringService } from '../../services/monitoring/monitoring.service';
import axios from 'axios';

jest.mock('../../services/monitoring/monitoring.service', () => ({
    monitoringService: {
        trackSystemMetrics: jest.fn()
    }
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Proxy Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;
    let mockJson: jest.Mock;
    const testProxies = [
        'http://proxy1.example.com:8080',
        'http://proxy2.example.com:8080',
        'http://proxy3.example.com:8080'
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {};
        mockJson = jest.fn();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: mockJson
        };
        nextFunction = jest.fn();
    });

    describe('Proxy Rotation', () => {
        it('should set proxy in request', async () => {
            mockedAxios.get.mockResolvedValueOnce({ status: 200 });
            const middleware = proxyMiddleware({
                proxies: testProxies,
                healthCheckInterval: 100
            });

            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockReq.proxy).toBeDefined();
            expect(testProxies).toContain(mockReq.proxy);
        });

        it('should rotate proxies in round-robin order', async () => {
            mockedAxios.get.mockResolvedValue({ status: 200 });
            const middleware = proxyMiddleware({
                proxies: testProxies,
                rotationStrategy: 'round-robin',
                healthCheckInterval: 100
            });

            await middleware(mockReq as Request, mockRes as Response, nextFunction);
            const firstProxy = mockReq.proxy;

            await middleware(mockReq as Request, mockRes as Response, nextFunction);
            const secondProxy = mockReq.proxy;

            expect(firstProxy).not.toBe(secondProxy);
            expect(testProxies).toContain(firstProxy);
            expect(testProxies).toContain(secondProxy);
        });

        it('should rotate proxies randomly', async () => {
            mockedAxios.get.mockResolvedValue({ status: 200 });
            const middleware = proxyMiddleware({
                proxies: testProxies,
                rotationStrategy: 'random',
                healthCheckInterval: 100
            });

            const proxies = new Set();
            for (let i = 0; i < 100; i++) {
                await middleware(mockReq as Request, mockRes as Response, nextFunction);
                proxies.add(mockReq.proxy);
            }

            // With 100 iterations, we should see at least 2 different proxies
            expect(proxies.size).toBeGreaterThan(1);
        });

        it('should use least-used proxy', async () => {
            mockedAxios.get.mockResolvedValue({ status: 200 });
            const middleware = proxyMiddleware({
                proxies: testProxies,
                rotationStrategy: 'least-used',
                healthCheckInterval: 100
            });

            // First request should use first proxy
            await middleware(mockReq as Request, mockRes as Response, nextFunction);
            const firstProxy = mockReq.proxy;

            // Second request should use a different proxy
            await middleware(mockReq as Request, mockRes as Response, nextFunction);
            const secondProxy = mockReq.proxy;

            expect(firstProxy).not.toBe(secondProxy);
        });
    });

    describe('Health Checking', () => {
        it('should mark proxy as unhealthy after failures', async () => {
            mockedAxios.get
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValueOnce({ status: 200 });

            const middleware = proxyMiddleware({
                proxies: testProxies,
                maxFailures: 3,
                healthCheckInterval: 100
            });

            // Wait for health checks to run
            await new Promise(resolve => setTimeout(resolve, 150));

            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockReq.proxy).toBeDefined();
            expect(testProxies).toContain(mockReq.proxy);
        });

        it('should return 503 when no healthy proxies available', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

            const middleware = proxyMiddleware({
                proxies: testProxies,
                maxFailures: 1,
                healthCheckInterval: 100
            });

            // Wait for health checks to run
            await new Promise(resolve => setTimeout(resolve, 150));

            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'NO_HEALTHY_PROXIES',
                    message: 'No healthy proxies available',
                    details: {
                        totalProxies: testProxies.length,
                        healthyProxies: 0
                    }
                }
            });
        });
    });

    describe('Monitoring Integration', () => {
        it('should track proxy failures in monitoring', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

            const middleware = proxyMiddleware({
                proxies: testProxies,
                healthCheckInterval: 100
            });

            // Wait for health checks to run
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                errorRate: 1,
                requestsPerSecond: 0
            });
        });

        it('should track no healthy proxies in monitoring', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

            const middleware = proxyMiddleware({
                proxies: testProxies,
                maxFailures: 1,
                healthCheckInterval: 100
            });

            // Wait for health checks to run
            await new Promise(resolve => setTimeout(resolve, 150));

            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                errorRate: 1,
                requestsPerSecond: 0
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle empty proxies list', async () => {
            const middleware = proxyMiddleware({
                proxies: [],
                healthCheckInterval: 100
            });

            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'NO_HEALTHY_PROXIES',
                    message: 'No healthy proxies available',
                    details: {
                        totalProxies: 0,
                        healthyProxies: 0
                    }
                }
            });
        });

        it('should handle invalid proxy URLs', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Invalid URL'));

            const middleware = proxyMiddleware({
                proxies: ['invalid-url'],
                healthCheckInterval: 100
            });

            // Wait for health checks to run
            await new Promise(resolve => setTimeout(resolve, 150));

            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(503);
        });
    });
}); 