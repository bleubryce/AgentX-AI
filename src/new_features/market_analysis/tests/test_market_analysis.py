"""
Tests for Market Analysis Feature
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from ..models import MarketAnalysisRequest, MarketAnalysisResponse, MarketAnalysis, PriceTrend, MarketIndicator
from ..services import MarketAnalysisService
from ..routes import router
from fastapi.testclient import TestClient
from ..existing.market.market_analyzer import MarketAnalyzer

@pytest.fixture
def mock_market_analyzer():
    """Create a mock market analyzer"""
    analyzer = AsyncMock(spec=MarketAnalyzer)
    analyzer.analyze_market.return_value = {
        "price_trends": {
            "current_price": 500000.0,
            "price_change_percentage": 5.2,
            "historical_prices": [
                {"date": "2024-01-01", "price": 475000.0},
                {"date": "2024-02-01", "price": 490000.0}
            ],
            "forecast_prices": [
                {"date": "2024-03-01", "price": 510000.0},
                {"date": "2024-04-01", "price": 525000.0}
            ]
        },
        "market_indicators": {
            "days_on_market": 45,
            "inventory_level": 120,
            "market_health_score": 0.85,
            "demand_score": 0.9,
            "supply_score": 0.8
        },
        "confidence_score": 0.92
    }
    return analyzer

@pytest.fixture
def market_analysis_service(mock_market_analyzer):
    """Create a market analysis service with mock analyzer"""
    return MarketAnalysisService(mock_market_analyzer)

@pytest.fixture
def test_client(mock_market_analyzer):
    """Create a test client with mock dependencies"""
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[MarketAnalyzer] = lambda: mock_market_analyzer
    return TestClient(app)

class TestMarketAnalysisModels:
    """Test market analysis models"""
    
    def test_price_trend_model(self):
        """Test price trend model creation and validation"""
        price_trend = PriceTrend(
            current_price=500000.0,
            price_change_percentage=5.2,
            historical_prices=[
                {"date": "2024-01-01", "price": 475000.0},
                {"date": "2024-02-01", "price": 490000.0}
            ],
            forecast_prices=[
                {"date": "2024-03-01", "price": 510000.0},
                {"date": "2024-04-01", "price": 525000.0}
            ]
        )
        assert price_trend.current_price == 500000.0
        assert price_trend.price_change_percentage == 5.2
        assert len(price_trend.historical_prices) == 2
        assert len(price_trend.forecast_prices) == 2

    def test_market_indicator_model(self):
        """Test market indicator model creation and validation"""
        market_indicator = MarketIndicator(
            days_on_market=45,
            inventory_level=120,
            market_health_score=0.85,
            demand_score=0.9,
            supply_score=0.8
        )
        assert market_indicator.days_on_market == 45
        assert market_indicator.inventory_level == 120
        assert market_indicator.market_health_score == 0.85
        assert market_indicator.demand_score == 0.9
        assert market_indicator.supply_score == 0.8

    def test_market_analysis_model(self):
        """Test market analysis model creation and validation"""
        market_analysis = MarketAnalysis(
            location="San Francisco",
            property_type="Single Family",
            price_trend=PriceTrend(
                current_price=500000.0,
                price_change_percentage=5.2,
                historical_prices=[],
                forecast_prices=[]
            ),
            market_indicators=MarketIndicator(
                days_on_market=45,
                inventory_level=120,
                market_health_score=0.85,
                demand_score=0.9,
                supply_score=0.8
            ),
            confidence_score=0.92,
            last_updated=datetime.utcnow()
        )
        assert market_analysis.location == "San Francisco"
        assert market_analysis.property_type == "Single Family"
        assert market_analysis.confidence_score == 0.92

class TestMarketAnalysisService:
    """Test market analysis service"""
    
    @pytest.mark.asyncio
    async def test_analyze_market(self, market_analysis_service):
        """Test market analysis endpoint"""
        request = MarketAnalysisRequest(
            location="San Francisco",
            property_type="Single Family",
            timeframe="6m",
            include_forecast=True
        )
        response = await market_analysis_service.analyze_market(request)
        
        assert isinstance(response, MarketAnalysisResponse)
        assert response.analysis.location == "San Francisco"
        assert response.analysis.property_type == "Single Family"
        assert response.analysis.confidence_score == 0.92
        assert "processing_time" in response.dict()
        assert "metadata" in response.dict()

    @pytest.mark.asyncio
    async def test_get_market_trends(self, market_analysis_service):
        """Test getting market trends"""
        trends = await market_analysis_service.get_market_trends(
            location="San Francisco",
            property_type="Single Family"
        )
        assert isinstance(trends, dict)
        assert "price_trends" in trends

    @pytest.mark.asyncio
    async def test_get_market_forecast(self, market_analysis_service):
        """Test getting market forecast"""
        forecast = await market_analysis_service.get_market_forecast(
            location="San Francisco",
            property_type="Single Family"
        )
        assert isinstance(forecast, dict)
        assert "forecast_prices" in forecast

class TestMarketAnalysisAPI:
    """Test market analysis API endpoints"""
    
    def test_analyze_market_endpoint(self, test_client):
        """Test market analysis endpoint"""
        response = test_client.post(
            "/api/v2/market/analyze",
            json={
                "location": "San Francisco",
                "property_type": "Single Family",
                "timeframe": "6m",
                "include_forecast": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "analysis" in data
        assert "metadata" in data
        assert "processing_time" in data

    def test_get_market_trends_endpoint(self, test_client):
        """Test market trends endpoint"""
        response = test_client.get(
            "/api/v2/market/trends/San Francisco",
            params={"property_type": "Single Family"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "price_trends" in data

    def test_get_market_forecast_endpoint(self, test_client):
        """Test market forecast endpoint"""
        response = test_client.get(
            "/api/v2/market/forecast/San Francisco",
            params={"property_type": "Single Family"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "forecast_prices" in data

class TestMarketAnalysisIntegration:
    """Test market analysis integration"""
    
    @pytest.fixture
    def integration(self, mock_market_analyzer):
        """Create market analysis integration with mock analyzer"""
        from ..integration import MarketAnalysisIntegration
        return MarketAnalysisIntegration(mock_market_analyzer)

    @pytest.mark.asyncio
    async def test_integration_analyze_market(self, integration):
        """Test integration market analysis"""
        request = MarketAnalysisRequest(
            location="San Francisco",
            property_type="Single Family",
            timeframe="6m",
            include_forecast=True
        )
        response = await integration.analyze_market(request)
        
        assert isinstance(response, MarketAnalysisResponse)
        assert response.analysis.location == "San Francisco"
        assert response.analysis.property_type == "Single Family"
        assert len(response.analysis.price_trend.forecast_prices) > 0

    @pytest.mark.asyncio
    async def test_integration_get_market_trends(self, integration):
        """Test integration market trends"""
        trends = await integration.get_market_trends(
            location="San Francisco",
            property_type="Single Family"
        )
        assert isinstance(trends, dict)
        assert "source" in trends
        assert trends["source"] == "combined"

    @pytest.mark.asyncio
    async def test_integration_get_market_forecast(self, integration):
        """Test integration market forecast"""
        forecast = await integration.get_market_forecast(
            location="San Francisco",
            property_type="Single Family"
        )
        assert isinstance(forecast, dict)
        assert "source" in forecast
        assert forecast["source"] == "combined" 