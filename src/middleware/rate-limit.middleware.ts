import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring/monitoring.service';

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum number of requests per window
    keyGenerator?: (req: Request) => string;  // Function to generate rate limit key
}

interface RateLimitInfo {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private static instance: RateLimiter;
    private requests: Map<string, RateLimitInfo>;
    private config: RateLimitConfig;

    private constructor(config: RateLimitConfig) {
        this.requests = new Map();
        this.config = config;
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }

    private cleanupInterval: NodeJS.Timeout;

    public static getInstance(config: RateLimitConfig): RateLimiter {
        if (!RateLimiter.instance) {
            RateLimiter.instance = new RateLimiter(config);
        }
        return RateLimiter.instance;
    }

    public isRateLimited(key: string): boolean {
        const now = Date.now();
        const info = this.requests.get(key);

        if (!info) {
            this.requests.set(key, {
                count: 1,
                resetTime: now + this.config.windowMs
            });
            return false;
        }

        if (now > info.resetTime) {
            this.requests.set(key, {
                count: 1,
                resetTime: now + this.config.windowMs
            });
            return false;
        }

        if (info.count >= this.config.maxRequests) {
            return true;
        }

        info.count++;
        return false;
    }

    public getRemainingRequests(key: string): number {
        const info = this.requests.get(key);
        if (!info) {
            return this.config.maxRequests;
        }

        if (Date.now() > info.resetTime) {
            return this.config.maxRequests;
        }

        return Math.max(0, this.config.maxRequests - info.count);
    }

    public getResetTime(key: string): number {
        const info = this.requests.get(key);
        return info ? info.resetTime : Date.now() + this.config.windowMs;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, info] of this.requests.entries()) {
            if (now > info.resetTime) {
                this.requests.delete(key);
            }
        }
    }

    public destroy(): void {
        clearInterval(this.cleanupInterval);
        this.requests.clear();
    }
}

export const rateLimit = (config: RateLimitConfig) => {
    const limiter = RateLimiter.getInstance(config);
    const keyGenerator = config.keyGenerator || ((req: Request) => req.ip || 'unknown');

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);

        if (limiter.isRateLimited(key)) {
            const resetTime = limiter.getResetTime(key);
            const remaining = limiter.getRemainingRequests(key);

            // Track rate limit exceeded in monitoring
            monitoringService.trackSystemMetrics({
                errorRate: 1,
                requestsPerSecond: 0
            });

            res.setHeader('X-RateLimit-Limit', String(config.maxRequests));
            res.setHeader('X-RateLimit-Remaining', String(remaining));
            res.setHeader('X-RateLimit-Reset', String(resetTime));

            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests, please try again later',
                    details: {
                        resetTime: new Date(resetTime).toISOString(),
                        remaining
                    }
                }
            });
        }

        const remaining = limiter.getRemainingRequests(key);
        const resetTime = limiter.getResetTime(key);

        res.setHeader('X-RateLimit-Limit', String(config.maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(resetTime));

        next();
    };
}; 