"""
Intelligence API Router

Handles cross-agent intelligence operations including persona interview insights.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from apps.api.services.cross_agent_intelligence import cross_agent_intelligence_service
from apps.api.auth.supabase_auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/intelligence", tags=["intelligence"])


class ExtractInsightRequest(BaseModel):
    """Request model for extracting insights from interview conversations"""
    conversation_chunk: str
    persona_id: str
    org_id: str
    session_id: str


class InsightResponse(BaseModel):
    """Response model for insights"""
    status: str
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


@router.post("/extract-interview-insight", response_model=InsightResponse)
async def extract_interview_insight(
    request: ExtractInsightRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Extract insights from persona interview conversation in real-time.
    
    This endpoint analyzes conversation chunks and extracts valuable marketing insights
    that can be used by other agents in the system.
    """
    try:
        insight = await cross_agent_intelligence_service.extract_interview_insight(
            conversation_chunk=request.conversation_chunk,
            persona_id=request.persona_id,
            org_id=request.org_id,
            session_id=request.session_id
        )
        
        if insight:
            return InsightResponse(
                status="success",
                data=insight.dict() if hasattr(insight, 'dict') else insight
            )
        else:
            return InsightResponse(
                status="no_insight",
                message="No significant insight found in this conversation chunk"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/persona-patterns/{org_id}", response_model=InsightResponse)
async def get_persona_patterns(
    org_id: str,
    min_personas: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """
    Get patterns across all persona insights for an organization.
    
    This analyzes multiple persona interviews to identify common themes,
    pain points, goals, and other patterns that can inform marketing strategy.
    """
    try:
        patterns = await cross_agent_intelligence_service.find_patterns_across_personas(
            org_id=org_id,
            min_personas=min_personas
        )
        
        return InsightResponse(
            status=patterns.get("status", "success"),
            data=patterns if patterns.get("status") == "success" else None,
            message=patterns.get("message")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{org_id}/persona")
async def get_persona_insights(
    org_id: str,
    limit: int = 50,
    offset: int = 0,
    persona_id: Optional[str] = None,
    insight_type: Optional[str] = None,  # Make this flexible for future insight types
    current_user: dict = Depends(get_current_user)
):
    """
    Get all persona interview insights for an organization.
    
    Optionally filter by:
    - specific persona_id to get insights for a single persona
    - insight_type (e.g., "observation", "hypothesis", "validated_fact")
    """
    try:
        query = cross_agent_intelligence_service.supabase.table("ai_insights").select("*").eq(
            "org_id", org_id
        ).eq(
            "source_agent", "persona_agent"
        )
        
        # Only apply insight_type filter if specified (default to "observation" for backward compatibility)
        if insight_type:
            query = query.eq("insight_type", insight_type)
        elif insight_type is None:
            # Default to observation for backward compatibility
            query = query.eq("insight_type", "observation")
        
        # Add persona filter if provided
        if persona_id:
            query = query.eq("content->>persona_id", persona_id)
        
        # Add pagination
        query = query.order(
            "created_at", desc=True
        ).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        return {
            "status": "success",
            "data": result.data if result.data else [],
            "total": len(result.data) if result.data else 0,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights/save")
async def save_single_insight(
    insight_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """
    Save a single insight from persona interview.
    
    This endpoint saves a single insight to the ai_insights table
    for cross-agent intelligence sharing.
    """
    try:
        logger.info(f"Saving insight for org_id: {insight_data.get('org_id')}")
        logger.debug(f"Insight data: {insight_data}")
        
        # Check for existing duplicate insights before saving
        if insight_data.get("content") and insight_data.get("org_id"):
            # Extract raw_text from content if it exists
            raw_text = None
            if isinstance(insight_data["content"], dict):
                raw_text = insight_data["content"].get("raw_text")
            elif isinstance(insight_data["content"], str):
                raw_text = insight_data["content"]
            
            if raw_text:
                # Check if a very similar insight already exists
                existing = cross_agent_intelligence_service.supabase.table("ai_insights").select("*").eq(
                    "org_id", insight_data["org_id"]
                ).eq(
                    "source_agent", insight_data.get("source_agent", "persona_agent")
                ).execute()
                
                if existing.data:
                    for existing_insight in existing.data:
                        existing_content = existing_insight.get("content", {})
                        existing_raw_text = None
                        
                        if isinstance(existing_content, dict):
                            existing_raw_text = existing_content.get("raw_text")
                        elif isinstance(existing_content, str):
                            existing_raw_text = existing_content
                        
                        # Check for duplicate based on raw text similarity
                        if existing_raw_text and raw_text:
                            if existing_raw_text.strip().lower() == raw_text.strip().lower():
                                # Return the existing insight instead of creating a duplicate
                                logger.info(f"Duplicate insight detected, returning existing: {existing_insight['id']}")
                                return existing_insight
        
        # Save to database if not a duplicate
        logger.info(f"Inserting insight into database...")
        
        # Add user_id from current_user if not provided
        if 'user_id' not in insight_data:
            insight_data['user_id'] = current_user['id']
            
        result = cross_agent_intelligence_service.supabase.table("ai_insights").insert(
            insight_data
        ).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Successfully saved insight with ID: {result.data[0]['id']}")
            return result.data[0]
        else:
            logger.error(f"Failed to save insight - no data returned. Result: {result}")
            raise HTTPException(status_code=500, detail="Failed to save insight")
            
    except Exception as e:
        logger.error(f"Error saving insight: {str(e)}")
        logger.error(f"Insight data causing error: {insight_data}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights/{org_id}/save-batch")
async def save_batch_insights(
    org_id: str,
    insights: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """
    Save multiple insights at once from a persona interview session.
    
    This is useful when the frontend has collected multiple insights
    and wants to save them all at once.
    """
    try:
        saved_count = 0
        errors = []
        
        for insight_data in insights:
            try:
                # Ensure required fields
                insight_data["org_id"] = org_id
                insight_data["insight_type"] = "observation"
                insight_data["source_type"] = "agent_conversation"
                insight_data["source_agent"] = "persona_agent"
                
                # Save to database
                result = cross_agent_intelligence_service.supabase.table("ai_insights").insert(
                    insight_data
                ).execute()
                
                if result.data:
                    saved_count += 1
                    
            except Exception as e:
                errors.append({"insight": insight_data.get("title", "Unknown"), "error": str(e)})
        
        return {
            "status": "success" if saved_count > 0 else "failed",
            "saved_count": saved_count,
            "total_submitted": len(insights),
            "errors": errors if errors else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{org_id}/persona/{persona_id}")
async def get_interview_sessions(
    org_id: str,
    persona_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all interview sessions for a specific persona.
    
    This includes session metadata and insight counts.
    """
    try:
        result = cross_agent_intelligence_service.supabase.table(
            "persona_interview_sessions"
        ).select("*").eq(
            "org_id", org_id
        ).eq(
            "persona_id", persona_id
        ).order(
            "created_at", desc=True
        ).execute()
        
        return {
            "status": "success",
            "data": result.data if result.data else [],
            "total": len(result.data) if result.data else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/create")
async def create_interview_session(
    org_id: str,
    persona_id: str,
    conversation_id: str,
    interview_stage: str = "initial",
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new interview session for tracking insights.
    
    This should be called when starting a new persona interview.
    """
    try:
        session_data = {
            "org_id": org_id,
            "persona_id": persona_id,
            "conversation_id": conversation_id,
            "interview_stage": interview_stage,
            "topics_covered": [],
            "insights_count": 0
        }
        
        result = cross_agent_intelligence_service.supabase.table(
            "persona_interview_sessions"
        ).insert(session_data).execute()
        
        if result.data:
            return {
                "status": "success",
                "session_id": result.data[0]["id"],
                "data": result.data[0]
            }
        else:
            return {
                "status": "failed",
                "message": "Failed to create interview session"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sessions/{session_id}/complete")
async def complete_interview_session(
    session_id: str,
    quality_score: Optional[float] = None,
    topics_covered: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark an interview session as complete.
    
    Updates the session with final metadata and quality score.
    """
    try:
        from datetime import datetime
        
        update_data = {
            "completed_at": datetime.now().isoformat()
        }
        
        if quality_score is not None:
            update_data["quality_score"] = quality_score
            
        if topics_covered:
            update_data["topics_covered"] = topics_covered
        
        result = cross_agent_intelligence_service.supabase.table(
            "persona_interview_sessions"
        ).update(update_data).eq(
            "id", session_id
        ).execute()
        
        if result.data:
            return {
                "status": "success",
                "data": result.data[0]
            }
        else:
            return {
                "status": "failed",
                "message": "Failed to complete interview session"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/insights/{insight_id}")
async def delete_insight(
    insight_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific insight.
    
    Only allows deletion of insights that belong to the user's organization.
    """
    try:
        # First, verify the insight belongs to the user's organization
        supabase = cross_agent_intelligence_service.supabase
        
        # Get user's org_id
        user_result = supabase.table("users").select("org_id").eq("id", current_user["id"]).execute()
        if not user_result.data or not user_result.data[0].get("org_id"):
            raise HTTPException(status_code=403, detail="User not associated with an organization")
        
        org_id = user_result.data[0]["org_id"]
        
        # Check if insight exists and belongs to the organization
        insight_result = supabase.table("ai_insights").select("id, org_id").eq("id", insight_id).execute()
        
        if not insight_result.data:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        if insight_result.data[0]["org_id"] != org_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this insight")
        
        # Delete the insight
        delete_result = supabase.table("ai_insights").delete().eq("id", insight_id).execute()
        
        return {
            "status": "success",
            "message": f"Insight {insight_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
