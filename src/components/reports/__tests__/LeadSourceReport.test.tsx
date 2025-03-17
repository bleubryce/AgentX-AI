import { render, screen } from '@testing-library/react';
import { LeadSourceReport } from '..';
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
        createdAt: '2024-03-02T14:30:00Z',
        updatedAt: '2024-03-02T15:45:00Z'
    },
    {
        id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        status: 'converted',
        source: 'website',
        createdAt: '2024-03-03T09:15:00Z',
        updatedAt: '2024-03-03T11:20:00Z'
    }
];

describe('LeadSourceReport', () => {
    it('renders the report with correct source metrics', () => {
        render(<LeadSourceReport leads={mockLeads} />);

        // Check source counts
        expect(screen.getByText('Website')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 website leads
        expect(screen.getByText('Referral')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 referral lead
    });

    it('renders the report with empty leads', () => {
        render(<LeadSourceReport leads={[]} />);

        expect(screen.getByText('No leads available')).toBeInTheDocument();
    });

    it('renders all required sections', () => {
        render(<LeadSourceReport leads={mockLeads} />);

        expect(screen.getByText('Lead Sources Distribution')).toBeInTheDocument();
        expect(screen.getByText('Source Performance')).toBeInTheDocument();
        expect(screen.getByText('Source Metrics')).toBeInTheDocument();
    });

    it('calculates correct conversion rates by source', () => {
        render(<LeadSourceReport leads={mockLeads} />);

        // Website: 1 converted out of 2 = 50%
        expect(screen.getByText('50.0%')).toBeInTheDocument();
        // Referral: 1 converted out of 1 = 100%
        expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
}); 