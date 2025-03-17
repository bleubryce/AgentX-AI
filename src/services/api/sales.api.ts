import axios from 'axios';
import { SalesOpportunity } from '../agent/processors/sales.processor';

export interface SalesMetrics {
    opportunityScore: number;
    conversionProbability: number;
    expectedValue: number;
    timeToClose: number;
}

export interface CompetitorComparison {
    competitor: string;
    advantages: string[];
    disadvantages: string[];
}

export interface SalesStrategy {
    recommendedApproach: string;
    keyTalkingPoints: string[];
    riskFactors: string[];
}

export interface NextStep {
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    deadline?: string;
}

export interface SalesAnalysis {
    competitive: {
        competitorComparison: CompetitorComparison[];
    };
    strategy: SalesStrategy;
}

export interface SalesAnalysisResponse {
    opportunity: SalesOpportunity;
    metrics: SalesMetrics;
    analysis: SalesAnalysis;
    nextSteps: NextStep[];
}

class SalesAPI {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
    }

    async getOpportunities(): Promise<SalesOpportunity[]> {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities`);
            return response.data;
        } catch (error) {
            console.error('Error fetching opportunities:', error);
            throw error;
        }
    }

    async getOpportunityAnalysis(id: string): Promise<SalesAnalysisResponse> {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities/${id}/analysis`);
            return response.data;
        } catch (error) {
            console.error('Error fetching opportunity analysis:', error);
            throw error;
        }
    }

    async createOpportunity(data: Omit<SalesOpportunity, 'id'>): Promise<SalesOpportunity> {
        try {
            const response = await axios.post(`${this.baseURL}/opportunities`, data);
            return response.data;
        } catch (error) {
            console.error('Error creating opportunity:', error);
            throw error;
        }
    }

    async updateOpportunity(id: string, data: Partial<SalesOpportunity>): Promise<SalesOpportunity> {
        try {
            const response = await axios.put(`${this.baseURL}/opportunities/${id}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating opportunity:', error);
            throw error;
        }
    }

    async deleteOpportunity(id: string): Promise<void> {
        try {
            await axios.delete(`${this.baseURL}/opportunities/${id}`);
        } catch (error) {
            console.error('Error deleting opportunity:', error);
            throw error;
        }
    }

    async getCompetitorAnalysis(opportunityId: string) {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities/${opportunityId}/competitors`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch competitor analysis:', error);
            throw error;
        }
    }

    async getPricingStrategy(opportunityId: string) {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities/${opportunityId}/pricing`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch pricing strategy:', error);
            throw error;
        }
    }

    async getSalesStrategy(opportunityId: string) {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities/${opportunityId}/strategy`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch sales strategy:', error);
            throw error;
        }
    }

    async getMetrics(opportunityId: string) {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities/${opportunityId}/metrics`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
            throw error;
        }
    }

    async getNextSteps(opportunityId: string) {
        try {
            const response = await axios.get(`${this.baseURL}/opportunities/${opportunityId}/next-steps`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch next steps:', error);
            throw error;
        }
    }

    // Error handling middleware
    private handleError(error: any) {
        if (error.response) {
            // Server responded with error
            const { status, data } = error.response;
            throw new Error(`API Error ${status}: ${data.message || 'Unknown error'}`);
        } else if (error.request) {
            // Request made but no response
            throw new Error('No response from server');
        } else {
            // Request setup error
            throw new Error(`Request failed: ${error.message}`);
        }
    }
}

export const salesAPI = new SalesAPI();
export default salesAPI; 