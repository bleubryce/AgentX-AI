from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator
from .base import BaseDBModel

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

class Lead(BaseDBModel):
    contact: LeadContact
    preferences: LeadPreferences
    timeline: LeadTimeline
    source: str
    status: str = "new"  # e.g., 'new', 'contacted', 'qualified', 'converted', 'lost'
    interactions: List[LeadInteraction] = []
    qualification_score: Optional[float] = None
    ai_insights: Optional[Dict[str, Any]] = None
    assigned_agent: Optional[str] = None
    last_contacted: Optional[datetime] = None
    tags: List[str] = []

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['new', 'contacted', 'qualified', 'converted', 'lost']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of {valid_statuses}')
        return v

class LeadCreate(BaseModel):
    contact: LeadContact
    preferences: LeadPreferences
    timeline: LeadTimeline
    source: str
    tags: Optional[List[str]] = []

class LeadUpdate(BaseModel):
    contact: Optional[LeadContact] = None
    preferences: Optional[LeadPreferences] = None
    timeline: Optional[LeadTimeline] = None
    status: Optional[str] = None
    qualification_score: Optional[float] = None
    ai_insights: Optional[Dict[str, Any]] = None
    assigned_agent: Optional[str] = None
    tags: Optional[List[str]] = None

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