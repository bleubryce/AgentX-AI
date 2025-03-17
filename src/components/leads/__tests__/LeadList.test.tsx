import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadList } from '../LeadList';
import { useLeads } from '../../../hooks/useLeads';
import { Lead, LeadStatus, LeadSource } from '../../../types/lead';

// Mock the useLeads hook
jest.mock('../../../hooks/useLeads');

const mockLeads: Lead[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    status: LeadStatus.NEW,
    source: LeadSource.WEBSITE,
    notes: 'Test notes',
    createdAt: new Date('2024-03-15T10:00:00Z'),
    updatedAt: new Date('2024-03-15T10:00:00Z'),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    status: LeadStatus.CONVERTED,
    source: LeadSource.REFERRAL,
    createdAt: new Date('2024-03-16T14:30:00Z'),
    updatedAt: new Date('2024-03-16T15:45:00Z'),
  },
];

const mockUseLeads = useLeads as jest.Mock;

describe('LeadList', () => {
  const onEdit = jest.fn();

  beforeEach(() => {
    mockUseLeads.mockReturnValue({
      leads: mockLeads,
      isLoading: false,
      error: null,
      deleteLead: jest.fn(),
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseLeads.mockReturnValue({
      leads: [],
      isLoading: true,
      error: null,
      deleteLead: jest.fn(),
      refetch: jest.fn(),
    });

    render(<LeadList onEdit={onEdit} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to fetch leads';
    mockUseLeads.mockReturnValue({
      leads: [],
      isLoading: false,
      error: { message: errorMessage },
      deleteLead: jest.fn(),
      refetch: jest.fn(),
    });

    render(<LeadList onEdit={onEdit} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders leads list', () => {
    render(<LeadList onEdit={onEdit} />);

    // Check if leads are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
  });

  it('expands lead details on click', async () => {
    render(<LeadList onEdit={onEdit} />);

    // Click expand button for first lead
    const expandButtons = screen.getAllByLabelText('expand row');
    fireEvent.click(expandButtons[0]);

    // Check if details are shown
    await waitFor(() => {
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
      expect(screen.getByText('Test notes')).toBeInTheDocument();
    });
  });

  it('filters leads by search term', () => {
    render(<LeadList onEdit={onEdit} />);

    // Type in search field
    const searchInput = screen.getByLabelText('Search');
    userEvent.type(searchInput, 'jane');

    // Check if only matching lead is shown
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('filters leads by status', () => {
    render(<LeadList onEdit={onEdit} />);

    // Select converted status
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    const convertedOption = screen.getByText('CONVERTED');
    fireEvent.click(convertedOption);

    // Check if only converted lead is shown
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('filters leads by source', () => {
    render(<LeadList onEdit={onEdit} />);

    // Select referral source
    const sourceSelect = screen.getByLabelText('Source');
    fireEvent.mouseDown(sourceSelect);
    const referralOption = screen.getByText('REFERRAL');
    fireEvent.click(referralOption);

    // Check if only referral lead is shown
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<LeadList onEdit={onEdit} />);

    // Click edit button for first lead
    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(mockLeads[0]);
  });

  it('calls deleteLead when delete is confirmed', async () => {
    const mockDeleteLead = jest.fn();
    mockUseLeads.mockReturnValue({
      leads: mockLeads,
      isLoading: false,
      error: null,
      deleteLead: mockDeleteLead,
      refetch: jest.fn(),
    });

    // Mock window.confirm
    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => true);

    render(<LeadList onEdit={onEdit} />);

    // Click delete button for first lead
    const deleteButtons = screen.getAllByTestId('delete-button');
    fireEvent.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockDeleteLead).toHaveBeenCalledWith('1');

    mockConfirm.mockRestore();
  });

  it('handles pagination', () => {
    const manyLeads = Array.from({ length: 15 }, (_, i) => ({
      ...mockLeads[0],
      id: `${i + 1}`,
      email: `lead${i + 1}@example.com`,
    }));

    mockUseLeads.mockReturnValue({
      leads: manyLeads,
      isLoading: false,
      error: null,
      deleteLead: jest.fn(),
      refetch: jest.fn(),
    });

    render(<LeadList onEdit={onEdit} />);

    // Check initial page
    expect(screen.getByText('lead1@example.com')).toBeInTheDocument();
    expect(screen.queryByText('lead11@example.com')).not.toBeInTheDocument();

    // Go to next page
    const nextPageButton = screen.getByLabelText('Go to next page');
    fireEvent.click(nextPageButton);

    // Check next page
    expect(screen.queryByText('lead1@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('lead11@example.com')).toBeInTheDocument();
  });
}); 