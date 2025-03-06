from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseDBModel

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

class Agent(BaseDBModel):
    """AI Agent model with security features."""
    user_id: str
    name: str
    description: str
    config: AgentConfig
    is_active: bool = True
    last_used: Optional[datetime] = None
    total_requests: int = 0
    total_tokens: int = 0
    metadata: Optional[Dict[str, Any]] = None

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