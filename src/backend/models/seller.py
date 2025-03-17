from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from .base import BaseDBModel

class PropertyInfo(BaseModel):
    """Model for seller's property information."""
    property_id: Optional[str] = Field(None, description="ID of the property if already in system")
    address: Optional[str] = Field(None, description="Property address if not yet in system")
    property_type: Optional[str] = Field(None, description="Type of property")
    estimated_value: Optional[float] = Field(None, description="Estimated property value")
    desired_price: Optional[float] = Field(None, description="Seller's desired selling price")
    bedrooms: Optional[float] = Field(None, description="Number of bedrooms")
    bathrooms: Optional[float] = Field(None, description="Number of bathrooms")
    square_feet: Optional[float] = Field(None, description="Property size in square feet")
    lot_size: Optional[float] = Field(None, description="Lot size")
    year_built: Optional[int] = Field(None, description="Year the property was built")
    last_renovation_year: Optional[int] = Field(None, description="Year of last major renovation")
    features: List[str] = Field(default_factory=list, description="Property features")
    condition: Optional[str] = Field(None, description="Property condition")
    
    @validator('property_type')
    def validate_property_type(cls, v):
        if v is not None:
            valid_types = {
                "single_family", "condo", "townhouse", "multi_family", 
                "land", "commercial", "industrial", "farm", "other"
            }
            if v not in valid_types:
                raise ValueError(f"Invalid property type. Must be one of: {valid_types}")
        return v
    
    @validator('condition')
    def validate_condition(cls, v):
        if v is not None:
            valid_conditions = {
                "excellent", "good", "fair", "needs_work", "fixer_upper"
            }
            if v not in valid_conditions:
                raise ValueError(f"Invalid condition. Must be one of: {valid_conditions}")
        return v

class SellingInfo(BaseModel):
    """Model for seller's selling information."""
    timeline: str = Field(default="3-6_months", description="Selling timeline")
    motivation: Optional[str] = Field(None, description="Selling motivation")
    has_mortgage: bool = Field(default=True, description="Whether the property has a mortgage")
    mortgage_balance: Optional[float] = Field(None, description="Remaining mortgage balance")
    has_listed_before: bool = Field(default=False, description="Whether the property was listed before")
    previous_listing_info: Optional[Dict[str, Any]] = Field(None, description="Information about previous listing")
    reason_for_selling: Optional[str] = Field(None, description="Reason for selling")
    preferred_showing_times: List[str] = Field(default_factory=list, description="Preferred showing times")
    
    @validator('timeline')
    def validate_timeline(cls, v):
        valid_timelines = {
            "immediate", "1-3_months", "3-6_months", "6-12_months", "12+_months", "just_exploring"
        }
        if v not in valid_timelines:
            raise ValueError(f"Invalid timeline. Must be one of: {valid_timelines}")
        return v

class SellerBase(BaseModel):
    """Base seller model with common fields."""
    user_id: str = Field(..., description="ID of the associated user")
    agent_id: Optional[str] = Field(None, description="ID of the assigned agent")
    status: str = Field(default="active", description="Seller status")
    property_info: PropertyInfo = Field(default_factory=PropertyInfo, description="Property information")
    selling_info: SellingInfo = Field(default_factory=SellingInfo, description="Selling information")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {
            "active", "inactive", "under_contract", "closed", "on_hold"
        }
        if v not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class SellerCreate(SellerBase):
    """Model for creating a new seller."""
    pass

class SellerUpdate(BaseModel):
    """Model for updating an existing seller."""
    agent_id: Optional[str] = None
    status: Optional[str] = None
    property_info: Optional[PropertyInfo] = None
    selling_info: Optional[SellingInfo] = None
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

class MarketAnalysis(BaseModel):
    """Model for property market analysis."""
    estimated_value: float = Field(..., description="Estimated property value")
    value_range: Dict[str, float] = Field(..., description="Value range (min/max)")
    comparable_properties: List[Dict[str, Any]] = Field(default_factory=list, description="Comparable properties")
    market_trends: Dict[str, Any] = Field(default_factory=dict, description="Market trends")
    recommended_price: float = Field(..., description="Recommended listing price")
    estimated_days_on_market: int = Field(..., description="Estimated days on market")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When analysis was created")

class Seller(SellerBase, BaseDBModel):
    """Complete seller model with database fields."""
    market_analysis: Optional[MarketAnalysis] = Field(None, description="Property market analysis")
    listing_history: List[Dict[str, Any]] = Field(default_factory=list, description="Listing history")
    showing_history: List[Dict[str, Any]] = Field(default_factory=list, description="Showing history")
    offer_history: List[Dict[str, Any]] = Field(default_factory=list, description="Offer history")
    last_active: Optional[datetime] = Field(None, description="When the seller was last active")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class SellerResponse(Seller):
    """Model for seller API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()} 