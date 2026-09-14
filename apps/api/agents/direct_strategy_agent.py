"""
Direct Strategy Agent - Migrated to use EnterpriseBaseAgent.
Tools return data/context, not generated content.
"""
from typing import Dict, Any, Optional, List
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent, genai, types
from apps.api.models.agent_tools import (
    SWOTAnalysis, PortersFiveForces, BusinessModelCanvas, ICEPrioritization, ICEScore,
    BCGMatrix, BCGMatrixItem, VRIOAnalysis, VRIOResource, ThreeHorizons, HorizonItem,
    BlueOceanStrategy, BlueOceanFactors, McKinsey7S, McKinsey7SElement,
    OKRFramework, OKRItem, JobsToBeDone, JobToBeDone
)
from apps.api.utils.database import get_supabase_client
from apps.api.services.insight_capture import get_insight_capture_service
from apps.api.agents.strategy_tools.portfolio_tools import StrategyPortfolioTools
from apps.api.services.universal_output_service import get_universal_output_service
from apps.api.agents.strategy_tools.analytical_tools import StrategyAnalyticalTools
from apps.api.agents.strategy_tools.framework_tools import StrategyFrameworkTools
from apps.api.agents.strategy_tools.objectives_tools import StrategyObjectivesTools
from apps.api.agents.tools.strategy_tools import StrategyTools  # Phase 4: BaseResourceTools
from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.config.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)

class DirectStrategyAgent(EnterpriseBaseAgent):
    def __init__(self, **kwargs):
        pass

    async def __ainit__(
        self,
        org_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        user_id: Optional[str] = None,
        org_type: Optional[str] = None,  # Week 4: Schema routing
        client_id: Optional[str] = None,  # Week 4: Agency client scoping
        locale: str = "en"  # Localization: User's preferred language
    ):
        """Asynchronously initialize Strategy Agent with enterprise context."""
        # Store campaign_id before calling parent
        self.campaign_id = campaign_id

        # Initialize parent with enterprise context
        await super().__ainit__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type=self.get_agent_type(),
            org_type=org_type,  # Week 4: Pass to parent for schema routing
            client_id=client_id,  # Week 4: Pass to parent for client scoping
            locale=locale  # Localization: Pass to parent for prompt loading
        )

        # Initialize strategy tool modules
        self.analytical_tools = StrategyAnalyticalTools(self)
        self.portfolio_tools = StrategyPortfolioTools(self)
        self.framework_tools = StrategyFrameworkTools(self)
        self.objectives_tools = StrategyObjectivesTools(self)

        # Phase 4: Initialize StrategyTools from BaseResourceTools
        self.strategy_tools = StrategyTools(org_id=org_id, user_id=user_id)

        # Note: self.context is now loaded with all relevant data
        # No need for separate context loading methods
    
    def get_agent_type(self) -> str:
        """Define the agent type for context filtering."""
        return "strategy"
    
    def get_base_prompt(self) -> str:
        """Return the base system prompt without context."""
        return """Welcome! Let's tackle your business challenges together. I'm here to help you find clarity and build a winning strategy using proven frameworks from top consulting firms.

I specialize in modern strategic frameworks including:

**Core Analysis Tools:**
- SWOT Analysis - Understanding internal strengths/weaknesses and external opportunities/threats
- Porter's Five Forces - Analyzing competitive dynamics and industry attractiveness
- Business Model Canvas - Visualizing your entire business model on one page
- ICE Scoring - Prioritizing initiatives by Impact, Confidence, and Ease

**Growth & Innovation Frameworks:**
- Three Horizons of Growth (McKinsey) - Balancing core business (H1), emerging opportunities (H2), and future disruption (H3)
- Blue Ocean Strategy - Creating uncontested market spaces instead of competing in crowded markets
- Jobs to Be Done (JTBD) - Understanding what "job" customers hire your product to do
- BCG Growth-Share Matrix - Portfolio analysis (Stars, Cash Cows, Dogs, Question Marks)

**Organizational Excellence:**
- VRIO Framework - Identifying sustainable competitive advantages (Value, Rarity, Imitability, Organization)
- McKinsey 7S - Aligning all organizational elements for peak performance
- OKRs - Setting clear objectives and measurable key results

**Geographic & Cultural Considerations:**
I adapt my analysis based on your market context:
- Emerging Markets: Focus on localization, partnerships, and distribution challenges
- Asia: Consider technological leapfrogging, scale opportunities, and regulatory complexity
- Developed Markets: Emphasis on efficiency, consolidation, M&A, and ESG factors

When you share a challenge, I'll:
1. Apply 2+ relevant frameworks for comprehensive, multi-angle analysis
2. Provide specific, actionable recommendations with clear prioritization
3. Consider your unique context (geography, industry maturity, resources, competitive landscape)
4. Balance quick wins with long-term strategic positioning
5. Account for digital transformation and sustainability trends

I have access to 14 powerful tools:
- `LIST_STRATEGIES`: **View your existing strategy analyses** - List all saved strategies
- `GET_STRATEGY_DETAILS`: **Get details of a specific strategy** - Retrieve complete strategy information
- `GET_SWOT_ANALYSIS`: Provides SWOT framework templates and existing analysis data
- `GET_PORTERS_FIVE_FORCES`: Returns industry analysis templates and competitive data
- `GET_BUSINESS_MODEL_CANVAS`: Supplies business model templates and examples
- `GET_ICE_SCORING`: Provides prioritization frameworks and scoring templates
- `GET_BCG_MATRIX`: Returns portfolio analysis templates and benchmarks
- `GET_VRIO_ANALYSIS`: Supplies competitive advantage assessment templates
- `GET_THREE_HORIZONS`: Provides growth planning templates and horizon definitions
- `GET_BLUE_OCEAN_STRATEGY`: Returns ERRC framework templates and value innovation guides
- `GET_MCKINSEY_7S`: Supplies organizational alignment templates and assessment guides
- `GET_OKR_FRAMEWORK`: Provides OKR templates and goal-setting best practices
- `GET_JOBS_TO_BE_DONE`: Returns JTBD framework templates and customer analysis guides
- `SAVE_STRATEGY_SYNTHESIS`: **Save our strategic analysis to your database** (use when you ask me to save)

**IMPORTANT**: When you ask me to "save this strategy" or "help me save this", I will use the `SAVE_STRATEGY_SYNTHESIS` tool to:
- Analyze our entire conversation
- Extract key strategic insights and frameworks used
- Synthesize priorities and action items
- Save everything to your strategy database for future reference

What's on your mind today? We can explore strategic questions, analyze competitive landscapes, or simply start with what's most important to you right now."""
    
    def _get_agent_tools(self) -> List[types.Tool]:
        """Define the Strategy Agent's tools."""

        try:
            # Initialize client
            client = get_gemini_client()

            # Initialize StrategyTools if not already done
            if not hasattr(self, 'strategy_tools') or not self.strategy_tools:
                self.strategy_tools = StrategyTools(org_id=self.org_id, user_id=self.user_id)

            # Define tools as raw Python callables (Google's recommended pattern)
            # AFC (Automatic Function Calling) will handle function execution automatically
            # Phase 4: Now includes data access tools from BaseResourceTools
            tools = [
                # Data access tools from BaseResourceTools
                self.list_strategies,
                self.get_strategy_details,
                # Framework tools
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
            ]
            logger.info(f"Strategy agent created {len(tools)} raw callable tools successfully")
            return tools
        except Exception as e:
            logger.error(f"Error creating strategy agent tools: {e}")
            return []  # Return empty list instead of None
    
    # NOTE: Progressive learning (profile + metrics extraction) is handled by parent
    # EnterpriseBaseAgent via ProgressiveLearningService.process_conversation_update()
    # with proper multi-tenant routing. No override needed.

    async def get_swot_analysis(self, business_context: str) -> Dict[str, Any]:
        """
        Provides SWOT analysis templates and retrieves existing analysis data.
        Returns data for the model to use, not generated content.
        """
        return await self.analytical_tools.get_swot_analysis(business_context)

    async def get_porters_five_forces(self, industry_context: str) -> Dict[str, Any]:
        """
        Provides Porter's Five Forces templates and industry analysis data.
        Returns data for the model to use, not generated content.
        """
        return await self.analytical_tools.get_porters_five_forces(industry_context)


    async def get_ice_scoring(self, decision_context: str, options: str) -> Dict[str, Any]:
        """
        Provides ICE scoring templates and prioritization frameworks.
        Returns data for the model to use, not generated content.
        """
        return await self.framework_tools.get_ice_scoring(decision_context, options)


    async def get_vrio_analysis(self, business_context: str, resources_capabilities: str) -> Dict[str, Any]:
        """
        Provides VRIO analysis templates and competitive advantage frameworks.
        Returns data for the model to use, not generated content.
        """
        return await self.analytical_tools.get_vrio_analysis(business_context, resources_capabilities)


    async def get_blue_ocean_strategy(self, business_context: str, industry_description: str) -> Dict[str, Any]:
        """
        Provides Blue Ocean Strategy templates and value innovation frameworks.
        Returns data for the model to use, not generated content.
        """
        return await self.framework_tools.get_blue_ocean_strategy(business_context, industry_description)

    async def get_mckinsey_7s(self, business_context: str, organizational_challenge: str) -> Dict[str, Any]:
        """
        Provides McKinsey 7S framework templates and organizational analysis tools.
        Returns data for the model to use, not generated content.
        """
        return await self.framework_tools.get_mckinsey_7s(business_context, organizational_challenge)

    async def get_okr_framework(self, business_context: str, strategic_goals: str, time_horizon: str = "quarterly") -> Dict[str, Any]:
        """
        Provides OKR framework templates and goal-setting best practices.
        Returns data for the model to use, not generated content.
        """
        return await self.objectives_tools.get_okr_framework(business_context, strategic_goals, time_horizon)

    async def get_jobs_to_be_done(self, business_context: str, target_customers: str, product_category: str) -> Dict[str, Any]:
        """
        Provides Jobs to Be Done framework templates and customer analysis tools.
        Returns data for the model to use, not generated content.
        """
        return await self.objectives_tools.get_jobs_to_be_done(business_context, target_customers, product_category)

    # Portfolio Management and Business Model Tools (delegated to StrategyPortfolioTools)

    async def get_bcg_matrix(self, business_context: str, products_or_units: str) -> Dict[str, Any]:
        """
        Provides BCG Matrix templates and portfolio analysis frameworks.
        Returns data for the model to use, not generated content.
        """
        return await self.portfolio_tools.get_bcg_matrix(business_context, products_or_units)

    async def get_business_model_canvas(self, business_description: str) -> Dict[str, Any]:
        """
        Provides Business Model Canvas templates and business model examples.
        Returns data for the model to use, not generated content.
        """
        return await self.portfolio_tools.get_business_model_canvas(business_description)

    async def get_three_horizons(self, business_context: str, growth_objectives: str) -> Dict[str, Any]:
        """
        Provides Three Horizons growth planning templates and frameworks.
        Returns data for the model to use, not generated content.
        """
        return await self.portfolio_tools.get_three_horizons(business_context, growth_objectives)



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
        """
        Save a synthesized strategy from the conversation.
        The LLM will analyze the chat history and extract key strategic insights.

        Args:
            strategy_title: A concise title for this strategy
            executive_summary: 2-3 paragraph summary of the strategic analysis
            key_frameworks_used: List of frameworks applied (e.g., ["SWOT", "Porter's Five Forces"])
            strategic_priorities: Top 3-5 strategic priorities identified
            recommended_actions: List of specific actions with timeframes
            expected_outcomes: Expected results from implementing this strategy
            implementation_timeline: Overall timeline (e.g., "Q1 2024 - Q4 2024")

        Returns:
            Confirmation of save with strategy ID
        """
        try:
            supabase = get_supabase_client()

            # Get session context
            session_id = getattr(self, 'current_session_id', str(uuid.uuid4()))

            # Prepare the strategy data
            strategy_data = {
                "session_id": session_id,
                "org_id": self.org_id,
                "user_id": self.user_id,
                "framework_type": "strategy_synthesis",
                "framework_data": {
                    "title": strategy_title,
                    "executive_summary": executive_summary,
                    "frameworks_used": key_frameworks_used,
                    "strategic_priorities": strategic_priorities,
                    "recommended_actions": recommended_actions,
                    "expected_outcomes": expected_outcomes,
                    "implementation_timeline": implementation_timeline,
                    "synthesis_timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_type": "strategy"
                },
                "metadata": {
                    "campaign_id": self.campaign_id,
                    "synthesized_from_conversation": True,
                    "frameworks_count": len(key_frameworks_used),
                    "actions_count": len(recommended_actions)
                },
                "created_by": self.user_id,
                "updated_by": self.user_id
            }

            # 🚀 NUCLEAR: Save to agent_outputs table using UniversalOutputService
            universal_service = get_universal_output_service()
            result = await universal_service.save_agent_output(
                org_id=self.org_id,
                user_id=self.user_id,
                client_id=self.client_id,  # FIX: Pass client_id for agency multi-tenant schema routing
                agent_type="strategy",
                output_type=strategy_data.get("framework_type", "strategy_synthesis"),
                title=strategy_data.get("title", "Strategy Analysis"),
                summary=strategy_data.get("executive_summary", "Strategic analysis and recommendations"),
                content=strategy_data.get("framework_data", {}),
                metadata={
                    "framework_type": strategy_data.get("framework_type"),
                    "analysis_type": strategy_data.get("analysis_type"),
                    "org_id": self.org_id,
                    "nuclear_migration": "2025-09-23"
                }
            )

            if result:
                strategy_id = result['id']
                logger.info(f"🚀 NUCLEAR: Successfully saved strategy synthesis: {strategy_id}")

                # Also save as an AI insight for cross-agent visibility
                insight_data = {
                    'org_id': self.org_id,
                    'user_id': self.user_id,
                    'insight_type': 'recommendation',  # Changed from 'strategy' to valid value
                    'source_type': 'agent_conversation',  # Changed from 'agent_synthesis' to valid value
                    'source_agent': 'strategy',
                    'session_id': session_id,
                    'title': f"Strategy: {strategy_title}",
                    'content': {
                        'summary': executive_summary,
                        'priorities': strategic_priorities,
                        'frameworks': key_frameworks_used
                    },
                    'category': ['strategy', 'synthesis', 'saved'],
                    'confidence_score': 0.95,
                    'validation_status': 'approved',
                    'impact_score': 95
                }

                try:
                    insight_result = supabase.table('ai_insights').insert(insight_data).execute()
                    if insight_result.data:
                        logger.info(f"Successfully saved strategy as AI insight")
                    else:
                        logger.warning(f"Failed to save strategy as AI insight - no data returned")
                except Exception as insight_error:
                    logger.error(f"Failed to save strategy as AI insight: {insight_error}")
                    # Continue anyway since the main strategy was saved

                return {
                    "status": "success",
                    "message": f"Strategy '{strategy_title}' has been successfully saved to your database",
                    "details": f"Saved {len(strategic_priorities)} priorities and {len(recommended_actions)} action items"
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to save strategy to database"
                }

        except Exception as e:
            logger.error(f"Error saving strategy synthesis: {e}")
            return {
                "status": "error",
                "message": f"Failed to save strategy: {str(e)}"
            }

    async def save_strategy_analysis(self, framework_type: str, analysis_data: Dict[str, Any], business_context: str) -> Optional[str]:
        """Save strategy analysis to database for cross-agent intelligence."""
        try:
            supabase = get_supabase_client()
            
            # Use enterprise context data
            org_id = self.org_id
            campaign_id = self.campaign_id or getattr(self, 'current_campaign_id', None)
            user_id = self.user_id
            session_id = getattr(self, 'current_session_id', None)
            
            logger.info(f"Strategy save context - org_id: {org_id}, user_id: {user_id}, session_id: {session_id}")
            
            # Skip database save if no valid org_id
            if not org_id:
                logger.warning("Skipping database save - no org_id in context")
                return None
            
            # Prepare base data structure
            data = {
                'org_id': org_id,
                'output_type': framework_type,
                'analysis_data': {
                    'business_context': business_context,
                    'framework_data': analysis_data,
                    'timestamp': str(uuid.uuid4())[:8]
                },
                'created_by': user_id,
                'tags': [framework_type, 'strategy', 'analysis'],
                'visibility': ['persona', 'content', 'analytics'],
                'confidence_score': 0.85,
                'data_sources': ['user_input', 'gemini_analysis']
            }
            
            # Add framework-specific fields based on type
            if framework_type == 'swot' and 'strengths' in analysis_data:
                data.update({
                    'strengths': analysis_data.get('strengths', []),
                    'weaknesses': analysis_data.get('weaknesses', []),
                    'opportunities': analysis_data.get('opportunities', []),
                    'threats': analysis_data.get('threats', [])
                })
            
            # Add optional fields
            if campaign_id:
                data['campaign_id'] = campaign_id
            if session_id:
                data['session_id'] = session_id
            
            # 🚀 NUCLEAR: Insert into agent_outputs table using UniversalOutputService
            universal_service = get_universal_output_service()
            result = await universal_service.save_agent_output(
                org_id=self.org_id,
                user_id=data.get("created_by", self.user_id),
                client_id=self.client_id,  # FIX: Pass client_id for agency multi-tenant schema routing
                agent_type="strategy",
                output_type=data.get("framework_type", "strategy_analysis"),
                title=data.get("title", f"{framework_type} Analysis"),
                summary=data.get("description", f"Strategic analysis using {framework_type} framework"),
                content=data,
                metadata={
                    "framework_type": framework_type,
                    "analysis_type": data.get("analysis_type"),
                    "session_id": data.get("session_id"),
                    "nuclear_migration": "2025-09-23"
                }
            )
            
            if result:
                output_id = result['id']
                logger.info(f"🚀 NUCLEAR: {framework_type} analysis saved with ID: {output_id}")
                
                # Also capture as an insight for Progressive Learning System
                try:
                    insight_service = get_insight_capture_service()
                    insight_id = await insight_service.capture_from_strategy_framework(
                        framework_type=framework_type,
                        framework_data=analysis_data,
                        business_context=business_context,
                        org_id=org_id,
                        user_id=user_id,
                        session_id=session_id,
                        campaign_id=campaign_id
                    )
                    
                    if insight_id:
                        logger.info(f"{framework_type} insights captured with ID: {insight_id}")
                except Exception as insight_error:
                    logger.warning(f"Failed to capture {framework_type} insights: {insight_error}")
                
                return output_id
            
        except Exception as e:
            logger.error(f"Failed to save {framework_type} analysis to database: {str(e)}")
        
        return None

    async def analyze_business(self, session_id: str, business_problem: str, user_id: str) -> Dict[str, Any]:
        """
        Analyzes a business problem using a conversational, tool-based approach.
        """
        logger.info(f"Strategy agent analyzing business problem for session {session_id}")
        try:
            return await self.chat(session_id, business_problem, user_id)
        except Exception as e:
            logger.error(f"Strategy analysis failed for session {session_id}: {str(e)}")
            raise

    # ===== Phase 2: Native Structured Output Implementation (Added 2025-09-21) =====

    async def generate_swot_native(self, business_context: str) -> SWOTAnalysis:
        """
        Generate SWOT analysis using native structured output with response_schema.
        This is the NEW approach using Gemini's native JSON mode.

        Phase 2 implementation to test efficiency vs template approach.
        """
        logger.info(f"Generating SWOT using native structured output for: {business_context[:50]}...")

        try:
            import os

            # Initialize Gemini client
            client = get_gemini_client()

            # Build contextual prompt with business information
            # Add any available context from enterprise data
            context_info = ""
            if hasattr(self, 'context') and self.context:
                if self.context.get('organization'):
                    org = self.context['organization']
                    context_info += f"\nOrganization: {org.get('name', 'Unknown')}"
                    context_info += f"\nIndustry: {org.get('industry', 'N/A')}"

            prompt = f"""
            Analyze the following business context and provide a comprehensive SWOT analysis:

            Business Context: {business_context}
            {context_info}

            Instructions:
            - Provide 4-6 specific, actionable items for each category
            - Focus on factors most relevant to the business's competitive position
            - Be concrete and quantify where possible
            - Consider both current state and future trends
            - Prioritize factors by significance to the business

            Generate a thorough SWOT analysis based on this context.
            """

            # Use native structured output with response_schema
            # Convert Pydantic model to JSON schema for Gemini
            response = client.models.generate_content(
                model=os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL),
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": SWOTAnalysis.model_json_schema(),  # Use JSON schema
                    "temperature": 1.0,  # Gemini 3 recommended default
                    "max_output_tokens": 2048
                }
            )

            # Parse the JSON response into Pydantic model
            if response and response.text:
                try:
                    swot_data = json.loads(response.text)
                    swot_analysis = SWOTAnalysis(**swot_data)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON response: {e}")
                    logger.error(f"Raw response: {response.text[:500]}")
                    raise ValueError(f"Invalid JSON response from Gemini: {e}")
            else:
                raise ValueError("No response from Gemini")

            # Log success for metrics
            logger.info("Successfully generated SWOT using native structured output")

            return swot_analysis

        except Exception as e:
            logger.error(f"Native SWOT generation failed: {str(e)}")
            raise

    async def compare_swot_approaches(self, business_context: str) -> Dict[str, Any]:
        """
        Compare the old template approach vs new native structured output.
        For Phase 2 testing and performance measurement.
        """
        import time

        results = {
            "business_context": business_context,
            "template_approach": {},
            "native_approach": {},
            "comparison": {}
        }

        # Test 1: Old template approach (current method)
        start_time = time.time()
        try:
            template_result = await self.get_swot_analysis(business_context)
            template_time = time.time() - start_time

            results["template_approach"] = {
                "success": True,
                "time_seconds": template_time,
                "result_type": type(template_result).__name__,
                "has_template": "swot_template" in template_result
            }
        except Exception as e:
            results["template_approach"] = {
                "success": False,
                "error": str(e)
            }

        # Test 2: New native structured output
        start_time = time.time()
        try:
            native_result = await self.generate_swot_native(business_context)
            native_time = time.time() - start_time

            results["native_approach"] = {
                "success": True,
                "time_seconds": native_time,
                "result_type": type(native_result).__name__,
                "is_pydantic": isinstance(native_result, SWOTAnalysis),
                "strengths_count": len(native_result.strengths) if native_result else 0,
                "weaknesses_count": len(native_result.weaknesses) if native_result else 0,
                "opportunities_count": len(native_result.opportunities) if native_result else 0,
                "threats_count": len(native_result.threats) if native_result else 0
            }
        except Exception as e:
            results["native_approach"] = {
                "success": False,
                "error": str(e)
            }

        # Calculate comparison metrics
        if results["template_approach"]["success"] and results["native_approach"]["success"]:
            template_time = results["template_approach"]["time_seconds"]
            native_time = results["native_approach"]["time_seconds"]

            results["comparison"] = {
                "time_difference": native_time - template_time,
                "time_improvement_percent": ((template_time - native_time) / template_time) * 100 if template_time > 0 else 0,
                "native_is_faster": native_time < template_time,
                "recommendation": "Use native structured output" if native_time < template_time else "Further testing needed"
            }

        return results

    # ===== Phase 4: Data Access Tools from BaseResourceTools (Added 2025-09-21) =====

    async def list_strategies(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False
    ) -> Dict[str, Any]:
        """
        List existing strategy analyses with pagination support.
        Delegates to StrategyTools from BaseResourceTools.

        Args:
            limit: Number of strategies to return (default 25)
            offset: Number of strategies to skip for pagination
            include_archived: Whether to include archived strategies

        Returns:
            Dictionary containing:
            - strategies: List of strategy records
            - total: Total number available
            - has_more: Whether more are available
            - message: Status message
        """
        logger.info(f"[Phase 4] Using StrategyTools.list_resources: limit={limit}, offset={offset}")

        # Ensure StrategyTools is initialized
        if not hasattr(self, 'strategy_tools') or not self.strategy_tools:
            self.strategy_tools = StrategyTools(org_id=self.org_id, user_id=self.user_id)

        # Delegate to StrategyTools from BaseResourceTools
        result = await self.strategy_tools.list_resources(
            limit=limit,
            offset=offset,
            include_archived=include_archived
        )

        # Transform response to match expected format
        if result["success"]:
            return {
                "strategies": result["resources"],
                "total": result.get("total", len(result["resources"])),
                "has_more": result.get("has_more", False),
                "current_page": offset // limit + 1 if limit > 0 else 1,
                "message": result["message"]
            }
        else:
            return {
                "strategies": [],
                "total": 0,
                "has_more": False,
                "error": result.get("error"),
                "message": result["message"]
            }

    async def get_strategy_details(self, strategy_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific strategy.
        Delegates to StrategyTools from BaseResourceTools.

        Args:
            strategy_id: UUID of the strategy to retrieve

        Returns:
            Dictionary containing:
            - strategy: The complete strategy record
            - message: Status message
        """
        logger.info(f"[Phase 4] Using StrategyTools.get_resource_details: {strategy_id}")

        # Ensure StrategyTools is initialized
        if not hasattr(self, 'strategy_tools') or not self.strategy_tools:
            self.strategy_tools = StrategyTools(org_id=self.org_id, user_id=self.user_id)

        # Delegate to StrategyTools from BaseResourceTools
        result = await self.strategy_tools.get_resource_details(strategy_id)

        # Transform response to match expected format
        if result["success"]:
            return {
                "strategy": result["resource"],
                "message": result["message"]
            }
        else:
            return {
                "strategy": None,
                "error": result.get("error"),
                "message": result["message"]
            }