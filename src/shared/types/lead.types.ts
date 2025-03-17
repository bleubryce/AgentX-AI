import { z } from 'zod';

// Base interfaces
export interface Location {
    city: string;
    state: string;
    zipCode: string;
    address?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface Budget {
    min: number;
    max: number;
    currency: string;
    isFlexible: boolean;
}

export interface LeadContact {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    preferredContactMethod: 'email' | 'phone' | 'both';
    bestTimeToContact?: string[];
}

export interface LeadPreferences {
    propertyType: string[];
    bedrooms: number;
    bathrooms: number;
    squareFeet?: {
        min: number;
        max: number;
    };
    amenities?: string[];
    location: Location;
    budget: Budget;
}

export interface LeadActivity {
    id: string;
    type: 'email' | 'call' | 'meeting' | 'note' | 'other';
    timestamp: string;
    description: string;
    outcome?: string;
    nextSteps?: string;
    agentId: string;
}

export interface LeadInteraction {
    id: string;
    type: string;
    timestamp: string;
    channel: string;
    content: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    tags?: string[];
    agentId: string;
}

export interface LeadTimeline {
    id: string;
    event: string;
    timestamp: string;
    details: Record<string, any>;
}

// Main Lead interface
export interface Lead {
    id: string;
    source: string;
    status: 'new' | 'contacted' | 'qualified' | 'negotiating' | 'closed' | 'lost';
    score: number;
    contact: LeadContact;
    preferences: LeadPreferences;
    activities: LeadActivity[];
    interactions: LeadInteraction[];
    timeline: LeadTimeline[];
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
    tags?: string[];
    notes?: string;
}

// Lead creation and update interfaces
export interface LeadCreate extends Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'interactions' | 'timeline'> {
    source: string;
    contact: LeadContact;
    preferences: LeadPreferences;
}

export type LeadUpdateContact = {
    [K in keyof LeadContact]?: LeadContact[K];
};

export type LeadUpdatePreferences = {
    [K in keyof LeadPreferences]?: LeadPreferences[K];
};

export interface LeadUpdate {
    status?: Lead['status'];
    score?: number;
    contact?: LeadUpdateContact;
    preferences?: LeadUpdatePreferences;
    assignedTo?: string;
    tags?: string[];
    notes?: string;
}

// Analytics and reporting interfaces
export interface LeadStats {
    total: number;
    qualified: number;
    conversion: number;
    averageScore: number;
}

export interface LeadSourceStats extends LeadStats {
    source: string;
    costPerLead: number;
}

export interface LeadTrendData {
    date: string;
    newLeads: number;
    qualifiedLeads: number;
    conversions: number;
    revenue: number;
}

export interface LeadMetrics {
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number;
    averageResponseTime: number;
    costPerLead: number;
    leadsBySource: Record<string, number>;
    leadsByStatus: Record<string, number>;
}

// Filtering and response interfaces
export interface LeadFilters {
    source?: string[];
    status?: Lead['status'][];
    minScore?: number;
    maxScore?: number;
    dateRange?: {
        start: string;
        end: string;
    };
    assignedTo?: string[];
    tags?: string[];
}

export interface LeadResponse {
    lead: Lead;
    relatedLeads?: Lead[];
    metrics?: LeadMetrics;
}

export interface LeadListResponse {
    leads: Lead[];
    total: number;
    page: number;
    pageSize: number;
    filters?: LeadFilters;
}

// Validation schema
export const LeadSchema = z.object({
    id: z.string(),
    source: z.string(),
    status: z.enum(['new', 'contacted', 'qualified', 'negotiating', 'closed', 'lost']),
    score: z.number().min(0).max(100),
    contact: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        preferredContactMethod: z.enum(['email', 'phone', 'both']),
        bestTimeToContact: z.array(z.string()).optional()
    }),
    preferences: z.object({
        propertyType: z.array(z.string()),
        bedrooms: z.number().min(0),
        bathrooms: z.number().min(0),
        squareFeet: z.object({
            min: z.number(),
            max: z.number()
        }).optional(),
        amenities: z.array(z.string()).optional(),
        location: z.object({
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
            address: z.string().optional(),
            coordinates: z.object({
                latitude: z.number(),
                longitude: z.number()
            }).optional()
        }),
        budget: z.object({
            min: z.number(),
            max: z.number(),
            currency: z.string(),
            isFlexible: z.boolean()
        })
    })
});

export type LeadType = z.infer<typeof LeadSchema>; 