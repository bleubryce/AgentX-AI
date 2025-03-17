import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Campaigns from '../Campaigns';
import { CampaignStatus, CampaignType } from '../../../services/agent/processors/campaign.processor';

const mockCampaigns = [
    {
        id: '1',
        name: 'Spring Sale 2024',
        type: CampaignType.EMAIL,
        status: CampaignStatus.ACTIVE,
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        budget: 5000,
        target: {
            locations: ['New York', 'Los Angeles'],
            propertyTypes: ['Single Family', 'Condo'],
            priceRange: { min: 200000, max: 500000 }
        },
        performance: {
            impressions: 10000,
            leads: 150,
            conversions: 25,
            roi: 2.5
        }
    },
    {
        id: '2',
        name: 'First-Time Buyers',
        type: CampaignType.SOCIAL,
        status: CampaignStatus.SCHEDULED,
        startDate: '2024-04-01',
        endDate: '2024-04-30',
        budget: 3000,
        target: {
            locations: ['Chicago', 'Houston'],
            propertyTypes: ['Condo', 'Townhouse'],
            priceRange: { min: 150000, max: 300000 }
        },
        performance: {
            impressions: 0,
            leads: 0,
            conversions: 0,
            roi: 0
        }
    }
];

describe('Campaigns', () => {
    const mockHandlers = {
        onCreateCampaign: jest.fn(),
        onUpdateCampaign: jest.fn(),
        onDeleteCampaign: jest.fn(),
        onDuplicateCampaign: jest.fn(),
        onToggleCampaignStatus: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders campaign list with details', () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        mockCampaigns.forEach(campaign => {
            expect(screen.getByText(campaign.name)).toBeInTheDocument();
            expect(screen.getByText(campaign.type)).toBeInTheDocument();
            expect(screen.getByText(campaign.status)).toBeInTheDocument();
            expect(screen.getByText(`$${campaign.budget.toLocaleString()}`)).toBeInTheDocument();
        });
    });

    it('opens create campaign dialog', () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Create Campaign'));

        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
        expect(screen.getByLabelText('Campaign Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Campaign Type')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Budget')).toBeInTheDocument();
    });

    it('handles campaign creation', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Create Campaign'));

        // Fill form
        fireEvent.change(screen.getByLabelText('Campaign Name'), {
            target: { value: 'Summer Campaign' }
        });
        fireEvent.change(screen.getByLabelText('Campaign Type'), {
            target: { value: CampaignType.EMAIL }
        });
        fireEvent.change(screen.getByLabelText('Start Date'), {
            target: { value: '2024-06-01' }
        });
        fireEvent.change(screen.getByLabelText('End Date'), {
            target: { value: '2024-06-30' }
        });
        fireEvent.change(screen.getByLabelText('Budget'), {
            target: { value: '4000' }
        });

        // Submit form
        fireEvent.click(screen.getByText('Create'));

        await waitFor(() => {
            expect(mockHandlers.onCreateCampaign).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Summer Campaign',
                type: CampaignType.EMAIL,
                startDate: '2024-06-01',
                endDate: '2024-06-30',
                budget: 4000
            }));
        });
    });

    it('handles campaign update', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        // Click edit button on first campaign
        const editButtons = screen.getAllByTitle('Edit Campaign');
        fireEvent.click(editButtons[0]);

        // Update name
        fireEvent.change(screen.getByLabelText('Campaign Name'), {
            target: { value: 'Updated Campaign Name' }
        });

        // Submit form
        fireEvent.click(screen.getByText('Update'));

        await waitFor(() => {
            expect(mockHandlers.onUpdateCampaign).toHaveBeenCalledWith(
                mockCampaigns[0].id,
                expect.objectContaining({
                    name: 'Updated Campaign Name'
                })
            );
        });
    });

    it('handles campaign deletion', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        // Click delete button on first campaign
        const deleteButtons = screen.getAllByTitle('Delete Campaign');
        fireEvent.click(deleteButtons[0]);

        // Confirm deletion
        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() => {
            expect(mockHandlers.onDeleteCampaign).toHaveBeenCalledWith(mockCampaigns[0].id);
        });
    });

    it('handles campaign duplication', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        // Click duplicate button on first campaign
        const duplicateButtons = screen.getAllByTitle('Duplicate Campaign');
        fireEvent.click(duplicateButtons[0]);

        await waitFor(() => {
            expect(mockHandlers.onDuplicateCampaign).toHaveBeenCalledWith(mockCampaigns[0].id);
        });
    });

    it('handles campaign status toggle', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        // Click status toggle on first campaign
        const statusToggles = screen.getAllByTitle('Toggle Campaign Status');
        fireEvent.click(statusToggles[0]);

        await waitFor(() => {
            expect(mockHandlers.onToggleCampaignStatus).toHaveBeenCalledWith(
                mockCampaigns[0].id,
                expect.any(String)
            );
        });
    });

    it('validates campaign dates', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Create Campaign'));

        // Try to set end date before start date
        fireEvent.change(screen.getByLabelText('Start Date'), {
            target: { value: '2024-06-01' }
        });
        fireEvent.change(screen.getByLabelText('End Date'), {
            target: { value: '2024-05-31' }
        });

        expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });

    it('validates budget input', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        fireEvent.click(screen.getByText('Create Campaign'));

        // Try negative budget
        fireEvent.change(screen.getByLabelText('Budget'), {
            target: { value: '-1000' }
        });

        expect(screen.getByText('Budget must be greater than 0')).toBeInTheDocument();
    });

    it('displays campaign performance metrics', () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        const activeCampaign = mockCampaigns[0];
        expect(screen.getByText(`Impressions: ${activeCampaign.performance.impressions.toLocaleString()}`)).toBeInTheDocument();
        expect(screen.getByText(`Leads: ${activeCampaign.performance.leads}`)).toBeInTheDocument();
        expect(screen.getByText(`Conversions: ${activeCampaign.performance.conversions}`)).toBeInTheDocument();
        expect(screen.getByText(`ROI: ${activeCampaign.performance.roi}x`)).toBeInTheDocument();
    });

    it('filters campaigns by status', async () => {
        render(<Campaigns campaigns={mockCampaigns} {...mockHandlers} />);

        const statusFilter = screen.getByLabelText('Filter by Status');
        fireEvent.change(statusFilter, { target: { value: CampaignStatus.ACTIVE } });

        await waitFor(() => {
            expect(screen.queryByText(mockCampaigns[1].name)).not.toBeInTheDocument();
            expect(screen.getByText(mockCampaigns[0].name)).toBeInTheDocument();
        });
    });
}); 