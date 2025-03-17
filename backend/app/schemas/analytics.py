from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
from app.models.lead import LeadStatus, LeadSource

class ConversionMetrics(BaseModel):
    total_leads: int
    converted_leads: int
    conversion_rate: float
    average_conversion_time: Optional[float] = None

class SourceMetrics(BaseModel):
    source: LeadSource
    total_leads: int
    converted_leads: int
    conversion_rate: float
    average_value: Optional[float] = None

class TimeSeriesPoint(BaseModel):
    date: datetime
    value: int

class LeadTrend(BaseModel):
    total_leads: List[TimeSeriesPoint]
    new_leads: List[TimeSeriesPoint]
    converted_leads: List[TimeSeriesPoint]

class StatusDistribution(BaseModel):
    status: LeadStatus
    count: int
    percentage: float

class LeadAnalytics(BaseModel):
    conversion_metrics: ConversionMetrics
    source_metrics: List[SourceMetrics]
    lead_trends: LeadTrend
    status_distribution: List[StatusDistribution]
    
class DateRangeParams(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None 