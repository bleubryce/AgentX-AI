from typing import Optional, Dict, Any, List
import pandas as pd
from datetime import datetime
from io import BytesIO
import json

from .payment_service import PaymentService
from .subscription_service import SubscriptionService
from ..models.payment import Payment
from ..models.subscription import Subscription
from ..utils.cache import cache
from ..utils.logger import logger


class ReportService:
    def __init__(
        self,
        payment_service: PaymentService,
        subscription_service: SubscriptionService
    ):
        self.payment_service = payment_service
        self.subscription_service = subscription_service

    async def generate_report(
        self,
        report_type: str,
        start_date: datetime,
        end_date: datetime,
        export_format: str = "csv"
    ) -> BytesIO:
        """Generate a report based on the specified type and date range."""
        try:
            # Get report data based on type
            data = await self._get_report_data(report_type, start_date, end_date)
            
            # Convert data to DataFrame
            df = pd.DataFrame(data)
            
            # Generate the report in the requested format
            buffer = BytesIO()
            
            if export_format == "csv":
                df.to_csv(buffer, index=False, encoding="utf-8")
            elif export_format == "xlsx":
                df.to_excel(buffer, index=False, engine="openpyxl")
            elif export_format == "pdf":
                # For PDF, we'll use HTML as an intermediate format
                html = df.to_html(index=False)
                # Use WeasyPrint or another PDF library to convert HTML to PDF
                # This is a placeholder - implement actual PDF generation
                buffer.write(b"PDF generation not implemented")
            else:
                raise ValueError(f"Unsupported export format: {export_format}")
            
            buffer.seek(0)
            return buffer
        
        except Exception as e:
            logger.error(f"Error generating {report_type} report: {str(e)}")
            raise

    async def _get_report_data(
        self,
        report_type: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get the data for a specific report type."""
        if report_type == "revenue":
            return await self._generate_revenue_report(start_date, end_date)
        elif report_type == "subscriptions":
            return await self._generate_subscription_report(start_date, end_date)
        elif report_type == "usage":
            return await self._generate_usage_report(start_date, end_date)
        elif report_type == "churn":
            return await self._generate_churn_report(start_date, end_date)
        else:
            raise ValueError(f"Unsupported report type: {report_type}")

    async def _generate_revenue_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Generate revenue report data."""
        payments = await self.payment_service.list_payments(
            start_date=start_date,
            end_date=end_date
        )
        
        report_data = []
        for payment in payments:
            report_data.append({
                "date": payment.created_at.date(),
                "amount": payment.amount,
                "currency": payment.currency,
                "status": payment.status,
                "payment_method": payment.payment_method,
                "customer_id": payment.customer_id
            })
        
        return report_data

    async def _generate_subscription_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Generate subscription report data."""
        subscriptions = await self.subscription_service.list_subscriptions(
            start_date=start_date,
            end_date=end_date
        )
        
        report_data = []
        for sub in subscriptions:
            report_data.append({
                "date": sub.created_at.date(),
                "plan": sub.plan_id,
                "status": sub.status,
                "customer_id": sub.customer_id,
                "start_date": sub.start_date.date(),
                "end_date": sub.end_date.date() if sub.end_date else None,
                "amount": sub.amount,
                "interval": sub.interval
            })
        
        return report_data

    async def _generate_usage_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Generate usage report data."""
        usage_data = await self.subscription_service.get_usage_metrics(
            start_date=start_date,
            end_date=end_date
        )
        
        report_data = []
        for usage in usage_data:
            report_data.append({
                "date": usage.date.date(),
                "metric": usage.metric,
                "value": usage.value,
                "customer_id": usage.customer_id,
                "limit": usage.limit,
                "usage_percentage": usage.usage_percentage
            })
        
        return report_data

    async def _generate_churn_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Generate churn analysis report data."""
        churn_data = await self.subscription_service.get_churn_analysis(
            start_date=start_date,
            end_date=end_date
        )
        
        report_data = []
        for data in churn_data:
            report_data.append({
                "date": data.date.date(),
                "total_customers": data.total_customers,
                "churned_customers": data.churned_customers,
                "churn_rate": data.churn_rate,
                "retention_rate": data.retention_rate
            })
        
        return report_data 