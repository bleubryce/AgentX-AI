from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app import crud, models, schemas
from app.models.lead import LeadStatus, LeadSource

router = APIRouter()

@router.get("/", response_model=List[schemas.Lead])
def read_leads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    status: Optional[LeadStatus] = None,
    source: Optional[LeadSource] = None
):
    """
    Retrieve leads with optional filtering by status and source.
    """
    filters: Dict[str, Any] = {}
    if status:
        filters["status"] = status
    if source:
        filters["source"] = source
    
    leads = crud.lead.get_leads(db, skip=skip, limit=limit, filters=filters)
    return leads

@router.post("/", response_model=schemas.Lead)
def create_lead(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    lead_in: schemas.LeadCreate
):
    """
    Create new lead.
    """
    lead = crud.lead.get_lead_by_email(db, email=lead_in.email)
    if lead:
        raise HTTPException(
            status_code=400,
            detail="A lead with this email already exists."
        )
    return crud.lead.create_lead(db=db, lead_in=lead_in)

@router.get("/{lead_id}", response_model=schemas.Lead)
def read_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get lead by ID.
    """
    lead = crud.lead.get_lead(db, lead_id=lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.put("/{lead_id}", response_model=schemas.Lead)
def update_lead(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    lead_id: int,
    lead_in: schemas.LeadUpdate
):
    """
    Update lead.
    """
    lead = crud.lead.get_lead(db, lead_id=lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return crud.lead.update_lead(db=db, db_lead=lead, lead_in=lead_in)

@router.delete("/{lead_id}", response_model=schemas.Lead)
def delete_lead(
    *,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    lead_id: int
):
    """
    Delete lead.
    """
    lead = crud.lead.get_lead(db, lead_id=lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return crud.lead.delete_lead(db=db, lead_id=lead_id) 