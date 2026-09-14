"""
Pydantic response schemas for structured agent outputs
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class AnalysisType(str, Enum):
    SWOT = "swot"
    PORTERS_FIVE_FORCES = "porters_five_forces"
    VALUE_CHAIN = "value_chain"
    CUSTOMER_JOURNEY = "customer_journey"
    BUSINESS_MODEL_CANVAS = "business_model_canvas"

class RecommendationPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Recommendation(BaseModel):
    """A structured recommendation with priority and reasoning"""
    action: str = Field(description="The recommended action to take")
    priority: RecommendationPriority = Field(description="Priority level of this recommendation")
    reasoning: str = Field(description="Why this recommendation is important")
    timeline: str = Field(description="Suggested timeline for implementation")

class StrategyAnalysisResponse(BaseModel):
    """Structured response for strategy agent business analysis"""
    analysis_summary: str = Field(description="Brief summary of the business situation")
    key_challenges: List[str] = Field(description="List of identified challenges")
    opportunities: List[str] = Field(description="List of identified opportunities")
    recommendations: List[Recommendation] = Field(
        description="List of structured recommendations with priority and reasoning"
    )
    suggested_frameworks: List[AnalysisType] = Field(
        description="Recommended frameworks for deeper analysis"
    )
    next_steps: List[str] = Field(description="Actionable next steps")
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in analysis (0.0 to 1.0)"
    )

class DemographicInfo(BaseModel):
    """Demographic characteristics of a persona"""
    age_range: str = Field(description="Age range of the persona")
    location: str = Field(description="Geographic location")
    income_level: str = Field(description="Income level or range")
    education: str = Field(description="Education level")
    job_title: str = Field(description="Job title or role")

class PsychographicInfo(BaseModel):
    """Psychological characteristics of a persona"""
    values: List[str] = Field(description="Core values and beliefs")
    interests: List[str] = Field(description="Personal interests and hobbies")
    lifestyle: str = Field(description="Lifestyle description")
    personality_traits: List[str] = Field(description="Key personality traits")

class BuyingStage(BaseModel):
    """A stage in the buying journey"""
    stage_name: str = Field(description="Name of the buying stage")
    description: str = Field(description="What happens in this stage")
    key_concerns: List[str] = Field(description="Main concerns at this stage")

class PersonaInsightResponse(BaseModel):
    """Structured response for persona agent customer insights"""
    persona_name: str = Field(description="Name/title of the persona")
    demographics: DemographicInfo = Field(description="Demographic characteristics")
    psychographics: PsychographicInfo = Field(description="Psychological characteristics")
    pain_points: List[str] = Field(description="Key pain points and challenges")
    motivations: List[str] = Field(description="Primary motivations and goals")
    communication_preferences: List[str] = Field(description="Preferred communication channels")
    buying_journey_stages: List[BuyingStage] = Field(
        description="Stages in their buying journey with descriptions"
    )
    recommended_messaging: str = Field(description="Suggested messaging approach")
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in persona analysis (0.0 to 1.0)"
    )

class ContentFormat(BaseModel):
    """A recommended content format"""
    format_type: str = Field(description="Type of content format (blog, video, etc.)")
    rationale: str = Field(description="Why this format is recommended")
    effort_level: str = Field(description="Effort level required (low, medium, high)")

class PublishingSchedule(BaseModel):
    """Publishing frequency and timing recommendations"""
    frequency: str = Field(description="How often to publish")
    best_times: List[str] = Field(description="Optimal publishing times")
    consistency_notes: str = Field(description="Notes about maintaining consistency")

class DistributionChannel(BaseModel):
    """A recommended distribution channel"""
    channel_name: str = Field(description="Name of the distribution channel")
    targeting_details: str = Field(description="How to target on this channel")
    expected_reach: str = Field(description="Expected reach or engagement")

class ContentCalendarItem(BaseModel):
    """An item in the content calendar"""
    content_type: str = Field(description="Type of content")
    topic: str = Field(description="Content topic or theme")
    timeline: str = Field(description="When to create/publish")

class ContentStrategyResponse(BaseModel):
    """Structured response for content agent recommendations"""
    content_themes: List[str] = Field(description="Primary content themes")
    content_formats: List[ContentFormat] = Field(
        description="Recommended content formats with rationale"
    )
    publishing_schedule: PublishingSchedule = Field(
        description="Suggested publishing frequency and timing"
    )
    distribution_channels: List[DistributionChannel] = Field(
        description="Recommended channels with targeting details"
    )
    content_calendar_outline: List[ContentCalendarItem] = Field(
        description="High-level content calendar suggestions"
    )
    success_metrics: List[str] = Field(description="KPIs to track content performance")
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in content strategy (0.0 to 1.0)"
    )

class AnalyticsMetric(BaseModel):
    """A key performance metric"""
    metric_name: str = Field(description="Name of the metric")
    current_value: str = Field(description="Current value or trend")
    benchmark: str = Field(description="Benchmark or target value")
    importance: str = Field(description="Why this metric is important")

class AnalyticsAnomaly(BaseModel):
    """A detected data anomaly"""
    anomaly_type: str = Field(description="Type of anomaly detected")
    description: str = Field(description="Description of the anomaly")
    impact_level: str = Field(description="Impact level (low, medium, high)")
    suggested_action: str = Field(description="Recommended action to take")

class AnalyticsRecommendation(BaseModel):
    """A data-driven recommendation"""
    recommendation: str = Field(description="The recommended action")
    expected_impact: str = Field(description="Expected impact of implementing")
    implementation_effort: str = Field(description="Effort required (low, medium, high)")
    priority: str = Field(description="Priority level")

class AnalyticsInsightResponse(BaseModel):
    """Structured response for analytics agent data insights"""
    key_metrics: List[AnalyticsMetric] = Field(description="Important metrics to track")
    data_patterns: List[str] = Field(description="Identified patterns in the data")
    anomalies: List[AnalyticsAnomaly] = Field(description="Detected anomalies or outliers")
    insights: List[str] = Field(description="Actionable insights from analysis")
    recommendations: List[AnalyticsRecommendation] = Field(
        description="Data-driven recommendations"
    )
    visualization_suggestions: List[str] = Field(
        description="Suggested chart types and dashboards"
    )
    data_quality_notes: Optional[str] = Field(
        default=None, description="Notes about data quality or limitations"
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in data analysis (0.0 to 1.0)"
    )

class ChannelROI(BaseModel):
    """ROI details for a specific marketing channel"""
    channel_name: str = Field(description="Name of the marketing channel")
    spend: float = Field(description="Amount spent on this channel")
    revenue: float = Field(description="Revenue generated from this channel")
    roi_percentage: float = Field(description="ROI percentage for this channel")
    conversions: int = Field(description="Number of conversions from this channel")
    
class BudgetAllocation(BaseModel):
    """Budget allocation recommendation"""
    channel: str = Field(description="Marketing channel name")
    current_budget: float = Field(description="Current budget allocation")
    recommended_budget: float = Field(description="Recommended budget allocation")
    expected_roi_change: float = Field(description="Expected ROI change percentage")

class ROIInsightResponse(BaseModel):
    """Structured response for ROI & Budget agent"""
    roi_by_channel: List[ChannelROI] = Field(description="ROI analysis for each channel")
    budget_allocations: List[BudgetAllocation] = Field(description="Budget allocation recommendations")
    executive_summary: str = Field(description="C-suite ready summary of findings")
    total_roi: float = Field(description="Overall ROI across all channels")
    optimization_opportunities: List[str] = Field(description="Key optimization opportunities")
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in analysis (0.0 to 1.0)"
    )

class ChannelDeployment(BaseModel):
    """Deployment details for a specific channel"""
    channel: str = Field(description="Marketing channel name")
    status: str = Field(description="Deployment status")
    budget_used: float = Field(description="Budget used for this channel")
    reach: int = Field(description="Estimated reach")
    
class ABTestResult(BaseModel):
    """A/B test result details"""
    variant: str = Field(description="Test variant name")
    conversion_rate: float = Field(description="Conversion rate percentage")
    sample_size: int = Field(description="Number of users in test")
    confidence_level: float = Field(description="Statistical confidence level")

class CampaignExecutionResponse(BaseModel):
    """Structured response for Campaign Execution agent"""
    campaign_name: str = Field(description="Name of the campaign")
    status: str = Field(description="Status of the campaign (e.g., deployed, scheduled, failed)")
    channel_deployments: List[ChannelDeployment] = Field(description="Deployment details by channel")
    ab_test_results: Optional[List[ABTestResult]] = Field(description="Results of A/B tests")
    optimization_suggestions: List[str] = Field(description="Suggestions for optimizing the campaign")
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in analysis (0.0 to 1.0)"
    )

class CompetitorInfo(BaseModel):
    """Information about a competitor"""
    name: str = Field(description="Competitor name")
    strengths: List[str] = Field(description="Competitor strengths")
    weaknesses: List[str] = Field(description="Competitor weaknesses")
    market_share: Optional[float] = Field(description="Estimated market share percentage")

class CompetitiveIntelligenceResponse(BaseModel):
    """Structured response for Competitive Intelligence agent"""
    competitors: List[CompetitorInfo] = Field(description="Analysis of key competitors")
    market_trends: List[str] = Field(description="Key market trends and shifts")
    content_gaps: List[str] = Field(description="Content gaps in the market")
    strategic_opportunities: List[str] = Field(description="Strategic opportunities to exploit")
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in analysis (0.0 to 1.0)"
    )

class ClientReport(BaseModel):
    """Automated client report details"""
    period: str = Field(description="Report period (e.g., monthly, quarterly)")
    key_metrics: List[str] = Field(description="Key performance metrics")
    achievements: List[str] = Field(description="Notable achievements")
    recommendations: List[str] = Field(description="Recommendations for improvement")

class ClientSuccessResponse(BaseModel):
    """Structured response for Client Success agent"""
    client_name: str = Field(description="Name of the client")
    health_score: float = Field(description="Client health score (0.0 to 1.0)")
    upsell_opportunities: List[str] = Field(description="Upsell opportunities for the client")
    churn_risk: str = Field(description="Churn risk level (low, medium, high)")
    automated_report: ClientReport = Field(description="Automated client report")
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in analysis (0.0 to 1.0)"
    )

class QuickWin(BaseModel):
    """A single quick win opportunity"""
    opportunity: str = Field(description="Description of the quick win opportunity")
    impact: str = Field(description="Expected impact of the quick win")
    effort: str = Field(description="Effort required to implement the quick win")
    recommendation: str = Field(description="Recommendation for implementing the quick win")

class QuickWinsResponse(BaseModel):
    """Structured response for Quick Wins agent"""
    quick_wins: List[QuickWin] = Field(description="List of quick win opportunities")
    confidence_score: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in analysis (0.0 to 1.0)"
    )
