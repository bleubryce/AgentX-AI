export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST'
}

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  OTHER = 'OTHER'
}

export interface Lead {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
}

export interface LeadStats {
    total: number;
    converted: number;
    conversionRate: number;
}

export interface LeadSourceStats extends LeadStats {
    source: LeadSource;
}

export interface LeadTrendData {
    date: string;
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
}

export interface LeadFilters {
    status?: LeadStatus;
    source?: LeadSource;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
} 