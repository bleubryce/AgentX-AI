import React from 'react';
import { render, screen } from '../utils/test-utils';
import { LeadConversionReport } from '../../components/reports/LeadConversionReport';
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
];

describe('LeadConversionReport', () => {
  it('renders conversion metrics correctly', () => {
    render(<LeadConversionReport leads={mockLeads} />);

    // Check if total leads count is displayed
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/total leads/i)).toBeInTheDocument();

    // Check if converted leads count is displayed
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/converted leads/i)).toBeInTheDocument();

    // Check if conversion rate is displayed
    expect(screen.getByText('33.33%')).toBeInTheDocument();
    expect(screen.getByText(/conversion rate/i)).toBeInTheDocument();
  });

  it('renders conversion trend chart', () => {
    render(<LeadConversionReport leads={mockLeads} />);

    // Check if chart title is displayed
    expect(screen.getByText(/conversion trend/i)).toBeInTheDocument();

    // Check if chart legend items are displayed
    expect(screen.getByText(/total leads/i)).toBeInTheDocument();
    expect(screen.getByText(/converted leads/i)).toBeInTheDocument();
  });

  it('renders status distribution chart', () => {
    render(<LeadConversionReport leads={mockLeads} />);

    // Check if chart title is displayed
    expect(screen.getByText(/status distribution/i)).toBeInTheDocument();

    // Check if status labels are displayed
    expect(screen.getByText(LeadStatus.CONVERTED)).toBeInTheDocument();
    expect(screen.getByText(LeadStatus.QUALIFIED)).toBeInTheDocument();
    expect(screen.getByText(LeadStatus.LOST)).toBeInTheDocument();
  });

  it('handles empty leads array', () => {
    render(<LeadConversionReport leads={[]} />);

    // Check if empty state message is displayed
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('displays average conversion time', () => {
    render(<LeadConversionReport leads={mockLeads} />);

    // Check if average conversion time is displayed
    expect(screen.getByText(/average conversion time/i)).toBeInTheDocument();
    expect(screen.getByText(/14 days/i)).toBeInTheDocument();
  });

  it('displays conversion by source', () => {
    render(<LeadConversionReport leads={mockLeads} />);

    // Check if conversion by source section is displayed
    expect(screen.getByText(/conversion by source/i)).toBeInTheDocument();
    expect(screen.getByText(LeadSource.WEBSITE)).toBeInTheDocument();
    expect(screen.getByText(LeadSource.REFERRAL)).toBeInTheDocument();
  });
}); 