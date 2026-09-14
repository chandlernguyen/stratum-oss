"""
Business Intelligence API Router
Handles core business data, intelligence insights, and conflict resolution
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
import logging

from ..models.business_intelligence import (
    CoreBusinessData,
    CoreBusinessDataUpdate,
    MarketIntelligence,
    CustomerIntelligence,
    IntelligenceConflict,
    ConflictResolution,
    BusinessIntelligenceResponse,
    ConflictStatusEnum,
    calculate_confidence,
    intelligent_array_merge,
    REVENUE_RANGES,
    BUDGET_RANGES,
    GEOGRAPHY_OPTIONS
)
from ..utils.database import get_supabase_client
from ..auth.supabase_auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/business-intelligence",
    tags=["business-intelligence"]
)


@router.get("/dropdown-options")
async def get_dropdown_options():
    """Get all dropdown options for the frontend"""
    from ..models.business_intelligence import (
        CompanySizeEnum,
        IndustryEnum,
        BusinessModelEnum,
        CompanyStageEnum,
        FundingStatusEnum
    )
    
    return {
        "company_size": [e.value for e in CompanySizeEnum],
        "industry": [e.value for e in IndustryEnum],
        "business_model": [e.value for e in BusinessModelEnum],
        "company_stage": [e.value for e in CompanyStageEnum],
        "funding_status": [e.value for e in FundingStatusEnum],
        "revenue_ranges": REVENUE_RANGES,
        "budget_ranges": BUDGET_RANGES,
        "geography": GEOGRAPHY_OPTIONS,
    }


@router.get("/", response_model=BusinessIntelligenceResponse)
async def get_business_intelligence(
    client_id: Optional[UUID] = Query(None, description="Optional client ID for agency multi-client context"),
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """
    Get unified business intelligence data for the user's organization or specific client.

    Database-first approach using get_business_context() function for optimal performance.

    Args:
        client_id: Optional UUID for agency users viewing specific client context

    Returns:
        BusinessIntelligenceResponse with core_data, market_intelligence, customer_intelligence

    Behavior:
        - SME users: Pass org_id + NULL (returns organization-level data)
        - Agency users: Pass org_id + client_id (returns client-specific data)
    """
    try:
        # Get user's organization from the users table
        user_id = current_user.get("id")
        user_response = supabase.table("users").select("org_id").eq("id", user_id).single().execute()

        if not user_response.data or not user_response.data.get("org_id"):
            raise HTTPException(status_code=400, detail="User has no organization")

        org_id = user_response.data["org_id"]

        # Database-first: Single function call replaces 4 separate queries
        # get_business_context(org_id, client_id) returns JSONB for all intelligence tables
        context_response = supabase.rpc(
            'get_business_context',
            {'p_org_id': str(org_id), 'p_client_id': str(client_id) if client_id else None}
        ).execute()

        context_data = context_response.data[0] if context_response.data else {}

        # Extract JSONB data from database function response
        core_data = CoreBusinessData(**context_data.get('core_data')) if context_data.get('core_data') else None
        market_intelligence = MarketIntelligence(**context_data.get('market_data')) if context_data.get('market_data') else None
        customer_intelligence = CustomerIntelligence(**context_data.get('customer_data')) if context_data.get('customer_data') else None
        last_updated = context_data.get('last_updated')

        # Get pending conflicts (still a separate query as conflicts are org-level, not client-specific)
        conflicts_response = supabase.table("intelligence_conflicts").select("*").eq("org_id", org_id).eq("status", "pending").execute()
        pending_conflicts = [IntelligenceConflict(**c) for c in conflicts_response.data] if conflicts_response.data else []

        # Calculate overall data completeness
        data_completeness = core_data.data_completeness_score if core_data else 0

        return BusinessIntelligenceResponse(
            core_data=core_data,
            market_intelligence=market_intelligence,
            customer_intelligence=customer_intelligence,
            pending_conflicts=pending_conflicts,
            data_completeness_score=data_completeness,
            last_updated=last_updated
        )

    except Exception as e:
        logger.error(f"Error fetching business intelligence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/core-data", response_model=CoreBusinessData)
async def update_core_business_data(
    update_data: CoreBusinessDataUpdate,
    client_id: Optional[UUID] = Query(None, description="Optional client ID for agency multi-client context"),
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """
    Update core business data (structured fields).

    Client-scoped behavior:
        - SME users: Updates organization-level data (client_id = NULL)
        - Agency users: Updates client-specific data (client_id = provided UUID)
    """
    try:
        user_id = current_user.get("id")

        # Get user's organization from the users table
        user_response = supabase.table("users").select("org_id").eq("id", user_id).single().execute()

        if not user_response.data or not user_response.data.get("org_id"):
            raise HTTPException(status_code=400, detail="User has no organization")

        org_id = user_response.data["org_id"]

        # Check if record exists for this org + client combination
        query = supabase.table("core_business_data").select("id").eq("org_id", org_id)
        if client_id:
            query = query.eq("client_id", client_id)
        else:
            query = query.is_("client_id", "null")

        existing = query.execute()

        update_dict = update_data.model_dump(exclude_none=True)
        update_dict["updated_by"] = user_id
        update_dict["last_manual_update"] = datetime.now(timezone.utc).isoformat()

        if existing.data:
            # Update existing record
            update_query = supabase.table("core_business_data").update(update_dict).eq("org_id", org_id)
            if client_id:
                update_query = update_query.eq("client_id", client_id)
            else:
                update_query = update_query.is_("client_id", "null")

            response = update_query.execute()
        else:
            # Create new record
            update_dict["org_id"] = org_id
            update_dict["client_id"] = str(client_id) if client_id else None
            response = supabase.table("core_business_data").insert(update_dict).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update business data")

        return CoreBusinessData(**response.data[0])
        
    except Exception as e:
        logger.error(f"Error updating core business data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conflicts", response_model=List[IntelligenceConflict])
async def get_conflicts(
    status: Optional[ConflictStatusEnum] = Query(None),
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """Get conflicts for the organization"""
    try:
        # Get user's organization from the users table
        user_id = current_user.get("id")
        user_response = supabase.table("users").select("org_id").eq("id", user_id).single().execute()
        
        if not user_response.data or not user_response.data.get("org_id"):
            raise HTTPException(status_code=400, detail="User has no organization")
        
        org_id = user_response.data["org_id"]
        
        query = supabase.table("intelligence_conflicts").select("*").eq("org_id", org_id)
        
        if status:
            query = query.eq("status", status.value)
        
        response = query.order("created_at", desc=True).execute()
        
        return [IntelligenceConflict(**c) for c in response.data] if response.data else []
        
    except Exception as e:
        logger.error(f"Error fetching conflicts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conflicts/detect")
async def detect_conflicts(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """Detect and create conflict records for conflicting data"""
    try:
        # Get user's organization from the users table
        user_id = current_user.get("id")
        user_response = supabase.table("users").select("org_id").eq("id", user_id).single().execute()
        
        if not user_response.data or not user_response.data.get("org_id"):
            raise HTTPException(status_code=400, detail="User has no organization")
        
        org_id = user_response.data["org_id"]
        
        # Get core business data
        core_response = supabase.table("core_business_data").select("*").eq("org_id", org_id).single().execute()
        if not core_response.data:
            return {"message": "No business data to check"}
        
        core_data = core_response.data
        
        # Get AI insights for comparison
        insights_response = supabase.table("ai_insights").select("*").eq("org_id", org_id).eq("validation_status", "approved").order("created_at", desc=True).execute()
        
        if not insights_response.data:
            return {"message": "No AI insights to compare"}
        
        conflicts_detected = []
        
        # Check for conflicts in company_size
        for insight in insights_response.data:
            content = insight.get("content", {})
            
            # Check company size conflicts
            if "company_size" in content and core_data.get("company_size"):
                ai_size = content["company_size"]
                manual_size = core_data["company_size"]
                
                if ai_size != manual_size:
                    # Calculate confidence scores
                    manual_confidence = calculate_confidence(
                        "manual",
                        datetime.fromisoformat(core_data["last_manual_update"]) if core_data.get("last_manual_update") else datetime.now(timezone.utc)
                    )
                    
                    ai_confidence = insight.get("confidence_score", 0.8)
                    
                    # Only create conflict if AI confidence is significantly higher
                    if ai_confidence > manual_confidence + 0.2 and ai_confidence > 0.85:
                        conflict_values = [
                            {
                                "value": manual_size,
                                "source": "manual",
                                "confidence": manual_confidence,
                                "timestamp": core_data.get("last_manual_update")
                            },
                            {
                                "value": ai_size,
                                "source": "ai",
                                "confidence": ai_confidence,
                                "timestamp": insight["created_at"]
                            }
                        ]
                        
                        # Check if conflict already exists
                        existing_conflict = supabase.table("intelligence_conflicts").select("id").eq("org_id", org_id).eq("field_name", "company_size").eq("status", "pending").execute()
                        
                        if not existing_conflict.data:
                            # Create new conflict
                            conflict_data = {
                                "org_id": org_id,
                                "field_name": "company_size",
                                "conflict_values": conflict_values,
                                "status": "pending"
                            }
                            
                            supabase.table("intelligence_conflicts").insert(conflict_data).execute()
                            conflicts_detected.append("company_size")
        
        return {
            "conflicts_detected": conflicts_detected,
            "message": f"Detected {len(conflicts_detected)} conflicts"
        }
        
    except Exception as e:
        logger.error(f"Error detecting conflicts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conflicts/resolve")
async def resolve_conflict(
    resolution: ConflictResolution,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """Resolve a data conflict"""
    try:
        user_id = current_user.get("id")
        
        # Update conflict record
        resolution_data = {
            "resolution": {
                "selected_value": resolution.selected_value,
                "resolved_by": user_id,
                "reason": resolution.resolution_reason
            },
            "resolved_by": user_id,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolution_reason": resolution.resolution_reason,
            "status": "resolved"
        }
        
        response = supabase.table("intelligence_conflicts").update(resolution_data).eq("id", str(resolution.conflict_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Conflict not found")
        
        # Update the actual field with resolved value
        conflict = response.data[0]
        field_name = conflict["field_name"]
        org_id = conflict["org_id"]
        
        # Update core business data with resolved value
        update_data = {
            field_name: resolution.selected_value,
            "updated_by": user_id,
            "last_manual_update": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("core_business_data").update(update_data).eq("org_id", org_id).execute()
        
        return {"message": "Conflict resolved successfully"}
        
    except Exception as e:
        logger.error(f"Error resolving conflict: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/array-fields/merge")
async def merge_array_fields(
    field_name: str,
    manual_values: List[str],
    ai_values: List[str],
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """Intelligently merge array fields like competitors or tech stack"""
    try:
        # Perform intelligent merge
        merged_result = intelligent_array_merge(manual_values, ai_values)
        
        return {
            "field_name": field_name,
            "merge_result": merged_result,
            "total_items": len(merged_result['confirmed']) + len(merged_result['manual_only']) + len(merged_result['ai_suggestions'])
        }
        
    except Exception as e:
        logger.error(f"Error merging array fields: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent-context/{agent_name}")
async def get_agent_context(
    agent_name: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client)
):
    """Get context tailored for a specific agent"""
    try:
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="User has no organization")
        
        # Get agent profile
        profile_response = supabase.table("agent_context_profiles").select("*").eq("agent_name", agent_name).single().execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail=f"Profile not found for agent: {agent_name}")
        
        profile = profile_response.data
        
        # Get core business data
        core_response = supabase.table("core_business_data").select("*").eq("org_id", org_id).single().execute()
        
        if not core_response.data:
            return {"message": "No business data available", "context": {}}
        
        core_data = core_response.data
        
        # Build context based on agent profile
        context = {}
        
        # Include only fields specified in the profile
        for field in profile["included_fields"]:
            if field in core_data:
                context[field] = core_data[field]
        
        # Add special additions for this agent
        if profile.get("special_additions"):
            additions = profile["special_additions"]
            
            # Add executive summary for strategy agent
            if additions.get("include_executive_summary") and agent_name == "strategy":
                context["executive_summary"] = f"{core_data.get('company_name', 'Company')} is a {core_data.get('company_stage', '')} stage {core_data.get('industry', '')} company with {core_data.get('company_size', '')} employees."
            
            # Add top insights if requested
            if additions.get("include_top_insights"):
                insights_response = supabase.table("ai_insights").select("title, content").eq("org_id", org_id).eq("validation_status", "approved").order("impact_score", desc=True).limit(additions.get("include_top_insights", 3)).execute()
                
                if insights_response.data:
                    context["top_insights"] = insights_response.data
        
        # Calculate context size (rough estimate)
        context_str = str(context)
        estimated_tokens = len(context_str) // 4  # Rough token estimate
        
        # Trim if exceeds max size
        max_size = profile.get("max_context_size", 4000)
        if estimated_tokens > max_size:
            # Implement trimming logic here if needed
            pass
        
        return {
            "agent_name": agent_name,
            "detail_level": profile["detail_level"],
            "context": context,
            "estimated_tokens": estimated_tokens
        }
        
    except Exception as e:
        logger.error(f"Error getting agent context: {e}")
        raise HTTPException(status_code=500, detail=str(e))