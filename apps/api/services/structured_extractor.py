"""
Structured Extraction Service for Agent Outputs
Enhanced auto-save with systematic data extraction across all 10 agents.

This service extracts structured data from agent responses and stores it in the
unified agent_outputs table's content JSONB field for enhanced analytics and UX.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from google import genai

from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)

# ============================================================================
# EXTRACTION SCHEMAS - Agent-Specific Data Structures
# ============================================================================

class MarketingStrategySchema(BaseModel):
    """Schema for Marketing Strategy Agent structured extraction"""
    campaign_info_json: Optional[str] = Field(
        default=None,
        description="JSON string: {name, budget, timeline, objectives}"
    )
    target_audience_json: Optional[str] = Field(
        default=None,
        description="JSON string: {primary_market, personas, segments, demographics}"
    )
    strategy_components_json: Optional[str] = Field(
        default=None,
        description="JSON string: {value_propositions, key_messages, channel_mix, tactics}"
    )
    objectives_json: Optional[str] = Field(
        default=None,
        description="JSON string: {lead_generation_targets, conversion_goals, kpis}"
    )
    budget_allocation_json: Optional[str] = Field(
        default=None,
        description="JSON string: {channel_budgets, tactic_budgets, total}"
    )

    # Helper properties to parse JSON
    @property
    def campaign_info(self) -> Dict:
        """Parse campaign info from JSON string"""
        if self.campaign_info_json:
            try:
                return json.loads(self.campaign_info_json)
            except:
                return {}
        return {}

    @property
    def target_audience(self) -> Dict:
        """Parse target audience from JSON string"""
        if self.target_audience_json:
            try:
                return json.loads(self.target_audience_json)
            except:
                return {}
        return {}

class StrategySchema(BaseModel):
    """Schema for Strategy Agent structured extraction"""
    analysis_type: Optional[str] = Field(
        default=None,
        description="Type of strategic analysis (SWOT, Porter's Five Forces, etc.)"
    )
    frameworks_used: Optional[List[str]] = Field(
        default_factory=list,
        description="Strategic frameworks applied in analysis"
    )
    business_context_json: Optional[str] = Field(
        default=None,
        description="JSON string: {company_info, industry, stage, competitive_landscape}"
    )
    strategic_insights_json: Optional[str] = Field(
        default=None,
        description="JSON string: {strengths, weaknesses, opportunities, threats, recommendations}"
    )
    action_items_json: Optional[str] = Field(
        default=None,
        description="JSON string array: [{item, priority, timeline}, ...]"
    )

    # Helper properties
    @property
    def business_context(self) -> Dict:
        """Parse business context from JSON string"""
        if self.business_context_json:
            try:
                return json.loads(self.business_context_json)
            except:
                return {}
        return {}

    @property
    def strategic_insights(self) -> Dict:
        """Parse strategic insights from JSON string"""
        if self.strategic_insights_json:
            try:
                return json.loads(self.strategic_insights_json)
            except:
                return {}
        return {}

    @property
    def action_items(self) -> List:
        """Parse action items from JSON string"""
        if self.action_items_json:
            try:
                return json.loads(self.action_items_json)
            except:
                return []
        return []

# Content nested models
class ContentDetails(BaseModel):
    title: Optional[str] = None
    word_count: Optional[str] = None
    target_audience: Optional[str] = None
    call_to_action: Optional[str] = None

class SEOElements(BaseModel):
    keywords: Optional[str] = None
    meta_description: Optional[str] = None
    content_optimization: Optional[str] = None

class ContentCalendar(BaseModel):
    publication_schedule: Optional[str] = None
    channel: Optional[str] = None
    campaign_alignment: Optional[str] = None

class ContentSchema(BaseModel):
    """Schema for Content Agent structured extraction"""
    content_type: Optional[str] = Field(
        default=None,
        description="Type of content generated (blog_post, email, social, etc.)"
    )
    content_details: Optional[ContentDetails] = Field(
        default_factory=ContentDetails,
        description="Title, word count, target audience, CTA"
    )
    seo_elements: Optional[SEOElements] = Field(
        default_factory=SEOElements,
        description="Keywords, meta description, content optimization"
    )
    content_calendar: Optional[ContentCalendar] = Field(
        default_factory=ContentCalendar,
        description="Publication schedule, channel, campaign alignment"
    )

# Persona nested models
class PersonaDetails(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    demographics: Optional[str] = None
    company_details: Optional[str] = None

class BehavioralData(BaseModel):
    goals: Optional[str] = None
    pain_points: Optional[str] = None
    motivations: Optional[str] = None
    decision_making_process: Optional[str] = None

class EngagementPreferences(BaseModel):
    communication_channels: Optional[str] = None
    content_preferences: Optional[str] = None
    timing: Optional[str] = None

class PersonaSchema(BaseModel):
    """Schema for Persona Agent structured extraction"""
    persona_details: Optional[PersonaDetails] = Field(
        default_factory=PersonaDetails,
        description="Name, role, demographics, company details"
    )
    behavioral_data: Optional[BehavioralData] = Field(
        default_factory=BehavioralData,
        description="Goals, pain points, motivations, decision-making process"
    )
    engagement_preferences: Optional[EngagementPreferences] = Field(
        default_factory=EngagementPreferences,
        description="Communication channels, content preferences, timing"
    )

class PerformanceInsights(BaseModel):
    traffic_analysis: Optional[str] = None
    conversion_analysis: Optional[str] = None
    revenue_analysis: Optional[str] = None

class AnalyticsRecommendation(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    expected_impact: Optional[str] = None
    priority: Optional[str] = None

# ROI & Budget nested models
class BudgetAnalysis(BaseModel):
    total_budget: Optional[str] = None
    allocation_breakdown: Optional[str] = None
    optimization_opportunities: Optional[str] = None

class ROICalculations(BaseModel):
    current_roi: Optional[str] = None
    projected_roi: Optional[str] = None
    performance_metrics: Optional[str] = None

class CostStructure(BaseModel):
    cost_per_acquisition: Optional[str] = None
    lifetime_value: Optional[str] = None
    efficiency_metrics: Optional[str] = None

class BudgetRecommendation(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    impact_estimate: Optional[str] = None
    priority: Optional[str] = None

# Campaign Execution nested models
class ExecutionPlan(BaseModel):
    timeline: Optional[str] = None
    tasks: Optional[str] = None
    deliverables: Optional[str] = None
    milestones: Optional[str] = None

class ResourceAllocation(BaseModel):
    team_assignments: Optional[str] = None
    tools_required: Optional[str] = None
    budget_distribution: Optional[str] = None

class ChannelsStrategy(BaseModel):
    deployment_plan: Optional[str] = None
    coordination_approach: Optional[str] = None
    channel_mix: Optional[str] = None

class CampaignSuccessMetrics(BaseModel):
    kpis: Optional[str] = None
    tracking_methods: Optional[str] = None
    success_criteria: Optional[str] = None

# Quick Wins nested models
class QuickWinOpportunity(BaseModel):
    title: Optional[str] = None
    effort_level: Optional[str] = None
    impact_assessment: Optional[str] = None
    timeline: Optional[str] = None

class QuickWinImplementationPlan(BaseModel):
    steps: Optional[str] = None
    resources_needed: Optional[str] = None
    timeline: Optional[str] = None

class QuickWinImpactAssessment(BaseModel):
    expected_impact: Optional[str] = None
    timeline: Optional[str] = None
    resource_requirements: Optional[str] = None

class QuickWinPrioritization(BaseModel):
    priority_rank: Optional[str] = None
    reasoning: Optional[str] = None
    implementation_order: Optional[str] = None

# Competitive Intelligence nested models
class CompetitorAnalysis(BaseModel):
    competitor_profiles: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    strategies: Optional[str] = None

class MarketPositioning(BaseModel):
    market_landscape: Optional[str] = None
    positioning_gaps: Optional[str] = None
    opportunities: Optional[str] = None

class CompetitiveAdvantage(BaseModel):
    advantage_type: Optional[str] = None
    description: Optional[str] = None
    differentiator: Optional[str] = None

class StrategicRecommendation(BaseModel):
    recommendation: Optional[str] = None
    impact: Optional[str] = None
    implementation: Optional[str] = None

# Client Success nested models
class HealthAssessment(BaseModel):
    health_score: Optional[str] = None
    risk_factors: Optional[str] = None
    satisfaction_metrics: Optional[str] = None

class RetentionStrategy(BaseModel):
    retention_tactics: Optional[str] = None
    renewal_strategies: Optional[str] = None
    engagement_plans: Optional[str] = None

class GrowthOpportunity(BaseModel):
    opportunity_type: Optional[str] = None
    description: Optional[str] = None
    potential_value: Optional[str] = None

class ClientSuccessMetrics(BaseModel):
    kpis: Optional[str] = None
    benchmarks: Optional[str] = None
    tracking_methods: Optional[str] = None

class AnalyticsSchema(BaseModel):
    """Schema for Analytics Agent structured extraction"""
    metrics_analyzed: Optional[List[str]] = Field(
        default_factory=list,
        description="KPIs and metrics examined"
    )
    performance_insights: Optional[PerformanceInsights] = Field(
        default_factory=PerformanceInsights,
        description="Key findings, trends, performance gaps"
    )
    recommendations: Optional[List[AnalyticsRecommendation]] = Field(
        default_factory=list,
        description="Data-driven recommendations with impact estimates"
    )

class ROIBudgetSchema(BaseModel):
    """Schema for ROI & Budget Agent structured extraction"""
    budget_analysis: Optional[BudgetAnalysis] = Field(
        default_factory=BudgetAnalysis,
        description="Budget breakdown, allocation, and optimization"
    )
    roi_calculations: Optional[ROICalculations] = Field(
        default_factory=ROICalculations,
        description="ROI metrics, projections, and performance analysis"
    )
    cost_structure: Optional[CostStructure] = Field(
        default_factory=CostStructure,
        description="Cost per acquisition, lifetime value, efficiency metrics"
    )
    budget_recommendations: Optional[List[BudgetRecommendation]] = Field(
        default_factory=list,
        description="Budget optimization suggestions with impact estimates"
    )

class CampaignExecutionSchema(BaseModel):
    """Schema for Campaign Execution Agent structured extraction"""
    execution_plan: Optional[ExecutionPlan] = Field(
        default_factory=ExecutionPlan,
        description="Campaign timeline, tasks, deliverables, milestones"
    )
    resource_allocation: Optional[ResourceAllocation] = Field(
        default_factory=ResourceAllocation,
        description="Team assignments, tools, budget distribution"
    )
    channels_strategy: Optional[ChannelsStrategy] = Field(
        default_factory=ChannelsStrategy,
        description="Multi-channel deployment plan and coordination"
    )
    success_metrics: Optional[CampaignSuccessMetrics] = Field(
        default_factory=CampaignSuccessMetrics,
        description="KPIs, tracking methods, success criteria"
    )

class QuickWinsSchema(BaseModel):
    """Schema for Quick Wins Agent structured extraction"""
    opportunities: Optional[List[QuickWinOpportunity]] = Field(
        default_factory=list,
        description="Quick win opportunities with effort/impact assessment"
    )
    implementation_plan: Optional[QuickWinImplementationPlan] = Field(
        default_factory=QuickWinImplementationPlan,
        description="Step-by-step implementation guide for quick wins"
    )
    impact_assessment: Optional[QuickWinImpactAssessment] = Field(
        default_factory=QuickWinImpactAssessment,
        description="Expected impact, timeline, resource requirements"
    )
    prioritization: Optional[List[QuickWinPrioritization]] = Field(
        default_factory=list,
        description="Prioritized list of quick wins with reasoning"
    )

class CompetitiveIntelligenceSchema(BaseModel):
    """Schema for Competitive Intelligence Agent structured extraction"""
    competitor_analysis: Optional[CompetitorAnalysis] = Field(
        default_factory=CompetitorAnalysis,
        description="Competitor profiles, strengths, weaknesses, strategies"
    )
    market_positioning: Optional[MarketPositioning] = Field(
        default_factory=MarketPositioning,
        description="Market landscape, positioning gaps, opportunities"
    )
    competitive_advantages: Optional[List[CompetitiveAdvantage]] = Field(
        default_factory=list,
        description="Identified competitive advantages and differentiators"
    )
    strategic_recommendations: Optional[List[StrategicRecommendation]] = Field(
        default_factory=list,
        description="Strategic moves to gain competitive advantage"
    )

class ClientSuccessSchema(BaseModel):
    """Schema for Client Success Agent structured extraction"""
    health_assessment: Optional[HealthAssessment] = Field(
        default_factory=HealthAssessment,
        description="Client health scoring, risk factors, satisfaction metrics"
    )
    retention_strategy: Optional[RetentionStrategy] = Field(
        default_factory=RetentionStrategy,
        description="Retention tactics, renewal strategies, engagement plans"
    )
    growth_opportunities: Optional[List[GrowthOpportunity]] = Field(
        default_factory=list,
        description="Upsell, cross-sell, expansion opportunities"
    )
    success_metrics: Optional[ClientSuccessMetrics] = Field(
        default_factory=ClientSuccessMetrics,
        description="Client success KPIs, benchmarks, tracking methods"
    )

# ============================================================================
# UNIVERSAL EXTRACTION ENGINE
# ============================================================================

class StructuredExtractor:
    """Universal extraction engine for all agent types"""

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL):
        """Initialize with Gemini API for extraction"""
        self.client = genai.Client(api_key=api_key)
        self.model = model

        # Agent-specific extraction schemas
        self.extraction_schemas = {
            "marketing_strategy": MarketingStrategySchema,
            "strategy": StrategySchema,
            "content": ContentSchema,
            "persona": PersonaSchema,
            "analytics": AnalyticsSchema,
            "roi_budget": ROIBudgetSchema,
            "campaign_planning": CampaignExecutionSchema,
            "quick_wins": QuickWinsSchema,
            "competitive_intelligence": CompetitiveIntelligenceSchema,
            "client_success": ClientSuccessSchema,
        }

        logger.info(f"StructuredExtractor initialized with model: {model}")

    async def extract(self, agent_type: str, raw_content: str) -> Dict[str, Any]:
        """Extract structured data based on agent type"""
        try:
            # Get schema for agent type
            schema_class = self.extraction_schemas.get(agent_type)
            if not schema_class:
                logger.warning(f"No extraction schema for agent type: {agent_type}")
                return {
                    "response": raw_content,
                    "extraction_status": "no_schema"
                }

            # Skip extraction if content is too short
            if len(raw_content.strip()) < 100:
                logger.debug(f"Content too short for extraction: {len(raw_content)} chars")
                return {
                    "response": raw_content,
                    "extraction_status": "content_too_short"
                }

            # Extract structured data using LLM
            structured_data = await self._llm_extract(agent_type, schema_class, raw_content)

            return {
                "response": raw_content,
                "structured_data": structured_data,
                "extraction_timestamp": datetime.utcnow().isoformat(),
                "extraction_model": self.model,
                "extraction_status": "success"
            }

        except Exception as e:
            logger.error(f"Extraction failed for {agent_type}: {e}")
            return {
                "response": raw_content,
                "extraction_error": str(e),
                "extraction_status": "failed"
            }

    async def _llm_extract(self, agent_type: str, schema_class, raw_content: str) -> Dict[str, Any]:
        """Use LLM to extract structured data according to schema"""

        # Create extraction prompt based on agent type
        prompt = self._build_extraction_prompt(agent_type, schema_class, raw_content)

        try:
            # Generate structured response using Gemini with Pydantic schema
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=[{"parts": [{"text": prompt}]}],
                config={
                    "response_mime_type": "application/json",
                    "response_schema": schema_class,  # Pass Pydantic model directly per Google docs
                    "temperature": 1.0,  # Gemini 3 recommended default
                }
            )

            # Parse JSON response
            extracted_data = json.loads(response.text)

            # Validate against schema
            validated_data = schema_class(**extracted_data)

            return validated_data.model_dump()

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in extraction: {e}")
            return {"extraction_error": "invalid_json"}
        except Exception as e:
            logger.error(f"LLM extraction error: {e}")
            return {"extraction_error": str(e)}

    def _build_extraction_prompt(self, agent_type: str, schema_class, raw_content: str) -> str:
        """Build agent-specific extraction prompt"""

        # Agent-specific extraction instructions
        agent_instructions = {
            "marketing_strategy": """
            Extract marketing strategy details including:
            - Campaign information (name, budget, timeline, objectives)
            - Target audience (market segments, personas, demographics)
            - Strategy components (value props, messaging, channels)
            - Specific objectives with measurable targets
            - Budget allocation across tactics and channels
            """,
            "strategy": """
            Extract strategic analysis including:
            - Type of analysis framework used
            - Business context and competitive landscape
            - Strategic insights (strengths, opportunities, etc.)
            - Specific action items with priorities and timelines
            """,
            "content": """
            Extract content specifications including:
            - Content type and format details
            - SEO elements and optimization
            - Publishing schedule and channel alignment
            - Target audience and messaging details
            """,
            "persona": """
            Extract persona characteristics including:
            - Demographic and role information
            - Behavioral patterns and preferences
            - Goals, pain points, and motivations
            - Communication and engagement preferences
            """,
            "analytics": """
            Extract analytics insights including:
            - Metrics and KPIs analyzed
            - Performance insights and trends
            - Data-driven recommendations with impact estimates
            """,
            "roi_budget": """
            Extract ROI and budget analysis including:
            - Budget breakdown and allocation strategies
            - ROI calculations and performance projections
            - Cost structure and efficiency metrics
            - Budget optimization recommendations
            """,
            "campaign_planning": """
            Extract campaign execution details including:
            - Execution timeline and deliverable milestones
            - Resource allocation and team assignments
            - Multi-channel deployment strategy
            - Success metrics and tracking methods
            """,
            "quick_wins": """
            Extract quick win opportunities including:
            - High-impact, low-effort opportunities
            - Implementation plans and step-by-step guides
            - Impact assessment and timeline expectations
            - Prioritized list with effort/impact reasoning
            """,
            "competitive_intelligence": """
            Extract competitive intelligence including:
            - Competitor analysis and strategic positioning
            - Market landscape and positioning gaps
            - Competitive advantages and differentiators
            - Strategic recommendations for market advantage
            """,
            "client_success": """
            Extract client success insights including:
            - Client health assessment and risk factors
            - Retention strategies and renewal tactics
            - Growth opportunities (upsell, cross-sell)
            - Success metrics and benchmarking methods
            """
        }

        instruction = agent_instructions.get(agent_type, agent_instructions["analytics"])

        return f"""
        You are a data extraction specialist. Extract structured information from the following {agent_type} agent response.

        EXTRACTION INSTRUCTIONS:
        {instruction}

        AGENT RESPONSE TO ANALYZE:
        {raw_content}

        EXTRACTION RULES:
        1. Extract only information that is explicitly mentioned in the response
        2. Use null for missing string fields, empty objects for missing dict fields, empty arrays for missing list fields
        3. Preserve specific numbers, dates, and quoted text exactly
        4. Focus on actionable, measurable data points
        5. Be accurate - don't guess or infer beyond what's clearly stated

        Extract the data into the required structured format.
        """

    def _get_schema_description(self, schema_class) -> str:
        """Get human-readable schema description"""
        try:
            schema_dict = schema_class.model_json_schema()
            properties = schema_dict.get("properties", {})

            descriptions = []
            for field_name, field_info in properties.items():
                description = field_info.get("description", "")
                field_type = field_info.get("type", "unknown")
                descriptions.append(f"- {field_name} ({field_type}): {description}")

            return "\n".join(descriptions)
        except Exception as e:
            logger.error(f"Error getting schema description: {e}")
            return "Schema description unavailable"

# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def create_structured_extractor(api_key: str) -> StructuredExtractor:
    """Factory function to create StructuredExtractor instance"""
    return StructuredExtractor(api_key=api_key)