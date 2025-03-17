export enum CampaignType {
    EMAIL = 'EMAIL',
    SOCIAL = 'SOCIAL',
    SEARCH = 'SEARCH',
    DISPLAY = 'DISPLAY'
}

export enum CampaignStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export interface CampaignTarget {
    locations: string[];
    propertyTypes: string[];
    priceRange: {
        min: number;
        max: number;
    };
}

export interface CampaignPerformance {
    impressions: number;
    leads: number;
    conversions: number;
    roi: number;
}

export interface Campaign {
    id: string;
    name: string;
    type: CampaignType;
    status: CampaignStatus;
    startDate: string;
    endDate: string;
    budget: number;
    target: CampaignTarget;
    performance: CampaignPerformance;
}

export class CampaignProcessor {
    static validateDates(startDate: string, endDate: string): boolean {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start < end;
    }

    static validateBudget(budget: number): boolean {
        return budget > 0;
    }

    static calculateROI(revenue: number, cost: number): number {
        return cost > 0 ? Number((revenue / cost).toFixed(2)) : 0;
    }

    static getNextStatus(currentStatus: CampaignStatus): CampaignStatus {
        switch (currentStatus) {
            case CampaignStatus.DRAFT:
                return CampaignStatus.SCHEDULED;
            case CampaignStatus.SCHEDULED:
                return CampaignStatus.ACTIVE;
            case CampaignStatus.ACTIVE:
                return CampaignStatus.PAUSED;
            case CampaignStatus.PAUSED:
                return CampaignStatus.ACTIVE;
            default:
                return currentStatus;
        }
    }
} 