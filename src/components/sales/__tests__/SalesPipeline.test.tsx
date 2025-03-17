import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DragDropContext } from 'react-beautiful-dnd';
import SalesPipeline from '../SalesPipeline';
import { salesAPI } from '../../../services/api/sales.api';
import { SalesOpportunity } from '../../../services/agent/processors/sales.processor';

// Mock the salesAPI
jest.mock('../../../services/api/sales.api', () => ({
    salesAPI: {
        getOpportunities: jest.fn(),
        updateOpportunity: jest.fn(),
        deleteOpportunity: jest.fn()
    }
}));

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children, onDragEnd }: any) => {
        const triggerDragEnd = (result: any) => onDragEnd(result);
        return (
            <div data-testid="drag-drop-context" onClick={() => triggerDragEnd({
                draggableId: 'opp1',
                destination: { droppableId: 'QUALIFICATION' }
            })}>
                {children}
            </div>
        );
    },
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

const mockHandlers = {
    onStageChange: jest.fn(),
    onOpportunitySelect: jest.fn()
};

describe('SalesPipeline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (salesAPI.getOpportunities as jest.Mock).mockResolvedValue(mockOpportunities);
    });

    it('renders loading state initially', () => {
        render(<SalesPipeline />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('loads and displays opportunities', async () => {
        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
            expect(screen.getByText('Test Company 2')).toBeInTheDocument();
        });

        expect(salesAPI.getOpportunities).toHaveBeenCalled();
    });

    it('displays opportunities in correct stages', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        expect(screen.getByText('Test Company 2')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('shows opportunity count for each stage', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const prospectingCount = screen.getByText('1 opportunities');
        const qualificationCount = screen.getByText('1 opportunities');

        expect(prospectingCount).toBeInTheDocument();
        expect(qualificationCount).toBeInTheDocument();
    });

    it('displays total value for each stage', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Total: $50,000')).toBeInTheDocument();
        expect(screen.getByText('Total: $75,000')).toBeInTheDocument();
    });

    it('shows priority chips with correct colors', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const highPriorityChip = screen.getByText('HIGH');
        const mediumPriorityChip = screen.getByText('MEDIUM');

        expect(highPriorityChip).toHaveClass('MuiChip-colorError');
        expect(mediumPriorityChip).toHaveClass('MuiChip-colorWarning');
    });

    it('displays budget chips', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('$50,000')).toBeInTheDocument();
        expect(screen.getByText('$75,000')).toBeInTheDocument();
    });

    it('handles opportunity selection', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const opportunityCard = screen.getByText('Test Company 1').closest('.MuiCard-root');
        fireEvent.click(opportunityCard!);

        expect(mockHandlers.onOpportunitySelect).toHaveBeenCalledWith(mockOpportunities[0]);
    });

    it('handles drag and drop stage change', () => {
        render(
            <SalesPipeline
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const dragDropContext = screen.getByTestId('drag-drop-context');
        fireEvent.click(dragDropContext);

        expect(mockHandlers.onStageChange).toHaveBeenCalledWith('opp1', 'QUALIFICATION');
    });

    it('formats currency correctly', () => {
        const opportunitiesWithNullBudget: SalesOpportunity[] = [
            {
                ...mockOpportunities[0],
                budget: null
            }
        ];

        render(
            <SalesPipeline
                opportunities={opportunitiesWithNullBudget}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('handles opportunity deletion', async () => {
        (salesAPI.deleteOpportunity as jest.Mock).mockResolvedValue(undefined);
        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        });

        // Open menu
        fireEvent.click(screen.getAllByTestId('MoreVertIcon')[0]);

        // Click delete
        fireEvent.click(screen.getByText('Delete'));

        await waitFor(() => {
            expect(salesAPI.deleteOpportunity).toHaveBeenCalledWith('opp1');
            expect(salesAPI.getOpportunities).toHaveBeenCalledTimes(2); // Initial + after delete
        });
    });

    it('handles deletion error', async () => {
        (salesAPI.deleteOpportunity as jest.Mock).mockRejectedValue(new Error('API Error'));
        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        });

        // Open menu
        fireEvent.click(screen.getAllByTestId('MoreVertIcon')[0]);

        // Click delete
        fireEvent.click(screen.getByText('Delete'));

        await waitFor(() => {
            expect(screen.getByText('Failed to delete opportunity. Please try again.')).toBeInTheDocument();
        });
    });

    it('opens edit dialog', async () => {
        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        });

        // Open menu
        fireEvent.click(screen.getAllByTestId('MoreVertIcon')[0]);

        // Click edit
        fireEvent.click(screen.getByText('Edit'));

        expect(screen.getByText('Edit Opportunity')).toBeInTheDocument();
    });

    it('displays opportunity details correctly', async () => {
        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        });

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('$50,000')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('handles API error when loading opportunities', async () => {
        (salesAPI.getOpportunities as jest.Mock).mockRejectedValue(new Error('API Error'));
        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load opportunities. Please try again.')).toBeInTheDocument();
        });
    });

    it('updates opportunity stage when dragged to different column', async () => {
        (salesAPI.updateOpportunity as jest.Mock).mockResolvedValue({
            ...mockOpportunities[0],
            stage: 'PROPOSAL'
        });

        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        });

        // Simulate drag end
        const context = screen.getByTestId('drag-drop-context');
        fireEvent(context, new Event('dragend', {
            source: { droppableId: 'QUALIFICATION', index: 0 },
            destination: { droppableId: 'PROPOSAL', index: 0 },
            draggableId: 'opp1'
        }));

        await waitFor(() => {
            expect(salesAPI.updateOpportunity).toHaveBeenCalledWith('opp1', expect.objectContaining({
                stage: 'PROPOSAL'
            }));
        });
    });

    it('handles error when updating opportunity stage', async () => {
        (salesAPI.updateOpportunity as jest.Mock).mockRejectedValue(new Error('API Error'));

        render(<SalesPipeline />);

        await waitFor(() => {
            expect(screen.getByText('Test Company 1')).toBeInTheDocument();
        });

        // Simulate drag end
        const context = screen.getByTestId('drag-drop-context');
        fireEvent(context, new Event('dragend', {
            source: { droppableId: 'QUALIFICATION', index: 0 },
            destination: { droppableId: 'PROPOSAL', index: 0 },
            draggableId: 'opp1'
        }));

        await waitFor(() => {
            expect(screen.getByText('Failed to update opportunity stage. Please try again.')).toBeInTheDocument();
            expect(salesAPI.getOpportunities).toHaveBeenCalledTimes(2); // Initial + after error
        });
    });

    it('displays correct column counts', async () => {
        render(<SalesPipeline />);

        await waitFor(() => {
            const qualificationCount = screen.getAllByText('1')[0];
            const prospectingCount = screen.getAllByText('1')[1];

            expect(qualificationCount).toBeInTheDocument();
            expect(prospectingCount).toBeInTheDocument();
        });
    });
}); 