from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseDBModel

class PricePoint(BaseModel):
    date: datetime
    price: float
    volume: int
    days_on_market: int

class PriceTrend(BaseModel):
    current_price: float
    price_change_percentage: float
    historical_prices: List[PricePoint]
    forecast_prices: List[PricePoint] = []

class MarketIndicator(BaseModel):
    days_on_market: int
    inventory_level: int
    market_health_score: float
    demand_score: float
    supply_score: float
    absorption_rate: float

class MarketInsight(BaseModel):
    trend_summary: str
    key_factors: List[str]
    opportunities: List[str]
    risks: List[str]
    recommendations: List[str]

class MarketAnalysis(BaseDBModel):
    location: str
    property_type: str
    price_trend: PriceTrend
    market_indicators: MarketIndicator
    insights: MarketInsight
    confidence_score: float
    last_updated: datetime
    created_at: datetime

    @validator('confidence_score')
    def validate_confidence_score(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence score must be between 0 and 1')
        return v

class MarketAnalysisRequest(BaseModel):
    location: str
    property_type: str
    timeframe: str = "6m"
    include_forecast: bool = True

class MarketAnalysisResponse(BaseModel):
    analysis: MarketAnalysis
    metadata: Dict[str, Any]
    processing_time: float

class MarketAlert(BaseModel):
    type: str  # e.g., 'price_change', 'market_health', 'inventory_level'
    condition: str  # e.g., 'above', 'below', 'equals', 'changes_by'
    value: float
    location: str
    property_type: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_triggered: Optional[datetime] = None

class MarketReport(BaseModel):
    title: str
    description: str
    analysis_id: str
    sections: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MarketComparison(BaseModel):
    location1: str
    location2: str
    property_type: str
    price_difference: float
    market_health_difference: float
    inventory_difference: int
    days_on_market_difference: int
    created_at: datetime = Field(default_factory=datetime.utcnow) 