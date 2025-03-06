"""
Tests for the AnalyticsDashboard class
"""

import pytest
from datetime import datetime, timedelta
from .dashboard import AnalyticsDashboard

@pytest.fixture
def analytics_dashboard():
    """Create an AnalyticsDashboard instance for testing."""
    return AnalyticsDashboard()

@pytest.fixture
def sample_analytics_data():
    """Create sample analytics data for testing."""
    return {
        "market": {
            "price_trend": 0.05,
            "volume_trend": 0.02,
            "inventory_level": "low",
            "market_activity": "high",
            "sales_data": [
                {
                    "date": (datetime.now() - timedelta(days=30)).isoformat(),
                    "price": 450000,
                    "volume": 1
                }
            ]
        },
        "leads": {
            "total_leads": 100,
            "qualified_leads": 30,
            "conversion_rate": 0.3,
            "source_distribution": {
                "website": 0.4,
                "referral": 0.3,
                "social": 0.2,
                "other": 0.1
            },
            "lead_data": [
                {
                    "id": "lead_1",
                    "score": 85,
                    "source": "website",
                    "converted": True
                }
            ]
        },
        "performance": {
            "response_time": 2.5,
            "conversion_rate": 0.25,
            "roi": 2.8,
            "cost_per_lead": 150,
            "performance_data": [
                {
                    "date": (datetime.now() - timedelta(days=30)).isoformat(),
                    "leads": 10,
                    "conversions": 3
                }
            ]
        }
    }

@pytest.mark.asyncio
async def test_generate_dashboard(analytics_dashboard):
    """Test comprehensive dashboard generation."""
    result = await analytics_dashboard.generate_dashboard(
        location="Downtown",
        timeframe="6m"
    )
    
    # Check required fields
    assert all(key in result for key in [
        "location", "timeframe", "generated_at",
        "market_insights", "performance_metrics",
        "lead_analytics", "visualization_data",
        "confidence_score"
    ])
    
    # Check data types
    assert isinstance(result["generated_at"], str)
    assert isinstance(result["confidence_score"], float)
    assert isinstance(result["market_insights"], dict)
    assert isinstance(result["performance_metrics"], dict)
    assert isinstance(result["lead_analytics"], dict)
    assert isinstance(result["visualization_data"], dict)

def test_generate_market_insights(analytics_dashboard, sample_analytics_data):
    """Test market insights generation."""
    insights = analytics_dashboard._generate_market_insights(sample_analytics_data)
    
    # Check required fields
    assert all(key in insights for key in [
        "trends", "indicators", "predictions",
        "market_health_score"
    ])
    
    # Check data types
    assert isinstance(insights["market_health_score"], float)
    assert isinstance(insights["trends"], dict)
    assert isinstance(insights["indicators"], dict)
    assert isinstance(insights["predictions"], dict)

def test_generate_performance_metrics(analytics_dashboard, sample_analytics_data):
    """Test performance metrics generation."""
    metrics = analytics_dashboard._generate_performance_metrics(sample_analytics_data)
    
    # Check required fields
    assert all(key in metrics for key in [
        "conversion_rates", "roi_metrics",
        "efficiency_metrics", "performance_score"
    ])
    
    # Check data types
    assert isinstance(metrics["performance_score"], float)
    assert isinstance(metrics["conversion_rates"], dict)
    assert isinstance(metrics["roi_metrics"], dict)
    assert isinstance(metrics["efficiency_metrics"], dict)

def test_generate_lead_analytics(analytics_dashboard, sample_analytics_data):
    """Test lead analytics generation."""
    analytics = analytics_dashboard._generate_lead_analytics(sample_analytics_data)
    
    # Check required fields
    assert all(key in analytics for key in [
        "quality_metrics", "source_effectiveness",
        "scoring_insights", "lead_quality_score"
    ])
    
    # Check data types
    assert isinstance(analytics["lead_quality_score"], float)
    assert isinstance(analytics["quality_metrics"], dict)
    assert isinstance(analytics["source_effectiveness"], dict)
    assert isinstance(analytics["scoring_insights"], dict)

def test_generate_visualization_data(analytics_dashboard, sample_analytics_data):
    """Test visualization data generation."""
    data = analytics_dashboard._generate_visualization_data(sample_analytics_data)
    
    # Check required fields
    assert all(key in data for key in [
        "price_trends", "lead_funnel",
        "performance_charts", "market_heatmap"
    ])
    
    # Check data types
    assert isinstance(data["price_trends"], dict)
    assert isinstance(data["lead_funnel"], dict)
    assert isinstance(data["performance_charts"], dict)
    assert isinstance(data["market_heatmap"], dict)

def test_calculate_market_trends(analytics_dashboard):
    """Test market trends calculation."""
    market_data = {
        "sales_data": [
            {
                "date": (datetime.now() - timedelta(days=30)).isoformat(),
                "price": 450000,
                "volume": 1
            }
        ]
    }
    
    trends = analytics_dashboard._calculate_market_trends(market_data)
    
    # Check required fields
    assert all(key in trends for key in [
        "price_trend", "volume_trend",
        "inventory_trend", "days_on_market_trend"
    ])
    
    # Check data types
    assert all(isinstance(v, float) for v in trends.values())

def test_calculate_market_indicators(analytics_dashboard):
    """Test market indicators calculation."""
    market_data = {
        "inventory_level": "low",
        "market_activity": "high"
    }
    
    indicators = analytics_dashboard._calculate_market_indicators(market_data)
    
    # Check required fields
    assert all(key in indicators for key in [
        "supply_demand_ratio", "price_momentum",
        "market_volatility", "absorption_rate"
    ])
    
    # Check data types
    assert all(isinstance(v, float) for v in indicators.values())

def test_calculate_conversion_rates(analytics_dashboard):
    """Test conversion rates calculation."""
    performance_data = {
        "performance_data": [
            {
                "leads": 10,
                "conversions": 3
            }
        ]
    }
    
    rates = analytics_dashboard._calculate_conversion_rates(performance_data)
    
    # Check required fields
    assert all(key in rates for key in [
        "lead_to_contact", "contact_to_meeting",
        "meeting_to_offer", "offer_to_close"
    ])
    
    # Check data types
    assert all(isinstance(v, float) for v in rates.values())

def test_calculate_roi_metrics(analytics_dashboard):
    """Test ROI metrics calculation."""
    performance_data = {
        "roi": 2.8,
        "cost_per_lead": 150
    }
    
    metrics = analytics_dashboard._calculate_roi_metrics(performance_data)
    
    # Check required fields
    assert all(key in metrics for key in [
        "marketing_roi", "campaign_roi",
        "channel_roi", "cost_per_lead"
    ])
    
    # Check data types
    assert all(isinstance(v, (float, dict)) for v in metrics.values())

def test_calculate_efficiency_metrics(analytics_dashboard):
    """Test efficiency metrics calculation."""
    performance_data = {
        "response_time": 2.5,
        "conversion_rate": 0.25
    }
    
    metrics = analytics_dashboard._calculate_efficiency_metrics(performance_data)
    
    # Check required fields
    assert all(key in metrics for key in [
        "response_time", "processing_time",
        "resource_utilization", "cost_efficiency"
    ])
    
    # Check data types
    assert all(isinstance(v, float) for v in metrics.values())

def test_calculate_lead_quality_metrics(analytics_dashboard):
    """Test lead quality metrics calculation."""
    lead_data = {
        "lead_data": [
            {
                "score": 85,
                "converted": True
            }
        ]
    }
    
    metrics = analytics_dashboard._calculate_lead_quality_metrics(lead_data)
    
    # Check required fields
    assert all(key in metrics for key in [
        "score_distribution", "quality_trends",
        "conversion_correlation"
    ])
    
    # Check data types
    assert all(isinstance(v, dict) for v in metrics.values())

def test_calculate_source_effectiveness(analytics_dashboard):
    """Test source effectiveness calculation."""
    lead_data = {
        "source_distribution": {
            "website": 0.4,
            "referral": 0.3,
            "social": 0.2,
            "other": 0.1
        }
    }
    
    effectiveness = analytics_dashboard._calculate_source_effectiveness(lead_data)
    
    # Check required fields
    assert all(key in effectiveness for key in [
        "source_performance", "channel_effectiveness",
        "cost_per_source"
    ])
    
    # Check data types
    assert all(isinstance(v, dict) for v in effectiveness.values())

def test_generate_lead_scoring_insights(analytics_dashboard):
    """Test lead scoring insights generation."""
    lead_data = {
        "lead_data": [
            {
                "score": 85,
                "converted": True
            }
        ]
    }
    
    insights = analytics_dashboard._generate_lead_scoring_insights(lead_data)
    
    # Check required fields
    assert all(key in insights for key in [
        "score_factors", "improvement_opportunities",
        "model_performance"
    ])
    
    # Check data types
    assert isinstance(insights["score_factors"], dict)
    assert isinstance(insights["improvement_opportunities"], list)
    assert isinstance(insights["model_performance"], dict)

def test_prepare_price_trend_data(analytics_dashboard):
    """Test price trend data preparation."""
    market_data = {
        "sales_data": [
            {
                "date": (datetime.now() - timedelta(days=30)).isoformat(),
                "price": 450000
            }
        ]
    }
    
    data = analytics_dashboard._prepare_price_trend_data(market_data)
    
    # Check required fields
    assert all(key in data for key in [
        "timestamps", "values", "forecast"
    ])
    
    # Check data types
    assert isinstance(data["timestamps"], list)
    assert isinstance(data["values"], list)
    assert isinstance(data["forecast"], list)

def test_prepare_lead_funnel_data(analytics_dashboard):
    """Test lead funnel data preparation."""
    lead_data = {
        "total_leads": 100,
        "qualified_leads": 30,
        "conversion_rate": 0.3
    }
    
    data = analytics_dashboard._prepare_lead_funnel_data(lead_data)
    
    # Check required fields
    assert all(key in data for key in [
        "stages", "counts", "conversion_rates"
    ])
    
    # Check data types
    assert isinstance(data["stages"], list)
    assert isinstance(data["counts"], list)
    assert isinstance(data["conversion_rates"], list)

def test_prepare_performance_chart_data(analytics_dashboard):
    """Test performance chart data preparation."""
    performance_data = {
        "performance_data": [
            {
                "date": (datetime.now() - timedelta(days=30)).isoformat(),
                "leads": 10,
                "conversions": 3
            }
        ]
    }
    
    data = analytics_dashboard._prepare_performance_chart_data(performance_data)
    
    # Check required fields
    assert all(key in data for key in [
        "metrics", "values", "targets"
    ])
    
    # Check data types
    assert isinstance(data["metrics"], list)
    assert isinstance(data["values"], list)
    assert isinstance(data["targets"], list)

def test_prepare_market_heatmap_data(analytics_dashboard):
    """Test market heatmap data preparation."""
    market_data = {
        "inventory_level": "low",
        "market_activity": "high"
    }
    
    data = analytics_dashboard._prepare_market_heatmap_data(market_data)
    
    # Check required fields
    assert all(key in data for key in [
        "locations", "values", "categories"
    ])
    
    # Check data types
    assert isinstance(data["locations"], list)
    assert isinstance(data["values"], list)
    assert isinstance(data["categories"], list)

def test_generate_fallback_dashboard(analytics_dashboard):
    """Test fallback dashboard generation."""
    fallback = analytics_dashboard._generate_fallback_dashboard(
        "Downtown",
        "6m"
    )
    
    # Check structure
    assert all(key in fallback for key in [
        "location", "timeframe", "generated_at",
        "market_insights", "performance_metrics",
        "lead_analytics", "visualization_data",
        "confidence_score"
    ])
    
    # Check values
    assert fallback["location"] == "Downtown"
    assert fallback["timeframe"] == "6m"
    assert fallback["confidence_score"] == 0.0 