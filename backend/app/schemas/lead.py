from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.lead import LeadStatus, LeadSource

class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    source: LeadSource = LeadSource.WEBSITE
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    notes: Optional[str] = None

class LeadInDBBase(LeadBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Lead(LeadInDBBase):
    pass

class LeadInDB(LeadInDBBase):
    pass 