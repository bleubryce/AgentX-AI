export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
  INACTIVE = 'INACTIVE'
}

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  COLD_CALL = 'COLD_CALL',
  EVENT = 'EVENT',
  PARTNER = 'PARTNER',
  OTHER = 'OTHER'
}

export enum PropertyType {
  SINGLE_FAMILY = 'SINGLE_FAMILY',
  MULTI_FAMILY = 'MULTI_FAMILY',
  CONDO = 'CONDO',
  TOWNHOUSE = 'TOWNHOUSE',
  LAND = 'LAND',
  COMMERCIAL = 'COMMERCIAL',
  OTHER = 'OTHER'
}

export enum ActivityType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSIGNED = 'ASSIGNED',
  OTHER = 'OTHER'
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface Budget {
  min: number;
  max: number;
  currency: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  title?: string;
  description?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
  };
  oldValue?: string;
  newValue?: string;
}

export interface LeadInteraction {
  id: string;
  leadId: string;
  type: string;
  date: string;
  notes: string;
  outcome: string;
  nextSteps?: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  priority: number;
  source: LeadSource;
  tags: string[];
  notes?: string;
  assignedAgentId?: string;
  location: Location;
  budget: Budget;
  propertyType: PropertyType;
  preferredContactMethod: string;
  createdAt: string;
  updatedAt: string;
  lastContact?: string;
  nextFollowUp?: string;
  activities?: LeadActivity[];
  interactions?: LeadInteraction[];
}

export interface LeadCreate {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  priority: number;
  source: LeadSource;
  tags: string[];
  notes?: string;
  assignedAgentId?: string;
  location: Location;
  budget: Budget;
  propertyType: PropertyType;
  preferredContactMethod: string;
  nextFollowUp?: string;
}

export interface LeadUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  priority?: number;
  source?: LeadSource;
  tags?: string[];
  notes?: string;
  assignedAgentId?: string;
  location?: Location;
  budget?: Budget;
  propertyType?: PropertyType;
  preferredContactMethod?: string;
  nextFollowUp?: string;
} 