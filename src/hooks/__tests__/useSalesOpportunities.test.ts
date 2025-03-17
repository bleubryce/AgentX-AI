import { renderHook, act } from '@testing-library/react-hooks';
import { salesAPI } from '../../services/api/sales.api';
import { useSalesOpportunities } from '../useSalesOpportunities';

// Mock the salesAPI
jest.mock('../../services/api/sales.api');
const mockedSalesAPI = salesAPI as jest.Mocked<typeof salesAPI>;

describe('useSalesOpportunities', () => {
    const mockOpportunities = [
        {
            id: '1',
            companyName: 'Test Company 1',
            contactName: 'John Doe',
            productInterest: ['AI Platform'],
            stage: 'QUALIFICATION',
            priority: 'HIGH'
        },
        {
            id: '2',
            companyName: 'Test Company 2',
            contactName: 'Jane Smith',
            productInterest: ['Data Analytics'],
            stage: 'PROSPECTING',
            priority: 'MEDIUM'
        }
    ];

    const mockAnalysis = {
        opportunity: mockOpportunities[0],
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

    beforeEach(() => {
        jest.clearAllMocks();
        mockedSalesAPI.getOpportunities.mockResolvedValue(mockOpportunities);
        mockedSalesAPI.getOpportunityAnalysis.mockResolvedValue(mockAnalysis);
        mockedSalesAPI.createOpportunity.mockImplementation(data => 
            Promise.resolve({ ...data, id: '3' })
        );
        mockedSalesAPI.updateOpportunity.mockImplementation((id, data) => 
            Promise.resolve({ ...mockOpportunities.find(o => o.id === id), ...data })
        );
        mockedSalesAPI.deleteOpportunity.mockResolvedValue();
    });

    it('fetches opportunities on initial load', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        expect(result.current.loading).toBe(true);
        expect(result.current.opportunities).toEqual([]);
        
        await waitForNextUpdate();
        
        expect(result.current.loading).toBe(false);
        expect(result.current.opportunities).toEqual(mockOpportunities);
        expect(mockedSalesAPI.getOpportunities).toHaveBeenCalledTimes(1);
    });

    it('handles fetch opportunities error', async () => {
        const error = new Error('Network error');
        mockedSalesAPI.getOpportunities.mockRejectedValueOnce(error);
        
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate();
        
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toEqual(error);
        expect(result.current.opportunities).toEqual([]);
    });

    it('selects an opportunity and fetches its analysis', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        act(() => {
            result.current.selectOpportunity('1');
        });
        
        expect(result.current.analysisLoading).toBe(true);
        
        await waitForNextUpdate();
        
        expect(result.current.selectedOpportunity).toEqual(mockOpportunities[0]);
        expect(result.current.opportunityAnalysis).toEqual(mockAnalysis);
        expect(result.current.analysisLoading).toBe(false);
        expect(mockedSalesAPI.getOpportunityAnalysis).toHaveBeenCalledWith('1');
    });

    it('handles analysis fetch error', async () => {
        const error = new Error('Analysis error');
        mockedSalesAPI.getOpportunityAnalysis.mockRejectedValueOnce(error);
        
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        act(() => {
            result.current.selectOpportunity('1');
        });
        
        await waitForNextUpdate();
        
        expect(result.current.selectedOpportunity).toEqual(mockOpportunities[0]);
        expect(result.current.analysisError).toEqual(error);
        expect(result.current.opportunityAnalysis).toBeNull();
    });

    it('creates a new opportunity', async () => {
        const newOpportunity = {
            companyName: 'New Company',
            contactName: 'New Contact',
            productInterest: ['New Product'],
            stage: 'PROSPECTING',
            priority: 'MEDIUM'
        };
        
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        await act(async () => {
            await result.current.createOpportunity(newOpportunity);
        });
        
        expect(mockedSalesAPI.createOpportunity).toHaveBeenCalledWith(newOpportunity);
        expect(result.current.opportunities).toHaveLength(3);
        expect(result.current.opportunities[2]).toEqual({ ...newOpportunity, id: '3' });
    });

    it('updates an opportunity', async () => {
        const updates = {
            stage: 'NEGOTIATION',
            priority: 'HIGH'
        };
        
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        await act(async () => {
            await result.current.updateOpportunity('2', updates);
        });
        
        expect(mockedSalesAPI.updateOpportunity).toHaveBeenCalledWith('2', updates);
        expect(result.current.opportunities[1].stage).toBe('NEGOTIATION');
        expect(result.current.opportunities[1].priority).toBe('HIGH');
    });

    it('updates selected opportunity when it is the one being updated', async () => {
        const updates = {
            stage: 'NEGOTIATION'
        };
        
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        act(() => {
            result.current.selectOpportunity('1');
        });
        
        await waitForNextUpdate(); // Wait for analysis fetch
        
        await act(async () => {
            await result.current.updateOpportunity('1', updates);
        });
        
        expect(result.current.selectedOpportunity?.stage).toBe('NEGOTIATION');
    });

    it('deletes an opportunity', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        await act(async () => {
            await result.current.deleteOpportunity('1');
        });
        
        expect(mockedSalesAPI.deleteOpportunity).toHaveBeenCalledWith('1');
        expect(result.current.opportunities).toHaveLength(1);
        expect(result.current.opportunities[0].id).toBe('2');
    });

    it('clears selected opportunity when it is the one being deleted', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSalesOpportunities());
        
        await waitForNextUpdate(); // Wait for initial fetch
        
        act(() => {
            result.current.selectOpportunity('1');
        });
        
        await waitForNextUpdate(); // Wait for analysis fetch
        
        await act(async () => {
            await result.current.deleteOpportunity('1');
        });
        
        expect(result.current.selectedOpportunity).toBeNull();
        expect(result.current.opportunityAnalysis).toBeNull();
    });
}); 