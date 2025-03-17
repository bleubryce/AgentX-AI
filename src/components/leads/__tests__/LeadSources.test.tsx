import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadSources from '../LeadSources';
import { LeadSource } from '../../../services/agent/processors/lead.processor';

const mockSourceConfigs = [
    {
        source: LeadSource.WEBSITE,
        isActive: true,
        notificationEmail: 'web@test.com',
        scoreThreshold: 60,
        stats: {
            totalLeads: 100,
            qualifiedLeads: 45,
            conversionRate: 45,
            averageScore: 72
        }
    },
    {
        source: LeadSource.REFERRAL,
        isActive: true,
        notificationEmail: 'referral@test.com',
        autoAssignTo: 'John Smith',
        scoreThreshold: 70,
        stats: {
            totalLeads: 50,
            qualifiedLeads: 30,
            conversionRate: 60,
            averageScore: 85
        }
    }
];

describe('LeadSources', () => {
    const mockHandlers = {
        onAddSource: jest.fn(),
        onUpdateSource: jest.fn(),
        onDeleteSource: jest.fn(),
        onRefreshStats: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders lead source cards with stats', () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        mockSourceConfigs.forEach(config => {
            expect(screen.getByText(config.source)).toBeInTheDocument();
            expect(screen.getByText(`Status: ${config.isActive ? 'Active' : 'Inactive'}`)).toBeInTheDocument();
            expect(screen.getByText(`Notifications: ${config.notificationEmail}`)).toBeInTheDocument();
            expect(screen.getByText(`Total Leads: ${config.stats.totalLeads}`)).toBeInTheDocument();
            expect(screen.getByText(`Qualified Leads: ${config.stats.qualifiedLeads}`)).toBeInTheDocument();
            
            if (config.autoAssignTo) {
                expect(screen.getByText(`Auto-assign to: ${config.autoAssignTo}`)).toBeInTheDocument();
            }
        });
    });

    it('opens add source dialog', () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Add Source'));

        expect(screen.getByText('Add Lead Source')).toBeInTheDocument();
        expect(screen.getByLabelText('Source')).toBeInTheDocument();
        expect(screen.getByLabelText('Notification Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Score Threshold')).toBeInTheDocument();
    });

    it('opens edit source dialog', () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        // Click edit button on first source
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);

        expect(screen.getByText('Edit Lead Source')).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockSourceConfigs[0].notificationEmail)).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockSourceConfigs[0].scoreThreshold.toString())).toBeInTheDocument();
    });

    it('handles adding new source', async () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Add Source'));

        // Fill form
        fireEvent.change(screen.getByLabelText('Notification Email'), {
            target: { value: 'new@test.com' }
        });
        fireEvent.change(screen.getByLabelText('Score Threshold'), {
            target: { value: '75' }
        });

        // Submit form
        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(mockHandlers.onAddSource).toHaveBeenCalledWith(expect.objectContaining({
                source: LeadSource.WEBSITE,
                isActive: true,
                notificationEmail: 'new@test.com',
                scoreThreshold: 75
            }));
        });
    });

    it('handles updating source', async () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        // Click edit button on first source
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);

        // Update form
        fireEvent.change(screen.getByLabelText('Notification Email'), {
            target: { value: 'updated@test.com' }
        });

        // Submit form
        fireEvent.click(screen.getByText('Update'));

        await waitFor(() => {
            expect(mockHandlers.onUpdateSource).toHaveBeenCalledWith(
                LeadSource.WEBSITE,
                expect.objectContaining({
                    notificationEmail: 'updated@test.com'
                })
            );
        });
    });

    it('handles deleting source', async () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        // Click delete button on first source
        const deleteButtons = screen.getAllByTitle('Delete');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockHandlers.onDeleteSource).toHaveBeenCalledWith(LeadSource.WEBSITE);
        });
    });

    it('handles refreshing stats', () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        fireEvent.click(screen.getByTitle('Refresh Statistics'));
        expect(mockHandlers.onRefreshStats).toHaveBeenCalled();
    });

    it('validates form fields', async () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Add Source'));

        // Try to submit with invalid email
        fireEvent.change(screen.getByLabelText('Notification Email'), {
            target: { value: 'invalid-email' }
        });
        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(mockHandlers.onAddSource).not.toHaveBeenCalled();
        });

        // Fix email and submit
        fireEvent.change(screen.getByLabelText('Notification Email'), {
            target: { value: 'valid@test.com' }
        });
        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(mockHandlers.onAddSource).toHaveBeenCalled();
        });
    });

    it('handles dialog cancellation', () => {
        render(<LeadSources sourceConfigs={mockSourceConfigs} {...mockHandlers} />);

        // Open add dialog
        fireEvent.click(screen.getByText('Add Source'));
        expect(screen.getByText('Add Lead Source')).toBeInTheDocument();

        // Cancel dialog
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Add Lead Source')).not.toBeInTheDocument();

        // Open edit dialog
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);
        expect(screen.getByText('Edit Lead Source')).toBeInTheDocument();

        // Cancel dialog
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Edit Lead Source')).not.toBeInTheDocument();
    });
}); 