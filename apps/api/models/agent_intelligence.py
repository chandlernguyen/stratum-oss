"""
Agent-Specific Intelligence Models
Specialized data extraction models for all 9 AI agents
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


# ============================================
# 1. STRATEGY AGENT INTELLIGENCE
# ============================================

class StrategicFramework(str, Enum):
    SWOT = "swot"
    PORTERS_FIVE = "porters_five_forces"
    BUSINESS_MODEL_CANVAS = "business_model_canvas"
    ICE_PRIORITIZATION = "ice_prioritization"
    BCG_MATRIX = "bcg_matrix"
    VRIO = "vrio"
    THREE_HORIZONS = "three_horizons"
    BLUE_OCEAN = "blue_ocean"
    MCKINSEY_7S = "mckinsey_7s"
    OKRS = "okrs"
    JOBS_TO_BE_DONE = "jobs_to_be_done"


# Nested models for StrategyIntelligence
class StrategicGoal(BaseModel):
    """Individual strategic goal"""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    timeline: Optional[str] = None
    success_metrics: Optional[List[str]] = Field(default_factory=list)


class OKR(BaseModel):
    """Objective and Key Results"""
    objective: Optional[str] = None
    key_results: List[str] = Field(default_factory=list)
    timeline: Optional[str] = None
    owner: Optional[str] = None


class TargetSegment(BaseModel):
    """Target market segment"""
    name: Optional[str] = None
    description: Optional[str] = None
    size: Optional[str] = None
    characteristics: Optional[List[str]] = Field(default_factory=list)
    priority: Optional[str] = None


class StrategicInitiative(BaseModel):
    """Strategic initiative or project"""
    name: Optional[str] = None
    description: Optional[str] = None
    impact: Optional[str] = None
    effort: Optional[str] = None
    timeline: Optional[str] = None
    dependencies: Optional[List[str]] = Field(default_factory=list)


class PriorityMatrix(BaseModel):
    """ICE or similar priority scoring"""
    high_priority: Optional[List[str]] = Field(default_factory=list)
    medium_priority: Optional[List[str]] = Field(default_factory=list)
    low_priority: Optional[List[str]] = Field(default_factory=list)
    scoring_criteria: Optional[str] = None


class FrameworkInsight(BaseModel):
    """Insight from a specific strategic framework"""
    framework: Optional[str] = None
    key_findings: List[str] = Field(default_factory=list)
    recommendations: Optional[List[str]] = Field(default_factory=list)


class StrategyIntelligence(BaseModel):
    """Intelligence extracted from Strategy Agent conversations"""

    # Strategic Analysis
    vision_statement: Optional[str] = None
    mission_statement: Optional[str] = None
    strategic_goals: Optional[List[StrategicGoal]] = Field(default_factory=list)
    okrs: Optional[List[OKR]] = Field(default_factory=list)

    # SWOT Analysis
    strengths: Optional[List[str]] = Field(default_factory=list)
    weaknesses: Optional[List[str]] = Field(default_factory=list)
    opportunities: Optional[List[str]] = Field(default_factory=list)
    threats: Optional[List[str]] = Field(default_factory=list)

    # Competitive Analysis
    competitive_advantages: Optional[List[str]] = Field(default_factory=list)
    competitive_disadvantages: Optional[List[str]] = Field(default_factory=list)
    market_position: Optional[str] = None
    differentiation_strategy: Optional[str] = None

    # Market Analysis
    market_size: Optional[str] = None
    market_growth_rate: Optional[str] = None
    market_trends: Optional[List[str]] = Field(default_factory=list)
    target_segments: Optional[List[TargetSegment]] = Field(default_factory=list)

    # Strategic Initiatives
    strategic_initiatives: Optional[List[StrategicInitiative]] = Field(default_factory=list)
    priority_matrix: Optional[PriorityMatrix] = None
    growth_strategies: Optional[List[str]] = Field(default_factory=list)

    # Framework Results
    frameworks_applied: Optional[List[StrategicFramework]] = Field(default_factory=list)
    framework_insights: Optional[List[FrameworkInsight]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 2. PERSONA AGENT INTELLIGENCE
# ============================================

# Nested models for PersonaIntelligence
class BuyerPersona(BaseModel):
    """Detailed buyer persona profile"""
    name: Optional[str] = None
    title: Optional[str] = None
    age_range: Optional[str] = None
    income_range: Optional[str] = None
    education: Optional[str] = None
    goals: Optional[List[str]] = Field(default_factory=list)
    challenges: Optional[List[str]] = Field(default_factory=list)
    values: Optional[List[str]] = Field(default_factory=list)
    behaviors: Optional[List[str]] = Field(default_factory=list)


class PainPoint(BaseModel):
    """Customer pain point"""
    pain: Optional[str] = None
    severity: Optional[str] = None
    frequency: Optional[str] = None
    impact: Optional[str] = None


class DecisionMaker(BaseModel):
    """Decision maker in buying process"""
    role: Optional[str] = None
    title: Optional[str] = None
    influence_level: Optional[str] = None
    concerns: Optional[List[str]] = Field(default_factory=list)


class JourneyStage(BaseModel):
    """Customer journey stage details"""
    activities: Optional[List[str]] = Field(default_factory=list)
    content_needs: Optional[List[str]] = Field(default_factory=list)
    touchpoints: Optional[List[str]] = Field(default_factory=list)
    emotions: Optional[List[str]] = Field(default_factory=list)


class CustomerSegment(BaseModel):
    """Customer segment profile"""
    name: Optional[str] = None
    description: Optional[str] = None
    size: Optional[str] = None
    characteristics: Optional[List[str]] = Field(default_factory=list)
    value: Optional[str] = None


class PersonaIntelligence(BaseModel):
    """Intelligence extracted from Persona Agent conversations"""

    # Buyer Personas
    personas: Optional[List[BuyerPersona]] = Field(
        default_factory=list,
        description="Detailed buyer personas with demographics, psychographics, behaviors"
    )

    # Customer Insights
    pain_points: Optional[List[PainPoint]] = Field(default_factory=list)
    jobs_to_be_done: Optional[List[str]] = Field(default_factory=list)
    desired_outcomes: Optional[List[str]] = Field(default_factory=list)

    # Buying Behavior
    buying_triggers: Optional[List[str]] = Field(default_factory=list)
    decision_criteria: Optional[List[str]] = Field(default_factory=list)
    objections: Optional[List[str]] = Field(default_factory=list)
    decision_makers: Optional[List[DecisionMaker]] = Field(default_factory=list)
    influencers: Optional[List[DecisionMaker]] = Field(default_factory=list)  # Same structure

    # Customer Journey
    awareness_stage: Optional[JourneyStage] = None
    consideration_stage: Optional[JourneyStage] = None
    decision_stage: Optional[JourneyStage] = None
    retention_stage: Optional[JourneyStage] = None
    advocacy_stage: Optional[JourneyStage] = None

    # Segmentation
    demographic_segments: Optional[List[CustomerSegment]] = Field(default_factory=list)
    psychographic_segments: Optional[List[CustomerSegment]] = Field(default_factory=list)
    behavioral_segments: Optional[List[CustomerSegment]] = Field(default_factory=list)

    # Communication Preferences
    preferred_channels: Optional[List[str]] = Field(default_factory=list)
    content_preferences: Optional[List[str]] = Field(default_factory=list)
    messaging_tone: Optional[str] = None

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 3. CONTENT AGENT INTELLIGENCE
# ============================================

# Nested models for ContentIntelligence
class BrandVoice(BaseModel):
    """Brand voice characteristics"""
    tone: Optional[str] = None
    personality_traits: Optional[List[str]] = Field(default_factory=list)
    do_use: Optional[List[str]] = Field(default_factory=list)
    dont_use: Optional[List[str]] = Field(default_factory=list)


class ContentPerformance(BaseModel):
    """Content performance metrics"""
    title: Optional[str] = None
    content_type: Optional[str] = None
    views: Optional[int] = None
    engagement_rate: Optional[float] = None
    key_takeaways: Optional[List[str]] = Field(default_factory=list)


class EngagementMetrics(BaseModel):
    """Content engagement metrics"""
    average_time_on_page: Optional[str] = None
    bounce_rate: Optional[float] = None
    social_shares: Optional[int] = None
    comments: Optional[int] = None


class ContentIdea(BaseModel):
    """Content idea or concept"""
    title: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = None
    goals: Optional[List[str]] = Field(default_factory=list)
    keywords: Optional[List[str]] = Field(default_factory=list)


class ContentCluster(BaseModel):
    """SEO content cluster"""
    pillar_topic: Optional[str] = None
    cluster_topics: Optional[List[str]] = Field(default_factory=list)
    target_keywords: Optional[List[str]] = Field(default_factory=list)


class ContentCalendarEntry(BaseModel):
    """Content calendar entry"""
    title: Optional[str] = None
    content_type: Optional[str] = None
    publish_date: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None


class SeasonalContent(BaseModel):
    """Seasonal content idea"""
    title: Optional[str] = None
    season_or_event: Optional[str] = None
    timing: Optional[str] = None
    content_angle: Optional[str] = None


class ContentIntelligence(BaseModel):
    """Intelligence extracted from Content Agent conversations"""

    # Content Strategy
    content_pillars: Optional[List[str]] = Field(default_factory=list)
    content_themes: Optional[List[str]] = Field(default_factory=list)
    brand_voice: Optional[BrandVoice] = None
    tone_guidelines: Optional[List[str]] = Field(default_factory=list)

    # Content Performance
    top_performing_content: Optional[List[ContentPerformance]] = Field(default_factory=list)
    content_gaps: Optional[List[str]] = Field(default_factory=list)
    engagement_metrics: Optional[EngagementMetrics] = None

    # Content Types
    blog_topics: Optional[List[ContentIdea]] = Field(default_factory=list)
    social_media_posts: Optional[List[ContentIdea]] = Field(default_factory=list)
    email_campaigns: Optional[List[ContentIdea]] = Field(default_factory=list)
    video_concepts: Optional[List[ContentIdea]] = Field(default_factory=list)

    # SEO & Keywords
    target_keywords: Optional[List[str]] = Field(default_factory=list)
    long_tail_keywords: Optional[List[str]] = Field(default_factory=list)
    content_clusters: Optional[List[ContentCluster]] = Field(default_factory=list)

    # Content Calendar
    content_calendar: Optional[List[ContentCalendarEntry]] = Field(default_factory=list)
    publishing_frequency: Optional[Dict[str, str]] = Field(default_factory=dict)
    seasonal_content: Optional[List[SeasonalContent]] = Field(default_factory=list)

    # Messaging
    value_propositions: Optional[List[str]] = Field(default_factory=list)
    key_messages: Optional[List[str]] = Field(default_factory=list)
    calls_to_action: Optional[List[str]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 4. ANALYTICS AGENT INTELLIGENCE
# ============================================

# Nested models for AnalyticsIntelligence
class KPI(BaseModel):
    """Key Performance Indicator"""
    name: Optional[str] = None
    current_value: Optional[str] = None
    target_value: Optional[str] = None
    trend: Optional[str] = None
    period: Optional[str] = None


class TrafficSource(BaseModel):
    """Traffic source metrics"""
    source: Optional[str] = None
    sessions: Optional[int] = None
    percentage: Optional[float] = None
    conversion_rate: Optional[float] = None


class PageMetrics(BaseModel):
    """Page performance metrics"""
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    views: Optional[int] = None
    avg_time_on_page: Optional[str] = None
    bounce_rate: Optional[float] = None


class EngagementPattern(BaseModel):
    """User engagement pattern"""
    pattern_type: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    user_segment: Optional[str] = None


class CampaignMetrics(BaseModel):
    """Campaign performance metrics"""
    campaign_name: Optional[str] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    cost: Optional[float] = None
    roi: Optional[float] = None


class CohortData(BaseModel):
    """Cohort analysis data"""
    cohort_name: Optional[str] = None
    cohort_size: Optional[int] = None
    retention_rate: Optional[float] = None
    period: Optional[str] = None


class AnalyticsIntelligence(BaseModel):
    """Intelligence extracted from Analytics Agent conversations"""

    # Key Metrics
    kpis: Optional[List[KPI]] = Field(default_factory=list)
    conversion_rates: Optional[Dict[str, float]] = Field(default_factory=dict)
    customer_acquisition_cost: Optional[str] = None
    lifetime_value: Optional[str] = None

    # Traffic Analysis
    traffic_sources: Optional[List[TrafficSource]] = Field(default_factory=list)
    top_pages: Optional[List[PageMetrics]] = Field(default_factory=list)
    bounce_rates: Optional[Dict[str, float]] = Field(default_factory=dict)
    session_metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # User Behavior
    user_flow: Optional[Dict[str, Any]] = Field(default_factory=dict)
    engagement_patterns: Optional[List[EngagementPattern]] = Field(default_factory=list)
    drop_off_points: Optional[List[str]] = Field(default_factory=list)

    # Campaign Performance
    campaign_metrics: Optional[List[CampaignMetrics]] = Field(default_factory=list)
    channel_performance: Optional[Dict[str, Any]] = Field(default_factory=dict)
    attribution_analysis: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Insights & Recommendations
    performance_trends: Optional[List[str]] = Field(default_factory=list)
    optimization_opportunities: Optional[List[str]] = Field(default_factory=list)
    predictive_insights: Optional[List[str]] = Field(default_factory=list)

    # Cohort Analysis
    cohort_data: Optional[List[CohortData]] = Field(default_factory=list)
    retention_curves: Optional[Dict[str, Any]] = Field(default_factory=dict)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 5. ROI & BUDGET AGENT INTELLIGENCE
# ============================================

# Nested models for ROIBudgetIntelligence
class CampaignROI(BaseModel):
    """Campaign ROI metrics"""
    campaign_name: Optional[str] = None
    investment: Optional[float] = None
    revenue: Optional[float] = None
    roi_percentage: Optional[float] = None
    payback_period: Optional[str] = None


class RevenueForcast(BaseModel):
    """Revenue forecast"""
    period: Optional[str] = None
    projected_revenue: Optional[float] = None
    confidence_level: Optional[str] = None
    assumptions: Optional[List[str]] = Field(default_factory=list)


class InvestmentRecommendation(BaseModel):
    """Investment recommendation"""
    area: Optional[str] = None
    recommended_amount: Optional[float] = None
    expected_roi: Optional[float] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None


class ROIBudgetIntelligence(BaseModel):
    """Intelligence extracted from ROI & Budget Agent conversations"""

    # Budget Information
    total_marketing_budget: Optional[str] = None
    budget_allocation: Optional[Dict[str, Any]] = Field(default_factory=dict)
    budget_constraints: Optional[List[str]] = Field(default_factory=list)
    budget_timeline: Optional[str] = None

    # ROI Metrics
    overall_roi: Optional[float] = None
    channel_roi: Optional[Dict[str, float]] = Field(default_factory=dict)
    campaign_roi: Optional[List[CampaignROI]] = Field(default_factory=list)
    roi_targets: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Cost Analysis
    cost_breakdown: Optional[Dict[str, Any]] = Field(default_factory=dict)
    cost_per_acquisition: Optional[Dict[str, str]] = Field(default_factory=dict)
    cost_optimization_opportunities: Optional[List[str]] = Field(default_factory=list)

    # Revenue Impact
    revenue_attribution: Optional[Dict[str, Any]] = Field(default_factory=dict)
    revenue_forecast: Optional[List[RevenueForcast]] = Field(default_factory=list)
    break_even_analysis: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Investment Recommendations
    recommended_investments: Optional[List[InvestmentRecommendation]] = Field(default_factory=list)
    budget_reallocation_suggestions: Optional[List[str]] = Field(default_factory=list)
    scaling_opportunities: Optional[List[str]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 6. CAMPAIGN EXECUTION AGENT INTELLIGENCE
# ============================================

# Nested models for CampaignExecutionIntelligence
class CampaignDetail(BaseModel):
    """Active campaign details"""
    campaign_name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    channels: Optional[List[str]] = Field(default_factory=list)


class CampaignTimeline(BaseModel):
    """Campaign timeline milestone"""
    milestone: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None
    deliverables: Optional[List[str]] = Field(default_factory=list)


class CreativeAsset(BaseModel):
    """Creative asset details"""
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    status: Optional[str] = None
    channels: Optional[List[str]] = Field(default_factory=list)


class MessagingVariant(BaseModel):
    """Messaging variant for testing"""
    variant_name: Optional[str] = None
    message: Optional[str] = None
    target_audience: Optional[str] = None
    channel: Optional[str] = None


class ABTest(BaseModel):
    """A/B test configuration"""
    test_name: Optional[str] = None
    hypothesis: Optional[str] = None
    variants: Optional[List[str]] = Field(default_factory=list)
    success_metric: Optional[str] = None
    status: Optional[str] = None


class AutomationRule(BaseModel):
    """Marketing automation rule"""
    rule_name: Optional[str] = None
    trigger: Optional[str] = None
    action: Optional[str] = None
    conditions: Optional[List[str]] = Field(default_factory=list)


class NurtureSequence(BaseModel):
    """Email nurture sequence"""
    sequence_name: Optional[str] = None
    emails: Optional[List[str]] = Field(default_factory=list)
    trigger: Optional[str] = None
    duration: Optional[str] = None


class CampaignExecutionIntelligence(BaseModel):
    """Intelligence extracted from Campaign Execution Agent conversations"""

    # Campaign Details
    active_campaigns: Optional[List[CampaignDetail]] = Field(default_factory=list)
    campaign_objectives: Optional[List[str]] = Field(default_factory=list)
    campaign_timelines: Optional[List[CampaignTimeline]] = Field(default_factory=list)

    # Channel Strategy
    channel_mix: Optional[Dict[str, Any]] = Field(default_factory=dict)
    channel_tactics: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    cross_channel_synergies: Optional[List[str]] = Field(default_factory=list)

    # Execution Details
    creative_assets: Optional[List[CreativeAsset]] = Field(default_factory=list)
    messaging_variants: Optional[List[MessagingVariant]] = Field(default_factory=list)
    targeting_parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # A/B Testing
    ab_tests: Optional[List[ABTest]] = Field(default_factory=list)
    test_results: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    winning_variants: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    # Automation & Workflows
    automation_rules: Optional[List[AutomationRule]] = Field(default_factory=list)
    workflow_triggers: Optional[List[str]] = Field(default_factory=list)
    nurture_sequences: Optional[List[NurtureSequence]] = Field(default_factory=list)

    # Performance Tracking
    campaign_kpis: Optional[Dict[str, Any]] = Field(default_factory=dict)
    real_time_metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)
    optimization_actions: Optional[List[str]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 7. QUICK WINS AGENT INTELLIGENCE
# ============================================

# Nested models for QuickWinsIntelligence
class QuickWin(BaseModel):
    """Quick win opportunity"""
    title: Optional[str] = None
    description: Optional[str] = None
    impact: Optional[str] = None
    effort: Optional[str] = None
    timeline: Optional[str] = None
    expected_results: Optional[List[str]] = Field(default_factory=list)


class QuickWinsIntelligence(BaseModel):
    """Intelligence extracted from Quick Wins Agent conversations"""

    # Immediate Opportunities
    quick_wins: Optional[List[QuickWin]] = Field(
        default_factory=list,
        description="List of quick wins with impact, effort, and timeline"
    )

    # Low-Hanging Fruit
    easy_improvements: Optional[List[str]] = Field(default_factory=list)
    quick_fixes: Optional[List[str]] = Field(default_factory=list)
    instant_optimizations: Optional[List[str]] = Field(default_factory=list)

    # Priority Matrix
    high_impact_low_effort: Optional[List[QuickWin]] = Field(default_factory=list)
    high_impact_medium_effort: Optional[List[QuickWin]] = Field(default_factory=list)

    # Implementation Timeline
    week_1_actions: Optional[List[str]] = Field(default_factory=list)
    month_1_actions: Optional[List[str]] = Field(default_factory=list)
    quarter_1_actions: Optional[List[str]] = Field(default_factory=list)

    # Expected Impact
    expected_improvements: Optional[Dict[str, str]] = Field(default_factory=dict)
    risk_assessment: Optional[List[str]] = Field(default_factory=list)
    success_metrics: Optional[List[str]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 8. COMPETITIVE INTELLIGENCE AGENT
# ============================================

# Nested models for CompetitiveIntelligence
class Competitor(BaseModel):
    """Competitor profile"""
    name: Optional[str] = None
    type: Optional[str] = None  # direct or indirect
    market_position: Optional[str] = None
    strengths: Optional[List[str]] = Field(default_factory=list)
    weaknesses: Optional[List[str]] = Field(default_factory=list)
    estimated_market_share: Optional[str] = None


class CompetitorCampaign(BaseModel):
    """Competitor campaign"""
    campaign_name: Optional[str] = None
    competitor: Optional[str] = None
    channels: Optional[List[str]] = Field(default_factory=list)
    messaging: Optional[str] = None
    effectiveness: Optional[str] = None


class CompetitiveIntelligence(BaseModel):
    """Intelligence extracted from Competitive Intelligence Agent conversations"""

    # Competitor Analysis
    direct_competitors: Optional[List[Competitor]] = Field(default_factory=list)
    indirect_competitors: Optional[List[Competitor]] = Field(default_factory=list)
    competitor_strengths: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    competitor_weaknesses: Optional[Dict[str, List[str]]] = Field(default_factory=dict)

    # Market Positioning
    positioning_map: Optional[Dict[str, Any]] = Field(default_factory=dict)
    competitive_gaps: Optional[List[str]] = Field(default_factory=list)
    differentiation_opportunities: Optional[List[str]] = Field(default_factory=list)

    # Competitive Strategy
    competitor_strategies: Optional[Dict[str, str]] = Field(default_factory=dict)
    competitor_tactics: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    counter_strategies: Optional[List[str]] = Field(default_factory=list)

    # Pricing Analysis
    competitor_pricing: Optional[Dict[str, Any]] = Field(default_factory=dict)
    pricing_strategies: Optional[Dict[str, str]] = Field(default_factory=dict)
    value_comparison: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Marketing Analysis
    competitor_messaging: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    competitor_channels: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    competitor_campaigns: Optional[List[CompetitorCampaign]] = Field(default_factory=list)

    # Threat Assessment
    competitive_threats: Optional[List[str]] = Field(default_factory=list)
    market_share_analysis: Optional[Dict[str, Any]] = Field(default_factory=dict)
    competitive_advantages: Optional[List[str]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# 9. CLIENT SUCCESS AGENT INTELLIGENCE
# ============================================

# Nested models for ClientSuccessIntelligence
class CustomerFeedback(BaseModel):
    """Customer feedback"""
    feedback_type: Optional[str] = None
    feedback: Optional[str] = None
    sentiment: Optional[str] = None
    date: Optional[str] = None
    action_taken: Optional[str] = None


class OpportunityDetail(BaseModel):
    """Upsell/cross-sell opportunity"""
    opportunity_type: Optional[str] = None
    product_or_service: Optional[str] = None
    estimated_value: Optional[float] = None
    likelihood: Optional[str] = None
    next_steps: Optional[List[str]] = Field(default_factory=list)


class Milestone(BaseModel):
    """Success milestone"""
    milestone_name: Optional[str] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None


class SupportTicket(BaseModel):
    """Support ticket summary"""
    ticket_id: Optional[str] = None
    issue_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    resolution_time: Optional[str] = None


class ClientSuccessIntelligence(BaseModel):
    """Intelligence extracted from Client Success Agent conversations"""

    # Client Health
    client_health_score: Optional[float] = None
    health_indicators: Optional[Dict[str, Any]] = Field(default_factory=dict)
    risk_factors: Optional[List[str]] = Field(default_factory=list)

    # Satisfaction Metrics
    satisfaction_score: Optional[float] = None
    nps_score: Optional[float] = None
    customer_feedback: Optional[List[CustomerFeedback]] = Field(default_factory=list)

    # Retention & Churn
    retention_rate: Optional[float] = None
    churn_risk: Optional[Dict[str, Any]] = Field(default_factory=dict)
    retention_strategies: Optional[List[str]] = Field(default_factory=list)
    win_back_opportunities: Optional[List[OpportunityDetail]] = Field(default_factory=list)

    # Upsell & Cross-sell
    upsell_opportunities: Optional[List[OpportunityDetail]] = Field(default_factory=list)
    cross_sell_opportunities: Optional[List[OpportunityDetail]] = Field(default_factory=list)
    expansion_potential: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Success Milestones
    achieved_milestones: Optional[List[str]] = Field(default_factory=list)
    upcoming_milestones: Optional[List[Milestone]] = Field(default_factory=list)
    success_metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)

    # Engagement & Support
    engagement_level: Optional[str] = None
    support_tickets: Optional[List[SupportTicket]] = Field(default_factory=list)
    feature_requests: Optional[List[str]] = Field(default_factory=list)
    training_needs: Optional[List[str]] = Field(default_factory=list)

    confidence_score: float = 0.0
    extraction_date: Optional[datetime] = None


# ============================================
# UNIFIED INTELLIGENCE RESPONSE
# ============================================

class UnifiedIntelligence(BaseModel):
    """Unified intelligence combining insights from all agents"""
    
    # Core Business Context (from Phase 1)
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    geography: Optional[List[str]] = Field(default_factory=list)
    
    # Agent-Specific Intelligence
    strategy: Optional[StrategyIntelligence] = None
    personas: Optional[PersonaIntelligence] = None
    content: Optional[ContentIntelligence] = None
    analytics: Optional[AnalyticsIntelligence] = None
    roi_budget: Optional[ROIBudgetIntelligence] = None
    campaign_planning: Optional[CampaignExecutionIntelligence] = None
    quick_wins: Optional[QuickWinsIntelligence] = None
    competitive: Optional[CompetitiveIntelligence] = None
    client_success: Optional[ClientSuccessIntelligence] = None
    
    # Meta Information
    last_updated: Optional[datetime] = None
    completeness_score: Optional[float] = None
    data_quality_score: Optional[float] = None


# ============================================
# INTELLIGENCE TYPE ENUM
# ============================================

class IntelligenceType(str, Enum):
    """Types of intelligence that can be extracted"""
    BUSINESS_CONTEXT = "business_context"
    STRATEGY = "strategy"
    PERSONA = "persona"
    CONTENT = "content"
    ANALYTICS = "analytics"
    ROI_BUDGET = "roi_budget"
    CAMPAIGN_EXECUTION = "campaign_planning"
    QUICK_WINS = "quick_wins"
    COMPETITIVE = "competitive"
    CLIENT_SUCCESS = "client_success"


# Agent to Intelligence Type Mapping
AGENT_INTELLIGENCE_MAP = {
    "strategy": IntelligenceType.STRATEGY,
    "persona": IntelligenceType.PERSONA,
    "content": IntelligenceType.CONTENT,
    "analytics": IntelligenceType.ANALYTICS,
    "roi_budget": IntelligenceType.ROI_BUDGET,
    "campaign_planning": IntelligenceType.CAMPAIGN_EXECUTION,
    "quick_wins": IntelligenceType.QUICK_WINS,
    "competitive_intelligence": IntelligenceType.COMPETITIVE,
    "client_success": IntelligenceType.CLIENT_SUCCESS,
}