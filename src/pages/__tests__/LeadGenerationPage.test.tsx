import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadGenerationPage from '../LeadGenerationPage';
import { useLeads } from '../../hooks/useLeads';

// Mock the custom hook
jest.mock('../../hooks/useLeads');

const mockLeads = [
    {
        id: 'lead1',
        companyName: 'Test Company 1',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '123-456-7890',
        source: 'Website',
        status: 'NEW',
        score: 85,
        createdAt: new Date().toISOString()
    },
    {
        id: 'lead2',
        companyName: 'Test Company 2',
        contactName: 'Jane Smith',
        contactEmail: 'jane@test.com',
        contactPhone: '098-765-4321',
        source: 'Referral',
        status: 'QUALIFIED',
        score: 92,
        createdAt: new Date().toISOString()
    }
];

describe('LeadGenerationPage', () => {
    const mockRefreshLeads = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useLeads as jest.Mock).mockReturnValue({
            leads: mockLeads,
            loading: false,
            error: null,
            refreshLeads: mockRefreshLeads
        });
    });

    it('renders the page with tabs', () => {
        render(<LeadGenerationPage />);

        expect(screen.getByText('Active Leads')).toBeInTheDocument();
        expect(screen.getByText('Lead Sources')).toBeInTheDocument();
        expect(screen.getByText('Campaigns')).toBeInTheDocument();
        expect(screen.getByText('New Lead')).toBeInTheDocument();
    });

    it('shows loading state', () => {
        (useLeads as jest.Mock).mockReturnValue({
            leads: [],
            loading: true,
            error: null,
            refreshLeads: mockRefreshLeads
        });

        render(<LeadGenerationPage />);
        expect(screen.getByText('Loading leads...')).toBeInTheDocument();
    });

    it('shows error state', () => {
        const errorMessage = 'Failed to load leads';
        (useLeads as jest.Mock).mockReturnValue({
            leads: [],
            loading: false,
            error: new Error(errorMessage),
            refreshLeads: mockRefreshLeads
        });

        render(<LeadGenerationPage />);
        expect(screen.getByText('Error loading leads')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('handles tab switching', () => {
        render(<LeadGenerationPage />);

        const sourcesTab = screen.getByText('Lead Sources');
        fireEvent.click(sourcesTab);
        expect(screen.getByText('Lead sources will be displayed here')).toBeInTheDocument();

        const campaignsTab = screen.getByText('Campaigns');
        fireEvent.click(campaignsTab);
        expect(screen.getByText('Marketing campaigns will be displayed here')).toBeInTheDocument();
    });

    it('opens create lead form', () => {
        render(<LeadGenerationPage />);

        fireEvent.click(screen.getByText('New Lead'));
        expect(screen.getByText('Create New Lead')).toBeInTheDocument();
    });

    it('closes create lead form', () => {
        render(<LeadGenerationPage />);

        // Open form
        fireEvent.click(screen.getByText('New Lead'));
        expect(screen.getByText('Create New Lead')).toBeInTheDocument();

        // Close form
        const closeButton = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeButton);

        expect(screen.queryByText('Create New Lead')).not.toBeInTheDocument();
    });

    it('handles retry on error', () => {
        const errorMessage = 'Failed to load leads';
        (useLeads as jest.Mock).mockReturnValue({
            leads: [],
            loading: false,
            error: new Error(errorMessage),
            refreshLeads: mockRefreshLeads
        });

        render(<LeadGenerationPage />);
        
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);

        expect(mockRefreshLeads).toHaveBeenCalled();
    });
}); 