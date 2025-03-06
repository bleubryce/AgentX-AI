import { AgentType, AgentCapability } from './agent.types';

export const agentConfig = {
    // API Configuration
    apiVersion: 'v1',
    baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
    apiKey: process.env.VITE_API_KEY,

    // Agent Execution Settings
    execution: {
        timeout: parseInt(process.env.VITE_AGENT_EXECUTION_TIMEOUT || '300000'), // 5 minutes
        maxRetries: parseInt(process.env.VITE_AGENT_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.VITE_AGENT_RETRY_DELAY || '5000'), // 5 seconds
        maxConcurrent: parseInt(process.env.VITE_AGENT_MAX_CONCURRENT || '5')
    },

    // Rate Limiting
    rateLimit: {
        maxRequests: parseInt(process.env.VITE_RATE_LIMIT_MAX_REQUESTS || '100'),
        windowMs: parseInt(process.env.VITE_RATE_LIMIT_WINDOW || '60000') // 1 minute
    },

    // Cache Settings
    cache: {
        ttl: parseInt(process.env.VITE_CACHE_TTL || '300000'), // 5 minutes
        maxSize: parseInt(process.env.VITE_CACHE_MAX_SIZE || '1000')
    },

    // Agent Types Configuration
    agentTypes: {
        [AgentType.LEAD_GENERATION]: {
            capabilities: [
                AgentCapability.DATA_ANALYSIS,
                AgentCapability.LEAD_SCORING,
                AgentCapability.MARKET_ANALYSIS
            ],
            maxExecutionTime: 600000, // 10 minutes
            priority: 1
        },
        [AgentType.CUSTOMER_SERVICE]: {
            capabilities: [
                AgentCapability.TEXT_PROCESSING,
                AgentCapability.CUSTOMER_INTERACTION
            ],
            maxExecutionTime: 300000, // 5 minutes
            priority: 2
        },
        [AgentType.SALES]: {
            capabilities: [
                AgentCapability.CUSTOMER_INTERACTION,
                AgentCapability.LEAD_SCORING,
                AgentCapability.DATA_ANALYSIS
            ],
            maxExecutionTime: 450000, // 7.5 minutes
            priority: 1
        },
        [AgentType.MARKET_RESEARCH]: {
            capabilities: [
                AgentCapability.MARKET_ANALYSIS,
                AgentCapability.DATA_ANALYSIS,
                AgentCapability.TEXT_PROCESSING
            ],
            maxExecutionTime: 900000, // 15 minutes
            priority: 3
        }
    },

    // Monitoring Configuration
    monitoring: {
        enabled: process.env.VITE_ENABLE_MONITORING === 'true',
        interval: parseInt(process.env.VITE_MONITORING_INTERVAL || '60000'), // 1 minute
        metrics: {
            collectPerformance: true,
            collectMemory: true,
            collectErrors: true
        }
    },

    // Error Handling
    errors: {
        maxErrorThreshold: parseInt(process.env.VITE_MAX_ERROR_THRESHOLD || '50'),
        errorWindowMs: parseInt(process.env.VITE_ERROR_WINDOW || '300000') // 5 minutes
    }
};

// Validation function
const validateConfig = (config: typeof agentConfig) => {
    // Validate execution settings
    if (config.execution.timeout <= 0) throw new Error('Execution timeout must be positive');
    if (config.execution.maxRetries < 0) throw new Error('Max retries cannot be negative');
    if (config.execution.retryDelay <= 0) throw new Error('Retry delay must be positive');
    if (config.execution.maxConcurrent <= 0) throw new Error('Max concurrent executions must be positive');

    // Validate rate limiting
    if (config.rateLimit.maxRequests <= 0) throw new Error('Max requests must be positive');
    if (config.rateLimit.windowMs <= 0) throw new Error('Rate limit window must be positive');

    // Validate cache settings
    if (config.cache.ttl <= 0) throw new Error('Cache TTL must be positive');
    if (config.cache.maxSize <= 0) throw new Error('Cache max size must be positive');

    // Validate agent types
    Object.values(config.agentTypes).forEach(type => {
        if (type.maxExecutionTime <= 0) throw new Error('Max execution time must be positive');
        if (type.priority <= 0) throw new Error('Priority must be positive');
    });

    return config;
};

// Export validated config
export default validateConfig(agentConfig); 