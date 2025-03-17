import { healthCheckService } from '../health.service';

describe('HealthCheckService', () => {
    beforeEach(() => {
        // Clear all registered health checks
        const service = healthCheckService as any;
        service.checks.clear();
        service.lastResults.clear();
    });

    describe('Health Check Registration', () => {
        it('should register a new health check', () => {
            const mockCheck = jest.fn().mockResolvedValue(true);
            healthCheckService.registerCheck('test', mockCheck);

            const service = healthCheckService as any;
            expect(service.checks.has('test')).toBe(true);
        });

        it('should override existing health check', () => {
            const mockCheck1 = jest.fn().mockResolvedValue(true);
            const mockCheck2 = jest.fn().mockResolvedValue(true);

            healthCheckService.registerCheck('test', mockCheck1);
            healthCheckService.registerCheck('test', mockCheck2);

            const service = healthCheckService as any;
            expect(service.checks.get('test')).toBe(mockCheck2);
        });
    });

    describe('Running Health Checks', () => {
        it('should run a specific health check', async () => {
            const mockCheck = jest.fn().mockResolvedValue(true);
            healthCheckService.registerCheck('test', mockCheck);

            const result = await healthCheckService.runHealthCheck('test');
            expect(result).toBe(true);
            expect(mockCheck).toHaveBeenCalled();
        });

        it('should throw error for non-existent health check', async () => {
            await expect(healthCheckService.runHealthCheck('nonexistent'))
                .rejects
                .toThrow("Health check 'nonexistent' not found");
        });

        it('should store health check results', async () => {
            const mockCheck = jest.fn().mockResolvedValue(true);
            healthCheckService.registerCheck('test', mockCheck);

            await healthCheckService.runHealthCheck('test');
            const service = healthCheckService as any;
            const result = service.lastResults.get('test');

            expect(result).toBeDefined();
            expect(result.status).toBe('up');
            expect(result.responseTime).toBeDefined();
            expect(result.lastChecked).toBeDefined();
        });

        it('should handle failed health checks', async () => {
            const error = new Error('Check failed');
            const mockCheck = jest.fn().mockRejectedValue(error);
            healthCheckService.registerCheck('test', mockCheck);

            const result = await healthCheckService.runHealthCheck('test');
            expect(result).toBe(false);

            const service = healthCheckService as any;
            const lastResult = service.lastResults.get('test');
            expect(lastResult.status).toBe('down');
            expect(lastResult.error).toBe('Check failed');
        });
    });

    describe('Running All Health Checks', () => {
        it('should run all registered health checks', async () => {
            const mockCheck1 = jest.fn().mockResolvedValue(true);
            const mockCheck2 = jest.fn().mockResolvedValue(true);

            healthCheckService.registerCheck('test1', mockCheck1);
            healthCheckService.registerCheck('test2', mockCheck2);

            const results = await healthCheckService.runAllHealthChecks();

            expect(results.status).toBe('healthy');
            expect(results.checks.test1.status).toBe('up');
            expect(results.checks.test2.status).toBe('up');
            expect(mockCheck1).toHaveBeenCalled();
            expect(mockCheck2).toHaveBeenCalled();
        });

        it('should mark status as unhealthy when critical check fails', async () => {
            healthCheckService.registerCheck('mongodb', jest.fn().mockResolvedValue(false));
            healthCheckService.registerCheck('api', jest.fn().mockResolvedValue(true));

            const results = await healthCheckService.runAllHealthChecks();
            expect(results.status).toBe('unhealthy');
        });

        it('should mark status as degraded when non-critical check fails', async () => {
            healthCheckService.registerCheck('mongodb', jest.fn().mockResolvedValue(true));
            healthCheckService.registerCheck('memory', jest.fn().mockResolvedValue(false));

            const results = await healthCheckService.runAllHealthChecks();
            expect(results.status).toBe('degraded');
        });
    });

    describe('Getting Last Results', () => {
        it('should return last results without running checks', async () => {
            const mockCheck = jest.fn().mockResolvedValue(true);
            healthCheckService.registerCheck('test', mockCheck);

            await healthCheckService.runHealthCheck('test');
            const results = healthCheckService.getLastResults();

            expect(results.checks.test).toBeDefined();
            expect(mockCheck).toHaveBeenCalledTimes(1); // Should not run check again
        });

        it('should return correct status based on last results', async () => {
            healthCheckService.registerCheck('mongodb', jest.fn().mockResolvedValue(false));
            healthCheckService.registerCheck('memory', jest.fn().mockResolvedValue(true));

            await healthCheckService.runAllHealthChecks();
            const results = healthCheckService.getLastResults();

            expect(results.status).toBe('unhealthy');
            expect(results.checks.mongodb.status).toBe('down');
            expect(results.checks.memory.status).toBe('up');
        });
    });

    describe('Default Health Checks', () => {
        beforeEach(() => {
            process.env.MONGO_URI = 'mongodb://localhost:27017';
            process.env.MAX_MEMORY_USAGE_MB = '1024';
            process.env.API_BASE_URL = 'http://localhost:3000';
        });

        afterEach(() => {
            delete process.env.MONGO_URI;
            delete process.env.MAX_MEMORY_USAGE_MB;
            delete process.env.API_BASE_URL;
        });

        it('should have default health checks registered', () => {
            const service = healthCheckService as any;
            expect(service.checks.has('mongodb')).toBe(true);
            expect(service.checks.has('memory')).toBe(true);
            expect(service.checks.has('cpu')).toBe(true);
            expect(service.checks.has('api')).toBe(true);
        });

        it('should run memory check with default threshold', async () => {
            delete process.env.MAX_MEMORY_USAGE_MB;
            await healthCheckService.runHealthCheck('memory');

            const service = healthCheckService as any;
            const result = service.lastResults.get('memory');
            expect(result.status).toBe('up');
        });
    });
}); 