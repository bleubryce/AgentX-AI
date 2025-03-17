import { DateRange } from './analytics.processor';

export enum ReportType {
    LEAD_PERFORMANCE = 'LEAD_PERFORMANCE',
    CAMPAIGN_PERFORMANCE = 'CAMPAIGN_PERFORMANCE',
    REVENUE_ANALYSIS = 'REVENUE_ANALYSIS',
    CONVERSION_FUNNEL = 'CONVERSION_FUNNEL',
    SOURCE_ATTRIBUTION = 'SOURCE_ATTRIBUTION'
}

export enum ReportFormat {
    PDF = 'PDF',
    EXCEL = 'EXCEL',
    CSV = 'CSV'
}

export enum ReportFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY'
}

export interface ReportMetric {
    name: string;
    label: string;
    format?: 'number' | 'currency' | 'percentage';
    aggregation?: 'sum' | 'average' | 'count';
}

export interface ReportTypeConfig {
    type: ReportType;
    name: string;
    metrics: string[];
    description?: string;
}

export interface ReportConfig {
    reportTypes: ReportTypeConfig[];
    dateRange: DateRange;
    formats: ReportFormat[];
}

export interface ReportTemplate {
    id?: string;
    name: string;
    type: ReportType;
    metrics: string[];
    format?: ReportFormat;
    schedule?: {
        frequency: ReportFrequency;
        dayOfWeek?: number;
        dayOfMonth?: number;
        recipients: string[];
    };
}

export interface ReportGenerationConfig {
    type: ReportType;
    format: ReportFormat;
    dateRange: DateRange;
    metrics: string[];
    template?: string;
}

export interface ScheduledReportConfig {
    type: ReportType;
    frequency: ReportFrequency;
    metrics: string[];
    recipients: string[];
    dayOfWeek?: number;
    dayOfMonth?: number;
}

export class ReportProcessor {
    private static readonly metricConfigs: Record<string, ReportMetric> = {
        totalLeads: {
            name: 'totalLeads',
            label: 'Total Leads',
            format: 'number',
            aggregation: 'sum'
        },
        qualifiedLeads: {
            name: 'qualifiedLeads',
            label: 'Qualified Leads',
            format: 'number',
            aggregation: 'sum'
        },
        conversionRate: {
            name: 'conversionRate',
            label: 'Conversion Rate',
            format: 'percentage',
            aggregation: 'average'
        },
        impressions: {
            name: 'impressions',
            label: 'Impressions',
            format: 'number',
            aggregation: 'sum'
        },
        leads: {
            name: 'leads',
            label: 'Leads',
            format: 'number',
            aggregation: 'sum'
        },
        conversions: {
            name: 'conversions',
            label: 'Conversions',
            format: 'number',
            aggregation: 'sum'
        },
        roi: {
            name: 'roi',
            label: 'ROI',
            format: 'percentage',
            aggregation: 'average'
        },
        totalRevenue: {
            name: 'totalRevenue',
            label: 'Total Revenue',
            format: 'currency',
            aggregation: 'sum'
        },
        averageDealSize: {
            name: 'averageDealSize',
            label: 'Average Deal Size',
            format: 'currency',
            aggregation: 'average'
        },
        revenueBySource: {
            name: 'revenueBySource',
            label: 'Revenue by Source',
            format: 'currency',
            aggregation: 'sum'
        }
    };

    static getMetricConfig(metricName: string): ReportMetric | undefined {
        return this.metricConfigs[metricName];
    }

    static validateDateRange(startDate: string, endDate: string): boolean {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start <= end && start <= new Date();
    }

    static formatMetricValue(value: number, format: ReportMetric['format']): string {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'number':
            default:
                return value.toLocaleString();
        }
    }

    static validateScheduleConfig(config: ScheduledReportConfig): boolean {
        switch (config.frequency) {
            case ReportFrequency.WEEKLY:
                return typeof config.dayOfWeek === 'number' && config.dayOfWeek >= 0 && config.dayOfWeek <= 6;
            case ReportFrequency.MONTHLY:
                return typeof config.dayOfMonth === 'number' && config.dayOfMonth >= 1 && config.dayOfMonth <= 31;
            case ReportFrequency.DAILY:
            case ReportFrequency.QUARTERLY:
                return true;
            default:
                return false;
        }
    }

    static getNextScheduledDate(config: ScheduledReportConfig): Date {
        const now = new Date();
        const next = new Date(now);

        switch (config.frequency) {
            case ReportFrequency.DAILY:
                next.setDate(now.getDate() + 1);
                break;
            case ReportFrequency.WEEKLY:
                const daysUntilNext = (config.dayOfWeek! - now.getDay() + 7) % 7;
                next.setDate(now.getDate() + daysUntilNext);
                break;
            case ReportFrequency.MONTHLY:
                if (now.getDate() >= config.dayOfMonth!) {
                    next.setMonth(now.getMonth() + 1);
                }
                next.setDate(config.dayOfMonth!);
                break;
            case ReportFrequency.QUARTERLY:
                const monthsUntilQuarter = 3 - (now.getMonth() % 3);
                next.setMonth(now.getMonth() + monthsUntilQuarter);
                next.setDate(1);
                break;
        }

        return next;
    }
} 