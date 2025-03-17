import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesOpportunityPage from '../SalesOpportunityPage';
import { useSalesOpportunities } from '../../hooks/useSalesOpportunities';
import { salesAPI } from '../../services/api/sales.api';
import { SalesOpportunity } from '../../services/agent/processors/sales.processor';

// Mock the custom hook
jest.mock('../../hooks/useSalesOpportunities');

// Mock the API
jest.mock('../../services/api/sales.api');

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }: any) => children,
    Droppable: ({ children }: any) => children({
        innerRef: () => {},
        placeholder: null,
        droppableProps: {
            'data-rbd-droppable-context-id': '1',
            'data-rbd-droppable-id': '1'
        }
    }, {}),
    Draggable: ({ children }: any) => children({
        innerRef: () => {},
        draggableProps: {
            'data-rbd-draggable-context-id': '1',
            'data-rbd-draggable-id': '1'
        },
        dragHandleProps: null
    }, {})
}));

const mockOpportunities: SalesOpportunity[] = [
    {
        id: 'opp1',
        companyName: 'Test Company 1',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '123-456-7890',
        productInterest: ['AI Platform'],
        stage: 'PROSPECTING',
        priority: 'HIGH',
        budget: 50000
    },
    {
        id: 'opp2',
        companyName: 'Test Company 2',
        contactName: 'Jane Smith',
        contactEmail: 'jane@test.com',
        contactPhone: '098-765-4321',
        productInterest: ['Data Analytics'],
        stage: 'QUALIFICATION',
        priority: 'MEDIUM',
        budget: 75000
    }
];

describe('SalesOpportunityPage', () => {
    const mockRefreshOpportunities = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useSalesOpportunities as jest.Mock).mockReturnValue({
            opportunities: mockOpportunities,
            loading: false,
            error: null,
            refreshOpportunities: mockRefreshOpportunities
        });
    });

    it('renders the page with tabs and opportunities', () => {
        render(<SalesOpportunityPage />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Pipeline')).toBeInTheDocument();
        expect(screen.getByText('New Opportunity')).toBeInTheDocument();

        expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });

    it('shows loading state', () => {
        (useSalesOpportunities as jest.Mock).mockReturnValue({
            opportunities: [],
            loading: true,
            error: null,
            refreshOpportunities: mockRefreshOpportunities
        });

        render(<SalesOpportunityPage />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows error state', () => {
        const errorMessage = 'Failed to load opportunities';
        (useSalesOpportunities as jest.Mock).mockReturnValue({
            opportunities: [],
            loading: false,
            error: errorMessage,
            refreshOpportunities: mockRefreshOpportunities
        });

        render(<SalesOpportunityPage />);
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('handles tab switching', () => {
        render(<SalesOpportunityPage />);

        const pipelineTab = screen.getByText('Pipeline');
        fireEvent.click(pipelineTab);

        expect(pipelineTab).toHaveAttribute('aria-selected', 'true');
    });

    it('opens create opportunity form', async () => {
        render(<SalesOpportunityPage />);

        fireEvent.click(screen.getByText('New Opportunity'));

        expect(screen.getByText('Create New Opportunity')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Test Company 1')).not.toBeInTheDocument();
    });

    it('opens edit opportunity form', async () => {
        render(<SalesOpportunityPage />);

        // Find and click the edit button for the first opportunity
        const editButtons = screen.getAllByLabelText('Edit');
        fireEvent.click(editButtons[0]);

        expect(screen.getByText('Edit Opportunity')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Company 1')).toBeInTheDocument();
    });

    it('handles opportunity creation', async () => {
        (salesAPI.createOpportunity as jest.Mock).mockResolvedValue(mockOpportunities[0]);

        render(<SalesOpportunityPage />);

        // Open create form
        fireEvent.click(screen.getByText('New Opportunity'));

        // Fill out form
        await userEvent.type(screen.getByLabelText(/company name/i), 'New Company');
        await userEvent.type(screen.getByLabelText(/contact name/i), 'New Contact');
        await userEvent.type(screen.getByLabelText(/contact email/i), 'new@company.com');

        // Select a product
        const productSelect = screen.getByLabelText(/products of interest/i);
        fireEvent.mouseDown(productSelect);
        fireEvent.click(screen.getByText('AI Platform'));

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /create opportunity/i }));

        await waitFor(() => {
            expect(salesAPI.createOpportunity).toHaveBeenCalled();
            expect(mockRefreshOpportunities).toHaveBeenCalled();
            expect(screen.getByText('Opportunity created successfully')).toBeInTheDocument();
        });
    });

    it('handles opportunity update', async () => {
        (salesAPI.updateOpportunity as jest.Mock).mockResolvedValue(mockOpportunities[0]);

        render(<SalesOpportunityPage />);

        // Open edit form
        const editButtons = screen.getAllByLabelText('Edit');
        fireEvent.click(editButtons[0]);

        // Modify form
        const companyNameInput = screen.getByDisplayValue('Test Company 1');
        await userEvent.clear(companyNameInput);
        await userEvent.type(companyNameInput, 'Updated Company');

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /update opportunity/i }));

        await waitFor(() => {
            expect(salesAPI.updateOpportunity).toHaveBeenCalled();
            expect(mockRefreshOpportunities).toHaveBeenCalled();
            expect(screen.getByText('Opportunity updated successfully')).toBeInTheDocument();
        });
    });

    it('handles opportunity deletion', async () => {
        (salesAPI.deleteOpportunity as jest.Mock).mockResolvedValue(undefined);

        render(<SalesOpportunityPage />);

        // Click delete button
        const deleteButtons = screen.getAllByLabelText('Delete');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(salesAPI.deleteOpportunity).toHaveBeenCalledWith('opp1');
            expect(mockRefreshOpportunities).toHaveBeenCalled();
            expect(screen.getByText('Opportunity deleted successfully')).toBeInTheDocument();
        });
    });

    it('handles stage change in pipeline view', async () => {
        (salesAPI.updateOpportunity as jest.Mock).mockResolvedValue({
            ...mockOpportunities[0],
            stage: 'QUALIFICATION'
        });

        render(<SalesOpportunityPage />);

        // Switch to pipeline view
        fireEvent.click(screen.getByText('Pipeline'));

        // Simulate drag and drop
        const opportunity = screen.getByText('Test Company 1').closest('.MuiCard-root');
        fireEvent.dragStart(opportunity!);
        fireEvent.drop(screen.getByText('QUALIFICATION'));

        await waitFor(() => {
            expect(salesAPI.updateOpportunity).toHaveBeenCalledWith('opp1', expect.objectContaining({
                stage: 'QUALIFICATION'
            }));
            expect(mockRefreshOpportunities).toHaveBeenCalled();
        });
    });

    it('opens opportunity analysis dialog', async () => {
        render(<SalesOpportunityPage />);

        // Click view analysis button
        const viewButtons = screen.getAllByLabelText('View Analysis');
        fireEvent.click(viewButtons[0]);

        expect(screen.getByText('Opportunity Analysis')).toBeInTheDocument();
    });

    it('handles form cancellation', () => {
        render(<SalesOpportunityPage />);

        // Open create form
        fireEvent.click(screen.getByText('New Opportunity'));

        // Click cancel
        fireEvent.click(screen.getByText('Cancel'));

        expect(screen.queryByText('Create New Opportunity')).not.toBeInTheDocument();
    });

    it('handles analysis dialog close', async () => {
        render(<SalesOpportunityPage />);

        // Open analysis dialog
        const viewButtons = screen.getAllByLabelText('View Analysis');
        fireEvent.click(viewButtons[0]);

        // Close dialog
        const closeButton = screen.getAllByLabelText('Close')[1]; // Second close button is for analysis dialog
        fireEvent.click(closeButton);

        expect(screen.queryByText('Opportunity Analysis')).not.toBeInTheDocument();
    });
}); 