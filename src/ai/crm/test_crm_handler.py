"""
Tests for the CRMHandler class
"""

import pytest
from datetime import datetime
from .crm_handler import CRMHandler

@pytest.fixture
def crm_handler():
    """Create a CRMHandler instance for testing."""
    return CRMHandler()

@pytest.fixture
def sample_lead_data():
    """Create sample lead data for testing."""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "property_type": "single-family",
        "budget": "400000-500000",
        "timeline": "within_3_months",
        "preferred_location": "Downtown",
        "urgency": "high",
        "notes": "Interested in properties with a garden",
        "property_price": "450000",
        "property_location": "Downtown Area",
        "response_time": 12,
        "communication_frequency": 3
    }

@pytest.mark.asyncio
async def test_sync_lead_hubspot(crm_handler, sample_lead_data):
    """Test lead sync with HubSpot CRM."""
    result = await crm_handler.sync_lead(
        lead_data=sample_lead_data,
        crm_type="hubspot"
    )
    
    # Check required fields
    assert all(key in result for key in [
        "status", "crm_id", "crm_type", "synced_at",
        "lead_score", "metadata"
    ])
    
    # Check data types
    assert isinstance(result["crm_id"], str)
    assert isinstance(result["lead_score"], float)
    assert isinstance(result["synced_at"], str)
    
    # Check values
    assert result["crm_type"] == "hubspot"
    assert result["status"] == "success"

@pytest.mark.asyncio
async def test_sync_lead_zoho(crm_handler, sample_lead_data):
    """Test lead sync with Zoho CRM."""
    result = await crm_handler.sync_lead(
        lead_data=sample_lead_data,
        crm_type="zoho"
    )
    
    # Check required fields
    assert all(key in result for key in [
        "status", "crm_id", "crm_type", "synced_at",
        "lead_score", "metadata"
    ])
    
    # Check data types
    assert isinstance(result["crm_id"], str)
    assert isinstance(result["lead_score"], float)
    assert isinstance(result["synced_at"], str)
    
    # Check values
    assert result["crm_type"] == "zoho"
    assert result["status"] == "success"

def test_calculate_lead_score(crm_handler, sample_lead_data):
    """Test lead score calculation."""
    score = crm_handler._calculate_lead_score(sample_lead_data)
    
    # Check score range
    assert 0 <= score <= 100
    
    # Check score components
    budget_score = crm_handler._calculate_budget_match(sample_lead_data)
    timeline_score = crm_handler._calculate_timeline_score(sample_lead_data)
    location_score = crm_handler._calculate_location_match(sample_lead_data)
    urgency_score = crm_handler._calculate_urgency_score(sample_lead_data)
    engagement_score = crm_handler._calculate_engagement_score(sample_lead_data)
    
    # Verify total score
    assert score == min(
        budget_score + timeline_score + location_score +
        urgency_score + engagement_score,
        100.0
    )

def test_calculate_budget_match(crm_handler):
    """Test budget match calculation."""
    # Test perfect match
    lead_data = {
        "budget": "400000-500000",
        "property_price": "450000"
    }
    score = crm_handler._calculate_budget_match(lead_data)
    assert score == 25.0
    
    # Test below budget
    lead_data["property_price"] = "350000"
    score = crm_handler._calculate_budget_match(lead_data)
    assert score == 15.0
    
    # Test above budget
    lead_data["property_price"] = "550000"
    score = crm_handler._calculate_budget_match(lead_data)
    assert score == 10.0
    
    # Test invalid data
    lead_data["budget"] = "invalid"
    score = crm_handler._calculate_budget_match(lead_data)
    assert score == 0.0

def test_calculate_timeline_score(crm_handler):
    """Test timeline score calculation."""
    # Test different timelines
    timelines = {
        "within_1_month": 20.0,
        "within_3_months": 15.0,
        "within_6_months": 10.0,
        "within_1_year": 5.0,
        "flexible": 3.0,
        "invalid": 0.0
    }
    
    for timeline, expected_score in timelines.items():
        lead_data = {"timeline": timeline}
        score = crm_handler._calculate_timeline_score(lead_data)
        assert score == expected_score

def test_calculate_location_match(crm_handler):
    """Test location match calculation."""
    # Test exact match
    lead_data = {
        "preferred_location": "Downtown",
        "property_location": "Downtown Area"
    }
    score = crm_handler._calculate_location_match(lead_data)
    assert score == 20.0
    
    # Test partial match
    lead_data["property_location"] = "Near Downtown"
    score = crm_handler._calculate_location_match(lead_data)
    assert score == 10.0
    
    # Test no match
    lead_data["property_location"] = "Suburbs"
    score = crm_handler._calculate_location_match(lead_data)
    assert score == 0.0

def test_calculate_urgency_score(crm_handler):
    """Test urgency score calculation."""
    # Test different urgency levels
    urgencies = {
        "high": 15.0,
        "medium": 10.0,
        "low": 5.0,
        "invalid": 0.0
    }
    
    for urgency, expected_score in urgencies.items():
        lead_data = {"urgency": urgency}
        score = crm_handler._calculate_urgency_score(lead_data)
        assert score == expected_score

def test_calculate_engagement_score(crm_handler):
    """Test engagement score calculation."""
    # Test high engagement
    lead_data = {
        "response_time": 12,
        "communication_frequency": 3
    }
    score = crm_handler._calculate_engagement_score(lead_data)
    assert score == 20.0
    
    # Test medium engagement
    lead_data["response_time"] = 36
    lead_data["communication_frequency"] = 1
    score = crm_handler._calculate_engagement_score(lead_data)
    assert score == 10.0
    
    # Test low engagement
    lead_data["response_time"] = 72
    lead_data["communication_frequency"] = 0
    score = crm_handler._calculate_engagement_score(lead_data)
    assert score == 0.0

def test_format_lead_data(crm_handler, sample_lead_data):
    """Test lead data formatting."""
    formatted_data = crm_handler._format_lead_data(sample_lead_data)
    
    # Check all fields are present
    assert all(key in formatted_data for key in [
        "first_name", "last_name", "email", "phone",
        "property_type", "budget", "timeline",
        "preferred_location", "urgency", "notes",
        "property_price", "property_location",
        "response_time", "communication_frequency"
    ])
    
    # Check data types
    assert isinstance(formatted_data["response_time"], int)
    assert isinstance(formatted_data["communication_frequency"], int)
    
    # Check values
    assert formatted_data["first_name"] == "John"
    assert formatted_data["email"] == "john.doe@example.com"

def test_prepare_zoho_data(crm_handler, sample_lead_data):
    """Test Zoho data preparation."""
    zoho_data = crm_handler._prepare_zoho_data(sample_lead_data)
    
    # Check required fields
    assert all(key in zoho_data for key in [
        "First_Name", "Last_Name", "Email", "Phone",
        "Property_Type", "Budget", "Timeline",
        "Lead_Source", "Lead_Status", "Description",
        "Account_Name"
    ])
    
    # Check values
    assert zoho_data["First_Name"] == "John"
    assert zoho_data["Email"] == "john.doe@example.com"
    assert zoho_data["Lead_Source"] == "AI Realtor Assistant"

def test_generate_fallback_sync_result(crm_handler, sample_lead_data):
    """Test fallback sync result generation."""
    fallback = crm_handler._generate_fallback_sync_result(
        sample_lead_data,
        "hubspot"
    )
    
    # Check structure
    assert all(key in fallback for key in [
        "status", "crm_id", "crm_type", "synced_at",
        "lead_score", "metadata"
    ])
    
    # Check values
    assert fallback["status"] == "error"
    assert fallback["crm_id"] is None
    assert fallback["lead_score"] == 0.0
    assert "error" in fallback["metadata"]
    assert "timestamp" in fallback["metadata"] 