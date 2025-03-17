import { render, screen, fireEvent } from '@testing-library/react';
import { useLeads } from '../../hooks/useLeads';
import ReportsPage from '../ReportsPage';

// Mock the useLeads hook
jest.mock('../../hooks/useLeads');

const mockLeads = [
    {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: 'new',
        source: 'website',
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-03-01T10:00:00Z'
    },
    {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        status: 'converted',
        source: 'referral',
        createdAt: '2024-03-02T14:30:00Z',
        updatedAt: '2024-03-02T15:45:00Z'
    }
];

describe('ReportsPage', () => {
    beforeEach(() => {
        (useLeads as jest.Mock).mockReturnValue({
            leads: mockLeads,
            loading: false,
            error: null
        });
    });

    it('renders loading state', () => {
        (useLeads as jest.Mock).mockReturnValue({
            leads: [],
            loading: true,
            error: null
        });

        render(<ReportsPage />);
        expect(screen.getByText('Loading reports...')).toBeInTheDocument();
    });

    it('renders error state', () => {
        const errorMessage = 'Failed to fetch leads';
        (useLeads as jest.Mock).mockReturnValue({
            leads: [],
            loading: false,
            error: new Error(errorMessage)
        });

        render(<ReportsPage />);
        expect(screen.getByText(`Error loading reports: ${errorMessage}`)).toBeInTheDocument();
    });

    it('renders all report tabs', () => {
        render(<ReportsPage />);

        expect(screen.getByText('Lead Conversion')).toBeInTheDocument();
        expect(screen.getByText('Lead Sources')).toBeInTheDocument();
        expect(screen.getByText('Lead Trends')).toBeInTheDocument();
    });

    it('switches between tabs', () => {
        render(<ReportsPage />);

        // Click on Lead Sources tab
        fireEvent.click(screen.getByText('Lead Sources'));
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'reports-tabpanel-1');

        // Click on Lead Trends tab
        fireEvent.click(screen.getByText('Lead Trends'));
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'reports-tabpanel-2');

        // Click back to Lead Conversion tab
        fireEvent.click(screen.getByText('Lead Conversion'));
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'reports-tabpanel-0');
    });
}); 