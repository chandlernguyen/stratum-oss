"""
FastAPI router for LLM-powered content recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Union
from supabase import Client
import logging
import json
import hashlib
import time
import os
from datetime import datetime
from google import genai

from apps.api.agents.direct_content_agent import DirectContentAgent
from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_models import DEFAULT_MODEL
from .smart_content_recommendations import (
    build_smart_recommendation_prompt,
    parse_smart_recommendations_response
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/content", tags=["content-recommendations"])

class ContentRecommendation(BaseModel):
    id: str
    task: str
    tool: str
    toolName: str
    priority: str
    reason: str
    category: str
    estimatedTime: str
    status: str
    targetPersona: Optional[str] = None

class BusinessContext(BaseModel):
    org_id: str
    business_data: Optional[Dict[str, Any]] = None
    personas: List[Dict[str, Any]] = []
    strategies: List[Dict[str, Any]] = []
    content: List[Dict[str, Any]] = []

class RecommendationsRequest(BaseModel):
    org_id: str
    business_context: Optional[Dict[str, Any]] = None
    personas: List[Dict[str, Any]] = []
    strategies: List[Dict[str, Any]] = []
    existing_content: List[Dict[str, Any]] = []  # NEW: Existing content outputs

class ClarificationQuestion(BaseModel):
    question: str
    reason: str
    category: str

class RecommendationsResponse(BaseModel):
    success: bool
    recommendations: Optional[List[ContentRecommendation]] = None
    needs_setup: Optional[bool] = False
    needs_clarification: Optional[bool] = False
    clarification_questions: Optional[List[ClarificationQuestion]] = None
    message: Optional[str] = None
    error: Optional[str] = None
    confidence: Optional[str] = None

# Structured output models for LLM responses
class SmartContentRecommendation(BaseModel):
    task: str
    reason: str
    priority: str
    category: str
    estimatedTime: str
    targetPersona: Optional[str] = None

class SmartRecommendationsResponse(BaseModel):
    type: str  # "recommendations" or "clarification_needed"
    recommendations: Optional[List[SmartContentRecommendation]] = None
    questions: Optional[List[ClarificationQuestion]] = None
    message: Optional[str] = None
    confidence: Optional[str] = None

@router.post("/recommendations")
async def generate_content_recommendations(
    request: RecommendationsRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
) -> RecommendationsResponse:
    """
    Generate contextual content recommendations using LLM intelligence.
    Phase 2 of LLM-powered content recommendations implementation.
    """
    try:
        logger.info(f"Generating recommendations for org {request.org_id}")

        # Verify user has access to the organization
        if user.get("org_id") != request.org_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to organization"
            )

        # Validate prerequisites
        if not request.business_context:
            return RecommendationsResponse(
                success=False,
                needs_setup=True,
                message="Let's start by setting up your business profile",
            )

        if not request.personas:
            return RecommendationsResponse(
                success=False,
                needs_setup=True,
                message="First, let's define your target audience",
            )

        if not request.strategies:
            return RecommendationsResponse(
                success=False,
                needs_setup=True,
                message="You need a marketing strategy before creating content",
            )

        # Phase 3: Implement intelligent caching
        start_time = time.time()

        # Generate data hash for cache key (include existing content for cache invalidation)
        data_hash = generate_data_hash(
            request.business_context,
            request.personas,
            request.strategies,
            request.existing_content  # Include existing content in cache key
        )

        # Check cache first
        cached_recommendations = await get_cached_recommendations(db, request.org_id, data_hash)

        if cached_recommendations:
            logger.info(f"Cache hit for org {request.org_id} with hash {data_hash}")
            return RecommendationsResponse(
                success=True,
                recommendations=cached_recommendations
            )

        # Cache miss - generate new recommendations
        logger.info(f"Cache miss for org {request.org_id} - generating with LLM")

        # Generate smart recommendations using structured output
        smart_response = await generate_smart_recommendations_with_structured_output(
            request.business_context,
            request.personas,
            request.strategies,
            request.existing_content  # Pass existing content to LLM
        )

        logger.info(f"Smart structured response for org {request.org_id}: type={smart_response.type}")

        # Handle different response types
        if smart_response.type == "clarification_needed":
            logger.info(f"LLM requesting clarification for org {request.org_id}")
            return RecommendationsResponse(
                success=True,
                needs_clarification=True,
                clarification_questions=smart_response.questions or [],
                message=smart_response.message or "I need more information to provide relevant recommendations"
            )
        elif smart_response.type == "recommendations":
            # Convert smart recommendations to our format
            recommendations = convert_smart_to_standard_recommendations(smart_response.recommendations or [])
            confidence = smart_response.confidence or "high"
        else:
            logger.warning(f"LLM returned unknown response type for org {request.org_id}: {smart_response.type}")
            # Fall back to traditional recommendations
            recommendations = await generate_fallback_recommendations(request)
            confidence = "medium"

        # Cache the results for future use
        generation_time_ms = int((time.time() - start_time) * 1000)
        await save_recommendations_to_cache(
            db,
            request.org_id,
            data_hash,
            recommendations,
            generation_time_ms
        )

        logger.info(f"Generated and cached {len(recommendations)} contextual recommendations in {generation_time_ms}ms")

        return RecommendationsResponse(
            success=True,
            recommendations=recommendations,
            confidence=confidence
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate content recommendations: {str(e)}")
        return RecommendationsResponse(
            success=False,
            error="Failed to generate recommendations. Please try again."
        )

def build_traditional_recommendation_prompt(
    business_data: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]]
) -> str:
    """Build contextual prompt for LLM recommendation generation."""

    # Extract business context
    company_name = business_data.get("company_name", "Your company")
    industry = business_data.get("industry", "")
    main_products = business_data.get("main_products", [])
    target_market = business_data.get("target_market", [])
    key_competitors = business_data.get("key_competitors", [])
    marketing_budget = business_data.get("marketing_budget", "Not specified")

    # Extract persona information
    persona_details = []
    for persona in personas[:2]:  # Limit to top 2 personas
        content = persona.get("content", {})
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except:
                content = {}

        name = content.get("name", persona.get("title", "Customer"))
        title = content.get("title", "Professional")
        goals = content.get("goals", [])
        pain_points = content.get("pain_points", [])

        persona_details.append(f"- {name} ({title}): Goals - {', '.join(goals[:2])}; Pain Points - {', '.join(pain_points[:2])}")

    # Extract strategy information
    strategy_summary = "Not defined"
    if strategies:
        strategy = strategies[0]
        content = strategy.get("content", {})
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except:
                content = {}

        messaging = content.get("messaging_framework", {})
        if messaging:
            strategy_summary = f"Messaging: {messaging.get('key_messages', [])}; Value Prop: {messaging.get('value_proposition', 'Not defined')}"

    return f"""You are a strategic content marketing consultant. Based on this business context, generate 3-4 specific, actionable content recommendations.

COMPANY: {company_name} ({industry})
PRODUCTS: {', '.join(main_products[:3])}
TARGET MARKETS: {', '.join(target_market[:3])}
COMPETITORS: {', '.join(key_competitors[:3])}
BUDGET: {marketing_budget}

PERSONAS:
{chr(10).join(persona_details)}

MARKETING STRATEGY: {strategy_summary}

Generate recommendations that:
1. Address specific persona pain points with your unique value proposition
2. Differentiate from competitors ({', '.join(key_competitors[:2])})
3. Align with your marketing strategy and business goals
4. Are actionable and specific to your industry

Return ONLY a JSON array with this exact format:
[
  {{
    "task": "Specific actionable task description",
    "reason": "Business justification addressing persona/strategy/competition",
    "priority": "high|medium|low",
    "category": "thought-leadership|case-study|social-media|email|differentiation",
    "estimatedTime": "X minutes",
    "targetPersona": "Specific persona name"
  }}
]

Focus on high-impact, contextual recommendations that leverage your business intelligence."""

def parse_recommendations_response(response_text: str) -> List[ContentRecommendation]:
    """Parse and validate LLM recommendations response."""
    try:
        # Extract JSON from response if it contains extra text
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']') + 1

        if start_idx == -1 or end_idx == 0:
            logger.warning("No JSON array found in recommendations response")
            return get_fallback_recommendations()

        json_text = response_text[start_idx:end_idx]
        recommendations_data = json.loads(json_text)

        if not isinstance(recommendations_data, list):
            logger.warning("Recommendations response is not a list")
            return get_fallback_recommendations()

        recommendations = []
        for i, rec in enumerate(recommendations_data[:4]):  # Limit to 4 recommendations
            try:
                recommendation = ContentRecommendation(
                    id=f"llm_rec_{i+1}",
                    task=rec.get("task", "Content creation task"),
                    tool=map_category_to_tool(rec.get("category", "general")),
                    toolName=get_tool_display_name(map_category_to_tool(rec.get("category", "general"))),
                    priority=rec.get("priority", "medium"),
                    reason=rec.get("reason", "Strategic recommendation"),
                    category=rec.get("category", "general"),
                    estimatedTime=rec.get("estimatedTime", "30 minutes"),
                    status="ready",
                    targetPersona=rec.get("targetPersona")
                )
                recommendations.append(recommendation)
            except Exception as e:
                logger.warning(f"Failed to parse recommendation {i}: {e}")
                continue

        return recommendations if recommendations else get_fallback_recommendations()

    except Exception as e:
        logger.error(f"Failed to parse recommendations response: {e}")
        return get_fallback_recommendations()

def map_category_to_tool(category: str) -> str:
    """Map recommendation category to specific tool."""
    category_map = {
        "thought-leadership": "seo-blog",
        "case-study": "usp-content",
        "social-media": "social-calendar",
        "email": "email-drip",
        "differentiation": "usp-content",
        "industry-guide": "thought-leadership",
        "persona-focused": "usp-content"
    }
    return category_map.get(category.lower(), "seo-blog")

def get_tool_display_name(tool: str) -> str:
    """Get display name for tool."""
    tool_names = {
        "seo-blog": "SEO Blog Post Generator",
        "usp-content": "USP-Focused Content",
        "social-calendar": "Social Media Calendar",
        "email-drip": "Email Drip Campaign Designer",
        "thought-leadership": "Thought Leadership Creator"
    }
    return tool_names.get(tool, "Content Generator")

def get_fallback_recommendations() -> List[ContentRecommendation]:
    """Provide fallback recommendations if LLM generation fails."""
    return [
        ContentRecommendation(
            id="fallback_1",
            task="Create introduction blog post for your company",
            tool="seo-blog",
            toolName="SEO Blog Post Generator",
            priority="high",
            reason="Establish your content presence and introduce your value proposition",
            category="introduction",
            estimatedTime="30 minutes",
            status="ready"
        ),
        ContentRecommendation(
            id="fallback_2",
            task="Design email welcome sequence for new leads",
            tool="email-drip",
            toolName="Email Drip Campaign Designer",
            priority="medium",
            reason="Build relationships with potential customers from first contact",
            category="email",
            estimatedTime="45 minutes",
            status="ready"
        )
    ]

# Cache Management Functions for Phase 3

def generate_data_hash(business_data: Dict[str, Any], personas: List[Dict[str, Any]], strategies: List[Dict[str, Any]]) -> str:
    """Generate SHA256 hash of business context for cache invalidation."""
    # Create a canonical representation of the data
    context_data = {
        "business": {
            "company_name": business_data.get("company_name", ""),
            "industry": business_data.get("industry", ""),
            "main_products": sorted(business_data.get("main_products", [])),
            "target_market": sorted(business_data.get("target_market", [])),
            "key_competitors": sorted(business_data.get("key_competitors", [])),
            "marketing_budget": business_data.get("marketing_budget", "")
        },
        "personas": [
            {
                "id": persona.get("id", ""),
                "title": persona.get("title", ""),
                # Get key fields from content
                "content_hash": hashlib.sha256(
                    json.dumps(persona.get("content", {}), sort_keys=True).encode()
                ).hexdigest()[:16]
            }
            for persona in personas[:2]  # Only use top 2 personas for consistency
        ],
        "strategies": [
            {
                "id": strategy.get("id", ""),
                "agent_type": strategy.get("agent_type", ""),
                "content_hash": hashlib.sha256(
                    json.dumps(strategy.get("content", {}), sort_keys=True).encode()
                ).hexdigest()[:16]
            }
            for strategy in strategies[:2]  # Only use top 2 strategies
        ]
    }

    # Generate hash
    context_json = json.dumps(context_data, sort_keys=True)
    return hashlib.sha256(context_json.encode()).hexdigest()[:16]  # Use first 16 chars

async def get_cached_recommendations(db: Client, org_id: str, data_hash: str) -> Optional[List[ContentRecommendation]]:
    """Retrieve cached recommendations if they exist and are valid."""
    try:
        result = await db.rpc("get_cached_content_recommendations", {
            "p_org_id": org_id,
            "p_data_hash": data_hash
        }).execute()

        if result.data:
            # Convert JSONB back to ContentRecommendation objects
            recommendations_data = result.data
            if isinstance(recommendations_data, list):
                recommendations = []
                for rec_data in recommendations_data:
                    try:
                        recommendation = ContentRecommendation(**rec_data)
                        recommendations.append(recommendation)
                    except Exception as e:
                        logger.warning(f"Failed to parse cached recommendation: {e}")
                        continue
                return recommendations

        return None

    except Exception as e:
        logger.error(f"Failed to retrieve cached recommendations: {e}")
        return None

async def save_recommendations_to_cache(
    db: Client,
    org_id: str,
    data_hash: str,
    recommendations: List[ContentRecommendation],
    generation_time_ms: int,
    cache_hours: int = 24
) -> None:
    """Save recommendations to cache with performance metrics."""
    try:
        # Convert ContentRecommendation objects to dict for JSONB storage
        recommendations_data = [rec.model_dump() for rec in recommendations]

        await db.rpc("save_content_recommendations_cache", {
            "p_org_id": org_id,
            "p_data_hash": data_hash,
            "p_recommendations": json.dumps(recommendations_data),
            "p_cache_duration_hours": cache_hours,
            "p_llm_tokens_used": 0,  # TODO: Track actual token usage from LLM response
            "p_generation_time_ms": generation_time_ms
        }).execute()

        logger.info(f"Cached recommendations for org {org_id} with hash {data_hash}")

    except Exception as e:
        logger.error(f"Failed to cache recommendations: {e}")
        # Don't raise exception - cache failures shouldn't break the API

# New structured output functions

async def generate_smart_recommendations_with_structured_output(
    business_context: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    existing_content: List[Dict[str, Any]] = []  # NEW: Add existing content parameter
) -> SmartRecommendationsResponse:
    """Generate smart recommendations using Gemini structured output."""
    try:
        # Get API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")

        client = genai.Client(api_key=api_key)

        # Build smart contextual prompt (including existing content)
        prompt = build_smart_recommendation_prompt(business_context, personas, strategies, existing_content)

        # Use structured output with response_schema
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": SmartRecommendationsResponse.model_json_schema(),
                "temperature": 1.0,  # Gemini 3 recommended default
                "max_output_tokens": 2048
            }
        )

        # Parse the structured response
        response_data = json.loads(response.text)
        return SmartRecommendationsResponse(**response_data)

    except Exception as e:
        logger.error(f"Failed to generate structured recommendations: {e}")
        # Return fallback response requesting basic clarification
        return SmartRecommendationsResponse(
            type="clarification_needed",
            questions=[
                ClarificationQuestion(
                    question="Do you have a website where content would be published?",
                    reason="I need to understand your content distribution capabilities",
                    category="infrastructure"
                )
            ],
            message="I need to understand your business better to provide relevant recommendations"
        )

def convert_smart_to_standard_recommendations(smart_recs: List[SmartContentRecommendation]) -> List[ContentRecommendation]:
    """Convert smart recommendations to standard ContentRecommendation format."""
    recommendations = []

    for i, smart_rec in enumerate(smart_recs):
        tool = map_category_to_tool(smart_rec.category)
        recommendation = ContentRecommendation(
            id=f"smart_rec_{i+1}",
            task=smart_rec.task,
            tool=tool,
            toolName=get_tool_display_name(tool),
            priority=smart_rec.priority,
            reason=smart_rec.reason,
            category=smart_rec.category,
            estimatedTime=smart_rec.estimatedTime,
            status="ready",
            targetPersona=smart_rec.targetPersona
        )
        recommendations.append(recommendation)

    return recommendations

async def generate_fallback_recommendations(request: RecommendationsRequest) -> List[ContentRecommendation]:
    """Generate fallback recommendations when structured output fails."""
    try:
        # Initialize Content Agent for fallback
        content_agent = DirectContentAgent(
            org_id=request.org_id,
            user_id="system"  # Fallback user
        )

        # Build traditional prompt
        old_prompt = build_traditional_recommendation_prompt(
            request.business_context,
            request.personas,
            request.strategies
        )

        # Generate using traditional method
        recommendations_text = await content_agent.generate_recommendations(old_prompt)
        return parse_recommendations_response(recommendations_text)

    except Exception as e:
        logger.error(f"Fallback recommendations failed: {e}")
        return get_fallback_recommendations()