"""
Integration tests for the Real Estate AI system
"""

import pytest
from datetime import datetime, timedelta
from ..analytics.dashboard import AnalyticsDashboard
from ..alerts.market_alerts import MarketAlerts
from ..reports.report_generator import ReportGenerator
from ..crm.crm_handler import CRMHandler
from ..email.campaign_manager import EmailCampaignManager
from ..market.market_analyzer import MarketAnalyzer

@pytest.fixture
def system_components():
    """Create instances of all system components."""
    return {
        "dashboard": AnalyticsDashboard(),
        "alerts": MarketAlerts(),
        "reports": ReportGenerator(),
        "crm": CRMHandler(),
        "email": EmailCampaignManager(),
        "market": MarketAnalyzer()
    }

@pytest.mark.asyncio
async def test_market_analysis_workflow(system_components):
    """Test the complete market analysis workflow."""
    # 1. Generate market analysis
    market_analysis = await system_components["market"].analyze_market(
        location="Downtown",
        property_type="residential",
        timeframe="6m"
    )
    
    # 2. Generate analytics dashboard
    dashboard = await system_components["dashboard"].generate_dashboard(
        location="Downtown",
        timeframe="6m"
    )
    
    # 3. Start market alerts
    alerts = await system_components["alerts"].start_monitoring(
        location="Downtown",
        alert_types=["price_change", "inventory_change"]
    )
    
    # 4. Generate report
    report = await system_components["reports"].generate_report(
        report_type="market_analysis",
        parameters={"location": "Downtown", "timeframe": "6m"},
        format="pdf"
    )
    
    # Verify data consistency
    assert market_analysis["location"] == dashboard["location"]
    assert market_analysis["location"] == alerts["location"]
    assert market_analysis["location"] == report["parameters"]["location"]

@pytest.mark.asyncio
async def test_lead_management_workflow(system_components):
    """Test the complete lead management workflow."""
    # Sample lead data
    lead_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "property_type": "residential",
        "budget": 500000,
        "timeline": "3m",
        "preferred_location": "Downtown"
    }
    
    # 1. Sync lead to CRM
    crm_result = await system_components["crm"].sync_lead(lead_data)
    
    # 2. Create email campaign
    campaign = await system_components["email"].create_campaign(
        campaign_type="lead_nurture",
        target_leads=[crm_result["crm_id"]],
        template_id="welcome_series"
    )
    
    # 3. Send initial email
    email_result = await system_components["email"].send_email(
        campaign_id=campaign["campaign_id"],
        lead_id=crm_result["crm_id"],
        template_id="welcome_email"
    )
    
    # 4. Generate lead performance report
    report = await system_components["reports"].generate_report(
        report_type="lead_performance",
        parameters={"timeframe": "7d"},
        format="pdf"
    )
    
    # Verify data consistency
    assert crm_result["crm_id"] in campaign["target_leads"]
    assert email_result["campaign_id"] == campaign["campaign_id"]
    assert email_result["lead_id"] == crm_result["crm_id"]

@pytest.mark.asyncio
async def test_market_monitoring_workflow(system_components):
    """Test the complete market monitoring workflow."""
    # 1. Start market alerts
    alerts = await system_components["alerts"].start_monitoring(
        location="Downtown",
        alert_types=["price_change", "market_trend"]
    )
    
    # 2. Generate market analysis
    market_analysis = await system_components["market"].analyze_market(
        location="Downtown",
        property_type="residential",
        timeframe="1m"
    )
    
    # 3. Update analytics dashboard
    dashboard = await system_components["dashboard"].generate_dashboard(
        location="Downtown",
        timeframe="1m"
    )
    
    # 4. Generate trend report
    report = await system_components["reports"].generate_report(
        report_type="trend_analysis",
        parameters={"location": "Downtown", "timeframe": "1m"},
        format="pdf"
    )
    
    # Verify data consistency
    assert alerts["location"] == market_analysis["location"]
    assert market_analysis["location"] == dashboard["location"]
    assert dashboard["location"] == report["parameters"]["location"]

@pytest.mark.asyncio
async def test_campaign_analytics_workflow(system_components):
    """Test the complete campaign analytics workflow."""
    # 1. Create email campaign
    campaign = await system_components["email"].create_campaign(
        campaign_type="market_update",
        target_leads=["lead_1", "lead_2"],
        template_id="market_update"
    )
    
    # 2. Send campaign emails
    email_results = []
    for lead_id in campaign["target_leads"]:
        result = await system_components["email"].send_email(
            campaign_id=campaign["campaign_id"],
            lead_id=lead_id,
            template_id="market_update"
        )
        email_results.append(result)
    
    # 3. Generate campaign report
    report = await system_components["reports"].generate_report(
        report_type="campaign_performance",
        parameters={"campaign_id": campaign["campaign_id"]},
        format="pdf"
    )
    
    # 4. Update analytics dashboard
    dashboard = await system_components["dashboard"].generate_dashboard(
        location="All",
        timeframe="7d"
    )
    
    # Verify data consistency
    assert len(email_results) == len(campaign["target_leads"])
    assert all(result["campaign_id"] == campaign["campaign_id"] for result in email_results)
    assert report["parameters"]["campaign_id"] == campaign["campaign_id"]

@pytest.mark.asyncio
async def test_error_handling_workflow(system_components):
    """Test error handling across components."""
    # 1. Try to generate report with invalid parameters
    report = await system_components["reports"].generate_report(
        report_type="invalid_type",
        parameters={"location": "Invalid Location"},
        format="pdf"
    )
    
    # 2. Try to start monitoring with invalid location
    alerts = await system_components["alerts"].start_monitoring(
        location="Invalid Location",
        alert_types=["price_change"]
    )
    
    # 3. Try to analyze market with invalid parameters
    market_analysis = await system_components["market"].analyze_market(
        location="Invalid Location",
        property_type="invalid_type",
        timeframe="invalid"
    )
    
    # Verify error handling
    assert "error" in report["content"]
    assert alerts["status"] == "error"
    assert "error" in market_analysis

@pytest.mark.asyncio
async def test_data_synchronization_workflow(system_components):
    """Test data synchronization between components."""
    # 1. Generate market analysis
    market_analysis = await system_components["market"].analyze_market(
        location="Downtown",
        property_type="residential",
        timeframe="6m"
    )
    
    # 2. Update analytics dashboard
    dashboard = await system_components["dashboard"].generate_dashboard(
        location="Downtown",
        timeframe="6m"
    )
    
    # 3. Generate report
    report = await system_components["reports"].generate_report(
        report_type="market_analysis",
        parameters={"location": "Downtown", "timeframe": "6m"},
        format="pdf"
    )
    
    # 4. Start market alerts
    alerts = await system_components["alerts"].start_monitoring(
        location="Downtown",
        alert_types=["price_change"]
    )
    
    # Verify data synchronization
    assert market_analysis["location"] == dashboard["location"]
    assert dashboard["location"] == report["parameters"]["location"]
    assert report["parameters"]["location"] == alerts["location"]
    assert market_analysis["timeframe"] == dashboard["timeframe"]
    assert dashboard["timeframe"] == report["parameters"]["timeframe"] 