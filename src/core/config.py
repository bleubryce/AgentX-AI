"""
Configuration classes for the Real Estate Lead Generation AI Agents
"""

import os
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator

class DataSourceConfig(BaseModel):
    """Configuration for a data source"""
    name: str
    enabled: bool = True
    api_key: Optional[str] = None
    url: Optional[str] = None
    params: Dict[str, Union[str, int, float, bool]] = Field(default_factory=dict)
    rate_limit: Optional[int] = None  # Requests per minute
    
    @validator('api_key', pre=True, always=True)
    def check_api_key(cls, v, values):
        """Check if API key is provided or available in environment"""
        if v is None and 'name' in values:
            env_var = f"{values['name'].upper()}_API_KEY"
            v = os.getenv(env_var)
        return v

class LeadQualificationConfig(BaseModel):
    """Configuration for lead qualification criteria"""
    min_score: float = 0.5  # Minimum score to consider a lead qualified
    intent_weight: float = 0.3  # Weight for intent signals
    timeline_weight: float = 0.2  # Weight for timeline signals
    financial_weight: float = 0.3  # Weight for financial qualification
    engagement_weight: float = 0.2  # Weight for engagement signals
    
    @validator('intent_weight', 'timeline_weight', 'financial_weight', 'engagement_weight')
    def check_weights_sum(cls, v, values):
        """Ensure weights sum to 1.0"""
        total = v
        for weight in ['intent_weight', 'timeline_weight', 'financial_weight', 'engagement_weight']:
            if weight in values:
                total += values[weight]
        if abs(total - 1.0) > 0.01 and len(values) == 3:  # Only check when all weights are set
            raise ValueError("Qualification weights must sum to 1.0")
        return v

class EngagementConfig(BaseModel):
    """Configuration for lead engagement"""
    email_enabled: bool = True
    sms_enabled: bool = False
    social_enabled: bool = False
    max_follow_ups: int = 5
    follow_up_interval_days: int = 3
    templates: Dict[str, str] = Field(default_factory=dict)

class GeographicConfig(BaseModel):
    """Configuration for geographic targeting"""
    zip_codes: List[str] = Field(default_factory=list)
    cities: List[str] = Field(default_factory=list)
    counties: List[str] = Field(default_factory=list)
    states: List[str] = Field(default_factory=list)
    radius_miles: Optional[int] = None
    center_point: Optional[Dict[str, float]] = None  # {lat: float, lng: float}

class PropertyConfig(BaseModel):
    """Configuration for property targeting"""
    types: List[str] = Field(default_factory=lambda: ["single-family", "multi-family", "condo", "townhouse"])
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    min_beds: Optional[int] = None
    max_beds: Optional[int] = None
    min_baths: Optional[int] = None
    max_baths: Optional[int] = None
    min_sqft: Optional[int] = None
    max_sqft: Optional[int] = None
    year_built_min: Optional[int] = None
    year_built_max: Optional[int] = None

class BuyerAgentConfig(BaseModel):
    """Configuration specific to buyer lead agents"""
    first_time_buyer_focus: bool = False
    relocating_focus: bool = False
    investment_focus: bool = False
    timeline_months: Optional[int] = None  # How soon they want to buy

class SellerAgentConfig(BaseModel):
    """Configuration specific to seller lead agents"""
    ownership_years_min: Optional[int] = None  # Minimum years of ownership
    equity_percentage_min: Optional[float] = None  # Minimum equity percentage
    life_events_focus: bool = False  # Focus on life events (divorce, death, etc.)
    expired_listings_focus: bool = False  # Focus on expired listings

class RefinanceAgentConfig(BaseModel):
    """Configuration specific to refinance lead agents"""
    rate_difference_min: float = 0.5  # Minimum interest rate difference
    loan_age_years_min: int = 1  # Minimum age of current loan
    loan_age_years_max: Optional[int] = None  # Maximum age of current loan
    equity_percentage_min: Optional[float] = None  # Minimum equity percentage
    credit_score_min: Optional[int] = None  # Minimum credit score

class AgentConfig(BaseModel):
    """Master configuration for an agent"""
    name: str
    description: Optional[str] = None
    data_sources: List[DataSourceConfig] = Field(default_factory=list)
    qualification: LeadQualificationConfig = Field(default_factory=LeadQualificationConfig)
    engagement: EngagementConfig = Field(default_factory=EngagementConfig)
    geographic: GeographicConfig = Field(default_factory=GeographicConfig)
    property: PropertyConfig = Field(default_factory=PropertyConfig)
    
    # Type-specific configurations
    buyer_config: Optional[BuyerAgentConfig] = None
    seller_config: Optional[SellerAgentConfig] = None
    refinance_config: Optional[RefinanceAgentConfig] = None
    
    # Runtime configuration
    max_leads_per_run: int = 100
    request_delay_seconds: float = 1.0
    proxy_enabled: bool = False
    
    class Config:
        """Pydantic config"""
        validate_assignment = True

# Default configurations
DEFAULT_BUYER_CONFIG = AgentConfig(
    name="Default Buyer Lead Agent",
    description="Finds potential home buyers",
    data_sources=[
        DataSourceConfig(name="zillow"),
        DataSourceConfig(name="realtor"),
        DataSourceConfig(name="rentcast"),
        DataSourceConfig(name="facebook")
    ],
    buyer_config=BuyerAgentConfig()
)

DEFAULT_SELLER_CONFIG = AgentConfig(
    name="Default Seller Lead Agent",
    description="Finds potential home sellers",
    data_sources=[
        DataSourceConfig(name="county_records"),
        DataSourceConfig(name="attom"),
        DataSourceConfig(name="rentcast"),
        DataSourceConfig(name="linkedin")
    ],
    seller_config=SellerAgentConfig()
)

DEFAULT_REFINANCE_CONFIG = AgentConfig(
    name="Default Refinance Lead Agent",
    description="Finds potential refinance clients",
    data_sources=[
        DataSourceConfig(name="mortgage_records"),
        DataSourceConfig(name="credit_agencies"),
        DataSourceConfig(name="rentcast"),
        DataSourceConfig(name="rate_trackers")
    ],
    refinance_config=RefinanceAgentConfig()
) 