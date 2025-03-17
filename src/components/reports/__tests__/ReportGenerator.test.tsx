import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportGenerator from '../ReportGenerator';
import { ReportType, ReportFormat } from '../../../services/agent/processors/report.processor';

const mockReportConfig = {
    reportTypes: [
        {
            type: ReportType.LEAD_PERFORMANCE,
            name: 'Lead Performance Report',
            metrics: ['totalLeads', 'qualifiedLeads', 'conversionRate']
        },
        {
            type: ReportType.CAMPAIGN_PERFORMANCE,
            name: 'Campaign Performance Report',
            metrics: ['impressions', 'leads', 'conversions', 'roi']
        },
        {
            type: ReportType.REVENUE_ANALYSIS,
            name: 'Revenue Analysis Report',
            metrics: ['totalRevenue', 'averageDealSize', 'revenueBySource']
        }
    ],
    dateRange: {
        startDate: '2024-01-01',
        endDate: '2024-03-31'
    },
    formats: [
        ReportFormat.PDF,
        ReportFormat.EXCEL,
        ReportFormat.CSV
    ]
};

describe('ReportGenerator', () => {
    const mockHandlers = {
        onGenerateReport: jest.fn(),
        onScheduleReport: jest.fn(),
        onSaveTemplate: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders report configuration options', () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Check report types
        mockReportConfig.reportTypes.forEach(reportType => {
            expect(screen.getByText(reportType.name)).toBeInTheDocument();
        });

        // Check format options
        mockReportConfig.formats.forEach(format => {
            expect(screen.getByText(format)).toBeInTheDocument();
        });

        // Check date range inputs
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('handles report type selection', () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        const reportTypeSelect = screen.getByLabelText('Report Type');
        fireEvent.change(reportTypeSelect, { target: { value: ReportType.LEAD_PERFORMANCE } });

        // Check if metrics for selected report type are displayed
        mockReportConfig.reportTypes[0].metrics.forEach(metric => {
            expect(screen.getByText(metric, { exact: false })).toBeInTheDocument();
        });
    });

    it('handles metric selection', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Select report type first
        fireEvent.change(screen.getByLabelText('Report Type'), {
            target: { value: ReportType.LEAD_PERFORMANCE }
        });

        // Select metrics
        const metricCheckboxes = screen.getAllByRole('checkbox');
        fireEvent.click(metricCheckboxes[0]); // Select first metric
        fireEvent.click(metricCheckboxes[1]); // Select second metric

        expect(metricCheckboxes[0]).toBeChecked();
        expect(metricCheckboxes[1]).toBeChecked();
    });

    it('handles date range selection', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        fireEvent.change(endDateInput, { target: { value: '2024-03-31' } });

        expect(startDateInput).toHaveValue('2024-01-01');
        expect(endDateInput).toHaveValue('2024-03-31');
    });

    it('handles format selection', () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        const formatSelect = screen.getByLabelText('Report Format');
        fireEvent.change(formatSelect, { target: { value: ReportFormat.PDF } });

        expect(formatSelect).toHaveValue(ReportFormat.PDF);
    });

    it('generates report with selected configuration', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Configure report
        fireEvent.change(screen.getByLabelText('Report Type'), {
            target: { value: ReportType.LEAD_PERFORMANCE }
        });
        fireEvent.change(screen.getByLabelText('Report Format'), {
            target: { value: ReportFormat.PDF }
        });
        fireEvent.change(screen.getByLabelText('Start Date'), {
            target: { value: '2024-01-01' }
        });
        fireEvent.change(screen.getByLabelText('End Date'), {
            target: { value: '2024-03-31' }
        });

        // Generate report
        fireEvent.click(screen.getByText('Generate Report'));

        await waitFor(() => {
            expect(mockHandlers.onGenerateReport).toHaveBeenCalledWith({
                type: ReportType.LEAD_PERFORMANCE,
                format: ReportFormat.PDF,
                dateRange: {
                    startDate: '2024-01-01',
                    endDate: '2024-03-31'
                },
                metrics: expect.any(Array)
            });
        });
    });

    it('schedules recurring report', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Configure report
        fireEvent.change(screen.getByLabelText('Report Type'), {
            target: { value: ReportType.CAMPAIGN_PERFORMANCE }
        });
        fireEvent.change(screen.getByLabelText('Schedule Frequency'), {
            target: { value: 'WEEKLY' }
        });

        // Schedule report
        fireEvent.click(screen.getByText('Schedule Report'));

        await waitFor(() => {
            expect(mockHandlers.onScheduleReport).toHaveBeenCalledWith({
                type: ReportType.CAMPAIGN_PERFORMANCE,
                frequency: 'WEEKLY',
                metrics: expect.any(Array)
            });
        });
    });

    it('saves report template', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Configure template
        fireEvent.change(screen.getByLabelText('Template Name'), {
            target: { value: 'Monthly Lead Report' }
        });
        fireEvent.change(screen.getByLabelText('Report Type'), {
            target: { value: ReportType.LEAD_PERFORMANCE }
        });

        // Save template
        fireEvent.click(screen.getByText('Save as Template'));

        await waitFor(() => {
            expect(mockHandlers.onSaveTemplate).toHaveBeenCalledWith({
                name: 'Monthly Lead Report',
                type: ReportType.LEAD_PERFORMANCE,
                metrics: expect.any(Array)
            });
        });
    });

    it('validates date range', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Set invalid date range
        fireEvent.change(screen.getByLabelText('Start Date'), {
            target: { value: '2024-03-31' }
        });
        fireEvent.change(screen.getByLabelText('End Date'), {
            target: { value: '2024-01-01' }
        });

        // Try to generate report
        fireEvent.click(screen.getByText('Generate Report'));

        expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
        expect(mockHandlers.onGenerateReport).not.toHaveBeenCalled();
    });

    it('requires minimum configuration', async () => {
        render(<ReportGenerator config={mockReportConfig} {...mockHandlers} />);

        // Try to generate report without selecting type
        fireEvent.click(screen.getByText('Generate Report'));

        expect(screen.getByText('Please select a report type')).toBeInTheDocument();
        expect(mockHandlers.onGenerateReport).not.toHaveBeenCalled();
    });
}); 