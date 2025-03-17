from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from .base import BaseDBModel

class BuyerPreference(BaseModel):
    """Model for buyer property preferences."""
    min_price: Optional[float] = Field(None, description="Minimum price")
    max_price: Optional[float] = Field(None, description="Maximum price")
    min_bedrooms: Optional[float] = Field(None, description="Minimum number of bedrooms")
    min_bathrooms: Optional[float] = Field(None, description="Minimum number of bathrooms")
    min_square_feet: Optional[float] = Field(None, description="Minimum square footage")
    property_types: List[str] = Field(default_factory=list, description="Preferred property types")
    locations: List[str] = Field(default_factory=list, description="Preferred locations")
    must_have_features: List[str] = Field(default_factory=list, description="Must-have features")
    nice_to_have_features: List[str] = Field(default_factory=list, description="Nice-to-have features")
    exclude_features: List[str] = Field(default_factory=list, description="Features to exclude")
    max_commute_time: Optional[int] = Field(None, description="Maximum commute time in minutes")
    commute_location: Optional[str] = Field(None, description="Commute destination")
    school_districts: List[str] = Field(default_factory=list, description="Preferred school districts")
    
    @validator('property_types')
    def validate_property_types(cls, v):
        valid_types = {
            "single_family", "condo", "townhouse", "multi_family", 
            "land", "commercial", "industrial", "farm", "other"
        }
        for property_type in v:
            if property_type not in valid_types:
                raise ValueError(f"Invalid property type: {property_type}. Must be one of: {valid_types}")
        return v

class FinancialInfo(BaseModel):
    """Model for buyer financial information."""
    pre_approved: bool = Field(default=False, description="Whether buyer is pre-approved for a mortgage")
    pre_approval_amount: Optional[float] = Field(None, description="Pre-approved loan amount")
    pre_approval_expiration: Optional[datetime] = Field(None, description="Pre-approval expiration date")
    pre_approval_letter_url: Optional[str] = Field(None, description="URL to pre-approval letter")
    down_payment_amount: Optional[float] = Field(None, description="Down payment amount")
    down_payment_percentage: Optional[float] = Field(None, description="Down payment percentage")
    credit_score_range: Optional[str] = Field(None, description="Credit score range")
    annual_income: Optional[float] = Field(None, description="Annual income")
    debt_to_income_ratio: Optional[float] = Field(None, description="Debt-to-income ratio")
    
    @validator('credit_score_range')
    def validate_credit_score_range(cls, v):
        if v is not None:
            valid_ranges = {
                "300-579", "580-669", "670-739", "740-799", "800-850"
            }
            if v not in valid_ranges:
                raise ValueError(f"Invalid credit score range. Must be one of: {valid_ranges}")
        return v
    
    @validator('down_payment_percentage')
    def validate_down_payment_percentage(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Down payment percentage must be between 0 and 100")
        return v

class BuyerBase(BaseModel):
    """Base buyer model with common fields."""
    user_id: str = Field(..., description="ID of the associated user")
    agent_id: Optional[str] = Field(None, description="ID of the assigned agent")
    status: str = Field(default="active", description="Buyer status")
    preferences: BuyerPreference = Field(default_factory=BuyerPreference, description="Property preferences")
    financial_info: FinancialInfo = Field(default_factory=FinancialInfo, description="Financial information")
    timeline: str = Field(default="3-6_months", description="Buying timeline")
    motivation: Optional[str] = Field(None, description="Buying motivation")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {
            "active", "inactive", "under_contract", "closed", "on_hold"
        }
        if v not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v
    
    @validator('timeline')
    def validate_timeline(cls, v):
        valid_timelines = {
            "immediate", "1-3_months", "3-6_months", "6-12_months", "12+_months", "just_browsing"
        }
        if v not in valid_timelines:
            raise ValueError(f"Invalid timeline. Must be one of: {valid_timelines}")
        return v

class BuyerCreate(BuyerBase):
    """Model for creating a new buyer."""
    pass

class BuyerUpdate(BaseModel):
    """Model for updating an existing buyer."""
    agent_id: Optional[str] = None
    status: Optional[str] = None
    preferences: Optional[BuyerPreference] = None
    financial_info: Optional[FinancialInfo] = None
    timeline: Optional[str] = None
    motivation: Optional[str] = None
    notes: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {
                "active", "inactive", "under_contract", "closed", "on_hold"
            }
            if v not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v
    
    @validator('timeline')
    def validate_timeline(cls, v):
        if v is not None:
            valid_timelines = {
                "immediate", "1-3_months", "3-6_months", "6-12_months", "12+_months", "just_browsing"
            }
            if v not in valid_timelines:
                raise ValueError(f"Invalid timeline. Must be one of: {valid_timelines}")
        return v

class PropertyMatch(BaseModel):
    """Model for property match information."""
    property_id: str = Field(..., description="ID of the matched property")
    match_score: float = Field(..., description="Match score (0-100)")
    match_reasons: List[str] = Field(default_factory=list, description="Reasons for the match")
    viewed: bool = Field(default=False, description="Whether the buyer has viewed the match")
    favorited: bool = Field(default=False, description="Whether the buyer has favorited the match")
    scheduled_viewing: Optional[datetime] = Field(None, description="Scheduled viewing date/time")
    feedback: Optional[str] = Field(None, description="Buyer feedback on the property")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When the match was created")

class Buyer(BuyerBase, BaseDBModel):
    """Complete buyer model with database fields."""
    property_matches: List[PropertyMatch] = Field(default_factory=list, description="Property matches")
    property_views: List[str] = Field(default_factory=list, description="IDs of viewed properties")
    property_favorites: List[str] = Field(default_factory=list, description="IDs of favorited properties")
    search_history: List[Dict[str, Any]] = Field(default_factory=list, description="Search history")
    last_active: Optional[datetime] = Field(None, description="When the buyer was last active")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class BuyerResponse(Buyer):
    """Model for buyer API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()} 