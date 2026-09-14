"""
FastAPI router for LLM-powered campaign plan recommendations.
Auto-generates deployment plans on page load using comprehensive cross-agent intelligence.
Pattern: Single-stage LLM approach with full context (Gemini 2.5 Flash).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Literal
from uuid import UUID
from supabase import Client
import logging
import json
import hashlib
import time
import os
from datetime import datetime, timedelta
from google import genai

from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client
from apps.api.services.universal_output_service import get_universal_output_service
from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/campaign-plans", tags=["campaign-plan-recommendations"])

# Pydantic Models

class CampaignPlan(BaseModel):
    """Single campaign plan recommendation with ICE scoring"""
    id: str
    title: str
    description: str
    campaign_type: str  # "awareness", "consideration", "conversion", "retention"
    channels: List[str]  # ["email", "social", "content", "paid"]
    impact: str  # "High", "Medium", "Low"
    confidence: str  # "High", "Medium", "Low"
    ease: str  # "High", "Medium", "Low"
    ice_score: float  # Impact × Confidence × Ease (1-10 scale)
    estimated_duration: str  # "2-4 weeks", "1-2 months", etc.
    expected_outcomes: List[str]  # Business outcomes
    prerequisites: List[str]  # What's needed before launch
    risk_factors: List[str]  # Potential challenges
    deployment_framework: Optional[Dict[str, Any]] = None  # Detailed deployment plan
    ab_testing_recommendations: Optional[List[str]] = None  # Testing strategies


class CampaignPlansRequest(BaseModel):
    """Request payload for generating campaign plan recommendations"""
    org_id: str
    business_context: Optional[Dict[str, Any]] = None
    personas: List[Dict[str, Any]] = []
    strategies: List[Dict[str, Any]] = []
    campaign_metrics: List[Dict[str, Any]] = []
    agent_outputs: Dict[str, List[Dict[str, Any]]] = {}  # All 10 agent types grouped
    active_campaigns: List[Dict[str, Any]] = []
    available_budget: Optional[float] = None
    timeline_constraint: Optional[str] = None  # "urgent", "normal", "flexible"


class CampaignPlansResponse(BaseModel):
    """Response payload with campaign plans"""
    success: bool
    plans: Optional[List[CampaignPlan]] = None
    needs_setup: Optional[bool] = False
    message: Optional[str] = None
    error: Optional[str] = None
    confidence: Optional[str] = None


# Structured output models for LLM responses

class SmartCampaignPlan(BaseModel):
    """LLM-generated campaign plan with ICE scoring"""
    title: str
    description: str
    campaign_type: str
    channels: List[str]
    impact: str
    confidence: str
    ease: str
    estimated_duration: str
    expected_outcomes: List[str]
    prerequisites: List[str]
    risk_factors: List[str]


class SmartCampaignPlansResponse(BaseModel):
    """LLM structured output"""
    type: Literal["plans", "needs_setup"]  # Strict type constraint
    plans: Optional[List[SmartCampaignPlan]] = None
    message: Optional[str] = None
    confidence: Optional[str] = None


# Helper Functions for Full Context Formatting

def format_agent_outputs(outputs: List[Dict[str, Any]]) -> str:
    """Format agent outputs for LLM prompt (full context)."""
    if not outputs:
        return "⚠️ No outputs available"

    lines = []
    for output in outputs[:10]:  # Include top 10 outputs
        title = output.get("title", "Untitled")
        summary = output.get("summary", "")
        content = output.get("content", {})
        lines.append(f"**{title}**: {summary}")
        if isinstance(content, dict):
            # Include key content fields
            for key in ["key_insights", "recommendations", "analysis"]:
                if key in content:
                    value = content[key]
                    if isinstance(value, list):
                        lines.append(f"  - {key}: {', '.join(str(v) for v in value[:3])}")
                    else:
                        lines.append(f"  - {key}: {str(value)[:200]}")

    return "\n".join(lines) if lines else "⚠️ No agent intelligence available"


def format_personas(personas: List[Dict[str, Any]]) -> str:
    """Format personas for LLM prompt (full context)."""
    if not personas:
        return "⚠️ No personas defined yet"

    lines = []
    for p in personas[:5]:  # Top 5 personas
        name = p.get("name", "Unnamed")
        role = p.get("role", "")
        goals = p.get("goals", [])
        pain_points = p.get("pain_points", [])
        lines.append(f"**{name}** ({role})")
        if goals:
            lines.append(f"  - Goals: {', '.join(goals[:3])}")
        if pain_points:
            lines.append(f"  - Pain Points: {', '.join(pain_points[:3])}")

    return "\n".join(lines)


def format_strategies(strategies: List[Dict[str, Any]]) -> str:
    """Format strategies for LLM prompt (full context)."""
    if not strategies:
        return "⚠️ No marketing strategies defined yet"

    lines = []
    for s in strategies[:5]:  # Top 5 strategies
        name = s.get("name", "Unnamed Strategy")
        summary = s.get("summary", "")
        channels = s.get("channels", [])
        lines.append(f"**{name}**: {summary}")
        if channels:
            lines.append(f"  - Channels: {', '.join(channels)}")

    return "\n".join(lines)


def format_campaign_metrics(metrics: List[Dict[str, Any]]) -> str:
    """Format campaign metrics for LLM prompt (full context)."""
    if not metrics:
        return "⚠️ No campaign performance data available yet"

    # Calculate aggregates
    total_spend = sum(m.get("spend", 0) for m in metrics)
    total_conversions = sum(m.get("conversions", 0) for m in metrics)
    avg_roas = sum(m.get("roas", 0) for m in metrics) / len(metrics) if metrics else 0

    return f"""**Performance Summary**:
- Total Spend: ${total_spend:,.2f}
- Total Conversions: {total_conversions:,}
- Average ROAS: {avg_roas:.2f}x
- Campaigns Analyzed: {len(metrics)}"""


def format_active_campaigns(campaigns: List[Dict[str, Any]]) -> str:
    """Format active campaigns for LLM prompt (full context)."""
    if not campaigns:
        return "⚠️ No active campaigns"

    lines = []
    for c in campaigns[:5]:  # Top 5 active campaigns
        name = c.get("name", "Unnamed Campaign")
        status = c.get("status", "unknown")
        channels = c.get("channels", [])
        lines.append(f"**{name}** (Status: {status})")
        if channels:
            lines.append(f"  - Channels: {', '.join(channels)}")

    return "\n".join(lines)


# Smart Prompt Builder (Single-Stage LLM)

def build_campaign_planning_prompt(
    business_context: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    campaign_metrics: List[Dict[str, Any]],
    agent_outputs: Dict[str, List[Dict[str, Any]]],
    active_campaigns: List[Dict[str, Any]]
) -> str:
    """
    Build comprehensive prompt for campaign plan generation using full context.
    Uses Gemini 2.5 Flash with 1M token context window (no summarization needed).
    """
    # Extract business context
    company_name = business_context.get("company_name", "Your company")
    industry = business_context.get("industry", "Not specified")
    main_products = business_context.get("main_products", [])
    target_market = business_context.get("target_market", [])
    marketing_budget = business_context.get("marketing_budget", "Not specified")

    return f"""You are an elite campaign deployment strategist specializing in multi-channel marketing execution.

Your task is to analyze the business intelligence and generate 3-5 high-impact campaign plans with ICE scoring.

---

## BUSINESS CONTEXT

**Company**: {company_name}
**Industry**: {industry}
**Products**: {', '.join(main_products[:5]) if main_products else 'Not specified'}
**Target Market**: {', '.join(target_market[:5]) if target_market else 'Not specified'}
**Marketing Budget**: {marketing_budget}

---

## CUSTOMER PERSONAS

{format_personas(personas)}

---

## MARKETING STRATEGIES

{format_strategies(strategies)}

---

## CAMPAIGN PERFORMANCE DATA

{format_campaign_metrics(campaign_metrics)}

---

## ACTIVE CAMPAIGNS

{format_active_campaigns(active_campaigns)}

---

## CROSS-AGENT INTELLIGENCE

You have access to full outputs from all specialized AI agents. Use these to inform your campaign planning:

### 1. Strategy Agent Outputs
{format_agent_outputs(agent_outputs.get('strategy', []))}

### 2. Marketing Strategy Agent Outputs
{format_agent_outputs(agent_outputs.get('marketing_strategy', []))}

### 3. Content Agent Outputs
{format_agent_outputs(agent_outputs.get('content', []))}

### 4. Analytics Agent Outputs
{format_agent_outputs(agent_outputs.get('analytics', []))}

### 5. ROI & Budget Agent Outputs
{format_agent_outputs(agent_outputs.get('roi_budget', []))}

### 6. Quick Wins Agent Outputs
{format_agent_outputs(agent_outputs.get('quick_wins', []))}

### 7. Competitive Intelligence Agent Outputs
{format_agent_outputs(agent_outputs.get('competitive_intelligence', []))}

### 8. Client Success Agent Outputs
{format_agent_outputs(agent_outputs.get('client_success', []))}

### 9. Historical Campaign Planning Data
{format_agent_outputs(agent_outputs.get('campaign_planning', []))}

---

## CAMPAIGN PLANNING FRAMEWORK

Generate 3-5 campaign plans that cover different strategic objectives:
1. **Awareness**: Brand visibility and reach
2. **Consideration**: Engagement and education
3. **Conversion**: Lead generation and sales
4. **Retention**: Customer loyalty and advocacy

For each campaign plan, provide:

1. **Title**: Clear, actionable campaign name
2. **Description**: 2-3 sentence overview of the campaign strategy
3. **Campaign Type**: awareness, consideration, conversion, or retention
4. **Channels**: List of marketing channels (email, social, content, paid, events, etc.)
5. **ICE Scoring** (scale 1-10 for each):
   - **Impact**: Revenue/growth potential
   - **Confidence**: Certainty of success based on data
   - **Ease**: Implementation simplicity (10 = easiest)
6. **Estimated Duration**: Realistic timeline (e.g., "2-4 weeks", "1-2 months")
7. **Expected Outcomes**: 3-5 specific, measurable results
8. **Prerequisites**: What must be ready before launch (content, assets, integrations)
9. **Risk Factors**: 2-3 potential challenges or blockers

## STRATEGIC CONSIDERATIONS

- Align campaigns with business objectives and target personas
- Leverage existing content and successful channels from agent outputs
- Balance quick wins (high ease) with strategic initiatives (high impact)
- Consider budget constraints and resource availability
- Build on proven strategies while testing new approaches
- Ensure campaigns complement (not compete with) active campaigns
- Use insights from all 10 agents to inform your recommendations

## ICE SCORE CALCULATION

ICE Score = (Impact × Confidence × Ease) / 100

Prioritize plans with ICE scores > 5.0 for maximum ROI.

Generate diverse plans that address different stages of the customer journey and leverage the company's unique strengths based on the comprehensive intelligence provided."""


# API Endpoint

@router.post("/recommendations")
async def generate_campaign_plan_recommendations(
    request: CampaignPlansRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
) -> CampaignPlansResponse:
    """
    Generate contextual campaign plan recommendations using single-stage LLM approach.
    Auto-called on page load to proactively surface deployment strategies.
    Uses Gemini 2.5 Flash with full context (no summarization).
    """
    try:
        logger.info(f"Generating campaign plans for org {request.org_id}")

        # Verify user has access to the organization
        if user.get("org_id") != request.org_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to organization"
            )

        # Validate prerequisites
        if not request.business_context:
            return CampaignPlansResponse(
                success=False,
                needs_setup=True,
                message="Let's start by setting up your business profile",
            )

        start_time = time.time()

        # Generate data hash for cache key
        data_hash = generate_campaign_plan_data_hash(
            request.business_context,
            request.personas,
            request.strategies,
            request.campaign_metrics,
            request.agent_outputs,
            request.active_campaigns
        )

        # Check cache first
        cached_plans = await get_cached_campaign_plans(db, request.org_id, data_hash)

        if cached_plans:
            logger.info(f"Cache hit for org {request.org_id} with hash {data_hash}")
            return CampaignPlansResponse(
                success=True,
                plans=cached_plans
            )

        # Cache miss - generate new plans with single-stage LLM approach
        logger.info(f"Cache miss for org {request.org_id} - generating with Gemini Flash (full context)")

        # Generate plans with Gemini Flash (single-stage, full context)
        smart_response = await generate_smart_campaign_plans_with_structured_output(
            request.business_context,
            request.personas,
            request.strategies,
            request.campaign_metrics,
            request.agent_outputs,
            request.active_campaigns
        )

        logger.info(f"Smart structured response for org {request.org_id}: type={smart_response.type}")

        # Handle different response types
        if smart_response.type == "needs_setup":
            return CampaignPlansResponse(
                success=True,
                needs_setup=True,
                message=smart_response.message or "Additional setup required"
            )
        elif smart_response.type == "plans":
            # Convert smart plans to our format
            plans = convert_smart_to_standard_plans(smart_response.plans or [])
            confidence = smart_response.confidence or "high"
        else:
            logger.warning(f"LLM returned unknown response type for org {request.org_id}: {smart_response.type}")
            plans = []
            confidence = "low"

        # Cache the results for future use
        generation_time_ms = int((time.time() - start_time) * 1000)
        await save_campaign_plans_to_cache(
            db,
            request.org_id,
            data_hash,
            plans,
            generation_time_ms
        )

        logger.info(f"Generated and cached {len(plans)} campaign plans in {generation_time_ms}ms")

        return CampaignPlansResponse(
            success=True,
            plans=plans,
            confidence=confidence
        )

    except Exception as e:
        logger.error(f"Error generating campaign plans for org {request.org_id}: {e}", exc_info=True)
        return CampaignPlansResponse(
            success=False,
            error=str(e),
            message="Failed to generate campaign plans"
        )


async def generate_smart_campaign_plans_with_structured_output(
    business_context: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    campaign_metrics: List[Dict[str, Any]],
    agent_outputs: Dict[str, List[Dict[str, Any]]],
    active_campaigns: List[Dict[str, Any]]
) -> SmartCampaignPlansResponse:
    """Generate smart campaign plans using Gemini structured output with full context."""
    try:
        # Get API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")

        client = genai.Client(api_key=api_key)

        # Build comprehensive prompt with full context
        prompt = build_campaign_planning_prompt(
            business_context,
            personas,
            strategies,
            campaign_metrics,
            agent_outputs,
            active_campaigns
        )

        # Use Gemini 2.5 Flash for fast strategic reasoning
        model_name = os.getenv(
            "GEMINI_MODEL_CAMPAIGN_PLANNING",
            os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": SmartCampaignPlansResponse.model_json_schema(),
                "temperature": 1.0,  # Gemini 3 recommended default
                "max_output_tokens": 4096  # More tokens for detailed plans
            }
        )

        # Parse the structured response
        response_data = json.loads(response.text)
        return SmartCampaignPlansResponse(**response_data)

    except Exception as e:
        logger.error(f"LLM generation failed: {e}", exc_info=True)
        return SmartCampaignPlansResponse(
            type="needs_setup",
            message=f"Failed to generate plans: {str(e)}"
        )


# Helper functions for cache and conversion

def generate_campaign_plan_data_hash(
    business_context: Dict[str, Any],
    personas: List[Dict[str, Any]],
    strategies: List[Dict[str, Any]],
    campaign_metrics: List[Dict[str, Any]],
    agent_outputs: Dict[str, List[Dict[str, Any]]],
    active_campaigns: List[Dict[str, Any]]
) -> str:
    """Generate hash of input data for caching."""
    data_str = json.dumps({
        "business": business_context,
        "personas": [p.get("id") for p in personas],
        "strategies": [s.get("id") for s in strategies],
        "metrics_count": len(campaign_metrics),
        "agent_outputs": {k: len(v) for k, v in agent_outputs.items()},
        "campaigns": [c.get("id") for c in active_campaigns]
    }, sort_keys=True)
    return hashlib.md5(data_str.encode()).hexdigest()


async def get_cached_campaign_plans(
    db: Client,
    org_id: str,
    data_hash: str
) -> Optional[List[CampaignPlan]]:
    """Retrieve cached campaign plans if they exist and aren't expired."""
    try:
        now = datetime.utcnow()
        result = db.table("campaign_plan_recommendation_cache").select("*").eq(
            "org_id", org_id
        ).eq(
            "data_hash", data_hash
        ).gte(
            "cache_expires_at", now.isoformat()
        ).order(
            "generated_at", desc=True
        ).limit(1).execute()

        if result.data and len(result.data) > 0:
            cached = result.data[0]
            return [CampaignPlan(**plan) for plan in cached.get("plans", [])]

        return None

    except Exception as e:
        logger.warning(f"Cache retrieval failed: {e}")
        return None


async def save_campaign_plans_to_cache(
    db: Client,
    org_id: str,
    data_hash: str,
    plans: List[CampaignPlan],
    generation_time_ms: int
):
    """Save campaign plans to cache with 2-hour expiration."""
    try:
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=2)

        cache_data = {
            "org_id": org_id,
            "data_hash": data_hash,
            "plans": [plan.dict() for plan in plans],
            "generation_time_ms": generation_time_ms,
            "generated_at": now.isoformat(),
            "cache_expires_at": expires_at.isoformat()
        }

        db.table("campaign_plan_recommendation_cache").insert(cache_data).execute()
        logger.info(f"Cached {len(plans)} plans for org {org_id}, expires at {expires_at}")

    except Exception as e:
        logger.warning(f"Cache save failed: {e}")


def convert_smart_to_standard_plans(smart_plans: List[SmartCampaignPlan]) -> List[CampaignPlan]:
    """Convert LLM smart plans to standard format with ICE scores."""
    standard_plans = []

    for idx, sp in enumerate(smart_plans):
        # Calculate ICE score
        impact_score = {"High": 8, "Medium": 5, "Low": 3}.get(sp.impact, 5)
        confidence_score = {"High": 8, "Medium": 5, "Low": 3}.get(sp.confidence, 5)
        ease_score = {"High": 8, "Medium": 5, "Low": 3}.get(sp.ease, 5)
        ice_score = (impact_score * confidence_score * ease_score) / 100

        standard_plans.append(CampaignPlan(
            id=f"plan-{idx+1}",
            title=sp.title,
            description=sp.description,
            campaign_type=sp.campaign_type,
            channels=sp.channels,
            impact=sp.impact,
            confidence=sp.confidence,
            ease=sp.ease,
            ice_score=round(ice_score, 2),
            estimated_duration=sp.estimated_duration,
            expected_outcomes=sp.expected_outcomes,
            prerequisites=sp.prerequisites,
            risk_factors=sp.risk_factors
        ))

    # Sort by ICE score descending
    standard_plans.sort(key=lambda x: x.ice_score, reverse=True)

    return standard_plans


# Save Campaign Plan Endpoint

class SaveCampaignPlanRequest(BaseModel):
    """Request payload for saving a campaign plan"""
    plan: CampaignPlan
    client_id: Optional[UUID] = None  # Required for AGENCY organizations


class SaveCampaignPlanResponse(BaseModel):
    """Response payload after saving campaign plan"""
    success: bool
    output_id: Optional[str] = None
    campaign_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


@router.post("/save")
async def save_campaign_plan(
    request: SaveCampaignPlanRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
) -> SaveCampaignPlanResponse:
    """
    Save a campaign plan to both agent_outputs (sidebar) and campaigns table (status="planned").
    This implements the dual-write pattern for user-controlled plan persistence.

    Workflow:
    1. Save to agent_outputs via UniversalOutputService (appears in intelligence sidebar)
    2. Create campaign with status="planned" (appears in campaigns list)
    3. Return both IDs for frontend to track

    Args:
        request: Campaign plan data with UUID
        user: Authenticated user with org_id
        db: Supabase client

    Returns:
        Response with both output_id and campaign_id
    """
    try:
        plan = request.plan
        client_id = request.client_id  # Extract client_id for agency multi-tenancy
        org_id = user.get("org_id")
        user_id = user.get("id")

        if not org_id or not user_id:
            raise HTTPException(
                status_code=401,
                detail="User authentication required"
            )

        logger.info(f"Saving campaign plan '{plan.title}' for org {org_id}, client_id={client_id}")

        # Step 1: Save to agent_outputs (intelligence sidebar)
        output_service = get_universal_output_service()

        output_record = await output_service.save_agent_output(
            agent_type="campaign_planning",
            output_type=plan.campaign_type,
            content={
                "plan_id": plan.id,  # Preserve UUID for prerequisites
                "title": plan.title,
                "description": plan.description,
                "campaign_type": plan.campaign_type,
                "channels": plan.channels,
                "ice_scoring": {
                    "impact": plan.impact,
                    "confidence": plan.confidence,
                    "ease": plan.ease,
                    "ice_score": plan.ice_score
                },
                "estimated_duration": plan.estimated_duration,
                "expected_outcomes": plan.expected_outcomes,
                "prerequisites": plan.prerequisites,
                "risk_factors": plan.risk_factors,
                "deployment_framework": plan.deployment_framework,
                "ab_testing_recommendations": plan.ab_testing_recommendations
            },
            title=plan.title,
            org_id=org_id,
            user_id=user_id,
            client_id=str(client_id) if client_id else None,  # Pass client_id for agency multi-tenancy
            summary=plan.description,
            metadata={
                "ice_score": plan.ice_score,
                "campaign_type": plan.campaign_type,
                "channels": plan.channels,
                "saved_from": "campaign_planning_page"
            },
            confidence_score=0.8,
            source_type="campaign_planning_recommendation"
        )

        output_id = output_record.get("id")
        logger.info(f"Saved to agent_outputs with ID: {output_id}")

        # Step 2: Create campaign with status="planned" (campaigns list)
        campaign_data = {
            "org_id": org_id,
            "name": plan.title,
            "description": plan.description,
            "status": "planned",  # NEW status for AI-generated plans
            "campaign_type": plan.campaign_type,
            "marketing_channels": plan.channels,
            "created_by": user_id,
            "metadata": {
                "output_id": output_id,  # Link back to agent_output
                "ice_scoring": {
                    "impact": plan.impact,
                    "confidence": plan.confidence,
                    "ease": plan.ease,
                    "ice_score": plan.ice_score
                },
                "estimated_duration": plan.estimated_duration,
                "expected_outcomes": plan.expected_outcomes,
                "prerequisites": plan.prerequisites,
                "risk_factors": plan.risk_factors,
                "deployment_framework": plan.deployment_framework,
                "ab_testing_recommendations": plan.ab_testing_recommendations,
                "ai_generated": True,
                "generated_at": datetime.utcnow().isoformat()
            }
        }

        # Add client_id for agency organizations
        if client_id:
            campaign_data["client_id"] = str(client_id)

        campaign_result = db.table("campaigns").insert(campaign_data).execute()

        if not campaign_result.data:
            raise Exception("Failed to create campaign record")

        campaign_id = campaign_result.data[0].get("id")
        logger.info(f"Created campaign with status='planned' and ID: {campaign_id}")

        return SaveCampaignPlanResponse(
            success=True,
            output_id=output_id,
            campaign_id=campaign_id,
            message=f"Campaign plan '{plan.title}' saved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving campaign plan: {e}", exc_info=True)
        return SaveCampaignPlanResponse(
            success=False,
            error=str(e),
            message="Failed to save campaign plan"
        )
