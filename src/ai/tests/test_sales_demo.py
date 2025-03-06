"""
Sales demonstration tests for the Real Estate AI system
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from src.ai.analytics.dashboard import AnalyticsDashboard
from src.ai.alerts.market_alerts import MarketAlerts
from src.ai.reports.report_generator import ReportGenerator
from src.ai.crm.crm_handler import CRMHandler
from src.ai.email.campaign_manager import EmailCampaignManager
from src.ai.market.market_analyzer import MarketAnalyzer

@pytest.fixture
def demo_components():
    """Create instances of all system components for demo."""
    return {
        "dashboard": AnalyticsDashboard(),
        "alerts": MarketAlerts(),
        "reports": ReportGenerator(),
        "crm": CRMHandler(),
        "email": EmailCampaignManager(),
        "market": MarketAnalyzer()
    }

@pytest.mark.asyncio
async def test_demo_market_analysis(demo_components):
    """Demonstrate market analysis capabilities."""
    # 1. Analyze market trends
    market_analysis = await demo_components["market"].analyze_market(
        location="Downtown",
        property_type="residential",
        timeframe="6m"
    )
    
    # Verify comprehensive market analysis
    assert "price_trends" in market_analysis
    assert "market_indicators" in market_analysis
    assert "investment_potential" in market_analysis
    assert "neighborhood_stats" in market_analysis
    
    # Verify data quality
    assert market_analysis["confidence_score"] > 0.8
    assert len(market_analysis["price_trends"]) > 0
    assert market_analysis["market_health_score"] > 0.7

@pytest.mark.asyncio
async def test_demo_lead_management(demo_components):
    """Demonstrate lead management capabilities."""
    # 1. Create sample lead
    lead_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "property_type": "residential",
        "budget": 500000,
        "timeline": "3m",
        "preferred_location": "Downtown",
        "urgency": "high",
        "notes": "Interested in waterfront properties"
    }
    
    # 2. Sync to CRM
    crm_result = await demo_components["crm"].sync_lead(lead_data)
    
    # 3. Create personalized campaign
    campaign = await demo_components["email"].create_campaign(
        campaign_type="lead_nurture",
        target_leads=[crm_result["crm_id"]],
        template_id="welcome_series"
    )
    
    # 4. Send personalized email
    email_result = await demo_components["email"].send_email(
        campaign_id=campaign["campaign_id"],
        lead_id=crm_result["crm_id"],
        template_id="welcome_email"
    )
    
    # Verify lead management features
    assert crm_result["crm_id"] is not None
    assert campaign["campaign_id"] is not None
    assert email_result["status"] == "sent"
    assert email_result["personalization_score"] > 0.8

@pytest.mark.asyncio
async def test_demo_analytics_dashboard(demo_components):
    """Demonstrate analytics dashboard capabilities."""
    # 1. Generate comprehensive dashboard
    dashboard = await demo_components["dashboard"].generate_dashboard(
        location="Downtown",
        timeframe="6m"
    )
    
    # Verify dashboard features
    assert "market_insights" in dashboard
    assert "performance_metrics" in dashboard
    assert "lead_analytics" in dashboard
    assert "visualization_data" in dashboard
    
    # Verify data quality
    assert dashboard["confidence_score"] > 0.8
    assert len(dashboard["visualization_data"]["price_trends"]) > 0
    assert dashboard["market_insights"]["market_health_score"] > 0.7

@pytest.mark.asyncio
async def test_demo_market_alerts(demo_components):
    """Demonstrate market alert capabilities."""
    # 1. Set up market monitoring
    alerts = await demo_components["alerts"].start_monitoring(
        location="Downtown",
        alert_types=["price_change", "inventory_change", "market_trend"]
    )
    
    # 2. Simulate market changes
    alert_count = 0
    
    async def alert_callback(alert):
        nonlocal alert_count
        alert_count += 1
    
    # Simulate various market conditions
    market_conditions = [
        {"type": "price_change", "value": 0.05, "location": "Downtown"},
        {"type": "inventory_change", "value": -0.1, "location": "Downtown"},
        {"type": "market_trend", "value": 0.03, "location": "Downtown"}
    ]
    
    for condition in market_conditions:
        await demo_components["alerts"]._process_alert(condition, alert_callback)
    
    # Verify alert system
    assert alerts["status"] == "active"
    assert alert_count == len(market_conditions)
    assert len(alerts["alert_types"]) == 3

@pytest.mark.asyncio
async def test_demo_report_generation(demo_components):
    """Demonstrate report generation capabilities."""
    # 1. Generate various report types
    report_types = [
        "market_analysis",
        "lead_performance",
        "financial_summary",
        "trend_analysis"
    ]
    
    reports = []
    for report_type in report_types:
        report = await demo_components["reports"].generate_report(
            report_type=report_type,
            parameters={"location": "Downtown", "timeframe": "6m"},
            format="pdf"
        )
        reports.append(report)
    
    # Verify report generation
    assert len(reports) == len(report_types)
    for report in reports:
        assert report["status"] == "completed"
        assert report["format"] == "pdf"
        assert report["content"] is not None

@pytest.mark.asyncio
async def test_demo_integration(demo_components):
    """Demonstrate system integration capabilities."""
    # 1. Create lead and analyze market
    lead_data = {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com",
        "phone": "0987654321",
        "property_type": "residential",
        "budget": 750000,
        "timeline": "6m",
        "preferred_location": "Downtown"
    }
    
    # 2. Sync lead and get market analysis
    crm_result = await demo_components["crm"].sync_lead(lead_data)
    market_analysis = await demo_components["market"].analyze_market(
        location=lead_data["preferred_location"],
        property_type=lead_data["property_type"],
        timeframe="6m"
    )
    
    # 3. Generate personalized insights
    dashboard = await demo_components["dashboard"].generate_dashboard(
        location=lead_data["preferred_location"],
        timeframe="6m"
    )
    
    # 4. Create targeted campaign
    campaign = await demo_components["email"].create_campaign(
        campaign_type="market_update",
        target_leads=[crm_result["crm_id"]],
        template_id="market_update"
    )
    
    # Verify integration
    assert crm_result["crm_id"] is not None
    assert market_analysis["location"] == lead_data["preferred_location"]
    assert dashboard["location"] == lead_data["preferred_location"]
    assert campaign["target_leads"] == [crm_result["crm_id"]]

@pytest.mark.asyncio
async def test_demo_performance(demo_components):
    """Demonstrate system performance capabilities."""
    import time
    
    # 1. Test concurrent operations
    start_time = time.time()
    
    tasks = [
        # Market analysis
        demo_components["market"].analyze_market(
            location="Downtown",
            property_type="residential",
            timeframe="6m"
        ),
        # Dashboard generation
        demo_components["dashboard"].generate_dashboard(
            location="Downtown",
            timeframe="6m"
        ),
        # Report generation
        demo_components["reports"].generate_report(
            report_type="market_analysis",
            parameters={"location": "Downtown", "timeframe": "6m"},
            format="pdf"
        ),
        # Alert monitoring
        demo_components["alerts"].start_monitoring(
            location="Downtown",
            alert_types=["price_change"]
        )
    ]
    
    results = await asyncio.gather(*tasks)
    total_time = time.time() - start_time
    
    # Verify performance
    assert total_time < 5.0  # All operations complete within 5 seconds
    assert all(result is not None for result in results)

@pytest.mark.asyncio
async def test_demo_error_handling(demo_components):
    """Demonstrate error handling capabilities."""
    # 1. Test invalid market analysis
    market_analysis = await demo_components["market"].analyze_market(
        location="Invalid Location",
        property_type="invalid_type",
        timeframe="invalid"
    )
    
    # 2. Test invalid lead sync
    crm_result = await demo_components["crm"].sync_lead({})
    
    # 3. Test invalid report generation
    report = await demo_components["reports"].generate_report(
        report_type="invalid_type",
        parameters={"location": "Invalid Location"},
        format="invalid"
    )
    
    # Verify error handling
    assert "error" in market_analysis
    assert crm_result["status"] == "error"
    assert "error" in report["content"]
    assert all(result.get("error_message") is not None for result in [market_analysis, crm_result, report]) 