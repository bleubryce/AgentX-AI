export interface AgentConfig {
    id: string;
    name: string;
    description?: string;
    type: AgentType;
    status: AgentStatus;
    capabilities: AgentCapability[];
    settings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export enum AgentType {
    LEAD_GENERATION = 'LEAD_GENERATION',
    CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
    SALES = 'SALES',
    MARKET_RESEARCH = 'MARKET_RESEARCH'
}

export enum AgentStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    TRAINING = 'TRAINING',
    ERROR = 'ERROR'
}

export enum AgentCapability {
    TEXT_PROCESSING = 'TEXT_PROCESSING',
    DATA_ANALYSIS = 'DATA_ANALYSIS',
    CUSTOMER_INTERACTION = 'CUSTOMER_INTERACTION',
    MARKET_ANALYSIS = 'MARKET_ANALYSIS',
    LEAD_SCORING = 'LEAD_SCORING'
}

export interface AgentExecutionResult {
    id: string;
    agentId: string;
    status: ExecutionStatus;
    input: Record<string, any>;
    output: Record<string, any>;
    error?: string;
    metrics: ExecutionMetrics;
    startTime: Date;
    endTime?: Date;
}

export enum ExecutionStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export interface ExecutionMetrics {
    processingTime: number;
    memoryUsage: number;
    apiCalls: number;
    successRate: number;
}

export interface AgentQuery {
    type?: AgentType;
    status?: AgentStatus;
    capabilities?: AgentCapability[];
    page?: number;
    limit?: number;
}

export interface AgentStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageProcessingTime: number;
    lastExecution?: Date;
} 