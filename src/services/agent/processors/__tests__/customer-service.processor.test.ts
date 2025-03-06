import { CustomerServiceProcessor } from '../customer-service.processor';
import { aiService } from '../../../ai/ai.service';

// Mock the AI service
jest.mock('../../../ai/ai.service');
const mockedAiService = aiService as jest.Mocked<typeof aiService>;

describe('CustomerServiceProcessor', () => {
    let processor: CustomerServiceProcessor;

    beforeEach(() => {
        processor = new CustomerServiceProcessor();
        jest.clearAllMocks();
    });

    describe('process', () => {
        it('should process a customer query successfully', async () => {
            // Mock AI service responses
            mockedAiService.analyzeSentiment.mockResolvedValue({
                score: 0.5,
                magnitude: 0.8,
                aspects: [
                    { topic: 'service', sentiment: 0.7 },
                    { topic: 'response time', sentiment: 0.3 }
                ]
            });

            mockedAiService.generateResponse.mockResolvedValue({
                response: 'Thank you for your query. I understand your concern.',
                confidence: 0.9,
                suggestedActions: ['Follow up in 24 hours'],
                references: ['KB-123']
            });

            const input = {
                customerId: '123',
                query: 'When will my order arrive?',
                context: 'Order #456',
                priority: 'MEDIUM'
            };

            const result = await processor.process(input);

            expect(result).toMatchObject({
                query: {
                    customerId: '123',
                    query: 'When will my order arrive?',
                    context: 'Order #456',
                    priority: 'MEDIUM'
                },
                sentiment: {
                    score: 0.5,
                    magnitude: 0.8,
                    aspects: expect.any(Array)
                },
                response: {
                    response: expect.any(String),
                    confidence: expect.any(Number),
                    suggestedActions: expect.any(Array)
                },
                metrics: {
                    responseTime: expect.any(Number),
                    confidenceScore: expect.any(Number),
                    satisfactionPrediction: expect.any(Number)
                }
            });

            expect(mockedAiService.analyzeSentiment).toHaveBeenCalled();
            expect(mockedAiService.generateResponse).toHaveBeenCalled();
        });

        it('should handle negative sentiment and trigger escalation', async () => {
            mockedAiService.analyzeSentiment.mockResolvedValue({
                score: -0.8,
                magnitude: 0.9,
                aspects: [
                    { topic: 'service', sentiment: -0.9 },
                    { topic: 'response time', sentiment: -0.7 }
                ]
            });

            mockedAiService.generateResponse.mockResolvedValue({
                response: 'I apologize for your negative experience.',
                confidence: 0.85,
                suggestedActions: ['Escalate to supervisor'],
                references: []
            });

            const input = {
                customerId: '123',
                query: 'This is absolutely terrible service!',
                priority: 'HIGH'
            };

            const result = await processor.process(input);

            expect(result.escalation).toEqual({
                required: true,
                reason: expect.any(String),
                priority: 'HIGH',
                assignedTo: expect.any(String)
            });

            expect(result.response.followUpRequired).toBe(true);
            expect(result.response.suggestedActions).toContain('Schedule follow-up');
        });

        it('should handle AI service failures gracefully', async () => {
            mockedAiService.analyzeSentiment.mockRejectedValue(new Error('AI service error'));
            mockedAiService.generateResponse.mockRejectedValue(new Error('AI service error'));

            const input = {
                customerId: '123',
                query: 'Test query',
                priority: 'MEDIUM'
            };

            const result = await processor.process(input);

            expect(result.sentiment).toEqual({
                score: 0,
                magnitude: 0,
                aspects: []
            });

            expect(result.response).toMatchObject({
                confidence: 0.5,
                followUpRequired: true,
                suggestedActions: ['Transfer to human agent']
            });
        });

        it('should handle urgent queries with appropriate escalation', async () => {
            mockedAiService.analyzeSentiment.mockResolvedValue({
                score: 0.2,
                magnitude: 0.5,
                aspects: []
            });

            mockedAiService.generateResponse.mockResolvedValue({
                response: 'I understand this is urgent.',
                confidence: 0.95,
                suggestedActions: ['Immediate response required'],
                references: []
            });

            const input = {
                customerId: '123',
                query: 'URGENT: System is down!',
                priority: 'URGENT'
            };

            const result = await processor.process(input);

            expect(result.escalation).toEqual({
                required: true,
                reason: 'Urgent query requires human attention',
                priority: 'HIGH',
                assignedTo: expect.any(String)
            });
        });

        it('should validate required input fields', async () => {
            const input = {
                customerId: '123',
                // Missing query field
                priority: 'MEDIUM'
            };

            await expect(processor.process(input)).rejects.toThrow('Customer query is required');
        });

        it('should calculate satisfaction prediction correctly', async () => {
            mockedAiService.analyzeSentiment.mockResolvedValue({
                score: 0.8,
                magnitude: 0.9,
                aspects: []
            });

            mockedAiService.generateResponse.mockResolvedValue({
                response: 'Great! I can help with that.',
                confidence: 0.9,
                suggestedActions: [],
                references: []
            });

            const input = {
                customerId: '123',
                query: 'Thank you for your help!',
                priority: 'MEDIUM'
            };

            const result = await processor.process(input);

            // With sentiment 0.8 (normalized to 0.9) and confidence 0.9
            // Satisfaction = (0.9 * 0.6) + (0.9 * 0.4) = 0.9
            expect(result.metrics.satisfactionPrediction).toBeCloseTo(0.9, 1);
        });
    });
}); 