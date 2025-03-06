const { EventEmitter } = require('events');
const { PerformanceMonitor } = require('./performance');
const { CrashPreventor } = require('./crash-prevention');
const { OptimizedRequestHandler } = require('../api/request-handler');

class MonitoringService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            memoryThreshold: options.memoryThreshold || 0.8,
            cpuThreshold: options.cpuThreshold || 0.7,
            checkInterval: options.checkInterval || 5000,
            maxRequestsPerMinute: options.maxRequestsPerMinute || 1000,
            batchSize: options.batchSize || 10,
            maxWaitMs: options.maxWaitMs || 1000,
            ...options
        };

        this.performanceMonitor = new PerformanceMonitor(this.options);
        this.crashPreventor = new CrashPreventor(this.options);
        this.requestHandler = new OptimizedRequestHandler(this.options);
        
        this.isRunning = false;
        this.healthStatus = 'healthy';
        this.lastIncident = null;
        this.incidents = [];
    }

    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        await this.performanceMonitor.start();
        await this.crashPreventor.start();
        
        this._setupEventListeners();
        this._startHealthCheck();
        
        this.emit('started', {
            timestamp: Date.now(),
            status: this.healthStatus
        });
    }

    async stop() {
        this.isRunning = false;
        await this.performanceMonitor.stop();
        await this.crashPreventor.stop();
        
        this.emit('stopped', {
            timestamp: Date.now(),
            status: this.healthStatus
        });
    }

    _setupEventListeners() {
        // Performance Monitor Events
        this.performanceMonitor.on('warning', (warning) => {
            this._handleWarning('PERFORMANCE', warning);
        });

        this.performanceMonitor.on('metrics', (metrics) => {
            this.emit('metrics', {
                type: 'PERFORMANCE',
                data: metrics,
                timestamp: Date.now()
            });
        });

        // Crash Preventor Events
        this.crashPreventor.on('warning', (warning) => {
            this._handleWarning('CRASH_PREVENTION', warning);
        });

        this.crashPreventor.on('critical', (critical) => {
            this._handleCritical(critical);
        });

        this.crashPreventor.on('recovery', (recovery) => {
            this._handleRecovery(recovery);
        });

        // Error handling for all components
        [this.performanceMonitor, this.crashPreventor].forEach(component => {
            component.on('error', (error) => {
                this._handleError(error);
            });
        });
    }

    async _startHealthCheck() {
        while (this.isRunning) {
            try {
                const health = await this._checkHealth();
                this.emit('health', health);
                
                if (health.status !== this.healthStatus) {
                    this._handleStatusChange(health);
                }
                
                await new Promise(resolve => setTimeout(resolve, this.options.checkInterval));
            } catch (error) {
                this._handleError(error);
            }
        }
    }

    async _checkHealth() {
        const metrics = {
            performance: await this.performanceMonitor.metrics.getAverageLatency(),
            requests: this.requestHandler.getMetrics(),
            system: await this.crashPreventor.getMetrics()
        };

        return {
            status: this._calculateHealthStatus(metrics),
            metrics,
            timestamp: Date.now()
        };
    }

    _calculateHealthStatus(metrics) {
        // Implement health status calculation based on metrics
        if (metrics.performance > 1000 || // Response time > 1s
            metrics.requests.queueLength > 100 || // Too many queued requests
            metrics.system.performance.metrics.get('latency')?.length > 1000) { // Too many latency measurements
            return 'degraded';
        }

        return 'healthy';
    }

    _handleWarning(source, warning) {
        const incident = {
            type: 'WARNING',
            source,
            warning,
            timestamp: Date.now()
        };

        this.lastIncident = incident;
        this.incidents.push(incident);
        this.emit('warning', incident);
    }

    _handleCritical(critical) {
        const incident = {
            type: 'CRITICAL',
            ...critical,
            timestamp: Date.now()
        };

        this.healthStatus = 'critical';
        this.lastIncident = incident;
        this.incidents.push(incident);
        this.emit('critical', incident);
    }

    _handleRecovery(recovery) {
        const incident = {
            type: 'RECOVERY',
            ...recovery,
            timestamp: Date.now()
        };

        this.incidents.push(incident);
        this.emit('recovery', incident);
    }

    _handleError(error) {
        const incident = {
            type: 'ERROR',
            error,
            timestamp: Date.now()
        };

        this.lastIncident = incident;
        this.incidents.push(incident);
        this.emit('error', incident);
    }

    _handleStatusChange(health) {
        const change = {
            from: this.healthStatus,
            to: health.status,
            timestamp: Date.now(),
            metrics: health.metrics
        };

        this.healthStatus = health.status;
        this.emit('status-change', change);
    }

    // Public API
    getHealth() {
        return {
            status: this.healthStatus,
            lastIncident: this.lastIncident,
            metrics: {
                performance: this.performanceMonitor.metrics,
                requests: this.requestHandler.getMetrics(),
                system: this.crashPreventor.getMetrics()
            }
        };
    }

    getIncidents(options = {}) {
        let filtered = [...this.incidents];
        
        if (options.type) {
            filtered = filtered.filter(i => i.type === options.type);
        }
        
        if (options.since) {
            filtered = filtered.filter(i => i.timestamp >= options.since);
        }
        
        if (options.limit) {
            filtered = filtered.slice(-options.limit);
        }
        
        return filtered;
    }

    middleware() {
        return async (req, res, next) => {
            try {
                // Add performance monitoring
                const perfMiddleware = this.performanceMonitor.middleware();
                await new Promise((resolve) => perfMiddleware(req, res, resolve));

                // Handle request through optimized handler
                const result = await this.requestHandler.handleRequest({
                    path: req.path,
                    method: req.method,
                    query: req.query,
                    body: req.body
                });

                // Attach monitoring headers
                res.set('X-Health-Status', this.healthStatus);
                res.set('X-Response-Time', this.performanceMonitor.metrics.getAverageLatency());

                next();
            } catch (error) {
                next(error);
            }
        };
    }
}

module.exports = { MonitoringService }; 