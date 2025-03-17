import axios from 'axios';
import { salesAPI } from '../sales.api';
import { SalesOpportunity } from '../../agent/processors/sales.processor';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SalesAPI', () => {
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
        jest.clearAllMocks();
    });

    describe('getOpportunities', () => {
        it('fetches opportunities successfully', async () => {
            const mockResponse = { data: [mockOpportunity] };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await salesAPI.getOpportunities();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/opportunities')
            );
            expect(result).toEqual([mockOpportunity]);
        });

        it('handles API errors', async () => {
            const error = new Error('Network error');
            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(salesAPI.getOpportunities()).rejects.toThrow('Network error');
            expect(mockedAxios.get).toHaveBeenCalled();
        });
    });

    describe('getOpportunityAnalysis', () => {
        const mockAnalysis = {
            opportunity: mockOpportunity,
            metrics: {
                opportunityScore: 85,
                conversionProbability: 75,
                expectedValue: 75000,
                timeToClose: 30
            },
            analysis: {
                competitive: {
                    competitorComparison: [
                        {
                            competitor: 'Competitor A',
                            advantages: ['Better pricing'],
                            disadvantages: ['Less features']
                        }
                    ]
                },
                strategy: {
                    recommendedApproach: 'Focus on unique features',
                    keyTalkingPoints: ['AI capabilities', 'Integration options'],
                    riskFactors: ['Budget constraints']
                }
            },
            nextSteps: [
                {
                    action: 'Schedule follow-up meeting',
                    priority: 'HIGH',
                    deadline: '2024-02-01'
                }
            ]
        };

        it('fetches opportunity analysis successfully', async () => {
            const mockResponse = { data: mockAnalysis };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await salesAPI.getOpportunityAnalysis('1');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('/opportunities/1/analysis')
            );
            expect(result).toEqual(mockAnalysis);
        });

        it('handles API errors', async () => {
            const error = new Error('Not found');
            mockedAxios.get.mockRejectedValueOnce(error);

            await expect(salesAPI.getOpportunityAnalysis('1')).rejects.toThrow('Not found');
            expect(mockedAxios.get).toHaveBeenCalled();
        });
    });

    describe('createOpportunity', () => {
        const newOpportunity = {
            companyName: 'New Company',
            contactName: 'Jane Smith',
            productInterest: ['Data Analytics'],
            stage: 'PROSPECTING',
            priority: 'MEDIUM'
        } as SalesOpportunity;

        it('creates opportunity successfully', async () => {
            const mockResponse = { data: { ...newOpportunity, id: '2' } };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await salesAPI.createOpportunity(newOpportunity);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/opportunities'),
                newOpportunity
            );
            expect(result).toEqual({ ...newOpportunity, id: '2' });
        });

        it('handles validation errors', async () => {
            const error = {
                response: {
                    data: {
                        message: 'Validation failed',
                        errors: ['Company name is required']
                    }
                }
            };
            mockedAxios.post.mockRejectedValueOnce(error);

            await expect(salesAPI.createOpportunity(newOpportunity)).rejects.toThrow();
            expect(mockedAxios.post).toHaveBeenCalled();
        });
    });

    describe('updateOpportunity', () => {
        const updates = {
            stage: 'NEGOTIATION',
            priority: 'HIGH'
        };

        it('updates opportunity successfully', async () => {
            const mockResponse = { data: { ...mockOpportunity, ...updates } };
            mockedAxios.put.mockResolvedValueOnce(mockResponse);

            const result = await salesAPI.updateOpportunity('1', updates);

            expect(mockedAxios.put).toHaveBeenCalledWith(
                expect.stringContaining('/opportunities/1'),
                updates
            );
            expect(result).toEqual({ ...mockOpportunity, ...updates });
        });

        it('handles not found errors', async () => {
            const error = {
                response: {
                    status: 404,
                    data: { message: 'Opportunity not found' }
                }
            };
            mockedAxios.put.mockRejectedValueOnce(error);

            await expect(salesAPI.updateOpportunity('999', updates)).rejects.toThrow();
            expect(mockedAxios.put).toHaveBeenCalled();
        });
    });

    describe('deleteOpportunity', () => {
        it('deletes opportunity successfully', async () => {
            mockedAxios.delete.mockResolvedValueOnce({});

            await salesAPI.deleteOpportunity('1');

            expect(mockedAxios.delete).toHaveBeenCalledWith(
                expect.stringContaining('/opportunities/1')
            );
        });

        it('handles not found errors', async () => {
            const error = {
                response: {
                    status: 404,
                    data: { message: 'Opportunity not found' }
                }
            };
            mockedAxios.delete.mockRejectedValueOnce(error);

            await expect(salesAPI.deleteOpportunity('999')).rejects.toThrow();
            expect(mockedAxios.delete).toHaveBeenCalled();
        });
    });
}); 