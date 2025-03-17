import React from 'react';
import { render, screen, fireEvent, within } from '../utils/test-utils';
import { LeadList } from '../../components/LeadList';
import { Lead, LeadStatus, LeadSource } from '../../types/lead';

const mockLeads: Lead[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    company: 'Test Company',
    source: LeadSource.WEBSITE,
    status: LeadStatus.NEW,
    notes: 'Test notes',
    createdAt: new Date('2024-03-17T00:00:00.000Z'),
    updatedAt: new Date('2024-03-17T00:00:00.000Z'),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    source: LeadSource.REFERRAL,
    status: LeadStatus.QUALIFIED,
    createdAt: new Date('2024-03-16T00:00:00.000Z'),
    updatedAt: new Date('2024-03-16T00:00:00.000Z'),
  },
];

describe('LeadList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders leads correctly', () => {
    render(
      <LeadList
        leads={mockLeads}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Check if both leads are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    
    // Check if status badges are rendered
    expect(screen.getByText(LeadStatus.NEW)).toBeInTheDocument();
    expect(screen.getByText(LeadStatus.QUALIFIED)).toBeInTheDocument();
    
    // Check if source badges are rendered
    expect(screen.getByText(LeadSource.WEBSITE)).toBeInTheDocument();
    expect(screen.getByText(LeadSource.REFERRAL)).toBeInTheDocument();
  });

  it('handles edit action', () => {
    render(
      <LeadList
        leads={mockLeads}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Find and click edit button for first lead
    const firstLeadRow = screen.getByText('John Doe').closest('tr');
    const editButton = within(firstLeadRow!).getByLabelText('edit');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockLeads[0]);
  });

  it('handles delete action with confirmation', () => {
    render(
      <LeadList
        leads={mockLeads}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Find and click delete button for first lead
    const firstLeadRow = screen.getByText('John Doe').closest('tr');
    const deleteButton = within(firstLeadRow!).getByLabelText('delete');
    fireEvent.click(deleteButton);

    // Confirm deletion in dialog
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockLeads[0]);
  });

  it('handles status change', () => {
    render(
      <LeadList
        leads={mockLeads}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Find and click status select for first lead
    const firstLeadRow = screen.getByText('John Doe').closest('tr');
    const statusSelect = within(firstLeadRow!).getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);

    // Select new status
    const option = screen.getByText(LeadStatus.CONTACTED);
    fireEvent.click(option);

    expect(mockOnStatusChange).toHaveBeenCalledWith(mockLeads[0], LeadStatus.CONTACTED);
  });

  it('displays empty state when no leads', () => {
    render(
      <LeadList
        leads={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText(/no leads found/i)).toBeInTheDocument();
  });

  it('displays lead details in expandable row', () => {
    render(
      <LeadList
        leads={mockLeads}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Find and click expand button for first lead
    const firstLeadRow = screen.getByText('John Doe').closest('tr');
    const expandButton = within(firstLeadRow!).getByLabelText('expand row');
    fireEvent.click(expandButton);

    // Check if additional details are displayed
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Test notes')).toBeInTheDocument();
  });
}); 