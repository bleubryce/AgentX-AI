import { EventEmitter } from 'events';
import {
    AgentConfig,
    AgentType,
    AgentStatus,
    AgentCapability,
    AgentExecutionResult,
    ExecutionStatus,
    AgentQuery,
    AgentStats,
    ExecutionMetrics
} from './agent.types';
import config from './agent.config';
import { v4 as uuidv4 } from 'uuid';
import { leadGenerationProcessor } from './processors/lead-generation.processor';
import { customerServiceProcessor } from './processors/customer-service.processor';
import { salesProcessor } from './processors/sales.processor';
import { monitoringService } from '../monitoring/monitoring.service';

class AgentService extends EventEmitter {
    private agents: Map<string, AgentConfig>;
    private executions: Map<string, AgentExecutionResult>;
    private stats: Map<string, AgentStats>;

    constructor() {
        super();
        this.agents = new Map();
        this.executions = new Map();
        this.stats = new Map();
    }

    // Agent Management
    async createAgent(params: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig> {
        const id = uuidv4();
        const now = new Date();
        
        const agent: AgentConfig = {
            ...params,
            id,
            createdAt: now,
            updatedAt: now
        };

        // Validate agent configuration
        this.validateAgentConfig(agent);

        // Store agent
        this.agents.set(id, agent);
        this.stats.set(id, this.initializeStats());

        this.emit('agent:created', agent);
        return agent;
    }

    async getAgent(id: string): Promise<AgentConfig | null> {
        return this.agents.get(id) || null;
    }

    async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
        const agent = await this.getAgent(id);
        if (!agent) return null;

        const updatedAgent: AgentConfig = {
            ...agent,
            ...updates,
            id,
            updatedAt: new Date()
        };

        // Validate updated configuration
        this.validateAgentConfig(updatedAgent);

        // Store updated agent
        this.agents.set(id, updatedAgent);
        this.emit('agent:updated', updatedAgent);

        return updatedAgent;
    }

    async deleteAgent(id: string): Promise<boolean> {
        const exists = this.agents.has(id);
        if (exists) {
            this.agents.delete(id);
            this.stats.delete(id);
            this.emit('agent:deleted', id);
        }
        return exists;
    }

    // Agent Execution
    async executeAgent(id: string, input: Record<string, any>): Promise<AgentExecutionResult> {
        const agent = await this.getAgent(id);
        if (!agent) throw new Error(`Agent not found: ${id}`);
        if (agent.status !== AgentStatus.ACTIVE) {
            throw new Error(`Agent is not active: ${id}`);
        }

        const executionId = uuidv4();
        const startTime = new Date();

        // Create execution record
        const execution: AgentExecutionResult = {
            id: executionId,
            agentId: id,
            status: ExecutionStatus.RUNNING,
            input,
            output: {},
            metrics: {
                processingTime: 0,
                memoryUsage: 0,
                apiCalls: 0,
                successRate: 0
            },
            startTime
        };

        this.executions.set(executionId, execution);
        this.emit('execution:started', execution);

        try {
            // Execute agent based on type
            const result = await this.processExecution(agent, input);
            
            // Update execution record with results
            const endTime = new Date();
            const updatedExecution: AgentExecutionResult = {
                ...execution,
                status: ExecutionStatus.COMPLETED,
                output: result,
                metrics: this.calculateMetrics(startTime, endTime),
                endTime
            };

            this.executions.set(executionId, updatedExecution);
            this.updateStats(id, true);
            this.emit('execution:completed', updatedExecution);

            return updatedExecution;
        } catch (error) {
            const endTime = new Date();
            const failedExecution: AgentExecutionResult = {
                ...execution,
                status: ExecutionStatus.FAILED,
                error: error.message,
                metrics: this.calculateMetrics(startTime, endTime),
                endTime
            };

            this.executions.set(executionId, failedExecution);
            this.updateStats(id, false);
            this.emit('execution:failed', failedExecution);

            throw error;
        }
    }

    // Query Agents
    async queryAgents(query: AgentQuery = {}): Promise<AgentConfig[]> {
        let agents = Array.from(this.agents.values());

        if (query.type) {
            agents = agents.filter(agent => agent.type === query.type);
        }

        if (query.status) {
            agents = agents.filter(agent => agent.status === query.status);
        }

        if (query.capabilities?.length) {
            agents = agents.filter(agent => 
                query.capabilities.every(cap => agent.capabilities.includes(cap))
            );
        }

        // Handle pagination
        const page = query.page || 1;
        const limit = query.limit || 10;
        const start = (page - 1) * limit;
        const end = start + limit;

        return agents.slice(start, end);
    }

    // Stats and Metrics
    async getAgentStats(id: string): Promise<AgentStats | null> {
        return this.stats.get(id) || null;
    }

    // Private helper methods
    private validateAgentConfig(agent: AgentConfig): void {
        // Validate agent type
        if (!Object.values(AgentType).includes(agent.type)) {
            throw new Error(`Invalid agent type: ${agent.type}`);
        }

        // Validate capabilities
        const validCapabilities = Object.values(AgentCapability);
        agent.capabilities.forEach(cap => {
            if (!validCapabilities.includes(cap)) {
                throw new Error(`Invalid capability: ${cap}`);
            }
        });

        // Validate required capabilities for agent type
        const requiredCapabilities = config.agentTypes[agent.type].capabilities;
        const hasRequiredCapabilities = requiredCapabilities.every(cap =>
            agent.capabilities.includes(cap)
        );
        if (!hasRequiredCapabilities) {
            throw new Error(`Missing required capabilities for agent type: ${agent.type}`);
        }
    }

    private async processExecution(
        agent: AgentConfig,
        input: Record<string, any>
    ): Promise<Record<string, any>> {
        // Start monitoring execution
        const startTime = Date.now();

        try {
            let result: Record<string, any>;

            // Execute agent based on type
            switch (agent.type) {
                case AgentType.LEAD_GENERATION:
                    result = await leadGenerationProcessor.process(input);
                    break;
                case AgentType.CUSTOMER_SERVICE:
                    result = await customerServiceProcessor.process(input);
                    break;
                case AgentType.SALES:
                    result = await salesProcessor.process(input);
                    break;
                case AgentType.MARKET_RESEARCH:
                    result = await this.processMarketResearch(input);
                    break;
                default:
                    throw new Error(`Unsupported agent type: ${agent.type}`);
            }

            // Record execution metrics
            const executionTime = Date.now() - startTime;
            monitoringService.recordExecution({
                agentId: agent.id,
                status: ExecutionStatus.COMPLETED,
                metrics: {
                    processingTime: executionTime,
                    memoryUsage: process.memoryUsage().heapUsed,
                    apiCalls: 0, // To be implemented
                    successRate: 1
                }
            });

            return result;
        } catch (error) {
            // Record failed execution
            monitoringService.recordExecution({
                agentId: agent.id,
                status: ExecutionStatus.FAILED,
                metrics: {
                    processingTime: Date.now() - startTime,
                    memoryUsage: process.memoryUsage().heapUsed,
                    apiCalls: 0,
                    successRate: 0
                }
            });

            throw error;
        }
    }

    private calculateMetrics(startTime: Date, endTime: Date): ExecutionMetrics {
        return {
            processingTime: endTime.getTime() - startTime.getTime(),
            memoryUsage: process.memoryUsage().heapUsed,
            apiCalls: 0, // To be implemented
            successRate: 1 // To be implemented
        };
    }

    private initializeStats(): AgentStats {
        return {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageProcessingTime: 0
        };
    }

    private updateStats(agentId: string, success: boolean): void {
        const stats = this.stats.get(agentId);
        if (!stats) return;

        stats.totalExecutions++;
        if (success) {
            stats.successfulExecutions++;
        } else {
            stats.failedExecutions++;
        }
        stats.lastExecution = new Date();

        this.stats.set(agentId, stats);
    }

    // Agent type-specific processing methods (to be implemented)
    private async processLeadGeneration(input: Record<string, any>): Promise<Record<string, any>> {
        return leadGenerationProcessor.process(input);
    }

    private async processCustomerService(input: Record<string, any>): Promise<Record<string, any>> {
        // Implement customer service logic
        throw new Error('Customer service processing not implemented');
    }

    private async processSales(input: Record<string, any>): Promise<Record<string, any>> {
        // Implement sales logic
        throw new Error('Sales processing not implemented');
    }

    private async processMarketResearch(input: Record<string, any>): Promise<Record<string, any>> {
        // Implement market research logic
        throw new Error('Market research processing not implemented');
    }
}

// Export singleton instance
export const agentService = new AgentService();
export default agentService; 