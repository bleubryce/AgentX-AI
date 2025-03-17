import { EventEmitter } from 'events';
import config from '../agent/agent.config';
import { AgentExecutionResult, ExecutionStatus } from '../agent/agent.types';
import { LeadActivity, LeadInteraction } from '../../shared/types';

export interface SystemMetrics {
    cpu: number;
    memory: number;
    activeConnections: number;
    requestsPerSecond: number;
    errorRate: number;
    timestamp: string;
    queueSize?: number;
}

export interface AgentMetrics {
    agentId: string;
    activeLeads: number;
    completedLeads: number;
    successRate: number;
    averageResponseTime: number;
    lastActivity: string;
}

export interface LeadProcessingMetrics {
    totalProcessed: number;
    successfullyProcessed: number;
    failed: number;
    inProgress: number;
    averageProcessingTime: number;
    errorRates: Record<string, number>;
}

interface PerformanceMetrics {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    successRate: number;
}

interface MonitoringAlert {
    type: 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    timestamp: Date;
    metrics?: Record<string, any>;
}

class MonitoringService extends EventEmitter {
    private static instance: MonitoringService;
    private metrics: Map<string, any>;
    private alertThresholds: Map<string, number>;
    private healthChecks: Map<string, () => Promise<boolean>>;
    private metricsBuffer: Map<string, number[]>;
    private alerts: MonitoringAlert[];
    private monitoringInterval: NodeJS.Timer | null;
    private errorCounts: Map<string, number>;
    private lastCheck: Date;
    private lastUpdate: number;
    private requestCount: number;
    private errorCount: number;

    private constructor() {
        super();
        this.metrics = new Map();
        this.alertThresholds = new Map();
        this.healthChecks = new Map();
        this.metricsBuffer = new Map();
        this.alerts = [];
        this.monitoringInterval = null;
        this.errorCounts = new Map();
        this.lastCheck = new Date();
        this.lastUpdate = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.initializeMetrics();
    }

    static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }

    private initializeMetrics(): void {
        this.metrics.set('system', {
            cpu: 0,
            memory: 0,
            activeConnections: 0,
            requestsPerSecond: 0,
            errorRate: 0,
            timestamp: new Date().toISOString(),
            queueSize: 0
        });

        this.metrics.set('leads', {
            totalProcessed: 0,
            successfullyProcessed: 0,
            failed: 0,
            inProgress: 0,
            averageProcessingTime: 0,
            errorRates: {}
        });

        this.metrics.set('agents', new Map<string, AgentMetrics>());
    }

    startMonitoring(): void {
        if (this.monitoringInterval) {
            return;
        }

        this.monitoringInterval = setInterval(() => {
            this.checkSystemHealth();
        }, config.monitoring.interval);

        this.emit('monitoring:started');
    }

    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.emit('monitoring:stopped');
    }

    recordExecution(execution: AgentExecutionResult): void {
        const { agentId, status, metrics } = execution;
        
        // Record processing time
        if (!this.metricsBuffer.has(`latency:${agentId}`)) {
            this.metricsBuffer.set(`latency:${agentId}`, []);
        }
        this.metricsBuffer.get(`latency:${agentId}`)?.push(metrics.processingTime);

        // Track errors
        if (status === ExecutionStatus.FAILED) {
            const currentErrors = this.errorCounts.get(agentId) || 0;
            this.errorCounts.set(agentId, currentErrors + 1);

            if (currentErrors + 1 >= config.errors.maxErrorThreshold) {
                this.createAlert({
                    type: 'ERROR',
                    message: `Agent ${agentId} has exceeded error threshold`,
                    timestamp: new Date(),
                    metrics: { errorCount: currentErrors + 1 }
                });
            }
        }

        this.emit('execution:recorded', { agentId, status, metrics });
    }

    getPerformanceMetrics(agentId?: string): PerformanceMetrics {
        const latencyKey = agentId ? `latency:${agentId}` : 'latency:all';
        const latencies = this.metricsBuffer.get(latencyKey) || [];
        
        const sorted = [...latencies].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);

        return {
            averageLatency: this.calculateAverage(latencies),
            p95Latency: sorted[p95Index] || 0,
            p99Latency: sorted[p99Index] || 0,
            errorRate: this.calculateErrorRate(agentId),
            successRate: this.calculateSuccessRate(agentId)
        };
    }

    getSystemMetrics(): SystemMetrics {
        return {
            cpu: process.cpuUsage().user / 1000000, // Convert to seconds
            memory: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
            activeConnections: this.getActiveConnections(),
            requestsPerSecond: this.calculateRequestRate(),
            errorRate: this.calculateErrorRate(),
            timestamp: new Date().toISOString(),
            queueSize: this.metrics.get('system')?.queueSize
        };
    }

    getAlerts(limit: number = 10): MonitoringAlert[] {
        return this.alerts.slice(-limit);
    }

    clearMetricsBuffer(): void {
        this.metricsBuffer.clear();
        this.errorCounts.clear();
        this.alerts = [];
        this.emit('metrics:cleared');
    }

    private checkSystemHealth(): void {
        const metrics = this.getSystemMetrics();
        
        // Check memory usage
        if (metrics.memory > config.monitoring.metrics.memoryThreshold) {
            this.createAlert({
                type: 'WARNING',
                message: 'High memory usage detected',
                timestamp: new Date(),
                metrics: { memory: metrics.memory }
            });
        }

        // Check request rate
        if (metrics.requestsPerSecond > config.rateLimit.maxRequests) {
            this.createAlert({
                type: 'WARNING',
                message: 'High request rate detected',
                timestamp: new Date(),
                metrics: { requestsPerSecond: metrics.requestsPerSecond }
            });
        }

        this.emit('health:checked', metrics);
    }

    private createAlert(alert: MonitoringAlert): void {
        this.alerts.push(alert);
        this.emit('alert:created', alert);

        // Keep only recent alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }
    }

    private calculateAverage(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    private calculateErrorRate(agentId?: string): number {
        if (agentId) {
            return (this.errorCounts.get(agentId) || 0) / 
                   (this.metricsBuffer.get(`latency:${agentId}`)?.length || 1) * 100;
        }

        const totalErrors = Array.from(this.errorCounts.values())
            .reduce((sum, count) => sum + count, 0);
        const totalExecutions = Array.from(this.metricsBuffer.values())
            .reduce((sum, arr) => sum + arr.length, 0);

        return totalExecutions ? (totalErrors / totalExecutions) * 100 : 0;
    }

    private calculateSuccessRate(agentId?: string): number {
        return 100 - this.calculateErrorRate(agentId);
    }

    private getActiveConnections(): number {
        // This is a placeholder. In a real application, you would track actual connections
        return 0;
    }

    private calculateRequestRate(): number {
        const now = new Date();
        const timeWindow = (now.getTime() - this.lastCheck.getTime()) / 1000; // Convert to seconds
        const totalRequests = Array.from(this.metricsBuffer.values())
            .reduce((sum, arr) => sum + arr.length, 0);

        this.lastCheck = now;
        return timeWindow > 0 ? totalRequests / timeWindow : 0;
    }

    public trackSystemMetrics(metrics: Partial<SystemMetrics>): void {
        const now = Date.now();
        const timeDiff = (now - this.lastUpdate) / 1000; // Convert to seconds

        if (timeDiff >= 1) {
            this.metrics.set('system', {
                ...this.metrics.get('system'),
                requestsPerSecond: this.requestCount / timeDiff,
                errorRate: this.errorCount / timeDiff,
                queueSize: metrics.queueSize
            });
            this.requestCount = 0;
            this.errorCount = 0;
            this.lastUpdate = now;
        }

        if (metrics.errorRate) {
            this.errorCount++;
        }
        if (metrics.requestsPerSecond) {
            this.requestCount++;
        }
        if (metrics.queueSize !== undefined) {
            this.metrics.set('system', { ...this.metrics.get('system'), queueSize: metrics.queueSize });
        }

        this.checkThresholds('system', metrics);
    }

    public trackLeadProcessing(success: boolean, processingTime: number, errorType?: string): void {
        const metrics = this.metrics.get('leads') as LeadProcessingMetrics;
        metrics.totalProcessed++;
        
        if (success) {
            metrics.successfullyProcessed++;
        } else {
            metrics.failed++;
            if (errorType) {
                metrics.errorRates[errorType] = (metrics.errorRates[errorType] || 0) + 1;
            }
        }

        metrics.averageProcessingTime = (
            (metrics.averageProcessingTime * (metrics.totalProcessed - 1) + processingTime) / 
            metrics.totalProcessed
        );

        this.metrics.set('leads', metrics);
        this.checkThresholds('leads', metrics);
    }

    public trackAgentActivity(
        agentId: string, 
        activity: LeadActivity | LeadInteraction
    ): void {
        const agentsMetrics = this.metrics.get('agents') as Map<string, AgentMetrics>;
        const currentMetrics = agentsMetrics.get(agentId) || {
            agentId,
            activeLeads: 0,
            completedLeads: 0,
            successRate: 0,
            averageResponseTime: 0,
            lastActivity: new Date().toISOString()
        };

        currentMetrics.lastActivity = new Date().toISOString();
        agentsMetrics.set(agentId, currentMetrics);
        this.metrics.set('agents', agentsMetrics);
        this.checkThresholds('agent', currentMetrics);
    }

    public setAlertThreshold(metricPath: string, threshold: number): void {
        this.alertThresholds.set(metricPath, threshold);
    }

    public registerHealthCheck(name: string, check: () => Promise<boolean>): void {
        this.healthChecks.set(name, check);
    }

    public async runHealthChecks(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};
        for (const [name, check] of this.healthChecks) {
            try {
                results[name] = await check();
            } catch (error) {
                results[name] = false;
                this.emit('healthCheckError', { name, error });
            }
        }
        return results;
    }

    private checkThresholds(category: string, metrics: any): void {
        for (const [path, threshold] of this.alertThresholds) {
            if (path.startsWith(category)) {
                const value = this.getMetricValue(metrics, path.split('.').slice(1));
                if (value > threshold) {
                    this.emit('thresholdExceeded', {
                        category,
                        path,
                        value,
                        threshold
                    });
                }
            }
        }
    }

    private getMetricValue(obj: any, path: string[]): number {
        return path.reduce((curr, key) => curr?.[key], obj);
    }

    public getMetrics(): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of this.metrics) {
            result[key] = value instanceof Map ? Object.fromEntries(value) : value;
        }
        return result;
    }

    public async generateReport(): Promise<{
        metrics: Record<string, any>;
        health: Record<string, boolean>;
        timestamp: string;
    }> {
        const health = await this.runHealthChecks();
        return {
            metrics: this.getMetrics(),
            health,
            timestamp: new Date().toISOString()
        };
    }

    public reset(): void {
        this.metrics = new Map();
        this.alertThresholds = new Map();
        this.healthChecks = new Map();
        this.metricsBuffer = new Map();
        this.alerts = [];
        this.monitoringInterval = null;
        this.errorCounts = new Map();
        this.lastCheck = new Date();
        this.lastUpdate = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.initializeMetrics();
    }
}

export const monitoringService = MonitoringService.getInstance();
export default monitoringService; 