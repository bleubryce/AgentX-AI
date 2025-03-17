import React from 'react';
import { render, screen } from '../utils/test-utils';
import { LeadSourceReport } from '../../components/reports/LeadSourceReport';
import { Lead, LeadStatus, LeadSource } from '../../types/lead';

const mockLeads: Lead[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    source: LeadSource.WEBSITE,
    status: LeadStatus.CONVERTED,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-15'),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    source: LeadSource.REFERRAL,
    status: LeadStatus.QUALIFIED,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob@example.com',
    source: LeadSource.WEBSITE,
    status: LeadStatus.LOST,
    createdAt: new Date('2024-03-07'),
    updatedAt: new Date('2024-03-12'),
  },
  {
    id: '4',
    firstName: 'Alice',
    lastName: 'Brown',
    email: 'alice@example.com',
    source: LeadSource.SOCIAL_MEDIA,
    status: LeadStatus.CONVERTED,
    createdAt: new Date('2024-03-08'),
    updatedAt: new Date('2024-03-14'),
  },
];

describe('LeadSourceReport', () => {
  it('renders source distribution chart', () => {
    render(<LeadSourceReport leads={mockLeads} />);

    // Check if chart title is displayed
    expect(screen.getByText(/lead sources/i)).toBeInTheDocument();

    // Check if source labels are displayed
    expect(screen.getByText(LeadSource.WEBSITE)).toBeInTheDocument();
    expect(screen.getByText(LeadSource.REFERRAL)).toBeInTheDocument();
    expect(screen.getByText(LeadSource.SOCIAL_MEDIA)).toBeInTheDocument();
  });

  it('displays source metrics correctly', () => {
    render(<LeadSourceReport leads={mockLeads} />);

    // Check if total leads by source are displayed
    expect(screen.getByText('2')).toBeInTheDocument(); // Website leads
    expect(screen.getByText('1')).toBeInTheDocument(); // Referral leads
    expect(screen.getByText('1')).toBeInTheDocument(); // Social media leads

    // Check if percentages are displayed
    expect(screen.getByText('50%')).toBeInTheDocument(); // Website percentage
    expect(screen.getByText('25%')).toBeInTheDocument(); // Referral percentage
    expect(screen.getByText('25%')).toBeInTheDocument(); // Social media percentage
  });

  it('displays conversion rates by source', () => {
    render(<LeadSourceReport leads={mockLeads} />);

    // Check if conversion rates section is displayed
    expect(screen.getByText(/conversion rates by source/i)).toBeInTheDocument();

    // Website: 0/2 converted = 0%
    expect(screen.getByText('0%')).toBeInTheDocument();

    // Referral: 0/1 converted = 0%
    expect(screen.getByText('0%')).toBeInTheDocument();

    // Social Media: 1/1 converted = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles empty leads array', () => {
    render(<LeadSourceReport leads={[]} />);

    // Check if empty state message is displayed
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('displays source performance over time', () => {
    render(<LeadSourceReport leads={mockLeads} />);

    // Check if performance chart is displayed
    expect(screen.getByText(/source performance over time/i)).toBeInTheDocument();

    // Check if months are displayed
    expect(screen.getByText(/mar 2024/i)).toBeInTheDocument();
  });

  it('displays quality metrics by source', () => {
    render(<LeadSourceReport leads={mockLeads} />);

    // Check if quality metrics section is displayed
    expect(screen.getByText(/quality metrics by source/i)).toBeInTheDocument();

    // Check if conversion time is displayed
    expect(screen.getByText(/avg. time to conversion/i)).toBeInTheDocument();
  });
}); 