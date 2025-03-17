import { ApiClient } from './client';
import { Lead, LeadStatus, LeadSource } from '../../types/lead';

interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  assignedAgentId?: string;
  propertyType?: string;
  minPriority?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastContactAfter?: Date;
  tags?: string[];
  skip?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: number;
}

interface LeadStatistics {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageResponseTime: number;
  sourceDistribution: Record<LeadSource, number>;
  statusDistribution: Record<LeadStatus, number>;
}

interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  description: string;
  createdAt: Date;
  createdBy: string;
}

export class LeadService {
  private static instance: LeadService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): LeadService {
    if (!LeadService.instance) {
      LeadService.instance = new LeadService();
    }
    return LeadService.instance;
  }

  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString());
          } else if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    return this.apiClient.get<Lead[]>(`/leads?${queryParams.toString()}`);
  }

  async getLead(id: string): Promise<Lead> {
    return this.apiClient.get<Lead>(`/leads/${id}`);
  }

  async createLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
    return this.apiClient.post<Lead>('/leads', lead);
  }

  async updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
    return this.apiClient.put<Lead>(`/leads/${id}`, lead);
  }

  async deleteLead(id: string): Promise<void> {
    return this.apiClient.delete<void>(`/leads/${id}`);
  }

  async getLeadActivities(leadId: string, limit = 50): Promise<LeadActivity[]> {
    return this.apiClient.get<LeadActivity[]>(`/leads/${leadId}/activities`, {
      params: { limit }
    });
  }

  async getLeadStatistics(): Promise<LeadStatistics> {
    return this.apiClient.get<LeadStatistics>('/leads/statistics');
  }

  async getLeadsByStatus(): Promise<Record<LeadStatus, number>> {
    return this.apiClient.get<Record<LeadStatus, number>>('/leads/stats/by-status');
  }

  async getLeadsBySource(): Promise<Record<LeadSource, number>> {
    return this.apiClient.get<Record<LeadSource, number>>('/leads/stats/by-source');
  }

  async getConversionRates(): Promise<Record<LeadSource, number>> {
    return this.apiClient.get<Record<LeadSource, number>>('/leads/stats/conversion-rates');
  }

  async updateConversionProbability(leadId: string, probability: number): Promise<void> {
    return this.apiClient.put<void>(`/leads/${leadId}/probability`, { probability });
  }
} 