from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from .base import BaseDBModel

class CommunicationBase(BaseModel):
    """Base communication model with common fields."""
    client_id: str = Field(..., description="ID of the client")
    communication_type: str = Field(..., description="Type of communication")
    subject: str = Field(..., description="Communication subject")
    content: str = Field(..., description="Communication content")
    status: str = Field(default="draft", description="Communication status")
    template_id: Optional[str] = Field(None, description="ID of the template used")
    sequence_id: Optional[str] = Field(None, description="ID of the sequence this is part of")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('communication_type')
    def validate_communication_type(cls, v):
        valid_types = {"email", "sms", "push", "in_app"}
        if v not in valid_types:
            raise ValueError(f"Invalid communication type. Must be one of: {valid_types}")
        return v
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {"draft", "scheduled", "sent", "delivered", "failed", "cancelled"}
        if v not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class CommunicationCreate(CommunicationBase):
    """Model for creating a new communication."""
    scheduled_for: Optional[datetime] = Field(None, description="When to send the communication")

class CommunicationUpdate(BaseModel):
    """Model for updating an existing communication."""
    subject: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {"draft", "scheduled", "sent", "delivered", "failed", "cancelled"}
            if v not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class Communication(CommunicationBase, BaseDBModel):
    """Complete communication model with database fields."""
    scheduled_for: Optional[datetime] = Field(None, description="When to send the communication")
    sent_at: Optional[datetime] = Field(None, description="When the communication was sent")
    delivered_at: Optional[datetime] = Field(None, description="When the communication was delivered")
    opened_at: Optional[datetime] = Field(None, description="When the communication was opened")
    clicked_at: Optional[datetime] = Field(None, description="When links in the communication were clicked")
    replied_at: Optional[datetime] = Field(None, description="When the communication was replied to")
    error_message: Optional[str] = Field(None, description="Error message if sending failed")
    
class CommunicationResponse(Communication):
    """Model for communication API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class CommunicationTemplateBase(BaseModel):
    """Base template model with common fields."""
    name: str = Field(..., description="Template name")
    template_type: str = Field(..., description="Type of template")
    subject_template: str = Field(..., description="Subject template")
    content_template: str = Field(..., description="Content template")
    variables: List[str] = Field(default_factory=list, description="Template variables")
    
    @validator('template_type')
    def validate_template_type(cls, v):
        valid_types = {"email", "sms", "push", "in_app"}
        if v not in valid_types:
            raise ValueError(f"Invalid template type. Must be one of: {valid_types}")
        return v

class CommunicationTemplateCreate(CommunicationTemplateBase):
    """Model for creating a new template."""
    pass

class CommunicationTemplateUpdate(BaseModel):
    """Model for updating an existing template."""
    name: Optional[str] = None
    subject_template: Optional[str] = None
    content_template: Optional[str] = None
    variables: Optional[List[str]] = None

class CommunicationTemplate(CommunicationTemplateBase, BaseDBModel):
    """Complete template model with database fields."""
    usage_count: int = Field(default=0, description="Number of times the template has been used")
    last_used: Optional[datetime] = Field(None, description="When the template was last used")

class CommunicationSequenceBase(BaseModel):
    """Base sequence model with common fields."""
    name: str = Field(..., description="Sequence name")
    description: Optional[str] = Field(None, description="Sequence description")
    trigger_type: str = Field(..., description="What triggers the sequence")
    is_active: bool = Field(default=True, description="Whether the sequence is active")
    
    @validator('trigger_type')
    def validate_trigger_type(cls, v):
        valid_types = {
            "new_lead", "property_inquiry", "showing_scheduled", "offer_submitted", 
            "contract_signed", "closing_scheduled", "post_closing", "manual"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid trigger type. Must be one of: {valid_types}")
        return v

class SequenceStepBase(BaseModel):
    """Base sequence step model with common fields."""
    sequence_id: str = Field(..., description="ID of the parent sequence")
    template_id: str = Field(..., description="ID of the template to use")
    delay_days: int = Field(default=0, description="Days to delay after previous step")
    delay_hours: int = Field(default=0, description="Hours to delay after previous step")
    delay_minutes: int = Field(default=0, description="Minutes to delay after previous step")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Conditions for sending")
    step_order: int = Field(..., description="Order in the sequence")

class CommunicationSequenceCreate(CommunicationSequenceBase):
    """Model for creating a new sequence."""
    steps: List[SequenceStepBase] = Field(default_factory=list, description="Sequence steps")

class CommunicationSequenceUpdate(BaseModel):
    """Model for updating an existing sequence."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    
class SequenceStepCreate(SequenceStepBase):
    """Model for creating a new sequence step."""
    pass

class SequenceStepUpdate(BaseModel):
    """Model for updating an existing sequence step."""
    template_id: Optional[str] = None
    delay_days: Optional[int] = None
    delay_hours: Optional[int] = None
    delay_minutes: Optional[int] = None
    conditions: Optional[Dict[str, Any]] = None
    step_order: Optional[int] = None

class SequenceStep(SequenceStepBase, BaseDBModel):
    """Complete sequence step model with database fields."""
    pass

class CommunicationSequence(CommunicationSequenceBase, BaseDBModel):
    """Complete sequence model with database fields."""
    steps: List[SequenceStep] = Field(default_factory=list, description="Sequence steps")
    usage_count: int = Field(default=0, description="Number of times the sequence has been used")
    last_used: Optional[datetime] = Field(None, description="When the sequence was last used")

class ClientEngagement(BaseDBModel):
    """Model for tracking client engagement with communications."""
    client_id: str = Field(..., description="ID of the client")
    communication_id: str = Field(..., description="ID of the communication")
    action_type: str = Field(..., description="Type of engagement action")
    action_timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the action occurred")
    action_data: Dict[str, Any] = Field(default_factory=dict, description="Additional action data")
    
    @validator('action_type')
    def validate_action_type(cls, v):
        valid_types = {"open", "click", "reply", "unsubscribe", "bounce", "complaint"}
        if v not in valid_types:
            raise ValueError(f"Invalid action type. Must be one of: {valid_types}")
        return v 