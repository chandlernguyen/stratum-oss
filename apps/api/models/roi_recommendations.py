"""
Pydantic models for LLM-powered ROI recommendations.
Phase 5: Transform from SQL rules to intelligent, context-aware insights.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ClarificationQuestion(BaseModel):
    """Question for gathering missing business context."""
    question: str = Field(..., description="Specific question to ask")
    reason: str = Field(..., description="Why this information is needed")
    category: str = Field(..., description="Category: infrastructure, strategy, data_quality, conflicts")


class ROIRecommendation(BaseModel):
    """Single ROI optimization recommendation with strategic reasoning."""
    task: str = Field(..., description="Specific actionable task (e.g., 'Reduce Facebook spend by 30%')")
    reason: str = Field(..., description="Strategic reasoning with business context")
    priority: str = Field(..., description="Priority: high, medium, or low")
    category: str = Field(
        ...,
        description="Category: channel_optimization, budget_reallocation, scale_opportunity, pause_campaign, investigate_decline, data_collection"
    )
    estimated_impact: str = Field(..., description="Expected ROI improvement or cost savings")
    confidence: str = Field(..., description="Confidence level: high, medium, or low")
    data_supporting: str = Field(..., description="Which metrics support this recommendation")
    estimated_savings: Optional[float] = Field(None, description="Estimated dollar savings")
    estimated_gain: Optional[float] = Field(None, description="Estimated revenue gain")


class ROIRecommendationsResponse(BaseModel):
    """LLM response with either recommendations or clarification questions."""
    type: str = Field(..., description="Response type: 'recommendations' or 'clarification_needed'")
    recommendations: Optional[List[ROIRecommendation]] = Field(None, description="List of recommendations")
    overall_assessment: Optional[str] = Field(None, description="1-2 sentence summary of campaign portfolio health")
    confidence: Optional[str] = Field(None, description="Overall confidence based on data quality: high, medium, low")
    questions: Optional[List[ClarificationQuestion]] = Field(None, description="Questions for clarification")
    message: Optional[str] = Field(None, description="Message explaining why clarification is needed")


class ROIRecommendationsRequest(BaseModel):
    """Request for ROI recommendations with comprehensive business context."""
    org_id: str = Field(..., description="Organization ID")
    business_context: Optional[Dict[str, Any]] = Field(None, description="Complete business profile data")

    # Business identity
    company_name: Optional[str] = Field(None, description="Company name")
    industry: str = Field(default="", description="Industry vertical (e.g., SaaS, E-commerce, B2B)")
    main_products: List[str] = Field(default_factory=list, description="Main products/services")
    target_market: List[str] = Field(default_factory=list, description="Target market segments")

    # Competitive landscape
    competitors: List[str] = Field(default_factory=list, description="Key competitors")
    unique_value_proposition: Optional[str] = Field(None, description="What differentiates from competitors")

    # Financial constraints
    marketing_budget: Optional[str] = Field(None, description="Marketing budget level (e.g., 'Under $10k/month', '$50k-100k/month')")
    revenue_range: Optional[str] = Field(None, description="Annual revenue range")

    # Marketing context
    marketing_team_size: Optional[str] = Field(None, description="Size of marketing team")
    primary_channels: List[str] = Field(default_factory=list, description="Primary marketing channels used")
    business_goals: List[str] = Field(default_factory=list, description="Current business objectives")

    # Strategic context from marketing strategies
    strategies: List[Dict[str, Any]] = Field(default_factory=list, description="Marketing strategy outputs")
    personas: List[Dict[str, Any]] = Field(default_factory=list, description="Customer personas")

    # Historical context
    seasonal_factors: Optional[str] = Field(None, description="Known seasonal patterns")
    growth_stage: Optional[str] = Field(None, description="Business stage: startup, growth, mature")


class CampaignMetric(BaseModel):
    """Campaign performance metric for analysis."""
    campaign_name: str
    metric_date: str
    spend: float
    revenue: Optional[float] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    source: Optional[str] = None
    roi_pct: Optional[float] = None


class CachedRecommendations(BaseModel):
    """Cached recommendations with metadata."""
    org_id: str
    data_hash: str
    recommendations: List[ROIRecommendation]
    confidence: str
    overall_assessment: Optional[str] = None
    generated_at: str
    cache_expires_at: str
    llm_tokens_used: int
    generation_time_ms: int
