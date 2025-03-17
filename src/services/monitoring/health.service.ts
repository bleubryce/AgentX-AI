import { MongoClient } from 'mongodb';
import { monitoringService } from './monitoring.service';

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: {
        [key: string]: {
            status: 'up' | 'down';
            responseTime?: number;
            error?: string;
            lastChecked: string;
        };
    };
    timestamp: string;
}

class HealthCheckService {
    private static instance: HealthCheckService;
    private checks: Map<string, () => Promise<boolean>>;
    private lastResults: Map<string, {
        status: 'up' | 'down';
        responseTime: number;
        error?: string;
        lastChecked: string;
    }>;

    private constructor() {
        this.checks = new Map();
        this.lastResults = new Map();
        this.registerDefaultChecks();
    }

    public static getInstance(): HealthCheckService {
        if (!HealthCheckService.instance) {
            HealthCheckService.instance = new HealthCheckService();
        }
        return HealthCheckService.instance;
    }

    private registerDefaultChecks(): void {
        // MongoDB health check
        this.registerCheck('mongodb', async () => {
            try {
                const client = await MongoClient.connect(process.env.MONGO_URI || '', {
                    serverSelectionTimeoutMS: 5000
                });
                await client.db().admin().ping();
                await client.close();
                return true;
            } catch (error) {
                return false;
            }
        });

        // Memory usage check
        this.registerCheck('memory', async () => {
            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            const max = process.env.MAX_MEMORY_USAGE_MB ? 
                parseInt(process.env.MAX_MEMORY_USAGE_MB) : 
                1024; // Default 1GB
            return used < max;
        });

        // CPU usage check
        this.registerCheck('cpu', async () => {
            const startUsage = process.cpuUsage();
            await new Promise(resolve => setTimeout(resolve, 100));
            const endUsage = process.cpuUsage(startUsage);
            const userCPUUsagePercent = (endUsage.user / 1000000) * 10; // Convert to percentage
            return userCPUUsagePercent < 80; // Alert if CPU usage is above 80%
        });

        // API endpoints check
        this.registerCheck('api', async () => {
            try {
                const response = await fetch(`${process.env.API_BASE_URL}/health`);
                return response.ok;
            } catch (error) {
                return false;
            }
        });
    }

    public registerCheck(name: string, check: () => Promise<boolean>): void {
        this.checks.set(name, check);
        monitoringService.registerHealthCheck(name, check);
    }

    public async runHealthCheck(name: string): Promise<boolean> {
        const check = this.checks.get(name);
        if (!check) {
            throw new Error(`Health check '${name}' not found`);
        }

        const startTime = Date.now();
        try {
            const result = await check();
            const responseTime = Date.now() - startTime;

            this.lastResults.set(name, {
                status: result ? 'up' : 'down',
                responseTime,
                lastChecked: new Date().toISOString()
            });

            return result;
        } catch (error) {
            this.lastResults.set(name, {
                status: 'down',
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
                lastChecked: new Date().toISOString()
            });
            return false;
        }
    }

    public async runAllHealthChecks(): Promise<HealthCheckResult> {
        const results: HealthCheckResult = {
            status: 'healthy',
            checks: {},
            timestamp: new Date().toISOString()
        };

        let hasFailures = false;
        let hasDegradation = false;

        for (const [name] of this.checks) {
            const isHealthy = await this.runHealthCheck(name);
            const lastResult = this.lastResults.get(name)!;

            results.checks[name] = {
                status: lastResult.status,
                responseTime: lastResult.responseTime,
                error: lastResult.error,
                lastChecked: lastResult.lastChecked
            };

            if (!isHealthy) {
                if (name === 'mongodb' || name === 'api') {
                    hasFailures = true;
                } else {
                    hasDegradation = true;
                }
            }
        }

        results.status = hasFailures ? 'unhealthy' : (hasDegradation ? 'degraded' : 'healthy');
        return results;
    }

    public getLastResults(): HealthCheckResult {
        const results: HealthCheckResult = {
            status: 'healthy',
            checks: {},
            timestamp: new Date().toISOString()
        };

        let hasFailures = false;
        let hasDegradation = false;

        for (const [name, result] of this.lastResults) {
            results.checks[name] = result;
            
            if (result.status === 'down') {
                if (name === 'mongodb' || name === 'api') {
                    hasFailures = true;
                } else {
                    hasDegradation = true;
                }
            }
        }

        results.status = hasFailures ? 'unhealthy' : (hasDegradation ? 'degraded' : 'healthy');
        return results;
    }
}

export const healthCheckService = HealthCheckService.getInstance(); 