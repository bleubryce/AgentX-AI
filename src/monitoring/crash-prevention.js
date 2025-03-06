const { EventEmitter } = require('events');
const { PerformanceMonitor } = require('./performance');
const os = require('os');

class CrashPreventor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            memoryThreshold: options.memoryThreshold || 0.8,
            cpuThreshold: options.cpuThreshold || 0.7,
            checkInterval: options.checkInterval || 5000,
            gcThreshold: options.gcThreshold || 0.75,
            ...options
        };

        this.performanceMonitor = new PerformanceMonitor(this.options);
        this.isRunning = false;
        this.recoveryAttempts = new Map();
        this.lastGC = Date.now();
    }

    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.performanceMonitor.start();
        
        this.performanceMonitor.on('warning', async (warning) => {
            await this._handleWarning(warning);
        });

        this.performanceMonitor.on('error', (error) => {
            this.emit('error', error);
        });

        this._startMonitoring();
    }

    async stop() {
        this.isRunning = false;
        await this.performanceMonitor.stop();
    }

    async _startMonitoring() {
        while (this.isRunning) {
            try {
                await this._checkSystem();
                await new Promise(resolve => setTimeout(resolve, this.options.checkInterval));
            } catch (error) {
                this.emit('error', error);
            }
        }
    }

    async _checkSystem() {
        const metrics = await this._collectMetrics();
        
        if (this._shouldOptimize(metrics)) {
            await this._optimizeResources(metrics);
        }

        return metrics;
    }

    async _collectMetrics() {
        const memory = process.memoryUsage();
        const cpus = os.cpus();
        const loadAvg = os.loadavg();

        return {
            memory: {
                heapUsed: memory.heapUsed,
                heapTotal: memory.heapTotal,
                external: memory.external,
                usagePercent: memory.heapUsed / memory.heapTotal
            },
            cpu: {
                loadAvg: loadAvg[0],
                cores: cpus.length,
                usage: loadAvg[0] / cpus.length
            },
            system: {
                uptime: process.uptime(),
                freemem: os.freemem(),
                totalmem: os.totalmem()
            }
        };
    }

    _shouldOptimize(metrics) {
        return (
            metrics.memory.usagePercent > this.options.memoryThreshold ||
            metrics.cpu.usage > this.options.cpuThreshold
        );
    }

    async _optimizeResources(metrics) {
        if (metrics.memory.usagePercent > this.options.gcThreshold) {
            await this._forceGarbageCollection();
        }

        // Clear module cache if memory usage is still high
        if (metrics.memory.usagePercent > this.options.memoryThreshold) {
            this._clearModuleCache();
        }

        this.emit('optimization', {
            type: 'RESOURCE_OPTIMIZATION',
            metrics
        });
    }

    async _forceGarbageCollection() {
        if (!global.gc) {
            this.emit('warning', {
                type: 'GC_NOT_ENABLED',
                message: 'Garbage collection is not enabled. Run node with --expose-gc flag.'
            });
            return;
        }

        const now = Date.now();
        if (now - this.lastGC < 30000) { // Don't GC more than once every 30 seconds
            return;
        }

        try {
            const beforeMemory = process.memoryUsage();
            global.gc();
            const afterMemory = process.memoryUsage();
            
            this.lastGC = now;
            
            this.emit('gc', {
                freed: beforeMemory.heapUsed - afterMemory.heapUsed,
                before: beforeMemory,
                after: afterMemory
            });
        } catch (error) {
            this.emit('error', {
                type: 'GC_ERROR',
                error
            });
        }
    }

    _clearModuleCache() {
        const beforeSize = Object.keys(require.cache).length;
        
        // Clear only non-essential modules
        for (const key in require.cache) {
            if (!key.includes('node_modules')) {
                delete require.cache[key];
            }
        }

        const afterSize = Object.keys(require.cache).length;
        
        this.emit('cache-clear', {
            type: 'MODULE_CACHE_CLEAR',
            cleared: beforeSize - afterSize
        });
    }

    async _handleWarning(warning) {
        const attempts = this.recoveryAttempts.get(warning.type) || 0;
        
        if (attempts >= 3) {
            this.emit('critical', {
                type: 'RECOVERY_FAILED',
                warning,
                attempts
            });
            return;
        }

        try {
            switch (warning.type) {
                case 'HIGH_MEMORY_USAGE':
                    await this._handleHighMemory(warning);
                    break;
                case 'HIGH_CPU_USAGE':
                    await this._handleHighCPU(warning);
                    break;
                case 'HIGH_REQUEST_RATE':
                    await this._handleHighRequestRate(warning);
                    break;
            }

            this.recoveryAttempts.set(warning.type, attempts + 1);
        } catch (error) {
            this.emit('error', {
                type: 'RECOVERY_ERROR',
                error,
                warning
            });
        }
    }

    async _handleHighMemory(warning) {
        await this._forceGarbageCollection();
        this._clearModuleCache();
        
        // Emit event for external handling
        this.emit('recovery', {
            type: 'MEMORY_RECOVERY',
            warning
        });
    }

    async _handleHighCPU(warning) {
        // Implement CPU optimization strategies
        this.emit('recovery', {
            type: 'CPU_RECOVERY',
            warning
        });
    }

    async _handleHighRequestRate(warning) {
        // Implement request rate limiting strategies
        this.emit('recovery', {
            type: 'REQUEST_RATE_RECOVERY',
            warning
        });
    }

    getMetrics() {
        return {
            performance: this.performanceMonitor.metrics,
            recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
            lastGC: this.lastGC
        };
    }
}

module.exports = { CrashPreventor }; 