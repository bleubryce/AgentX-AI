import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SalesOpportunityDashboard from '../SalesOpportunityDashboard';
import { SalesOpportunity } from '../../../services/agent/processors/sales.processor';

describe('SalesOpportunityDashboard', () => {
    const mockOpportunities: SalesOpportunity[] = [
        {
            id: '1',
            companyName: 'Alpha Corp',
            contactName: 'John Doe',
            contactEmail: 'john@alpha.com',
            productInterest: ['AI Platform'],
            stage: 'QUALIFICATION',
            priority: 'HIGH'
        },
        {
            id: '2',
            companyName: 'Beta Inc',
            contactName: 'Jane Smith',
            contactEmail: 'jane@beta.com',
            productInterest: ['Data Analytics', 'Machine Learning'],
            stage: 'PROSPECTING',
            priority: 'MEDIUM'
        }
    ];

    const mockHandlers = {
        onEdit: jest.fn(),
        onDelete: jest.fn(),
        onSelect: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the dashboard with opportunities', () => {
        render(
            <SalesOpportunityDashboard
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        // Check if companies are rendered
        expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
        expect(screen.getByText('Beta Inc')).toBeInTheDocument();

        // Check if contacts are rendered
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();

        // Check if stages are rendered
        expect(screen.getByText('QUALIFICATION')).toBeInTheDocument();
        expect(screen.getByText('PROSPECTING')).toBeInTheDocument();

        // Check if priorities are rendered
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders product interest chips', () => {
        render(
            <SalesOpportunityDashboard
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('AI Platform')).toBeInTheDocument();
        expect(screen.getByText('Data Analytics')).toBeInTheDocument();
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', () => {
        render(
            <SalesOpportunityDashboard
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);

        expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockOpportunities[0]);
    });

    it('calls onDelete when delete button is clicked', () => {
        render(
            <SalesOpportunityDashboard
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const deleteButtons = screen.getAllByTitle('Delete');
        fireEvent.click(deleteButtons[0]);

        expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
    });

    it('calls onSelect when view button is clicked', () => {
        render(
            <SalesOpportunityDashboard
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const viewButtons = screen.getAllByTitle('View Analysis');
        fireEvent.click(viewButtons[0]);

        expect(mockHandlers.onSelect).toHaveBeenCalledWith('1');
    });

    it('sorts opportunities by company name', () => {
        render(
            <SalesOpportunityDashboard
                opportunities={mockOpportunities}
                {...mockHandlers}
            />
        );

        const companyNameHeader = screen.getByText('Company');
        
        // First click - ascending order
        fireEvent.click(companyNameHeader);
        const companies = screen.getAllByRole('cell', { name: /Corp|Inc/ });
        expect(companies[0]).toHaveTextContent('Alpha Corp');
        expect(companies[1]).toHaveTextContent('Beta Inc');

        // Second click - descending order
        fireEvent.click(companyNameHeader);
        const companiesDesc = screen.getAllByRole('cell', { name: /Corp|Inc/ });
        expect(companiesDesc[0]).toHaveTextContent('Beta Inc');
        expect(companiesDesc[1]).toHaveTextContent('Alpha Corp');
    });

    it('handles pagination', () => {
        const manyOpportunities = Array.from({ length: 12 }, (_, i) => ({
            ...mockOpportunities[0],
            id: `${i + 1}`,
            companyName: `Company ${i + 1}`
        }));

        render(
            <SalesOpportunityDashboard
                opportunities={manyOpportunities}
                {...mockHandlers}
            />
        );

        // Check initial page
        expect(screen.getByText('Company 1')).toBeInTheDocument();
        expect(screen.getByText('Company 10')).toBeInTheDocument();
        expect(screen.queryByText('Company 11')).not.toBeInTheDocument();

        // Go to next page
        const nextPageButton = screen.getByTitle('Go to next page');
        fireEvent.click(nextPageButton);

        // Check second page
        expect(screen.getByText('Company 11')).toBeInTheDocument();
        expect(screen.getByText('Company 12')).toBeInTheDocument();
        expect(screen.queryByText('Company 1')).not.toBeInTheDocument();
    });

    it('changes rows per page', () => {
        const manyOpportunities = Array.from({ length: 12 }, (_, i) => ({
            ...mockOpportunities[0],
            id: `${i + 1}`,
            companyName: `Company ${i + 1}`
        }));

        render(
            <SalesOpportunityDashboard
                opportunities={manyOpportunities}
                {...mockHandlers}
            />
        );

        // Change rows per page to 5
        const rowsPerPageSelect = screen.getByLabelText('Rows per page:');
        fireEvent.mouseDown(rowsPerPageSelect);
        const option5 = screen.getByRole('option', { name: '5' });
        fireEvent.click(option5);

        // Check that only 5 items are shown
        expect(screen.getByText('Company 1')).toBeInTheDocument();
        expect(screen.getByText('Company 5')).toBeInTheDocument();
        expect(screen.queryByText('Company 6')).not.toBeInTheDocument();
    });
}); 