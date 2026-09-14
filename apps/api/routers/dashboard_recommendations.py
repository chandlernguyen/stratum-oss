"""
FastAPI router for LLM-powered dashboard recommendations.
Pattern: Adapted from roi_recommendations.py
"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
import logging
import json
import hashlib
import time
import os
from datetime import datetime, timedelta
from google import genai
from typing import Dict, Any, List, Optional

from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.models.dashboard_recommendations import (
    DashboardRecommendationsRequest,
    DashboardRecommendationsResponse,
    DashboardRecommendation
)
from .smart_dashboard_recommendations import build_dashboard_recommendation_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard-recommendations"])


@router.post("/recommendations")
async def generate_dashboard_recommendations_with_llm(
    request: DashboardRecommendationsRequest,
    user: Dict = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
) -> DashboardRecommendationsResponse:
    """
    Generate personalized dashboard recommendations using Gemini LLM.
    Analyzes user's progress and suggests high-impact next steps.
    """
    try:
        logger.info(f"Generating dashboard recommendations for org {request.org_id}")

        # Verify user has access to the organization
        if user.get("org_id") != request.org_id:
            raise HTTPException(status_code=403, detail="Access denied to organization")

        # Fetch user's current dashboard metrics
        user_metrics = await fetch_dashboard_metrics(db, request.org_id)

        # Fetch user's campaigns
        campaigns = await fetch_user_campaigns(db, request.org_id)

        # Fetch user's agent outputs (strategies, personas, content)
        agent_outputs = await fetch_agent_outputs(db, request.org_id)

        # Build data hash for caching
        start_time = time.time()
        data_hash = generate_data_hash(user_metrics, campaigns, agent_outputs, request.business_context or {})

        # Check cache first
        cached_recommendations = await get_cached_recommendations(db, request.org_id, data_hash)
        if cached_recommendations:
            logger.info(f"Cache hit for dashboard recommendations")
            return DashboardRecommendationsResponse(
                type="recommendations",
                recommendations=[DashboardRecommendation(**rec) for rec in cached_recommendations['recommendations']],
                overall_assessment=cached_recommendations.get('overall_assessment'),
                confidence=cached_recommendations.get('confidence', 'medium'),
                context_summary=cached_recommendations.get('context_summary')
            )

        # Cache miss - generate with LLM
        logger.info(f"Cache miss - generating dashboard recommendations with Gemini")

        # Convert request to dict for logging and LLM generation
        request_data = request.dict()

        try:
            llm_response = await generate_with_gemini(
                user_metrics=user_metrics,
                campaigns=campaigns,
                agent_outputs=agent_outputs,
                request_data=request_data
            )

            recommendations = llm_response.get('recommendations', [])
            overall_assessment = llm_response.get('overall_assessment')
            confidence = llm_response.get('confidence', 'medium')

            # Cache the results
            generation_time_ms = int((time.time() - start_time) * 1000)
            await save_recommendations_to_cache(
                db,
                request.org_id,
                data_hash,
                recommendations,
                overall_assessment,
                confidence,
                user_metrics,
                generation_time_ms
            )

            logger.info(f"Generated and cached {len(recommendations)} dashboard recommendations in {generation_time_ms}ms")

            return DashboardRecommendationsResponse(
                type="recommendations",
                recommendations=[DashboardRecommendation(**rec) for rec in recommendations],
                overall_assessment=overall_assessment,
                confidence=confidence,
                context_summary=user_metrics
            )

        except Exception as llm_error:
            # Enhanced diagnostic logging
            logger.error(f"LLM generation failed: {llm_error}", exc_info=True)
            logger.error(f"Request org_id: {request.org_id}")
            logger.error(f"Company name: {request_data.get('company_name', 'N/A')}")
            logger.error(f"Industry: {request_data.get('industry', 'N/A')}")
            logger.error(f"User metrics: {json.dumps(user_metrics, indent=2)}")
            logger.error(f"Campaigns count: {len(campaigns)}")
            logger.error(f"Agent outputs count: {len(agent_outputs)}")

            # Try to log prompt preview
            try:
                prompt_preview = prompt[:1000] if 'prompt' in locals() else "Prompt not generated"
                logger.error(f"Prompt preview (first 1000 chars): {prompt_preview}...")
            except:
                pass

            # Save failed attempt to database for analysis
            try:
                db.table('dashboard_recommendation_failures').insert({
                    'org_id': request.org_id,
                    'error_message': str(llm_error),
                    'error_type': type(llm_error).__name__,
                    'user_metrics': user_metrics,
                    'prompt_preview': prompt[:2000] if 'prompt' in locals() else None,
                    'timestamp': datetime.utcnow().isoformat()
                }).execute()
            except Exception as db_error:
                logger.warning(f"Failed to log error to database: {db_error}")

            # Return empty recommendations with actionable message
            return DashboardRecommendationsResponse(
                type="recommendations",
                recommendations=[],
                overall_assessment="We're having trouble generating recommendations. Our team has been notified. Try refreshing in a few minutes.",
                confidence="low",
                context_summary=user_metrics
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate dashboard recommendations: {str(e)}", exc_info=True)
        return DashboardRecommendationsResponse(
            type="recommendations",
            recommendations=[],
            overall_assessment="Unable to generate recommendations at this time.",
            confidence="low"
        )


async def fetch_dashboard_metrics(db: Client, org_id: str) -> Dict[str, Any]:
    """Fetch user's dashboard metrics from database function."""
    try:
        result = db.rpc('get_dashboard_metrics', {'p_org_id': org_id}).execute()
        return result.data or {}
    except Exception as e:
        logger.error(f"Failed to fetch dashboard metrics: {e}")
        return {}


async def fetch_user_campaigns(db: Client, org_id: str) -> List[Dict[str, Any]]:
    """Fetch user's campaigns with status and metadata."""
    try:
        result = db.table('campaigns') \
            .select('id, name, status, budget, start_date, end_date, goals') \
            .eq('org_id', org_id) \
            .order('created_at', desc=True) \
            .limit(10) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch campaigns: {e}")
        return []


async def fetch_agent_outputs(db: Client, org_id: str) -> List[Dict[str, Any]]:
    """Fetch user's agent outputs (strategies, personas, content)."""
    try:
        result = db.table('agent_outputs') \
            .select('agent_type, title, created_at') \
            .eq('org_id', org_id) \
            .order('created_at', desc=True) \
            .limit(50) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch agent outputs: {e}")
        return []


async def generate_with_gemini(
    user_metrics: Dict[str, Any],
    campaigns: List[Dict[str, Any]],
    agent_outputs: List[Dict[str, Any]],
    request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate recommendations using Gemini LLM with structured output."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")

    client = genai.Client(api_key=api_key)

    # Build comprehensive prompt
    prompt = build_dashboard_recommendation_prompt(user_metrics, campaigns, agent_outputs, request_data)

    # Use Gemini with structured output
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": DashboardRecommendationsResponse.model_json_schema(),
            "temperature": 1.0,  # Gemini 3 recommended default
            "max_output_tokens": 2048
        }
    )

    # Parse structured response
    response_data = json.loads(response.text)

    # Validate response structure
    if 'type' not in response_data:
        response_data['type'] = 'recommendations'  # Default

    return response_data


def generate_data_hash(
    user_metrics: Dict[str, Any],
    campaigns: List[Dict[str, Any]],
    agent_outputs: List[Dict[str, Any]],
    business_context: Dict[str, Any]
) -> str:
    """Generate SHA256 hash for cache invalidation."""
    context_data = {
        "campaign_count": user_metrics.get('campaign_count', 0),
        "document_count": user_metrics.get('document_count', 0),
        "ai_interactions": user_metrics.get('total_ai_interactions', 0),
        "active_campaigns": len([c for c in campaigns if c.get('status') == 'active']),
        "draft_campaigns": len([c for c in campaigns if c.get('status') == 'draft']),
        "agent_output_count": len(agent_outputs),
        "company_name": business_context.get('company_name', ''),
        "industry": business_context.get('industry', ''),
    }

    context_json = json.dumps(context_data, sort_keys=True)
    return hashlib.sha256(context_json.encode()).hexdigest()[:16]


async def get_cached_recommendations(
    db: Client,
    org_id: str,
    data_hash: str
) -> Optional[Dict[str, Any]]:
    """Retrieve cached recommendations if they exist and are still valid."""
    try:
        result = db.table('dashboard_recommendation_cache') \
            .select('*') \
            .eq('org_id', org_id) \
            .eq('data_hash', data_hash) \
            .gte('cache_expires_at', datetime.utcnow().isoformat()) \
            .order('generated_at', desc=True) \
            .limit(1) \
            .execute()

        if result.data and len(result.data) > 0:
            cache_entry = result.data[0]
            return {
                'recommendations': cache_entry['recommendations'],
                'overall_assessment': cache_entry.get('overall_assessment'),
                'confidence': cache_entry.get('confidence', 'medium'),
                'context_summary': cache_entry.get('context_summary')
            }

        return None
    except Exception as e:
        logger.error(f"Failed to retrieve cached dashboard recommendations: {e}")
        return None


async def save_recommendations_to_cache(
    db: Client,
    org_id: str,
    data_hash: str,
    recommendations: List[Dict[str, Any]],
    overall_assessment: Optional[str],
    confidence: str,
    context_summary: Dict[str, Any],
    generation_time_ms: int,
    cache_hours: int = 1  # Shorter cache for dashboard (user state changes frequently)
) -> None:
    """Save recommendations to cache with performance metrics."""
    try:
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=cache_hours)

        cache_entry = {
            'org_id': org_id,
            'data_hash': data_hash,
            'recommendations': recommendations,
            'overall_assessment': overall_assessment,
            'confidence': confidence,
            'context_summary': context_summary,
            'generated_at': now.isoformat(),
            'cache_expires_at': expires_at.isoformat(),
            'generation_time_ms': generation_time_ms
        }

        db.table('dashboard_recommendation_cache').insert(cache_entry).execute()

        logger.info(f"Cached dashboard recommendations for org {org_id}, expires at {expires_at}")

    except Exception as e:
        logger.error(f"Failed to cache dashboard recommendations: {e}")
        # Don't raise - cache failures shouldn't break the API
