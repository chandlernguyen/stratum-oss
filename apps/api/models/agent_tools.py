"""
Pydantic schemas for the outputs of agent tools.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from decimal import Decimal

# --- Strategy Agent Tools ---

class SWOTAnalysis(BaseModel):
    """Represents a structured SWOT analysis."""
    strengths: List[str] = Field(description="The internal strengths of the business.")
    weaknesses: List[str] = Field(description="The internal weaknesses of the business.")
    opportunities: List[str] = Field(description="The external opportunities for the business.")
    threats: List[str] = Field(description="The external threats to the business.")

class PortersFiveForces(BaseModel):
    """Represents a structured Porter's Five Forces analysis."""
    threat_of_new_entrants: str = Field(description="Analysis of the threat of new competitors entering the market.")
    bargaining_power_of_buyers: str = Field(description="Analysis of the power of customers to drive down prices.")
    bargaining_power_of_suppliers: str = Field(description="Analysis of the power of suppliers to drive up costs.")
    threat_of_substitutes: str = Field(description="Analysis of the threat of substitute products or services.")
    industry_rivalry: str = Field(description="Analysis of the intensity of competition among existing firms.")

class BusinessModelCanvas(BaseModel):
    """Represents a structured Business Model Canvas."""
    customer_segments: List[str] = Field(description="Groups of people or organizations the business aims to reach and serve.")
    value_propositions: str = Field(description="The bundle of products and services that create value for a specific customer segment.")
    channels: List[str] = Field(description="How the company communicates with and reaches its customer segments.")
    customer_relationships: List[str] = Field(description="Types of relationships a company establishes with specific customer segments.")
    revenue_streams: str = Field(description="The cash a company generates from each customer segment.")
    key_activities: List[str] = Field(description="The most important things a company must do to make its business model work.")
    key_resources: List[str] = Field(description="The most important assets required to make a business model work.")
    key_partnerships: List[str] = Field(description="The network of suppliers and partners that make the business model work.")
    cost_structure: str = Field(description="All costs incurred to operate a business model.")

class ICEScore(BaseModel):
    """Represents an item scored using the ICE prioritization framework."""
    item_name: str = Field(description="Name of the initiative or option being scored.")
    impact_score: int = Field(description="Impact score (1-10): How much positive effect will this have?", ge=1, le=10)
    confidence_score: int = Field(description="Confidence score (1-10): How confident are we in our estimates?", ge=1, le=10)
    ease_score: int = Field(description="Ease score (1-10): How easy is this to implement?", ge=1, le=10)
    total_score: float = Field(description="Total ICE score (Impact * Confidence * Ease / 100)")
    rationale: str = Field(description="Explanation of the scoring rationale.")

class ICEPrioritization(BaseModel):
    """Represents a complete ICE prioritization analysis."""
    context: str = Field(description="The business context and decision being made.")
    items: List[ICEScore] = Field(description="List of items scored and prioritized.")
    recommendation: str = Field(description="Final recommendation based on ICE scores.")
    resource_considerations: str = Field(description="How resource constraints affect the prioritization.")

class BCGMatrixItem(BaseModel):
    """Represents a single product/business unit in BCG Matrix."""
    name: str = Field(description="Name of the product or business unit.")
    market_growth_rate: str = Field(description="Market growth rate (High/Low).")
    relative_market_share: str = Field(description="Relative market share (High/Low).")
    category: str = Field(description="BCG category: Star, Cash Cow, Question Mark, or Dog.")
    strategy_recommendation: str = Field(description="Strategic recommendation for this item.")

class BCGMatrix(BaseModel):
    """Represents a complete BCG Growth-Share Matrix analysis."""
    context: str = Field(description="The business context for the portfolio analysis.")
    items: List[BCGMatrixItem] = Field(description="Products or business units analyzed.")
    overall_portfolio_balance: str = Field(description="Assessment of portfolio balance.")
    investment_priorities: str = Field(description="Where to invest based on the matrix.")

class VRIOResource(BaseModel):
    """Represents a single resource analyzed with VRIO framework."""
    resource_name: str = Field(description="Name or description of the resource/capability.")
    valuable: bool = Field(description="Is the resource valuable?")
    rare: bool = Field(description="Is the resource rare among competitors?")
    imitable: bool = Field(description="Is the resource costly to imitate?")
    organized: bool = Field(description="Is the firm organized to capture value?")
    competitive_implication: str = Field(description="Competitive disadvantage, parity, temporary advantage, or sustained advantage.")
    
class VRIOAnalysis(BaseModel):
    """Represents a complete VRIO framework analysis."""
    context: str = Field(description="The business context for competitive advantage analysis.")
    resources: List[VRIOResource] = Field(description="Resources and capabilities analyzed.")
    core_competencies: List[str] = Field(description="Identified core competencies.")
    strategic_implications: str = Field(description="Strategic recommendations based on VRIO.")

class HorizonItem(BaseModel):
    """Represents an initiative or business in Three Horizons framework."""
    name: str = Field(description="Name of the initiative or business.")
    horizon: int = Field(description="Horizon number (1, 2, or 3).", ge=1, le=3)
    description: str = Field(description="Description of the initiative.")
    time_frame: str = Field(description="Expected time frame (e.g., '0-1 year', '1-3 years', '3-5 years').")
    investment_level: str = Field(description="Required investment level (Low/Medium/High).")
    expected_return: str = Field(description="Expected return profile.")

class ThreeHorizons(BaseModel):
    """Represents a Three Horizons of Growth analysis."""
    context: str = Field(description="The business context for growth planning.")
    horizon_1: List[HorizonItem] = Field(description="Core business initiatives (defend and extend).")
    horizon_2: List[HorizonItem] = Field(description="Emerging opportunities (build new capabilities).")
    horizon_3: List[HorizonItem] = Field(description="Transformational initiatives (create future options).")
    resource_allocation: str = Field(description="Recommended resource allocation across horizons.")

class BlueOceanFactors(BaseModel):
    """Represents factors in Blue Ocean Strategy analysis."""
    eliminate: List[str] = Field(description="Factors the industry takes for granted that should be eliminated.")
    reduce: List[str] = Field(description="Factors that should be reduced well below industry standard.")
    raise_factors: List[str] = Field(description="Factors that should be raised well above industry standard.")
    create: List[str] = Field(description="Factors that the industry has never offered.")

class BlueOceanStrategy(BaseModel):
    """Represents a Blue Ocean Strategy analysis."""
    context: str = Field(description="The business context for market creation.")
    current_red_ocean: str = Field(description="Description of current competitive market.")
    blue_ocean_opportunity: str = Field(description="Description of uncontested market space.")
    four_actions_framework: BlueOceanFactors = Field(description="ERRC grid analysis.")
    value_innovation: str = Field(description="How to achieve differentiation and low cost simultaneously.")

class McKinsey7SElement(BaseModel):
    """Represents a single element in McKinsey 7S framework."""
    element: str = Field(description="Name of the element (Strategy, Structure, Systems, Shared Values, Style, Staff, Skills).")
    current_state: str = Field(description="Current state assessment.")
    desired_state: str = Field(description="Desired future state.")
    gap_analysis: str = Field(description="Gap between current and desired state.")
    action_items: List[str] = Field(description="Actions needed to close the gap.")

class McKinsey7S(BaseModel):
    """Represents a McKinsey 7S organizational analysis."""
    context: str = Field(description="The organizational context for analysis.")
    elements: List[McKinsey7SElement] = Field(description="All seven elements analyzed.")
    alignment_assessment: str = Field(description="Overall assessment of organizational alignment.")
    change_priorities: List[str] = Field(description="Priority areas for organizational change.")

class OKRItem(BaseModel):
    """Represents a single OKR (Objective and Key Results)."""
    objective: str = Field(description="Qualitative, inspirational objective.")
    key_results: List[str] = Field(description="2-5 measurable key results.")
    time_frame: str = Field(description="Time frame for achieving the OKR (typically quarterly).")
    owner: str = Field(description="Person or team responsible.")
    strategic_alignment: str = Field(description="How this OKR aligns with company strategy.")

class OKRFramework(BaseModel):
    """Represents an OKR planning framework."""
    context: str = Field(description="The strategic context for OKR setting.")
    company_okrs: List[OKRItem] = Field(description="Company-level OKRs.")
    team_okrs: List[OKRItem] = Field(description="Team-level OKRs.")
    success_metrics: str = Field(description="How success will be measured.")
    review_cadence: str = Field(description="Frequency of OKR reviews and updates.")

class JobToBeDone(BaseModel):
    """Represents a single Job to be Done."""
    job_statement: str = Field(description="The job statement in format: When [situation], I want to [motivation], so I can [outcome].")
    functional_aspects: List[str] = Field(description="Functional dimensions of the job.")
    emotional_aspects: List[str] = Field(description="Emotional dimensions of the job.")
    social_aspects: List[str] = Field(description="Social dimensions of the job.")
    current_solutions: List[str] = Field(description="Current solutions customers use.")
    opportunity_score: float = Field(description="Opportunity score based on importance and satisfaction.", ge=0, le=10)

class JobsToBeDone(BaseModel):
    """Represents a Jobs to be Done analysis."""
    context: str = Field(description="The market or product context.")
    primary_jobs: List[JobToBeDone] = Field(description="Primary jobs customers are trying to get done.")
    underserved_jobs: List[str] = Field(description="Jobs that are poorly served by current solutions.")
    innovation_opportunities: str = Field(description="Innovation opportunities based on unmet jobs.")

# --- Persona Agent Tools ---

class PersonaLocation(BaseModel):
    """Structured geographic location for a persona."""
    country: str = Field(description="Country name (e.g., 'United States', 'United Kingdom', 'Canada'). REQUIRED.")
    state_province: Optional[str] = Field(default=None, description="State or province for federal countries (e.g., 'California', 'Ontario', 'New South Wales'). Required for US, Canada, Australia.")
    city: Optional[str] = Field(default=None, description="City name when relevant to the persona (e.g., 'San Francisco', 'London', 'Toronto').")
    postal_code: Optional[str] = Field(default=None, description="Postal or ZIP code if targeting specific areas.")
    region: Optional[str] = Field(default=None, description="Broader geographic region (e.g., 'Bay Area', 'Greater London', 'GTA').")
    timezone: Optional[str] = Field(default=None, description="IANA timezone identifier (e.g., 'America/New_York', 'Europe/London').")
    coordinates: Optional[Dict[str, float]] = Field(default=None, description="GPS coordinates as {'lat': number, 'lng': number} for precise targeting.")
    description: Optional[str] = Field(default=None, description="Additional location context or notes.")

class PersonaDemographics(BaseModel):
    """Detailed demographic information for a persona."""
    age: str = Field(description="Age or age range (e.g., '35', '25-34', 'Millennials'). Use ranges for broader segments.")
    gender: Optional[str] = Field(default=None, description="Gender identity if relevant to targeting.")
    education: str = Field(description="Education level (e.g., 'Bachelor's degree', 'High school', 'MBA').")
    income: str = Field(description="Income level or range (e.g., '$75,000-$100,000', 'High income', 'Middle class').")
    family_status: Optional[str] = Field(default=None, description="Family situation (e.g., 'Married with 2 children', 'Single', 'Empty nester').")
    occupation: str = Field(description="Job role or profession (e.g., 'Marketing Manager', 'Small Business Owner').")
    experience_years: Optional[str] = Field(default=None, description="Years of professional experience (e.g., '5-10 years', 'Senior level').")

class PersonaPsychographics(BaseModel):
    """Psychographic profile for understanding persona motivations."""
    values: List[str] = Field(description="Core values that drive decisions (e.g., 'Innovation', 'Work-life balance', 'Sustainability').")
    interests: List[str] = Field(description="Personal and professional interests (e.g., 'Technology', 'Leadership development', 'Industry news').")
    lifestyle: str = Field(description="Lifestyle description (e.g., 'Busy professional', 'Digital nomad', 'Family-focused').")
    personality_traits: List[str] = Field(description="Key personality characteristics (e.g., 'Analytical', 'Risk-averse', 'Early adopter').")
    motivations: List[str] = Field(description="What drives this persona (e.g., 'Career advancement', 'Business growth', 'Efficiency').")

class PersonaBehaviors(BaseModel):
    """Behavioral patterns of the persona."""
    buying_process: str = Field(description="How they make purchasing decisions (e.g., 'Extensive research', 'Peer recommendations', 'Quick decisions').")
    decision_criteria: List[str] = Field(description="Factors they consider when evaluating solutions (e.g., 'Price', 'Features', 'Support', 'Integration').")
    information_sources: List[str] = Field(description="Where they get information (e.g., 'Industry blogs', 'LinkedIn', 'Peer networks', 'Analyst reports').")
    technology_adoption: str = Field(description="Technology comfort level (e.g., 'Early adopter', 'Pragmatist', 'Laggard').")
    preferred_content_types: List[str] = Field(description="Content formats they prefer (e.g., 'Video tutorials', 'White papers', 'Webinars', 'Case studies').")

class Persona(BaseModel):
    """Represents a comprehensive, detailed customer persona with structured data."""
    # Basic Information
    name: str = Field(description="A memorable fictional name for the persona (e.g., 'Marketing Mary', 'Startup Steve'). Make it alliterative and descriptive.")
    title: str = Field(description="Professional title or role (e.g., 'Chief Marketing Officer', 'Small Business Owner').")
    company_name: str = Field(description="Fictional company name or type (e.g., 'TechCorp Inc.', 'Local Retail Store').")
    industry: str = Field(description="Industry or sector (e.g., 'Technology', 'Healthcare', 'E-commerce').")
    company_size: str = Field(description="Company size (e.g., '10-50 employees', 'Enterprise 1000+', 'Solo entrepreneur').")
    
    # Structured Location Data - CRITICAL for geographic targeting
    location: PersonaLocation = Field(description="MUST be a structured location object with country, state/province, city. Never use a string.")
    
    # Detailed Demographics
    demographics: PersonaDemographics = Field(description="Comprehensive demographic profile.")
    
    # Psychographics
    psychographics: PersonaPsychographics = Field(description="Values, interests, and personality traits.")
    
    # Behaviors
    behaviors: PersonaBehaviors = Field(description="How they research, buy, and use products/services.")
    
    # Goals & Challenges
    goals: List[str] = Field(description="3-5 primary goals they want to achieve in their role.")
    pain_points: List[str] = Field(description="3-5 major challenges or frustrations they face.")
    jobs_to_be_done: List[str] = Field(description="Functional, emotional, and social jobs they're trying to accomplish.")
    
    # Communication Preferences
    communication_channels: List[str] = Field(description="Preferred channels for receiving information (e.g., 'Email', 'LinkedIn', 'Webinars').")
    
    # Additional Context
    quote: str = Field(description="A realistic quote that captures their perspective (e.g., 'I need solutions that just work, not more complexity').")
    day_in_life: str = Field(description="Brief description of a typical day for this persona.")
    success_metrics: List[str] = Field(description="How they measure success in their role.")

class BuyerJourneyStage(BaseModel):
    """Represents a single stage in the buyer journey."""
    stage_name: str = Field(description="Name of the stage (e.g., Awareness, Consideration, Decision).")
    description: str = Field(description="What the persona is thinking and doing at this stage.")
    key_questions: List[str] = Field(description="The key questions the persona has at this stage.")
    content_opportunities: List[str] = Field(description="Types of content that would be helpful at this stage.")

class BuyerJourney(BaseModel):
    """Represents a customer's buyer journey for a specific persona."""
    persona_name: str = Field(description="The name of the persona this journey applies to.")
    stages: List[BuyerJourneyStage] = Field(description="The sequential stages of the buyer journey.")

class InterviewQuestions(BaseModel):
    """A set of questions to validate a customer persona."""
    persona_name: str = Field(description="The name of the persona these questions are for.")
    questions: List[str] = Field(description="A list of open-ended questions to ask during user interviews.")

# --- Content Agent Tools ---

class ContentIdea(BaseModel):
    """Represents a single, actionable content idea."""
    title: str = Field(description="A catchy, SEO-friendly title for the content piece.")
    format: str = Field(description="The format of the content (e.g., Blog Post, Video, Infographic, Tweet-thread).")
    angle: str = Field(description="The unique angle or hook for the content.")
    target_persona: str = Field(description="The primary persona this content is for.")

class BlogPost(BaseModel):
    """Represents a draft of a blog post."""
    title: str = Field(description="The final title of the blog post.")
    outline: List[str] = Field(description="A section-by-section outline of the blog post.")
    body: str = Field(description="The full drafted text of the blog post.")
    seo_keywords: List[str] = Field(description="A list of target SEO keywords.")

class SocialMediaPost(BaseModel):
    """Represents a social media post for a specific platform."""
    platform: str = Field(description="The target social media platform (e.g., Twitter, LinkedIn, Instagram).")
    text_content: str = Field(description="The text for the social media post.")
    image_description: Optional[str] = Field(description="A detailed description for a suggested accompanying image.")
    hashtags: List[str] = Field(description="A list of relevant hashtags.")

class ContentCalendarEntry(BaseModel):
    """Represents a single entry in a content calendar."""
    publish_date: str = Field(description="The suggested publication date in YYYY-MM-DD format.")
    content_idea: ContentIdea = Field(description="The content idea to be published.")
    platform: str = Field(description="The platform where the content will be published.")

class ContentCalendar(BaseModel):
    """Represents a content calendar for a specific duration."""
    start_date: str = Field(description="The start date of the calendar in YYYY-MM-DD format.")
    end_date: str = Field(description="The end date of the calendar in YYYY-MM-DD format.")
    schedule: List[ContentCalendarEntry] = Field(description="The list of scheduled content pieces.")

# --- Analytics Agent Tools ---

class AnalysisReport(BaseModel):
    """Represents a report analyzing a set of data or metrics."""
    title: str = Field(description="The title of the analysis report.")
    summary: str = Field(description="A high-level summary of the key findings.")
    findings: List[str] = Field(description="A list of specific, data-backed findings.")
    recommendations: List[str] = Field(description="Actionable recommendations based on the findings.")

class Optimization(BaseModel):
    """Represents a single, actionable optimization suggestion."""
    area: str = Field(description="The area for optimization (e.g., Landing Page, Ad Creative, User Funnel).")
    suggestion: str = Field(description="The specific suggestion for improvement.")
    expected_impact: str = Field(description="The anticipated impact of this optimization (e.g., +5% conversion rate).")
    priority: str = Field(description="The priority of the task (High, Medium, Low).")

class Forecast(BaseModel):
    """Represents a forecast for a specific metric."""
    metric_name: str = Field(description="The name of the metric being forecasted (e.g., Website Traffic, Revenue).")
    time_period: str = Field(description="The time period for the forecast (e.g., Next 30 days, Q4 2025).")
    forecast_value: str = Field(description="The forecasted value or range.")
    confidence_level: float = Field(description="The confidence level of the forecast, from 0.0 to 1.0.")
    assumptions: List[str] = Field(description="The key assumptions the forecast is based on.")

# --- ROI & Budget Agent Tools ---

class CampaignROIResult(BaseModel):
    """Represents the calculated ROI for a campaign."""
    campaign_name: str = Field(description="The name of the campaign being analyzed.")
    total_spend: float = Field(description="The total amount spent on the campaign.")
    total_revenue: float = Field(description="The total revenue generated by the campaign.")
    roi_percentage: float = Field(description="The calculated Return on Investment (ROI) as a percentage.")
    notes: str = Field(description="A summary of the ROI calculation and key takeaways.")

class BudgetReallocation(BaseModel):
    """Represents a single budget reallocation suggestion."""
    from_channel: str = Field(description="The channel to decrease budget from.")
    to_channel: str = Field(description="The channel to increase budget to.")
    amount: float = Field(description="The amount of budget to reallocate.")
    reasoning: str = Field(description="The data-driven reason for this reallocation suggestion.")

class BudgetSuggestion(BaseModel):
    """Represents a set of budget reallocation suggestions."""
    suggestions: List[BudgetReallocation] = Field(description="A list of budget reallocation suggestions.")
    summary: str = Field(description="A high-level summary of the proposed budget changes.")

# --- Campaign Execution Agent Tools ---

class DeploymentPlan(BaseModel):
    """Represents a plan for deploying a marketing campaign."""
    campaign_name: str = Field(description="The name of the campaign to be deployed.")
    channel_breakdown: Dict[str, str] = Field(description="A dictionary where keys are channel names and values are the specific actions or content for that channel.")
    schedule_summary: str = Field(description="A high-level summary of the deployment schedule.")

class ABTestVariant(BaseModel):
    """Represents a single variant in an A/B test."""
    variant_name: str = Field(description="The name of the variant (e.g., 'A', 'B', 'Control', 'Challenger').")
    description: str = Field(description="A description of what makes this variant different.")
    kpi_to_measure: str = Field(description="The primary key performance indicator to measure for this variant (e.g., 'Click-Through Rate', 'Conversion Rate').")

class ABTestSuggestion(BaseModel):
    """Represents a suggestion for an A/B test."""
    element_to_test: str = Field(description="The element of the campaign to A/B test (e.g., 'Email Subject Line', 'Ad Creative', 'Call to Action Button').")
    variants: List[ABTestVariant] = Field(description="A list of the variants to be tested.")

# --- Quick Wins Agent Tools ---

class QuickWinSuggestion(BaseModel):
    """Represents a single high-impact, low-effort marketing suggestion."""
    opportunity: str = Field(description="A clear and concise description of the opportunity.")
    impact: str = Field(description="The potential positive impact of implementing this suggestion (e.g., 'Increase lead conversion by 5%', 'Improve email open rates').")
    effort: str = Field(description="The estimated effort required to implement this suggestion (e.g., 'Low', 'Medium', 'High').")
    recommendation: str = Field(description="The specific, actionable step to take.")

# --- Competitive Intelligence Agent Tools ---

class CompetitorAnalysis(BaseModel):
    """Represents an analysis of a single competitor."""
    name: str = Field(description="The name of the competitor.")
    strengths: List[str] = Field(description="The competitor's key strengths.")
    weaknesses: List[str] = Field(description="The competitor's key weaknesses.")
    strategy_summary: str = Field(description="A summary of the competitor's likely strategy.")

class MarketGap(BaseModel):
    """Represents an identified gap or opportunity in the market."""
    opportunity_area: str = Field(description="The area of the market where the gap exists (e.g., 'Product Features', 'Pricing Model', 'Target Audience').")
    description: str = Field(description="A description of the market gap or opportunity.")
    recommendation: str = Field(description="A recommendation for how to exploit this gap.")

# --- Client Success Agent Tools ---

class ClientHealthReport(BaseModel):
    """Represents a health and status report for a client or account."""
    client_name: str = Field(description="The name of the client being reported on.")
    health_score: float = Field(description="A calculated health score from 0.0 to 1.0, where 1.0 is excellent.")
    positive_indicators: List[str] = Field(description="A list of positive indicators contributing to the health score.")
    areas_of_concern: List[str] = Field(description="A list of negative indicators or areas of concern.")
    summary: str = Field(description="A high-level summary of the client's status and outlook.")

class RetentionStrategy(BaseModel):
    """Represents a single, actionable strategy to improve client retention."""
    strategy_name: str = Field(description="The name of the retention strategy (e.g., 'Quarterly Business Review', 'Proactive Support Outreach').")
    description: str = Field(description="A description of the strategy and how to implement it.")
    impact_on_health: str = Field(description="The expected impact this strategy will have on the client's health score.")

# --- Marketing Strategy Agent Tools ---

class MarketingStrategy(BaseModel):
    """Comprehensive marketing strategy bridging personas to content."""
    campaign_id: str = Field(description="The campaign this strategy belongs to")
    target_personas: List[str] = Field(description="IDs of target personas")
    messaging_framework: Dict[str, Any] = Field(description="Core messaging and value propositions")
    channel_strategy: Dict[str, Any] = Field(description="Marketing channel mix and priorities")
    budget_allocation: Dict[str, float] = Field(description="Budget split across owned/earned/paid")
    content_pillars: List[str] = Field(description="Core content themes")
    estimated_roi: float = Field(description="Expected return on investment")

class MessagingFramework(BaseModel):
    """Structured messaging framework for marketing communications."""
    elevator_pitch_30_sec: str = Field(description="30-second elevator pitch")
    elevator_pitch_60_sec: Optional[str] = Field(description="60-second extended pitch")
    value_propositions: Dict[str, List[str]] = Field(description="Primary and supporting value props")
    key_messages: Dict[str, str] = Field(description="Messages for each funnel stage")
    tone_of_voice: Dict[str, List[str]] = Field(description="Voice and tone guidelines")
    proof_points: List[str] = Field(description="Evidence and credibility builders")
    differentiation: List[str] = Field(description="Key differentiators from competitors")

class ChannelStrategy(BaseModel):
    """Marketing channel selection and optimization strategy."""
    recommended_channels: Dict[str, Dict[str, Any]] = Field(description="Channels with priority and budget")
    channel_priorities: List[str] = Field(description="Ordered list of channel priorities")
    budget_per_channel: Dict[str, float] = Field(description="Budget allocation per channel")
    implementation_timeline: Dict[str, str] = Field(description="When to launch each channel")
    success_metrics: Dict[str, str] = Field(description="KPIs for each channel")

class BudgetAllocation(BaseModel):
    """Smart budget allocation across marketing activities."""
    total_budget: float = Field(description="Total monthly marketing budget")
    owned_media: float = Field(description="Budget for owned media (website, blog, email)")
    earned_media: float = Field(description="Budget for earned media (PR, partnerships)")
    paid_media: float = Field(description="Budget for paid advertising")
    allocation_rationale: str = Field(description="Why this allocation makes sense")
    optimization_opportunities: List[str] = Field(description="Ways to stretch the budget further")

class ContentPillar(BaseModel):
    """Content theme or pillar for consistent messaging."""
    pillar_name: str = Field(description="Name of the content pillar")
    theme_description: str = Field(description="What this pillar covers")
    target_percentage: int = Field(description="Percentage of content for this pillar")
    content_types: List[str] = Field(description="Types of content for this pillar")
    key_topics: List[str] = Field(description="Specific topics to cover")

class ZeroBudgetTactic(BaseModel):
    """Marketing tactic requiring no monetary investment."""
    tactic_name: str = Field(description="Name of the zero-budget tactic")
    effort_required: str = Field(description="Time/effort needed (e.g., '1 hour/day')")
    expected_result: str = Field(description="What this tactic will achieve")
    implementation_steps: List[str] = Field(description="How to implement this tactic")
    best_for: str = Field(description="What type of business this works best for")
