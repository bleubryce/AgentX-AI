"""
CRM Integration Handler for Real Estate
"""

from typing import Dict, List, Optional
import aiohttp
from datetime import datetime
from ..config import (
    HUBSPOT_API_KEY,
    CRM_SYNC_INTERVAL,
    LEAD_SCORING_CRITERIA,
    ZOHO_CRM_API_KEY,
    ZOHO_CRM_ACCOUNT_ID,
    ZOHO_CRM_MODULE
)

class CRMHandler:
    """CRM integration handler for real estate data synchronization."""
    
    def __init__(self):
        """Initialize the CRM handler with API keys and settings."""
        self.hubspot_api_key = HUBSPOT_API_KEY
        self.sync_interval = CRM_SYNC_INTERVAL
        self.lead_scoring_criteria = LEAD_SCORING_CRITERIA
        self.zoho_api_key = ZOHO_CRM_API_KEY
        self.zoho_account_id = ZOHO_CRM_ACCOUNT_ID
        self.zoho_module = ZOHO_CRM_MODULE
    
    async def sync_lead(self, lead_data: Dict, crm_type: str = "hubspot") -> Dict:
        """
        Synchronize lead data with CRM system.
        
        Args:
            lead_data: Dictionary containing lead information
            crm_type: Type of CRM ("hubspot", "zoho")
            
        Returns:
            Dict containing sync status and metadata
        """
        try:
            # Prepare lead data
            formatted_data = self._format_lead_data(lead_data)
            
            # Calculate lead score
            lead_score = self._calculate_lead_score(lead_data)
            
            # Sync with CRM
            if crm_type == "hubspot":
                sync_result = await self._sync_hubspot(formatted_data, lead_score)
            elif crm_type == "zoho":
                sync_result = await self._sync_zoho(formatted_data)
            else:
                raise ValueError(f"Unsupported CRM type: {crm_type}")
            
            # Add metadata
            sync_result.update({
                "sync_time": datetime.now().isoformat(),
                "crm_type": crm_type,
                "lead_score": lead_score,
                "sync_status": "success"
            })
            
            return sync_result
            
        except Exception as e:
            print(f"Error syncing lead with CRM: {str(e)}")
            return self._generate_fallback_sync(lead_data, crm_type)
    
    def _format_lead_data(self, lead_data: Dict) -> Dict:
        """Format lead data for CRM integration."""
        formatted = {
            "properties": {
                "email": lead_data.get("email", ""),
                "firstname": lead_data.get("first_name", ""),
                "lastname": lead_data.get("last_name", ""),
                "phone": lead_data.get("phone", ""),
                "property_type": lead_data.get("property_type", ""),
                "price_range": lead_data.get("budget_range", ""),
                "location": lead_data.get("location", ""),
                "timeline": lead_data.get("timeline", ""),
                "source": lead_data.get("source", "website"),
                "last_activity": datetime.now().isoformat()
            }
        }
        
        # Add custom properties if available
        if "custom_fields" in lead_data:
            formatted["properties"].update(lead_data["custom_fields"])
        
        return formatted
    
    def _calculate_lead_score(self, lead_data: Dict) -> float:
        """Calculate lead score based on defined criteria."""
        score = 0.0
        
        # Budget match
        if "budget_range" in lead_data and "price" in lead_data:
            budget_match = self._calculate_budget_match(
                lead_data["budget_range"],
                lead_data["price"]
            )
            score += budget_match * self.lead_scoring_criteria["budget_match"]
        
        # Timeline match
        if "timeline" in lead_data:
            timeline_score = self._calculate_timeline_score(lead_data["timeline"])
            score += timeline_score * self.lead_scoring_criteria["timeline_match"]
        
        # Location match
        if "location_preferences" in lead_data and "property_location" in lead_data:
            location_match = self._calculate_location_match(
                lead_data["location_preferences"],
                lead_data["property_location"]
            )
            score += location_match * self.lead_scoring_criteria["location_match"]
        
        # Urgency
        if "urgency" in lead_data:
            urgency_score = self._calculate_urgency_score(lead_data["urgency"])
            score += urgency_score * self.lead_scoring_criteria["urgency"]
        
        # Engagement
        if "engagement_history" in lead_data:
            engagement_score = self._calculate_engagement_score(
                lead_data["engagement_history"]
            )
            score += engagement_score * self.lead_scoring_criteria["engagement"]
        
        return min(score, 1.0)
    
    async def _sync_hubspot(self, lead_data: Dict, lead_score: float) -> Dict:
        """Sync lead data with HubSpot CRM."""
        headers = {
            "Authorization": f"Bearer {self.hubspot_api_key}",
            "Content-Type": "application/json"
        }
        
        # Add lead score to properties
        lead_data["properties"]["hs_lead_score"] = str(lead_score)
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.hubapi.com/crm/v3/objects/contacts",
                headers=headers,
                json=lead_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        "crm_id": result.get("id"),
                        "sync_details": result
                    }
                else:
                    raise Exception(f"HubSpot sync failed: {response.status}")
    
    async def _sync_zoho(self, lead_data: Dict) -> Dict:
        """
        Sync lead data with Zoho CRM.
        
        Args:
            lead_data: Formatted lead data for Zoho CRM
            
        Returns:
            Dict containing sync status and metadata
        """
        try:
            # Prepare Zoho-specific data format
            zoho_data = self._prepare_zoho_data(lead_data)
            
            # Sync with Zoho CRM
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"https://www.zohoapis.com/crm/v2/{self.zoho_module}",
                    headers={
                        "Authorization": f"Zoho-oauthtoken {self.zoho_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={"data": [zoho_data]}
                ) as response:
                    if response.status == 201:
                        result = await response.json()
                        return {
                            "status": "success",
                            "crm_id": result["data"][0]["id"],
                            "crm_type": "zoho",
                            "synced_at": datetime.now().isoformat(),
                            "metadata": {
                                "module": self.zoho_module,
                                "account_id": self.zoho_account_id
                            }
                        }
                    else:
                        raise Exception(f"Zoho sync failed: {response.status}")
                        
        except Exception as e:
            print(f"Error syncing with Zoho CRM: {str(e)}")
            return self._generate_fallback_sync(lead_data, "zoho")
    
    def _prepare_zoho_data(self, lead_data: Dict) -> Dict:
        """Format lead data for Zoho CRM."""
        return {
            "First_Name": lead_data.get("first_name", ""),
            "Last_Name": lead_data.get("last_name", ""),
            "Email": lead_data.get("email", ""),
            "Phone": lead_data.get("phone", ""),
            "Property_Type": lead_data.get("property_type", ""),
            "Budget": lead_data.get("budget", ""),
            "Timeline": lead_data.get("timeline", ""),
            "Lead_Source": "AI Realtor Assistant",
            "Lead_Status": "New",
            "Description": lead_data.get("notes", ""),
            "Account_Name": self.zoho_account_id
        }
    
    def _calculate_budget_match(self, budget_range: str, price: str) -> float:
        """Calculate how well the property price matches the budget range."""
        # TODO: Implement budget matching logic
        return 0.5
    
    def _calculate_timeline_score(self, timeline: str) -> float:
        """Calculate score based on timeline urgency."""
        timeline_scores = {
            "immediate": 1.0,
            "within_1_month": 0.8,
            "within_3_months": 0.6,
            "within_6_months": 0.4,
            "flexible": 0.2
        }
        return timeline_scores.get(timeline.lower(), 0.3)
    
    def _calculate_location_match(self, preferences: List[str], location: str) -> float:
        """Calculate how well the property location matches preferences."""
        # TODO: Implement location matching logic
        return 0.5
    
    def _calculate_urgency_score(self, urgency: str) -> float:
        """Calculate score based on urgency level."""
        urgency_scores = {
            "high": 1.0,
            "medium": 0.6,
            "low": 0.3
        }
        return urgency_scores.get(urgency.lower(), 0.3)
    
    def _calculate_engagement_score(self, engagement_history: List[Dict]) -> float:
        """Calculate score based on engagement history."""
        if not engagement_history:
            return 0.0
        
        # Weight recent activities more heavily
        recent_activities = [
            activity for activity in engagement_history
            if (datetime.now() - datetime.fromisoformat(activity["timestamp"])).days <= 30
        ]
        
        return min(len(recent_activities) / 5, 1.0)  # Cap at 5 recent activities
    
    def _generate_fallback_sync(self, lead_data: Dict, crm_type: str) -> Dict:
        """Generate a basic fallback sync result."""
        return {
            "crm_id": None,
            "sync_details": {"error": "Sync failed"},
            "sync_time": datetime.now().isoformat(),
            "crm_type": crm_type,
            "lead_score": 0.3,
            "sync_status": "failed"
        } 