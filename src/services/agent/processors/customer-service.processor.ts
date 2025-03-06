import { AgentCapability } from '../agent.types';
import config from '../agent.config';
import { aiService } from '../../ai/ai.service';

interface CustomerQuery {
    customerId?: string;
    query: string;
    context?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category?: string;
    previousInteractions?: string[];
}

interface ResponseData {
    response: string;
    confidence: number;
    suggestedActions: string[];
    references?: string[];
    followUpRequired: boolean;
}

interface SentimentAnalysis {
    score: number; // -1 to 1
    magnitude: number;
    aspects: {
        topic: string;
        sentiment: number;
    }[];
}

interface CustomerServiceResult {
    query: CustomerQuery;
    response: ResponseData;
    sentiment: SentimentAnalysis;
    metrics: {
        responseTime: number;
        confidenceScore: number;
        satisfactionPrediction: number;
    };
    escalation?: {
        required: boolean;
        reason?: string;
        priority?: string;
        assignedTo?: string;
    };
}

export class CustomerServiceProcessor {
    private static readonly CONFIDENCE_THRESHOLD = 0.85;
    private static readonly ESCALATION_THRESHOLD = 0.7;
    private static readonly NEGATIVE_SENTIMENT_THRESHOLD = -0.3;

    async process(input: Record<string, any>): Promise<CustomerServiceResult> {
        try {
            const startTime = Date.now();
            
            // Extract and validate customer query
            const query = this.extractCustomerQuery(input);
            
            // Analyze query sentiment using AI
            const sentiment = await this.analyzeSentiment(query);
            
            // Generate AI-powered response
            const response = await this.generateResponse(query, sentiment);
            
            // Determine if escalation is needed
            const escalation = this.determineEscalation(query, response, sentiment);
            
            // Calculate metrics
            const metrics = {
                responseTime: Date.now() - startTime,
                confidenceScore: response.confidence,
                satisfactionPrediction: this.predictSatisfaction(sentiment, response)
            };

            return {
                query,
                response,
                sentiment,
                metrics,
                escalation
            };
        } catch (error) {
            throw new Error(`Customer service processing failed: ${error.message}`);
        }
    }

    private extractCustomerQuery(input: Record<string, any>): CustomerQuery {
        const query: CustomerQuery = {
            customerId: input.customerId,
            query: input.query,
            context: input.context,
            priority: input.priority || 'MEDIUM',
            category: input.category,
            previousInteractions: input.previousInteractions || []
        };

        if (!query.query) {
            throw new Error('Customer query is required');
        }

        return query;
    }

    private async analyzeSentiment(query: CustomerQuery): Promise<SentimentAnalysis> {
        try {
            // Use AI service for sentiment analysis
            const result = await aiService.analyzeSentiment(
                query.query,
                this.buildContext(query)
            );

            return {
                score: result.score,
                magnitude: result.magnitude,
                aspects: result.aspects
            };
        } catch (error) {
            console.error('Sentiment analysis failed:', error);
            // Fallback to neutral sentiment
            return {
                score: 0,
                magnitude: 0,
                aspects: []
            };
        }
    }

    private async generateResponse(
        query: CustomerQuery,
        sentiment: SentimentAnalysis
    ): Promise<ResponseData> {
        try {
            // Use AI service for response generation
            const result = await aiService.generateResponse(
                query.query,
                this.buildContext(query),
                sentiment
            );

            const response: ResponseData = {
                response: result.response,
                confidence: result.confidence,
                suggestedActions: result.suggestedActions,
                references: result.references,
                followUpRequired: sentiment.score < this.NEGATIVE_SENTIMENT_THRESHOLD
            };

            // Add follow-up action if needed
            if (response.followUpRequired && !response.suggestedActions.includes('Schedule follow-up')) {
                response.suggestedActions.push('Schedule follow-up');
            }

            return response;
        } catch (error) {
            console.error('Response generation failed:', error);
            // Fallback response
            return {
                response: "I apologize, but I'm having trouble processing your request. Let me connect you with a human agent who can help.",
                confidence: 0.5,
                suggestedActions: ['Transfer to human agent'],
                followUpRequired: true
            };
        }
    }

    private buildContext(query: CustomerQuery): string {
        const contextParts = [];

        if (query.context) {
            contextParts.push(query.context);
        }

        if (query.category) {
            contextParts.push(`Category: ${query.category}`);
        }

        if (query.previousInteractions?.length) {
            contextParts.push('Previous interactions:');
            query.previousInteractions.forEach(interaction => {
                contextParts.push(`- ${interaction}`);
            });
        }

        return contextParts.join('\n');
    }

    private determineEscalation(
        query: CustomerQuery,
        response: ResponseData,
        sentiment: SentimentAnalysis
    ): CustomerServiceResult['escalation'] {
        const needsEscalation = 
            response.confidence < this.ESCALATION_THRESHOLD ||
            sentiment.score < this.NEGATIVE_SENTIMENT_THRESHOLD ||
            query.priority === 'URGENT';

        if (needsEscalation) {
            return {
                required: true,
                reason: this.getEscalationReason(query, response, sentiment),
                priority: this.getEscalationPriority(query, sentiment),
                assignedTo: this.determineAssignment(query)
            };
        }

        return { required: false };
    }

    private getEscalationReason(
        query: CustomerQuery,
        response: ResponseData,
        sentiment: SentimentAnalysis
    ): string {
        if (response.confidence < this.ESCALATION_THRESHOLD) {
            return 'Low confidence in automated response';
        }
        if (sentiment.score < this.NEGATIVE_SENTIMENT_THRESHOLD) {
            return 'Negative customer sentiment detected';
        }
        if (query.priority === 'URGENT') {
            return 'Urgent query requires human attention';
        }
        return 'Multiple factors requiring escalation';
    }

    private getEscalationPriority(
        query: CustomerQuery,
        sentiment: SentimentAnalysis
    ): string {
        if (query.priority === 'URGENT') return 'HIGH';
        if (sentiment.score < this.NEGATIVE_SENTIMENT_THRESHOLD) return 'MEDIUM';
        return 'LOW';
    }

    private async determineAssignment(query: CustomerQuery): Promise<string> {
        try {
            // Use AI service to determine customer intent
            const intents = await aiService.determineIntent(query.query);
            
            // Map intents to departments
            if (intents.some(intent => intent.toLowerCase().includes('technical'))) {
                return 'technical_support_team';
            }
            if (intents.some(intent => intent.toLowerCase().includes('billing'))) {
                return 'billing_support_team';
            }
            if (intents.some(intent => intent.toLowerCase().includes('sales'))) {
                return 'sales_team';
            }
            
            return 'customer_support_team';
        } catch (error) {
            console.error('Assignment determination failed:', error);
            return 'customer_support_team';
        }
    }

    private predictSatisfaction(
        sentiment: SentimentAnalysis,
        response: ResponseData
    ): number {
        const sentimentWeight = 0.6;
        const confidenceWeight = 0.4;

        const normalizedSentiment = (sentiment.score + 1) / 2; // Convert -1:1 to 0:1
        return (normalizedSentiment * sentimentWeight) + 
               (response.confidence * confidenceWeight);
    }
}

export const customerServiceProcessor = new CustomerServiceProcessor();
export default customerServiceProcessor; 