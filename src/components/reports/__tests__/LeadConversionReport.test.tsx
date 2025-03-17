import { render, screen } from '@testing-library/react';
import { LeadConversionReport } from '..';
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
        source: 'social',
        createdAt: '2024-03-03T09:15:00Z',
        updatedAt: '2024-03-03T11:20:00Z'
    }
];

describe('LeadConversionReport', () => {
    it('renders the report with correct metrics', () => {
        render(<LeadConversionReport leads={mockLeads} />);

        // Check total leads
        expect(screen.getByText('3')).toBeInTheDocument();

        // Check converted leads (2 leads are converted)
        expect(screen.getByText('2')).toBeInTheDocument();

        // Check conversion rate (2/3 * 100 = 66.7%)
        expect(screen.getByText('66.7%')).toBeInTheDocument();
    });

    it('renders the report with empty leads', () => {
        render(<LeadConversionReport leads={[]} />);

        // Check total leads
        expect(screen.getByText('0')).toBeInTheDocument();

        // Check conversion rate (0%)
        expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('renders all required sections', () => {
        render(<LeadConversionReport leads={mockLeads} />);

        expect(screen.getByText('Total Leads')).toBeInTheDocument();
        expect(screen.getByText('Converted Leads')).toBeInTheDocument();
        expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
        expect(screen.getByText('Conversion Trend')).toBeInTheDocument();
    });
}); 