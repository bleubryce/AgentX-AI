from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from ....models.usage import UsageSummary, UsageUpdate
from ....services.usage_service import UsageService
from ....core.deps import get_current_active_user
from ....models.user import User

router = APIRouter()
usage_service = UsageService()

@router.get("/summary", response_model=List[UsageSummary])
async def get_usage_summaries(
    current_user: User = Depends(get_current_active_user)
):
    """Get usage summaries for all features of the current user's subscription."""
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    return await usage_service.get_all_usage_summaries(
        current_user.id,
        current_user.subscription_id
    )

@router.get("/summary/{feature}", response_model=UsageSummary)
async def get_feature_usage_summary(
    feature: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get usage summary for a specific feature."""
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    summary = await usage_service.get_usage_summary(
        current_user.id,
        current_user.subscription_id,
        feature
    )
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No usage data found for feature: {feature}"
        )
    
    return summary

@router.post("/increment/{feature}", response_model=UsageSummary)
async def increment_feature_usage(
    feature: str,
    usage_update: UsageUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Increment usage for a specific feature."""
    if not current_user.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    try:
        await usage_service.increment_usage(
            current_user.id,
            current_user.subscription_id,
            feature,
            count=usage_update.count,
            metadata=usage_update.metadata
        )
        return await usage_service.get_usage_summary(
            current_user.id,
            current_user.subscription_id,
            feature
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 