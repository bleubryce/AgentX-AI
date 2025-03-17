from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator, constr
from .base import BaseDBModel
from enum import Enum

class LeadStatus(str, Enum):
    """Lead status enumeration."""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class LeadSource(str, Enum):
    """Lead source enumeration."""
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    COLD_CALL = "cold_call"
    EMAIL_CAMPAIGN = "email_campaign"
    PARTNER = "partner"
    OTHER = "other"

class PropertyType(str, Enum):
    """Property type enumeration."""
    SINGLE_FAMILY = "single_family"
    MULTI_FAMILY = "multi_family"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    LAND = "land"
    COMMERCIAL = "commercial"
    OTHER = "other"

class LeadInterest(str, Enum):
    """Lead interest enumeration."""
    BUYING = "buying"
    SELLING = "selling"
    RENTING = "renting"
    INVESTING = "investing"
    MORTGAGE = "mortgage"
    OTHER = "other"

class Location(BaseModel):
    """Location model."""
    address: str = Field(..., description="Full address")
    city: str = Field(..., description="City name")
    state: str = Field(..., description="State code")
    zip_code: str = Field(..., description="ZIP code")
    country: str = Field(default="USA", description="Country name")
    coordinates: Optional[Dict[str, float]] = Field(
        None,
        description="GeoJSON coordinates {longitude, latitude}"
    )

    @validator("zip_code")
    def validate_zip_code(cls, v):
        """Validate ZIP code format."""
        if not v.replace("-", "").isdigit():
            raise ValueError("Invalid ZIP code format")
        return v

    @validator("state")
    def validate_state(cls, v):
        """Validate state code."""
        if len(v) != 2 or not v.isalpha():
            raise ValueError("State must be a 2-letter code")
        return v.upper()

class Budget(BaseModel):
    """Budget model."""
    min_amount: Optional[float] = Field(None, ge=0, description="Minimum budget amount")
    max_amount: Optional[float] = Field(None, ge=0, description="Maximum budget amount")
    currency: str = Field(default="USD", description="Currency code")

    @validator("max_amount")
    def validate_max_amount(cls, v, values):
        """Validate max amount is greater than min amount."""
        if v and values.get("min_amount") and v < values["min_amount"]:
            raise ValueError("Maximum amount must be greater than minimum amount")
        return v

class LeadBase(BaseModel):
    """Base Lead model."""
    full_name: constr(min_length=2, max_length=100) = Field(..., description="Lead's full name")
    email: EmailStr = Field(..., description="Lead's email address")
    phone: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$', description="Lead's phone number")
    status: LeadStatus = Field(default=LeadStatus.NEW, description="Lead status")
    source: LeadSource = Field(..., description="Lead source")
    interest: List[LeadInterest] = Field(..., description="Lead's interests")
    property_type: PropertyType = Field(..., description="Property type of interest")
    location: Location = Field(..., description="Property location")
    budget: Optional[Budget] = Field(None, description="Lead's budget")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")
    assigned_agent_id: Optional[str] = Field(None, description="Assigned agent's ID")
    tags: List[str] = Field(default_factory=list, description="Lead tags")
    priority: int = Field(default=1, ge=1, le=5, description="Lead priority (1-5)")

class LeadCreate(LeadBase):
    """Create Lead model."""
    pass

class LeadUpdate(BaseModel):
    """Update Lead model."""
    full_name: Optional[constr(min_length=2, max_length=100)] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    interest: Optional[List[LeadInterest]] = None
    property_type: Optional[PropertyType] = None
    location: Optional[Location] = None
    budget: Optional[Budget] = None
    notes: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: Optional[int] = None

class Lead(LeadBase, BaseDBModel):
    """Lead model with database fields."""
    last_contact: Optional[datetime] = Field(None, description="Last contact timestamp")
    next_followup: Optional[datetime] = Field(None, description="Next followup timestamp")
    conversion_probability: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Probability of conversion (0-100)"
    )
    total_interactions: int = Field(default=0, description="Total number of interactions")
    
    class Config:
        """Pydantic model configuration."""
        json_encoders = {datetime: lambda v: v.isoformat()}

class LeadActivity(BaseModel):
    """Model for lead activity."""
    activity_type: str = Field(..., description="Type of activity")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the activity occurred")
    performed_by: str = Field(..., description="ID of the user who performed the activity")
    notes: Optional[str] = Field(None, description="Activity notes")
    old_value: Optional[Any] = Field(None, description="Previous value (for changes)")
    new_value: Optional[Any] = Field(None, description="New value (for changes)")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional activity details")
    
    @validator('activity_type')
    def validate_activity_type(cls, v):
        valid_types = {
            "created", "status_changed", "score_updated", "assigned", 
            "note_added", "contacted", "meeting_scheduled", "meeting_completed",
            "document_added", "converted", "other"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid activity type. Must be one of: {valid_types}")
        return v

class LeadContact(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class LeadPreferences(BaseModel):
    property_type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_beds: Optional[int] = None
    max_beds: Optional[int] = None
    min_baths: Optional[float] = None
    max_baths: Optional[float] = None
    min_sqft: Optional[int] = None
    max_sqft: Optional[int] = None
    preferred_locations: Optional[List[str]] = None

class LeadTimeline(BaseModel):
    timeline: str = Field(..., description="e.g., 'buying in 3 months', 'selling next year'")
    urgency: str = Field(..., description="e.g., 'high', 'medium', 'low'")
    financing_type: Optional[str] = None  # e.g., 'cash', 'conventional', 'FHA'
    down_payment: Optional[float] = None

class LeadInteraction(BaseModel):
    type: str  # e.g., 'email', 'call', 'meeting'
    date: datetime
    notes: str
    outcome: str
    next_steps: Optional[str] = None
    agent_id: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    contact: LeadContact
    preferences: LeadPreferences
    timeline: LeadTimeline
    source: str
    status: str
    qualification_score: Optional[float]
    ai_insights: Optional[Dict[str, Any]]
    assigned_agent: Optional[str]
    last_contacted: Optional[datetime]
    tags: List[str]
    created_at: datetime
    updated_at: datetime 