from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, constr
from .base import BaseDBModel

class Address(BaseModel):
    """Model for property address."""
    street: str = Field(..., description="Street address")
    unit: Optional[str] = Field(None, description="Unit or apartment number")
    city: str = Field(..., description="City")
    state: constr(min_length=2, max_length=2) = Field(..., description="State (2-letter code)")
    zip_code: constr(min_length=5, max_length=10) = Field(..., description="ZIP code")
    country: str = Field(default="US", description="Country code")
    
    @validator('state')
    def validate_state(cls, v):
        v = v.upper()
        # List of US state codes
        valid_states = {
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
            "DC", "PR", "VI", "GU", "AS", "MP"
        }
        if v not in valid_states:
            raise ValueError(f"Invalid state code. Must be one of: {valid_states}")
        return v

class Location(BaseModel):
    """Model for property geolocation."""
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    
    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v
    
    @validator('longitude')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v

class PropertyBase(BaseModel):
    """Base property model with common fields."""
    title: str = Field(..., description="Property title")
    description: Optional[str] = Field(None, description="Property description")
    property_type: str = Field(..., description="Type of property")
    status: str = Field(default="active", description="Property listing status")
    address: Address = Field(..., description="Property address")
    location: Optional[Location] = Field(None, description="Property geolocation")
    price: float = Field(..., description="Property price")
    bedrooms: float = Field(..., description="Number of bedrooms")
    bathrooms: float = Field(..., description="Number of bathrooms")
    square_feet: float = Field(..., description="Property size in square feet")
    lot_size: Optional[float] = Field(None, description="Lot size in square feet or acres")
    lot_size_unit: Optional[str] = Field(default="sqft", description="Unit for lot size (sqft or acres)")
    year_built: Optional[int] = Field(None, description="Year the property was built")
    features: List[str] = Field(default_factory=list, description="Property features")
    amenities: List[str] = Field(default_factory=list, description="Property amenities")
    images: List[str] = Field(default_factory=list, description="URLs to property images")
    owner_id: str = Field(..., description="ID of the property owner")
    agent_id: Optional[str] = Field(None, description="ID of the listing agent")
    
    @validator('property_type')
    def validate_property_type(cls, v):
        valid_types = {
            "single_family", "condo", "townhouse", "multi_family", 
            "land", "commercial", "industrial", "farm", "other"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid property type. Must be one of: {valid_types}")
        return v
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {
            "active", "pending", "sold", "off_market", "coming_soon", "expired", "withdrawn"
        }
        if v not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v
    
    @validator('lot_size_unit')
    def validate_lot_size_unit(cls, v):
        if v is not None:
            valid_units = {"sqft", "acres"}
            if v not in valid_units:
                raise ValueError(f"Invalid lot size unit. Must be one of: {valid_units}")
        return v

class PropertyCreate(PropertyBase):
    """Model for creating a new property."""
    pass

class PropertyUpdate(BaseModel):
    """Model for updating an existing property."""
    title: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[str] = None
    status: Optional[str] = None
    address: Optional[Address] = None
    location: Optional[Location] = None
    price: Optional[float] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[float] = None
    lot_size: Optional[float] = None
    lot_size_unit: Optional[str] = None
    year_built: Optional[int] = None
    features: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    agent_id: Optional[str] = None
    
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
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {
                "active", "pending", "sold", "off_market", "coming_soon", "expired", "withdrawn"
            }
            if v not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v
    
    @validator('lot_size_unit')
    def validate_lot_size_unit(cls, v):
        if v is not None:
            valid_units = {"sqft", "acres"}
            if v not in valid_units:
                raise ValueError(f"Invalid lot size unit. Must be one of: {valid_units}")
        return v

class Property(PropertyBase, BaseDBModel):
    """Complete property model with database fields."""
    views: int = Field(default=0, description="Number of views")
    favorites: int = Field(default=0, description="Number of times favorited")
    days_on_market: int = Field(default=0, description="Days on market")
    last_status_change: Optional[datetime] = Field(None, description="When status was last changed")
    listing_date: datetime = Field(default_factory=datetime.utcnow, description="When property was listed")
    sold_date: Optional[datetime] = Field(None, description="When property was sold")
    sold_price: Optional[float] = Field(None, description="Final sold price")
    tax_data: Dict[str, Any] = Field(default_factory=dict, description="Property tax information")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class PropertyResponse(Property):
    """Model for property API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class PropertySearch(BaseModel):
    """Model for property search parameters."""
    location: Optional[str] = Field(None, description="Location search term (city, zip, etc.)")
    min_price: Optional[float] = Field(None, description="Minimum price")
    max_price: Optional[float] = Field(None, description="Maximum price")
    min_bedrooms: Optional[float] = Field(None, description="Minimum number of bedrooms")
    min_bathrooms: Optional[float] = Field(None, description="Minimum number of bathrooms")
    min_square_feet: Optional[float] = Field(None, description="Minimum square footage")
    property_types: Optional[List[str]] = Field(None, description="Property types to include")
    statuses: Optional[List[str]] = Field(None, description="Property statuses to include")
    features: Optional[List[str]] = Field(None, description="Required features")
    max_days_on_market: Optional[int] = Field(None, description="Maximum days on market")
    radius: Optional[float] = Field(None, description="Search radius in miles")
    sort_by: Optional[str] = Field("listing_date", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc or desc)")
    
    @validator('sort_by')
    def validate_sort_by(cls, v):
        valid_fields = {
            "price", "bedrooms", "bathrooms", "square_feet", 
            "year_built", "listing_date", "days_on_market"
        }
        if v not in valid_fields:
            raise ValueError(f"Invalid sort field. Must be one of: {valid_fields}")
        return v
    
    @validator('sort_order')
    def validate_sort_order(cls, v):
        valid_orders = {"asc", "desc"}
        if v not in valid_orders:
            raise ValueError(f"Invalid sort order. Must be one of: {valid_orders}")
        return v 