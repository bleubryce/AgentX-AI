"""
Market Analysis Service
"""
import time
from datetime import datetime
from typing import Dict, Optional
from ..existing.market.market_analyzer import MarketAnalyzer
from .models import MarketAnalysis, MarketAnalysisRequest, MarketAnalysisResponse

class MarketAnalysisService:
    """Service for handling market analysis operations"""
    
    def __init__(self, market_analyzer: MarketAnalyzer):
        self.market_analyzer = market_analyzer

    async def analyze_market(self, request: MarketAnalysisRequest) -> MarketAnalysisResponse:
        """
        Analyze market conditions for a given location and property type
        
        Args:
            request: MarketAnalysisRequest containing location and property type
            
        Returns:
            MarketAnalysisResponse containing analysis results and metadata
        """
        start_time = time.time()
        
        # Get market data from existing service
        market_data = await self.market_analyzer.analyze_market(
            location=request.location,
            property_type=request.property_type,
            timeframe=request.timeframe
        )
        
        # Transform data into new model
        analysis = MarketAnalysis(
            location=request.location,
            property_type=request.property_type,
            price_trend=market_data["price_trends"],
            market_indicators=market_data["market_indicators"],
            confidence_score=market_data["confidence_score"],
            last_updated=datetime.utcnow()
        )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return MarketAnalysisResponse(
            analysis=analysis,
            metadata={
                "source": "market_analyzer",
                "timeframe": request.timeframe,
                "version": "2.0"
            },
            processing_time=processing_time
        )

    async def get_market_trends(self, location: str, property_type: str) -> Dict:
        """
        Get market trends for a location
        
        Args:
            location: Target location
            property_type: Type of property
            
        Returns:
            Dictionary containing market trends
        """
        return await self.market_analyzer.get_market_trends(
            location=location,
            property_type=property_type
        )

    async def get_market_forecast(self, location: str, property_type: str) -> Dict:
        """
        Get market forecast for a location
        
        Args:
            location: Target location
            property_type: Type of property
            
        Returns:
            Dictionary containing market forecast
        """
        return await self.market_analyzer.get_market_forecast(
            location=location,
            property_type=property_type
        ) 