"""
Lead Management Integration Layer
"""
from typing import Dict, List, Optional
from datetime import datetime
from ..existing.crm.crm_client import CRMClient
from ..existing.email.email_service import EmailService
from ..existing.market.market_analyzer import MarketAnalyzer
from .models import (
    Lead, LeadCreate, LeadUpdate, LeadResponse, LeadListResponse,
    LeadInteraction, LeadStatus, LeadPreferences
)
from .services import LeadManagementService

class LeadManagementIntegration:
    """Integration layer for lead management feature"""
    
    def __init__(
        self,
        crm_client: CRMClient,
        email_service: EmailService,
        market_analyzer: MarketAnalyzer
    ):
        self.crm_client = crm_client
        self.email_service = email_service
        self.market_analyzer = market_analyzer
        self.service = LeadManagementService(crm_client, email_service)

    async def create_lead(self, lead_data: LeadCreate) -> LeadResponse:
        """
        Create a new lead with market analysis
        
        Args:
            lead_data: LeadCreate model containing lead information
            
        Returns:
            LeadResponse containing the created lead
        """
        # Create lead using service
        response = await self.service.create_lead(lead_data)
        
        # If lead is a buyer or seller, analyze market
        if lead_data.lead_type in ["buyer", "seller"]:
            market_analysis = await self._analyze_market_for_lead(
                lead_data.preferences,
                lead_data.lead_type
            )
            
            # Update lead with market analysis
            update_data = LeadUpdate(
                metadata={
                    "market_analysis": market_analysis
                }
            )
            response = await self.service.update_lead(
                response.lead.id,
                update_data
            )
        
        return response

    async def get_lead(self, lead_id: str) -> LeadResponse:
        """
        Get a lead by ID with market analysis
        
        Args:
            lead_id: ID of the lead to retrieve
            
        Returns:
            LeadResponse containing the lead
        """
        response = await self.service.get_lead(lead_id)
        
        # If lead is a buyer or seller and has no market analysis
        if (
            response.lead.lead_type in ["buyer", "seller"] and
            "market_analysis" not in response.lead.metadata
        ):
            market_analysis = await self._analyze_market_for_lead(
                response.lead.preferences,
                response.lead.lead_type
            )
            
            # Update lead with market analysis
            update_data = LeadUpdate(
                metadata={
                    "market_analysis": market_analysis
                }
            )
            response = await self.service.update_lead(
                lead_id,
                update_data
            )
        
        return response

    async def update_lead(self, lead_id: str, lead_data: LeadUpdate) -> LeadResponse:
        """
        Update an existing lead with market analysis if needed
        
        Args:
            lead_id: ID of the lead to update
            lead_data: LeadUpdate model containing update information
            
        Returns:
            LeadResponse containing the updated lead
        """
        # Get current lead data
        current_lead = await self.service.get_lead(lead_id)
        
        # Update lead using service
        response = await self.service.update_lead(lead_id, lead_data)
        
        # If preferences were updated and lead is a buyer or seller
        if (
            lead_data.preferences and
            response.lead.lead_type in ["buyer", "seller"]
        ):
            market_analysis = await self._analyze_market_for_lead(
                response.lead.preferences,
                response.lead.lead_type
            )
            
            # Update lead with new market analysis
            update_data = LeadUpdate(
                metadata={
                    "market_analysis": market_analysis,
                    "last_market_analysis": datetime.utcnow().isoformat()
                }
            )
            response = await self.service.update_lead(
                lead_id,
                update_data
            )
        
        return response

    async def list_leads(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[LeadStatus] = None,
        lead_type: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> LeadListResponse:
        """
        List leads with filtering and pagination
        
        Args:
            page: Page number
            page_size: Number of items per page
            status: Filter by lead status
            lead_type: Filter by lead type
            assigned_to: Filter by assigned agent
            
        Returns:
            LeadListResponse containing the list of leads
        """
        return await self.service.list_leads(
            page=page,
            page_size=page_size,
            status=status,
            lead_type=lead_type,
            assigned_to=assigned_to
        )

    async def add_interaction(
        self,
        lead_id: str,
        interaction: LeadInteraction
    ) -> LeadResponse:
        """
        Add an interaction to a lead
        
        Args:
            lead_id: ID of the lead
            interaction: LeadInteraction model containing interaction details
            
        Returns:
            LeadResponse containing the updated lead
        """
        return await self.service.add_interaction(lead_id, interaction)

    async def _analyze_market_for_lead(
        self,
        preferences: LeadPreferences,
        lead_type: str
    ) -> Dict:
        """
        Analyze market for a lead's preferences
        
        Args:
            preferences: Lead preferences
            lead_type: Type of lead
            
        Returns:
            Dictionary containing market analysis
        """
        # Get primary location from preferences
        location = preferences.preferred_locations[0]
        
        # Get primary property type
        property_type = preferences.property_type[0]
        
        # Analyze market
        market_data = await self.market_analyzer.analyze_market(
            location=location,
            property_type=property_type,
            timeframe="6m"
        )
        
        # Add lead-specific insights
        market_data["lead_insights"] = {
            "price_range_match": self._calculate_price_range_match(
                market_data,
                preferences
            ),
            "property_type_match": self._calculate_property_type_match(
                market_data,
                preferences
            ),
            "location_match": self._calculate_location_match(
                market_data,
                preferences
            )
        }
        
        return market_data

    def _calculate_price_range_match(
        self,
        market_data: Dict,
        preferences: LeadPreferences
    ) -> float:
        """Calculate how well market prices match lead's price range"""
        if not preferences.min_price or not preferences.max_price:
            return 1.0
            
        current_price = market_data["price_trends"]["current_price"]
        price_range = preferences.max_price - preferences.min_price
        
        if current_price < preferences.min_price:
            return 0.0
        elif current_price > preferences.max_price:
            return 0.0
        else:
            return 1.0 - (
                abs(current_price - (preferences.min_price + price_range / 2)) /
                (price_range / 2)
            )

    def _calculate_property_type_match(
        self,
        market_data: Dict,
        preferences: LeadPreferences
    ) -> float:
        """Calculate how well market property types match lead's preferences"""
        if not preferences.property_type:
            return 1.0
            
        market_property_type = market_data.get("property_type")
        return 1.0 if market_property_type in preferences.property_type else 0.0

    def _calculate_location_match(
        self,
        market_data: Dict,
        preferences: LeadPreferences
    ) -> float:
        """Calculate how well market location matches lead's preferences"""
        if not preferences.preferred_locations:
            return 1.0
            
        market_location = market_data.get("location")
        return 1.0 if market_location in preferences.preferred_locations else 0.0 