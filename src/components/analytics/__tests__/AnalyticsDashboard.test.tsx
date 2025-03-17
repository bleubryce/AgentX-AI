import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '../AnalyticsDashboard';
import { CampaignType, CampaignStatus } from '../../../services/agent/processors/campaign.processor';

const mockAnalyticsData = {
    leadMetrics: {
        totalLeads: 1250,
        qualifiedLeads: 450,
        conversionRate: 36,
        averageQualificationTime: 48
    },
    sourceMetrics: {
        websiteForm: { leads: 500, qualified: 200, conversion: 40 },
        referral: { leads: 300, qualified: 150, conversion: 50 },
        socialMedia: { leads: 450, qualified: 100, conversion: 22 }
    },
    campaignMetrics: {
        activeCampaigns: 5,
        totalImpressions: 50000,
        totalClicks: 2500,
        averageConversionRate: 5
    },
    revenueMetrics: {
        totalRevenue: 750000,
        averageDealSize: 25000,
        projectedRevenue: 1500000,
        revenueBySource: {
            websiteForm: 300000,
            referral: 250000,
            socialMedia: 200000
        }
    },
    timeRangeMetrics: {
        daily: [/* daily data points */],
        weekly: [/* weekly data points */],
        monthly: [/* monthly data points */]
    }
};

describe('AnalyticsDashboard', () => {
    const mockHandlers = {
        onDateRangeChange: jest.fn(),
        onMetricSelect: jest.fn(),
        onExportData: jest.fn(),
        onRefresh: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all metric sections', () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Lead Analytics')).toBeInTheDocument();
        expect(screen.getByText('Source Performance')).toBeInTheDocument();
        expect(screen.getByText('Campaign Overview')).toBeInTheDocument();
        expect(screen.getByText('Revenue Insights')).toBeInTheDocument();
    });

    it('displays lead metrics correctly', () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('1,250')).toBeInTheDocument(); // Total Leads
        expect(screen.getByText('450')).toBeInTheDocument(); // Qualified Leads
        expect(screen.getByText('36%')).toBeInTheDocument(); // Conversion Rate
    });

    it('displays source performance metrics', () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Website Form')).toBeInTheDocument();
        expect(screen.getByText('Referral')).toBeInTheDocument();
        expect(screen.getByText('Social Media')).toBeInTheDocument();
    });

    it('handles date range changes', async () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        const dateRangeSelect = screen.getByLabelText('Date Range');
        fireEvent.change(dateRangeSelect, { target: { value: 'LAST_30_DAYS' } });

        await waitFor(() => {
            expect(mockHandlers.onDateRangeChange).toHaveBeenCalledWith('LAST_30_DAYS');
        });
    });

    it('handles metric selection', async () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        const metricToggle = screen.getByLabelText('Show Conversion Rate');
        fireEvent.click(metricToggle);

        await waitFor(() => {
            expect(mockHandlers.onMetricSelect).toHaveBeenCalledWith('conversionRate');
        });
    });

    it('exports dashboard data', async () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        const exportButton = screen.getByText('Export Data');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(mockHandlers.onExportData).toHaveBeenCalled();
        });
    });

    it('refreshes dashboard data', async () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        const refreshButton = screen.getByLabelText('Refresh Data');
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(mockHandlers.onRefresh).toHaveBeenCalled();
        });
    });

    it('displays revenue metrics correctly', () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('$750,000')).toBeInTheDocument(); // Total Revenue
        expect(screen.getByText('$25,000')).toBeInTheDocument(); // Average Deal Size
        expect(screen.getByText('$1,500,000')).toBeInTheDocument(); // Projected Revenue
    });

    it('displays campaign metrics correctly', () => {
        render(
            <AnalyticsDashboard
                data={mockAnalyticsData}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('5')).toBeInTheDocument(); // Active Campaigns
        expect(screen.getByText('50,000')).toBeInTheDocument(); // Total Impressions
        expect(screen.getByText('2,500')).toBeInTheDocument(); // Total Clicks
        expect(screen.getByText('5%')).toBeInTheDocument(); // Average Conversion Rate
    });
}); 