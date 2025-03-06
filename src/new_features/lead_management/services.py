"""
Lead Management Service
"""
import time
from datetime import datetime
from typing import Dict, List, Optional
from ..existing.crm.crm_client import CRMClient
from ..existing.email.email_service import EmailService
from .models import (
    Lead, LeadCreate, LeadUpdate, LeadResponse, LeadListResponse,
    LeadInteraction, LeadStatus
)

class LeadManagementService:
    """Service for handling lead management operations"""
    
    def __init__(self, crm_client: CRMClient, email_service: EmailService):
        self.crm_client = crm_client
        self.email_service = email_service

    async def create_lead(self, lead_data: LeadCreate) -> LeadResponse:
        """
        Create a new lead
        
        Args:
            lead_data: LeadCreate model containing lead information
            
        Returns:
            LeadResponse containing the created lead
        """
        start_time = time.time()
        
        # Create lead in CRM
        lead_id = await self.crm_client.create_lead(lead_data.dict())
        
        # Create lead object
        lead = Lead(
            id=lead_id,
            **lead_data.dict()
        )
        
        # Send welcome email
        await self._send_welcome_email(lead)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return LeadResponse(
            lead=lead,
            metadata={
                "source": "crm",
                "version": "2.0"
            },
            processing_time=processing_time
        )

    async def get_lead(self, lead_id: str) -> LeadResponse:
        """
        Get a lead by ID
        
        Args:
            lead_id: ID of the lead to retrieve
            
        Returns:
            LeadResponse containing the lead
        """
        start_time = time.time()
        
        # Get lead from CRM
        lead_data = await self.crm_client.get_lead(lead_id)
        
        # Create lead object
        lead = Lead(**lead_data)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return LeadResponse(
            lead=lead,
            metadata={
                "source": "crm",
                "version": "2.0"
            },
            processing_time=processing_time
        )

    async def update_lead(self, lead_id: str, lead_data: LeadUpdate) -> LeadResponse:
        """
        Update an existing lead
        
        Args:
            lead_id: ID of the lead to update
            lead_data: LeadUpdate model containing update information
            
        Returns:
            LeadResponse containing the updated lead
        """
        start_time = time.time()
        
        # Update lead in CRM
        updated_data = await self.crm_client.update_lead(lead_id, lead_data.dict(exclude_unset=True))
        
        # Create lead object
        lead = Lead(**updated_data)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return LeadResponse(
            lead=lead,
            metadata={
                "source": "crm",
                "version": "2.0"
            },
            processing_time=processing_time
        )

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
        start_time = time.time()
        
        # Get leads from CRM
        leads_data = await self.crm_client.list_leads(
            page=page,
            page_size=page_size,
            status=status.value if status else None,
            lead_type=lead_type,
            assigned_to=assigned_to
        )
        
        # Create lead objects
        leads = [Lead(**lead_data) for lead_data in leads_data["leads"]]
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return LeadListResponse(
            leads=leads,
            total_count=leads_data["total_count"],
            page=page,
            page_size=page_size,
            metadata={
                "source": "crm",
                "version": "2.0"
            },
            processing_time=processing_time
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
        start_time = time.time()
        
        # Add interaction to CRM
        updated_data = await self.crm_client.add_interaction(
            lead_id,
            interaction.dict()
        )
        
        # Create lead object
        lead = Lead(**updated_data)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        return LeadResponse(
            lead=lead,
            metadata={
                "source": "crm",
                "version": "2.0"
            },
            processing_time=processing_time
        )

    async def _send_welcome_email(self, lead: Lead) -> None:
        """
        Send welcome email to new lead
        
        Args:
            lead: Lead object containing contact information
        """
        email_template = "welcome_email"
        email_data = {
            "first_name": lead.contact.first_name,
            "lead_type": lead.lead_type.value,
            "assigned_agent": lead.assigned_to
        }
        
        await self.email_service.send_email(
            to_email=lead.contact.email,
            template_name=email_template,
            template_data=email_data
        ) 