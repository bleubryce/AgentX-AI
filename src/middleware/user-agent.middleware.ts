import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring/monitoring.service';

interface UserAgentConfig {
    userAgents: string[];
    rotationStrategy?: 'random' | 'sequential' | 'weighted';
    weights?: Record<string, number>;
    minInterval?: number; // Minimum time between rotations in milliseconds
}

class UserAgentRotator {
    private static instance: UserAgentRotator;
    private userAgents: string[];
    private currentIndex: number;
    private lastRotation: number;
    private config: UserAgentConfig;
    private weights: Record<string, number>;

    private constructor(config: UserAgentConfig) {
        this.userAgents = config.userAgents;
        this.currentIndex = 0;
        this.lastRotation = 0;
        this.config = config;
        this.weights = config.weights || {};
        this.initializeWeights();
    }

    private initializeWeights(): void {
        if (this.config.rotationStrategy === 'weighted' && this.weights) {
            // Normalize weights
            const totalWeight = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
            Object.keys(this.weights).forEach(key => {
                this.weights[key] = this.weights[key] / totalWeight;
            });
        }
    }

    public static getInstance(config: UserAgentConfig): UserAgentRotator {
        if (!UserAgentRotator.instance) {
            UserAgentRotator.instance = new UserAgentRotator(config);
        }
        return UserAgentRotator.instance;
    }

    public getNextUserAgent(): string {
        const now = Date.now();
        const minInterval = this.config.minInterval || 0;

        if (now - this.lastRotation < minInterval) {
            return this.userAgents[this.currentIndex];
        }

        switch (this.config.rotationStrategy) {
            case 'random':
                this.currentIndex = Math.floor(Math.random() * this.userAgents.length);
                break;
            case 'sequential':
                this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
                break;
            case 'weighted':
                this.currentIndex = this.getWeightedIndex();
                break;
            default:
                this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
        }

        this.lastRotation = now;
        return this.userAgents[this.currentIndex];
    }

    private getWeightedIndex(): number {
        const random = Math.random();
        let sum = 0;

        for (let i = 0; i < this.userAgents.length; i++) {
            const userAgent = this.userAgents[i];
            sum += this.weights[userAgent] || 1 / this.userAgents.length;

            if (random <= sum) {
                return i;
            }
        }

        return this.userAgents.length - 1;
    }

    public reset(): void {
        this.currentIndex = 0;
        this.lastRotation = 0;
    }
}

export const userAgentMiddleware = (config: UserAgentConfig) => {
    const rotator = UserAgentRotator.getInstance(config);

    return (req: Request, res: Response, next: NextFunction) => {
        const userAgent = rotator.getNextUserAgent();
        req.headers['user-agent'] = userAgent;

        // Track user agent rotation in monitoring
        monitoringService.trackSystemMetrics({
            requestsPerSecond: 1,
            errorRate: 0
        });

        next();
    };
}; 