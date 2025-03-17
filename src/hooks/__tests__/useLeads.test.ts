import { renderHook, act } from '@testing-library/react-hooks';
import { useLeads } from '../useLeads';
import { leadAPI } from '../../services/api/lead.api';
import { Lead, LeadSource, LeadStatus } from '../../services/agent/processors/lead.processor';

// Mock the API
jest.mock('../../services/api/lead.api');

const mockLeads: Lead[] = [
    {
        id: '1',
        companyName: 'Test Company 1',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '123-456-7890',
        source: LeadSource.WEBSITE,
        status: LeadStatus.NEW,
        score: 85,
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        companyName: 'Test Company 2',
        contactName: 'Jane Smith',
        contactEmail: 'jane@test.com',
        contactPhone: '098-765-4321',
        source: LeadSource.REFERRAL,
        status: LeadStatus.QUALIFIED,
        score: 92,
        createdAt: new Date().toISOString()
    }
];

describe('useLeads', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (leadAPI.getLeads as jest.Mock).mockResolvedValue(mockLeads);
    });

    it('initializes with loading state and fetches leads', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useLeads());

        expect(result.current.loading).toBe(true);
        expect(result.current.leads).toEqual([]);
        expect(result.current.error).toBeNull();

        await waitForNextUpdate();

        expect(result.current.loading).toBe(false);
        expect(result.current.leads).toEqual(mockLeads);
        expect(result.current.error).toBeNull();
    });

    it('handles API error during initial fetch', async () => {
        const error = new Error('Failed to fetch leads');
        (leadAPI.getLeads as jest.Mock).mockRejectedValue(error);

        const { result, waitForNextUpdate } = renderHook(() => useLeads());

        await waitForNextUpdate();

        expect(result.current.loading).toBe(false);
        expect(result.current.leads).toEqual([]);
        expect(result.current.error).toEqual(error);
    });

    it('creates a new lead', async () => {
        const newLead: Lead = {
            id: '3',
            companyName: 'New Company',
            contactName: 'New Contact',
            contactEmail: 'new@test.com',
            source: LeadSource.WEBSITE,
            status: LeadStatus.NEW,
            createdAt: new Date().toISOString()
        };

        (leadAPI.createLead as jest.Mock).mockResolvedValue(newLead);

        const { result, waitForNextUpdate } = renderHook(() => useLeads());
        await waitForNextUpdate();

        await act(async () => {
            await result.current.createLead({
                companyName: 'New Company',
                contactName: 'New Contact',
                contactEmail: 'new@test.com',
                source: LeadSource.WEBSITE,
                status: LeadStatus.NEW
            });
        });

        expect(result.current.leads).toContainEqual(newLead);
    });

    it('updates an existing lead', async () => {
        const updatedLead = {
            ...mockLeads[0],
            companyName: 'Updated Company'
        };

        (leadAPI.updateLead as jest.Mock).mockResolvedValue(updatedLead);

        const { result, waitForNextUpdate } = renderHook(() => useLeads());
        await waitForNextUpdate();

        await act(async () => {
            await result.current.updateLead('1', { companyName: 'Updated Company' });
        });

        expect(result.current.leads.find(l => l.id === '1')).toEqual(updatedLead);
    });

    it('deletes a lead', async () => {
        (leadAPI.deleteLead as jest.Mock).mockResolvedValue(undefined);

        const { result, waitForNextUpdate } = renderHook(() => useLeads());
        await waitForNextUpdate();

        await act(async () => {
            await result.current.deleteLead('1');
        });

        expect(result.current.leads.find(l => l.id === '1')).toBeUndefined();
        expect(result.current.leads.length).toBe(mockLeads.length - 1);
    });

    it('gets a single lead', async () => {
        const lead = mockLeads[0];
        (leadAPI.getLead as jest.Mock).mockResolvedValue(lead);

        const { result, waitForNextUpdate } = renderHook(() => useLeads());
        await waitForNextUpdate();

        const fetchedLead = await result.current.getLead('1');
        expect(fetchedLead).toEqual(lead);
    });

    it('refreshes leads', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useLeads());
        await waitForNextUpdate();

        (leadAPI.getLeads as jest.Mock).mockResolvedValue([...mockLeads, {
            id: '3',
            companyName: 'New Company',
            contactName: 'New Contact',
            contactEmail: 'new@test.com',
            source: LeadSource.WEBSITE,
            status: LeadStatus.NEW,
            createdAt: new Date().toISOString()
        }]);

        await act(async () => {
            await result.current.refreshLeads();
        });

        expect(result.current.leads.length).toBe(3);
    });

    it('handles errors during lead operations', async () => {
        const error = new Error('API Error');
        (leadAPI.createLead as jest.Mock).mockRejectedValue(error);
        (leadAPI.updateLead as jest.Mock).mockRejectedValue(error);
        (leadAPI.deleteLead as jest.Mock).mockRejectedValue(error);
        (leadAPI.getLead as jest.Mock).mockRejectedValue(error);

        const { result, waitForNextUpdate } = renderHook(() => useLeads());
        await waitForNextUpdate();

        await expect(result.current.createLead({
            companyName: 'New Company',
            contactName: 'New Contact',
            contactEmail: 'new@test.com',
            source: LeadSource.WEBSITE,
            status: LeadStatus.NEW
        })).rejects.toThrow('API Error');

        await expect(result.current.updateLead('1', { companyName: 'Updated' }))
            .rejects.toThrow('API Error');

        await expect(result.current.deleteLead('1'))
            .rejects.toThrow('API Error');

        await expect(result.current.getLead('1'))
            .rejects.toThrow('API Error');
    });
}); 