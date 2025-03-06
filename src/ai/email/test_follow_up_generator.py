"""
Tests for the FollowUpGenerator class
"""

import pytest
from datetime import datetime
from .follow_up_generator import FollowUpGenerator

@pytest.fixture
def follow_up_generator():
    """Create a FollowUpGenerator instance for testing."""
    return FollowUpGenerator()

@pytest.fixture
def sample_lead_data():
    """Create sample lead data for testing."""
    return {
        "name": "John Smith",
        "intent": "buy",
        "timeline": "3 months",
        "budget_range": "$800,000 - $1.2M",
        "location_preferences": ["Los Angeles", "Santa Monica"],
        "urgency": "high",
        "property_type": "single-family home",
        "agent_name": "Sarah Johnson"
    }

@pytest.fixture
def sample_previous_communication():
    """Create sample previous communication for testing."""
    return [
        {"role": "user", "content": "I'm interested in buying a house in LA"},
        {"role": "assistant", "content": "Great! What's your budget range?"},
        {"role": "user", "content": "Around $800,000 to $1.2M"}
    ]

@pytest.fixture
def sample_property_details():
    """Create sample property details for testing."""
    return {
        "address": "123 Main St, Los Angeles, CA 90001",
        "price": "$950,000",
        "bedrooms": 3,
        "bathrooms": 2,
        "square_feet": 1800
    }

@pytest.mark.asyncio
async def test_generate_follow_up(
    follow_up_generator,
    sample_lead_data,
    sample_previous_communication,
    sample_property_details
):
    """Test follow-up email generation with complete data."""
    email = await follow_up_generator.generate_follow_up(
        lead_data=sample_lead_data,
        previous_communication=sample_previous_communication,
        property_details=sample_property_details
    )
    
    # Check required fields
    assert all(key in email for key in [
        "subject", "body", "generated_at", "personalization_score"
    ])
    
    # Check data types
    assert isinstance(email["subject"], str)
    assert isinstance(email["body"], str)
    assert isinstance(email["generated_at"], str)
    assert isinstance(email["personalization_score"], float)
    assert 0 <= email["personalization_score"] <= 1
    
    # Check content
    assert len(email["subject"]) > 0
    assert len(email["body"]) > 0
    assert sample_lead_data["name"] in email["body"]
    assert sample_lead_data["location_preferences"][0] in email["body"]

@pytest.mark.asyncio
async def test_generate_follow_up_minimal_data(follow_up_generator):
    """Test follow-up email generation with minimal data."""
    minimal_lead_data = {
        "name": "Jane Doe",
        "intent": "sell"
    }
    
    email = await follow_up_generator.generate_follow_up(lead_data=minimal_lead_data)
    
    # Check basic structure
    assert all(key in email for key in [
        "subject", "body", "generated_at", "personalization_score"
    ])
    
    # Check content
    assert len(email["subject"]) > 0
    assert len(email["body"]) > 0
    assert minimal_lead_data["name"] in email["body"]

@pytest.mark.asyncio
async def test_error_handling(follow_up_generator):
    """Test error handling with invalid data."""
    # Test with empty lead data
    email = await follow_up_generator.generate_follow_up(lead_data={})
    
    # Should return fallback email
    assert all(key in email for key in [
        "subject", "body", "generated_at", "personalization_score"
    ])
    assert email["personalization_score"] == 0.3  # Fallback score 