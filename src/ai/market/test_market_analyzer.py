"""
Tests for the MarketAnalyzer class
"""

import pytest
from datetime import datetime, timedelta
from .market_analyzer import MarketAnalyzer

@pytest.fixture
def market_analyzer():
    """Create a MarketAnalyzer instance for testing."""
    return MarketAnalyzer()

@pytest.fixture
def sample_market_data():
    """Create sample market data for testing."""
    return {
        "sales": [
            {
                "property_id": "prop_1",
                "price": 450000,
                "square_feet": 2000,
                "list_date": (datetime.now() - timedelta(days=30)).isoformat(),
                "sold_date": datetime.now().isoformat(),
                "volume": 1
            },
            {
                "property_id": "prop_2",
                "price": 475000,
                "square_feet": 2200,
                "list_date": (datetime.now() - timedelta(days=25)).isoformat(),
                "sold_date": datetime.now().isoformat(),
                "volume": 1
            }
        ],
        "listings": [
            {
                "property_id": "prop_3",
                "list_price": 500000,
                "square_feet": 2400
            }
        ],
        "neighborhood": {
            "school_rating": 8.5,
            "crime_rate": 0.02,
            "amenities": ["park", "shopping", "restaurants"],
            "walk_score": 85,
            "transit_score": 90,
            "future_development": ["new_metro_station"]
        },
        "indicators": {
            "inventory_level": "low",
            "price_trend": "increasing",
            "market_activity": "high"
        }
    }

@pytest.mark.asyncio
async def test_analyze_market(market_analyzer):
    """Test comprehensive market analysis."""
    result = await market_analyzer.analyze_market(
        location="Downtown",
        property_type="single-family",
        timeframe="6m"
    )
    
    # Check required fields
    assert all(key in result for key in [
        "location", "property_type", "timeframe",
        "analysis_date", "market_trends", "property_values",
        "neighborhood_stats", "comparative_analysis",
        "investment_potential", "confidence_score"
    ])
    
    # Check data types
    assert isinstance(result["analysis_date"], str)
    assert isinstance(result["confidence_score"], float)
    assert isinstance(result["market_trends"], dict)
    assert isinstance(result["property_values"], dict)

def test_analyze_market_trends(market_analyzer, sample_market_data):
    """Test market trends analysis."""
    trends = market_analyzer._analyze_market_trends(sample_market_data)
    
    # Check required fields
    assert all(key in trends for key in [
        "price_trend", "volume_trend", "market_phase",
        "days_on_market", "price_per_sqft_trend"
    ])
    
    # Check data types
    assert isinstance(trends["price_trend"], float)
    assert isinstance(trends["volume_trend"], float)
    assert isinstance(trends["days_on_market"], float)
    
    # Check values
    assert trends["market_phase"] in ["seller", "buyer", "balanced", "transitional"]

def test_analyze_property_values(market_analyzer, sample_market_data):
    """Test property values analysis."""
    values = market_analyzer._analyze_property_values(sample_market_data)
    
    # Check required fields
    assert all(key in values for key in [
        "value_ranges", "price_distribution", "price_per_sqft",
        "list_price_vs_sold"
    ])
    
    # Check value ranges
    assert all(key in values["value_ranges"] for key in [
        "min", "max", "median", "average"
    ])
    
    # Check price distribution
    assert all(key in values["price_distribution"] for key in [
        "under_100k", "100k_to_250k", "250k_to_500k",
        "500k_to_1m", "over_1m"
    ])
    
    # Check data types
    assert isinstance(values["price_per_sqft"], float)
    assert isinstance(values["list_price_vs_sold"], float)

def test_analyze_neighborhood_stats(market_analyzer, sample_market_data):
    """Test neighborhood statistics analysis."""
    stats = market_analyzer._analyze_neighborhood_stats(sample_market_data)
    
    # Check required fields
    assert all(key in stats for key in [
        "school_rating", "crime_rate", "amenities",
        "walk_score", "transit_score", "future_development"
    ])
    
    # Check data types
    assert isinstance(stats["school_rating"], float)
    assert isinstance(stats["crime_rate"], float)
    assert isinstance(stats["walk_score"], float)
    assert isinstance(stats["transit_score"], float)
    assert isinstance(stats["amenities"], list)
    assert isinstance(stats["future_development"], list)

def test_perform_comparative_analysis(market_analyzer, sample_market_data):
    """Test comparative market analysis."""
    cma = market_analyzer._perform_comparative_analysis(sample_market_data)
    
    # Check required fields
    assert all(key in cma for key in [
        "comparable_properties", "price_adjustments",
        "market_value_range"
    ])
    
    # Check market value range
    assert all(key in cma["market_value_range"] for key in [
        "min", "max", "recommended"
    ])
    
    # Check data types
    assert isinstance(cma["comparable_properties"], list)
    assert isinstance(cma["price_adjustments"], dict)

def test_assess_investment_potential(
    market_analyzer,
    sample_market_data
):
    """Test investment potential assessment."""
    values = market_analyzer._analyze_property_values(sample_market_data)
    cma = market_analyzer._perform_comparative_analysis(sample_market_data)
    
    investment = market_analyzer._assess_investment_potential(
        sample_market_data,
        values,
        cma
    )
    
    # Check required fields
    assert all(key in investment for key in [
        "roi_potential", "market_stability", "risk_factors",
        "investment_score"
    ])
    
    # Check data types
    assert isinstance(investment["roi_potential"], float)
    assert isinstance(investment["market_stability"], float)
    assert isinstance(investment["investment_score"], float)
    assert isinstance(investment["risk_factors"], list)

def test_calculate_trend(market_analyzer):
    """Test trend calculation."""
    # Test increasing trend
    increasing_values = [100, 110, 120, 130, 140]
    trend = market_analyzer._calculate_trend(increasing_values)
    assert trend > 0
    
    # Test decreasing trend
    decreasing_values = [140, 130, 120, 110, 100]
    trend = market_analyzer._calculate_trend(decreasing_values)
    assert trend < 0
    
    # Test flat trend
    flat_values = [100, 100, 100, 100, 100]
    trend = market_analyzer._calculate_trend(flat_values)
    assert trend == 0
    
    # Test empty values
    trend = market_analyzer._calculate_trend([])
    assert trend == 0

def test_determine_market_phase(market_analyzer):
    """Test market phase determination."""
    # Test seller's market
    phase = market_analyzer._determine_market_phase(0.06, 0.1)
    assert phase == "seller"
    
    # Test buyer's market
    phase = market_analyzer._determine_market_phase(-0.06, -0.1)
    assert phase == "buyer"
    
    # Test balanced market
    phase = market_analyzer._determine_market_phase(0.03, 0.05)
    assert phase == "balanced"
    
    # Test transitional market
    phase = market_analyzer._determine_market_phase(0.02, -0.02)
    assert phase == "transitional"

def test_calculate_value_ranges(market_analyzer):
    """Test value ranges calculation."""
    # Test with valid data
    sales_data = [
        {"price": 400000},
        {"price": 450000},
        {"price": 500000}
    ]
    ranges = market_analyzer._calculate_value_ranges(sales_data)
    
    assert ranges["min"] == 400000
    assert ranges["max"] == 500000
    assert ranges["median"] == 450000
    assert ranges["average"] == 450000
    
    # Test with empty data
    ranges = market_analyzer._calculate_value_ranges([])
    assert all(v == 0 for v in ranges.values())

def test_calculate_price_distribution(market_analyzer):
    """Test price distribution calculation."""
    # Test with valid data
    sales_data = [
        {"price": 80000},
        {"price": 200000},
        {"price": 300000},
        {"price": 600000},
        {"price": 1200000}
    ]
    distribution = market_analyzer._calculate_price_distribution(sales_data)
    
    assert distribution["under_100k"] == 1
    assert distribution["100k_to_250k"] == 1
    assert distribution["250k_to_500k"] == 1
    assert distribution["500k_to_1m"] == 1
    assert distribution["over_1m"] == 1
    
    # Test with empty data
    distribution = market_analyzer._calculate_price_distribution([])
    assert all(v == 0 for v in distribution.values())

def test_calculate_price_per_sqft(market_analyzer):
    """Test price per square foot calculation."""
    # Test with valid data
    sales_data = [
        {"price": 400000, "square_feet": 2000},
        {"price": 450000, "square_feet": 2200}
    ]
    price_per_sqft = market_analyzer._calculate_price_per_sqft(sales_data)
    assert price_per_sqft > 0
    
    # Test with invalid square footage
    sales_data = [
        {"price": 400000, "square_feet": 0},
        {"price": 450000, "square_feet": -100}
    ]
    price_per_sqft = market_analyzer._calculate_price_per_sqft(sales_data)
    assert price_per_sqft == 0

def test_calculate_list_price_vs_sold(market_analyzer):
    """Test list price vs sold price calculation."""
    # Test with matching data
    listing_data = [
        {"property_id": "prop_1", "list_price": 500000}
    ]
    sales_data = [
        {"property_id": "prop_1", "price": 475000}
    ]
    ratio = market_analyzer._calculate_list_price_vs_sold(
        listing_data,
        sales_data
    )
    assert ratio == 0.95
    
    # Test with no matching data
    ratio = market_analyzer._calculate_list_price_vs_sold(
        [],
        sales_data
    )
    assert ratio == 1.0

def test_generate_fallback_analysis(market_analyzer):
    """Test fallback analysis generation."""
    fallback = market_analyzer._generate_fallback_analysis(
        "Downtown",
        "single-family",
        "6m"
    )
    
    # Check structure
    assert all(key in fallback for key in [
        "location", "property_type", "timeframe",
        "analysis_date", "market_trends", "property_values",
        "neighborhood_stats", "comparative_analysis",
        "investment_potential", "confidence_score"
    ])
    
    # Check values
    assert fallback["location"] == "Downtown"
    assert fallback["property_type"] == "single-family"
    assert fallback["timeframe"] == "6m"
    assert fallback["confidence_score"] == 0.0 