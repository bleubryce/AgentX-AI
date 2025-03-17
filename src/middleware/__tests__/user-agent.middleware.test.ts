import { Request, Response, NextFunction } from 'express';
import { userAgentMiddleware } from '../user-agent.middleware';
import { monitoringService } from '../../services/monitoring/monitoring.service';

jest.mock('../../services/monitoring/monitoring.service', () => ({
    monitoringService: {
        trackSystemMetrics: jest.fn()
    }
}));

describe('User Agent Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;
    const testUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            headers: {}
        };
        mockRes = {};
        nextFunction = jest.fn();
    });

    describe('User Agent Rotation', () => {
        it('should set user agent header', () => {
            const middleware = userAgentMiddleware({
                userAgents: testUserAgents
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockReq.headers['user-agent']).toBeDefined();
            expect(testUserAgents).toContain(mockReq.headers['user-agent']);
        });

        it('should rotate user agents sequentially', () => {
            const middleware = userAgentMiddleware({
                userAgents: testUserAgents,
                rotationStrategy: 'sequential'
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            const firstAgent = mockReq.headers['user-agent'];

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            const secondAgent = mockReq.headers['user-agent'];

            expect(firstAgent).not.toBe(secondAgent);
            expect(testUserAgents).toContain(firstAgent);
            expect(testUserAgents).toContain(secondAgent);
        });

        it('should rotate user agents randomly', () => {
            const middleware = userAgentMiddleware({
                userAgents: testUserAgents,
                rotationStrategy: 'random'
            });

            const agents = new Set();
            for (let i = 0; i < 100; i++) {
                middleware(mockReq as Request, mockRes as Response, nextFunction);
                agents.add(mockReq.headers['user-agent']);
            }

            // With 100 iterations, we should see at least 2 different agents
            expect(agents.size).toBeGreaterThan(1);
        });

        it('should respect minimum rotation interval', async () => {
            const middleware = userAgentMiddleware({
                userAgents: testUserAgents,
                minInterval: 100
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);
            const firstAgent = mockReq.headers['user-agent'];

            // Call immediately
            middleware(mockReq as Request, mockRes as Response, nextFunction);
            expect(mockReq.headers['user-agent']).toBe(firstAgent);

            // Wait for interval
            await new Promise(resolve => setTimeout(resolve, 150));

            // Call after interval
            middleware(mockReq as Request, mockRes as Response, nextFunction);
            expect(mockReq.headers['user-agent']).not.toBe(firstAgent);
        });

        it('should rotate user agents with weights', () => {
            const weights = {
                [testUserAgents[0]]: 0.5,
                [testUserAgents[1]]: 0.3,
                [testUserAgents[2]]: 0.2
            };

            const middleware = userAgentMiddleware({
                userAgents: testUserAgents,
                rotationStrategy: 'weighted',
                weights
            });

            const agentCounts: Record<string, number> = {};
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                middleware(mockReq as Request, mockRes as Response, nextFunction);
                const agent = mockReq.headers['user-agent'];
                agentCounts[agent] = (agentCounts[agent] || 0) + 1;
            }

            // Check if the distribution roughly matches the weights
            expect(agentCounts[testUserAgents[0]] / iterations).toBeCloseTo(0.5, 1);
            expect(agentCounts[testUserAgents[1]] / iterations).toBeCloseTo(0.3, 1);
            expect(agentCounts[testUserAgents[2]] / iterations).toBeCloseTo(0.2, 1);
        });
    });

    describe('Monitoring Integration', () => {
        it('should track user agent rotation in monitoring', () => {
            const middleware = userAgentMiddleware({
                userAgents: testUserAgents
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(monitoringService.trackSystemMetrics).toHaveBeenCalledWith({
                requestsPerSecond: 1,
                errorRate: 0
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle empty user agents list', () => {
            const middleware = userAgentMiddleware({
                userAgents: []
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockReq.headers['user-agent']).toBeUndefined();
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should handle invalid weights', () => {
            const middleware = userAgentMiddleware({
                userAgents: testUserAgents,
                rotationStrategy: 'weighted',
                weights: {
                    [testUserAgents[0]]: -1,
                    [testUserAgents[1]]: 0.5
                }
            });

            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockReq.headers['user-agent']).toBeDefined();
            expect(testUserAgents).toContain(mockReq.headers['user-agent']);
        });
    });
}); 