const { EventEmitter } = require('events');
const LRUCache = require('lru-cache');

class RequestBatcher extends EventEmitter {
    constructor(options = {}) {
        super();
        this.batchSize = options.batchSize || 10;
        this.maxWaitMs = options.maxWaitMs || 1000;
        this.queue = [];
        this.processing = false;
        this.cache = new LRUCache({
            max: options.maxCacheSize || 1000,
            maxAge: options.cacheTTL || 1000 * 60 * 5 // 5 minutes
        });
    }

    async addRequest(request) {
        const cacheKey = this._getCacheKey(request);
        const cachedResponse = this.cache.get(cacheKey);
        
        if (cachedResponse) {
            return cachedResponse;
        }

        return new Promise((resolve, reject) => {
            this.queue.push({
                request,
                resolve,
                reject,
                cacheKey,
                timestamp: Date.now()
            });

            if (this.queue.length >= this.batchSize) {
                this._processBatch();
            } else if (!this.processing) {
                this._scheduleProcessing();
            }
        });
    }

    _getCacheKey(request) {
        // Create a unique cache key based on request properties
        return JSON.stringify({
            path: request.path,
            method: request.method,
            query: request.query,
            body: request.body
        });
    }

    _scheduleProcessing() {
        if (this.processing) return;
        
        this.processing = true;
        setTimeout(() => {
            if (this.queue.length > 0) {
                this._processBatch();
            }
            this.processing = false;
        }, this.maxWaitMs);
    }

    async _processBatch() {
        const batch = this.queue.splice(0, this.batchSize);
        if (batch.length === 0) return;

        try {
            // Group similar requests
            const groupedRequests = this._groupRequests(batch);
            
            // Process each group
            for (const [groupKey, requests] of Object.entries(groupedRequests)) {
                try {
                    const results = await this._executeBatch(requests);
                    
                    // Distribute results
                    requests.forEach((req, index) => {
                        const result = results[index];
                        this.cache.set(req.cacheKey, result);
                        req.resolve(result);
                    });
                } catch (error) {
                    requests.forEach(req => req.reject(error));
                }
            }
        } catch (error) {
            batch.forEach(item => item.reject(error));
        }
    }

    _groupRequests(batch) {
        const groups = new Map();
        
        batch.forEach(item => {
            const key = this._getGroupKey(item.request);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(item);
        });
        
        return Object.fromEntries(groups);
    }

    _getGroupKey(request) {
        // Group similar requests based on path and method
        return `${request.method}:${request.path}`;
    }

    async _executeBatch(requests) {
        // Implement actual batch processing logic here
        // This is a placeholder that should be overridden
        return requests.map(req => ({
            success: true,
            data: `Processed ${req.request.path}`
        }));
    }

    clearCache() {
        this.cache.reset();
    }

    getQueueLength() {
        return this.queue.length;
    }

    getCacheStats() {
        return {
            size: this.cache.length,
            maxSize: this.cache.max,
            hits: this.cache.hits,
            misses: this.cache.misses
        };
    }
}

class OptimizedRequestHandler {
    constructor(options = {}) {
        this.batcher = new RequestBatcher(options);
        this.retryDelays = options.retryDelays || [1000, 2000, 5000];
        this.maxRetries = options.maxRetries || 3;
    }

    async handleRequest(request) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.batcher.addRequest(request);
            } catch (error) {
                lastError = error;
                
                if (attempt < this.maxRetries) {
                    await this._wait(this.retryDelays[attempt]);
                }
            }
        }
        
        throw lastError;
    }

    async _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getMetrics() {
        return {
            queueLength: this.batcher.getQueueLength(),
            cacheStats: this.batcher.getCacheStats()
        };
    }
}

module.exports = { OptimizedRequestHandler, RequestBatcher }; 