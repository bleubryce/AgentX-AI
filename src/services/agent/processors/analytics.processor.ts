import { CampaignType, CampaignStatus } from './campaign.processor';

export interface TrendsData {
    labels: string[];
    leads: number[];
    conversions: number[];
}

export interface LeadMetrics {
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number;
    averageScore: number;
    leadsBySource: Record<string, number>;
    leadsByStatus: Record<string, number>;
    trendsData: TrendsData;
}

export interface CampaignPerformanceData {
    labels: string[];
    impressions: number[];
    leads: number[];
    conversions: number[];
}

export interface CampaignMetrics {
    activeCampaigns: number;
    totalBudget: number;
    totalROI: number;
    campaignsByType: Record<CampaignType, number>;
    campaignsByStatus: Record<CampaignStatus, number>;
    performanceData: CampaignPerformanceData;
}

export interface MonthlyTrends {
    labels: string[];
    revenue: number[];
    deals: number[];
}

export interface RevenueMetrics {
    totalRevenue: number;
    averageDealSize: number;
    revenueBySource: Record<string, number>;
    monthlyTrends: MonthlyTrends;
}

export interface AnalyticsData {
    leadMetrics: LeadMetrics;
    campaignMetrics: CampaignMetrics;
    revenueMetrics: RevenueMetrics;
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

export class AnalyticsProcessor {
    static calculateConversionRate(conversions: number, total: number): number {
        return total > 0 ? Number(((conversions / total) * 100).toFixed(1)) : 0;
    }

    static calculateAverageScore(scores: number[]): number {
        if (scores.length === 0) return 0;
        const sum = scores.reduce((acc, score) => acc + score, 0);
        return Number((sum / scores.length).toFixed(1));
    }

    static calculateROI(revenue: number, cost: number): number {
        return cost > 0 ? Number((revenue / cost).toFixed(2)) : 0;
    }

    static validateDateRange(startDate: string, endDate: string): boolean {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start <= end && start <= new Date();
    }

    static formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    static aggregateByPeriod(data: number[], period: 'day' | 'week' | 'month' | 'quarter'): number[] {
        // Implementation would depend on the data structure and requirements
        // This is a placeholder for the actual aggregation logic
        return data;
    }
} 