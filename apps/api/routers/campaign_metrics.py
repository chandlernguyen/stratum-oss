"""
Campaign Metrics API Router
Handles CSV import of campaign performance data
Date: 2025-10-16
Pattern: Database-First with bulk insert
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional
from datetime import date
from supabase import Client
import logging

from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/campaign-metrics", tags=["campaign-metrics"])


# Request Models
class CampaignMetricRow(BaseModel):
    """Single campaign metric row"""
    campaign_name: str = Field(..., min_length=1)
    metric_date: date
    spend: float = Field(..., ge=0)
    revenue: Optional[float] = Field(None, ge=0)
    impressions: Optional[int] = Field(None, ge=0)
    clicks: Optional[int] = Field(None, ge=0)
    conversions: Optional[int] = Field(None, ge=0)
    source: Optional[str] = Field('csv')
    notes: Optional[str] = None

    @validator('source')
    def validate_source(cls, v):
        """Validate source is one of allowed values"""
        allowed_sources = ['google_ads', 'meta_ads', 'linkedin_ads', 'csv', 'manual', 'other']
        if v and v not in allowed_sources:
            return 'other'
        return v or 'csv'


class ImportCampaignMetricsRequest(BaseModel):
    """Request to import campaign metrics from CSV"""
    metrics: List[CampaignMetricRow]
    mappings: Dict[str, str]  # campaign_name -> campaign_id

    class Config:
        json_schema_extra = {
            "example": {
                "metrics": [
                    {
                        "campaign_name": "Summer Sale 2025",
                        "metric_date": "2025-10-01",
                        "spend": 1500.00,
                        "revenue": 4500.00,
                        "impressions": 50000,
                        "clicks": 2500,
                        "conversions": 150,
                        "source": "google_ads"
                    }
                ],
                "mappings": {
                    "Summer Sale 2025": "abc-123-def-456"
                }
            }
        }


# Response Models
class ImportSummary(BaseModel):
    """Summary of import operation"""
    success: bool
    imported_count: int
    skipped_count: int
    error_count: int
    campaigns_mapped: int
    errors: List[str] = []


# Endpoints
@router.post("/import", response_model=ImportSummary)
async def import_campaign_metrics(
    request: ImportCampaignMetricsRequest,
    current_user: Dict = Depends(get_current_user),
    db: Client = Depends(get_supabase_client)
):
    """
    Import campaign metrics from CSV with user-provided mappings.

    This endpoint:
    1. Validates all campaign mappings exist
    2. Enriches metrics with campaign_id and org_id
    3. Performs bulk insert to campaign_metrics table
    4. Returns summary of import operation

    Args:
        request: Import request with metrics and mappings
        current_user: Authenticated user context
        db: Database client

    Returns:
        ImportSummary with counts and any errors
    """
    org_id = current_user.get('org_id')
    if not org_id:
        raise HTTPException(
            status_code=400,
            detail="Organization ID not found in user context"
        )

    user_id = current_user.get('id')
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="User ID not found in user context"
        )

    logger.info(f"[import_campaign_metrics] Starting import for org_id={org_id}, user_id={user_id}")
    logger.info(f"[import_campaign_metrics] Metrics count: {len(request.metrics)}")
    logger.info(f"[import_campaign_metrics] Mappings count: {len(request.mappings)}")

    errors: List[str] = []
    skipped_count = 0

    try:
        # Step 1: Validate all mapped campaigns exist and belong to org
        campaign_ids = list(set(request.mappings.values()))
        logger.info(f"[import_campaign_metrics] Validating {len(campaign_ids)} campaign IDs")

        campaigns_response = db.table("campaigns")\
            .select("id, name")\
            .eq("org_id", org_id)\
            .in_("id", campaign_ids)\
            .is_("archived_at", "null")\
            .execute()

        valid_campaign_ids = {c['id'] for c in (campaigns_response.data or [])}
        logger.info(f"[import_campaign_metrics] Found {len(valid_campaign_ids)} valid campaigns")

        # Check for invalid campaign IDs in mappings
        invalid_mappings = {
            name: cid for name, cid in request.mappings.items()
            if cid not in valid_campaign_ids
        }

        if invalid_mappings:
            error_msg = f"Invalid campaign IDs in mappings: {list(invalid_mappings.keys())}"
            logger.error(f"[import_campaign_metrics] {error_msg}")
            errors.append(error_msg)
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )

        # Step 2: Enrich metrics data with campaign_id and org_id
        enriched_data = []
        for metric in request.metrics:
            campaign_id = request.mappings.get(metric.campaign_name)

            if not campaign_id:
                logger.warning(f"[import_campaign_metrics] No mapping for campaign: {metric.campaign_name}")
                skipped_count += 1
                errors.append(f"No mapping found for campaign: {metric.campaign_name}")
                continue

            enriched_data.append({
                "org_id": org_id,
                "campaign_id": campaign_id,
                "campaign_name": metric.campaign_name,
                "metric_date": metric.metric_date.isoformat(),
                "spend": metric.spend,
                "revenue": metric.revenue,
                "impressions": metric.impressions,
                "clicks": metric.clicks,
                "conversions": metric.conversions,
                "source": metric.source,
                "import_method": "csv",
                "created_by": user_id
            })

        logger.info(f"[import_campaign_metrics] Enriched {len(enriched_data)} metrics for insert")

        # Step 3: Bulk insert with upsert (ON CONFLICT DO UPDATE)
        # Using upsert to handle duplicate entries based on UNIQUE constraint
        if enriched_data:
            insert_response = db.table("campaign_metrics")\
                .upsert(enriched_data, on_conflict="org_id,campaign_name,metric_date,source")\
                .execute()

            imported_count = len(insert_response.data or [])
            logger.info(f"[import_campaign_metrics] Successfully inserted {imported_count} metrics")
        else:
            imported_count = 0
            logger.warning("[import_campaign_metrics] No data to import after filtering")

        # Step 4: Return summary
        summary = ImportSummary(
            success=len(errors) == 0,
            imported_count=imported_count,
            skipped_count=skipped_count,
            error_count=len(errors),
            campaigns_mapped=len(set(m['campaign_id'] for m in enriched_data)),
            errors=errors
        )

        logger.info(f"[import_campaign_metrics] Import complete: {summary.dict()}")
        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[import_campaign_metrics] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during import: {str(e)}"
        )


@router.get("/template")
async def get_csv_template():
    """
    Get CSV template for campaign metrics import

    Returns:
        CSV template string with headers and sample data
    """
    template = """campaign_name,metric_date,spend,revenue,impressions,clicks,conversions,source,notes
Summer Sale 2025,2025-10-01,1500.00,4500.00,50000,2500,150,google_ads,Strong performance
Q4 2025 Growth Campaign,2025-10-01,3500.00,10500.00,75000,3750,200,linkedin_ads,B2B targeting"""

    return {
        "success": True,
        "data": {
            "template": template,
            "required_fields": ["campaign_name", "metric_date", "spend"],
            "optional_fields": ["revenue", "impressions", "clicks", "conversions", "source", "notes"],
            "source_options": ["google_ads", "meta_ads", "linkedin_ads", "csv", "manual", "other"]
        }
    }
