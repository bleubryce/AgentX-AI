"""
Lead Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..existing.crm.crm_client import CRMClient
from ..existing.email.email_service import EmailService
from .models import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse,
    LeadInteraction, LeadStatus
)
from .services import LeadManagementService

router = APIRouter(
    prefix="/api/v2/leads",
    tags=["lead-management"]
)

def get_lead_management_service(
    crm_client: CRMClient = Depends(),
    email_service: EmailService = Depends()
) -> LeadManagementService:
    """Dependency injection for lead management service"""
    return LeadManagementService(crm_client, email_service)

@router.post("", response_model=LeadResponse)
async def create_lead(
    lead_data: LeadCreate,
    service: LeadManagementService = Depends(get_lead_management_service)
) -> LeadResponse:
    """
    Create a new lead
    
    Args:
        lead_data: LeadCreate model containing lead information
        service: LeadManagementService instance
        
    Returns:
        LeadResponse containing the created lead
    """
    try:
        return await service.create_lead(lead_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating lead: {str(e)}"
        )

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    service: LeadManagementService = Depends(get_lead_management_service)
) -> LeadResponse:
    """
    Get a lead by ID
    
    Args:
        lead_id: ID of the lead to retrieve
        service: LeadManagementService instance
        
    Returns:
        LeadResponse containing the lead
    """
    try:
        return await service.get_lead(lead_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving lead: {str(e)}"
        )

@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    service: LeadManagementService = Depends(get_lead_management_service)
) -> LeadResponse:
    """
    Update an existing lead
    
    Args:
        lead_id: ID of the lead to update
        lead_data: LeadUpdate model containing update information
        service: LeadManagementService instance
        
    Returns:
        LeadResponse containing the updated lead
    """
    try:
        return await service.update_lead(lead_id, lead_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating lead: {str(e)}"
        )

@router.get("", response_model=LeadListResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[LeadStatus] = None,
    lead_type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    service: LeadManagementService = Depends(get_lead_management_service)
) -> LeadListResponse:
    """
    List leads with filtering and pagination
    
    Args:
        page: Page number
        page_size: Number of items per page
        status: Filter by lead status
        lead_type: Filter by lead type
        assigned_to: Filter by assigned agent
        service: LeadManagementService instance
        
    Returns:
        LeadListResponse containing the list of leads
    """
    try:
        return await service.list_leads(
            page=page,
            page_size=page_size,
            status=status,
            lead_type=lead_type,
            assigned_to=assigned_to
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing leads: {str(e)}"
        )

@router.post("/{lead_id}/interactions", response_model=LeadResponse)
async def add_interaction(
    lead_id: str,
    interaction: LeadInteraction,
    service: LeadManagementService = Depends(get_lead_management_service)
) -> LeadResponse:
    """
    Add an interaction to a lead
    
    Args:
        lead_id: ID of the lead
        interaction: LeadInteraction model containing interaction details
        service: LeadManagementService instance
        
    Returns:
        LeadResponse containing the updated lead
    """
    try:
        return await service.add_interaction(lead_id, interaction)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding interaction: {str(e)}"
        ) 