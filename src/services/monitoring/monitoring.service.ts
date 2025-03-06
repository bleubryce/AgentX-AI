import { EventEmitter } from 'events';
import config from '../agent/agent.config';
import { AgentExecutionResult, ExecutionStatus } from '../agent/agent.types';

interface SystemMetrics {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestRate: number;
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
    private metricsBuffer: Map<string, number[]>;
    private alerts: MonitoringAlert[];
    private monitoringInterval: NodeJS.Timer | null;
    private errorCounts: Map<string, number>;
    private lastCheck: Date;

    private constructor() {
        super();
        this.metricsBuffer = new Map();
        this.alerts = [];
        this.monitoringInterval = null;
        this.errorCounts = new Map();
        this.lastCheck = new Date();
    }

    static getInstance(): MonitoringService {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
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
            cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
            activeConnections: this.getActiveConnections(),
            requestRate: this.calculateRequestRate()
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
        if (metrics.memoryUsage > config.monitoring.metrics.memoryThreshold) {
            this.createAlert({
                type: 'WARNING',
                message: 'High memory usage detected',
                timestamp: new Date(),
                metrics: { memoryUsage: metrics.memoryUsage }
            });
        }

        // Check request rate
        if (metrics.requestRate > config.rateLimit.maxRequests) {
            this.createAlert({
                type: 'WARNING',
                message: 'High request rate detected',
                timestamp: new Date(),
                metrics: { requestRate: metrics.requestRate }
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
}

export const monitoringService = MonitoringService.getInstance();
export default monitoringService; 