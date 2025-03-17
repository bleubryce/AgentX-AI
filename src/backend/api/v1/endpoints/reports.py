from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from ....services.report_service import ReportService
from ....services.payment_service import PaymentService
from ....services.subscription_service import SubscriptionService
from ....utils.auth import get_current_user
from ....utils.logger import logger

router = APIRouter()

def get_report_service(
    payment_service: PaymentService = Depends(),
    subscription_service: SubscriptionService = Depends()
) -> ReportService:
    return ReportService(payment_service, subscription_service)

@router.get("/export")
async def export_report(
    type: str = Query(..., description="Type of report to generate"),
    format: str = Query("csv", description="Export format (csv, xlsx, pdf)"),
    start_date: datetime = Query(..., description="Start date for the report"),
    end_date: datetime = Query(..., description="End date for the report"),
    report_service: ReportService = Depends(get_report_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Export a report in the specified format.
    """
    try:
        # Validate report type
        valid_types = ["revenue", "subscriptions", "usage", "churn"]
        if type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid report type. Must be one of: {', '.join(valid_types)}"
            )

        # Validate export format
        valid_formats = ["csv", "xlsx", "pdf"]
        if format not in valid_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid export format. Must be one of: {', '.join(valid_formats)}"
            )

        # Validate date range
        if end_date < start_date:
            raise HTTPException(
                status_code=400,
                detail="End date must be after start date"
            )

        # Generate report
        buffer = await report_service.generate_report(
            report_type=type,
            start_date=start_date,
            end_date=end_date,
            export_format=format
        )

        # Set appropriate content type and filename
        content_types = {
            "csv": "text/csv",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf"
        }
        
        filename = f"{type}_report_{start_date.date()}_{end_date.date()}.{format}"
        
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"'
        }

        return StreamingResponse(
            buffer,
            media_type=content_types[format],
            headers=headers
        )

    except Exception as e:
        logger.error(f"Error exporting report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate report"
        ) 