"""
Lead Management Models
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, EmailStr, constr
from enum import Enum

class LeadSource(str, Enum):
    """Lead source enumeration"""
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    DIRECT_MAIL = "direct_mail"
    OPEN_HOUSE = "open_house"
    OTHER = "other"

class LeadStatus(str, Enum):
    """Lead status enumeration"""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    NEGOTIATING = "negotiating"
    CLOSED = "closed"
    LOST = "lost"

class LeadType(str, Enum):
    """Lead type enumeration"""
    BUYER = "buyer"
    SELLER = "seller"
    REFINANCE = "refinance"
    INVESTOR = "investor"

class LeadContact(BaseModel):
    """Lead contact information"""
    first_name: constr(min_length=1, max_length=50)
    last_name: constr(min_length=1, max_length=50)
    email: EmailStr
    phone: Optional[constr(regex=r'^\+?1?\d{9,15}$')] = None
    preferred_contact_method: str = "email"
    best_time_to_contact: Optional[str] = None

class LeadPreferences(BaseModel):
    """Lead preferences and requirements"""
    property_type: List[str]
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    preferred_locations: List[str]
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    square_feet: Optional[float] = None
    must_have_features: List[str] = []
    nice_to_have_features: List[str] = []

class LeadTimeline(BaseModel):
    """Lead timeline information"""
    desired_move_in_date: Optional[datetime] = None
    urgency_level: str = "normal"  # low, normal, high
    financing_status: str = "not_started"  # not_started, pre_approved, approved
    pre_approval_amount: Optional[float] = None

class LeadInteraction(BaseModel):
    """Lead interaction record"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: str  # call, email, meeting, etc.
    summary: str
    next_steps: Optional[str] = None
    next_follow_up: Optional[datetime] = None
    created_by: str
    notes: Optional[str] = None

class Lead(BaseModel):
    """Main lead model"""
    id: Optional[str] = None
    contact: LeadContact
    lead_type: LeadType
    source: LeadSource
    status: LeadStatus = LeadStatus.NEW
    preferences: LeadPreferences
    timeline: LeadTimeline
    interactions: List[LeadInteraction] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_to: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, str] = {}

class LeadCreate(BaseModel):
    """Model for creating a new lead"""
    contact: LeadContact
    lead_type: LeadType
    source: LeadSource
    preferences: LeadPreferences
    timeline: LeadTimeline
    assigned_to: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, str] = {}

class LeadUpdate(BaseModel):
    """Model for updating an existing lead"""
    status: Optional[LeadStatus] = None
    preferences: Optional[LeadPreferences] = None
    timeline: Optional[LeadTimeline] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, str]] = None

class LeadResponse(BaseModel):
    """Response model for lead operations"""
    lead: Lead
    metadata: Dict[str, str]
    processing_time: float

class LeadListResponse(BaseModel):
    """Response model for lead list operations"""
    leads: List[Lead]
    total_count: int
    page: int
    page_size: int
    metadata: Dict[str, str]
    processing_time: float 