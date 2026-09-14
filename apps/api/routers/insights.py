"""
AI Insights API Router
Handles CRUD operations for the Progressive Learning System
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
from uuid import UUID
import logging
from pydantic import BaseModel, Field

from supabase import Client
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client
from apps.api.services.pii_detection import get_pii_detection_service, PIIDetectionResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])

# Pydantic models for request/response
class InsightInput(BaseModel):
    """Input model for creating an insight"""
    insight_type: Literal["learning", "recommendation", "observation", "pattern", "validation"]
    source_type: Literal["agent_conversation", "user_activity", "data_analysis", "user_input"]
    title: str = Field(..., min_length=1, max_length=200)
    content: Dict[str, Any]
    source_agent: Optional[str] = None
    session_id: Optional[str] = None
    campaign_id: Optional[UUID] = None
    category: Optional[List[str]] = Field(default_factory=list)
    confidence_score: float = Field(ge=0, le=1)
    
class InsightValidation(BaseModel):
    """Model for validating an insight"""
    status: Literal["approved", "rejected"]
    reason: Optional[str] = None
    
class BulkValidation(BaseModel):
    """Model for bulk validation"""
    insight_ids: List[UUID]
    status: Literal["approved", "rejected"]
    reason: Optional[str] = None
    
class InsightResponse(BaseModel):
    """Response model for an insight"""
    id: UUID
    org_id: UUID
    user_id: Optional[UUID]
    insight_type: str
    source_type: str
    source_agent: Optional[str]
    session_id: Optional[str]
    campaign_id: Optional[UUID]
    title: str
    content: Dict[str, Any]
    category: Optional[List[str]] = []  # Make optional with default empty list
    contains_pii: bool = False  # Add default
    pii_types: Optional[List[str]]
    confidence_score: float
    validation_status: str
    validated_by: Optional[UUID]
    validated_at: Optional[datetime]
    rejection_reason: Optional[str]
    impact_score: int = 0  # Add default
    usage_count: int = 0  # Add default
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]  # Make optional as it might be null
    
class InsightStats(BaseModel):
    """Statistics about insights"""
    total_insights: int
    pending_review: int
    approved: int
    auto_approved: int
    rejected: int
    contains_pii_count: int
    avg_confidence: float
    avg_impact: float
    total_usage: int
    active_agents: List[str]
    latest_insight_at: Optional[datetime]
    insights_by_type: Dict[str, int]
    insights_by_agent: Dict[str, int]

@router.get("/", response_model=List[InsightResponse])
async def list_insights(
    status: Optional[str] = Query(None, description="Filter by validation status"),
    agent: Optional[str] = Query(None, description="Filter by source agent"),
    insight_type: Optional[str] = Query(None, description="Filter by insight type"),
    contains_pii: Optional[bool] = Query(None, description="Filter by PII presence"),
    confidence_min: Optional[float] = Query(0.0, ge=0, le=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort: str = Query("created_at", regex="^(created_at|confidence|impact|usage)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    List insights with filtering and pagination
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            # Return empty list for users without organization
            return []
        
        org_id = user_response.data['org_id']
        
        # Build query
        query = supabase.table("ai_insights").select("*")
        
        # Apply filters
        query = query.eq("org_id", org_id)
        query = query.eq("is_archived", "false")
        
        if status:
            query = query.eq("validation_status", status)
        if agent:
            query = query.eq("source_agent", agent)
        if insight_type:
            query = query.eq("insight_type", insight_type)
        if contains_pii is not None:
            query = query.eq("contains_pii", contains_pii)
        if confidence_min > 0:
            query = query.gte("confidence_score", confidence_min)
        
        # Apply sorting
        sort_column = sort if sort != "confidence" else "confidence_score"
        sort_column = sort_column if sort != "impact" else "impact_score"
        sort_column = sort_column if sort != "usage" else "usage_count"
        
        if order == "desc":
            query = query.order(sort_column, desc=True)
        else:
            query = query.order(sort_column)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        # Execute query
        response = query.execute()
        
        # Convert to response models
        insights = [InsightResponse(**insight) for insight in response.data]
        
        return insights
        
    except Exception as e:
        logger.error(f"Error listing insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=InsightResponse)
async def create_insight(
    insight: InsightInput,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new insight with automatic PII detection
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        org_id = user_response.data['org_id']
        
        # Prepare content for PII detection
        content_str = str(insight.content)
        
        # Run PII detection
        pii_service = get_pii_detection_service()
        pii_result: PIIDetectionResult = await pii_service.detect_pii(
            content_str,
            context={"source": insight.source_type, "agent": insight.source_agent}
        )
        
        # Prepare masked content if PII detected
        masked_content = None
        if pii_result.contains_pii:
            # Store masked version
            masked_content = insight.content.copy()
            # Replace the string representation with masked version
            # This is simplified - in production, we'd mask within the JSON structure
            masked_content["_masked"] = True
            masked_content["_original_masked"] = pii_result.masked_text
        
        # Create insight record
        insight_data = {
            "org_id": org_id,
            "user_id": current_user["id"],
            "insight_type": insight.insight_type,
            "source_type": insight.source_type,
            "source_agent": insight.source_agent,
            "session_id": insight.session_id,
            "campaign_id": str(insight.campaign_id) if insight.campaign_id else None,
            "title": insight.title,
            "content": insight.content,
            "category": insight.category,
            "confidence_score": insight.confidence_score,
            "contains_pii": pii_result.contains_pii,
            "pii_types": pii_result.pii_types,
            "pii_confidence": pii_result.confidence,
            "pii_masked_content": masked_content
        }
        
        # Insert into database
        response = supabase.table("ai_insights").insert(insight_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create insight")
        
        return InsightResponse(**response.data[0])
        
    except Exception as e:
        logger.error(f"Error creating insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=InsightStats)
async def get_insight_stats(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get statistics about insights for the organization
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            # Return empty stats for users without organization
            return InsightStats(
                total_insights=0,
                pending_review=0,
                approved=0,
                auto_approved=0,
                rejected=0,
                contains_pii_count=0,
                avg_confidence=0.0,
                avg_impact=0.0,
                total_usage=0,
                active_agents=[],
                latest_insight_at=None,
                insights_by_type={},
                insights_by_agent={}
            )
        
        org_id = user_response.data['org_id']
        
        # Get basic stats from the view
        stats_response = supabase.table("ai_insights_stats")\
            .select("*")\
            .eq("org_id", org_id)\
            .execute()
        
        if stats_response.data:
            stats = stats_response.data[0]
        else:
            # No insights yet - return zeros
            stats = {
                "total_insights": 0,
                "pending_review": 0,
                "approved": 0,
                "auto_approved": 0,
                "rejected": 0,
                "contains_pii_count": 0,
                "avg_confidence": 0.0,
                "avg_impact": 0.0,
                "total_usage": 0,
                "active_agents": [],
                "latest_insight_at": None
            }
        
        # Get insights by type
        type_response = supabase.table("ai_insights")\
            .select("insight_type")\
            .eq("org_id", org_id)\
            .eq("is_archived", False)\
            .execute()
        
        insights_by_type = {}
        for item in type_response.data:
            type_name = item["insight_type"]
            insights_by_type[type_name] = insights_by_type.get(type_name, 0) + 1
        
        # Get insights by agent
        agent_response = supabase.table("ai_insights")\
            .select("source_agent")\
            .eq("org_id", org_id)\
            .eq("is_archived", False)\
            .not_.is_("source_agent", "null")\
            .execute()
        
        insights_by_agent = {}
        for item in agent_response.data:
            agent_name = item["source_agent"]
            if agent_name:
                insights_by_agent[agent_name] = insights_by_agent.get(agent_name, 0) + 1
        
        return InsightStats(
            **stats,
            insights_by_type=insights_by_type,
            insights_by_agent=insights_by_agent
        )
        
    except Exception as e:
        logger.error(f"Error getting insight stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{insight_id}/validate", response_model=InsightResponse)
async def validate_insight(
    insight_id: UUID,
    validation: InsightValidation,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Approve or reject an insight
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        org_id = user_response.data['org_id']
        
        # Check if insight exists and belongs to user's org
        existing = supabase.table("ai_insights")\
            .select("*")\
            .eq("id", str(insight_id))\
            .eq("org_id", org_id)\
            .execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        # Update validation status
        update_data = {
            "validation_status": validation.status,
            "validated_by": current_user["id"],
            "validated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if validation.reason:
            update_data["rejection_reason"] = validation.reason
        
        response = supabase.table("ai_insights")\
            .update(update_data)\
            .eq("id", str(insight_id))\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update insight")
        
        insight = response.data[0]
        
        # If approved, apply the insight to core business data
        if validation.status == "approved" and insight.get("content"):
            try:
                # Get current business context
                context_response = supabase.table("core_business_data")\
                    .select("*")\
                    .eq("org_id", org_id)\
                    .execute()
                
                if context_response.data:
                    # Map insight fields to database columns
                    update_data = {}
                    content = insight["content"]
                    
                    # Handle company_name
                    if "company_name" in content and content["company_name"]:
                        update_data["company_name"] = content["company_name"]
                    
                    # Handle number_of_employees -> company_size mapping
                    if "number_of_employees" in content:
                        employees = content["number_of_employees"]
                        if isinstance(employees, int):
                            if employees <= 10:
                                update_data["company_size"] = "1-10 employees"
                            elif employees <= 50:
                                update_data["company_size"] = "11-50 employees"
                            elif employees <= 200:
                                update_data["company_size"] = "51-200 employees"
                            elif employees <= 500:
                                update_data["company_size"] = "201-500 employees"
                            elif employees <= 1000:
                                update_data["company_size"] = "501-1000 employees"
                            else:
                                update_data["company_size"] = "1000+ employees"
                    
                    # Map other fields
                    if "annual_revenue" in content:
                        value = content["annual_revenue"]
                        if isinstance(value, (int, float)):
                            update_data["annual_revenue"] = f"${value/1000000:.1f}M"
                        else:
                            update_data["annual_revenue"] = str(value)
                    
                    if "competitors_mentioned" in content and isinstance(content["competitors_mentioned"], list):
                        update_data["key_competitors"] = content["competitors_mentioned"]
                    
                    if "customer_segments" in content:
                        segments = content["customer_segments"]
                        if isinstance(segments, list):
                            update_data["target_market"] = segments
                        elif isinstance(segments, str):
                            update_data["target_market"] = [s.strip() for s in segments.split(',')]
                    
                    if "key_products_services" in content:
                        products = content["key_products_services"]
                        if isinstance(products, list):
                            update_data["main_products"] = products
                        elif isinstance(products, str):
                            update_data["main_products"] = [p.strip() for p in products.split(',')]
                    
                    # Add more field mappings
                    if "business_model" in content:
                        model = content["business_model"]
                        if isinstance(model, str):
                            # Map to valid enum values
                            model_lower = model.lower()
                            if "saas" in model_lower or "subscription" in model_lower:
                                update_data["business_model"] = "Subscription"
                            elif "b2b" in model_lower and "b2c" in model_lower:
                                update_data["business_model"] = "B2B2C"
                            elif "b2b" in model_lower:
                                update_data["business_model"] = "B2B"
                            elif "b2c" in model_lower:
                                update_data["business_model"] = "B2C"
                            elif "marketplace" in model_lower:
                                update_data["business_model"] = "Marketplace"
                            elif "freemium" in model_lower:
                                update_data["business_model"] = "Freemium"
                    
                    if "industry_sector" in content:
                        # Map to appropriate industry enum value if needed
                        industry = content["industry_sector"]
                        if isinstance(industry, list) and len(industry) > 0:
                            industry = industry[0]
                        if isinstance(industry, str):
                            # Map common values to enum
                            if "saas" in industry.lower() or "software" in industry.lower():
                                update_data["industry"] = "SaaS/Software"
                            elif "project management" in industry.lower():
                                update_data["industry"] = "SaaS/Software"
                    
                    if "funding_status" in content:
                        update_data["funding_status"] = content["funding_status"]
                    
                    if "technology_stack" in content and isinstance(content["technology_stack"], list):
                        update_data["tech_stack"] = content["technology_stack"]
                    
                    # Update the business context if we have data to update
                    if update_data:
                        update_data["last_ai_update"] = datetime.now(timezone.utc).isoformat()
                        
                        supabase.table("core_business_data")\
                            .update(update_data)\
                            .eq("org_id", org_id)\
                            .execute()
                            
                        logger.info(f"Applied approved insight {insight_id} to core business data for org {org_id}: {update_data}")
                else:
                    logger.warning(f"No business data found for org {org_id}, cannot apply insight")
            except Exception as e:
                logger.error(f"Failed to apply insight to business context: {e}")
                # Continue even if applying to business context fails
        
        return InsightResponse(**insight)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{insight_id}", response_model=InsightResponse)
async def update_insight_content(
    insight_id: UUID,
    update_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update the content of an insight (for user edits)
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        org_id = user_response.data['org_id']
        
        # Check if insight exists and belongs to user's org
        existing = supabase.table("ai_insights")\
            .select("*")\
            .eq("id", str(insight_id))\
            .eq("org_id", org_id)\
            .execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        # Only allow updating the content field
        if "content" in update_data:
            response = supabase.table("ai_insights")\
                .update({
                    "content": update_data["content"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })\
                .eq("id", str(insight_id))\
                .execute()
            
            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to update insight")
            
            return InsightResponse(**response.data[0])
        else:
            raise HTTPException(status_code=400, detail="No content field provided for update")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-validate", response_model=List[InsightResponse])
async def bulk_validate_insights(
    validation: BulkValidation,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Validate multiple insights at once
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        org_id = user_response.data['org_id']
        
        # Convert UUIDs to strings
        insight_ids = [str(id) for id in validation.insight_ids]
        
        # Verify all insights belong to user's org
        existing = supabase.table("ai_insights")\
            .select("id")\
            .in_("id", insight_ids)\
            .eq("org_id", org_id)\
            .execute()
        
        if len(existing.data) != len(insight_ids):
            raise HTTPException(status_code=404, detail="Some insights not found or unauthorized")
        
        # Update all insights
        update_data = {
            "validation_status": validation.status,
            "validated_by": current_user["id"],
            "validated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if validation.reason:
            update_data["rejection_reason"] = validation.reason
        
        response = supabase.table("ai_insights")\
            .update(update_data)\
            .in_("id", insight_ids)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update insights")
        
        return [InsightResponse(**insight) for insight in response.data]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk validating insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Archive an insight (soft delete for audit trail)
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            raise HTTPException(status_code=400, detail="User must belong to an organization")
        
        org_id = user_response.data['org_id']
        
        # Check if insight exists and belongs to user's org
        existing = supabase.table("ai_insights")\
            .select("id")\
            .eq("id", str(insight_id))\
            .eq("org_id", org_id)\
            .execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        # Soft delete by setting is_archived
        response = supabase.table("ai_insights")\
            .update({"is_archived": True})\
            .eq("id", str(insight_id))\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to archive insight")
        
        return {"message": "Insight archived successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error archiving insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
async def export_insights(
    format: str = Query("json", regex="^(json|csv)$"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Export insights in various formats
    """
    try:
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data or not user_response.data.get('org_id'):
            # Return empty export for users without organization
            return {"format": format, "data": [] if format == "json" else "", "count": 0}
        
        org_id = user_response.data['org_id']
        
        # Build query
        query = supabase.table("ai_insights")\
            .select("*")\
            .eq("org_id", org_id)\
            .eq("is_archived", False)
        
        if date_from:
            query = query.gte("created_at", date_from.isoformat())
        if date_to:
            query = query.lte("created_at", date_to.isoformat())
        
        response = query.execute()
        
        if format == "csv":
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            if response.data:
                writer = csv.DictWriter(output, fieldnames=response.data[0].keys())
                writer.writeheader()
                writer.writerows(response.data)
            
            return {
                "format": "csv",
                "data": output.getvalue(),
                "count": len(response.data)
            }
        else:
            # Return as JSON
            return {
                "format": "json",
                "data": response.data,
                "count": len(response.data)
            }
            
    except Exception as e:
        logger.error(f"Error exporting insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))