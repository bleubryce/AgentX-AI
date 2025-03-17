import { monitoringService } from '../monitoring.service';
import { healthCheckService } from '../health.service';
import { LeadActivity, LeadInteraction } from '../../../shared/types';

describe('MonitoringService', () => {
    beforeEach(() => {
        // Reset metrics before each test
        const metrics = monitoringService.getMetrics();
        Object.keys(metrics).forEach(key => {
            if (metrics[key] instanceof Map) {
                metrics[key].clear();
            } else {
                metrics[key] = {};
            }
        });
    });

    describe('System Metrics', () => {
        it('should track system metrics', () => {
            const metrics = {
                cpu: 45.5,
                memory: 512.3,
                activeConnections: 10,
                requestsPerSecond: 50,
                errorRate: 0.01,
                timestamp: new Date().toISOString()
            };

            monitoringService.trackSystemMetrics(metrics);
            const tracked = monitoringService.getMetrics().system;

            expect(tracked.cpu).toBe(metrics.cpu);
            expect(tracked.memory).toBe(metrics.memory);
            expect(tracked.activeConnections).toBe(metrics.activeConnections);
            expect(tracked.requestsPerSecond).toBe(metrics.requestsPerSecond);
            expect(tracked.errorRate).toBe(metrics.errorRate);
        });

        it('should emit threshold exceeded event', (done) => {
            monitoringService.setAlertThreshold('system.cpu', 80);
            
            monitoringService.once('thresholdExceeded', (data) => {
                expect(data.category).toBe('system');
                expect(data.path).toBe('system.cpu');
                expect(data.value).toBe(85);
                expect(data.threshold).toBe(80);
                done();
            });

            monitoringService.trackSystemMetrics({ cpu: 85 });
        });
    });

    describe('Lead Processing Metrics', () => {
        it('should track successful lead processing', () => {
            monitoringService.trackLeadProcessing(true, 150);
            const metrics = monitoringService.getMetrics().leads;

            expect(metrics.totalProcessed).toBe(1);
            expect(metrics.successfullyProcessed).toBe(1);
            expect(metrics.failed).toBe(0);
            expect(metrics.averageProcessingTime).toBe(150);
        });

        it('should track failed lead processing with error type', () => {
            monitoringService.trackLeadProcessing(false, 200, 'VALIDATION_ERROR');
            const metrics = monitoringService.getMetrics().leads;

            expect(metrics.totalProcessed).toBe(1);
            expect(metrics.successfullyProcessed).toBe(0);
            expect(metrics.failed).toBe(1);
            expect(metrics.errorRates.VALIDATION_ERROR).toBe(1);
        });

        it('should calculate average processing time correctly', () => {
            monitoringService.trackLeadProcessing(true, 100);
            monitoringService.trackLeadProcessing(true, 200);
            monitoringService.trackLeadProcessing(true, 300);

            const metrics = monitoringService.getMetrics().leads;
            expect(metrics.averageProcessingTime).toBe(200);
        });
    });

    describe('Agent Activity Tracking', () => {
        const mockActivity: LeadActivity = {
            id: '1',
            type: 'call',
            timestamp: new Date().toISOString(),
            description: 'Test call',
            agentId: 'agent1'
        };

        const mockInteraction: LeadInteraction = {
            id: '1',
            type: 'email',
            timestamp: new Date().toISOString(),
            channel: 'email',
            content: 'Test email',
            agentId: 'agent1'
        };

        it('should track agent activities', () => {
            monitoringService.trackAgentActivity('agent1', mockActivity);
            const agentMetrics = monitoringService.getMetrics().agents.agent1;

            expect(agentMetrics).toBeDefined();
            expect(agentMetrics.agentId).toBe('agent1');
            expect(new Date(agentMetrics.lastActivity)).toBeInstanceOf(Date);
        });

        it('should track agent interactions', () => {
            monitoringService.trackAgentActivity('agent1', mockInteraction);
            const agentMetrics = monitoringService.getMetrics().agents.agent1;

            expect(agentMetrics).toBeDefined();
            expect(agentMetrics.agentId).toBe('agent1');
            expect(new Date(agentMetrics.lastActivity)).toBeInstanceOf(Date);
        });
    });

    describe('Health Checks', () => {
        beforeEach(() => {
            jest.spyOn(healthCheckService, 'runAllHealthChecks');
            jest.spyOn(healthCheckService, 'runHealthCheck');
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should register and run health checks', async () => {
            const mockCheck = jest.fn().mockResolvedValue(true);
            monitoringService.registerHealthCheck('test', mockCheck);

            const results = await healthCheckService.runAllHealthChecks();
            expect(results.checks.test.status).toBe('up');
        });

        it('should handle failed health checks', async () => {
            const mockCheck = jest.fn().mockRejectedValue(new Error('Check failed'));
            monitoringService.registerHealthCheck('test', mockCheck);

            const results = await healthCheckService.runAllHealthChecks();
            expect(results.checks.test.status).toBe('down');
            expect(results.checks.test.error).toBeDefined();
        });
    });

    describe('Report Generation', () => {
        it('should generate comprehensive monitoring report', async () => {
            // Setup some test data
            monitoringService.trackSystemMetrics({
                cpu: 45.5,
                memory: 512.3,
                activeConnections: 10,
                requestsPerSecond: 50,
                errorRate: 0.01
            });

            monitoringService.trackLeadProcessing(true, 150);
            monitoringService.trackLeadProcessing(false, 200, 'VALIDATION_ERROR');

            const mockCheck = jest.fn().mockResolvedValue(true);
            monitoringService.registerHealthCheck('test', mockCheck);

            const report = await monitoringService.generateReport();

            expect(report.metrics).toBeDefined();
            expect(report.metrics.system).toBeDefined();
            expect(report.metrics.leads).toBeDefined();
            expect(report.metrics.agents).toBeDefined();
            expect(report.health).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(new Date(report.timestamp)).toBeInstanceOf(Date);
        });
    });
}); 