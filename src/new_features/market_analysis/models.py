"""
Market Analysis Models
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class PriceTrend(BaseModel):
    """Price trend data model"""
    current_price: float
    price_change_percentage: float
    historical_prices: List[Dict[str, float]]
    forecast_prices: List[Dict[str, float]]

class MarketIndicator(BaseModel):
    """Market indicator data model"""
    days_on_market: int
    inventory_level: int
    market_health_score: float
    demand_score: float
    supply_score: float

class MarketAnalysis(BaseModel):
    """Main market analysis model"""
    location: str
    property_type: str
    price_trend: PriceTrend
    market_indicators: MarketIndicator
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    last_updated: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MarketAnalysisRequest(BaseModel):
    """Request model for market analysis"""
    location: str
    property_type: str
    timeframe: str = "6m"
    include_forecast: bool = True

class MarketAnalysisResponse(BaseModel):
    """Response model for market analysis"""
    analysis: MarketAnalysis
    metadata: Dict[str, str]
    processing_time: float 