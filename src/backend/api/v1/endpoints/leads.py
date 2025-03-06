from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from ....models.lead import Lead, LeadCreate, LeadUpdate, LeadResponse
from ....services.lead_service import LeadService
from ....core.deps import get_current_user
from ....models.base import PaginatedResponse

router = APIRouter()

@router.post("/", response_model=LeadResponse)
async def create_lead(
    lead: LeadCreate,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Create a new lead."""
    return await lead_service.create_lead(lead, current_user.id)

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Get a lead by ID."""
    lead = await lead_service.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Update a lead."""
    lead = await lead_service.update_lead(lead_id, lead_update)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Delete a lead."""
    success = await lead_service.delete_lead(lead_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}

@router.get("/", response_model=PaginatedResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    assigned_agent: Optional[str] = None,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """List leads with pagination and filtering."""
    return await lead_service.list_leads(
        page=page,
        size=size,
        status=status,
        assigned_agent=assigned_agent
    )

@router.post("/{lead_id}/interactions")
async def add_interaction(
    lead_id: str,
    interaction: dict,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Add an interaction to a lead."""
    lead = await lead_service.add_interaction(lead_id, interaction)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("/{lead_id}/qualify")
async def qualify_lead(
    lead_id: str,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Qualify a lead using AI."""
    result = await lead_service.qualify_lead(lead_id)
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result

@router.post("/{lead_id}/assign")
async def assign_lead(
    lead_id: str,
    agent_id: str,
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Assign a lead to an agent."""
    lead = await lead_service.assign_lead(lead_id, agent_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.get("/stats/summary")
async def get_lead_stats(
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Get lead statistics summary."""
    return await lead_service.get_lead_stats()

@router.post("/batch/import")
async def import_leads(
    leads: List[LeadCreate],
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Import multiple leads."""
    return await lead_service.import_leads(leads)

@router.post("/batch/export")
async def export_leads(
    lead_ids: List[str],
    format: str = "csv",
    current_user = Depends(get_current_user),
    lead_service: LeadService = Depends()
):
    """Export leads to specified format."""
    return await lead_service.export_leads(lead_ids, format) 