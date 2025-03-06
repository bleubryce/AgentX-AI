"""
Tests for the SocialPostGenerator class
"""

import pytest
from datetime import datetime
from .social_post_generator import SocialPostGenerator

@pytest.fixture
def social_post_generator():
    """Create a SocialPostGenerator instance for testing."""
    return SocialPostGenerator()

@pytest.fixture
def sample_property_data():
    """Create sample property data for testing."""
    return {
        "property_type": "single-family",
        "location": "Los Angeles, CA",
        "price": "$950,000",
        "property_details": {
            "bedrooms": 3,
            "bathrooms": 2,
            "square_feet": 1800,
            "year_built": 1995,
            "features": [
                "Updated kitchen",
                "Pool",
                "Smart home system"
            ]
        },
        "agent": {
            "name": "Sarah Johnson",
            "phone": "(555) 123-4567",
            "email": "sarah@example.com"
        }
    }

@pytest.fixture
def sample_hashtags():
    """Create sample hashtags for testing."""
    return [
        "#LuxuryHomes",
        "#LosAngelesRealEstate",
        "#DreamHome"
    ]

@pytest.mark.asyncio
async def test_generate_instagram_post(
    social_post_generator,
    sample_property_data,
    sample_hashtags
):
    """Test Instagram post generation."""
    post = await social_post_generator.generate_post(
        property_data=sample_property_data,
        platform="instagram",
        post_type="listing",
        tone="luxury",
        hashtags=sample_hashtags
    )
    
    # Check required fields
    assert all(key in post for key in [
        "caption", "hashtags", "call_to_action",
        "location_tag", "mentions", "generated_at",
        "platform", "post_type", "tone",
        "engagement_score"
    ])
    
    # Check data types
    assert isinstance(post["caption"], str)
    assert isinstance(post["hashtags"], list)
    assert isinstance(post["call_to_action"], str)
    assert isinstance(post["location_tag"], str)
    assert isinstance(post["mentions"], list)
    assert isinstance(post["generated_at"], str)
    assert isinstance(post["engagement_score"], float)
    assert 0 <= post["engagement_score"] <= 1
    
    # Check content
    assert len(post["caption"]) > 0
    assert len(post["hashtags"]) > 0
    assert sample_property_data["property_type"] in post["caption"]
    assert any(tag in post["hashtags"] for tag in sample_hashtags)

@pytest.mark.asyncio
async def test_generate_facebook_post(
    social_post_generator,
    sample_property_data
):
    """Test Facebook post generation."""
    post = await social_post_generator.generate_post(
        property_data=sample_property_data,
        platform="facebook",
        post_type="open_house",
        tone="professional"
    )
    
    # Check structure
    assert all(key in post for key in [
        "caption", "hashtags", "call_to_action",
        "location_tag", "mentions"
    ])
    
    # Facebook-specific checks
    assert len(post["caption"]) > 100  # Facebook posts can be longer
    assert "RSVP" in post["call_to_action"].upper()
    assert any("open house" in tag.lower() for tag in post["hashtags"])

@pytest.mark.asyncio
async def test_generate_twitter_post(
    social_post_generator,
    sample_property_data
):
    """Test Twitter post generation."""
    post = await social_post_generator.generate_post(
        property_data=sample_property_data,
        platform="twitter",
        post_type="sold",
        tone="casual"
    )
    
    # Check structure
    assert all(key in post for key in [
        "caption", "hashtags", "call_to_action",
        "location_tag", "mentions"
    ])
    
    # Twitter-specific checks
    assert len(post["caption"]) <= 280  # Twitter character limit
    assert "SOLD" in post["hashtags"]
    assert len(post["hashtags"]) <= 3  # Twitter best practice

@pytest.mark.asyncio
async def test_error_handling(social_post_generator):
    """Test error handling with invalid data."""
    # Test with minimal property data
    minimal_data = {
        "property_type": "house",
        "location": "Los Angeles"
    }
    
    post = await social_post_generator.generate_post(
        property_data=minimal_data,
        platform="instagram"
    )
    
    # Should return fallback post
    assert all(key in post for key in [
        "caption", "hashtags", "call_to_action",
        "location_tag", "mentions"
    ])
    assert post["engagement_score"] == 0.3  # Fallback score
    assert minimal_data["property_type"] in post["caption"] 