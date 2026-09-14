"""
FastAPI router for LLM-powered ROI recommendations.
Phase 5: Transform from SQL rules to intelligent, context-aware insights.
Pattern: Adapted from content_recommendations.py
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
import logging
import json
import hashlib
import time
import os
from datetime import datetime
from google import genai
from typing import Dict, Any, List, Optional

from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.models.roi_recommendations import (
    ROIRecommendationsRequest,
    ROIRecommendationsResponse,
    ROIRecommendation,
    ClarificationQuestion
)
from .smart_roi_recommendations import (
    build_roi_recommendation_prompt,
    parse_llm_roi_response
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/roi-budget", tags=["roi-recommendations"])


@router.post("/recommendations")
async def generate_roi_recommendations_with_llm(
    request: ROIRecommendationsRequest,
    user: Dict = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
) -> ROIRecommendationsResponse:
    """
    Generate contextual ROI recommendations using Gemini LLM.
    Phase 5: Full business context integration with intelligent caching.
    """
    try:
        logger.info(f"Generating LLM ROI recommendations for org {request.org_id}")

        # Verify user has access to the organization
        if user.get("org_id") != request.org_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to organization"
            )

        # Phase 1: Fetch campaign metrics from database
        campaign_metrics = await fetch_campaign_metrics(db, request.org_id)

        if not campaign_metrics:
            # No data - request data import
            return ROIRecommendationsResponse(
                type="clarification_needed",
                questions=[
                    ClarificationQuestion(
                        question="No campaign performance data found. Have you imported your campaign metrics yet?",
                        reason="ROI optimization requires actual campaign spend and revenue data",
                        category="data_quality"
                    )
                ],
                message="Import campaign data to receive personalized ROI recommendations",
                confidence="low"
            )

        # Phase 2: Build data hash for caching
        start_time = time.time()

        data_hash = generate_data_hash(
            campaign_metrics,
            request.business_context or {},
            request.competitors,
            request.industry
        )

        # Phase 3: Check cache first
        cached_recommendations = await get_cached_recommendations(db, request.org_id, data_hash)

        if cached_recommendations:
            logger.info(f"Cache hit for org {request.org_id} with hash {data_hash}")
            return ROIRecommendationsResponse(
                type="recommendations",
                recommendations=[ROIRecommendation(**rec) for rec in cached_recommendations['recommendations']],
                overall_assessment=cached_recommendations.get('overall_assessment'),
                confidence=cached_recommendations.get('confidence', 'medium')
            )

        # Phase 4: Cache miss - generate with LLM
        logger.info(f"Cache miss for org {request.org_id} - generating with Gemini")

        try:
            llm_response = await generate_with_gemini(
                campaign_metrics=campaign_metrics,
                request_data=request.dict()
            )

            logger.info(f"Gemini response type: {llm_response.get('type')}")

            # Handle response types
            if llm_response.get('type') == "clarification_needed":
                return ROIRecommendationsResponse(
                    type="clarification_needed",
                    questions=[ClarificationQuestion(**q) for q in llm_response.get('questions', [])],
                    message=llm_response.get('message', "Need more information for strategic recommendations")
                )

            elif llm_response.get('type') == "recommendations":
                recommendations = llm_response.get('recommendations', [])
                overall_assessment = llm_response.get('overall_assessment')
                confidence = llm_response.get('confidence', 'medium')

                # Phase 5: Cache the results
                generation_time_ms = int((time.time() - start_time) * 1000)
                await save_recommendations_to_cache(
                    db,
                    request.org_id,
                    data_hash,
                    recommendations,
                    overall_assessment,
                    confidence,
                    generation_time_ms
                )

                logger.info(f"Generated and cached {len(recommendations)} LLM recommendations in {generation_time_ms}ms")

                return ROIRecommendationsResponse(
                    type="recommendations",
                    recommendations=[ROIRecommendation(**rec) for rec in recommendations],
                    overall_assessment=overall_assessment,
                    confidence=confidence
                )

            else:
                # Error case - fallback to SQL
                logger.warning(f"LLM returned unexpected type, falling back to SQL")
                return await fallback_to_sql_recommendations(db, request.org_id)

        except Exception as llm_error:
            logger.error(f"LLM generation failed: {llm_error}, falling back to SQL")
            return await fallback_to_sql_recommendations(db, request.org_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate ROI recommendations: {str(e)}", exc_info=True)
        return ROIRecommendationsResponse(
            type="clarification_needed",
            questions=[],
            message="Unable to generate recommendations. Please try again.",
            confidence="low"
        )


async def fetch_campaign_metrics(db: Client, org_id: str) -> List[Dict[str, Any]]:
    """
    Fetch campaign performance metrics from database.
    """
    try:
        result = db.table('campaign_metrics') \
            .select('*') \
            .eq('org_id', org_id) \
            .order('metric_date', desc=True) \
            .limit(1000) \
            .execute()

        if result.data:
            # Calculate ROI percentage for each metric
            for metric in result.data:
                spend = metric.get('spend', 0)
                revenue = metric.get('revenue', 0) or 0
                if spend > 0:
                    metric['roi_pct'] = ((revenue - spend) / spend * 100)
                else:
                    metric['roi_pct'] = 0

        return result.data or []

    except Exception as e:
        logger.error(f"Failed to fetch campaign metrics: {e}")
        return []


async def generate_with_gemini(
    campaign_metrics: List[Dict[str, Any]],
    request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate recommendations using Gemini LLM with structured output.
    """
    # Get API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")

    client = genai.Client(api_key=api_key)

    # Build comprehensive prompt
    prompt = build_roi_recommendation_prompt(campaign_metrics, request_data)

    # Use Gemini with structured output
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL),
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": ROIRecommendationsResponse.model_json_schema(),
            "temperature": 1.0,  # Gemini 3 recommended default
            "max_output_tokens": 4096  # Allow for detailed recommendations
        }
    )

    # Parse structured response
    response_data = json.loads(response.text)

    # Validate response structure
    if 'type' not in response_data:
        logger.warning("Gemini response missing 'type' field")
        response_data['type'] = 'recommendations'  # Default

    return response_data


def generate_data_hash(
    campaign_metrics: List[Dict[str, Any]],
    business_context: Dict[str, Any],
    competitors: List[str],
    industry: str
) -> str:
    """
    Generate SHA256 hash of campaign data and business context for cache invalidation.
    """
    # Create canonical representation
    context_data = {
        "metrics_count": len(campaign_metrics),
        "total_spend": sum(m.get('spend', 0) for m in campaign_metrics),
        "total_revenue": sum(m.get('revenue', 0) or 0 for m in campaign_metrics),
        "campaigns": sorted(set(m.get('campaign_name') for m in campaign_metrics if m.get('campaign_name'))),
        "business": {
            "company_name": business_context.get('company_name', ''),
            "industry": industry,
            "competitors": sorted(competitors),
            "budget": business_context.get('marketing_budget', ''),
            "products": sorted(business_context.get('main_products', [])[:3]),
        },
        # Add date range to invalidate cache when new data arrives
        "latest_metric_date": max(
            (m.get('metric_date') for m in campaign_metrics if m.get('metric_date')),
            default=None
        )
    }

    # Generate hash
    context_json = json.dumps(context_data, sort_keys=True)
    return hashlib.sha256(context_json.encode()).hexdigest()[:16]  # Use first 16 chars


async def get_cached_recommendations(
    db: Client,
    org_id: str,
    data_hash: str
) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached recommendations if they exist and are still valid.
    """
    try:
        result = db.table('roi_recommendation_cache') \
            .select('*') \
            .eq('org_id', org_id) \
            .eq('data_hash', data_hash) \
            .gte('cache_expires_at', datetime.utcnow().isoformat()) \
            .order('generated_at', desc=True) \
            .limit(1) \
            .execute()

        if result.data and len(result.data) > 0:
            cache_entry = result.data[0]
            logger.info(f"Cache hit - generated at {cache_entry['generated_at']}")

            return {
                'recommendations': cache_entry['recommendations'],
                'overall_assessment': cache_entry.get('overall_assessment'),
                'confidence': cache_entry.get('confidence', 'medium')
            }

        return None

    except Exception as e:
        logger.error(f"Failed to retrieve cached recommendations: {e}")
        return None


async def save_recommendations_to_cache(
    db: Client,
    org_id: str,
    data_hash: str,
    recommendations: List[Dict[str, Any]],
    overall_assessment: Optional[str],
    confidence: str,
    generation_time_ms: int,
    cache_hours: int = 2
) -> None:
    """
    Save recommendations to cache with performance metrics.
    """
    try:
        from datetime import timedelta

        now = datetime.utcnow()
        expires_at = now + timedelta(hours=cache_hours)

        cache_entry = {
            'org_id': org_id,
            'data_hash': data_hash,
            'recommendations': recommendations,
            'overall_assessment': overall_assessment,
            'confidence': confidence,
            'generated_at': now.isoformat(),
            'cache_expires_at': expires_at.isoformat(),
            'llm_tokens_used': 0,  # TODO: Track from Gemini response metadata
            'generation_time_ms': generation_time_ms
        }

        db.table('roi_recommendation_cache').insert(cache_entry).execute()

        logger.info(f"Cached recommendations for org {org_id} with hash {data_hash}, expires at {expires_at}")

    except Exception as e:
        logger.error(f"Failed to cache recommendations: {e}")
        # Don't raise - cache failures shouldn't break the API


async def fallback_to_sql_recommendations(db: Client, org_id: str) -> ROIRecommendationsResponse:
    """
    Fallback to SQL-based recommendations when LLM fails.
    Calls the existing database function.
    """
    try:
        logger.info(f"Using SQL fallback for org {org_id}")

        result = db.rpc('get_roi_recommendations', {'p_org_id': org_id}).execute()

        if result.data:
            sql_data = result.data
            recommendations = sql_data.get('recommendations', [])

            # Convert SQL format to LLM format
            llm_recommendations = []
            for rec in recommendations:
                llm_recommendations.append(ROIRecommendation(
                    task=rec.get('title', 'Optimization opportunity'),
                    reason=rec.get('description', 'Based on campaign performance'),
                    priority=rec.get('priority', 'medium'),
                    category='channel_optimization',
                    estimated_impact=rec.get('reason', 'Potential improvement'),
                    confidence='medium',
                    data_supporting=f"Campaign: {rec.get('data', {}).get('campaign_name', 'N/A')}",
                    estimated_savings=rec.get('estimated_savings'),
                    estimated_gain=rec.get('estimated_gain')
                ))

            return ROIRecommendationsResponse(
                type="recommendations",
                recommendations=llm_recommendations,
                overall_assessment="SQL-based analysis (LLM temporarily unavailable)",
                confidence="medium"
            )

        else:
            return ROIRecommendationsResponse(
                type="clarification_needed",
                questions=[],
                message="No recommendations available. Import campaign data to get started.",
                confidence="low"
            )

    except Exception as e:
        logger.error(f"SQL fallback failed: {e}")
        return ROIRecommendationsResponse(
            type="clarification_needed",
            questions=[],
            message="Recommendations temporarily unavailable. Please try again.",
            confidence="low"
        )
