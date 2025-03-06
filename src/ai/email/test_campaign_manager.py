"""
Tests for the EmailCampaignManager class
"""

import pytest
from datetime import datetime, timedelta
from .campaign_manager import EmailCampaignManager

@pytest.fixture
def campaign_manager():
    """Create an EmailCampaignManager instance for testing."""
    return EmailCampaignManager()

@pytest.fixture
def sample_lead_data():
    """Create sample lead data for testing."""
    return {
        "id": "lead_123",
        "email": "test@example.com",
        "name": "John Doe",
        "property_preferences": {
            "type": "single-family",
            "min_beds": 3,
            "max_price": 500000
        },
        "timeline": "within_3_months",
        "budget": "400000-500000",
        "matched_properties": [
            {
                "id": "prop_1",
                "price": 450000,
                "beds": 3,
                "baths": 2
            }
        ]
    }

@pytest.mark.asyncio
async def test_create_campaign(campaign_manager, sample_lead_data):
    """Test campaign creation."""
    campaign = await campaign_manager.create_campaign(
        lead_data=sample_lead_data,
        campaign_type="welcome",
        sequence_type="standard"
    )
    
    # Check required fields
    assert all(key in campaign for key in [
        "campaign_id", "lead_id", "type", "sequence_type",
        "sequence", "schedule", "status", "created_at",
        "metrics"
    ])
    
    # Check data types
    assert isinstance(campaign["campaign_id"], str)
    assert isinstance(campaign["sequence"], list)
    assert isinstance(campaign["schedule"], list)
    assert isinstance(campaign["metrics"], dict)
    
    # Check values
    assert campaign["lead_id"] == "lead_123"
    assert campaign["type"] == "welcome"
    assert campaign["sequence_type"] == "standard"
    assert campaign["status"] == "scheduled"

@pytest.mark.asyncio
async def test_create_campaign_aggressive(
    campaign_manager,
    sample_lead_data
):
    """Test campaign creation with aggressive sequence."""
    campaign = await campaign_manager.create_campaign(
        lead_data=sample_lead_data,
        campaign_type="follow_up",
        sequence_type="aggressive"
    )
    
    # Check sequence length
    assert len(campaign["sequence"]) == 2
    
    # Check schedule
    assert len(campaign["schedule"]) == 2
    assert campaign["schedule"][0]["send_time"] == "09:00"
    assert campaign["schedule"][1]["send_time"] == "14:00"

@pytest.mark.asyncio
async def test_send_email(campaign_manager):
    """Test email sending."""
    email_data = {
        "recipient": "test@example.com",
        "name": "John Doe",
        "property_type": "single-family"
    }
    
    result = await campaign_manager.send_email(
        campaign_id="campaign_123",
        email_data=email_data,
        template_id="welcome_1"
    )
    
    # Check required fields
    assert all(key in result for key in [
        "status", "message_id", "sent_at", "campaign_id"
    ])
    
    # Check data types
    assert isinstance(result["sent_at"], str)
    assert isinstance(result["campaign_id"], str)
    
    # Check values
    assert result["campaign_id"] == "campaign_123"

@pytest.mark.asyncio
async def test_track_metrics(campaign_manager):
    """Test metrics tracking."""
    event_data = {
        "timestamp": datetime.now().isoformat(),
        "ip_address": "192.168.1.1"
    }
    
    result = await campaign_manager.track_metrics(
        campaign_id="campaign_123",
        event_type="open",
        event_data=event_data
    )
    
    # Check required fields
    assert all(key in result for key in [
        "campaign_id", "event_type", "metrics", "updated_at"
    ])
    
    # Check data types
    assert isinstance(result["metrics"], dict)
    assert isinstance(result["updated_at"], str)
    
    # Check values
    assert result["campaign_id"] == "campaign_123"
    assert result["event_type"] == "open"
    assert result["metrics"]["opened"] == 1

def test_prepare_campaign_data(campaign_manager, sample_lead_data):
    """Test campaign data preparation."""
    data = campaign_manager._prepare_campaign_data(
        lead_data=sample_lead_data,
        campaign_type="welcome",
        sequence_type="standard"
    )
    
    # Check structure
    assert "lead" in data
    assert "campaign" in data
    
    # Check lead data
    assert data["lead"]["id"] == "lead_123"
    assert data["lead"]["email"] == "test@example.com"
    assert data["lead"]["name"] == "John Doe"
    
    # Check campaign data
    assert data["campaign"]["type"] == "welcome"
    assert data["campaign"]["sequence_type"] == "standard"

def test_generate_email_sequence(campaign_manager, sample_lead_data):
    """Test email sequence generation."""
    # Test welcome sequence
    welcome_seq = campaign_manager._generate_email_sequence(
        "welcome", "standard", sample_lead_data
    )
    assert len(welcome_seq) == 2
    assert welcome_seq[0]["template_id"] == "welcome_1"
    
    # Test follow-up sequence
    follow_up_seq = campaign_manager._generate_email_sequence(
        "follow_up", "aggressive", sample_lead_data
    )
    assert len(follow_up_seq) == 2
    assert follow_up_seq[0]["template_id"] == "follow_up_1"
    
    # Test property match sequence
    property_seq = campaign_manager._generate_email_sequence(
        "property_match", "standard", sample_lead_data
    )
    assert len(property_seq) == 1
    assert property_seq[0]["template_id"] == "property_match_1"

def test_setup_ab_testing(campaign_manager):
    """Test A/B testing setup."""
    sequence = [
        {
            "template_id": "welcome_1",
            "subject": "Welcome"
        }
    ]
    
    result = campaign_manager._setup_ab_testing(sequence)
    
    # Check A/B test setup
    assert "ab_test" in result[0]
    assert "subject_lines" in result[0]["ab_test"]
    assert "content_variations" in result[0]["ab_test"]
    assert "test_size" in result[0]["ab_test"]

def test_generate_schedule(campaign_manager):
    """Test schedule generation."""
    # Test standard schedule
    standard_schedule = campaign_manager._generate_schedule("standard")
    assert len(standard_schedule) == 1
    assert standard_schedule[0]["send_time"] == "10:00"
    
    # Test aggressive schedule
    aggressive_schedule = campaign_manager._generate_schedule("aggressive")
    assert len(aggressive_schedule) == 2
    assert aggressive_schedule[0]["send_time"] == "09:00"
    assert aggressive_schedule[1]["send_time"] == "14:00"

def test_prepare_email_content(campaign_manager):
    """Test email content preparation."""
    email_data = {
        "recipient": "test@example.com",
        "name": "John Doe",
        "property_type": "single-family"
    }
    
    content = campaign_manager._prepare_email_content(
        email_data,
        "welcome_1"
    )
    
    # Check required fields
    assert all(key in content for key in [
        "to", "subject", "html_content", "text_content", "from"
    ])
    
    # Check values
    assert content["to"] == "test@example.com"

def test_update_metrics(campaign_manager):
    """Test metrics update."""
    # Test open event
    open_metrics = campaign_manager._update_metrics(
        "campaign_123",
        "open",
        {}
    )
    assert open_metrics["opened"] == 1
    
    # Test click event
    click_metrics = campaign_manager._update_metrics(
        "campaign_123",
        "click",
        {}
    )
    assert click_metrics["clicked"] == 1
    
    # Test reply event
    reply_metrics = campaign_manager._update_metrics(
        "campaign_123",
        "reply",
        {}
    )
    assert reply_metrics["replied"] == 1

def test_generate_fallback_campaign(campaign_manager, sample_lead_data):
    """Test fallback campaign generation."""
    fallback = campaign_manager._generate_fallback_campaign(
        sample_lead_data,
        "welcome"
    )
    
    # Check structure
    assert all(key in fallback for key in [
        "campaign_id", "lead_id", "type", "sequence_type",
        "sequence", "schedule", "status", "created_at",
        "metrics"
    ])
    
    # Check values
    assert fallback["lead_id"] == "lead_123"
    assert fallback["type"] == "welcome"
    assert fallback["status"] == "error"
    assert len(fallback["sequence"]) == 0

def test_generate_fallback_send_result(campaign_manager):
    """Test fallback send result generation."""
    fallback = campaign_manager._generate_fallback_send_result("campaign_123")
    
    # Check structure
    assert all(key in fallback for key in [
        "status", "message_id", "sent_at", "campaign_id"
    ])
    
    # Check values
    assert fallback["status"] == "failed"
    assert fallback["message_id"] is None
    assert fallback["campaign_id"] == "campaign_123"

def test_generate_fallback_metrics(campaign_manager):
    """Test fallback metrics generation."""
    fallback = campaign_manager._generate_fallback_metrics("campaign_123")
    
    # Check structure
    assert all(key in fallback for key in [
        "campaign_id", "event_type", "metrics", "updated_at"
    ])
    
    # Check values
    assert fallback["campaign_id"] == "campaign_123"
    assert fallback["event_type"] == "unknown"
    assert all(v == 0 for v in fallback["metrics"].values()) 