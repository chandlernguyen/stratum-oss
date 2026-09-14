"""
Direct Marketing Strategy Agent V2 - Migrated to use EnterpriseBaseAgent.
Bridges personas to content with comprehensive marketing strategies.
Database-first approach: All outputs are saved for cross-agent intelligence.
"""
from typing import Dict, Any, List, Optional, Tuple
import json
import logging
from datetime import datetime
from decimal import Decimal

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent, genai, types
from apps.api.models.agent_tools import (
    MarketingStrategy, ChannelStrategy, MessagingFramework, BudgetAllocation
)
from apps.api.utils.database import get_supabase_client
from apps.api.agents.tools.marketing_strategy_tools import MarketingStrategyTools
from apps.api.services.universal_output_service import get_universal_output_service

logger = logging.getLogger(__name__)

class DirectMarketingStrategyAgent(EnterpriseBaseAgent):
    def __init__(self, org_id: Optional[str] = None, campaign_id: Optional[str] = None, user_id: Optional[str] = None):
        """Initialize Marketing Strategy Agent with enterprise context."""
        # Store campaign_id before calling parent
        self.campaign_id = campaign_id

        # Initialize parent with enterprise context
        super().__init__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type=self.get_agent_type()
        )

        # Initialize MarketingStrategyTools for data management
        self.marketing_strategy_tools = MarketingStrategyTools(org_id=org_id, user_id=user_id)

        # Note: self.context is now loaded with all relevant data
        # No need for separate _load_personas_context, _load_existing_strategies, etc.
        
    def get_agent_type(self) -> str:
        """Define the agent type for context filtering."""
        return "marketing_strategy"
    
    def get_base_prompt(self) -> str:
        """Return the base system prompt without context."""
        return """You are an adaptive Marketing Strategy Consultant who reasons through each unique business situation rather than applying rigid rules.

I bridge the gap between understanding your customers (personas) and creating content by developing comprehensive marketing strategies that maximize ROI within your specific context.

I have access to 11 powerful tools:
- `LIST_STRATEGIES`: **View your existing marketing strategies and analysis**
- `GET_STRATEGY_DETAILS`: **Get details of a specific marketing strategy**
- `ANALYZE_BUDGET_EFFICIENCY`: Reason through optimal budget allocation
- `CREATE_MESSAGING_FRAMEWORK`: Develop comprehensive messaging for personas
- `DESIGN_CHANNEL_STRATEGY`: Select and prioritize marketing channels
- `GENERATE_CONTENT_PILLARS`: Define content themes and topics
- `PLAN_ZERO_BUDGET_TACTICS`: Create strategies requiring no monetary investment
- `CALCULATE_CHANNEL_ROI`: Predict and optimize channel performance
- `FETCH_PERSONAS`: Retrieve all customer personas with complete profiles
- `FETCH_PERSONA_INSIGHTS`: Access AI-learned insights about personas
- `SAVE_MARKETING_STRATEGY`: Save complete marketing strategies to database

**My Core Expertise:**

**1. Messaging Framework Development**
- Value propositions tailored to each persona
- Key messages with supporting proof points  
- Differentiation statements against competitors
- Elevator pitches for different contexts
- Pain point to solution mapping

**2. Dynamic Channel Strategy & Media Mix**
- I reason through your optimal media mix (Owned, Earned, Paid) based on your unique context
- The 70-20-10 rule is a useful starting point for many SMEs, but I adapt based on:
  • Your company stage (startup vs growth vs mature)
  • Your target market (regional platforms and behaviors)
  • Your industry dynamics (B2B vs B2C, purchase cycles)
  • Your budget constraints and growth goals
  • Your competitive landscape

**3. Go-to-Market Planning**
- Campaign concepts and creative briefs
- Content pillars and recurring themes (ALWAYS generate 3-5 content pillars)
- Promotional calendars aligned with business cycles
- Marketing funnel design with conversion optimization
- A/B testing frameworks for message validation

**4. Cost Optimization for SMEs**
- Zero-budget marketing strategies
- Bootstrap marketing plans starting from $0
- Progressive scaling as budget grows
- ROI-focused channel selection
- Resource maximization techniques

**5. Global & Regional Expertise**
I adapt strategies based on your market:
- **US Market**: Digital-first approach, data-driven optimization, omnichannel strategies
- **China**: WeChat/Douyin ecosystem, KOL marketing, social commerce focus
- **Japan**: Trust-building through quality content, LINE platform, long-term relationships
- **India**: Mobile-first, WhatsApp Business, vernacular content, price-sensitive tactics
- **Europe**: GDPR-compliant strategies, multi-language needs, owned media emphasis
- **Southeast Asia**: Super-app integration, social commerce, mobile-centric approaches

**Knowledge Patterns (Examples to Reason From, Not Rules):**

*Company Stage Patterns:*
- Pre-revenue startups often succeed with 90%+ owned media due to budget constraints
- Funded startups might invest 40% in paid channels for rapid experimentation
- Growth companies typically balance around 50-30-20 as they optimize
- Market leaders often use 70-20-10 to maximize margins

*Regional Considerations:*
- US B2B often sees 40% content marketing, 30% paid search, 30% other
- Chinese businesses may need 60%+ on WeChat/Douyin ecosystem
- Japanese companies often prefer 80%+ owned for trust-building
- Indian SMEs might focus 70%+ on mobile/WhatsApp channels

*Industry Patterns:*
- B2B SaaS: Content and SEO often drive 60%+ of pipeline
- E-commerce: Paid social and email might be 60%+ of revenue
- Local services: Local SEO and reputation typically 70%+ of success

Remember: These are patterns to reason from, not rules to follow. Every business is unique.

**My Reasoning Process:**
1. **Understand Your Specific Context**
   - I don't rigidly categorize - I understand nuances
   - I ask clarifying questions when critical information is missing
   - I consider unique circumstances that might override typical patterns

2. **Identify Tensions and Trade-offs**
   - Example: "You're a startup (needs growth) in Japan (values trust) - here's how to balance these"
   - I explain competing factors and how I'm weighing them

3. **Reason Through the Allocation**
   - I start from relevant patterns but adapt to your specifics
   - I explain WHY this allocation makes sense for YOUR business
   - I show how different factors influenced my thinking

4. **Provide Confidence and Alternatives**
   - I'm transparent about my assumptions
   - I offer alternative approaches if context changes
   - I invite dialogue to refine recommendations

**My Database-First Approach:**
Every strategy, framework, and recommendation I create is immediately saved to the database for reuse by other agents. This ensures:
- Content Agent can access messaging frameworks
- Campaign Execution Agent gets channel strategies
- Analytics Agent can track against strategic goals
- ROI Agent can measure budget efficiency


When you describe your business, I'll:
1. Reason through your specific context and constraints
2. Identify which patterns apply and which don't
3. Explain my thinking clearly
4. Ask clarifying questions to refine my recommendations
5. Create a complete, tailored marketing strategy

Let's have a strategic conversation, not just receive a prescription."""
    
    def _get_agent_tools(self) -> List:
        """
        Define the Marketing Strategy Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.
        """
        
        # Tool 1: Budget Efficiency Analysis - Reasoning-Based
        def analyze_budget_efficiency(
            monthly_budget: float, 
            business_context: str,
            company_stage: Optional[str] = None,
            target_market: Optional[str] = None
        ) -> Dict[str, Any]:
            """Reason through optimal budget allocation based on context, not rigid rules."""
            
            # Save context to database
            if self.campaign_id:
                self._save_to_database('budget_analysis', {
                    'monthly_budget': monthly_budget,
                    'business_context': business_context,
                    'company_stage': company_stage,
                    'target_market': target_market
                })
            
            # Build reasoning context
            reasoning_context = f"""
            Monthly Budget: ${monthly_budget}
            Business Context: {business_context}
            Company Stage: {company_stage or 'Not specified'}
            Target Market: {target_market or 'Not specified'}
            
            Based on this context, reason through the optimal allocation:
            1. What are the key constraints and opportunities?
            2. Which channels are most likely to work?
            3. What allocation balances growth with sustainability?
            """
            
            # Provide contextual recommendation based on patterns
            # This is where Gemini will reason, not follow rigid rules
            
            # For now, provide intelligent defaults that consider context
            if monthly_budget < 500:
                base_strategy = {
                    "strategy_name": "Bootstrap Growth",
                    "reasoning": f"With ${monthly_budget}/month, focus on owned media for sustainable growth. "
                                f"{'As a ' + company_stage if company_stage else 'Your business'} "
                                f"{'targeting ' + target_market if target_market else ''} "
                                f"should prioritize organic channels that compound over time.",
                    "allocation": {
                        "owned": 80,
                        "earned": 15,
                        "paid": 5
                    },
                    "confidence": "Medium - would benefit from more context about your industry and goals"
                }
            elif monthly_budget < 2000:
                base_strategy = {
                    "strategy_name": "Selective Paid Growth",
                    "reasoning": f"With ${monthly_budget}/month budget, you can start testing paid channels. "
                                f"{'As a ' + company_stage if company_stage else 'Your'} business "
                                f"should balance organic growth with targeted paid experiments.",
                    "allocation": {
                        "owned": 60,
                        "earned": 20,
                        "paid": 20
                    },
                    "confidence": "Medium - allocation may shift based on your specific industry dynamics"
                }
            else:
                base_strategy = {
                    "strategy_name": "Balanced Growth Strategy",
                    "reasoning": f"With ${monthly_budget}/month, you have flexibility to optimize across all channels. "
                                f"This balanced approach allows for testing while maintaining strong organic presence.",
                    "allocation": {
                        "owned": 50,
                        "earned": 20,
                        "paid": 30
                    },
                    "confidence": "High - this provides a strong starting point for optimization"
                }
            
            # Add context from enterprise data if available
            if self.context and self.context.get('company'):
                company = self.context['company']
                if company.get('company_stage'):
                    base_strategy['reasoning'] += f" Given your {company['company_stage']} stage, this allocation aligns with typical patterns."
            
            return base_strategy
        
        # Tool 2: Messaging Framework
        def create_messaging_framework(
            target_personas: List[str],
            value_propositions: List[str],
            brand_voice: str
        ) -> Dict[str, Any]:
            """Create comprehensive messaging tailored to each persona."""
            
            framework = {
                "primary_message": f"Core value: {value_propositions[0] if value_propositions else 'Define your unique value'}",
                "persona_messages": {},
                "proof_points": [],
                "differentiators": [],
                "elevator_pitches": {}
            }
            
            # Use enterprise context to enhance messaging
            if self.context and self.context.get('personas'):
                for persona in self.context['personas']:
                    if persona.get('name') in target_personas:
                        # Create persona-specific messaging
                        pain_points = persona.get('pain_points', [])
                        goals = persona.get('goals', [])
                        
                        framework["persona_messages"][persona['name']] = {
                            "headline": f"Helping {persona.get('title', 'professionals')} achieve {goals[0] if goals else 'success'}",
                            "pain_point_addressed": pain_points[0] if pain_points else "Key challenges",
                            "value_delivered": f"Solution that {value_propositions[0] if value_propositions else 'delivers results'}"
                        }
            
            # Save to database
            if self.campaign_id:
                self._save_to_database('messaging_framework', framework)
            
            return framework
        
        # Tool 3: Channel Strategy
        def design_channel_strategy(
            industry: str,
            target_audience: str,
            budget_level: str
        ) -> Dict[str, Any]:
            """Design optimal channel mix based on context."""
            
            strategy = {
                "primary_channels": [],
                "secondary_channels": [],
                "experimental_channels": [],
                "channel_rationale": {},
                "content_types": []
            }
            
            # Use enterprise context for intelligent channel selection
            if self.context and self.context.get('strategies'):
                # Learn from existing strategies
                for existing_strategy in self.context['strategies']:
                    if existing_strategy.get('channel_mix'):
                        # Adapt based on what's working
                        strategy["primary_channels"] = list(existing_strategy['channel_mix'].keys())[:3]
                        break
            
            # Default intelligent recommendations
            if not strategy["primary_channels"]:
                if budget_level == "low":
                    strategy["primary_channels"] = ["Content Marketing", "Email", "Social Media Organic"]
                elif budget_level == "medium":
                    strategy["primary_channels"] = ["Content Marketing", "Paid Search", "Social Media Mix"]
                else:
                    strategy["primary_channels"] = ["Multi-Channel", "Paid Search", "Paid Social", "Content Marketing"]
            
            # Save to database
            if self.campaign_id:
                self._save_to_database('channel_strategy', strategy)
            
            return strategy
        
        # Tool 4: Content Pillars
        def generate_content_pillars(
            business_goals: List[str],
            audience_interests: List[str],
            brand_themes: List[str]
        ) -> Dict[str, Any]:
            """Generate content pillars aligned with business and audience needs."""

            # Create main pillar names/themes
            pillar_names = []
            pillar_details = []

            # Create intelligent pillars based on inputs
            for i, goal in enumerate(business_goals[:4]):  # Max 4 pillars
                pillar_name = brand_themes[i] if i < len(brand_themes) else goal
                pillar_names.append(pillar_name)

                pillar = {
                    "name": pillar_name,
                    "theme": goal,
                    "audience_interest": audience_interests[i] if i < len(audience_interests) else "General interest",
                    "content_ideas": [
                        f"How-to guide for {goal}",
                        f"Case study: {goal} success",
                        f"Expert interview on {goal}"
                    ]
                }
                pillar_details.append(pillar)

            result = {
                "pillars": pillar_details,
                "pillar_names": pillar_names,  # Simple list for database
                "content_calendar": {},
                "content_types": [],
                "distribution_plan": {}
            }

            # Save to database - both outputs table and main table
            if self.campaign_id:
                self._save_to_database('content_pillars', result)

                # Also update the main marketing_strategies table
                try:
                    supabase = get_supabase_client()
                    supabase.table('marketing_strategies') \
                        .update({'content_pillars': pillar_names}) \
                        .eq('campaign_id', self.campaign_id) \
                        .execute()
                    logger.info(f"Updated content_pillars in marketing_strategies table: {pillar_names}")
                except Exception as e:
                    logger.error(f"Failed to update content_pillars: {e}")

            return result
        
        # Tool 5: Zero Budget Tactics
        def plan_zero_budget_tactics(
            business_type: str,
            target_market: str,
            available_time: str
        ) -> Dict[str, Any]:
            """Create marketing strategies requiring no monetary investment."""
            
            tactics = {
                "immediate_actions": [],
                "weekly_activities": [],
                "monthly_goals": [],
                "expected_results": {},
                "time_investment": available_time
            }
            
            # Intelligent zero-budget recommendations
            tactics["immediate_actions"] = [
                "Optimize Google My Business listing",
                "Create valuable content from existing knowledge",
                "Engage in relevant online communities",
                "Start an email list with current contacts"
            ]
            
            tactics["weekly_activities"] = [
                "Post valuable content 3x per week",
                "Engage with 20 potential customers",
                "Answer 5 questions in your industry forums",
                "Send one valuable email to your list"
            ]
            
            # Save to database
            if self.campaign_id:
                self._save_to_database('zero_budget_tactics', tactics)
            
            return tactics
        
        # Tool 6: Channel ROI Calculator
        def calculate_channel_roi(
            channel_name: str,
            monthly_spend: float,
            expected_conversions: int,
            average_order_value: float
        ) -> Dict[str, Any]:
            """Calculate and predict channel ROI."""
            
            revenue = expected_conversions * average_order_value
            roi = ((revenue - monthly_spend) / monthly_spend * 100) if monthly_spend > 0 else 0
            
            result = {
                "channel": channel_name,
                "investment": monthly_spend,
                "expected_revenue": revenue,
                "roi_percentage": round(roi, 2),
                "breakeven_conversions": int(monthly_spend / average_order_value) if average_order_value > 0 else 0,
                "recommendation": "Profitable" if roi > 0 else "Needs optimization"
            }
            
            # Save to database
            if self.campaign_id:
                self._save_to_database('channel_roi', result)
            
            return result
        
        # Tool 7: Fetch Personas (Enhanced with enterprise context)
        def fetch_personas(
            filter_by: Optional[str] = None,
            include_insights: bool = False
        ) -> Dict[str, Any]:
            """Fetch all active personas for the organization."""
            
            # Use enterprise context instead of direct database query
            if self.context and self.context.get('personas'):
                personas = self.context['personas']
                
                # Apply filter if specified
                if filter_by:
                    personas = [p for p in personas if filter_by.lower() in str(p).lower()]
                
                return {
                    "status": "success",
                    "count": len(personas),
                    "personas": personas,
                    "message": f"Found {len(personas)} active personas from enterprise context"
                }
            else:
                return {
                    "status": "error",
                    "message": "No personas found in context",
                    "personas": []
                }
        
        # Tool 8: Fetch Persona Insights
        def fetch_persona_insights(
            persona_name: Optional[str] = None,
            insight_type: Optional[str] = None
        ) -> Dict[str, Any]:
            """Fetch AI-learned insights about personas."""
            
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
        
        # Return raw callables - SDK automatically converts to FunctionDeclaration
        # This enables hybrid streaming (raw callables + AFC disabled + manual multi-turn)
        tools = [
            # Core marketing strategy tools
            analyze_budget_efficiency,
            create_messaging_framework,
            design_channel_strategy,
            generate_content_pillars,
            plan_zero_budget_tactics,
            calculate_channel_roi,
            # Persona integration tools
            fetch_personas,
            fetch_persona_insights,
            # Strategy management tools
            self.save_marketing_strategy,
            self.list_strategies,
            self.get_strategy_details,
        ]

        logger.info(f"Marketing Strategy agent created {len(tools)} raw callable tools successfully")
        return tools

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
        """Save a complete marketing strategy to the database for future reference and cross-agent use."""

        try:
            supabase = get_supabase_client()
            session_id = getattr(self, 'current_session_id', None)

            # Ensure content_pillars is a list of strings
            if isinstance(content_pillars, dict):
                # If it's the detailed dict from generate_content_pillars
                content_pillars = content_pillars.get('pillar_names', [])
            elif not isinstance(content_pillars, list):
                content_pillars = []

            # Prepare the marketing strategy data
            # Note: Database column is 'channel_mix', not 'channel_strategy'
            strategy_data = {
                'org_id': self.org_id,
                'campaign_id': self.campaign_id,
                'title': strategy_title,
                'positioning_statement': positioning_statement,
                'channel_mix': channel_strategy,  # Database column is 'channel_mix'
                'budget_allocation': budget_allocation,
                'content_pillars': content_pillars,
                'metadata': {
                    'target_segments': target_segments,  # Moved to metadata since no DB column
                    'messaging_framework': messaging_framework,  # Moved to metadata since no DB column
                    'executive_summary': executive_summary,
                    'session_id': session_id,
                    'created_from_conversation': True,
                    'detected_and_saved': True
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
                # Also save detailed output for history
                output_record = {
                    'strategy_id': strategy_id,
                    'output_type': 'complete_strategy',
                    'output_data': {
                        'title': strategy_title,
                        'positioning_statement': positioning_statement,
                        'target_segments': target_segments,
                        'messaging_framework': messaging_framework,
                        'channel_strategy': channel_strategy,
                        'budget_allocation': budget_allocation,
                        'content_pillars': content_pillars,
                        'executive_summary': executive_summary,
                        'saved_at': datetime.now().isoformat()
                    }
                }
                # Save to agent_outputs table using UniversalOutputService
                universal_service = get_universal_output_service()
                await universal_service.save_agent_output(
                    org_id=self.org_id,
                    user_id=self.user_id,
                    client_id=self.client_id,  # FIX: Pass client_id for agency multi-tenant schema routing
                    agent_type="marketing_strategy",
                    output_type="strategy_recommendation",
                    title=strategy_title,
                    summary=executive_summary or positioning_statement,
                    content=output_record['output_data'],
                    session_id=session_id,
                    campaign_id=self.campaign_id,
                    metadata={
                        "strategy_id": strategy_id,
                        "has_legacy_strategy_record": True,
                        "fixed_date": "2025-11-14"
                    }
                )

                # Save as AI insight for cross-agent visibility
                insight_data = {
                    'org_id': self.org_id,
                    'user_id': self.user_id,
                    'insight_type': 'recommendation',
                    'source_type': 'agent_conversation',
                    'source_agent': 'marketing_strategy',
                    'session_id': session_id,
                    'title': f"Marketing Strategy: {strategy_title}",
                    'content': {
                        'positioning': positioning_statement,
                        'segments': target_segments,
                        'pillars': content_pillars,
                        'summary': executive_summary or positioning_statement
                    },
                    'category': ['marketing', 'strategy', 'saved'],
                    'confidence_score': 0.95,
                    'validation_status': 'approved',
                    'impact_score': 90
                }

                try:
                    insight_result = supabase.table('ai_insights').insert(insight_data).execute()
                    if insight_result.data:
                        logger.info("Successfully saved marketing strategy as AI insight")
                except Exception as e:
                    logger.error(f"Failed to save as AI insight: {e}")

                return {
                    "status": "success",
                    "message": f"Marketing strategy '{strategy_title}' has been successfully saved to your database",
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

    def _save_to_database(self, output_type: str, data: Dict[str, Any]) -> None:
        """Save all outputs to database for cross-agent reuse."""
        if not self.campaign_id:
            return
            
        try:
            supabase = get_supabase_client()
            
            # First, ensure marketing_strategies record exists
            strategy_result = supabase.table('marketing_strategies') \
                .select('id') \
                .eq('campaign_id', self.campaign_id) \
                .single() \
                .execute()
            
            if strategy_result.data:
                strategy_id = strategy_result.data['id']
            else:
                # Create new strategy record
                new_strategy = {
                    'org_id': self.org_id,
                    'campaign_id': self.campaign_id,
                    'channel_mix': {},
                    'budget_allocation': {},
                    'content_pillars': []
                }
                strategy_result = supabase.table('marketing_strategies') \
                    .insert(new_strategy) \
                    .execute()
                strategy_id = strategy_result.data[0]['id']
            
            # 🚀 NUCLEAR: Save output to agent_outputs table using UniversalOutputService
            universal_service = get_universal_output_service()
            # await universal_service.save_agent_output(
            #     org_id=self.org_id,
            #     user_id=self.user_id,
            #     agent_type="marketing_strategy",
            #     output_type=output_type,
            #     title=f"Marketing Strategy Output - {output_type}",
            #     summary=f"Strategic output of type {output_type}",
            #     content=data,
            #     metadata={
            #         "strategy_id": strategy_id,
            #         "output_type": output_type,
            #         "org_id": self.org_id,
            #         "nuclear_migration": "2025-09-23"
            #     }
            # )
                
            logger.info(f"Saved {output_type} to database for cross-agent use")
            
        except Exception as e:
            logger.error(f"Failed to save to database: {e}")
    
    # Note: We no longer need execute_function() as BaseGeminiAgent handles tool execution
    # The tools are now properly callable functions that BaseGeminiAgent can execute directly
    
    # Remove these methods as they're replaced by EnterpriseContextService:
    # - _load_personas_context()
    # - _load_business_intelligence()
    # - _load_existing_strategies()
    # - _load_persona_intelligence()
    
    def _get_additional_context(self) -> str:
        """Add marketing strategy specific context to the prompt."""
        context_parts = []
        
        # Add any marketing-strategy-specific context formatting here
        # Most context is already handled by EnterpriseBaseAgent
        
        # 🚀 NUCLEAR: Add recent marketing outputs from agent_outputs table
        if self.context and self.context.get('agent_outputs'):
            marketing_outputs = [o for o in self.context['agent_outputs'] if o.get('agent_type') == 'marketing_strategy']
            if marketing_outputs:
                context_parts.append("\n[RECENT MARKETING OUTPUTS]")
                for output in marketing_outputs[:3]:
                    context_parts.append(f"• {output.get('output_type', 'Unknown')}: Created {output.get('created_at', 'recently')}")
        
        return "\n".join(context_parts) if context_parts else ""

    async def list_strategies(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List marketing strategies using MarketingStrategyTools.

        Args:
            limit: Maximum number of items to return
            offset: Pagination offset
            include_archived: Whether to include archived items
            status: Optional filter by strategy status

        Returns:
            Dictionary with strategy list
        """
        logger.info(f"Listing marketing strategies with status: {status}")

        # Initialize tools if not already done
        if not self.marketing_strategy_tools:
            self.marketing_strategy_tools = MarketingStrategyTools(org_id=self.org_id, user_id=self.user_id)

        if status:
            result = await self.marketing_strategy_tools.list_strategies_by_status(
                status=status,
                limit=limit
            )
        else:
            result = await self.marketing_strategy_tools.list_resources(
                limit=limit,
                offset=offset,
                include_archived=include_archived
            )

        # Transform to expected format
        if result.get("success"):
            return {
                "strategies": result.get("resources", []),
                "total": result.get("total", 0),
                "message": result.get("message", "Strategies retrieved")
            }
        else:
            return {
                "strategies": [],
                "total": 0,
                "error": result.get("error", "Failed to retrieve strategies")
            }

    async def get_strategy_details(
        self,
        strategy_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed marketing strategy using MarketingStrategyTools.

        Args:
            strategy_id: UUID of the strategy

        Returns:
            Dictionary with strategy details
        """
        logger.info(f"Getting strategy details for: {strategy_id}")

        # Initialize tools if not already done
        if not self.marketing_strategy_tools:
            self.marketing_strategy_tools = MarketingStrategyTools(org_id=self.org_id, user_id=self.user_id)

        result = await self.marketing_strategy_tools.get_resource_details(strategy_id)

        # Transform to expected format
        if result.get("success"):
            return {
                "strategy": result.get("resource"),
                "message": result.get("message", "Strategy details retrieved")
            }
        else:
            return {
                "strategy": None,
                "error": result.get("error", "Failed to retrieve strategy details")
            }