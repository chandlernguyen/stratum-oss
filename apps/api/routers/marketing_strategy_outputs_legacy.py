"""
Legacy API endpoints for marketing strategy outputs - compatibility layer
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any
from datetime import datetime
import logging

from apps.api.utils.database import get_supabase_client
from apps.api.auth.supabase_auth import get_current_user_with_org

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["marketing-strategy-outputs-legacy"])

@router.get("/marketing-strategy-outputs")
async def get_marketing_strategy_outputs(
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """Legacy endpoint - Get marketing strategy outputs"""
    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        # Query unified agent_outputs table for marketing strategy outputs
        result = db.table("agent_outputs").select("*") \
            .eq("org_id", org_id) \
            .eq("agent_type", "marketing_strategy") \
            .is_("archived_at", "null") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .offset(offset) \
            .execute()

        return {
            "outputs": result.data,
            "total": len(result.data),
            "limit": limit,
            "offset": offset
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching marketing strategy outputs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch marketing strategy outputs")

@router.get("/marketing-strategy-outputs/{output_id}")
async def get_marketing_strategy_output_detail(
    output_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Legacy endpoint - Get marketing strategy output detail"""
    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        result = db.table("agent_outputs").select("*") \
            .eq("id", output_id) \
            .eq("org_id", org_id) \
            .eq("agent_type", "marketing_strategy") \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Marketing strategy output not found")

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching marketing strategy output detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch marketing strategy output")

@router.patch("/marketing-strategy-outputs/{output_id}")
async def update_marketing_strategy_output(
    output_id: str,
    request: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Legacy endpoint - Update a marketing strategy output"""
    try:
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        # Verify output exists and belongs to org
        output_check = db.table("agent_outputs").select("agent_type") \
            .eq("id", output_id) \
            .eq("org_id", org_id) \
            .eq("agent_type", "marketing_strategy") \
            .single() \
            .execute()

        if not output_check.data:
            raise HTTPException(status_code=404, detail="Marketing strategy output not found")

        # Update the output with provided data
        update_data = {
            **request,
            "updated_by": user_id,
            "updated_at": datetime.utcnow().isoformat()
        }

        result = db.table("agent_outputs").update(update_data) \
            .eq("id", output_id) \
            .execute()

        if result.data:
            logger.info(f"Marketing strategy output {output_id} updated by user {user_id}")
            return result.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to update marketing strategy output")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating marketing strategy output: {e}")
        raise HTTPException(status_code=500, detail="Failed to update marketing strategy output")