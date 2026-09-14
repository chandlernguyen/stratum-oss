"""
Marketing Strategy Detection API using LLM with JSON mode
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import logging
from google import genai
from google.genai import types
from datetime import datetime

from ..auth.supabase_auth import get_current_user
from ..utils.database import get_supabase_client
from ..services.universal_output_service import get_universal_output_service
from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)

router = APIRouter()

class MessagingFramework(BaseModel):
    """Messaging framework structure"""
    value_propositions: Dict[str, Any] = Field(default_factory=dict)
    key_messages: Dict[str, Any] = Field(default_factory=dict)
    differentiation_points: List[str] = Field(default_factory=list)
    elevator_pitch: str = Field(default="")
    tone_of_voice: Dict[str, Any] = Field(default_factory=dict)
    proof_points: List[str] = Field(default_factory=list)

class ChannelStrategy(BaseModel):
    """Channel strategy structure"""
    owned_media: Dict[str, Any] = Field(default_factory=dict)
    earned_media: Dict[str, Any] = Field(default_factory=dict)
    paid_media: Dict[str, Any] = Field(default_factory=dict)
    channel_priorities: List[str] = Field(default_factory=list)
    budget_per_channel: Dict[str, float] = Field(default_factory=dict)

class ContentStrategy(BaseModel):
    """Content strategy structure - flexible for LLM outputs"""
    content_pillars: List[Dict[str, Any]] = Field(default_factory=list)  # Allow Any values, not just str
    campaign_concept: str = Field(default="")
    promotional_calendar: Dict[str, Any] = Field(default_factory=dict)
    recurring_themes: List[Any] = Field(default_factory=list)  # Allow Any values, convert to str later
    
    @field_validator('campaign_concept')
    @classmethod
    def ensure_string_concept(cls, v):
        """Convert any type to string"""
        return str(v) if v is not None else ""
    
    @field_validator('recurring_themes')
    @classmethod 
    def ensure_string_themes(cls, v):
        """Convert list items to strings"""
        if isinstance(v, list):
            return [str(item) for item in v if item is not None]
        return []

class StrategySection(BaseModel):
    """Individual section of a marketing strategy"""
    title: str
    content: str
    type: str = Field(..., description="messaging|channels|budget|content|timeline|tactics|general")
    icon: Optional[str] = None

class DetectedStrategy(BaseModel):
    """Comprehensive schema for detected marketing strategy matching database structure"""
    # Basic Information
    campaign_name: str = Field(default="Marketing Campaign", description="Campaign name")
    campaign_duration: str = Field(default="", description="e.g., '3 months', 'Q4 2024'")
    total_budget: float = Field(default=0, description="Total budget in dollars")
    monthly_budget: float = Field(default=0, description="Monthly budget in dollars")
    
    @field_validator('campaign_name')
    @classmethod
    def ensure_campaign_name_string(cls, v):
        """Convert any type to string and provide fallback"""
        if v is None or v == "":
            return "Marketing Campaign"
        return str(v)
    
    # Strategic Elements
    objectives: List[str] = Field(default_factory=list)
    target_verticals: List[str] = Field(default_factory=list)
    target_personas: List[str] = Field(default_factory=list)
    key_challenges: List[str] = Field(default_factory=list)
    unique_strengths: List[str] = Field(default_factory=list)
    
    @field_validator('objectives', 'target_verticals', 'target_personas', 'key_challenges', 'unique_strengths')
    @classmethod
    def ensure_string_lists(cls, v):
        """Convert list items to strings"""
        if isinstance(v, list):
            return [str(item) for item in v if item is not None]
        elif isinstance(v, str):
            return [v]  # Convert single string to list
        return []
    
    # Media Mix & Budget Allocation
    media_mix: Dict[str, float] = Field(
        default_factory=lambda: {"owned": 70, "earned": 20, "paid": 10},
        description="Media mix percentages"
    )
    budget_allocation: Dict[str, Any] = Field(default_factory=dict)
    
    # Messaging Framework
    messaging_framework: Optional[MessagingFramework] = None
    
    # Channel Strategy
    channel_strategy: Optional[ChannelStrategy] = None
    
    # Content Strategy
    content_strategy: Optional[ContentStrategy] = None
    
    # Go-to-Market Planning
    go_to_market: Dict[str, Any] = Field(default_factory=dict)
    
    # Performance Metrics
    estimated_reach: Optional[int] = None
    estimated_roi: Optional[float] = None
    success_metrics: List[str] = Field(default_factory=list)
    
    # Sections for display
    sections: List[StrategySection] = Field(default_factory=list)
    
    # Meta
    raw_content: str = Field(default="", description="Original text content")
    executive_summary: str = Field(default="", description="Brief strategy summary")
    strategy_reasoning: str = Field(default="", description="Strategic reasoning and context")

class StrategyDetectionRequest(BaseModel):
    content: str
    campaign_id: Optional[UUID] = None

class StrategyDetectionResponse(BaseModel):
    has_strategy: bool
    confidence: float
    strategy: Optional[DetectedStrategy] = None
    extraction_method: str = "llm_json_mode"

@router.post("/api/v1/detect-marketing-strategy", response_model=StrategyDetectionResponse)
async def detect_marketing_strategy(
    request: StrategyDetectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Use LLM with JSON mode to detect and extract marketing strategy from content
    """
    try:
        import os
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Google API key not configured")
        
        client = genai.Client(api_key=api_key)
        
        # Create a structured prompt for strategy extraction with comprehensive schema
        system_prompt = """You are a marketing strategy extraction expert. Analyze the provided text and extract comprehensive marketing strategy information.

Look for these key elements in the strategy:
1. **Campaign Information**: Name, duration, budget (total and monthly)
2. **Strategic Elements**: Objectives, target verticals, personas, challenges, strengths
3. **Media Mix**: Owned/Earned/Paid percentages and budget allocation
4. **Messaging Framework**: Value propositions, key messages, differentiation, elevator pitch
5. **Channel Strategy**: Specific channels for owned, earned, and paid media
6. **Content Strategy**: Content pillars, themes, campaign concepts, calendar
7. **Go-to-Market**: Implementation plans, tactics, timelines
8. **Metrics**: Estimated reach, ROI, success metrics

Extract the strategy in the following JSON structure:

{
  "has_strategy": boolean,
  "confidence": number (0.0 to 1.0),
  "strategy": {
    "campaign_name": "string (required)",
    "campaign_duration": "string (e.g., '3 months', 'Q4 2024')",
    "total_budget": number (in dollars),
    "monthly_budget": number (in dollars),
    "objectives": ["array of strategic objectives"],
    "target_verticals": ["array of industries like 'Construction', 'Manufacturing'"],
    "target_personas": ["array of persona names mentioned"],
    "key_challenges": ["array of challenges like 'high churn', 'increased CAC'"],
    "unique_strengths": ["array of competitive advantages"],
    "media_mix": {
      "owned": number (percentage),
      "earned": number (percentage),
      "paid": number (percentage)
    },
    "budget_allocation": {
      "owned_budget": number,
      "earned_budget": number,
      "paid_budget": number,
      "details": {}
    },
    "messaging_framework": {
      "value_propositions": {
        "primary": "string",
        "secondary": ["array"],
        "by_persona": {}
      },
      "key_messages": {
        "awareness": "string",
        "consideration": "string",
        "decision": "string",
        "by_vertical": {}
      },
      "differentiation_points": ["array of unique differentiators"],
      "elevator_pitch": "string",
      "tone_of_voice": {
        "personality": ["array"],
        "do": ["array"],
        "dont": ["array"]
      },
      "proof_points": ["array"]
    },
    "channel_strategy": {
      "owned_media": {
        "channels": ["array like 'Content Marketing', 'Email', 'Website'"],
        "tactics": {},
        "budget": number
      },
      "earned_media": {
        "channels": ["array like 'LinkedIn Organic', 'PR', 'Industry Events'"],
        "tactics": {},
        "budget": number
      },
      "paid_media": {
        "channels": ["array like 'LinkedIn Ads', 'Google Ads'"],
        "tactics": {},
        "budget": number
      },
      "channel_priorities": ["ordered list of priority channels"],
      "budget_per_channel": {}
    },
    "content_strategy": {
      "content_pillars": [
        {
          "name": "string",
          "description": "string",
          "topics": ["array"]
        }
      ],
      "campaign_concept": "string (e.g., 'Build Smarter, Produce Faster')",
      "promotional_calendar": {
        "month_1": {},
        "month_2": {},
        "month_3": {}
      },
      "recurring_themes": ["array"]
    },
    "go_to_market": {
      "implementation_timeline": {},
      "quick_wins": ["array"],
      "testing_framework": {},
      "success_criteria": {}
    },
    "estimated_reach": number or null,
    "estimated_roi": number or null,
    "success_metrics": ["array of KPIs"],
    "sections": [
      {
        "title": "string",
        "content": "string",
        "type": "messaging|channels|budget|content|timeline|tactics|general"
      }
    ],
    "executive_summary": "string (2-3 sentence summary)",
    "strategy_reasoning": "string (explanation of strategic choices)"
  }
}

Extract as much information as possible from the text. Use null for missing numeric values and empty arrays/objects for missing collections.
Focus on actionable strategy elements that can be used for implementation."""

        user_prompt = f"""Analyze the following content and extract any comprehensive marketing strategy:

{request.content}

Return the result as valid JSON matching the schema described."""

        # Use Gemini with response_mime_type for JSON mode
        response = await client.aio.models.generate_content(
            model=DEFAULT_MODEL,
            contents=[
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "model", "parts": [{"text": "I understand. I will analyze the content for marketing strategy and return the result in the specified JSON format."}]},
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            config=types.GenerateContentConfig(
                temperature=1.0,  # Gemini 3 recommended default
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(thinking_level="low")  # was a 2048-token budget; latency-oriented route
            )
        )
        
        # Parse the JSON response
        try:
            result = json.loads(response.text)
            
            if result.get("has_strategy") and result.get("strategy"):
                strategy_data = result["strategy"]
                
                # Parse messaging framework if present
                messaging_framework = None
                if strategy_data.get("messaging_framework"):
                    mf_data = strategy_data["messaging_framework"]
                    # Ensure elevator_pitch is always a string
                    elevator_pitch = mf_data.get("elevator_pitch", "")
                    if elevator_pitch is None:
                        elevator_pitch = ""
                    else:
                        elevator_pitch = str(elevator_pitch)

                    messaging_framework = MessagingFramework(
                        value_propositions=mf_data.get("value_propositions", {}),
                        key_messages=mf_data.get("key_messages", {}),
                        differentiation_points=mf_data.get("differentiation_points", []),
                        elevator_pitch=elevator_pitch,
                        tone_of_voice=mf_data.get("tone_of_voice", {}),
                        proof_points=mf_data.get("proof_points", [])
                    )
                
                # Parse channel strategy if present
                channel_strategy = None
                if strategy_data.get("channel_strategy"):
                    cs_data = strategy_data["channel_strategy"]
                    channel_strategy = ChannelStrategy(
                        owned_media=cs_data.get("owned_media", {}),
                        earned_media=cs_data.get("earned_media", {}),
                        paid_media=cs_data.get("paid_media", {}),
                        channel_priorities=cs_data.get("channel_priorities", []),
                        budget_per_channel=cs_data.get("budget_per_channel", {})
                    )
                
                # Parse content strategy if present
                content_strategy = None
                if strategy_data.get("content_strategy"):
                    try:
                        cont_data = strategy_data["content_strategy"]
                        content_strategy = ContentStrategy(
                            content_pillars=cont_data.get("content_pillars", []),
                            campaign_concept=cont_data.get("campaign_concept", ""),
                            promotional_calendar=cont_data.get("promotional_calendar", {}),
                            recurring_themes=cont_data.get("recurring_themes", [])
                        )
                    except Exception as e:
                        logger.warning(f"ContentStrategy validation failed: {e}")
                        logger.debug(f"ContentStrategy data: {cont_data}")
                        # Continue without content strategy rather than failing entirely
                        content_strategy = None
                
                # Parse sections
                sections = []
                for section in strategy_data.get("sections", []):
                    if section.get("title") and section.get("content"):
                        sections.append(StrategySection(
                            title=section["title"],
                            content=section["content"],
                            type=section.get("type", "general"),
                            icon=section.get("icon")
                        ))
                
                # Create comprehensive DetectedStrategy instance
                strategy = DetectedStrategy(
                    campaign_name=strategy_data.get("campaign_name", "Marketing Strategy"),
                    campaign_duration=strategy_data.get("campaign_duration", ""),
                    total_budget=float(strategy_data.get("total_budget", 0)),
                    monthly_budget=float(strategy_data.get("monthly_budget", 0)),
                    objectives=strategy_data.get("objectives", []),
                    target_verticals=strategy_data.get("target_verticals", []),
                    target_personas=strategy_data.get("target_personas", []),
                    key_challenges=strategy_data.get("key_challenges", []),
                    unique_strengths=strategy_data.get("unique_strengths", []),
                    media_mix=strategy_data.get("media_mix", {"owned": 70, "earned": 20, "paid": 10}),
                    budget_allocation=strategy_data.get("budget_allocation", {}),
                    messaging_framework=messaging_framework,
                    channel_strategy=channel_strategy,
                    content_strategy=content_strategy,
                    go_to_market=strategy_data.get("go_to_market", {}),
                    estimated_reach=strategy_data.get("estimated_reach"),
                    estimated_roi=strategy_data.get("estimated_roi"),
                    success_metrics=strategy_data.get("success_metrics", []),
                    sections=sections,
                    raw_content=request.content[:10000],  # Limit raw content size
                    executive_summary=strategy_data.get("executive_summary", ""),
                    strategy_reasoning=strategy_data.get("strategy_reasoning", "")
                )
                
                return StrategyDetectionResponse(
                    has_strategy=True,
                    confidence=result.get("confidence", 0.8),
                    strategy=strategy,
                    extraction_method="llm_json_mode"
                )
            
            return StrategyDetectionResponse(
                has_strategy=False,
                confidence=0.0,
                strategy=None,
                extraction_method="llm_json_mode"
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response: {e}")
            logger.error(f"Response text: {response.text}")
            
            # Fallback to no strategy detected
            return StrategyDetectionResponse(
                has_strategy=False,
                confidence=0.0,
                strategy=None,
                extraction_method="llm_json_mode"
            )
            
    except Exception as e:
        logger.error(f"Error in strategy detection: {e}")
        logger.error(f"Request content length: {len(request.content)}")
        logger.debug(f"Full error details: {str(e)}")
        
        # Return a graceful failure instead of 500 error
        return StrategyDetectionResponse(
            has_strategy=False,
            confidence=0.0,
            strategy=None,
            extraction_method="llm_json_mode"
        )

class SaveStrategyRequest(BaseModel):
    strategy: DetectedStrategy
    campaign_id: Optional[UUID] = None
    client_id: Optional[UUID] = None  # Required for AGENCY organizations
    save_to: str = Field(default="campaign", description="campaign|company")

@router.get("/api/v1/marketing-strategies")
async def get_marketing_strategies(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all marketing strategies for the current user's organization
    """
    try:
        supabase = get_supabase_client()
        
        # Get user's organization
        user_result = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        org_id = user_result.data["org_id"]
        
        # Fetch marketing strategies for the user's organization
        result = supabase.table('marketing_strategies') \
            .select('id, title, strategy_type, status, created_at, org_id, value_propositions, key_messages, channel_mix, budget_allocation') \
            .eq('org_id', org_id) \
            .order('created_at', desc=True) \
            .execute()
        
        return {
            "success": True,
            "data": result.data or []
        }
        
    except Exception as e:
        logger.error(f"Error fetching marketing strategies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/v1/marketing-strategies/{strategy_id}/activate")
async def activate_marketing_strategy(
    strategy_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Activate a marketing strategy (set as active, deactivate others)
    """
    try:
        supabase = get_supabase_client()
        
        # Get user's organization
        user_result = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        org_id = user_result.data["org_id"]
        
        # First, verify the strategy belongs to the user's organization
        strategy_check = supabase.table("marketing_strategies") \
            .select("id, org_id, campaign_id") \
            .eq("id", strategy_id) \
            .eq("org_id", org_id) \
            .single() \
            .execute()
        
        if not strategy_check.data:
            raise HTTPException(status_code=404, detail="Strategy not found or access denied")
        
        campaign_id = strategy_check.data.get("campaign_id")
        
        # Deactivate all other strategies for this organization (or campaign if specified)
        if campaign_id:
            # If this strategy is tied to a campaign, only deactivate others in the same campaign
            supabase.table("marketing_strategies") \
                .update({"status": "draft"}) \
                .eq("org_id", org_id) \
                .eq("campaign_id", campaign_id) \
                .eq("status", "active") \
                .neq("id", strategy_id) \
                .execute()
        else:
            # Otherwise, deactivate all active strategies for the organization
            supabase.table("marketing_strategies") \
                .update({"status": "draft"}) \
                .eq("org_id", org_id) \
                .eq("status", "active") \
                .neq("id", strategy_id) \
                .execute()
        
        # Activate the selected strategy
        result = supabase.table("marketing_strategies") \
            .update({"status": "active"}) \
            .eq("id", strategy_id) \
            .execute()
        
        # Log the activation
        logger.info(f"Strategy {strategy_id} activated for org {org_id} by user {current_user['id']}")
        
        return {
            "success": True,
            "message": "Strategy activated successfully",
            "strategy_id": strategy_id,
            "status": "active"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/v1/save-marketing-strategy")
async def save_marketing_strategy(
    request: SaveStrategyRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    🚀 NUCLEAR IMPLEMENTATION: Save marketing strategy with ZERO data loss
    Uses universal agent_outputs table instead of dual-table anti-pattern
    """
    try:
        # Get user's organization
        supabase = get_supabase_client()
        user_result = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        org_id = user_result.data["org_id"]

        # Get org type to validate client_id requirement
        org_result = supabase.table("organizations").select("type").eq("id", org_id).single().execute()
        org_type = org_result.data["type"]

        # AGENCY organizations REQUIRE client_id for schema routing
        if org_type == "AGENCY" and not request.client_id:
            raise HTTPException(
                status_code=400,
                detail="client_id is required for AGENCY organizations"
            )

        # Get universal output service
        output_service = get_universal_output_service()

        # 🎯 PRESERVE COMPLETE LLM OUTPUT - Zero data loss
        complete_strategy_content = {
            # Complete strategy object from LLM - NO FLATTENING
            "campaign_name": request.strategy.campaign_name,
            "campaign_duration": request.strategy.campaign_duration,
            "total_budget": request.strategy.total_budget,
            "monthly_budget": request.strategy.monthly_budget,
            "objectives": request.strategy.objectives,
            "target_verticals": request.strategy.target_verticals,
            "target_personas": request.strategy.target_personas,
            "key_challenges": request.strategy.key_challenges,
            "unique_strengths": request.strategy.unique_strengths,
            "media_mix": request.strategy.media_mix,
            "budget_allocation": request.strategy.budget_allocation,
            "estimated_reach": request.strategy.estimated_reach,
            "estimated_roi": request.strategy.estimated_roi,
            "success_metrics": request.strategy.success_metrics,
            "executive_summary": request.strategy.executive_summary,
            "strategy_reasoning": request.strategy.strategy_reasoning,
            "raw_content": request.strategy.raw_content,

            # Complex nested structures preserved completely
            "messaging_framework": request.strategy.messaging_framework.model_dump() if request.strategy.messaging_framework else None,
            "channel_strategy": request.strategy.channel_strategy.model_dump() if request.strategy.channel_strategy else None,
            "content_strategy": request.strategy.content_strategy.model_dump() if request.strategy.content_strategy else None,
            "go_to_market": request.strategy.go_to_market,

            # Sections array preserved
            "sections": [
                {
                    "title": section.title,
                    "content": section.content,
                    "type": section.type,
                    "icon": section.icon
                }
                for section in request.strategy.sections
            ],

            # Save metadata
            "save_metadata": {
                "save_location": request.save_to,
                "detected_at": datetime.utcnow().isoformat(),
                "detection_confidence": 0.8,
                "sections_count": len(request.strategy.sections),
                "llm_model": DEFAULT_MODEL,
                "extraction_method": "llm_json_mode"
            }
        }

        # 🚀 Universal save - single table, complete data preservation
        result = await output_service.save_agent_output(
            agent_type="marketing_strategy",
            output_type="full_strategy",
            content=complete_strategy_content,  # COMPLETE LLM output preserved
            title=request.strategy.campaign_name,
            summary=request.strategy.executive_summary,
            org_id=org_id,
            user_id=current_user["id"],
            campaign_id=str(request.campaign_id) if request.campaign_id else None,
            client_id=str(request.client_id) if request.client_id else None,  # Pass client_id for schema routing
            metadata={
                "strategy_type": "ai_detected",
                "save_location": request.save_to,
                "confidence_score": 0.8
            },
            confidence_score=0.8
        )

        logger.info(
            f"✅ Marketing strategy saved with ZERO data loss: {result['id']} "
            f"(org_type: {org_type}, client_id: {request.client_id or 'N/A'})"
        )

        return {
            "success": True,
            "output_id": result["id"],  # Now points to agent_outputs
            "message": f"Marketing strategy saved with complete data preservation"
        }

    except Exception as e:
        logger.error(f"❌ Error saving marketing strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))