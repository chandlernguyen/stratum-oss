"""
Action Plan Detection using LLM
Uses Gemini to intelligently detect and extract action plans from Strategy Agent responses
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
import json
import os
from apps.api.auth.supabase_auth import get_current_user
from apps.api.services.context_intelligence import context_intelligence
from apps.api.config.gemini_models import DEFAULT_MODEL

router = APIRouter(tags=["action_plan"])

# Gemini client, created on first use.
#
# This used to raise ValueError at import time and build a client at module
# scope, which made the whole application unimportable without GOOGLE_API_KEY.
# Requiring the key belongs at the point of use, not at import.
_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    """Return the shared Gemini client, creating it on first use."""
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        _client = genai.Client(api_key=api_key)
    return _client

# Get model name from environment with fallback
GEMINI_MODEL = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)

class ActionPlanItem(BaseModel):
    task: str
    category: str  # research, marketing, sales, product, operations, general
    timeframe: Optional[str] = None
    priority: str  # high, medium, low
    suggested_agent: str  # persona, content, campaign_planning, quick_wins, etc.

class ActionPlanDetectionRequest(BaseModel):
    content: str
    context: Optional[str] = None  # Additional context about the conversation
    campaign_id: Optional[str] = None  # Campaign ID to get business context

class ActionPlanDetectionResponse(BaseModel):
    has_action_plan: bool
    confidence: float  # 0.0 to 1.0
    items: List[ActionPlanItem] = []
    overall_timeframe: Optional[str] = None
    summary: Optional[str] = None

@router.post("/detect-action-plan", response_model=ActionPlanDetectionResponse)
async def detect_action_plan(
    request: ActionPlanDetectionRequest,
    user: dict = Depends(get_current_user)
) -> ActionPlanDetectionResponse:
    """
    Uses LLM to intelligently detect if content contains an action plan
    and extracts actionable items with appropriate categorization
    """
    
    # Get business context if campaign_id provided
    business_context_prompt = ""
    if request.campaign_id:
        try:
            enhanced_prompt = await context_intelligence.enhance_cross_agent_prompt(
                "", # Empty base prompt since we just want context
                request.campaign_id,
                "action_plan"
            )
            if enhanced_prompt:
                business_context_prompt = f"""
                
BUSINESS CONTEXT:
{enhanced_prompt.replace("BUSINESS CONTEXT:", "").replace("TASK:", "").strip()}
                """
        except Exception as e:
            print(f"Warning: Could not get business context: {e}")
    
    prompt = f"""
    Analyze the following content and determine if it contains an actionable plan or implementation steps.{business_context_prompt}
    
    Content to analyze:
    {request.content}
    
    Please respond with a JSON object containing:
    1. has_action_plan (boolean): true if the content contains actionable steps that a user should implement
    2. confidence (float 0-1): how confident you are this is an action plan
    3. items (array): list of specific action items, each with:
       - task: brief description of the action
       - category: one of [research, marketing, sales, product, operations, general]
       - timeframe: if mentioned (e.g., "2 weeks", "1-3 months")
       - priority: high/medium/low based on urgency and impact
       - suggested_agent: which agent would best help with this task
         Options: persona (for customer research), content (for marketing materials), 
                  campaign_planning (for campaigns), quick_wins (for immediate actions),
                  roi_budget (for financial planning), analytics (for metrics)
    4. overall_timeframe: the total timeline if mentioned
    5. summary: one-line summary of the overall plan
    
    Only extract items that are actual tasks to be done, not completed items or general information.
    Focus on forward-looking actions, not descriptions of past events or current state.
    
    Agent mapping guidelines:
    - Customer research, ICP definition, user interviews -> persona
    - Content creation, messaging, value props -> content
    - Campaign planning, channel strategy -> campaign_planning
    - Quick improvements, immediate actions -> quick_wins
    - Budgeting, ROI analysis -> roi_budget
    - Metrics, KPIs, analytics -> analytics
    
    Return ONLY valid JSON, no other text.
    """
    
    try:
        # Use the new SDK pattern
        response = await get_client().aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        # Parse the JSON response
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                # Fallback: no action plan detected
                return ActionPlanDetectionResponse(
                    has_action_plan=False,
                    confidence=0.0,
                    items=[]
                )
        
        # Convert to response model
        items = []
        for item_data in result.get('items', []):
            items.append(ActionPlanItem(
                task=item_data.get('task', ''),
                category=item_data.get('category', 'general'),
                timeframe=item_data.get('timeframe'),
                priority=item_data.get('priority', 'medium'),
                suggested_agent=item_data.get('suggested_agent', 'quick_wins')
            ))
        
        return ActionPlanDetectionResponse(
            has_action_plan=result.get('has_action_plan', False),
            confidence=float(result.get('confidence', 0.0)),
            items=items,
            overall_timeframe=result.get('overall_timeframe'),
            summary=result.get('summary')
        )
        
    except Exception as e:
        print(f"Error detecting action plan: {str(e)}")
        # Return safe default
        return ActionPlanDetectionResponse(
            has_action_plan=False,
            confidence=0.0,
            items=[]
        )

@router.post("/extract-action-items")
async def extract_action_items(
    request: ActionPlanDetectionRequest,
    user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    More detailed extraction of action items with context-aware prompts for each agent
    """
    
    detection = await detect_action_plan(request, user)
    
    if not detection.has_action_plan:
        return {"has_actions": False, "message": "No action plan detected"}
    
    # Group items by suggested agent
    grouped = {}
    for item in detection.items:
        agent = item.suggested_agent
        if agent not in grouped:
            grouped[agent] = []
        grouped[agent].append(item.dict())
    
    # Generate suggested prompts for each agent
    agent_prompts = {}
    for agent, items in grouped.items():
        task_list = "\n".join([f"- {item['task']}" + 
                               (f" ({item['timeframe']})" if item.get('timeframe') else "")
                               for item in items])
        
        if agent == "persona":
            agent_prompts[agent] = f"Based on our strategic analysis, help me create detailed buyer personas for:\n\n{task_list}\n\nFocus on understanding their pain points and decision-making process."
        elif agent == "content":
            agent_prompts[agent] = f"We need marketing materials for these strategic initiatives:\n\n{task_list}\n\nPlease create content that aligns with our repositioning strategy."
        elif agent == "campaign_planning":
            agent_prompts[agent] = f"Help me execute campaigns for these priorities:\n\n{task_list}\n\nInclude channels, timelines, and success metrics."
        elif agent == "quick_wins":
            agent_prompts[agent] = f"Identify quick wins from these action items:\n\n{task_list}\n\nPrioritize actions that show results within 2 weeks."
        else:
            agent_prompts[agent] = f"Help me work on:\n\n{task_list}"
    
    return {
        "has_actions": True,
        "confidence": detection.confidence,
        "summary": detection.summary,
        "overall_timeframe": detection.overall_timeframe,
        "grouped_actions": grouped,
        "agent_prompts": agent_prompts
    }