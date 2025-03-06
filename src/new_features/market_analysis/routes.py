"""
Market Analysis Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from .models import MarketAnalysisRequest, MarketAnalysisResponse
from .services import MarketAnalysisService
from ..existing.market.market_analyzer import MarketAnalyzer

router = APIRouter(
    prefix="/api/v2/market",
    tags=["market-analysis"]
)

def get_market_analysis_service(
    market_analyzer: MarketAnalyzer = Depends()
) -> MarketAnalysisService:
    """Dependency injection for market analysis service"""
    return MarketAnalysisService(market_analyzer)

@router.post("/analyze", response_model=MarketAnalysisResponse)
async def analyze_market(
    request: MarketAnalysisRequest,
    service: MarketAnalysisService = Depends(get_market_analysis_service)
) -> MarketAnalysisResponse:
    """
    Analyze market conditions for a given location and property type
    
    Args:
        request: MarketAnalysisRequest containing location and property type
        service: MarketAnalysisService instance
        
    Returns:
        MarketAnalysisResponse containing analysis results
    """
    try:
        return await service.analyze_market(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing market: {str(e)}"
        )

@router.get("/trends/{location}")
async def get_market_trends(
    location: str,
    property_type: str,
    service: MarketAnalysisService = Depends(get_market_analysis_service)
) -> Dict:
    """
    Get market trends for a location
    
    Args:
        location: Target location
        property_type: Type of property
        service: MarketAnalysisService instance
        
    Returns:
        Dictionary containing market trends
    """
    try:
        return await service.get_market_trends(location, property_type)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting market trends: {str(e)}"
        )

@router.get("/forecast/{location}")
async def get_market_forecast(
    location: str,
    property_type: str,
    service: MarketAnalysisService = Depends(get_market_analysis_service)
) -> Dict:
    """
    Get market forecast for a location
    
    Args:
        location: Target location
        property_type: Type of property
        service: MarketAnalysisService instance
        
    Returns:
        Dictionary containing market forecast
    """
    try:
        return await service.get_market_forecast(location, property_type)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting market forecast: {str(e)}"
        ) 