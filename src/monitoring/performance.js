const { EventEmitter } = require('events');
const os = require('os');

class MetricsCollector {
    constructor() {
        this.metrics = new Map();
        this.startTime = Date.now();
    }

    recordLatency(ms) {
        const current = this.metrics.get('latency') || [];
        current.push(ms);
        // Keep only last 1000 measurements
        if (current.length > 1000) current.shift();
        this.metrics.set('latency', current);
    }

    getAverageLatency() {
        const latencies = this.metrics.get('latency') || [];
        if (latencies.length === 0) return 0;
        return latencies.reduce((a, b) => a + b, 0) / latencies.length;
    }
}

class PerformanceMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.metrics = new MetricsCollector();
        this.warnings = new Set();
        this.options = {
            memoryThreshold: options.memoryThreshold || 0.8,
            cpuThreshold: options.cpuThreshold || 0.7,
            checkInterval: options.checkInterval || 5000,
            maxRequestsPerMinute: options.maxRequestsPerMinute || 1000
        };
        this.requestCounts = new Map();
        this.isMonitoring = false;
    }

    async start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this._startMonitoring();
    }

    async stop() {
        this.isMonitoring = false;
    }

    async _startMonitoring() {
        while (this.isMonitoring) {
            try {
                await this._checkSystem();
                await new Promise(resolve => setTimeout(resolve, this.options.checkInterval));
            } catch (error) {
                this.emit('error', error);
            }
        }
    }

    async _checkSystem() {
        const metrics = {
            memory: this._checkMemory(),
            cpu: await this._checkCPU(),
            requests: this._checkRequestRate()
        };

        this.emit('metrics', metrics);

        if (metrics.memory.usagePercent > this.options.memoryThreshold) {
            this.emit('warning', {
                type: 'HIGH_MEMORY_USAGE',
                message: `Memory usage at ${metrics.memory.usagePercent * 100}%`,
                metrics: metrics.memory
            });
        }

        if (metrics.cpu.usagePercent > this.options.cpuThreshold) {
            this.emit('warning', {
                type: 'HIGH_CPU_USAGE',
                message: `CPU usage at ${metrics.cpu.usagePercent * 100}%`,
                metrics: metrics.cpu
            });
        }

        return metrics;
    }

    _checkMemory() {
        const used = process.memoryUsage();
        const total = os.totalmem();
        const free = os.freemem();
        const usagePercent = (total - free) / total;

        return {
            heapUsed: used.heapUsed,
            heapTotal: used.heapTotal,
            external: used.external,
            systemTotal: total,
            systemFree: free,
            usagePercent
        };
    }

    async _checkCPU() {
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, 100));
        const endUsage = process.cpuUsage(startUsage);
        const userPercent = endUsage.user / 1000000;
        const systemPercent = endUsage.system / 1000000;
        const usagePercent = (userPercent + systemPercent) / os.cpus().length;

        return {
            user: userPercent,
            system: systemPercent,
            usagePercent
        };
    }

    _checkRequestRate() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Clean up old request counts
        for (const [timestamp] of this.requestCounts) {
            if (timestamp < oneMinuteAgo) {
                this.requestCounts.delete(timestamp);
            }
        }

        // Calculate current request rate
        let totalRequests = 0;
        for (const count of this.requestCounts.values()) {
            totalRequests += count;
        }

        return {
            requestsPerMinute: totalRequests,
            isOverLimit: totalRequests > this.options.maxRequestsPerMinute
        };
    }

    recordRequest() {
        const now = Date.now();
        const current = this.requestCounts.get(now) || 0;
        this.requestCounts.set(now, current + 1);
    }

    middleware() {
        return async (req, res, next) => {
            const start = process.hrtime();
            
            try {
                this.recordRequest();
                
                // Check if we're over the request limit
                const requestMetrics = this._checkRequestRate();
                if (requestMetrics.isOverLimit) {
                    this.emit('warning', {
                        type: 'HIGH_REQUEST_RATE',
                        message: `Request rate exceeded: ${requestMetrics.requestsPerMinute} requests/minute`
                    });
                }

                res.on('finish', () => {
                    const [seconds, nanoseconds] = process.hrtime(start);
                    const duration = seconds * 1000 + nanoseconds / 1e6;
                    this.metrics.recordLatency(duration);
                });

                next();
            } catch (error) {
                next(error);
            }
        };
    }
}

module.exports = { PerformanceMonitor, MetricsCollector }; 