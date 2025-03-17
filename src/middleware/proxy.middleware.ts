import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring/monitoring.service';
import axios, { AxiosError } from 'axios';

// Extend Express Request type to include proxy
declare global {
    namespace Express {
        interface Request {
            proxy?: string;
        }
    }
}

interface ProxyConfig {
    proxies: string[];
    healthCheckUrl?: string;
    healthCheckInterval?: number;
    maxFailures?: number;
    rotationStrategy?: 'round-robin' | 'random' | 'least-used';
    timeout?: number;
}

interface ProxyHealth {
    url: string;
    failures: number;
    lastUsed: number;
    lastCheck: number;
    isHealthy: boolean;
}

class ProxyManager {
    private static instance: ProxyManager;
    private proxies: Map<string, ProxyHealth>;
    private currentIndex: number;
    private config: ProxyConfig;
    private healthCheckInterval: NodeJS.Timeout = setInterval(() => {}, 0); // Initialize with empty interval

    private constructor(config: ProxyConfig) {
        this.proxies = new Map();
        this.currentIndex = 0;
        this.config = config;
        this.initializeProxies();
        this.startHealthChecks();
    }

    private initializeProxies(): void {
        this.config.proxies.forEach(proxy => {
            this.proxies.set(proxy, {
                url: proxy,
                failures: 0,
                lastUsed: 0,
                lastCheck: 0,
                isHealthy: true
            });
        });
    }

    private startHealthChecks(): void {
        const interval = this.config.healthCheckInterval || 30000; // Default 30 seconds
        this.healthCheckInterval = setInterval(() => this.checkProxies(), interval);
    }

    private async checkProxies(): Promise<void> {
        const healthCheckUrl = this.config.healthCheckUrl || 'https://api.ipify.org?format=json';
        const timeout = this.config.timeout || 5000;

        for (const [proxy, health] of this.proxies.entries()) {
            try {
                const response = await axios.get(healthCheckUrl, {
                    proxy: {
                        host: new URL(proxy).hostname,
                        port: parseInt(new URL(proxy).port),
                        protocol: new URL(proxy).protocol
                    },
                    timeout
                });

                health.isHealthy = response.status === 200;
                health.failures = 0;
                health.lastCheck = Date.now();
            } catch (error) {
                health.failures++;
                health.isHealthy = health.failures < (this.config.maxFailures || 3);
                health.lastCheck = Date.now();

                // Track proxy failure in monitoring
                monitoringService.trackSystemMetrics({
                    errorRate: 1,
                    requestsPerSecond: 0
                });
            }
        }
    }

    public static getInstance(config: ProxyConfig): ProxyManager {
        if (!ProxyManager.instance) {
            ProxyManager.instance = new ProxyManager(config);
        }
        return ProxyManager.instance;
    }

    public getNextProxy(): string | null {
        const healthyProxies = Array.from(this.proxies.entries())
            .filter(([_, health]) => health.isHealthy)
            .map(([proxy]) => proxy);

        if (healthyProxies.length === 0) {
            return null;
        }

        let selectedProxy: string;

        switch (this.config.rotationStrategy) {
            case 'random':
                selectedProxy = healthyProxies[Math.floor(Math.random() * healthyProxies.length)];
                break;
            case 'least-used':
                selectedProxy = healthyProxies.reduce((least, current) => {
                    const leastHealth = this.proxies.get(least)!;
                    const currentHealth = this.proxies.get(current)!;
                    return leastHealth.lastUsed < currentHealth.lastUsed ? least : current;
                });
                break;
            case 'round-robin':
            default:
                selectedProxy = healthyProxies[this.currentIndex % healthyProxies.length];
                this.currentIndex++;
        }

        const health = this.proxies.get(selectedProxy)!;
        health.lastUsed = Date.now();
        return selectedProxy;
    }

    public markProxyFailure(proxy: string): void {
        const health = this.proxies.get(proxy);
        if (health) {
            health.failures++;
            health.isHealthy = health.failures < (this.config.maxFailures || 3);
        }
    }

    public destroy(): void {
        clearInterval(this.healthCheckInterval);
        this.proxies.clear();
    }
}

export const proxyMiddleware = (config: ProxyConfig) => {
    const proxyManager = ProxyManager.getInstance(config);

    return async (req: Request, res: Response, next: NextFunction) => {
        const proxy = proxyManager.getNextProxy();

        if (!proxy) {
            // Track no healthy proxies in monitoring
            monitoringService.trackSystemMetrics({
                errorRate: 1,
                requestsPerSecond: 0
            });

            return res.status(503).json({
                success: false,
                error: {
                    code: 'NO_HEALTHY_PROXIES',
                    message: 'No healthy proxies available',
                    details: {
                        totalProxies: config.proxies.length,
                        healthyProxies: 0
                    }
                }
            });
        }

        // Add proxy to request for downstream use
        req.proxy = proxy;
        next();
    };
}; 