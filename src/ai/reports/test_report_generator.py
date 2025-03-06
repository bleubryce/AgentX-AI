"""
Tests for the ReportGenerator class
"""

import pytest
from datetime import datetime, timedelta
from .report_generator import ReportGenerator

@pytest.fixture
def report_generator():
    """Create a ReportGenerator instance for testing."""
    return ReportGenerator()

@pytest.fixture
def sample_report_data():
    """Create sample report data for testing."""
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
async def test_generate_report(report_generator):
    """Test report generation."""
    result = await report_generator.generate_report(
        report_type="market_analysis",
        parameters={"location": "Downtown", "timeframe": "6m"},
        format="pdf"
    )
    
    # Check required fields
    assert all(key in result for key in [
        "report_type", "parameters", "format",
        "generated_at", "content", "formatted_report",
        "metadata"
    ])
    
    # Check data types
    assert isinstance(result["generated_at"], str)
    assert isinstance(result["content"], dict)
    assert isinstance(result["formatted_report"], dict)
    assert isinstance(result["metadata"], dict)

@pytest.mark.asyncio
async def test_schedule_report(report_generator):
    """Test report scheduling."""
    result = await report_generator.schedule_report(
        report_type="market_analysis",
        parameters={"location": "Downtown", "timeframe": "6m"},
        schedule={"frequency": "daily", "time": "09:00"},
        recipients=["user@example.com"]
    )
    
    # Check required fields
    assert all(key in result for key in [
        "status", "schedule_id", "report_type",
        "schedule", "recipients", "next_run"
    ])
    
    # Check values
    assert result["status"] == "scheduled"
    assert result["report_type"] == "market_analysis"
    assert len(result["recipients"]) == 1

@pytest.mark.asyncio
async def test_cancel_scheduled_report(report_generator):
    """Test cancelling scheduled report."""
    # Schedule a report first
    schedule_result = await report_generator.schedule_report(
        report_type="market_analysis",
        parameters={"location": "Downtown", "timeframe": "6m"},
        schedule={"frequency": "daily", "time": "09:00"},
        recipients=["user@example.com"]
    )
    
    # Cancel the scheduled report
    result = await report_generator.cancel_scheduled_report(
        schedule_result["schedule_id"]
    )
    
    # Check required fields
    assert all(key in result for key in [
        "status", "schedule_id", "cancelled_at"
    ])
    
    # Check values
    assert result["status"] == "cancelled"
    assert result["schedule_id"] == schedule_result["schedule_id"]

@pytest.mark.asyncio
async def test_cancel_nonexistent_report(report_generator):
    """Test cancelling nonexistent scheduled report."""
    result = await report_generator.cancel_scheduled_report("nonexistent_id")
    
    # Check required fields
    assert all(key in result for key in [
        "status", "schedule_id", "message"
    ])
    
    # Check values
    assert result["status"] == "not_found"
    assert result["schedule_id"] == "nonexistent_id"

def test_generate_market_analysis_report(report_generator, sample_report_data):
    """Test market analysis report generation."""
    content = report_generator._generate_market_analysis_report(sample_report_data)
    
    # Check required fields
    assert all(key in content for key in [
        "summary", "trends", "comparisons",
        "recommendations"
    ])
    
    # Check data types
    assert isinstance(content["summary"], dict)
    assert isinstance(content["trends"], dict)
    assert isinstance(content["comparisons"], dict)
    assert isinstance(content["recommendations"], list)

def test_generate_lead_performance_report(report_generator, sample_report_data):
    """Test lead performance report generation."""
    content = report_generator._generate_lead_performance_report(sample_report_data)
    
    # Check required fields
    assert all(key in content for key in [
        "summary", "metrics", "conversion_analysis",
        "recommendations"
    ])
    
    # Check data types
    assert isinstance(content["summary"], dict)
    assert isinstance(content["metrics"], dict)
    assert isinstance(content["conversion_analysis"], dict)
    assert isinstance(content["recommendations"], list)

def test_generate_financial_summary_report(report_generator, sample_report_data):
    """Test financial summary report generation."""
    content = report_generator._generate_financial_summary_report(sample_report_data)
    
    # Check required fields
    assert all(key in content for key in [
        "summary", "metrics", "forecasts",
        "recommendations"
    ])
    
    # Check data types
    assert isinstance(content["summary"], dict)
    assert isinstance(content["metrics"], dict)
    assert isinstance(content["forecasts"], dict)
    assert isinstance(content["recommendations"], list)

def test_generate_trend_analysis_report(report_generator, sample_report_data):
    """Test trend analysis report generation."""
    content = report_generator._generate_trend_analysis_report(sample_report_data)
    
    # Check required fields
    assert all(key in content for key in [
        "market_trends", "lead_trends",
        "performance_trends", "predictions"
    ])
    
    # Check data types
    assert isinstance(content["market_trends"], dict)
    assert isinstance(content["lead_trends"], dict)
    assert isinstance(content["performance_trends"], dict)
    assert isinstance(content["predictions"], dict)

def test_format_pdf_report(report_generator):
    """Test PDF report formatting."""
    content = {
        "summary": "Test summary",
        "details": "Test details"
    }
    
    result = report_generator._format_pdf_report(content)
    
    # Check required fields
    assert all(key in result for key in [
        "format", "content", "metadata"
    ])
    
    # Check values
    assert result["format"] == "pdf"
    assert result["content"] == content

def test_format_excel_report(report_generator):
    """Test Excel report formatting."""
    content = {
        "summary": "Test summary",
        "details": "Test details"
    }
    
    result = report_generator._format_excel_report(content)
    
    # Check required fields
    assert all(key in result for key in [
        "format", "content", "metadata"
    ])
    
    # Check values
    assert result["format"] == "excel"
    assert result["content"] == content

def test_format_html_report(report_generator):
    """Test HTML report formatting."""
    content = {
        "summary": "Test summary",
        "details": "Test details"
    }
    
    result = report_generator._format_html_report(content)
    
    # Check required fields
    assert all(key in result for key in [
        "format", "content", "metadata"
    ])
    
    # Check values
    assert result["format"] == "html"
    assert result["content"] == content

def test_validate_schedule(report_generator):
    """Test schedule validation."""
    # Test valid schedule
    valid_schedule = {
        "frequency": "daily",
        "time": "09:00"
    }
    report_generator._validate_schedule(valid_schedule)
    
    # Test invalid frequency
    invalid_schedule = {
        "frequency": "invalid",
        "time": "09:00"
    }
    with pytest.raises(ValueError):
        report_generator._validate_schedule(invalid_schedule)
    
    # Test missing fields
    incomplete_schedule = {
        "frequency": "daily"
    }
    with pytest.raises(ValueError):
        report_generator._validate_schedule(incomplete_schedule)

def test_create_schedule_config(report_generator):
    """Test schedule configuration creation."""
    config = report_generator._create_schedule_config(
        report_type="market_analysis",
        parameters={"location": "Downtown"},
        schedule={"frequency": "daily", "time": "09:00"},
        recipients=["user@example.com"]
    )
    
    # Check required fields
    assert all(key in config for key in [
        "report_type", "parameters", "schedule",
        "recipients", "created_at", "last_run",
        "next_run"
    ])
    
    # Check values
    assert config["report_type"] == "market_analysis"
    assert len(config["recipients"]) == 1
    assert config["last_run"] is None

def test_generate_report_metadata(report_generator, sample_report_data):
    """Test report metadata generation."""
    metadata = report_generator._generate_report_metadata(
        report_type="market_analysis",
        parameters={"location": "Downtown"},
        report_data=sample_report_data
    )
    
    # Check required fields
    assert all(key in metadata for key in [
        "report_type", "parameters", "data_sources",
        "generated_at", "version"
    ])
    
    # Check values
    assert metadata["report_type"] == "market_analysis"
    assert isinstance(metadata["data_sources"], list)
    assert metadata["version"] == "1.0"

def test_get_data_sources(report_generator, sample_report_data):
    """Test data source identification."""
    sources = report_generator._get_data_sources(sample_report_data)
    
    # Check data sources
    assert "market_data_api" in sources
    assert "crm_system" in sources
    assert "analytics_system" in sources

def test_generate_fallback_report(report_generator):
    """Test fallback report generation."""
    fallback = report_generator._generate_fallback_report(
        report_type="market_analysis",
        parameters={"location": "Downtown"},
        format="pdf"
    )
    
    # Check required fields
    assert all(key in fallback for key in [
        "report_type", "parameters", "format",
        "generated_at", "content", "formatted_report",
        "metadata"
    ])
    
    # Check values
    assert fallback["report_type"] == "market_analysis"
    assert fallback["format"] == "pdf"
    assert "error" in fallback["content"]
    assert "error" in fallback["formatted_report"]
    assert "error" in fallback["metadata"] 