"""
API endpoints for unified agent outputs management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from apps.api.utils.database import get_supabase_client
from apps.api.auth.supabase_auth import get_current_user_with_org
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/outputs", tags=["outputs"])

class FinalizeOutputRequest(BaseModel):
    """Request to finalize a draft output"""
    notes: Optional[str] = None

class BulkFinalizeRequest(BaseModel):
    """Request to finalize multiple draft outputs"""
    output_ids: List[str]
    notes: Optional[str] = None

class ValidateOutputRequest(BaseModel):
    """Request to validate an output"""
    status: str  # 'user_approved', 'rejected'
    reason: Optional[str] = None

class BulkArchiveRequest(BaseModel):
    """Request to archive multiple outputs"""
    output_ids: List[str]
    reason: str

@router.get("")
async def get_agent_outputs(
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    agent_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    validation_status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """Get agent outputs for the current organization"""
    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        # Build query
        query = db.table("agent_outputs").select("*") \
            .eq("org_id", org_id) \
            .is_("archived_at", "null") \
            .order("created_at", desc=True)

        # Apply filters
        if agent_type:
            query = query.eq("agent_type", agent_type)
        if status:
            query = query.eq("status", status)
        if validation_status:
            query = query.eq("validation_status", validation_status)

        # Pagination
        query = query.limit(limit).offset(offset)

        result = query.execute()

        return {
            "outputs": result.data,
            "total": len(result.data),
            "limit": limit,
            "offset": offset
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching agent outputs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch outputs")

@router.get("/{output_id}")
async def get_output_detail(
    output_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Get detailed information about a specific output"""
    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        result = db.table("agent_outputs").select("*") \
            .eq("id", output_id) \
            .eq("org_id", org_id) \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Output not found")

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching output detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch output")

@router.post("/{output_id}/finalize")
async def finalize_output(
    output_id: str,
    request: FinalizeOutputRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Finalize a draft output"""
    try:
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        # Verify output exists and belongs to org
        output_check = db.table("agent_outputs").select("status") \
            .eq("id", output_id) \
            .eq("org_id", org_id) \
            .single() \
            .execute()

        if not output_check.data:
            raise HTTPException(status_code=404, detail="Output not found")

        if output_check.data["status"] != "draft":
            raise HTTPException(status_code=400, detail="Only draft outputs can be finalized")

        # Update output to final
        update_data = {
            "status": "final",
            "finalized_at": datetime.utcnow().isoformat(),
            "updated_by": user_id,
            "expires_at": None  # Remove expiry for finalized outputs
        }

        if request.notes:
            update_data["metadata"] = {"finalization_notes": request.notes}

        result = db.table("agent_outputs").update(update_data) \
            .eq("id", output_id) \
            .execute()

        if result.data:
            logger.info(f"Output {output_id} finalized by user {user_id}")
            return {"message": "Output finalized successfully", "output": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to finalize output")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalizing output: {e}")
        raise HTTPException(status_code=500, detail="Failed to finalize output")

@router.post("/bulk/finalize")
async def bulk_finalize_outputs(
    request: BulkFinalizeRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Finalize multiple draft outputs"""
    try:
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        if not request.output_ids:
            raise HTTPException(status_code=400, detail="No output IDs provided")

        db = get_supabase_client()

        # Update all outputs to final
        update_data = {
            "status": "final",
            "finalized_at": datetime.utcnow().isoformat(),
            "updated_by": user_id,
            "expires_at": None
        }

        if request.notes:
            update_data["metadata"] = {"finalization_notes": request.notes}

        result = db.table("agent_outputs").update(update_data) \
            .eq("org_id", org_id) \
            .eq("status", "draft") \
            .in_("id", request.output_ids) \
            .execute()

        finalized_count = len(result.data) if result.data else 0

        logger.info(f"Bulk finalized {finalized_count} outputs for org {org_id}")

        return {
            "message": f"Successfully finalized {finalized_count} outputs",
            "finalized_count": finalized_count,
            "output_ids": [o["id"] for o in result.data] if result.data else []
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk finalizing outputs: {e}")
        raise HTTPException(status_code=500, detail="Failed to bulk finalize outputs")

@router.post("/{output_id}/validate")
async def validate_output(
    output_id: str,
    request: ValidateOutputRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Validate or reject an output"""
    try:
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        if request.status not in ["user_approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Invalid validation status")

        db = get_supabase_client()

        # Verify output exists and belongs to org
        output_check = db.table("agent_outputs").select("id") \
            .eq("id", output_id) \
            .eq("org_id", org_id) \
            .single() \
            .execute()

        if not output_check.data:
            raise HTTPException(status_code=404, detail="Output not found")

        # Update validation status
        update_data = {
            "validation_status": request.status,
            "validated_by": user_id,
            "validated_at": datetime.utcnow().isoformat()
        }

        if request.status == "rejected" and request.reason:
            update_data["rejection_reason"] = request.reason

        result = db.table("agent_outputs").update(update_data) \
            .eq("id", output_id) \
            .execute()

        if result.data:
            logger.info(f"Output {output_id} validated as {request.status} by user {user_id}")
            return {"message": f"Output {request.status}", "output": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to validate output")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating output: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate output")

@router.post("/bulk/archive")
async def bulk_archive_outputs(
    request: BulkArchiveRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Archive multiple outputs"""
    try:
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        if not request.output_ids:
            raise HTTPException(status_code=400, detail="No output IDs provided")

        db = get_supabase_client()

        # Archive all outputs
        update_data = {
            "archived_at": datetime.utcnow().isoformat(),
            "archived_by": user_id,
            "archive_reason": request.reason
        }

        result = db.table("agent_outputs").update(update_data) \
            .eq("org_id", org_id) \
            .in_("id", request.output_ids) \
            .execute()

        archived_count = len(result.data) if result.data else 0

        logger.info(f"Bulk archived {archived_count} outputs for org {org_id}")

        return {
            "message": f"Successfully archived {archived_count} outputs",
            "archived_count": archived_count,
            "output_ids": [o["id"] for o in result.data] if result.data else []
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk archiving outputs: {e}")
        raise HTTPException(status_code=500, detail="Failed to bulk archive outputs")

@router.delete("/{output_id}")
async def delete_output(
    output_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Delete a draft output (only drafts can be deleted)"""
    try:
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        # Verify output exists, belongs to org, and is a draft
        output_check = db.table("agent_outputs").select("status") \
            .eq("id", output_id) \
            .eq("org_id", org_id) \
            .single() \
            .execute()

        if not output_check.data:
            raise HTTPException(status_code=404, detail="Output not found")

        if output_check.data["status"] != "draft":
            raise HTTPException(status_code=400, detail="Only draft outputs can be deleted. Archive finalized outputs instead.")

        # Delete the output
        result = db.table("agent_outputs").delete() \
            .eq("id", output_id) \
            .execute()

        logger.info(f"Draft output {output_id} deleted by user {user_id}")

        return {"message": "Draft output deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting output: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete output")

@router.get("/cross-agent/context")
async def get_cross_agent_context(
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    exclude_agent: Optional[str] = Query(None),
    limit: int = Query(10, le=50)
):
    """Get outputs from other agents for cross-agent context"""
    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        db = get_supabase_client()

        # Build query for cross-agent context
        query = db.table("agent_outputs").select(
            "id, agent_type, output_type, title, summary, created_at, confidence_score"
        ) \
            .eq("org_id", org_id) \
            .in_("status", ["final", "published"]) \
            .neq("validation_status", "rejected") \
            .is_("archived_at", "null") \
            .order("created_at", desc=True) \
            .limit(limit)

        if exclude_agent:
            query = query.neq("agent_type", exclude_agent)

        result = query.execute()

        return {
            "context": result.data,
            "count": len(result.data)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching cross-agent context: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cross-agent context")

# Legacy compatibility endpoints for marketing strategy outputs
@router.get("/marketing-strategy-outputs")
async def get_marketing_strategy_outputs(
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    limit: int = Query(50, le=100),
    offset: int = Query(0)
):
    """Legacy endpoint - Get marketing strategy outputs (redirects to unified endpoint)"""
    # This is a compatibility endpoint that filters unified outputs for marketing strategy agent
    return await get_agent_outputs(
        user=user,
        agent_type="marketing_strategy",
        status=None,
        validation_status=None,
        limit=limit,
        offset=offset
    )

@router.get("/marketing-strategy-outputs/{output_id}")
async def get_marketing_strategy_output_detail(
    output_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Legacy endpoint - Get marketing strategy output detail (redirects to unified endpoint)"""
    # This is a compatibility endpoint
    return await get_output_detail(output_id=output_id, user=user)

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
            .single() \
            .execute()

        if not output_check.data:
            raise HTTPException(status_code=404, detail="Output not found")

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
            raise HTTPException(status_code=500, detail="Failed to update output")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating marketing strategy output: {e}")
        raise HTTPException(status_code=500, detail="Failed to update output")