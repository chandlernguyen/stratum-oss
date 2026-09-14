"""
Agent-Specific Insight Extraction Schemas
Defines tailored extraction schemas for each of the 10 specialized agents
"""

from typing import Optional, List
from pydantic import BaseModel, Field

# ============== Strategy Agent ==============
class StrategyInsight(BaseModel):
    """Strategy-specific insights focusing on business direction and planning."""
    strategic_goals: Optional[str] = Field(None, description="Main strategic objectives")
    market_position: Optional[str] = Field(None, description="Current market standing")
    competitive_advantages: Optional[List[str]] = Field(None, description="Key differentiators")
    growth_strategy: Optional[str] = Field(None, description="Expansion plans")
    risk_factors: Optional[List[str]] = Field(None, description="Major business risks")
    resource_constraints: Optional[str] = Field(None, description="Key limitations")
    time_horizon: Optional[str] = Field(None, description="Planning timeline")
    strategic_priorities: Optional[List[str]] = Field(None, description="Top priorities")

# ============== Marketing Strategy Agent ==============
class MarketingStrategyInsight(BaseModel):
    """Marketing strategy insights focusing on go-to-market approach."""
    marketing_budget: Optional[str] = Field(None, description="Available marketing spend")
    target_segments: Optional[List[str]] = Field(None, description="Customer segments")
    value_proposition: Optional[str] = Field(None, description="Core value message")
    channel_mix: Optional[str] = Field(None, description="Marketing channels used")
    messaging_themes: Optional[List[str]] = Field(None, description="Key messages")
    brand_positioning: Optional[str] = Field(None, description="Brand market position")
    marketing_goals: Optional[List[str]] = Field(None, description="Marketing objectives")
    conversion_metrics: Optional[str] = Field(None, description="Key conversion rates")

# ============== Persona Agent ==============
class PersonaInsight(BaseModel):
    """Customer persona insights for understanding target audiences."""
    customer_segments: Optional[List[str]] = Field(None, description="Customer categories")
    demographics: Optional[str] = Field(None, description="Age, location, income")
    psychographics: Optional[str] = Field(None, description="Values, interests, lifestyle")
    pain_points: Optional[List[str]] = Field(None, description="Customer problems")
    buying_triggers: Optional[List[str]] = Field(None, description="Purchase motivators")
    decision_process: Optional[str] = Field(None, description="How they buy")
    preferred_channels: Optional[List[str]] = Field(None, description="Communication preferences")
    job_titles: Optional[List[str]] = Field(None, description="Typical roles/positions")

# ============== Content Agent ==============
class ContentInsight(BaseModel):
    """Content strategy insights for material creation."""
    content_types: Optional[List[str]] = Field(None, description="Blog, video, podcast, etc")
    publishing_cadence: Optional[str] = Field(None, description="Frequency of publishing")
    content_themes: Optional[List[str]] = Field(None, description="Main topic areas")
    tone_of_voice: Optional[str] = Field(None, description="Brand voice characteristics")
    content_formats: Optional[List[str]] = Field(None, description="Long-form, short-form, etc")
    distribution_channels: Optional[List[str]] = Field(None, description="Where content is shared")
    content_goals: Optional[str] = Field(None, description="What content aims to achieve")
    engagement_metrics: Optional[str] = Field(None, description="How success is measured")

# ============== Analytics Agent ==============
class AnalyticsInsight(BaseModel):
    """Analytics insights for data-driven decision making."""
    key_metrics: Optional[List[str]] = Field(None, description="Primary KPIs tracked")
    data_sources: Optional[List[str]] = Field(None, description="Where data comes from")
    reporting_tools: Optional[List[str]] = Field(None, description="Analytics platforms used")
    measurement_gaps: Optional[List[str]] = Field(None, description="What's not being tracked")
    performance_benchmarks: Optional[str] = Field(None, description="Success thresholds")
    reporting_frequency: Optional[str] = Field(None, description="How often reports are needed")
    data_challenges: Optional[List[str]] = Field(None, description="Analytics obstacles")
    attribution_model: Optional[str] = Field(None, description="How credit is assigned")

# ============== ROI & Budget Agent ==============
class ROIBudgetInsight(BaseModel):
    """Financial insights for budget allocation and ROI tracking."""
    total_budget: Optional[str] = Field(None, description="Overall budget available")
    budget_allocation: Optional[str] = Field(None, description="How budget is divided")
    roi_targets: Optional[str] = Field(None, description="Expected returns")
    cost_per_acquisition: Optional[str] = Field(None, description="CPA metrics")
    lifetime_value: Optional[str] = Field(None, description="Customer LTV")
    payback_period: Optional[str] = Field(None, description="Investment recovery time")
    funding_constraints: Optional[List[str]] = Field(None, description="Budget limitations")
    investment_priorities: Optional[List[str]] = Field(None, description="Where to spend first")

# ============== Campaign Execution Agent ==============
class CampaignExecutionInsight(BaseModel):
    """Campaign execution insights for tactical implementation."""
    campaign_types: Optional[List[str]] = Field(None, description="Types of campaigns run")
    execution_timeline: Optional[str] = Field(None, description="Campaign schedules")
    resource_requirements: Optional[str] = Field(None, description="Team and tools needed")
    campaign_channels: Optional[List[str]] = Field(None, description="Where campaigns run")
    success_criteria: Optional[str] = Field(None, description="How success is defined")
    testing_approach: Optional[str] = Field(None, description="A/B testing strategy")
    execution_challenges: Optional[List[str]] = Field(None, description="Implementation obstacles")
    campaign_frequency: Optional[str] = Field(None, description="How often campaigns launch")

# ============== Quick Wins Agent ==============
class QuickWinsInsight(BaseModel):
    """Quick wins insights for immediate impact opportunities."""
    immediate_opportunities: Optional[List[str]] = Field(None, description="Quick improvements")
    resource_constraints: Optional[str] = Field(None, description="Available resources")
    time_constraints: Optional[str] = Field(None, description="Timeline pressures")
    low_hanging_fruit: Optional[List[str]] = Field(None, description="Easy wins")
    quick_fix_priorities: Optional[List[str]] = Field(None, description="What to fix first")
    expected_impact: Optional[str] = Field(None, description="Potential improvements")
    implementation_barriers: Optional[List[str]] = Field(None, description="What's blocking action")
    success_timeframe: Optional[str] = Field(None, description="When results expected")

# ============== Competitive Intelligence Agent ==============
class CompetitiveIntelligenceInsight(BaseModel):
    """Competitive insights for market positioning."""
    main_competitors: Optional[List[str]] = Field(None, description="Direct competitors")
    competitive_advantages: Optional[List[str]] = Field(None, description="Our strengths")
    competitive_weaknesses: Optional[List[str]] = Field(None, description="Our gaps")
    market_threats: Optional[List[str]] = Field(None, description="Competitive risks")
    market_opportunities: Optional[List[str]] = Field(None, description="Market gaps")
    competitor_strategies: Optional[str] = Field(None, description="What competitors do")
    differentiation_points: Optional[List[str]] = Field(None, description="How we're different")
    market_trends: Optional[List[str]] = Field(None, description="Industry directions")

# ============== Client Success Agent ==============
class ClientSuccessInsight(BaseModel):
    """Client success insights for retention and growth."""
    client_types: Optional[List[str]] = Field(None, description="Categories of clients")
    retention_rate: Optional[str] = Field(None, description="Client retention metrics")
    churn_reasons: Optional[List[str]] = Field(None, description="Why clients leave")
    success_metrics: Optional[List[str]] = Field(None, description="How success is measured")
    client_satisfaction: Optional[str] = Field(None, description="Satisfaction scores")
    expansion_opportunities: Optional[List[str]] = Field(None, description="Upsell/cross-sell")
    service_gaps: Optional[List[str]] = Field(None, description="What's missing")
    client_feedback: Optional[str] = Field(None, description="Common feedback themes")

# ============== Mapping of agents to their specific insight classes ==============
AGENT_INSIGHT_MODELS = {
    'strategy': StrategyInsight,
    'marketing_strategy': MarketingStrategyInsight,
    'persona': PersonaInsight,
    'content': ContentInsight,
    'analytics': AnalyticsInsight,
    'roi_budget': ROIBudgetInsight,
    'campaign_planning': CampaignExecutionInsight,
    'quick_wins': QuickWinsInsight,
    'competitive_intelligence': CompetitiveIntelligenceInsight,
    'client_success': ClientSuccessInsight
}

# ============== Agent-specific extraction prompts ==============
def get_agent_extraction_prompt(agent_type: str) -> str:
    """Get customized extraction prompt for each agent type."""

    prompts = {
        'strategy': """Extract strategic business information:
- What are their main strategic goals and objectives?
- What is their current market position?
- What competitive advantages do they have?
- What growth strategies are they pursuing?
- What risks and constraints do they face?
- What is their planning timeline?""",

        'marketing_strategy': """Extract marketing strategy information:
- What is their marketing budget?
- Who are their target customer segments?
- What is their value proposition?
- Which marketing channels do they use?
- What are their key messages and brand positioning?
- What are their marketing goals and conversion metrics?""",

        'persona': """Extract customer persona information:
- What customer segments do they serve?
- What are the demographics and psychographics?
- What pain points do customers have?
- What triggers purchases?
- How do customers make decisions?
- What channels do customers prefer?""",

        'content': """Extract content strategy information:
- What types of content do they create?
- How often do they publish?
- What themes and topics do they cover?
- What is their tone of voice?
- Where do they distribute content?
- What are their content goals and metrics?""",

        'analytics': """Extract analytics and measurement information:
- What key metrics do they track?
- What data sources and tools do they use?
- What are they not measuring that they should?
- What are their performance benchmarks?
- How often do they report?
- What data challenges do they face?""",

        'roi_budget': """Extract financial and ROI information:
- What is their total budget?
- How is budget allocated?
- What ROI targets do they have?
- What is their CPA and LTV?
- What is the payback period?
- What are their investment priorities?""",

        'campaign_planning': """Extract campaign execution information:
- What types of campaigns do they run?
- What is their execution timeline?
- What resources do they need?
- Which channels do they use for campaigns?
- How do they define success?
- What testing do they do?""",

        'quick_wins': """Extract quick wins information:
- What immediate opportunities exist?
- What resources are available?
- What time constraints exist?
- What are the easy wins?
- What should be prioritized?
- When do they expect results?""",

        'competitive_intelligence': """Extract competitive intelligence:
- Who are their main competitors?
- What are their competitive advantages and weaknesses?
- What market threats and opportunities exist?
- How do competitors operate?
- How are they differentiated?
- What market trends affect them?""",

        'client_success': """Extract client success information:
- What types of clients do they have?
- What is their retention rate?
- Why do clients churn?
- How do they measure success?
- What expansion opportunities exist?
- What service gaps need filling?"""
    }

    return prompts.get(agent_type, "Extract relevant business information specific to this agent's domain.")

# ============== Agent-specific confidence weights ==============
def get_agent_confidence_weights(agent_type: str) -> tuple[float, float]:
    """
    Get confidence scoring weights for each agent.
    Returns (base_weight, agent_specific_weight) that sum to 1.0
    """
    weights = {
        'strategy': (0.4, 0.6),  # Strategy focuses more on agent-specific insights
        'marketing_strategy': (0.3, 0.7),  # Marketing heavily weighted to specific insights
        'persona': (0.2, 0.8),  # Persona is almost entirely specific insights
        'content': (0.3, 0.7),  # Content focuses on specific tactics
        'analytics': (0.3, 0.7),  # Analytics is very domain-specific
        'roi_budget': (0.4, 0.6),  # Financial needs both context and specifics
        'campaign_planning': (0.3, 0.7),  # Execution is tactical
        'quick_wins': (0.2, 0.8),  # Quick wins are very specific
        'competitive_intelligence': (0.5, 0.5),  # Balanced between context and competition
        'client_success': (0.4, 0.6),  # Client success needs context and specifics
    }

    return weights.get(agent_type, (0.5, 0.5))  # Default to balanced