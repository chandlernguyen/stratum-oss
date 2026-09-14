"""
API endpoints for similarity detection and duplicate management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import logging

from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.services.similarity_detection_service import (
    SimilarityDetectionService,
    SimilarityResult,
    ItemGroup
)
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/similarity",
    tags=["similarity-detection"]
)

class SimilarityCheckRequest(BaseModel):
    """Request model for similarity checking"""
    items: List[Dict[str, Any]] = Field(description="Items to check for similarity")
    resource_type: str = Field(default="generic", description="Type of resource (brand_guidelines, marketing_strategy, etc.)")
    threshold: float = Field(default=0.70, ge=0.0, le=1.0, description="Similarity threshold")

class DuplicateCheckResponse(BaseModel):
    """Response model for duplicate checking"""
    has_duplicates: bool = Field(description="Whether duplicates were found")
    duplicate_groups: List[ItemGroup] = Field(default_factory=list, description="Groups of similar items")
    alerts: Optional[Dict[str, Any]] = Field(default=None, description="Any alerts or warnings")
    summary: str = Field(description="Summary of findings")

@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
async def check_duplicates(
    request: SimilarityCheckRequest,
    current_user: dict = Depends(get_current_user_with_org)
) -> DuplicateCheckResponse:
    """
    Check a list of items for duplicates using LLM-based similarity detection.
    """
    try:
        service = SimilarityDetectionService()

        # Find duplicate groups
        duplicate_groups = await service.find_duplicates(
            items=request.items,
            resource_type=request.resource_type,
            similarity_threshold=request.threshold
        )

        has_duplicates = len(duplicate_groups) > 0

        # Generate summary
        if has_duplicates:
            total_duplicates = sum(len(group.item_ids) - 1 for group in duplicate_groups)
            summary = f"Found {total_duplicates} duplicate(s) across {len(duplicate_groups)} group(s)"
        else:
            summary = "No duplicates detected"

        return DuplicateCheckResponse(
            has_duplicates=has_duplicates,
            duplicate_groups=duplicate_groups,
            summary=summary
        )

    except Exception as e:
        logger.error(f"Error checking duplicates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/brand-guidelines/check-active")
async def check_active_brand_guidelines(
    current_user: dict = Depends(get_current_user_with_org)
) -> Dict[str, Any]:
    """
    Check for multiple active brand guidelines and potential conflicts.
    Returns alerts if issues are detected.
    """
    try:
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="Organization ID not found")

        # Fetch active brand guidelines
        supabase = get_supabase_client()
        result = supabase.table("brand_guidelines") \
            .select("*") \
            .eq("org_id", org_id) \
            .is_("archived_at", "null") \
            .execute()

        guidelines = result.data if result.data else []

        # Check for issues
        service = SimilarityDetectionService()
        alerts = await service.check_active_guidelines_conflict(guidelines)

        # Also check for duplicates among all guidelines
        duplicate_groups = []
        if len(guidelines) > 1:
            duplicate_groups = await service.find_duplicates(
                items=guidelines,
                resource_type='brand_guidelines',
                similarity_threshold=0.85
            )

        return {
            "total_guidelines": len(guidelines),
            "active_count": len([g for g in guidelines if g.get('is_active', False)]),
            "alerts": alerts,
            "duplicate_groups": duplicate_groups,
            "recommendations": _generate_recommendations(guidelines, alerts, duplicate_groups)
        }

    except Exception as e:
        logger.error(f"Error checking active brand guidelines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare-items")
async def compare_two_items(
    item1: Dict[str, Any],
    item2: Dict[str, Any],
    resource_type: str = Query(default="generic", description="Type of resource"),
    current_user: dict = Depends(get_current_user_with_org)
) -> SimilarityResult:
    """
    Compare two specific items and get detailed similarity analysis.
    """
    try:
        service = SimilarityDetectionService()
        result = await service.compare_items(item1, item2, resource_type)
        return result

    except Exception as e:
        logger.error(f"Error comparing items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _generate_recommendations(
    guidelines: List[Dict[str, Any]],
    alerts: Optional[Dict[str, Any]],
    duplicate_groups: List[ItemGroup]
) -> List[str]:
    """
    Generate actionable recommendations based on the analysis.
    """
    recommendations = []

    # Check for multiple active guidelines
    active_count = len([g for g in guidelines if g.get('is_active', False)])
    if active_count > 1:
        recommendations.append(
            f"You have {active_count} active brand guidelines. Consider deactivating older versions to maintain consistency."
        )

    # Check for duplicates
    if duplicate_groups:
        total_duplicates = sum(len(group.item_ids) - 1 for group in duplicate_groups)
        recommendations.append(
            f"Found {total_duplicates} duplicate guideline(s). Consider archiving duplicates to reduce confusion."
        )

    # Check for no active guidelines
    if active_count == 0 and guidelines:
        recommendations.append(
            "No active brand guidelines found. Activate one to ensure consistent content creation."
        )

    # Check for too many guidelines
    if len(guidelines) > 5:
        recommendations.append(
            f"You have {len(guidelines)} brand guidelines. Consider consolidating or archiving older versions."
        )

    if not recommendations:
        recommendations.append("Your brand guidelines are well organized.")

    return recommendations