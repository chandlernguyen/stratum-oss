"""
Quick Start Agent - Unified onboarding intelligence generation.

Combines capabilities from Strategy, Persona, and Marketing Strategy agents
to guide SMEs through 5-minute intelligence generation flow.
"""
from typing import List, Optional, Dict, Any
from google.genai import types
from google import genai
import logging
from datetime import datetime, timezone

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent
from apps.api.agents.direct_strategy_agent import DirectStrategyAgent
from apps.api.agents.direct_persona_agent import DirectPersonaAgent
from apps.api.services.universal_output_service import get_universal_output_service

logger = logging.getLogger(__name__)


class DirectQuickStartAgent(EnterpriseBaseAgent):
    """
    Quick Start Agent - Unified onboarding intelligence generation.

    Combines capabilities from Strategy, Persona, and Marketing Strategy agents
    to guide SMEs through 5-minute intelligence generation flow.

    Tools:
    - 11 Strategic Frameworks (SWOT, Porter's Five Forces, Business Model Canvas, etc.)
    - 4 Persona Tools (buyer personas, journey mapping, pain point analysis)
    - 9 Marketing Strategy Tools (channel strategy, messaging, budget allocation)

    Output: Comprehensive business intelligence saved to agent_outputs table
    """

    async def __ainit__(self, org_id: Optional[str] = None, campaign_id: Optional[str] = None, user_id: Optional[str] = None, org_type: Optional[str] = None, client_id: Optional[str] = None, locale: str = "en"):
        """Asynchronously initialize Quick Start Agent with enterprise context."""
        self.campaign_id = campaign_id
        self.client_id = client_id  # Store for agency client scoping

        # Initialize parent with enterprise context
        # AgentConfig automatically sets max_output_tokens=16384 for 'quick_start'
        # No manual override needed - configuration is centralized in agent_config.py
        await super().__ainit__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type=self.get_agent_type(),
            org_type=org_type,  # Enable schema routing (SME: public, Agency: agency)
            client_id=client_id,  # Enable agency client scoping
            locale=locale,  # Localization: User's preferred language
        )

        # Initialize sub-agent instances for tool delegation
        self.strategy_agent = DirectStrategyAgent()
        await self.strategy_agent.__ainit__(org_id=org_id, campaign_id=campaign_id, user_id=user_id, org_type=org_type, client_id=client_id, locale=locale)

        self.persona_agent = DirectPersonaAgent(org_id=org_id, campaign_id=campaign_id, user_id=user_id)

    def get_agent_type(self) -> str:
        """Return agent type identifier."""
        return "quick_start"

    def _get_agent_tools(self) -> List:
        """
        Combine all tools from Strategy, Persona, and Marketing Strategy agents using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.

        Returns:
            List of raw callables (28 tools total)
        """
        try:
            # Return raw callables - SDK automatically converts to FunctionDeclaration
            # This enables hybrid streaming (raw callables + AFC disabled + manual multi-turn)
            tools = [
                # Strategy tools (11 frameworks + 1 save)
                self.get_swot_analysis,
                self.get_porters_five_forces,
                self.get_business_model_canvas,
                self.get_ice_scoring,
                self.get_bcg_matrix,
                self.get_vrio_analysis,
                self.get_three_horizons,
                self.get_blue_ocean_strategy,
                self.get_mckinsey_7s,
                self.get_okr_framework,
                self.get_jobs_to_be_done,
                self.save_strategy_synthesis,
                # Persona tools (4 generation tools)
                self.get_persona_context,
                self.generate_persona_data,
                self.save_persona,
                self.get_buyer_journey_data,
                # Marketing Strategy tools (11 tools)
                self.analyze_budget_efficiency,
                self.create_messaging_framework,
                self.design_channel_strategy,
                self.generate_content_pillars,
                self.plan_zero_budget_tactics,
                self.calculate_channel_roi,
                self.fetch_personas,
                self.fetch_persona_insights,
                self.save_marketing_strategy,
                self.list_marketing_strategies,
                self.get_marketing_strategy_details,
                # Quick Start Intelligence Save Tool
                self.save_quick_start_intelligence,
            ]

            logger.info(f"Quick Start agent created {len(tools)} raw callable tools successfully")
            return tools

        except Exception as e:
            logger.error(f"Error creating quick start agent tools: {e}")
            return []

    def get_base_prompt(self) -> str:
        """
        Custom system prompt for Quick Start flow.

        Returns:
            System prompt specialized for 5-minute Quick Start onboarding
        """
        return """You are the Quick Start Agent, designed to help SMEs generate comprehensive marketing intelligence within 5 minutes.

**CRITICAL**: After using any tool, you MUST provide a detailed natural language explanation of the results. Never just execute a tool without explaining what you found and what it means for the user's business.

I guide users through their first experience on the platform by generating:
1. **Business Strategy Analysis** - Apply 2-3 relevant strategic frameworks (SWOT, Porter's Five Forces, Business Model Canvas)
2. **Customer Personas** - Create detailed buyer personas with demographics, goals, pain points
3. **Go-to-Market Strategy** - Develop channel strategy, messaging framework, and actionable roadmap

## Available Tools

**Strategic Analysis (11 frameworks):**
- `GET_SWOT_ANALYSIS`: Provides SWOT framework templates and analysis data
- `GET_PORTERS_FIVE_FORCES`: Returns industry analysis templates and competitive data
- `GET_BUSINESS_MODEL_CANVAS`: Supplies business model templates and examples
- `GET_ICE_SCORING`: Provides prioritization frameworks and scoring templates
- `GET_BCG_MATRIX`: Returns portfolio analysis templates and benchmarks
- `GET_VRIO_ANALYSIS`: Supplies competitive advantage assessment templates
- `GET_THREE_HORIZONS`: Provides growth planning templates and horizon definitions
- `GET_BLUE_OCEAN_STRATEGY`: Returns ERRC framework templates and value innovation guides
- `GET_MCKINSEY_7S`: Supplies organizational alignment templates
- `GET_OKR_FRAMEWORK`: Provides OKR templates and goal-setting best practices
- `GET_JOBS_TO_BE_DONE`: Returns JTBD framework templates and customer analysis guides
- `SAVE_STRATEGY_SYNTHESIS`: Save strategic analysis to database

**Persona Development (4 tools):**
- `GET_PERSONA_CONTEXT`: Gather context for persona creation
- `GENERATE_PERSONA_DATA`: Create comprehensive persona profiles
- `SAVE_PERSONA`: **REQUIRED** - Save each persona to database immediately after generating for cross-agent use and Persona agent visibility
- `GET_BUYER_JOURNEY_DATA`: Map customer decision journey

**Marketing Strategy (11 tools):**
- `ANALYZE_BUDGET_EFFICIENCY`: Reason through optimal budget allocation
- `CREATE_MESSAGING_FRAMEWORK`: Develop messaging for each persona
- `DESIGN_CHANNEL_STRATEGY`: Select and prioritize marketing channels
- `GENERATE_CONTENT_PILLARS`: Define 3-5 content themes and topics
- `PLAN_ZERO_BUDGET_TACTICS`: Create strategies requiring $0 investment
- `CALCULATE_CHANNEL_ROI`: Calculate and predict marketing channel ROI
- `FETCH_PERSONAS`: Retrieve existing customer personas
- `FETCH_PERSONA_INSIGHTS`: Access AI-learned persona intelligence
- `SAVE_MARKETING_STRATEGY`: Save complete marketing strategy to database
- `LIST_MARKETING_STRATEGIES`: View existing marketing strategies
- `GET_MARKETING_STRATEGY_DETAILS`: Get details of specific strategy

**Quick Start Intelligence (1 tool):**
- `SAVE_QUICK_START_INTELLIGENCE`: Save the comprehensive Quick Start intelligence plan (strategy + personas + marketing) to database for future reference

## My Approach

When you share your business context from the Quick Start questionnaire, I will:
1. Apply 2-3 strategic frameworks most relevant to your situation
2. Create actionable buyer personas aligned with your target audience
3. Recommend specific channels and tactics matching your budget and timeline
4. Provide a clear roadmap with "start here" first actions

## Budget-Aware Recommendations

- **$0-1K/month**: Focus on owned media (content, SEO) and earned media (community engagement)
- **$1K-5K/month**: Add selective paid channels (LinkedIn, Google Ads with tight targeting)
- **$5K-20K/month**: Multi-channel campaigns with experimentation budget
- **$20K+/month**: Comprehensive full-funnel strategies across all major channels

## Key Principles

- **Quality over quantity**: 3 excellent insights beat 10 mediocre ones
- **Actionable first steps**: Every recommendation includes "what to do today"
- **Budget realism**: Only recommend tactics you can actually afford
- **Timeline awareness**: Match tactics to your urgency (quick wins vs. long-term)
- **Specific and encouraging**: This is your first experience with the platform - make it count!

## How I Work

When you provide your business context from the Quick Start questionnaire:

1. **I will call tools** like GET_SWOT_ANALYSIS to gather strategic frameworks and data
2. **THEN I MUST explain what I found** - I will analyze the tool results and provide you with:
   - Clear explanations of your Strengths, Weaknesses, Opportunities, and Threats
   - Specific recommendations based on your business context
   - Actionable next steps you can take today
3. **I will continue** through personas and marketing strategy with the same approach
4. **After completing comprehensive analysis**, I will proactively offer to save your Quick Start intelligence for future reference using the SAVE_QUICK_START_INTELLIGENCE tool

**IMPORTANT**: I never just execute tools silently. Every tool I use generates insights that I explain to you in plain language, connecting them to your specific business situation.

## Persona Generation Workflow (CRITICAL)

When generating customer personas during Quick Start, I MUST follow this exact sequence for EACH persona:

1. Call `GENERATE_PERSONA_DATA` to create the persona profile with demographics, goals, pain points, etc.
2. **IMMEDIATELY after receiving the persona data**, call `SAVE_PERSONA` with ALL the persona details (name, title, company_name, industry, goals, pain_points, demographics, location, etc.)
3. Repeat this two-step sequence for each persona (typically 2-3 personas)

This ensures personas appear in the Persona agent sidebar for cross-agent use and future reference.

**Example flow for 2 personas**:
```
Step 1a: generate_persona_data("Operations Manager at mid-size manufacturing company")
Step 1b: save_persona(name="Olivia Efficiency", title="Operations Manager", company_name="MidSize Manufacturing Co.", industry="Manufacturing", goals=["Reduce operational costs", "Improve efficiency"], pain_points=["Manual processes", "Data silos"], demographics={...}, location={...})

Step 2a: generate_persona_data("IT Director at enterprise SaaS company")
Step 2b: save_persona(name="David Tech", title="IT Director", company_name="Enterprise SaaS Corp", industry="Technology", goals=["Modernize infrastructure", "Increase security"], pain_points=["Legacy systems", "Budget constraints"], demographics={...}, location={...})
```

**DO NOT**:
- Generate all personas first and then save them later
- Skip saving personas to database
- Only mention personas in the final summary without calling save_persona

**ALWAYS**:
- Call save_persona immediately after generate_persona_data for each persona
- Pass all available fields to save_persona (name, title, company_name, industry, goals, pain_points, demographics, location, psychographics, behaviors, preferred_channels, etc.)
- Confirm in your response that each persona was saved to the database

## When to Offer to Save

After I've completed a comprehensive Quick Start session that includes:
- Strategic analysis (SWOT, Porter's Five Forces, or other frameworks)
- Customer personas created or analyzed
- Marketing strategy recommendations
- Channel and budget recommendations

I will proactively ask: "Would you like me to save this comprehensive Quick Start intelligence for future reference? This will capture all your strategic analysis, personas, and marketing recommendations in one place."

If you say yes, I'll call the SAVE_QUICK_START_INTELLIGENCE tool to permanently save your plan. You can also ask me to "save this plan" or "save the intelligence" at any time during our conversation.

What business are we building marketing intelligence for today?"""

    # ===== Strategy Tool Delegates =====
    async def get_swot_analysis(self, business_context: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's SWOT analysis."""
        return await self.strategy_agent.get_swot_analysis(business_context)

    async def get_porters_five_forces(self, industry_context: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's Porter's Five Forces."""
        return await self.strategy_agent.get_porters_five_forces(industry_context)

    async def get_business_model_canvas(self, business_description: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's Business Model Canvas."""
        return await self.strategy_agent.get_business_model_canvas(business_description)

    async def get_ice_scoring(self, decision_context: str, options: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's ICE Scoring."""
        return await self.strategy_agent.get_ice_scoring(decision_context, options)

    async def get_bcg_matrix(self, business_context: str, products_or_units: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's BCG Matrix."""
        return await self.strategy_agent.get_bcg_matrix(business_context, products_or_units)

    async def get_vrio_analysis(self, business_context: str, resources_capabilities: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's VRIO Analysis."""
        return await self.strategy_agent.get_vrio_analysis(business_context, resources_capabilities)

    async def get_three_horizons(self, business_context: str, growth_objectives: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's Three Horizons."""
        return await self.strategy_agent.get_three_horizons(business_context, growth_objectives)

    async def get_blue_ocean_strategy(self, business_context: str, industry_description: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's Blue Ocean Strategy."""
        return await self.strategy_agent.get_blue_ocean_strategy(business_context, industry_description)

    async def get_mckinsey_7s(self, business_context: str, organizational_challenge: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's McKinsey 7S."""
        return await self.strategy_agent.get_mckinsey_7s(business_context, organizational_challenge)

    async def get_okr_framework(self, business_context: str, strategic_goals: str, time_horizon: str = "quarterly") -> Dict[str, Any]:
        """Delegate to Strategy Agent's OKR Framework."""
        return await self.strategy_agent.get_okr_framework(business_context, strategic_goals, time_horizon)

    async def get_jobs_to_be_done(self, business_context: str, target_customers: str, product_category: str) -> Dict[str, Any]:
        """Delegate to Strategy Agent's Jobs to Be Done."""
        return await self.strategy_agent.get_jobs_to_be_done(business_context, target_customers, product_category)

    async def save_strategy_synthesis(
        self,
        strategy_title: str,
        executive_summary: str,
        key_frameworks_used: List[str],
        strategic_priorities: List[str],
        recommended_actions: List[Dict[str, str]],
        expected_outcomes: str,
        implementation_timeline: str = "Not specified"
    ) -> Dict[str, Any]:
        """Delegate to Strategy Agent's save synthesis."""
        return await self.strategy_agent.save_strategy_synthesis(
            strategy_title, executive_summary, key_frameworks_used,
            strategic_priorities, recommended_actions, expected_outcomes, implementation_timeline
        )

    # ===== Persona Tool Delegates =====
    async def get_persona_context(self, customer_description: str) -> Dict[str, Any]:
        """Delegate to Persona Agent's context gathering."""
        return await self.persona_agent.get_persona_context(customer_description)

    async def generate_persona_data(
        self,
        customer_description: str,
        location_country: str,
        location_state: Optional[str] = None,
        location_city: Optional[str] = None
    ) -> Dict[str, Any]:
        """Delegate to Persona Agent's persona generation."""
        return await self.persona_agent.generate_persona_data(
            customer_description, location_country, location_state, location_city
        )

    async def save_persona(
        self,
        name: str,
        title: str,
        company_name: str,
        industry: str,
        goals: List[str],
        pain_points: List[str],
        demographics: Dict[str, Any],
        location: Dict[str, Any],
        psychographics: Optional[Dict[str, Any]] = None,
        behaviors: Optional[Dict[str, Any]] = None,
        jobs_to_be_done: Optional[List[str]] = None,
        preferred_channels: Optional[List[str]] = None,
        objections: Optional[List[str]] = None,
        communication_channels: Optional[List[str]] = None,
        quote: Optional[str] = None,
        day_in_life: Optional[str] = None,
        success_metrics: Optional[List[str]] = None,
        budget_authority: Optional[str] = None,
        buying_role: Optional[str] = None,
        customer_journey_stage: Optional[str] = None,
        company_size: Optional[str] = None,
        vertical: Optional[str] = None
    ) -> Dict[str, Any]:
        """Delegate to Persona Agent's save persona."""
        return await self.persona_agent.save_persona(
            name, title, company_name, industry, goals, pain_points,
            demographics, location, psychographics, behaviors,
            jobs_to_be_done, preferred_channels, objections,
            communication_channels, quote, day_in_life, success_metrics,
            budget_authority, buying_role, customer_journey_stage,
            company_size, vertical
        )

    async def get_buyer_journey_data(self, context: str) -> Dict[str, Any]:
        """Delegate to Persona Agent's buyer journey data."""
        return await self.persona_agent.get_buyer_journey_data(context)

    # ===== Marketing Strategy Tool Delegates =====
    def analyze_budget_efficiency(
        self,
        monthly_budget: float,
        business_context: str,
        company_stage: Optional[str] = None,
        target_market: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze budget efficiency for the Quick Start user.
        Simplified for SME onboarding - focuses on practical recommendations.
        """
        # Provide Quick Start-specific budget analysis
        if monthly_budget < 1000:
            return {
                "strategy_name": "Bootstrap Quick Start",
                "reasoning": f"With ${monthly_budget}/month, focus on owned media (content, SEO) and earned media (community, partnerships).",
                "allocation": {"owned": 85, "earned": 10, "paid": 5},
                "quick_wins": ["Start blogging", "Optimize Google My Business", "Join relevant communities"],
                "confidence": "High - ideal for getting started"
            }
        elif monthly_budget < 5000:
            return {
                "strategy_name": "Selective Paid Testing",
                "reasoning": f"With ${monthly_budget}/month, test paid channels while building organic presence.",
                "allocation": {"owned": 60, "earned": 20, "paid": 20},
                "quick_wins": ["Content marketing", "LinkedIn ads (tightly targeted)", "Email marketing"],
                "confidence": "High - balanced approach for growth"
            }
        else:
            return {
                "strategy_name": "Multi-Channel Growth",
                "reasoning": f"With ${monthly_budget}/month, run comprehensive campaigns across channels.",
                "allocation": {"owned": 50, "earned": 20, "paid": 30},
                "quick_wins": ["Full-funnel content", "Paid social + search", "PR outreach", "Events"],
                "confidence": "High - full toolkit available"
            }

    def create_messaging_framework(
        self,
        target_personas: List[str],
        value_propositions: List[str],
        brand_voice: str
    ) -> Dict[str, Any]:
        """
        Create messaging framework for Quick Start user.
        Simplified for immediate action.
        """
        return {
            "primary_message": value_propositions[0] if value_propositions else "Define your unique value",
            "elevator_pitch": f"We help {target_personas[0] if target_personas else 'businesses'} achieve {value_propositions[0] if value_propositions else 'their goals'}.",
            "key_messages": value_propositions[:3],
            "brand_voice": brand_voice,
            "quick_win": "Use this elevator pitch in your email signature and LinkedIn headline"
        }

    def design_channel_strategy(
        self,
        industry: str,
        target_audience: str,
        budget_level: str
    ) -> Dict[str, Any]:
        """
        Design channel strategy for Quick Start user.
        Prioritizes channels with quickest time-to-value.
        """
        if budget_level == "low":
            return {
                "primary_channels": ["Content Marketing (blog)", "LinkedIn Organic", "Email"],
                "rationale": "Low-cost, high-impact channels you can start today",
                "quick_win": "Publish one valuable blog post this week and share on LinkedIn"
            }
        elif budget_level == "medium":
            return {
                "primary_channels": ["Content Marketing", "LinkedIn Ads", "Email", "Google Ads"],
                "rationale": "Balanced mix of organic and paid for faster growth",
                "quick_win": "Set up $500 LinkedIn campaign targeting your ideal customer"
            }
        else:
            return {
                "primary_channels": ["Content Hub", "Multi-Channel Paid", "PR", "Events", "Email"],
                "rationale": "Full-funnel strategy across all major touchpoints",
                "quick_win": "Launch integrated campaign across 3 channels simultaneously"
            }

    def generate_content_pillars(
        self,
        business_goals: List[str],
        audience_interests: List[str],
        brand_themes: List[str]
    ) -> Dict[str, Any]:
        """
        Generate content pillars for Quick Start user.
        Focuses on 3-5 themes they can execute immediately.
        """
        # Create 3-5 pillars based on inputs
        pillars = []
        for i in range(min(5, max(len(business_goals), len(audience_interests), len(brand_themes)))):
            pillar_name = brand_themes[i] if i < len(brand_themes) else business_goals[i] if i < len(business_goals) else audience_interests[i]
            pillars.append({
                "name": pillar_name,
                "goal_alignment": business_goals[i] if i < len(business_goals) else "General awareness",
                "audience_interest": audience_interests[i] if i < len(audience_interests) else "Industry insights",
                "first_content_idea": f"How to {pillar_name.lower()}: A beginner's guide"
            })

        return {
            "pillars": pillars,
            "content_calendar_suggestion": "Rotate through pillars weekly - one pillar per week",
            "quick_win": f"Create your first piece of content about '{pillars[0]['name'] if pillars else 'your expertise'}' this week"
        }

    def plan_zero_budget_tactics(
        self,
        business_type: str,
        target_market: str,
        available_time: str
    ) -> Dict[str, Any]:
        """
        Plan zero-budget tactics for Quick Start user.
        Ultra-practical, can execute today.
        """
        return {
            "today": [
                "Optimize your LinkedIn profile with clear value proposition",
                "Join 3 relevant online communities (Reddit, Facebook groups, Slack)",
                "Set up Google My Business (if local)"
            ],
            "this_week": [
                "Write and publish one blog post addressing customer pain point",
                "Engage with 50 potential customers on LinkedIn (like, comment, connect)",
                "Send personalized emails to 20 ideal prospects"
            ],
            "this_month": [
                "Publish 4 blog posts (one per week)",
                "Build email list to 100 subscribers",
                "Get 5 customer testimonials",
                "Participate actively in 3 communities"
            ],
            "time_investment": f"{available_time} per week consistently beats sporadic effort"
        }

    def calculate_channel_roi(
        self,
        channel_name: str,
        monthly_spend: float,
        expected_conversions: int,
        average_order_value: float
    ) -> Dict[str, Any]:
        """Calculate and predict channel ROI for Quick Start user."""
        revenue = expected_conversions * average_order_value
        roi = ((revenue - monthly_spend) / monthly_spend * 100) if monthly_spend > 0 else 0

        return {
            "channel": channel_name,
            "investment": monthly_spend,
            "expected_revenue": revenue,
            "roi_percentage": round(roi, 2),
            "breakeven_conversions": int(monthly_spend / average_order_value) if average_order_value > 0 else 0,
            "recommendation": "Profitable - scale up" if roi > 100 else "Profitable - monitor" if roi > 0 else "Needs optimization"
        }

    def fetch_personas(
        self,
        filter_by: Optional[str] = None,
        include_insights: bool = False
    ) -> Dict[str, Any]:
        """Fetch all active personas from enterprise context."""
        # Use enterprise context loaded by EnterpriseBaseAgent
        if self.context and self.context.get('personas'):
            personas = self.context['personas']

            # Apply filter if specified
            if filter_by:
                personas = [p for p in personas if filter_by.lower() in str(p).lower()]

            return {
                "status": "success",
                "count": len(personas),
                "personas": personas,
                "message": f"Found {len(personas)} active personas"
            }
        else:
            return {
                "status": "error",
                "message": "No personas found in context",
                "personas": []
            }

    def fetch_persona_insights(
        self,
        persona_name: Optional[str] = None,
        insight_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch AI-learned insights about personas from enterprise context."""
        insights = []

        # Use enterprise context for persona intelligence
        if self.context and self.context.get('persona_intelligence'):
            all_insights = self.context['persona_intelligence']

            # Filter by persona name if specified
            if persona_name:
                insights = [i for i in all_insights if persona_name.lower() in str(i.get('data', '')).lower()]
            else:
                insights = all_insights

            # Filter by insight type if specified
            if insight_type:
                insights = [i for i in insights if i.get('insight_type') == insight_type]

        return {
            "status": "success",
            "count": len(insights),
            "insights": insights[:10],  # Limit to 10 most relevant
            "message": f"Found {len(insights)} insights"
        }

    async def save_marketing_strategy(
        self,
        strategy_title: str,
        positioning_statement: str,
        target_segments: List[str],
        messaging_framework: Dict[str, Any],
        channel_strategy: Dict[str, Any],
        budget_allocation: Dict[str, Any],
        content_pillars: List[str],
        executive_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """Save complete marketing strategy to database for Quick Start user."""
        try:
            from apps.api.utils.database import get_supabase_client
            from datetime import datetime

            supabase = get_supabase_client()
            session_id = getattr(self, 'current_session_id', None)

            # Ensure content_pillars is a list of strings
            if isinstance(content_pillars, dict):
                content_pillars = content_pillars.get('pillar_names', [])
            elif not isinstance(content_pillars, list):
                content_pillars = []

            # Prepare the marketing strategy data
            strategy_data = {
                'org_id': self.org_id,
                'campaign_id': self.campaign_id,
                'title': strategy_title,
                'positioning_statement': positioning_statement,
                'target_segments': target_segments,
                'messaging_framework': messaging_framework,
                'channel_strategy': channel_strategy,
                'budget_allocation': budget_allocation,
                'content_pillars': content_pillars,
                'metadata': {
                    'executive_summary': executive_summary,
                    'session_id': session_id,
                    'created_from_conversation': True,
                    'quick_start_generated': True
                },
                'status': 'draft',
                'created_by': self.user_id
            }

            # Check if a strategy already exists for this campaign (only if campaign_id is set)
            existing_data = None
            if self.campaign_id:
                try:
                    existing = supabase.table('marketing_strategies') \
                        .select('id') \
                        .eq('campaign_id', self.campaign_id) \
                        .single() \
                        .execute()
                    existing_data = existing.data
                except Exception as e:
                    logger.info(f"No existing strategy for campaign {self.campaign_id}: {e}")
                    existing_data = None

            if existing_data:
                # Update existing strategy
                result = supabase.table('marketing_strategies') \
                    .update(strategy_data) \
                    .eq('id', existing_data['id']) \
                    .execute()
                strategy_id = existing_data['id']
                logger.info(f"Updated existing marketing strategy: {strategy_id}")
            else:
                # Create new strategy
                result = supabase.table('marketing_strategies') \
                    .insert(strategy_data) \
                    .execute()
                strategy_id = result.data[0]['id'] if result.data else None
                logger.info(f"Created new marketing strategy: {strategy_id}")

            if strategy_id:
                return {
                    "status": "success",
                    "message": f"Marketing strategy '{strategy_title}' has been successfully saved",
                    "strategy_id": strategy_id,
                    "details": f"Saved {len(target_segments)} target segments, {len(content_pillars)} content pillars, and complete messaging framework"
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to save strategy - no ID returned"
                }

        except Exception as e:
            logger.error(f"Error saving marketing strategy: {e}")
            return {
                "status": "error",
                "message": f"Failed to save marketing strategy: {str(e)}"
            }

    async def list_marketing_strategies(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False
    ) -> Dict[str, Any]:
        """List existing marketing strategies from enterprise context."""
        # Use enterprise context for strategies
        if self.context and self.context.get('strategies'):
            strategies = self.context['strategies']

            # Apply pagination
            total = len(strategies)
            paginated = strategies[offset:offset + limit]

            return {
                "strategies": paginated,
                "total": total,
                "has_more": offset + limit < total,
                "message": f"Found {total} marketing strategies"
            }
        else:
            return {
                "strategies": [],
                "total": 0,
                "has_more": False,
                "message": "No marketing strategies found"
            }

    async def get_marketing_strategy_details(
        self,
        strategy_id: str
    ) -> Dict[str, Any]:
        """Get detailed information about a specific marketing strategy."""
        # Use enterprise context to find strategy
        if self.context and self.context.get('strategies'):
            for strategy in self.context['strategies']:
                if strategy.get('id') == strategy_id:
                    return {
                        "strategy": strategy,
                        "message": "Strategy details retrieved successfully"
                    }

        return {
            "strategy": None,
            "message": f"Strategy {strategy_id} not found"
        }

    async def save_quick_start_intelligence(
        self,
        intelligence_title: str,
        executive_summary: str,
        strategic_frameworks_applied: List[str],
        personas_created: List[str],
        recommended_channels: List[str],
        immediate_actions: List[str],
        budget_recommendation: str,
        timeline: str = "90 days"
    ) -> Dict[str, Any]:
        """
        Save the comprehensive Quick Start intelligence to agent_outputs.

        This captures the complete onboarding intelligence generation including:
        - Strategic analysis (SWOT, Porter's Five Forces, etc.)
        - Customer personas created
        - Marketing strategy recommendations
        - Channel and budget strategy
        - Immediate action steps

        Args:
            intelligence_title: Title for the saved intelligence (e.g., "Acme Corp Quick Start Intelligence")
            executive_summary: High-level summary of the comprehensive plan
            strategic_frameworks_applied: List of frameworks used (e.g., ["SWOT", "Porter's Five Forces"])
            personas_created: List of persona names generated
            recommended_channels: Priority channels for marketing (e.g., ["LinkedIn", "Content Marketing"])
            immediate_actions: List of "start today" actions
            budget_recommendation: Budget allocation summary
            timeline: Expected timeline for execution (default: "90 days")

        Returns:
            Dict with save confirmation and output_id
        """
        try:
            # Construct comprehensive intelligence content
            intelligence_content = {
                "title": intelligence_title,
                "executive_summary": executive_summary,
                "strategic_analysis": {
                    "frameworks_applied": strategic_frameworks_applied,
                    "key_findings": executive_summary
                },
                "customer_personas": {
                    "personas_created": personas_created,
                    "count": len(personas_created)
                },
                "marketing_strategy": {
                    "recommended_channels": recommended_channels,
                    "budget_recommendation": budget_recommendation,
                    "timeline": timeline
                },
                "immediate_actions": immediate_actions,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "session_id": getattr(self, 'current_session_id', None),
                "quick_start_complete": True
            }

            # Save to agent_outputs using UniversalOutputService
            universal_service = get_universal_output_service()
            session_id = getattr(self, 'current_session_id', None)

            result = await universal_service.save_agent_output(
                org_id=self.org_id,
                user_id=self.user_id,
                client_id=self.client_id,  # FIX: Pass client_id for agency multi-tenant schema routing
                agent_type="quick_start",
                output_type="quick_start_intelligence",
                title=intelligence_title,
                summary=executive_summary,
                content=intelligence_content,
                session_id=session_id,  # Pass session_id as parameter, not just in metadata
                campaign_id=self.campaign_id,  # Pass campaign_id as parameter too
                metadata={
                    "frameworks_count": len(strategic_frameworks_applied),
                    "personas_count": len(personas_created),
                    "channels_count": len(recommended_channels),
                    "quick_start_version": "1.0"
                }
            )

            output_id = result.get('id') if result else None

            if output_id:
                logger.info(f"✅ Saved Quick Start intelligence: {intelligence_title} (ID: {output_id})")
                return {
                    "status": "success",
                    "message": f"Quick Start intelligence '{intelligence_title}' has been saved successfully to your database",
                    "details": {
                        "frameworks_applied": len(strategic_frameworks_applied),
                        "personas_created": len(personas_created),
                        "recommended_channels": len(recommended_channels),
                        "immediate_actions": len(immediate_actions)
                    }
                }
            else:
                logger.error("Failed to save Quick Start intelligence - no output_id returned")
                return {
                    "status": "error",
                    "message": "Failed to save Quick Start intelligence - no ID returned"
                }

        except Exception as e:
            logger.error(f"Error saving Quick Start intelligence: {e}", exc_info=True)
            return {
                "status": "error",
                "message": f"Failed to save Quick Start intelligence: {str(e)}"
            }
