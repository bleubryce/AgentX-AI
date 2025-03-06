"""
Performance tests for the Real Estate AI system
"""

import pytest
import asyncio
import time
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
async def test_market_analysis_performance(system_components):
    """Test performance of market analysis operations."""
    start_time = time.time()
    
    # Test single market analysis
    market_analysis = await system_components["market"].analyze_market(
        location="Downtown",
        property_type="residential",
        timeframe="6m"
    )
    
    single_analysis_time = time.time() - start_time
    assert single_analysis_time < 2.0  # Should complete within 2 seconds
    
    # Test concurrent market analysis
    locations = ["Downtown", "Uptown", "Midtown"]
    start_time = time.time()
    
    tasks = [
        system_components["market"].analyze_market(
            location=loc,
            property_type="residential",
            timeframe="6m"
        )
        for loc in locations
    ]
    
    results = await asyncio.gather(*tasks)
    concurrent_analysis_time = time.time() - start_time
    
    # Concurrent analysis should be faster than sequential
    assert concurrent_analysis_time < single_analysis_time * len(locations)

@pytest.mark.asyncio
async def test_dashboard_performance(system_components):
    """Test performance of dashboard operations."""
    start_time = time.time()
    
    # Test dashboard generation
    dashboard = await system_components["dashboard"].generate_dashboard(
        location="Downtown",
        timeframe="6m"
    )
    
    dashboard_time = time.time() - start_time
    assert dashboard_time < 3.0  # Should complete within 3 seconds
    
    # Test dashboard updates
    start_time = time.time()
    updates = 0
    while time.time() - start_time < 5.0:  # Test for 5 seconds
        await system_components["dashboard"].generate_dashboard(
            location="Downtown",
            timeframe="6m"
        )
        updates += 1
    
    assert updates >= 2  # Should handle at least 2 updates per 5 seconds

@pytest.mark.asyncio
async def test_alert_system_performance(system_components):
    """Test performance of alert system operations."""
    start_time = time.time()
    
    # Test alert initialization
    alerts = await system_components["alerts"].start_monitoring(
        location="Downtown",
        alert_types=["price_change", "inventory_change"]
    )
    
    init_time = time.time() - start_time
    assert init_time < 1.0  # Should initialize within 1 second
    
    # Test alert processing
    start_time = time.time()
    alert_count = 0
    
    async def alert_callback(alert):
        nonlocal alert_count
        alert_count += 1
    
    # Simulate multiple alerts
    for _ in range(10):
        await system_components["alerts"]._process_alert(
            {"type": "price_change", "location": "Downtown"},
            alert_callback
        )
    
    processing_time = time.time() - start_time
    assert processing_time < 2.0  # Should process 10 alerts within 2 seconds
    assert alert_count == 10

@pytest.mark.asyncio
async def test_report_generation_performance(system_components):
    """Test performance of report generation operations."""
    start_time = time.time()
    
    # Test single report generation
    report = await system_components["reports"].generate_report(
        report_type="market_analysis",
        parameters={"location": "Downtown", "timeframe": "6m"},
        format="pdf"
    )
    
    single_report_time = time.time() - start_time
    assert single_report_time < 3.0  # Should complete within 3 seconds
    
    # Test concurrent report generation
    report_types = ["market_analysis", "lead_performance", "financial_summary"]
    start_time = time.time()
    
    tasks = [
        system_components["reports"].generate_report(
            report_type=report_type,
            parameters={"location": "Downtown", "timeframe": "6m"},
            format="pdf"
        )
        for report_type in report_types
    ]
    
    results = await asyncio.gather(*tasks)
    concurrent_report_time = time.time() - start_time
    
    # Concurrent report generation should be faster than sequential
    assert concurrent_report_time < single_report_time * len(report_types)

@pytest.mark.asyncio
async def test_crm_operations_performance(system_components):
    """Test performance of CRM operations."""
    start_time = time.time()
    
    # Test lead sync
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
    
    crm_result = await system_components["crm"].sync_lead(lead_data)
    sync_time = time.time() - start_time
    assert sync_time < 1.0  # Should sync within 1 second
    
    # Test batch lead sync
    leads = [lead_data.copy() for _ in range(5)]
    start_time = time.time()
    
    tasks = [
        system_components["crm"].sync_lead(lead)
        for lead in leads
    ]
    
    results = await asyncio.gather(*tasks)
    batch_sync_time = time.time() - start_time
    
    # Batch sync should be faster than sequential
    assert batch_sync_time < sync_time * len(leads)

@pytest.mark.asyncio
async def test_email_campaign_performance(system_components):
    """Test performance of email campaign operations."""
    start_time = time.time()
    
    # Test campaign creation
    campaign = await system_components["email"].create_campaign(
        campaign_type="lead_nurture",
        target_leads=["lead_1", "lead_2"],
        template_id="welcome_series"
    )
    
    creation_time = time.time() - start_time
    assert creation_time < 1.0  # Should create within 1 second
    
    # Test email sending
    start_time = time.time()
    email_count = 0
    
    async def email_callback(result):
        nonlocal email_count
        email_count += 1
    
    # Simulate sending multiple emails
    for lead_id in campaign["target_leads"]:
        await system_components["email"].send_email(
            campaign_id=campaign["campaign_id"],
            lead_id=lead_id,
            template_id="welcome_email"
        )
    
    sending_time = time.time() - start_time
    assert sending_time < 2.0  # Should send emails within 2 seconds
    assert email_count == len(campaign["target_leads"])

@pytest.mark.asyncio
async def test_memory_usage(system_components):
    """Test memory usage of system operations."""
    import psutil
    import os
    
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss
    
    # Generate large dataset
    market_data = []
    for _ in range(1000):
        market_data.append({
            "date": datetime.now().isoformat(),
            "price": 450000,
            "volume": 1
        })
    
    # Process data
    await system_components["market"].analyze_market(
        location="Downtown",
        property_type="residential",
        timeframe="6m"
    )
    
    final_memory = process.memory_info().rss
    memory_increase = final_memory - initial_memory
    
    # Memory increase should be reasonable (less than 100MB)
    assert memory_increase < 100 * 1024 * 1024  # 100MB in bytes

@pytest.mark.asyncio
async def test_concurrent_operations(system_components):
    """Test performance under concurrent operations."""
    start_time = time.time()
    
    # Create multiple concurrent tasks
    tasks = [
        # Market analysis
        system_components["market"].analyze_market(
            location="Downtown",
            property_type="residential",
            timeframe="6m"
        ),
        # Dashboard generation
        system_components["dashboard"].generate_dashboard(
            location="Downtown",
            timeframe="6m"
        ),
        # Report generation
        system_components["reports"].generate_report(
            report_type="market_analysis",
            parameters={"location": "Downtown", "timeframe": "6m"},
            format="pdf"
        ),
        # Alert monitoring
        system_components["alerts"].start_monitoring(
            location="Downtown",
            alert_types=["price_change"]
        )
    ]
    
    # Execute all tasks concurrently
    results = await asyncio.gather(*tasks)
    total_time = time.time() - start_time
    
    # All operations should complete within reasonable time
    assert total_time < 5.0  # Should complete within 5 seconds 