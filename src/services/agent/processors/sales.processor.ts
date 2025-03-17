import { AgentCapability } from '../agent.types';
import config from '../agent.config';
import { salesAIService } from '../../ai/sales.ai.service';
import SalesLogger from '../../logging/sales.logger';
import { z } from 'zod';

export interface SalesOpportunity {
    id?: string;
    companyName: string;
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    productInterest: string[];
    budget?: number;
    stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    lastInteraction?: Date;
}

// Zod schema for validation
export const SalesOpportunitySchema = z.object({
    id: z.string().optional(),
    companyName: z.string().min(1, 'Company name is required'),
    contactName: z.string().min(1, 'Contact name is required'),
    contactEmail: z.string().email('Invalid email address').optional(),
    contactPhone: z.string().optional(),
    productInterest: z.array(z.string()).min(1, 'At least one product interest is required'),
    budget: z.number().positive('Budget must be positive').optional(),
    stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    lastInteraction: z.date().optional()
});

interface CompetitiveAnalysis {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    competitorComparison: {
        competitor: string;
        advantages: string[];
        disadvantages: string[];
    }[];
}

interface PricingStrategy {
    recommendedPrice: number;
    minimumPrice: number;
    optimumPrice: number;
    discountThreshold: number;
    justification: string[];
    competitiveFactors: string[];
}

interface SalesStrategy {
    recommendedApproach: string;
    keyTalkingPoints: string[];
    riskFactors: string[];
    successProbability: number;
    timelineEstimate: string;
    requiredResources: string[];
}

interface SalesResult {
    opportunity: SalesOpportunity;
    analysis: {
        competitive: CompetitiveAnalysis;
        pricing: PricingStrategy;
        strategy: SalesStrategy;
    };
    metrics: {
        opportunityScore: number;
        conversionProbability: number;
        expectedValue: number;
        timeToClose: number;
    };
    nextSteps: {
        action: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH';
        deadline?: Date;
        assignedTo?: string;
    }[];
}

export class SalesProcessor {
    private static readonly OPPORTUNITY_SCORE_THRESHOLD = 70;
    private static readonly HIGH_PRIORITY_THRESHOLD = 80;
    private static readonly QUICK_WIN_THRESHOLD = 85;

    async process(input: Record<string, any>): Promise<SalesResult> {
        try {
            // Extract and validate sales opportunity
            const opportunity = this.extractSalesOpportunity(input);
            SalesLogger.logOpportunityProcess(opportunity, 'start');
            
            try {
                // Perform competitive analysis
                const competitive = await this.performCompetitiveAnalysis(opportunity);
                
                // Generate pricing strategy
                const pricing = await this.generatePricingStrategy(opportunity, competitive);
                
                // Develop sales strategy
                const strategy = await this.developSalesStrategy(opportunity, competitive, pricing);
                
                // Calculate metrics
                const metrics = this.calculateMetrics(opportunity, strategy);
                
                // Determine next steps
                const nextSteps = this.determineNextSteps(opportunity, strategy, metrics);

                const result = {
                    opportunity,
                    analysis: {
                        competitive,
                        pricing,
                        strategy
                    },
                    metrics,
                    nextSteps
                };

                SalesLogger.logOpportunityProcess(opportunity, 'complete');
                return result;
            } catch (error) {
                SalesLogger.logOpportunityProcess(opportunity, 'error', error);
                throw error;
            }
        } catch (error) {
            throw new Error(`Sales processing failed: ${error.message}`);
        }
    }

    private extractSalesOpportunity(input: Record<string, any>): SalesOpportunity {
        const opportunity: SalesOpportunity = {
            id: input.id,
            companyName: input.companyName,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            productInterest: input.productInterest || [],
            budget: input.budget,
            stage: input.stage || 'PROSPECTING',
            priority: input.priority || 'MEDIUM',
            lastInteraction: input.lastInteraction ? new Date(input.lastInteraction) : undefined
        };

        if (!opportunity.companyName || !opportunity.contactName) {
            throw new Error('Company name and contact name are required');
        }

        return opportunity;
    }

    private async performCompetitiveAnalysis(
        opportunity: SalesOpportunity
    ): Promise<CompetitiveAnalysis> {
        try {
            SalesLogger.logCompetitiveAnalysis(opportunity.id || 'unknown', 'start');
            
            // Get market data from external service or cache
            const marketData = await this.getMarketData(opportunity.productInterest);
            
            // Use AI service to analyze competitors
            SalesLogger.logAIServiceCall('salesAIService', 'analyzeCompetitors', 'start');
            const competitorAnalysis = await salesAIService.analyzeCompetitors(opportunity, marketData);
            SalesLogger.logAIServiceCall('salesAIService', 'analyzeCompetitors', 'complete');
            
            // Transform AI response into CompetitiveAnalysis format
            const analysis: CompetitiveAnalysis = {
                strengths: [],
                weaknesses: [],
                opportunities: [],
                threats: [],
                competitorComparison: []
            };

            // Extract SWOT analysis from competitor data
            competitorAnalysis.forEach(competitor => {
                // Add competitor-specific strengths and weaknesses
                analysis.competitorComparison.push({
                    competitor: competitor.name,
                    advantages: competitor.strengths,
                    disadvantages: competitor.weaknesses
                });

                // Aggregate opportunities and threats based on competitor analysis
                if (competitor.marketShare > 30) {
                    analysis.threats.push(`${competitor.name} has significant market share (${competitor.marketShare}%)`);
                }

                // Identify opportunities from competitor weaknesses
                competitor.weaknesses.forEach(weakness => {
                    analysis.opportunities.push(`Capitalize on ${competitor.name}'s weakness: ${weakness}`);
                });
            });

            // Add our strengths based on competitor analysis
            analysis.strengths = [
                'Advanced AI-powered sales optimization',
                'Real-time market analysis capabilities',
                'Personalized pricing strategies',
                'Integrated sales and marketing approach'
            ];

            // Add our weaknesses based on market position
            analysis.weaknesses = [
                'New market entrant',
                'Building brand recognition',
                'Limited historical data'
            ];

            // Add general market opportunities
            analysis.opportunities = [
                ...analysis.opportunities,
                'Growing market demand',
                'Increasing adoption of AI solutions',
                'Shift towards digital transformation'
            ];

            // Add general market threats
            analysis.threats = [
                ...analysis.threats,
                'Rapid technological changes',
                'Evolving regulatory landscape',
                'Economic uncertainties'
            ];

            SalesLogger.logCompetitiveAnalysis(opportunity.id || 'unknown', 'complete', analysis);
            return analysis;
        } catch (error) {
            SalesLogger.logCompetitiveAnalysis(opportunity.id || 'unknown', 'error', null, error);
            throw error;
        }
    }

    private async getMarketData(productInterest: string[]): Promise<any> {
        // TODO: Implement market data retrieval from external service
        // For now, return mock data
        return {
            marketSize: 1000000000,
            growthRate: 15,
            competitors: [
                {
                    name: 'Enterprise Solutions Inc.',
                    marketShare: 35,
                    pricing: {
                        range: [50000, 250000],
                        model: 'subscription'
                    }
                },
                {
                    name: 'Tech Innovators Ltd.',
                    marketShare: 25,
                    pricing: {
                        range: [25000, 150000],
                        model: 'hybrid'
                    }
                },
                {
                    name: 'Digital Pioneers Co.',
                    marketShare: 15,
                    pricing: {
                        range: [15000, 100000],
                        model: 'usage-based'
                    }
                }
            ],
            trends: [
                'Increasing demand for AI integration',
                'Shift towards cloud-based solutions',
                'Growing focus on data security',
                'Rise in remote work solutions'
            ]
        };
    }

    private async generatePricingStrategy(
        opportunity: SalesOpportunity,
        competitive: CompetitiveAnalysis
    ): Promise<PricingStrategy> {
        try {
            SalesLogger.logPricingStrategy(opportunity.id || 'unknown', 'start');
            
            // Transform competitive analysis into format expected by AI service
            const competitors = competitive.competitorComparison.map(comp => ({
                name: comp.competitor,
                strengths: comp.advantages,
                weaknesses: comp.disadvantages,
                marketShare: this.getCompetitorMarketShare(comp.competitor),
                pricing: this.getCompetitorPricing(comp.competitor)
            }));

            // Generate pricing strategy using AI service
            SalesLogger.logAIServiceCall('salesAIService', 'generatePricingStrategy', 'start');
            const aiPricingStrategy = await salesAIService.generatePricingStrategy(opportunity, competitors);
            SalesLogger.logAIServiceCall('salesAIService', 'generatePricingStrategy', 'complete');

            // Enhance the AI response with additional context and validation
            const strategy: PricingStrategy = {
                recommendedPrice: this.validatePrice(aiPricingStrategy.recommendedPrice, opportunity.budget),
                minimumPrice: this.validatePrice(aiPricingStrategy.minimumPrice, opportunity.budget),
                optimumPrice: this.validatePrice(aiPricingStrategy.optimumPrice, opportunity.budget),
                discountThreshold: Math.min(aiPricingStrategy.discountThreshold, 30), // Cap at 30%
                justification: [
                    ...aiPricingStrategy.justification,
                    'Based on current market positioning',
                    'Aligned with competitor pricing models',
                    'Considers customer budget constraints'
                ],
                competitiveFactors: [
                    ...aiPricingStrategy.competitiveFactors,
                    'Market penetration strategy',
                    'Value-based pricing approach',
                    'Long-term customer relationship focus'
                ]
            };

            SalesLogger.logPricingStrategy(opportunity.id || 'unknown', 'complete', strategy);
            return strategy;
        } catch (error) {
            SalesLogger.logPricingStrategy(opportunity.id || 'unknown', 'error', null, error);
            throw error;
        }
    }

    private validatePrice(price: number, budget?: number): number {
        if (!price || price < 0) {
            return 0;
        }
        if (budget && price > budget * 1.5) {
            return budget * 1.2; // Cap at 20% above budget
        }
        return price;
    }

    private getCompetitorMarketShare(competitorName: string): number {
        // Get market share from mock data
        const mockData = {
            'Enterprise Solutions Inc.': 35,
            'Tech Innovators Ltd.': 25,
            'Digital Pioneers Co.': 15
        };
        return mockData[competitorName] || 10;
    }

    private getCompetitorPricing(competitorName: string): { range: [number, number]; model: string } {
        // Get pricing from mock data
        const mockData = {
            'Enterprise Solutions Inc.': {
                range: [50000, 250000],
                model: 'subscription'
            },
            'Tech Innovators Ltd.': {
                range: [25000, 150000],
                model: 'hybrid'
            },
            'Digital Pioneers Co.': {
                range: [15000, 100000],
                model: 'usage-based'
            }
        };
        return mockData[competitorName] || { range: [10000, 50000], model: 'standard' };
    }

    private async developSalesStrategy(
        opportunity: SalesOpportunity,
        competitive: CompetitiveAnalysis,
        pricing: PricingStrategy
    ): Promise<SalesStrategy> {
        try {
            SalesLogger.logSalesStrategy(opportunity.id || 'unknown', 'start');
            
            // Generate sales strategy using AI service
            SalesLogger.logAIServiceCall('salesAIService', 'developSalesStrategy', 'start');
            const aiStrategy = await salesAIService.developSalesStrategy(
                opportunity,
                competitive.competitorComparison.map(comp => ({
                    name: comp.competitor,
                    strengths: comp.advantages,
                    weaknesses: comp.disadvantages,
                    marketShare: this.getCompetitorMarketShare(comp.competitor),
                    pricing: this.getCompetitorPricing(comp.competitor)
                })),
                pricing
            );
            SalesLogger.logAIServiceCall('salesAIService', 'developSalesStrategy', 'complete');

            // Enhance the strategy with stage-specific recommendations
            const stageSpecificApproach = this.getStageSpecificApproach(opportunity.stage);
            const stageSpecificTalkingPoints = this.getStageSpecificTalkingPoints(opportunity.stage);

            // Combine AI-generated strategy with stage-specific enhancements
            const strategy: SalesStrategy = {
                recommendedApproach: `${aiStrategy.recommendedApproach}\n\n${stageSpecificApproach}`,
                keyTalkingPoints: [
                    ...aiStrategy.keyTalkingPoints,
                    ...stageSpecificTalkingPoints
                ],
                riskFactors: [
                    ...aiStrategy.riskFactors,
                    'Market volatility',
                    'Competitive pressure',
                    'Budget constraints'
                ],
                successProbability: this.calculateSuccessProbability(
                    aiStrategy.successProbability,
                    opportunity,
                    pricing
                ),
                timelineEstimate: this.refineTimelineEstimate(
                    aiStrategy.timelineEstimate,
                    opportunity.stage
                ),
                requiredResources: [
                    ...aiStrategy.requiredResources,
                    'Sales team support',
                    'Technical documentation',
                    'Product demonstrations'
                ]
            };

            SalesLogger.logSalesStrategy(opportunity.id || 'unknown', 'complete', strategy);
            return strategy;
        } catch (error) {
            SalesLogger.logSalesStrategy(opportunity.id || 'unknown', 'error', null, error);
            throw error;
        }
    }

    private getStageSpecificApproach(stage: SalesOpportunity['stage']): string {
        const approaches = {
            'PROSPECTING': 'Focus on building initial rapport and understanding customer needs. Emphasize our unique AI-driven approach.',
            'QUALIFICATION': 'Deep dive into technical requirements and budget alignment. Demonstrate ROI potential.',
            'PROPOSAL': 'Present customized solution with clear value propositions. Highlight competitive advantages.',
            'NEGOTIATION': 'Focus on value-based negotiations. Prepare flexible pricing options within approved ranges.',
            'CLOSED_WON': 'Transition to implementation planning. Set up success metrics.',
            'CLOSED_LOST': 'Document lessons learned. Plan follow-up strategy for future opportunities.'
        };
        return approaches[stage] || 'Standard sales approach based on customer needs';
    }

    private getStageSpecificTalkingPoints(stage: SalesOpportunity['stage']): string[] {
        const talkingPoints = {
            'PROSPECTING': [
                'Industry-leading AI capabilities',
                'Proven success stories',
                'Flexible integration options'
            ],
            'QUALIFICATION': [
                'Detailed technical specifications',
                'Implementation timeline',
                'Resource requirements'
            ],
            'PROPOSAL': [
                'Customized solution benefits',
                'ROI calculations',
                'Implementation roadmap'
            ],
            'NEGOTIATION': [
                'Value-based pricing model',
                'Service level agreements',
                'Partnership benefits'
            ],
            'CLOSED_WON': [
                'Implementation milestones',
                'Success metrics',
                'Support structure'
            ],
            'CLOSED_LOST': [
                'Alternative solutions',
                'Future engagement opportunities',
                'Feedback incorporation'
            ]
        };
        return talkingPoints[stage] || ['Value proposition', 'Solution benefits', 'Customer success focus'];
    }

    private calculateSuccessProbability(
        aiProbability: number,
        opportunity: SalesOpportunity,
        pricing: PricingStrategy
    ): number {
        let probability = aiProbability;

        // Adjust based on budget alignment
        if (opportunity.budget && opportunity.budget >= pricing.recommendedPrice) {
            probability += 10;
        } else if (opportunity.budget && opportunity.budget < pricing.minimumPrice) {
            probability -= 20;
        }

        // Adjust based on stage
        const stageMultipliers = {
            'PROSPECTING': 0.7,
            'QUALIFICATION': 0.8,
            'PROPOSAL': 0.85,
            'NEGOTIATION': 0.9,
            'CLOSED_WON': 1,
            'CLOSED_LOST': 0
        };
        probability *= stageMultipliers[opportunity.stage] || 1;

        // Ensure probability is within valid range
        return Math.min(Math.max(probability, 0), 100);
    }

    private refineTimelineEstimate(
        aiEstimate: string,
        stage: SalesOpportunity['stage']
    ): string {
        // Extract number of days from AI estimate
        const daysMatch = aiEstimate.match(/\d+/);
        let days = daysMatch ? parseInt(daysMatch[0]) : 30;

        // Adjust based on stage
        const stageAdjustments = {
            'PROSPECTING': 1.5,  // 50% longer
            'QUALIFICATION': 1.2, // 20% longer
            'PROPOSAL': 1,       // No adjustment
            'NEGOTIATION': 0.8,  // 20% shorter
            'CLOSED_WON': 0,     // Immediate
            'CLOSED_LOST': 0     // Immediate
        };

        days *= stageAdjustments[stage] || 1;
        
        return `Estimated ${Math.round(days)} days to close`;
    }

    private calculateMetrics(
        opportunity: SalesOpportunity,
        strategy: SalesStrategy
    ): SalesResult['metrics'] {
        try {
            const metrics = {
                opportunityScore: this.calculateOpportunityScore(opportunity),
                conversionProbability: this.estimateConversionProbability(opportunity),
                expectedValue: this.calculateExpectedValue(opportunity),
                timeToClose: this.estimateTimeToClose(opportunity)
            };

            SalesLogger.logMetricsCalculation(opportunity.id || 'unknown', metrics);
            return metrics;
        } catch (error) {
            SalesLogger.logMetricsCalculation(opportunity.id || 'unknown', null, error);
            throw error;
        }
    }

    static validateOpportunity(data: unknown): z.SafeParseReturnType<unknown, SalesOpportunity> {
        return SalesOpportunitySchema.safeParse(data);
    }

    static formatOpportunityData(data: Partial<SalesOpportunity>): Partial<SalesOpportunity> {
        return {
            ...data,
            lastInteraction: data.lastInteraction ? new Date(data.lastInteraction) : undefined,
            budget: data.budget ? Number(data.budget) : undefined,
            productInterest: Array.isArray(data.productInterest) ? data.productInterest : []
        };
    }

    static calculateOpportunityScore(opportunity: SalesOpportunity): number {
        let score = 0;

        // Company and contact information
        if (opportunity.companyName) score += 10;
        if (opportunity.contactName) score += 10;
        if (opportunity.contactEmail) score += 5;
        if (opportunity.contactPhone) score += 5;

        // Product interest
        if (opportunity.productInterest.length > 0) {
            score += Math.min(opportunity.productInterest.length * 5, 20);
        }

        // Budget
        if (opportunity.budget) {
            if (opportunity.budget >= 100000) score += 20;
            else if (opportunity.budget >= 50000) score += 15;
            else if (opportunity.budget >= 10000) score += 10;
            else score += 5;
        }

        // Stage
        switch (opportunity.stage) {
            case 'CLOSED_WON':
                score += 20;
                break;
            case 'NEGOTIATION':
                score += 15;
                break;
            case 'PROPOSAL':
                score += 10;
                break;
            case 'QUALIFICATION':
                score += 5;
                break;
            default:
                break;
        }

        // Priority
        switch (opportunity.priority) {
            case 'HIGH':
                score += 10;
                break;
            case 'MEDIUM':
                score += 5;
                break;
            default:
                break;
        }

        // Recent interaction
        if (opportunity.lastInteraction) {
            const daysSinceLastInteraction = Math.floor(
                (Date.now() - opportunity.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastInteraction <= 7) score += 10;
            else if (daysSinceLastInteraction <= 30) score += 5;
        }

        return Math.min(score, 100);
    }

    static estimateConversionProbability(opportunity: SalesOpportunity): number {
        let probability = 0;

        // Base probability by stage
        switch (opportunity.stage) {
            case 'CLOSED_WON':
                probability = 100;
                break;
            case 'NEGOTIATION':
                probability = 75;
                break;
            case 'PROPOSAL':
                probability = 50;
                break;
            case 'QUALIFICATION':
                probability = 25;
                break;
            case 'PROSPECTING':
                probability = 10;
                break;
            default:
                probability = 0;
        }

        // Adjust based on other factors
        if (opportunity.budget && opportunity.budget >= 50000) probability += 10;
        if (opportunity.priority === 'HIGH') probability += 10;
        if (opportunity.productInterest.length >= 2) probability += 5;

        return Math.min(probability, 100);
    }

    static calculateExpectedValue(opportunity: SalesOpportunity): number {
        const conversionProbability = this.estimateConversionProbability(opportunity);
        return opportunity.budget ? (opportunity.budget * conversionProbability) / 100 : 0;
    }

    static estimateTimeToClose(opportunity: SalesOpportunity): number {
        let baseTime = 0;

        // Base time by stage
        switch (opportunity.stage) {
            case 'PROSPECTING':
                baseTime = 90;
                break;
            case 'QUALIFICATION':
                baseTime = 60;
                break;
            case 'PROPOSAL':
                baseTime = 30;
                break;
            case 'NEGOTIATION':
                baseTime = 15;
                break;
            default:
                baseTime = 0;
        }

        // Adjust based on other factors
        if (opportunity.priority === 'HIGH') baseTime *= 0.8;
        if (opportunity.budget && opportunity.budget >= 100000) baseTime *= 1.2;
        if (opportunity.productInterest.length >= 3) baseTime *= 1.1;

        return Math.round(baseTime);
    }

    private determineNextSteps(
        opportunity: SalesOpportunity,
        strategy: SalesStrategy,
        metrics: SalesResult['metrics']
    ): SalesResult['nextSteps'] {
        const nextSteps: SalesResult['nextSteps'] = [];

        // Determine priority based on metrics
        const priority = metrics.opportunityScore >= this.HIGH_PRIORITY_THRESHOLD ? 'HIGH' : 'MEDIUM';

        // Add immediate next steps based on stage
        switch (opportunity.stage) {
            case 'PROSPECTING':
                nextSteps.push({
                    action: 'Schedule initial discovery call',
                    priority,
                    deadline: this.calculateDeadline(2) // 2 days
                });
                break;
            case 'QUALIFICATION':
                nextSteps.push({
                    action: 'Complete needs assessment',
                    priority,
                    deadline: this.calculateDeadline(5) // 5 days
                });
                break;
            case 'PROPOSAL':
                nextSteps.push({
                    action: 'Prepare and send proposal',
                    priority,
                    deadline: this.calculateDeadline(3) // 3 days
                });
                break;
            case 'NEGOTIATION':
                nextSteps.push({
                    action: 'Schedule negotiation call',
                    priority,
                    deadline: this.calculateDeadline(1) // 1 day
                });
                break;
        }

        // Add follow-up step if needed
        if (opportunity.lastInteraction) {
            const daysSinceLastInteraction = this.calculateDaysSince(opportunity.lastInteraction);
            if (daysSinceLastInteraction > 7) {
                nextSteps.push({
                    action: 'Follow up with contact',
                    priority: 'HIGH',
                    deadline: new Date()
                });
            }
        }

        return nextSteps;
    }

    private calculateDeadline(daysFromNow: number): Date {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + daysFromNow);
        return deadline;
    }

    private calculateDaysSince(date: Date): number {
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}

export const salesProcessor = new SalesProcessor();
export default salesProcessor; 