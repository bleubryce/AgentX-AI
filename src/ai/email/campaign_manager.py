"""
Email Campaign Manager for Real Estate
"""

from typing import Dict, List, Optional
import aiohttp
from datetime import datetime, timedelta
from ..config import (
    EMAIL_SERVICE_API_KEY,
    EMAIL_TEMPLATES,
    CAMPAIGN_SETTINGS,
    A_B_TEST_PARAMETERS
)

class EmailCampaignManager:
    """Email campaign manager for real estate lead follow-ups."""
    
    def __init__(self):
        """Initialize the email campaign manager with configuration."""
        self.api_key = EMAIL_SERVICE_API_KEY
        self.templates = EMAIL_TEMPLATES
        self.settings = CAMPAIGN_SETTINGS
        self.ab_test_params = A_B_TEST_PARAMETERS
    
    async def create_campaign(
        self,
        lead_data: Dict,
        campaign_type: str,
        sequence_type: str = "standard"
    ) -> Dict:
        """
        Create and initialize an email campaign for a lead.
        
        Args:
            lead_data: Dictionary containing lead information
            campaign_type: Type of campaign ("welcome", "follow_up", "property_match")
            sequence_type: Type of sequence ("standard", "aggressive", "nurture")
            
        Returns:
            Dict containing campaign details and schedule
        """
        try:
            # Prepare campaign data
            campaign_data = self._prepare_campaign_data(
                lead_data, campaign_type, sequence_type
            )
            
            # Generate email sequence
            sequence = self._generate_email_sequence(
                campaign_type, sequence_type, lead_data
            )
            
            # Set up A/B testing if enabled
            if self.settings["enable_ab_testing"]:
                sequence = self._setup_ab_testing(sequence)
            
            # Create campaign
            campaign = {
                "campaign_id": self._generate_campaign_id(),
                "lead_id": lead_data.get("id"),
                "type": campaign_type,
                "sequence_type": sequence_type,
                "sequence": sequence,
                "schedule": self._generate_schedule(sequence_type),
                "status": "scheduled",
                "created_at": datetime.now().isoformat(),
                "metrics": {
                    "sent": 0,
                    "opened": 0,
                    "clicked": 0,
                    "replied": 0
                }
            }
            
            return campaign
            
        except Exception as e:
            print(f"Error creating email campaign: {str(e)}")
            return self._generate_fallback_campaign(lead_data, campaign_type)
    
    async def send_email(
        self,
        campaign_id: str,
        email_data: Dict,
        template_id: str
    ) -> Dict:
        """
        Send an email as part of a campaign.
        
        Args:
            campaign_id: ID of the campaign
            email_data: Dictionary containing email content and recipient info
            template_id: ID of the email template to use
            
        Returns:
            Dict containing send status and metadata
        """
        try:
            # Prepare email content
            content = self._prepare_email_content(email_data, template_id)
            
            # Send email
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.email-service.com/v1/send",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=content
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "status": "sent",
                            "message_id": result.get("message_id"),
                            "sent_at": datetime.now().isoformat(),
                            "campaign_id": campaign_id
                        }
                    else:
                        raise Exception(f"Email send failed: {response.status}")
                        
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return self._generate_fallback_send_result(campaign_id)
    
    async def track_metrics(
        self,
        campaign_id: str,
        event_type: str,
        event_data: Dict
    ) -> Dict:
        """
        Track email campaign metrics.
        
        Args:
            campaign_id: ID of the campaign
            event_type: Type of event ("open", "click", "reply")
            event_data: Dictionary containing event details
            
        Returns:
            Dict containing updated metrics
        """
        try:
            # Update metrics based on event type
            metrics = self._update_metrics(campaign_id, event_type, event_data)
            
            # Store metrics
            await self._store_metrics(campaign_id, metrics)
            
            return {
                "campaign_id": campaign_id,
                "event_type": event_type,
                "metrics": metrics,
                "updated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error tracking metrics: {str(e)}")
            return self._generate_fallback_metrics(campaign_id)
    
    def _prepare_campaign_data(
        self,
        lead_data: Dict,
        campaign_type: str,
        sequence_type: str
    ) -> Dict:
        """Prepare campaign data for initialization."""
        return {
            "lead": {
                "id": lead_data.get("id"),
                "email": lead_data.get("email"),
                "name": lead_data.get("name"),
                "property_preferences": lead_data.get("property_preferences", {}),
                "timeline": lead_data.get("timeline"),
                "budget": lead_data.get("budget")
            },
            "campaign": {
                "type": campaign_type,
                "sequence_type": sequence_type,
                "settings": self.settings,
                "templates": self.templates
            }
        }
    
    def _generate_email_sequence(
        self,
        campaign_type: str,
        sequence_type: str,
        lead_data: Dict
    ) -> List[Dict]:
        """Generate email sequence based on campaign type and sequence type."""
        sequence = []
        
        if campaign_type == "welcome":
            sequence = self._generate_welcome_sequence(sequence_type)
        elif campaign_type == "follow_up":
            sequence = self._generate_follow_up_sequence(sequence_type)
        elif campaign_type == "property_match":
            sequence = self._generate_property_match_sequence(
                sequence_type,
                lead_data
            )
        
        return sequence
    
    def _generate_welcome_sequence(self, sequence_type: str) -> List[Dict]:
        """Generate welcome email sequence."""
        return [
            {
                "template_id": "welcome_1",
                "delay_days": 0,
                "subject": "Welcome to Our Real Estate Service",
                "content_type": "html"
            },
            {
                "template_id": "welcome_2",
                "delay_days": 2,
                "subject": "Getting Started with Your Home Search",
                "content_type": "html"
            }
        ]
    
    def _generate_follow_up_sequence(self, sequence_type: str) -> List[Dict]:
        """Generate follow-up email sequence."""
        if sequence_type == "aggressive":
            return [
                {
                    "template_id": "follow_up_1",
                    "delay_days": 1,
                    "subject": "Following Up on Your Interest",
                    "content_type": "html"
                },
                {
                    "template_id": "follow_up_2",
                    "delay_days": 2,
                    "subject": "Don't Miss Out on Your Dream Home",
                    "content_type": "html"
                }
            ]
        else:
            return [
                {
                    "template_id": "follow_up_1",
                    "delay_days": 3,
                    "subject": "Checking In on Your Home Search",
                    "content_type": "html"
                }
            ]
    
    def _generate_property_match_sequence(
        self,
        sequence_type: str,
        lead_data: Dict
    ) -> List[Dict]:
        """Generate property match email sequence."""
        return [
            {
                "template_id": "property_match_1",
                "delay_days": 0,
                "subject": "Properties Matching Your Criteria",
                "content_type": "html",
                "properties": lead_data.get("matched_properties", [])
            }
        ]
    
    def _setup_ab_testing(self, sequence: List[Dict]) -> List[Dict]:
        """Set up A/B testing for email sequence."""
        for email in sequence:
            if email["template_id"] in self.ab_test_params:
                email["ab_test"] = {
                    "subject_lines": self.ab_test_params[email["template_id"]]["subjects"],
                    "content_variations": self.ab_test_params[email["template_id"]]["content"],
                    "test_size": 0.5
                }
        return sequence
    
    def _generate_schedule(self, sequence_type: str) -> List[Dict]:
        """Generate schedule for email sequence."""
        if sequence_type == "aggressive":
            return [
                {"email_index": 0, "send_time": "09:00"},
                {"email_index": 1, "send_time": "14:00"}
            ]
        else:
            return [
                {"email_index": 0, "send_time": "10:00"}
            ]
    
    def _prepare_email_content(
        self,
        email_data: Dict,
        template_id: str
    ) -> Dict:
        """Prepare email content using template."""
        template = self.templates.get(template_id, {})
        
        return {
            "to": email_data["recipient"],
            "subject": template["subject"].format(**email_data),
            "html_content": template["html"].format(**email_data),
            "text_content": template["text"].format(**email_data),
            "from": self.settings["sender_email"]
        }
    
    def _update_metrics(
        self,
        campaign_id: str,
        event_type: str,
        event_data: Dict
    ) -> Dict:
        """Update campaign metrics based on event."""
        metrics = {
            "sent": 0,
            "opened": 0,
            "clicked": 0,
            "replied": 0
        }
        
        if event_type == "open":
            metrics["opened"] = 1
        elif event_type == "click":
            metrics["clicked"] = 1
        elif event_type == "reply":
            metrics["replied"] = 1
        
        return metrics
    
    async def _store_metrics(self, campaign_id: str, metrics: Dict) -> None:
        """Store campaign metrics."""
        # TODO: Implement metrics storage
        pass
    
    def _generate_campaign_id(self) -> str:
        """Generate unique campaign ID."""
        return f"campaign_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    def _generate_fallback_campaign(
        self,
        lead_data: Dict,
        campaign_type: str
    ) -> Dict:
        """Generate a basic fallback campaign."""
        return {
            "campaign_id": self._generate_campaign_id(),
            "lead_id": lead_data.get("id"),
            "type": campaign_type,
            "sequence_type": "standard",
            "sequence": [],
            "schedule": [],
            "status": "error",
            "created_at": datetime.now().isoformat(),
            "metrics": {
                "sent": 0,
                "opened": 0,
                "clicked": 0,
                "replied": 0
            }
        }
    
    def _generate_fallback_send_result(self, campaign_id: str) -> Dict:
        """Generate a basic fallback send result."""
        return {
            "status": "failed",
            "message_id": None,
            "sent_at": datetime.now().isoformat(),
            "campaign_id": campaign_id
        }
    
    def _generate_fallback_metrics(self, campaign_id: str) -> Dict:
        """Generate a basic fallback metrics result."""
        return {
            "campaign_id": campaign_id,
            "event_type": "unknown",
            "metrics": {
                "sent": 0,
                "opened": 0,
                "clicked": 0,
                "replied": 0
            },
            "updated_at": datetime.now().isoformat()
        } 