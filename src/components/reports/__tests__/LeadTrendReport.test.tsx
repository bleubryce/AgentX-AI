import { render, screen } from '@testing-library/react';
import { LeadTrendReport } from '..';
import { Lead } from '../../../types/lead';

const mockLeads: Lead[] = [
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
        createdAt: '2024-03-01T14:30:00Z',
        updatedAt: '2024-03-01T15:45:00Z'
    },
    {
        id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        status: 'converted',
        source: 'website',
        createdAt: '2024-02-15T09:15:00Z',
        updatedAt: '2024-02-15T11:20:00Z'
    }
];

describe('LeadTrendReport', () => {
    it('renders the report with correct trend data', () => {
        render(<LeadTrendReport leads={mockLeads} />);

        // Check month labels
        expect(screen.getByText('February 2024')).toBeInTheDocument();
        expect(screen.getByText('March 2024')).toBeInTheDocument();

        // Check lead counts
        expect(screen.getByText('1')).toBeInTheDocument(); // February lead count
        expect(screen.getByText('2')).toBeInTheDocument(); // March lead count
    });

    it('renders the report with empty leads', () => {
        render(<LeadTrendReport leads={[]} />);

        expect(screen.getByText('No trend data available')).toBeInTheDocument();
    });

    it('renders all required sections', () => {
        render(<LeadTrendReport leads={mockLeads} />);

        expect(screen.getByText('Lead Growth Trend')).toBeInTheDocument();
        expect(screen.getByText('Lead Status Distribution')).toBeInTheDocument();
        expect(screen.getByText('Monthly Metrics')).toBeInTheDocument();
    });

    it('displays correct status distribution', () => {
        render(<LeadTrendReport leads={mockLeads} />);

        // Check status counts
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Converted')).toBeInTheDocument();
        
        // One new lead
        expect(screen.getByText('33.3%')).toBeInTheDocument(); // 1/3 * 100
        // Two converted leads
        expect(screen.getByText('66.7%')).toBeInTheDocument(); // 2/3 * 100
    });
}); 