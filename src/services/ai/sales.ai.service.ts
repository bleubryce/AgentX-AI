import { Configuration, OpenAIApi } from 'openai';
import config from '../agent/agent.config';

interface SalesAIConfig {
    model: string;
    temperature: number;
    maxTokens: number;
}

interface CompetitorAnalysisResult {
    name: string;
    marketShare: number;
    strengths: string[];
    weaknesses: string[];
    strategy: string;
    pricing: {
        range: [number, number];
        model: string;
    };
    products: {
        name: string;
        features: string[];
        targetSegment: string;
    }[];
}

interface PricingStrategyResult {
    recommendedPrice: number;
    minimumPrice: number;
    optimumPrice: number;
    discountThreshold: number;
    justification: string[];
    competitiveFactors: string[];
}

interface SalesStrategyResult {
    recommendedApproach: string;
    keyTalkingPoints: string[];
    riskFactors: string[];
    successProbability: number;
    timelineEstimate: string;
    requiredResources: string[];
}

class SalesAIService {
    private openai: OpenAIApi;
    private config: SalesAIConfig;

    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.openai = new OpenAIApi(configuration);
        this.config = {
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000
        };
    }

    async analyzeCompetitors(
        opportunity: any,
        marketData: any
    ): Promise<CompetitorAnalysisResult[]> {
        try {
            const prompt = `
                Analyze the competitive landscape for the following sales opportunity:
                Company: ${opportunity.companyName}
                Product Interest: ${opportunity.productInterest.join(', ')}
                Budget: ${opportunity.budget}
                
                Market Data:
                ${JSON.stringify(marketData, null, 2)}
                
                Provide a detailed analysis of each competitor including:
                - Market share
                - Key strengths and weaknesses
                - Current strategy
                - Pricing model and ranges
                - Product offerings and features
                
                Format the response as a JSON array of competitor analyses.
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert in competitive analysis and market research.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            });

            const analysis = response.data.choices[0].message?.content || '[]';
            return JSON.parse(analysis);
        } catch (error) {
            console.error('Competitor analysis failed:', error);
            throw new Error('Failed to analyze competitors');
        }
    }

    async generatePricingStrategy(
        opportunity: any,
        competitors: CompetitorAnalysisResult[]
    ): Promise<PricingStrategyResult> {
        try {
            const prompt = `
                Generate a pricing strategy for the following sales opportunity:
                Company: ${opportunity.companyName}
                Budget: ${opportunity.budget}
                Product Interest: ${opportunity.productInterest.join(', ')}
                
                Competitor Analysis:
                ${JSON.stringify(competitors, null, 2)}
                
                Provide a detailed pricing strategy including:
                - Recommended price point
                - Minimum acceptable price
                - Optimum price for maximum value
                - Discount threshold
                - Justification for pricing decisions
                - Competitive factors considered
                
                Format the response as a JSON object.
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert in pricing strategy and value-based selling.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            });

            const strategy = response.data.choices[0].message?.content || '{}';
            return JSON.parse(strategy);
        } catch (error) {
            console.error('Pricing strategy generation failed:', error);
            throw new Error('Failed to generate pricing strategy');
        }
    }

    async developSalesStrategy(
        opportunity: any,
        competitors: CompetitorAnalysisResult[],
        pricing: PricingStrategyResult
    ): Promise<SalesStrategyResult> {
        try {
            const prompt = `
                Develop a comprehensive sales strategy for the following opportunity:
                Company: ${opportunity.companyName}
                Budget: ${opportunity.budget}
                Product Interest: ${opportunity.productInterest.join(', ')}
                Stage: ${opportunity.stage}
                
                Competitor Analysis:
                ${JSON.stringify(competitors, null, 2)}
                
                Pricing Strategy:
                ${JSON.stringify(pricing, null, 2)}
                
                Provide a detailed sales strategy including:
                - Recommended approach
                - Key talking points
                - Risk factors
                - Success probability
                - Timeline estimate
                - Required resources
                
                Format the response as a JSON object.
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert in sales strategy and complex deal management.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.4
            });

            const strategy = response.data.choices[0].message?.content || '{}';
            return JSON.parse(strategy);
        } catch (error) {
            console.error('Sales strategy development failed:', error);
            throw new Error('Failed to develop sales strategy');
        }
    }

    async calculateOpportunityScore(
        opportunity: any,
        competitors: CompetitorAnalysisResult[],
        strategy: SalesStrategyResult
    ): Promise<number> {
        try {
            const prompt = `
                Calculate an opportunity score (0-100) for the following sales opportunity:
                Company: ${opportunity.companyName}
                Budget: ${opportunity.budget}
                Stage: ${opportunity.stage}
                
                Competitor Analysis:
                ${JSON.stringify(competitors, null, 2)}
                
                Sales Strategy:
                ${JSON.stringify(strategy, null, 2)}
                
                Consider the following factors:
                - Budget alignment
                - Stage of opportunity
                - Competitive position
                - Success probability
                - Timeline
                
                Provide only the numerical score.
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert in sales opportunity scoring and qualification.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2
            });

            const score = response.data.choices[0].message?.content || '0';
            return parseFloat(score);
        } catch (error) {
            console.error('Opportunity scoring failed:', error);
            throw new Error('Failed to calculate opportunity score');
        }
    }

    async estimateTimeToClose(
        opportunity: any,
        strategy: SalesStrategyResult
    ): Promise<number> {
        try {
            const prompt = `
                Estimate the time to close (in days) for the following sales opportunity:
                Company: ${opportunity.companyName}
                Stage: ${opportunity.stage}
                Budget: ${opportunity.budget}
                
                Sales Strategy:
                ${JSON.stringify(strategy, null, 2)}
                
                Consider:
                - Current stage
                - Complexity of solution
                - Budget size
                - Required resources
                - Historical data
                
                Provide only the number of days.
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert in sales cycle analysis and forecasting.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2
            });

            const days = response.data.choices[0].message?.content || '30';
            return parseInt(days);
        } catch (error) {
            console.error('Time to close estimation failed:', error);
            throw new Error('Failed to estimate time to close');
        }
    }
}

export const salesAIService = new SalesAIService();
export default salesAIService; 