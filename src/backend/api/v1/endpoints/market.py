from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from ....models.market import (
    MarketAnalysis,
    MarketAnalysisRequest,
    MarketAnalysisResponse,
    MarketAlert,
    MarketReport,
    MarketComparison
)
from ....services.market_service import MarketService
from ....core.deps import get_current_user
from ....models.base import PaginatedResponse

router = APIRouter()

@router.post("/analyze", response_model=MarketAnalysisResponse)
async def analyze_market(
    request: MarketAnalysisRequest,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Analyze market conditions for a specific location and property type."""
    return await market_service.analyze_market(request)

@router.get("/trends/{location}", response_model=MarketAnalysis)
async def get_market_trends(
    location: str,
    property_type: str = Query(..., description="Type of property to analyze"),
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Get market trends for a specific location."""
    return await market_service.get_market_trends(location, property_type)

@router.get("/forecast/{location}", response_model=MarketAnalysis)
async def get_market_forecast(
    location: str,
    property_type: str = Query(..., description="Type of property to forecast"),
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Get market forecast for a specific location."""
    return await market_service.get_market_forecast(location, property_type)

@router.get("/alerts", response_model=List[MarketAlert])
async def get_market_alerts(
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Get all market alerts."""
    return await market_service.get_alerts()

@router.post("/alerts", response_model=MarketAlert)
async def create_market_alert(
    alert: MarketAlert,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Create a new market alert."""
    return await market_service.create_alert(alert)

@router.put("/alerts/{alert_id}", response_model=MarketAlert)
async def update_market_alert(
    alert_id: str,
    alert: MarketAlert,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Update a market alert."""
    return await market_service.update_alert(alert_id, alert)

@router.delete("/alerts/{alert_id}")
async def delete_market_alert(
    alert_id: str,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Delete a market alert."""
    await market_service.delete_alert(alert_id)
    return {"message": "Alert deleted successfully"}

@router.get("/reports", response_model=List[MarketReport])
async def get_market_reports(
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Get all market reports."""
    return await market_service.get_reports()

@router.post("/reports", response_model=MarketReport)
async def create_market_report(
    report: MarketReport,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Create a new market report."""
    return await market_service.create_report(report)

@router.put("/reports/{report_id}", response_model=MarketReport)
async def update_market_report(
    report_id: str,
    report: MarketReport,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Update a market report."""
    return await market_service.update_report(report_id, report)

@router.delete("/reports/{report_id}")
async def delete_market_report(
    report_id: str,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Delete a market report."""
    await market_service.delete_report(report_id)
    return {"message": "Report deleted successfully"}

@router.post("/compare", response_model=MarketComparison)
async def compare_markets(
    location1: str,
    location2: str,
    property_type: str,
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Compare market conditions between two locations."""
    return await market_service.compare_markets(location1, location2, property_type)

@router.get("/insights/{location}")
async def get_market_insights(
    location: str,
    property_type: str = Query(..., description="Type of property to analyze"),
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Get AI-generated market insights for a location."""
    return await market_service.get_market_insights(location, property_type)

@router.post("/export")
async def export_market_data(
    location: str,
    property_type: str,
    format: str = "pdf",
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Export market analysis data in specified format."""
    return await market_service.export_market_data(location, property_type, format)

@router.get("/cache/status")
async def get_cache_status(
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Get market data cache status."""
    return await market_service.get_cache_status()

@router.post("/cache/clear")
async def clear_cache(
    current_user = Depends(get_current_user),
    market_service: MarketService = Depends()
):
    """Clear market data cache."""
    await market_service.clear_cache()
    return {"message": "Cache cleared successfully"} 