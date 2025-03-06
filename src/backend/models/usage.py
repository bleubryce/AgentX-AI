from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseDBModel

class UsageLimit(BaseModel):
    feature: str
    limit: int
    period: str  # "daily", "monthly", "yearly"
    description: str

class Usage(BaseDBModel):
    user_id: str
    subscription_id: str
    feature: str
    count: int = 0
    period_start: datetime
    period_end: datetime
    last_reset: datetime
    metadata: Optional[Dict[str, Any]] = None

class UsageResponse(BaseModel):
    id: str
    user_id: str
    subscription_id: str
    feature: str
    count: int
    limit: int
    period_start: datetime
    period_end: datetime
    last_reset: datetime
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

class UsageUpdate(BaseModel):
    feature: str
    count: int = 1
    metadata: Optional[Dict[str, Any]] = None

class UsageSummary(BaseModel):
    feature: str
    current_usage: int
    limit: int
    remaining: int
    period_start: datetime
    period_end: datetime
    last_reset: datetime 