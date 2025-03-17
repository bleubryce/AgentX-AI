from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadStatus, LeadSource
from app.schemas.analytics import (
    ConversionMetrics,
    SourceMetrics,
    TimeSeriesPoint,
    LeadTrend,
    StatusDistribution,
    LeadAnalytics
)

def get_conversion_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> ConversionMetrics:
    query = db.query(Lead)
    if start_date:
        query = query.filter(Lead.created_at >= start_date)
    if end_date:
        query = query.filter(Lead.created_at <= end_date)

    total_leads = query.count()
    converted_leads = query.filter(Lead.status == LeadStatus.CONVERTED).count()
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0.0

    # Calculate average conversion time for converted leads
    converted = query.filter(Lead.status == LeadStatus.CONVERTED).all()
    if converted:
        total_time = sum(
            (lead.updated_at - lead.created_at).total_seconds()
            for lead in converted
            if lead.updated_at
        )
        avg_time = total_time / len(converted) / 86400  # Convert to days
    else:
        avg_time = None

    return ConversionMetrics(
        total_leads=total_leads,
        converted_leads=converted_leads,
        conversion_rate=conversion_rate,
        average_conversion_time=avg_time
    )

def get_source_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[SourceMetrics]:
    metrics = []
    
    for source in LeadSource:
        query = db.query(Lead).filter(Lead.source == source)
        if start_date:
            query = query.filter(Lead.created_at >= start_date)
        if end_date:
            query = query.filter(Lead.created_at <= end_date)

        total = query.count()
        converted = query.filter(Lead.status == LeadStatus.CONVERTED).count()
        conversion_rate = (converted / total * 100) if total > 0 else 0.0

        metrics.append(
            SourceMetrics(
                source=source,
                total_leads=total,
                converted_leads=converted,
                conversion_rate=conversion_rate
            )
        )
    
    return metrics

def get_lead_trends(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> LeadTrend:
    if not start_date:
        start_date = db.query(func.min(Lead.created_at)).scalar() or datetime.utcnow()
    if not end_date:
        end_date = datetime.utcnow()

    total_leads = []
    new_leads = []
    converted_leads = []
    
    current_date = start_date
    while current_date <= end_date:
        next_date = current_date + timedelta(days=1)
        
        # Total leads up to this date
        total = db.query(Lead).filter(Lead.created_at < next_date).count()
        total_leads.append(
            TimeSeriesPoint(date=current_date, value=total)
        )
        
        # New leads on this date
        new = db.query(Lead).filter(
            and_(
                Lead.created_at >= current_date,
                Lead.created_at < next_date
            )
        ).count()
        new_leads.append(
            TimeSeriesPoint(date=current_date, value=new)
        )
        
        # Converted leads on this date
        converted = db.query(Lead).filter(
            and_(
                Lead.status == LeadStatus.CONVERTED,
                Lead.updated_at >= current_date,
                Lead.updated_at < next_date
            )
        ).count()
        converted_leads.append(
            TimeSeriesPoint(date=current_date, value=converted)
        )
        
        current_date = next_date

    return LeadTrend(
        total_leads=total_leads,
        new_leads=new_leads,
        converted_leads=converted_leads
    )

def get_status_distribution(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[StatusDistribution]:
    query = db.query(Lead)
    if start_date:
        query = query.filter(Lead.created_at >= start_date)
    if end_date:
        query = query.filter(Lead.created_at <= end_date)

    total_leads = query.count()
    distribution = []

    for status in LeadStatus:
        count = query.filter(Lead.status == status).count()
        percentage = (count / total_leads * 100) if total_leads > 0 else 0.0
        distribution.append(
            StatusDistribution(
                status=status,
                count=count,
                percentage=percentage
            )
        )

    return distribution

def get_lead_analytics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> LeadAnalytics:
    return LeadAnalytics(
        conversion_metrics=get_conversion_metrics(db, start_date, end_date),
        source_metrics=get_source_metrics(db, start_date, end_date),
        lead_trends=get_lead_trends(db, start_date, end_date),
        status_distribution=get_status_distribution(db, start_date, end_date)
    ) 