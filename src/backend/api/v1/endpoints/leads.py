from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status, Path
from datetime import datetime
from ....models.lead import (
    Lead,
    LeadCreate,
    LeadUpdate,
    LeadActivity,
    LeadStatus,
    PropertyType,
    LeadSource,
    LeadInteraction
)
from ....services.lead_service import LeadService
from ....core.auth import get_current_user, get_current_realtor
from ....models.user import User
from ....core.cache import rate_limit, cached
from ....db.repositories.lead_repository import LeadRepository
from ....api.deps import get_current_active_user

router = APIRouter()

@router.post("/", response_model=Lead)
async def create_lead(
    lead_data: LeadCreate,
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Create a new lead.
    """
    return await lead_repo.create_lead(lead_data, current_user.id)

@router.get("/{lead_id}", response_model=Lead)
async def get_lead(
    lead_id: str = Path(..., description="The ID of the lead to get"),
    current_user = Depends(get_current_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Get a lead by ID.
    """
    lead = await lead_repo.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}", response_model=Lead)
async def update_lead(
    lead_data: LeadUpdate,
    lead_id: str = Path(..., description="The ID of the lead to update"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Update a lead.
    """
    lead = await lead_repo.update_lead(lead_id, lead_data, current_user.id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.delete("/{lead_id}", response_model=bool)
async def delete_lead(
    lead_id: str = Path(..., description="The ID of the lead to delete"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Delete a lead.
    """
    result = await lead_repo.delete_lead(lead_id)
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result

@router.get("/", response_model=List[Lead])
async def list_leads(
    status: Optional[LeadStatus] = None,
    source: Optional[LeadSource] = None,
    assigned_agent_id: Optional[str] = None,
    property_type: Optional[str] = None,
    min_priority: Optional[int] = Query(None, ge=1, le=5),
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    last_contact_after: Optional[datetime] = None,
    tags: Optional[List[str]] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    sort_by: str = Query("created_at"),
    sort_order: int = Query(-1),
    current_user = Depends(get_current_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    List leads with filters.
    """
    return await lead_repo.list_leads(
        status=status,
        source=source,
        assigned_agent_id=assigned_agent_id,
        property_type=property_type,
        min_priority=min_priority,
        created_after=created_after,
        created_before=created_before,
        last_contact_after=last_contact_after,
        tags=tags,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.get("/count", response_model=int)
async def count_leads(
    status: Optional[LeadStatus] = None,
    source: Optional[LeadSource] = None,
    assigned_agent_id: Optional[str] = None,
    property_type: Optional[str] = None,
    min_priority: Optional[int] = Query(None, ge=1, le=5),
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    last_contact_after: Optional[datetime] = None,
    tags: Optional[List[str]] = Query(None),
    current_user = Depends(get_current_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Count leads with filters.
    """
    return await lead_repo.count_leads(
        status=status,
        source=source,
        assigned_agent_id=assigned_agent_id,
        property_type=property_type,
        min_priority=min_priority,
        created_after=created_after,
        created_before=created_before,
        last_contact_after=last_contact_after,
        tags=tags
    )

@router.get("/{lead_id}/activities", response_model=List[LeadActivity])
async def get_lead_activities(
    lead_id: str = Path(..., description="The ID of the lead"),
    limit: int = Query(50, ge=1, le=1000),
    current_user = Depends(get_current_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Get activities for a lead.
    """
    lead = await lead_repo.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return await lead_repo.get_lead_activities(lead_id, limit)

@router.post("/{lead_id}/activities", response_model=Lead)
async def add_lead_activity(
    activity: LeadActivity,
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Add an activity to a lead.
    """
    lead = await lead_repo.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Set the performer to the current user if not specified
    if not activity.performed_by:
        activity.performed_by = current_user.id
    
    return await lead_repo.add_activity(lead_id, activity)

@router.get("/{lead_id}/interactions", response_model=List[LeadInteraction])
async def get_lead_interactions(
    lead_id: str = Path(..., description="The ID of the lead"),
    limit: int = Query(50, ge=1, le=1000),
    current_user = Depends(get_current_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Get interactions for a lead.
    """
    lead = await lead_repo.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return await lead_repo.get_lead_interactions(lead_id, limit)

@router.post("/{lead_id}/interactions", response_model=Lead)
async def add_lead_interaction(
    interaction: LeadInteraction,
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Add an interaction to a lead.
    """
    lead = await lead_repo.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Set the agent to the current user if not specified
    if not interaction.agent_id:
        interaction.agent_id = current_user.id
    
    return await lead_repo.add_interaction(lead_id, interaction)

@router.put("/{lead_id}/priority", response_model=Lead)
async def update_lead_priority(
    priority: int = Query(..., ge=1, le=5, description="New priority (1-5)"),
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Update a lead's priority.
    """
    lead = await lead_repo.update_priority(lead_id, priority, current_user.id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}/assign", response_model=Lead)
async def assign_lead(
    assigned_agent_id: str = Query(..., description="ID of the agent to assign"),
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Assign a lead to an agent.
    """
    lead = await lead_repo.assign_lead(lead_id, assigned_agent_id, current_user.id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}/followup", response_model=Lead)
async def update_next_followup(
    next_followup: datetime = Query(..., description="Next followup date/time"),
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Update a lead's next followup date.
    """
    lead = await lead_repo.update_next_followup(lead_id, next_followup, current_user.id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("/{lead_id}/tags", response_model=Lead)
async def add_lead_tags(
    tags: List[str] = Query(..., description="Tags to add"),
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Add tags to a lead.
    """
    lead = await lead_repo.add_tags(lead_id, tags, current_user.id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.delete("/{lead_id}/tags", response_model=Lead)
async def remove_lead_tags(
    tags: List[str] = Query(..., description="Tags to remove"),
    lead_id: str = Path(..., description="The ID of the lead"),
    current_user = Depends(get_current_active_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Remove tags from a lead.
    """
    lead = await lead_repo.remove_tags(lead_id, tags, current_user.id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.get("/statistics", response_model=dict)
async def get_lead_statistics(
    current_user = Depends(get_current_user),
    lead_repo: LeadRepository = Depends(lambda: LeadRepository())
):
    """
    Get statistics about leads.
    """
    return await lead_repo.get_lead_statistics()

@router.get("/stats/by-status", response_model=Dict[str, int])
@cached(key_prefix="leads_by_status", expire=300)
async def get_leads_by_status(
    current_user: User = Depends(get_current_user),
    lead_service: LeadService = Depends()
) -> Dict[str, int]:
    """Get lead count by status."""
    return await lead_service.get_leads_by_status()

@router.get("/stats/by-source", response_model=Dict[str, int])
@cached(key_prefix="leads_by_source", expire=300)
async def get_leads_by_source(
    current_user: User = Depends(get_current_user),
    lead_service: LeadService = Depends()
) -> Dict[str, int]:
    """Get lead count by source."""
    return await lead_service.get_leads_by_source()

@router.get("/stats/by-property-type", response_model=Dict[str, int])
@cached(key_prefix="leads_by_property_type", expire=300)
async def get_leads_by_property_type(
    current_user: User = Depends(get_current_user),
    lead_service: LeadService = Depends()
) -> Dict[str, int]:
    """Get lead count by property type."""
    return await lead_service.get_leads_by_property_type()

@router.get("/stats/conversion-rates", response_model=Dict[str, float])
@cached(key_prefix="lead_conversion_rates", expire=300)
async def get_conversion_rates(
    current_user: User = Depends(get_current_user),
    lead_service: LeadService = Depends()
) -> Dict[str, float]:
    """Get conversion rates by source."""
    return await lead_service.get_conversion_rates()

@router.put("/{lead_id}/probability")
async def update_conversion_probability(
    lead_id: str,
    probability: float = Query(..., ge=0, le=100),
    current_user: User = Depends(get_current_realtor),
    lead_service: LeadService = Depends()
) -> Dict[str, str]:
    """Update lead's conversion probability."""
    # Verify lead exists
    lead = await lead_service.get_by_id(lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Update probability
    if await lead_service.update_conversion_probability(lead_id, probability):
        return {"message": "Conversion probability updated successfully"}
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to update conversion probability"
    ) 