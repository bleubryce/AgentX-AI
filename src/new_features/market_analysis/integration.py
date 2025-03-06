"""
Market Analysis Integration Layer
"""
from typing import Dict, Optional
from ..existing.market.market_analyzer import MarketAnalyzer
from .models import MarketAnalysis, MarketAnalysisRequest, MarketAnalysisResponse
from .services import MarketAnalysisService

class MarketAnalysisIntegration:
    """Integration layer for market analysis feature"""
    
    def __init__(self, market_analyzer: MarketAnalyzer):
        self.market_analyzer = market_analyzer
        self.service = MarketAnalysisService(market_analyzer)

    async def analyze_market(self, request: MarketAnalysisRequest) -> MarketAnalysisResponse:
        """
        Analyze market conditions using both existing and new functionality
        
        Args:
            request: MarketAnalysisRequest containing location and property type
            
        Returns:
            MarketAnalysisResponse containing analysis results
        """
        # Use new service for analysis
        response = await self.service.analyze_market(request)
        
        # Add additional data from existing service if needed
        if request.include_forecast:
            forecast = await self.market_analyzer.get_market_forecast(
                location=request.location,
                property_type=request.property_type
            )
            response.analysis.price_trend.forecast_prices = forecast.get("prices", [])
        
        return response

    async def get_market_trends(self, location: str, property_type: str) -> Dict:
        """
        Get market trends using both existing and new functionality
        
        Args:
            location: Target location
            property_type: Type of property
            
        Returns:
            Dictionary containing market trends
        """
        # Get trends from both services
        existing_trends = await self.market_analyzer.get_market_trends(
            location=location,
            property_type=property_type
        )
        new_trends = await self.service.get_market_trends(
            location=location,
            property_type=property_type
        )
        
        # Combine results
        return {
            **existing_trends,
            **new_trends,
            "source": "combined"
        }

    async def get_market_forecast(self, location: str, property_type: str) -> Dict:
        """
        Get market forecast using both existing and new functionality
        
        Args:
            location: Target location
            property_type: Type of property
            
        Returns:
            Dictionary containing market forecast
        """
        # Get forecast from both services
        existing_forecast = await self.market_analyzer.get_market_forecast(
            location=location,
            property_type=property_type
        )
        new_forecast = await self.service.get_market_forecast(
            location=location,
            property_type=property_type
        )
        
        # Combine results
        return {
            **existing_forecast,
            **new_forecast,
            "source": "combined"
        } 