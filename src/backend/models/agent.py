from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator, constr
from enum import Enum
from .base import BaseDBModel

class AgentStatus(str, Enum):
    """Agent status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"

class AgentSpecialty(str, Enum):
    """Agent specialty enumeration."""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    LUXURY = "luxury"
    INVESTMENT = "investment"
    NEW_CONSTRUCTION = "new_construction"
    FORECLOSURE = "foreclosure"
    SHORT_SALE = "short_sale"
    RENTAL = "rental"

class AgentLicense(BaseModel):
    """Agent license information."""
    license_number: str = Field(..., description="Real estate license number")
    state: str = Field(..., description="State of licensure")
    expiration_date: datetime = Field(..., description="License expiration date")
    verification_url: Optional[str] = Field(None, description="License verification URL")
    
    @validator("state")
    def validate_state(cls, v):
        """Validate state code."""
        if len(v) != 2 or not v.isalpha():
            raise ValueError("State must be a 2-letter code")
        return v.upper()

class AgentStats(BaseModel):
    """Agent performance statistics."""
    total_leads: int = Field(default=0, description="Total leads assigned")
    active_leads: int = Field(default=0, description="Currently active leads")
    closed_deals: int = Field(default=0, description="Total closed deals")
    revenue_generated: float = Field(default=0.0, description="Total revenue generated")
    avg_response_time: Optional[float] = Field(None, description="Average response time in minutes")
    customer_satisfaction: Optional[float] = Field(
        None,
        ge=0,
        le=5,
        description="Average customer satisfaction rating (0-5)"
    )

class AgentBase(BaseModel):
    """Base Agent model."""
    full_name: constr(min_length=2, max_length=100) = Field(..., description="Agent's full name")
    email: EmailStr = Field(..., description="Agent's email address")
    phone: str = Field(..., pattern=r'^\+?1?\d{9,15}$', description="Agent's phone number")
    status: AgentStatus = Field(default=AgentStatus.PENDING, description="Agent status")
    specialties: List[AgentSpecialty] = Field(
        default_factory=list,
        description="Agent's specialties"
    )
    license: AgentLicense = Field(..., description="Agent's license information")
    bio: Optional[str] = Field(None, max_length=2000, description="Agent's biography")
    profile_image_url: Optional[str] = Field(None, description="URL to agent's profile image")
    service_areas: List[str] = Field(
        default_factory=list,
        description="ZIP codes or area names where agent operates"
    )
    languages: List[str] = Field(
        default_factory=list,
        description="Languages spoken by agent"
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Professional certifications"
    )
    social_media: Optional[Dict[str, str]] = Field(
        None,
        description="Social media profile URLs"
    )
    commission_rate: float = Field(
        ...,
        ge=0,
        le=100,
        description="Agent's commission rate percentage"
    )

class AgentCreate(AgentBase):
    """Create Agent model."""
    password: str = Field(..., min_length=8, description="Agent's password")

class AgentUpdate(BaseModel):
    """Update Agent model."""
    full_name: Optional[constr(min_length=2, max_length=100)] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[AgentStatus] = None
    specialties: Optional[List[AgentSpecialty]] = None
    license: Optional[AgentLicense] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    service_areas: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    social_media: Optional[Dict[str, str]] = None
    commission_rate: Optional[float] = None

class Agent(AgentBase, BaseDBModel):
    """Agent model with database fields."""
    user_id: str = Field(..., description="Associated user ID")
    stats: AgentStats = Field(default_factory=AgentStats, description="Agent statistics")
    last_active: Optional[datetime] = Field(None, description="Last activity timestamp")
    total_commission_earned: float = Field(
        default=0.0,
        description="Total commission earned"
    )
    rating: Optional[float] = Field(
        None,
        ge=0,
        le=5,
        description="Overall agent rating (0-5)"
    )
    review_count: int = Field(default=0, description="Number of reviews received")
    
    class Config:
        """Pydantic model configuration."""
        json_encoders = {datetime: lambda v: v.isoformat()}

class AgentConfig(BaseModel):
    """Configuration for an AI agent."""
    name: str
    description: str
    model: str
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1000, ge=1)
    system_prompt: str
    allowed_features: List[str]
    rate_limit: int = Field(default=100, ge=1)  # requests per minute
    usage_limit: int = Field(default=1000, ge=1)  # tokens per day

class AgentRequest(BaseModel):
    """Model for agent requests with security checks."""
    prompt: str
    features: List[str]
    metadata: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    """Model for agent responses with usage tracking."""
    response: str
    tokens_used: int
    request_id: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class AgentLog(BaseDBModel):
    """Model for logging agent requests and responses."""
    user_id: str
    agent_id: str
    request_id: str
    prompt: str
    response: str
    tokens_used: int
    features_used: List[str]
    status: str  # "success", "error", "rate_limited", "usage_exceeded"
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow) 