"""
Cross-Agent Intelligence API Endpoints

Exposes the cross-agent intelligence service functionality for meta-analysis
of agent outputs and strategic insights.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
import logging

from apps.api.services.cross_agent_intelligence import cross_agent_intelligence_service
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/v1/cross-agent-intelligence/{org_id}")
async def get_cross_agent_insights(
    org_id: str,
    campaign_id: Optional[str] = Query(None, description="Optional campaign ID to filter insights"),
    lookback_days: int = Query(30, description="Number of days to look back for data"),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Generate and retrieve cross-agent insights for an organization.
    
    This endpoint analyzes data from:
    - Domain-specific tables (strategy_outputs, customer_personas, content_outputs)
    - Specialized intelligence tables (all 9 agents)
    - Generates meta-insights about strategic gaps and opportunities
    """
    try:
        # Verify user has access to this organization
        if user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        
        # Generate fresh insights
        insights = await cross_agent_intelligence_service.generate_cross_agent_insights(
            org_id=org_id,
            campaign_id=campaign_id,
            lookback_days=lookback_days
        )
        
        return {
            "success": True,
            "insights": [insight.model_dump() for insight in insights],
            "total_insights": len(insights),
            "analysis_period_days": lookback_days,
            "campaign_id": campaign_id
        }
        
    except Exception as e:
        logger.error(f"Error generating cross-agent insights for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@router.get("/api/v1/cross-agent-intelligence/{org_id}/latest")
async def get_latest_cross_agent_insights(
    org_id: str,
    limit: int = Query(10, description="Maximum number of insights to return"),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get the latest stored cross-agent insights for an organization.
    
    Returns previously generated insights without triggering new analysis.
    """
    try:
        # Verify user has access to this organization
        if user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        
        # Get latest insights from storage
        insights = await cross_agent_intelligence_service.get_latest_cross_agent_insights(
            org_id=org_id,
            limit=limit
        )
        
        return {
            "success": True,
            "insights": insights,
            "total_insights": len(insights)
        }
        
    except Exception as e:
        logger.error(f"Error fetching latest insights for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch insights: {str(e)}")


@router.post("/api/v1/cross-agent-intelligence/{org_id}/trigger-analysis")
async def trigger_periodic_analysis(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Manually trigger cross-agent analysis for an organization.
    
    This respects the 24-hour cooldown to prevent excessive analysis.
    """
    try:
        # Verify user has access to this organization
        if user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        
        # Trigger analysis with rate limiting
        insights = await cross_agent_intelligence_service.trigger_periodic_analysis(org_id)
        
        if insights:
            return {
                "success": True,
                "message": f"Analysis completed with {len(insights)} new insights",
                "insights": [insight.model_dump() for insight in insights]
            }
        else:
            return {
                "success": True,
                "message": "Analysis skipped - too recent or no new data available",
                "insights": []
            }
        
    except Exception as e:
        logger.error(f"Error triggering analysis for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger analysis: {str(e)}")


@router.get("/api/v1/cross-agent-intelligence/{org_id}/data-summary")
async def get_data_availability_summary(
    org_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get a summary of available data for cross-agent analysis.
    
    Useful for understanding what data is available before requesting insights.
    """
    try:
        # Verify user has access to this organization
        if user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        
        # Get data availability summary
        domain_data = await cross_agent_intelligence_service._get_domain_specific_data(
            org_id=org_id,
            lookback_days=30
        )

        # 🚀 NUCLEAR: Get all intelligence from agent_outputs table
        intelligence_result = supabase.table("agent_outputs").select("*").eq(
            "org_id", org_id
        ).execute()

        intelligence_data = intelligence_result.data if intelligence_result.data else []

        # Count intelligence by agent type
        agent_types = {}
        for output in intelligence_data:
            agent_type = output.get("agent_type", "unknown")
            agent_types[agent_type] = agent_types.get(agent_type, 0) + 1

        summary = {
            "domain_data": {
                table: len(data) for table, data in domain_data.items()
            },
            "specialized_intelligence": {
                "total_outputs": len(intelligence_data),
                "available_agents": list(agent_types.keys()),
                "outputs_by_agent": agent_types
            },
            "total_domain_records": sum(len(data) if isinstance(data, list) else 0 for data in domain_data.values()),
            "analysis_ready": any(len(data) > 0 if isinstance(data, list) else False for data in domain_data.values())
        }
        
        return {
            "success": True,
            "org_id": org_id,
            "data_summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error getting data summary for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get data summary: {str(e)}")


@router.get("/api/v1/cross-agent-intelligence/health")
async def health_check():
    """Health check endpoint for the cross-agent intelligence service."""
    try:
        # Simple health check - verify service can be instantiated
        service = cross_agent_intelligence_service
        return {
            "success": True,
            "message": "Cross-agent intelligence service is healthy",
            "version": "2.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service unhealthy: {str(e)}")