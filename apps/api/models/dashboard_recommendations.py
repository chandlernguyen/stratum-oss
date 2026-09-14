"""
Pydantic models for dashboard recommendations.
Pattern: Follows roi_recommendations.py structure
"""
from pydantic import BaseModel, Field
from typing import Literal, List, Dict, Any, Optional


class DashboardRecommendation(BaseModel):
    """A single actionable recommendation for the dashboard."""
    task: str = Field(..., description="Specific actionable next step for the user")
    reason: str = Field(..., description="Strategic reasoning with user context")
    priority: Literal['low', 'medium', 'high'] = Field(..., description="Urgency of this recommendation")
    category: str = Field(..., description="Type: persona_creation, content_generation, strategy_analysis, campaign_optimization, quick_win, data_import")
    agent_id: str = Field(..., description="Which agent to use: strategy, persona, content, performance-intelligence, competitive-intelligence, campaign-execution")
    agent_path: str = Field(..., description="Frontend route path to the agent (e.g., /strategy, /persona)")
    estimated_time: str = Field(..., description="Time to complete (e.g., '3 minutes', '5-10 minutes')")
    confidence: Literal['low', 'medium', 'high'] = Field(..., description="Confidence in this recommendation")


class DashboardRecommendationsRequest(BaseModel):
    """Request body for dashboard recommendations."""
    org_id: str
    business_context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    company_name: Optional[str] = None
    industry: Optional[str] = ""
    main_products: List[str] = Field(default_factory=list)
    target_market: List[str] = Field(default_factory=list)
    competitors: List[str] = Field(default_factory=list)
    unique_value_proposition: Optional[str] = None
    marketing_budget: Optional[str] = None
    revenue_range: Optional[str] = None
    marketing_team_size: Optional[int] = None
    primary_channels: List[str] = Field(default_factory=list)
    business_goals: List[str] = Field(default_factory=list)
    strategies: List[Dict[str, Any]] = Field(default_factory=list)
    personas: List[Dict[str, Any]] = Field(default_factory=list)
    seasonal_factors: Optional[str] = None
    growth_stage: Optional[str] = None


class DashboardRecommendationsResponse(BaseModel):
    """Response with personalized dashboard recommendations."""
    type: Literal['recommendations', 'clarification_needed']
    recommendations: Optional[List[DashboardRecommendation]] = None
    overall_assessment: Optional[str] = Field(None, description="LLM executive summary of user's marketing status")
    confidence: Literal['low', 'medium', 'high'] = Field(default='medium')

    # Context summary (metrics from database)
    context_summary: Optional[Dict[str, Any]] = None
