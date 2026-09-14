"""
LLM prompt building and response parsing for dashboard recommendations.
Pattern: Adapted from smart_roi_recommendations.py
"""
from typing import Dict, Any, List
import json


def build_dashboard_recommendation_prompt(
    user_metrics: Dict[str, Any],
    campaigns: List[Dict[str, Any]],
    agent_outputs: List[Dict[str, Any]],
    request_data: Dict[str, Any]
) -> str:
    """
    Build comprehensive prompt for LLM to generate personalized dashboard recommendations.

    Args:
        user_metrics: Dashboard metrics (campaign_count, document_count, ai_interactions, etc.)
        campaigns: List of user's campaigns with status and metadata
        agent_outputs: User's existing agent outputs (strategies, personas, content)
        request_data: Business context and goals

    Returns:
        Formatted prompt for Gemini LLM
    """

    # Extract business context
    company_name = request_data.get('company_name', 'this organization')
    industry = request_data.get('industry', 'not specified')
    business_goals = request_data.get('business_goals', [])
    strategies = request_data.get('strategies', [])
    personas = request_data.get('personas', [])

    # Build context summary
    campaign_count = user_metrics.get('campaign_count', 0)
    document_count = user_metrics.get('document_count', 0)
    ai_interactions = user_metrics.get('total_ai_interactions', 0)

    # Analyze what the user has and hasn't done
    has_strategies = len(strategies) > 0
    has_personas = len(personas) > 0
    has_active_campaigns = any(c.get('status') == 'active' for c in campaigns)
    has_draft_campaigns = any(c.get('status') == 'draft' for c in campaigns)

    prompt = f"""You are an expert marketing strategist analyzing a user's dashboard to provide personalized next steps.

# User Context
Company: {company_name}
Industry: {industry}
Business Goals: {', '.join(business_goals) if business_goals else 'Not specified'}

# Current Marketing Activity
- Campaigns: {campaign_count} total ({len([c for c in campaigns if c.get('status') == 'active'])} active, {len([c for c in campaigns if c.get('status') == 'draft'])} draft)
- Saved Documents: {document_count}
- AI Interactions: {ai_interactions}
- Strategies Created: {len(strategies)}
- Personas Created: {len(personas)}

# Progress Analysis
"""

    # Add specific insights
    if campaign_count == 0:
        prompt += "- Status: GETTING_STARTED - User has not created any campaigns yet\n"
    elif campaign_count <= 2:
        prompt += "- Status: BUILDING_MOMENTUM - User is in early stages with a few campaigns\n"
    else:
        prompt += "- Status: SCALING_UP - User has multiple campaigns and is growing\n"

    if not has_strategies:
        prompt += "- Missing: No strategic analysis completed yet\n"
    else:
        prompt += f"- Strength: {len(strategies)} strategic analyses completed\n"

    if not has_personas:
        prompt += "- Missing: No customer personas created yet\n"
    else:
        prompt += f"- Strength: {len(personas)} customer personas defined\n"

    # Add campaign details if available
    if campaigns:
        prompt += "\n# Campaign Details\n"
        for campaign in campaigns[:3]:  # Show top 3
            prompt += f"- {campaign.get('name')}: {campaign.get('status')} (Budget: ${campaign.get('budget', 0):,})\n"

    prompt += f"""

# Your Task
Based on this user's current progress, recommend 3-5 specific next steps that will have the highest impact on their marketing success.

Follow this logical progression:
1. Foundation First: If missing strategies or personas, prioritize these
2. Content Creation: If foundation is solid but no campaigns, suggest content/campaign creation
3. Optimization: If campaigns exist, suggest performance analysis and optimization
4. Quick Wins: Always include 1-2 immediate actionable items

For each recommendation:
- Be specific and actionable (not generic)
- Consider the user's industry and goals
- Prioritize based on marketing best practices
- Route to the appropriate AI agent
- Estimate realistic time to complete

Available Agents:
- strategy: Business analysis, SWOT, market research → /strategy
- persona: Customer profiling, buyer journeys → /persona
- content: Campaign materials, social media → /content
- performance-intelligence: ROI, quick wins, analytics → /performance-intelligence
- competitive-intelligence: Competitor analysis → /competitive-intelligence
- campaign-execution: Multi-channel deployment → /campaign-execution

Return JSON in the exact schema format provided.
"""

    return prompt
