from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate

def get_lead(db: Session, lead_id: int) -> Optional[Lead]:
    return db.query(Lead).filter(Lead.id == lead_id).first()

def get_lead_by_email(db: Session, email: str) -> Optional[Lead]:
    return db.query(Lead).filter(Lead.email == email).first()

def get_leads(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    filters: Optional[Dict[str, Any]] = None
) -> List[Lead]:
    query = db.query(Lead)
    if filters:
        for field, value in filters.items():
            if hasattr(Lead, field) and value is not None:
                query = query.filter(getattr(Lead, field) == value)
    return query.offset(skip).limit(limit).all()

def create_lead(db: Session, lead_in: LeadCreate) -> Lead:
    lead_data = jsonable_encoder(lead_in)
    db_lead = Lead(**lead_data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def update_lead(
    db: Session,
    db_lead: Lead,
    lead_in: LeadUpdate
) -> Lead:
    lead_data = jsonable_encoder(db_lead)
    update_data = lead_in.model_dump(exclude_unset=True)
    
    for field in lead_data:
        if field in update_data:
            setattr(db_lead, field, update_data[field])
    
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def delete_lead(db: Session, lead_id: int) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead:
        db.delete(lead)
        db.commit()
    return lead 