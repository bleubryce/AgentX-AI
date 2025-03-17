from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from .base import BaseDBModel

class ContentBase(BaseModel):
    """Base content model with common fields."""
    title: str = Field(..., description="Content title")
    content_type: str = Field(..., description="Type of content")
    body: str = Field(..., description="Content body")
    summary: Optional[str] = Field(None, description="Content summary")
    tags: List[str] = Field(default_factory=list, description="Content tags")
    status: str = Field(default="draft", description="Content status")
    related_entity_id: Optional[str] = Field(None, description="ID of related entity (property, lead, etc.)")
    related_entity_type: Optional[str] = Field(None, description="Type of related entity")
    created_by: str = Field(..., description="ID of the user who created the content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        valid_types = {
            "property_description", "social_post", "email_campaign", 
            "blog_post", "listing_ad", "newsletter", "market_report"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid content type. Must be one of: {valid_types}")
        return v
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {"draft", "published", "archived", "scheduled"}
        if v not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class ContentCreate(ContentBase):
    """Model for creating new content."""
    scheduled_for: Optional[datetime] = Field(None, description="When to publish the content")

class ContentUpdate(BaseModel):
    """Model for updating existing content."""
    title: Optional[str] = None
    body: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {"draft", "published", "archived", "scheduled"}
            if v not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class Content(ContentBase, BaseDBModel):
    """Complete content model with database fields."""
    scheduled_for: Optional[datetime] = Field(None, description="When to publish the content")
    published_at: Optional[datetime] = Field(None, description="When the content was published")
    last_updated_by: Optional[str] = Field(None, description="ID of the user who last updated the content")
    version: int = Field(default=1, description="Content version")
    revision_history: List[Dict[str, Any]] = Field(default_factory=list, description="Revision history")

class ContentResponse(Content):
    """Model for content API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class ContentTemplateBase(BaseModel):
    """Base content template model with common fields."""
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    content_type: str = Field(..., description="Type of content")
    template: str = Field(..., description="Content template")
    variables: List[str] = Field(default_factory=list, description="Template variables")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        valid_types = {
            "property_description", "social_post", "email_campaign", 
            "blog_post", "listing_ad", "newsletter", "market_report"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid content type. Must be one of: {valid_types}")
        return v

class ContentTemplateCreate(ContentTemplateBase):
    """Model for creating a new content template."""
    pass

class ContentTemplateUpdate(BaseModel):
    """Model for updating an existing content template."""
    name: Optional[str] = None
    description: Optional[str] = None
    template: Optional[str] = None
    variables: Optional[List[str]] = None

class ContentTemplate(ContentTemplateBase, BaseDBModel):
    """Complete content template model with database fields."""
    usage_count: int = Field(default=0, description="Number of times the template has been used")
    last_used: Optional[datetime] = Field(None, description="When the template was last used")

class ContentPerformance(BaseDBModel):
    """Model for tracking content performance metrics."""
    content_id: str = Field(..., description="ID of the content")
    views: int = Field(default=0, description="Number of views")
    likes: int = Field(default=0, description="Number of likes")
    shares: int = Field(default=0, description="Number of shares")
    comments: int = Field(default=0, description="Number of comments")
    clicks: int = Field(default=0, description="Number of clicks")
    conversions: int = Field(default=0, description="Number of conversions")
    engagement_rate: float = Field(default=0.0, description="Engagement rate")
    performance_by_platform: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Performance by platform")
    performance_by_demographic: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Performance by demographic")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="When metrics were last updated")

class ContentGenerationRequest(BaseModel):
    """Model for content generation requests."""
    content_type: str = Field(..., description="Type of content to generate")
    parameters: Dict[str, Any] = Field(..., description="Generation parameters")
    template_id: Optional[str] = Field(None, description="ID of template to use")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        valid_types = {
            "property_description", "social_post", "email_campaign", 
            "blog_post", "listing_ad", "newsletter", "market_report"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid content type. Must be one of: {valid_types}")
        return v 