"""
FastAPI router for LLM-powered opportunity (quick wins) recommendations.
Auto-generates opportunities on page load using business context, personas, strategies, and ROI data.
Pattern: Adapted from content_recommendations.py
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from supabase import Client
import logging
import json
import hashlib
import time
import os
from datetime import datetime
from google import genai

from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_models import DEFAULT_MODEL
from .smart_roi_recommendations import format_campaign_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/opportunities", tags=["opportunity-recommendations"])

# Pydantic Models

class OpportunityRecommendation(BaseModel):
    """Single opportunity recommendation with ICE scoring"""
    id: str
    title: str
    description: str
    impact: str  # "High", "Medium", "Low"
    effort: str  # "Low", "Medium", "High"
    confidence: str  # "High", "Medium", "Low"
    ice_score: float  # Impact × Confidence × Ease (1-10 scale)
    category: str  # "quick-fix", "low-hanging-fruit", "strategic-opportunity"
    estimated_time: str  # "1-2 weeks", "2-4 weeks", etc.
    expected_value: str  # Business value description
    priority: str  # "high", "medium", "low"
    status: str  # "ready"


class OpportunitiesRequest(BaseModel):
    """Request payload for generating opportunity recommendations with comprehensive agent context"""
    org_id: str
    business_context: Optional[Dict[str, Any]] = None
    personas: List[Dict[str, Any]] = []
    strategies: List[Dict[str, Any]] = []
    campaign_metrics: List[Dict[str, Any]] = []  # ROI & Budget agent data
    existing_opportunities: List[Dict[str, Any]] = []  # Already identified opportunities
    agent_outputs: Dict[str, List[Dict[str, Any]]] = {}  # All 10 agent types grouped
    active_campaigns: List[Dict[str, Any]] = []  # Active campaigns context


class ClarificationQuestion(BaseModel):
    """Question when LLM needs more context"""
    question: str
    reason: str
    category: str


class OpportunitiesResponse(BaseModel):
    """Response payload with opportunities or clarifications"""
    success: bool
    opportunities: Optional[List[OpportunityRecommendation]] = None
    needs_setup: Optional[bool] = False
    needs_clarification: Optional[bool] = False
    clarification_questions: Optional[List[ClarificationQuestion]] = None
    message: Optional[str] = None
    error: Optional[str] = None
    confidence: Optional[str] = None


# Structured output models for LLM responses

class SmartOpportunityRecommendation(BaseModel):
    """LLM-generated opportunity with ICE scoring"""
    title: str
    description: str
    impact: str
    effort: str
    confidence: str
    category: str
    estimated_time: str
    expected_value: str


class SmartOpportunitiesResponse(BaseModel):
    """LLM structured output"""
    type: str  # "opportunities" or "clarification_needed"
    opportunities: Optional[List[SmartOpportunityRecommendation]] = None
    questions: Optional[List[ClarificationQuestion]] = None
    message: Optional[str] = None
    confidence: Optional[str] = None


# API Endpoint

@router.post("/recommendations")
async def generate_opportunity_recommendations(
    request: OpportunitiesRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
) -> OpportunitiesResponse:
    """
    Generate contextual opportunity recommendations using LLM intelligence.
    Auto-called on page load to proactively surface quick wins.
    """
    try:
        logger.info(f"Generating opportunities for org {request.org_id}")

        # Verify user has access to the organization
        if user.get("org_id") != request.org_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to organization"
            )

        # Validate prerequisites
        if not request.business_context:
            return OpportunitiesResponse(
                success=False,
                needs_setup=True,
                message="Let's start by setting up your business profile",
            )

        # Check intelligent caching
        start_time = time.time()

        # Generate data hash for cache key
        data_hash = generate_opportunity_data_hash(
            request.business_context,
            request.personas,
            request.strategies,
            request.campaign_metrics,
            request.existing_opportunities
        )

        # Check cache first
        cached_opportunities = await get_cached_opportunities(db, request.org_id, data_hash)

        if cached_opportunities:
            logger.info(f"Cache hit for org {request.org_id} with hash {data_hash}")
            return OpportunitiesResponse(
                success=True,
                opportunities=cached_opportunities
            )

        # Cache miss - generate new opportunities
        logger.info(f"Cache miss for org {request.org_id} - generating with LLM")

        # Generate smart opportunities using structured output + ALL agent context
        smart_response = await generate_smart_opportunities_with_structured_output(
            request.business_context,
            request.personas,
            request.strategies,
            request.campaign_metrics,
            request.existing_opportunities,
            request.agent_outputs,
            request.active_campaigns
        )

        logger.info(f"Smart structured response for org {request.org_id}: type={smart_response.type}")

        # Handle different response types
        if smart_response.type == "clarification_needed":
            logger.info(f"LLM requesting clarification for org {request.org_id}")
            return OpportunitiesResponse(
                success=True,
                needs_clarification=True,
                clarification_questions=smart_response.questions or [],
                message=smart_response.message or "I need more information to identify opportunities"
            )
        elif smart_response.type == "opportunities":
            # Convert smart opportunities to our format
            opportunities = convert_smart_to_standard_opportunities(smart_response.opportunities or [])
            confidence = smart_response.confidence or "high"
        else:
            logger.warning(f"LLM returned unknown response type for org {request.org_id}: {smart_response.type}")
            # Return empty opportunities with low confidence
            opportunities = []
            confidence = "low"

        # Cache the results for future use
        generation_time_ms = int((time.time() - start_time) * 1000)
        await save_opportunities_to_cache(
            db,
            request.org_id,
            data_hash,
            opportunities,
            generation_time_ms
        )

        logger.info(f"Generated and cached {len(opportunities)} opportunities in {generation_time_ms}ms")

        return OpportunitiesResponse(
            success=True,
            opportunities=opportunities,
            confidence=confidence
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate opportunity recommendations: {str(e)}")
        return OpportunitiesResponse(
            success=False,
            error="Failed to generate opportunities. Please try again."
        )


# Helper Functions

def build_opportunity_recommendation_prompt(
    business_data: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    campaign_metrics: List[Dict[str, Any]],
    existing_opportunities: List[Dict[str, Any]],
    agent_outputs: Dict[str, List[Dict[str, Any]]],
    active_campaigns: List[Dict[str, Any]]
) -> str:
    """
    Build comprehensive prompt for opportunity identification.
    Uses ALL 10 agent outputs + ROI data + business context to find quick wins.
    """
    # Extract business context
    company_name = business_data.get("company_name", "Your company")
    industry = business_data.get("industry", "")
    main_products = business_data.get("main_products", [])
    target_market = business_data.get("target_market", [])
    marketing_budget = business_data.get("marketing_budget", "Not specified")

    # Format ROI & campaign data
    roi_analysis = format_campaign_metrics(campaign_metrics) if campaign_metrics else "⚠️ No campaign data available yet"

    # Extract persona information
    persona_summary = format_personas_for_opportunities(personas)

    # Extract strategy information
    strategy_summary = format_strategies_for_opportunities(strategies)

    # Format existing opportunities to avoid duplicates
    existing_summary = format_existing_opportunities(existing_opportunities)

    # Format active campaigns
    campaigns_summary = format_active_campaigns(active_campaigns)

    # Format comprehensive agent intelligence (all 10 agents)
    agent_intelligence = format_all_agent_outputs(agent_outputs)

    return f"""You are an elite business opportunity strategist specializing in identifying high-impact, low-effort quick wins.

Your task is to analyze the complete business context across ALL 10 AI agents and identify 4-6 concrete opportunities using ICE scoring (Impact × Confidence × Ease).

📊 **BUSINESS CONTEXT**:
Company: {company_name} ({industry})
Products: {', '.join(main_products[:3])}
Target Markets: {', '.join(target_market[:3])}
Budget: {marketing_budget}

👥 **CUSTOMER INSIGHTS**:
{persona_summary}

🎯 **MARKETING STRATEGY**:
{strategy_summary}

💰 **CAMPAIGN PERFORMANCE & ROI DATA**:
{roi_analysis}

📋 **ACTIVE CAMPAIGNS**:
{campaigns_summary}

🤖 **COMPREHENSIVE AGENT INTELLIGENCE** (All 10 Agents):
{agent_intelligence}

🔍 **EXISTING OPPORTUNITIES ALREADY IDENTIFIED**:
{existing_summary}

---

**OPPORTUNITY IDENTIFICATION FRAMEWORK:**

Apply ICE scoring (scale 1-10 for each):
- **Impact**: Revenue/growth potential
- **Confidence**: Certainty of success based on data
- **Ease**: Implementation simplicity (10 = easiest)

**ICE Score = (Impact × Confidence × Ease) / 100**

**Categories:**
1. **Quick Fixes** (1-2 weeks, high ease): Immediate tactical improvements
2. **Low-Hanging Fruit** (2-4 weeks, medium ease): High ROI with moderate effort
3. **Strategic Opportunities** (1-2 months, lower ease): Transformational initiatives

**Intelligence Instructions - Cross-Agent Analysis:**
1. **Data-Driven Analysis**: Use campaign metrics from ROI & Budget agent to identify underperforming areas
2. **Persona Alignment**: Leverage Persona agent insights to find gaps between customer needs and current offerings
3. **Content Strategy**: Review Content agent outputs to identify content gaps or underutilized topics
4. **Strategic Gaps**: Cross-reference Strategy and Marketing Strategy outputs to find execution gaps
5. **Analytics Insights**: Use Analytics agent findings to spot trends or missed opportunities
6. **Campaign Optimization**: Review Campaign Execution agent data for process improvements
7. **Competitive Advantage**: Leverage Competitive Intelligence insights to find differentiation opportunities
8. **Budget Optimization**: Suggest reallocations from low to high performers based on ROI data
9. **Avoid Duplicates**: Do NOT recommend opportunities already listed above
10. **Concrete Actions**: Each opportunity must be specific, actionable, and grounded in agent intelligence

**Response Format:**
If you can identify concrete opportunities based on available data, return:
{{
  "type": "opportunities",
  "opportunities": [/* SmartOpportunityRecommendation objects */],
  "confidence": "high|medium|low"
}}

If you need clarification due to missing critical data, return:
{{
  "type": "clarification_needed",
  "questions": [/* ClarificationQuestion objects */],
  "message": "I need more information to identify opportunities"
}}

Focus on being ACTIONABLE - provide specific opportunities that can be implemented immediately, not generic advice."""


def format_personas_for_opportunities(personas: List[Dict[str, Any]]) -> str:
    """Format personas for opportunity identification"""
    if not personas:
        return "❓ No personas defined - cannot identify customer-centric opportunities"

    analysis = []
    for i, persona in enumerate(personas[:2]):
        content = persona.get("content", {})
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except:
                content = {}

        name = content.get("name", persona.get("title", f"Persona {i+1}"))
        pain_points = content.get("pain_points", [])
        goals = content.get("goals", [])

        analysis.append(f"• {name}: Pain Points - {', '.join(pain_points[:3])}; Goals - {', '.join(goals[:2])}")

    return "\n".join(analysis) if analysis else "❓ Persona data incomplete"


def format_strategies_for_opportunities(strategies: List[Dict[str, Any]]) -> str:
    """Format strategies for opportunity identification"""
    if not strategies:
        return "❓ No marketing strategy defined"

    strategy = strategies[0]
    content = strategy.get("content", {})
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except:
            content = {}

    messaging = content.get("messaging_framework", {})
    if not messaging:
        return "❓ Marketing strategy lacks clear messaging framework"

    value_prop = messaging.get("value_proposition", "Not defined")
    channels = messaging.get("recommended_channels", [])

    return f"Value Proposition: {value_prop}\nRecommended Channels: {', '.join(channels[:3])}"


def format_existing_opportunities(existing_opportunities: List[Dict[str, Any]]) -> str:
    """Format existing opportunities to help LLM avoid duplicates"""
    if not existing_opportunities:
        return "No opportunities identified yet - this is a fresh analysis!"

    summary = []
    for opp in existing_opportunities[:10]:  # Limit to 10 most recent
        title = opp.get("title", "Untitled")
        category = opp.get("category", "unknown")
        summary.append(f"- {category.title()}: \"{title}\"")

    summary_text = "\n".join(summary)
    return f"""The following opportunities have already been identified ({len(existing_opportunities)} total):
{summary_text}

⚠️ IMPORTANT: Do NOT recommend opportunities that are already listed above. Focus on NEW opportunities that complement what exists."""


def format_active_campaigns(campaigns: List[Dict[str, Any]]) -> str:
    """Format active campaigns for context"""
    if not campaigns:
        return "❓ No active campaigns"

    summary = []
    for camp in campaigns[:5]:  # Top 5 campaigns
        name = camp.get("name", "Unnamed")
        status = camp.get("status", "unknown")
        summary.append(f"• {name} (Status: {status})")

    return "\n".join(summary) if summary else "❓ No campaign details available"


def format_all_agent_outputs(agent_outputs: Dict[str, List[Dict[str, Any]]]) -> str:
    """
    Format outputs from all 10 agents for comprehensive context.
    This gives the opportunity agent visibility into ALL insights from other agents.
    """
    sections = []

    # Strategy Agent
    strategy = agent_outputs.get("strategy", [])
    if strategy:
        sections.append(f"**Strategy Agent** ({len(strategy)} outputs):")
        for out in strategy[:2]:  # Top 2 most recent
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Marketing Strategy Agent
    marketing = agent_outputs.get("marketing_strategy", [])
    if marketing:
        sections.append(f"\n**Marketing Strategy Agent** ({len(marketing)} outputs):")
        for out in marketing[:2]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Persona Agent
    personas = agent_outputs.get("persona", [])
    if personas:
        sections.append(f"\n**Persona Agent** ({len(personas)} personas):")
        for out in personas[:3]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Content Agent
    content = agent_outputs.get("content", [])
    if content:
        sections.append(f"\n**Content Agent** ({len(content)} pieces):")
        for out in content[:3]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Analytics Agent
    analytics = agent_outputs.get("analytics", [])
    if analytics:
        sections.append(f"\n**Analytics Agent** ({len(analytics)} insights):")
        for out in analytics[:2]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # ROI & Budget Agent
    roi = agent_outputs.get("roi_budget", [])
    if roi:
        sections.append(f"\n**ROI & Budget Agent** ({len(roi)} analyses):")
        for out in roi[:2]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Campaign Execution Agent
    campaign_exec = agent_outputs.get("campaign_planning", [])
    if campaign_exec:
        sections.append(f"\n**Campaign Execution Agent** ({len(campaign_exec)} plans):")
        for out in campaign_exec[:2]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Competitive Intelligence Agent
    competitive = agent_outputs.get("competitive_intelligence", [])
    if competitive:
        sections.append(f"\n**Competitive Intelligence Agent** ({len(competitive)} insights):")
        for out in competitive[:2]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    # Client Success Agent
    client_success = agent_outputs.get("client_success", [])
    if client_success:
        sections.append(f"\n**Client Success Agent** ({len(client_success)} strategies):")
        for out in client_success[:2]:
            sections.append(f"  • {out.get('title', 'Untitled')}")

    if not sections:
        return "❓ No agent outputs available yet - limited context for recommendations"

    return "\n".join(sections)


async def generate_smart_opportunities_with_structured_output(
    business_context: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    campaign_metrics: List[Dict[str, Any]],
    existing_opportunities: List[Dict[str, Any]],
    agent_outputs: Dict[str, List[Dict[str, Any]]],
    active_campaigns: List[Dict[str, Any]]
) -> SmartOpportunitiesResponse:
    """Generate smart opportunities using Gemini structured output + comprehensive agent context."""
    try:
        # Get API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")

        client = genai.Client(api_key=api_key)

        # Build comprehensive prompt with ALL agent context
        prompt = build_opportunity_recommendation_prompt(
            business_context,
            personas,
            strategies,
            campaign_metrics,
            existing_opportunities,
            agent_outputs,
            active_campaigns
        )

        # Use Gemini model for complex opportunity analysis
        # Recommended: Gemini 2.5 Pro for better reasoning on strategic insights from business context + ROI data
        # Set GEMINI_MODEL_OPPORTUNITIES in .env to override, or GEMINI_MODEL_DEFAULT for global default
        model_name = os.getenv(
            "GEMINI_MODEL_OPPORTUNITIES",
            os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": SmartOpportunitiesResponse.model_json_schema(),
                "temperature": 1.0,  # Gemini 3 recommended default
                "max_output_tokens": 3072  # More tokens for detailed opportunities
            }
        )

        # Parse the structured response
        response_data = json.loads(response.text)
        return SmartOpportunitiesResponse(**response_data)

    except Exception as e:
        logger.error(f"Failed to generate structured opportunities: {e}")
        # Return fallback response requesting campaign data
        return SmartOpportunitiesResponse(
            type="clarification_needed",
            questions=[
                ClarificationQuestion(
                    question="Do you have any active marketing campaigns with performance data?",
                    reason="I need campaign metrics to identify data-driven optimization opportunities",
                    category="roi-data"
                )
            ],
            message="I need more information to identify opportunities"
        )


def convert_smart_to_standard_opportunities(smart_opps: List[SmartOpportunityRecommendation]) -> List[OpportunityRecommendation]:
    """Convert smart opportunities to standard OpportunityRecommendation format with ICE scoring."""
    opportunities = []

    for i, smart_opp in enumerate(smart_opps):
        # Calculate ICE score
        impact_score = map_level_to_score(smart_opp.impact)
        confidence_score = map_level_to_score(smart_opp.confidence)
        ease_score = map_effort_to_ease(smart_opp.effort)  # Invert effort -> ease

        ice_score = (impact_score * confidence_score * ease_score) / 100

        # Determine priority based on ICE score
        if ice_score >= 7.0:
            priority = "high"
        elif ice_score >= 4.0:
            priority = "medium"
        else:
            priority = "low"

        opportunity = OpportunityRecommendation(
            id=f"opp_{i+1}",
            title=smart_opp.title,
            description=smart_opp.description,
            impact=smart_opp.impact,
            effort=smart_opp.effort,
            confidence=smart_opp.confidence,
            ice_score=round(ice_score, 2),
            category=smart_opp.category,
            estimated_time=smart_opp.estimated_time,
            expected_value=smart_opp.expected_value,
            priority=priority,
            status="ready"
        )
        opportunities.append(opportunity)

    # Sort by ICE score descending
    opportunities.sort(key=lambda x: x.ice_score, reverse=True)

    return opportunities


def map_level_to_score(level: str) -> int:
    """Map High/Medium/Low to numeric score 1-10"""
    level_lower = level.lower()
    if level_lower == "high":
        return 9
    elif level_lower == "medium":
        return 6
    elif level_lower == "low":
        return 3
    else:
        return 5  # Default


def map_effort_to_ease(effort: str) -> int:
    """Map effort level to ease score (inverted)"""
    effort_lower = effort.lower()
    if effort_lower == "low":
        return 9  # Low effort = high ease
    elif effort_lower == "medium":
        return 6
    elif effort_lower == "high":
        return 3  # High effort = low ease
    else:
        return 5  # Default


# Cache Management Functions

def generate_opportunity_data_hash(
    business_data: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    campaign_metrics: List[Dict[str, Any]],
    existing_opportunities: List[Dict[str, Any]]
) -> str:
    """Generate SHA256 hash of business context for cache invalidation."""
    context_data = {
        "business": {
            "company_name": business_data.get("company_name", ""),
            "industry": business_data.get("industry", ""),
            "main_products": sorted(business_data.get("main_products", [])),
            "target_market": sorted(business_data.get("target_market", [])),
            "marketing_budget": business_data.get("marketing_budget", "")
        },
        "personas": [
            {
                "id": persona.get("id", ""),
                "title": persona.get("title", ""),
                "content_hash": hashlib.sha256(
                    json.dumps(persona.get("content", {}), sort_keys=True).encode()
                ).hexdigest()[:16]
            }
            for persona in personas[:2]
        ],
        "strategies": [
            {
                "id": strategy.get("id", ""),
                "agent_type": strategy.get("agent_type", ""),
                "content_hash": hashlib.sha256(
                    json.dumps(strategy.get("content", {}), sort_keys=True).encode()
                ).hexdigest()[:16]
            }
            for strategy in strategies[:2]
        ],
        "campaign_metrics": [
            {
                "campaign_name": metric.get("campaign_name", ""),
                "spend": metric.get("spend", 0),
                "revenue": metric.get("revenue", 0),
                "conversions": metric.get("conversions", 0)
            }
            for metric in campaign_metrics[:5]  # Hash top 5 campaigns
        ],
        "existing_opportunities_count": len(existing_opportunities)
    }

    context_json = json.dumps(context_data, sort_keys=True)
    return hashlib.sha256(context_json.encode()).hexdigest()[:16]


async def get_cached_opportunities(db: Client, org_id: str, data_hash: str) -> Optional[List[OpportunityRecommendation]]:
    """Retrieve cached opportunities if they exist and are valid."""
    try:
        result = await db.rpc("get_cached_opportunity_recommendations", {
            "p_org_id": org_id,
            "p_data_hash": data_hash
        }).execute()

        if result.data:
            opportunities_data = result.data
            if isinstance(opportunities_data, list):
                opportunities = []
                for opp_data in opportunities_data:
                    try:
                        opportunity = OpportunityRecommendation(**opp_data)
                        opportunities.append(opportunity)
                    except Exception as e:
                        logger.warning(f"Failed to parse cached opportunity: {e}")
                        continue
                return opportunities

        return None

    except Exception as e:
        logger.error(f"Failed to retrieve cached opportunities: {e}")
        return None


async def save_opportunities_to_cache(
    db: Client,
    org_id: str,
    data_hash: str,
    opportunities: List[OpportunityRecommendation],
    generation_time_ms: int,
    cache_hours: int = 24
) -> None:
    """Save opportunities to cache with performance metrics."""
    try:
        opportunities_data = [opp.model_dump() for opp in opportunities]

        await db.rpc("save_opportunity_recommendations_cache", {
            "p_org_id": org_id,
            "p_data_hash": data_hash,
            "p_opportunities": json.dumps(opportunities_data),
            "p_cache_duration_hours": cache_hours,
            "p_generation_time_ms": generation_time_ms
        }).execute()

        logger.info(f"Cached opportunities for org {org_id} with hash {data_hash}")

    except Exception as e:
        logger.error(f"Failed to cache opportunities: {e}")
        # Don't raise exception - cache failures shouldn't break the API
