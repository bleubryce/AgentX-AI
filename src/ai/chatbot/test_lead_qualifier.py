"""
Tests for the LeadQualifier class
"""

import pytest
from datetime import datetime
from .lead_qualifier import LeadQualifier

@pytest.fixture
def lead_qualifier():
    """Create a LeadQualifier instance for testing."""
    return LeadQualifier()

@pytest.fixture
def sample_conversation():
    """Create a sample conversation for testing."""
    return [
        {"role": "user", "content": "I'm looking to buy a house in Los Angeles"},
        {"role": "assistant", "content": "Great! What's your budget range?"},
        {"role": "user", "content": "Around $800,000 to $1.2M"},
        {"role": "assistant", "content": "When are you planning to make the purchase?"},
        {"role": "user", "content": "Within the next 3 months"}
    ]

@pytest.mark.asyncio
async def test_qualify_lead(lead_qualifier, sample_conversation):
    """Test lead qualification with sample conversation."""
    qualification = await lead_qualifier.qualify_lead(sample_conversation)
    
    # Check required fields
    assert all(key in qualification for key in [
        "intent", "timeline", "budget_range",
        "location_preferences", "urgency", "requirements",
        "qualified_at", "confidence_score"
    ])
    
    # Check data types
    assert isinstance(qualification["qualified_at"], str)
    assert isinstance(qualification["confidence_score"], float)
    assert 0 <= qualification["confidence_score"] <= 1
    assert isinstance(qualification["location_preferences"], list)
    assert isinstance(qualification["requirements"], list)

@pytest.mark.asyncio
async def test_generate_follow_up_questions(lead_qualifier):
    """Test follow-up question generation."""
    # Test with minimal qualification data
    qualification = {
        "intent": "unknown",
        "timeline": "unknown",
        "budget_range": "unknown",
        "location_preferences": [],
        "urgency": "unknown",
        "requirements": []
    }
    
    questions = await lead_qualifier.generate_follow_up_questions(qualification)
    
    # Check that all gaps are addressed
    assert len(questions) == 5
    assert all(isinstance(q, str) for q in questions)
    assert all(len(q) > 0 for q in questions)

@pytest.mark.asyncio
async def test_error_handling(lead_qualifier):
    """Test error handling with invalid conversation."""
    # Test with empty conversation
    qualification = await lead_qualifier.qualify_lead([])
    
    # Should return basic qualification with unknown values
    assert qualification["intent"] == "unknown"
    assert qualification["timeline"] == "unknown"
    assert qualification["budget_range"] == "unknown"
    assert qualification["location_preferences"] == []
    assert qualification["urgency"] == "unknown"
    assert qualification["requirements"] == []
    assert qualification["confidence_score"] == 0.0 