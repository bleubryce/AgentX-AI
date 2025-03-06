export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  DIRECT_MAIL = 'direct_mail',
  OPEN_HOUSE = 'open_house',
  OTHER = 'other',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NEGOTIATING = 'negotiating',
  CLOSED = 'closed',
  LOST = 'lost',
}

export enum LeadType {
  BUYER = 'buyer',
  SELLER = 'seller',
  REFINANCE = 'refinance',
  INVESTOR = 'investor',
}

export interface LeadContact {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  preferred_contact_method: string;
  best_time_to_contact?: string;
}

export interface LeadPreferences {
  property_type: string[];
  min_price?: number;
  max_price?: number;
  preferred_locations: string[];
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  must_have_features: string[];
  nice_to_have_features: string[];
}

export interface LeadTimeline {
  desired_move_in_date?: string;
  urgency_level: string;
  financing_status: string;
  pre_approval_amount?: number;
}

export interface LeadInteraction {
  timestamp: string;
  type: string;
  summary: string;
  next_steps?: string;
  next_follow_up?: string;
  created_by: string;
  notes?: string;
}

export interface Lead {
  id?: string;
  contact: LeadContact;
  lead_type: LeadType;
  source: LeadSource;
  status: LeadStatus;
  preferences: LeadPreferences;
  timeline: LeadTimeline;
  interactions: LeadInteraction[];
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  tags: string[];
  metadata: Record<string, string>;
}

export interface LeadCreate {
  contact: LeadContact;
  lead_type: LeadType;
  source: LeadSource;
  preferences: LeadPreferences;
  timeline: LeadTimeline;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface LeadUpdate {
  status?: LeadStatus;
  preferences?: LeadPreferences;
  timeline?: LeadTimeline;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface LeadResponse {
  lead: Lead;
  metadata: Record<string, string>;
  processing_time: number;
}

export interface LeadListResponse {
  leads: Lead[];
  total_count: number;
  page: number;
  page_size: number;
  metadata: Record<string, string>;
  processing_time: number;
} 