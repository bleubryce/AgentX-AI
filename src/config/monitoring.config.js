const config = {
    monitoring: {
        // Memory thresholds
        memoryThreshold: process.env.MEMORY_THRESHOLD || 0.8,
        gcThreshold: process.env.GC_THRESHOLD || 0.75,
        
        // CPU thresholds
        cpuThreshold: process.env.CPU_THRESHOLD || 0.7,
        
        // Check intervals
        checkInterval: parseInt(process.env.MONITORING_CHECK_INTERVAL || '5000'),
        
        // Request handling
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '1000'),
        batchSize: parseInt(process.env.REQUEST_BATCH_SIZE || '10'),
        maxWaitMs: parseInt(process.env.REQUEST_MAX_WAIT_MS || '1000'),
        
        // Cache settings
        maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
        cacheTTL: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
        
        // Recovery settings
        maxRecoveryAttempts: parseInt(process.env.MAX_RECOVERY_ATTEMPTS || '3'),
        recoveryInterval: parseInt(process.env.RECOVERY_INTERVAL || '30000'), // 30 seconds
        
        // Logging
        logLevel: process.env.MONITORING_LOG_LEVEL || 'info',
        enableMetricsLogging: process.env.ENABLE_METRICS_LOGGING === 'true',
        
        // Health check
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
        unhealthyThreshold: parseInt(process.env.UNHEALTHY_THRESHOLD || '3'),
        
        // Alert thresholds
        alertLatencyThreshold: parseInt(process.env.ALERT_LATENCY_THRESHOLD || '1000'), // 1 second
        alertQueueSizeThreshold: parseInt(process.env.ALERT_QUEUE_SIZE_THRESHOLD || '100'),
        alertErrorRateThreshold: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || '0.05'), // 5%
    }
};

// Validation function to ensure all numeric values are positive
const validateConfig = (config) => {
    const numericFields = [
        'checkInterval',
        'maxRequestsPerMinute',
        'batchSize',
        'maxWaitMs',
        'maxCacheSize',
        'cacheTTL',
        'maxRecoveryAttempts',
        'recoveryInterval',
        'healthCheckInterval',
        'unhealthyThreshold',
        'alertLatencyThreshold',
        'alertQueueSizeThreshold'
    ];

    const thresholdFields = [
        'memoryThreshold',
        'gcThreshold',
        'cpuThreshold',
        'alertErrorRateThreshold'
    ];

    // Validate numeric fields
    numericFields.forEach(field => {
        if (config.monitoring[field] <= 0) {
            throw new Error(`Invalid ${field}: must be greater than 0`);
        }
    });

    // Validate threshold fields
    thresholdFields.forEach(field => {
        const value = config.monitoring[field];
        if (value <= 0 || value > 1) {
            throw new Error(`Invalid ${field}: must be between 0 and 1`);
        }
    });

    // Validate relationships between thresholds
    if (config.monitoring.gcThreshold >= config.monitoring.memoryThreshold) {
        throw new Error('gcThreshold must be less than memoryThreshold');
    }

    return config;
};

// Export validated config
module.exports = validateConfig(config); 