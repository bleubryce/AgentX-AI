import { SalesProcessor, SalesOpportunity } from '../sales.processor';
import { salesAIService } from '../../../ai/sales.ai.service';

// Mock the AI service
jest.mock('../../../ai/sales.ai.service', () => ({
    salesAIService: {
        analyzeCompetitors: jest.fn(),
        generatePricingStrategy: jest.fn(),
        developSalesStrategy: jest.fn(),
        calculateOpportunityScore: jest.fn(),
        estimateTimeToClose: jest.fn()
    }
}));

describe('SalesProcessor', () => {
    let processor: SalesProcessor;
    const mockOpportunity: SalesOpportunity = {
        id: '1',
        companyName: 'Test Company',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '123-456-7890',
        productInterest: ['AI Platform'],
        budget: 100000,
        stage: 'QUALIFICATION',
        priority: 'HIGH',
        lastInteraction: new Date('2024-01-01')
    };

    beforeEach(() => {
        processor = new SalesProcessor();
        jest.clearAllMocks();

        // Setup default mock responses
        (salesAIService.analyzeCompetitors as jest.Mock).mockResolvedValue([
            {
                name: 'Competitor 1',
                marketShare: 25,
                strengths: ['Strong brand'],
                weaknesses: ['Limited AI capabilities']
            }
        ]);

        (salesAIService.generatePricingStrategy as jest.Mock).mockResolvedValue({
            recommendedPrice: 90000,
            minimumPrice: 75000,
            optimumPrice: 95000,
            discountThreshold: 15,
            justification: ['Market alignment'],
            competitiveFactors: ['Value pricing']
        });

        (salesAIService.developSalesStrategy as jest.Mock).mockResolvedValue({
            recommendedApproach: 'Value-based selling',
            keyTalkingPoints: ['AI capabilities'],
            riskFactors: ['Budget constraints'],
            successProbability: 75,
            timelineEstimate: '45 days',
            requiredResources: ['Sales team']
        });

        (salesAIService.calculateOpportunityScore as jest.Mock).mockResolvedValue(80);
        (salesAIService.estimateTimeToClose as jest.Mock).mockResolvedValue(45);
    });

    describe('process', () => {
        it('should process a sales opportunity successfully', async () => {
            const result = await processor.process(mockOpportunity);

            expect(result).toHaveProperty('opportunity');
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('metrics');
            expect(result).toHaveProperty('nextSteps');
            expect(salesAIService.analyzeCompetitors).toHaveBeenCalled();
            expect(salesAIService.generatePricingStrategy).toHaveBeenCalled();
            expect(salesAIService.developSalesStrategy).toHaveBeenCalled();
        });

        it('should throw error for invalid input', async () => {
            const invalidInput = {
                // Missing required fields
                contactEmail: 'john@test.com'
            };

            await expect(processor.process(invalidInput)).rejects.toThrow();
        });
    });

    describe('performCompetitiveAnalysis', () => {
        it('should perform competitive analysis with AI integration', async () => {
            const result = await processor.process(mockOpportunity);
            const analysis = result.analysis.competitive;

            expect(analysis).toHaveProperty('strengths');
            expect(analysis).toHaveProperty('weaknesses');
            expect(analysis).toHaveProperty('opportunities');
            expect(analysis).toHaveProperty('threats');
            expect(analysis.competitorComparison.length).toBeGreaterThan(0);
        });

        it('should handle AI service failure gracefully', async () => {
            (salesAIService.analyzeCompetitors as jest.Mock).mockRejectedValue(new Error('AI service error'));

            await expect(processor.process(mockOpportunity)).rejects.toThrow();
        });
    });

    describe('generatePricingStrategy', () => {
        it('should generate pricing strategy with budget validation', async () => {
            const result = await processor.process(mockOpportunity);
            const pricing = result.analysis.pricing;

            expect(pricing.recommendedPrice).toBeLessThanOrEqual(mockOpportunity.budget * 1.2);
            expect(pricing.minimumPrice).toBeLessThan(pricing.recommendedPrice);
            expect(pricing.discountThreshold).toBeLessThanOrEqual(30);
        });

        it('should adjust pricing based on budget constraints', async () => {
            const lowBudgetOpportunity = {
                ...mockOpportunity,
                budget: 50000
            };

            const result = await processor.process(lowBudgetOpportunity);
            expect(result.analysis.pricing.recommendedPrice).toBeLessThanOrEqual(60000); // 1.2 * budget
        });
    });

    describe('developSalesStrategy', () => {
        it('should develop stage-specific sales strategy', async () => {
            const result = await processor.process(mockOpportunity);
            const strategy = result.analysis.strategy;

            expect(strategy.recommendedApproach).toContain('technical requirements');
            expect(strategy.keyTalkingPoints).toContain('Implementation timeline');
            expect(strategy.successProbability).toBeGreaterThan(0);
            expect(strategy.successProbability).toBeLessThanOrEqual(100);
        });

        it('should adjust strategy based on opportunity stage', async () => {
            const proposalStageOpportunity = {
                ...mockOpportunity,
                stage: 'PROPOSAL'
            };

            const result = await processor.process(proposalStageOpportunity);
            expect(result.analysis.strategy.recommendedApproach).toContain('value proposition');
        });
    });

    describe('calculateMetrics', () => {
        it('should calculate all required metrics', async () => {
            const result = await processor.process(mockOpportunity);
            const metrics = result.metrics;

            expect(metrics).toHaveProperty('opportunityScore');
            expect(metrics).toHaveProperty('conversionProbability');
            expect(metrics).toHaveProperty('expectedValue');
            expect(metrics).toHaveProperty('timeToClose');
        });

        it('should calculate expected value correctly', async () => {
            const result = await processor.process(mockOpportunity);
            const expectedValue = (mockOpportunity.budget * result.metrics.conversionProbability) / 100;
            expect(result.metrics.expectedValue).toBe(expectedValue);
        });
    });

    describe('determineNextSteps', () => {
        it('should generate appropriate next steps based on stage', async () => {
            const result = await processor.process(mockOpportunity);
            expect(result.nextSteps.length).toBeGreaterThan(0);
            expect(result.nextSteps[0]).toHaveProperty('action');
            expect(result.nextSteps[0]).toHaveProperty('priority');
            expect(result.nextSteps[0]).toHaveProperty('deadline');
        });

        it('should prioritize follow-up for stale opportunities', async () => {
            const staleOpportunity = {
                ...mockOpportunity,
                lastInteraction: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
            };

            const result = await processor.process(staleOpportunity);
            const followUpStep = result.nextSteps.find(step => step.action.includes('Follow up'));
            expect(followUpStep).toBeDefined();
            expect(followUpStep?.priority).toBe('HIGH');
        });
    });

    describe('validateOpportunity', () => {
        it('validates a valid opportunity', () => {
            const result = SalesProcessor.validateOpportunity(mockOpportunity);
            expect(result.success).toBe(true);
        });

        it('fails validation for missing required fields', () => {
            const invalidOpportunity = {
                ...mockOpportunity,
                companyName: '',
                contactName: ''
            };
            const result = SalesProcessor.validateOpportunity(invalidOpportunity);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors).toHaveLength(2);
            }
        });

        it('fails validation for invalid email', () => {
            const invalidOpportunity = {
                ...mockOpportunity,
                contactEmail: 'invalid-email'
            };
            const result = SalesProcessor.validateOpportunity(invalidOpportunity);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toBe('Invalid email address');
            }
        });

        it('fails validation for empty product interest', () => {
            const invalidOpportunity = {
                ...mockOpportunity,
                productInterest: []
            };
            const result = SalesProcessor.validateOpportunity(invalidOpportunity);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toBe('At least one product interest is required');
            }
        });
    });

    describe('formatOpportunityData', () => {
        it('formats date correctly', () => {
            const data = {
                lastInteraction: '2024-01-01T00:00:00.000Z'
            };
            const formatted = SalesProcessor.formatOpportunityData(data);
            expect(formatted.lastInteraction).toBeInstanceOf(Date);
        });

        it('converts budget to number', () => {
            const data = {
                budget: '100000'
            };
            const formatted = SalesProcessor.formatOpportunityData(data);
            expect(typeof formatted.budget).toBe('number');
            expect(formatted.budget).toBe(100000);
        });

        it('ensures productInterest is an array', () => {
            const data = {
                productInterest: null
            };
            const formatted = SalesProcessor.formatOpportunityData(data);
            expect(Array.isArray(formatted.productInterest)).toBe(true);
            expect(formatted.productInterest).toHaveLength(0);
        });
    });

    describe('calculateOpportunityScore', () => {
        it('calculates maximum score for ideal opportunity', () => {
            const idealOpportunity: SalesOpportunity = {
                companyName: 'Ideal Company',
                contactName: 'John Doe',
                contactEmail: 'john@test.com',
                contactPhone: '123-456-7890',
                productInterest: ['AI Platform', 'Data Analytics', 'Machine Learning'],
                budget: 150000,
                stage: 'CLOSED_WON',
                priority: 'HIGH',
                lastInteraction: new Date()
            };
            const score = SalesProcessor.calculateOpportunityScore(idealOpportunity);
            expect(score).toBe(100);
        });

        it('calculates lower score for basic opportunity', () => {
            const basicOpportunity: SalesOpportunity = {
                companyName: 'Basic Company',
                contactName: 'John Doe',
                productInterest: ['AI Platform'],
                stage: 'PROSPECTING',
                priority: 'LOW'
            };
            const score = SalesProcessor.calculateOpportunityScore(basicOpportunity);
            expect(score).toBeLessThan(50);
        });

        it('adjusts score based on last interaction', () => {
            const recentOpportunity = {
                ...mockOpportunity,
                lastInteraction: new Date()
            };
            const oldOpportunity = {
                ...mockOpportunity,
                lastInteraction: new Date('2023-01-01')
            };
            
            const recentScore = SalesProcessor.calculateOpportunityScore(recentOpportunity);
            const oldScore = SalesProcessor.calculateOpportunityScore(oldOpportunity);
            
            expect(recentScore).toBeGreaterThan(oldScore);
        });
    });

    describe('estimateConversionProbability', () => {
        it('returns 100% for CLOSED_WON opportunities', () => {
            const opportunity = {
                ...mockOpportunity,
                stage: 'CLOSED_WON'
            };
            const probability = SalesProcessor.estimateConversionProbability(opportunity);
            expect(probability).toBe(100);
        });

        it('returns higher probability for better qualified opportunities', () => {
            const highQualityOpp = {
                ...mockOpportunity,
                stage: 'NEGOTIATION',
                priority: 'HIGH',
                budget: 100000,
                productInterest: ['AI Platform', 'Data Analytics']
            };
            const lowQualityOpp = {
                ...mockOpportunity,
                stage: 'PROSPECTING',
                priority: 'LOW',
                budget: 10000,
                productInterest: ['AI Platform']
            };
            
            const highProb = SalesProcessor.estimateConversionProbability(highQualityOpp);
            const lowProb = SalesProcessor.estimateConversionProbability(lowQualityOpp);
            
            expect(highProb).toBeGreaterThan(lowProb);
        });
    });

    describe('calculateExpectedValue', () => {
        it('calculates expected value based on budget and probability', () => {
            const opportunity = {
                ...mockOpportunity,
                budget: 100000,
                stage: 'NEGOTIATION'
            };
            const expectedValue = SalesProcessor.calculateExpectedValue(opportunity);
            expect(expectedValue).toBe(75000); // 75% probability * 100000
        });

        it('returns 0 for opportunities without budget', () => {
            const opportunity = {
                ...mockOpportunity,
                budget: undefined
            };
            const expectedValue = SalesProcessor.calculateExpectedValue(opportunity);
            expect(expectedValue).toBe(0);
        });
    });

    describe('estimateTimeToClose', () => {
        it('estimates shorter time for late-stage opportunities', () => {
            const lateStageOpp = {
                ...mockOpportunity,
                stage: 'NEGOTIATION'
            };
            const earlyStageOpp = {
                ...mockOpportunity,
                stage: 'PROSPECTING'
            };
            
            const lateStageTime = SalesProcessor.estimateTimeToClose(lateStageOpp);
            const earlyStageTime = SalesProcessor.estimateTimeToClose(earlyStageOpp);
            
            expect(lateStageTime).toBeLessThan(earlyStageTime);
        });

        it('adjusts time based on priority', () => {
            const highPriorityOpp = {
                ...mockOpportunity,
                priority: 'HIGH'
            };
            const lowPriorityOpp = {
                ...mockOpportunity,
                priority: 'LOW'
            };
            
            const highPriorityTime = SalesProcessor.estimateTimeToClose(highPriorityOpp);
            const lowPriorityTime = SalesProcessor.estimateTimeToClose(lowPriorityOpp);
            
            expect(highPriorityTime).toBeLessThan(lowPriorityTime);
        });

        it('adjusts time based on deal size', () => {
            const largeOpp = {
                ...mockOpportunity,
                budget: 150000
            };
            const smallOpp = {
                ...mockOpportunity,
                budget: 10000
            };
            
            const largeTime = SalesProcessor.estimateTimeToClose(largeOpp);
            const smallTime = SalesProcessor.estimateTimeToClose(smallOpp);
            
            expect(largeTime).toBeGreaterThan(smallTime);
        });
    });
}); 