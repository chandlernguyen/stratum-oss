"""
Direct Content Agent - Refactored with modular tool architecture.
Tools are organized into logical modules for better maintainability.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from apps.api.agents.enterprise_base_agent import EnterpriseBaseAgent
from apps.api.agents.base_gemini_agent import genai, types
from apps.api.models.agent_tools import ContentIdea, BlogPost, SocialMediaPost, ContentCalendar
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_client import get_gemini_client

# Import modularized tool classes
from .content_tools import (
    ContentGenerationTools,
    ContentTemplateTools,
    ContentPlanningTools,
    ContentUtilityTools
)
# Phase 4: Import ContentTools from BaseResourceTools
from apps.api.agents.tools.content_tools import ContentTools

logger = logging.getLogger(__name__)


class DirectContentAgent(EnterpriseBaseAgent):
    """
    Lean Content Agent orchestrator that delegates to modular tool implementations.
    Reduced from 2,297 lines to ~400 lines while maintaining all functionality.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None, campaign_id: Optional[str] = None):
        """Initialize Content Agent with enterprise context and brand intelligence."""
        # Store IDs for later access
        self.org_id = org_id
        self.user_id = user_id
        self.campaign_id = campaign_id

        # Initialize parent with enterprise context
        super().__init__(
            org_id=org_id,
            user_id=user_id,
            campaign_id=campaign_id,
            agent_type=self.get_agent_type()
        )

        # Initialize tool modules with agent reference
        self._init_tool_modules()

        # Note: self.context is now loaded with all relevant data including brand guidelines
        logger.info(f"[ContentAgent] Initialized with modular architecture for org_id: {org_id}")

    def _init_tool_modules(self):
        """Initialize all tool modules with reference to this agent."""
        self.generation_tools = ContentGenerationTools(self)
        self.template_tools = ContentTemplateTools(self)
        self.planning_tools = ContentPlanningTools(self)
        self.utility_tools = ContentUtilityTools(self)

        # Phase 4: Initialize ContentTools from BaseResourceTools
        self.content_tools = ContentTools(org_id=self.org_id, user_id=self.user_id)

        logger.info("[ContentAgent] Tool modules initialized successfully")

    def get_agent_type(self) -> str:
        """Define the agent type for context filtering."""
        return "content"

    def get_base_prompt(self) -> str:
        """Return the base system prompt without context."""
        return """I help you create engaging content that converts and aligns with your brand identity. I have access to your organization's context including brand guidelines, marketing strategies, and campaign objectives.

I have access to 18 powerful tools:
- `LIST_CONTENT`: **View your existing content outputs and materials**
- `GET_CONTENT_DETAILS`: **Get details of a specific content piece**
- `CHECK_BRAND_GUIDELINES`: Check brand compliance and voice consistency
- `GET_CROSS_AGENT_CONTEXT`: Get insights from other marketing agents
- `GET_RECENT_CONTENT_OUTPUTS`: View your recent content creations
- `SAVE_CONTENT_OUTPUT`: Save content to your database
- `GENERATE_SEO_BLOG_POST`: Create SEO-optimized blog posts
- `CREATE_THOUGHT_LEADERSHIP_PIECE`: Develop industry expertise content
- `GENERATE_USP_FOCUSED_CONTENT`: Content highlighting unique selling points
- `GET_CONTENT_IDEATION_TEMPLATES`: Content idea generation templates
- `GET_BLOG_WRITING_TEMPLATES`: Blog post structure templates
- `GET_SOCIAL_MEDIA_TEMPLATES`: Social platform-specific templates
- `GET_CONTENT_CALENDAR_TEMPLATES`: Editorial calendar templates
- `ANALYZE_CONTENT_NEEDS`: Assess content gaps and opportunities
- `GENERATE_CONTENT_PLAN`: Create comprehensive content strategies
- `SAVE_CONTENT_PLAN`: Save content plans to database
- `GET_ACTIVE_CONTENT_PLAN`: Retrieve current content strategy
- `DESIGN_EMAIL_DRIP_CAMPAIGN`: Create email sequence campaigns
- `CREATE_SOCIAL_MEDIA_CALENDAR`: Plan social media content schedules

**🎯 My Content Expertise:**

📝 **Content Creation & Strategy:**
- Blog posts that reflect your expertise and brand voice
- Social media content optimized for each platform
- Email campaigns with compelling subject lines and CTAs
- Marketing materials that reinforce your brand identity
- SEO-optimized content that maintains your unique voice

📊 **Strategic Content Planning:**
- Content calendars aligned with your marketing campaigns
- Cross-platform content adaptation and repurposing
- Content performance analysis and optimization
- Editorial workflows and content governance

🎨 **Brand Voice & Consistency:**
- All content follows your established brand guidelines
- Consistent tone and messaging across all materials
- Adaptation of voice for different audiences and channels
- Brand compliance checking for all content pieces

**Content Types I Can Help With:**
- Blog posts and articles
- Social media posts (LinkedIn, Twitter, Facebook, Instagram)
- Email newsletters and campaigns
- Website copy and landing pages
- Case studies and whitepapers
- Video scripts and podcast content
- Marketing collateral and presentations

**How I Work:**
I use your existing brand guidelines, marketing strategy, and campaign context to ensure every piece of content is on-brand and strategically aligned. Just tell me what type of content you need and your specific goals!

What content can I help you create today?"""

    def _get_agent_tools(self) -> List:
        """
        Define the Content Agent's tools using raw callables (hybrid pattern).
        Returns raw Python functions for automatic conversion to FunctionDeclaration.
        """
        # Initialize ContentTools if not already done
        if not hasattr(self, 'content_tools') or not self.content_tools:
            self.content_tools = ContentTools(org_id=self.org_id, user_id=self.user_id)

        # Return raw callables - SDK automatically converts to FunctionDeclaration
        # This enables hybrid streaming (raw callables + AFC disabled + manual multi-turn)
        tools = [
            # Data Access Tools from BaseResourceTools
            self.list_content,
            self.get_content_details,
            # Utility Tools (Foundation)
            self.check_brand_guidelines,
            self.get_cross_agent_context,
            self.get_recent_content_outputs,
            self.save_content_output,
            # Generation Tools (Content Creation)
            self.generate_seo_blog_post,
            self.create_thought_leadership_piece,
            self.generate_usp_focused_content,
            # Template Tools (Content Templates)
            self.get_content_ideation_templates,
            self.get_blog_writing_templates,
            self.get_social_media_templates,
            self.get_content_calendar_templates,
            # Planning Tools (Strategy & Campaigns)
            self.analyze_content_needs,
            self.generate_content_plan,
            self.save_content_plan,
            self.get_active_content_plan,
            self.design_email_drip_campaign,
            self.create_social_media_calendar,
        ]

        logger.info(f"Content agent created {len(tools)} raw callable tools successfully")
        return tools

    def _build_enhanced_prompt(self, base_prompt: str) -> str:
        """Build system prompt with enterprise context."""
        if not hasattr(self, 'context') or not self.context:
            logger.info("[ContentAgent] No enterprise context available, using base prompt")
            return base_prompt

        try:
            context_sections = []

            # Add business context
            if self.context.get('company'):
                company = self.context['company']
                business_context = "[BUSINESS CONTEXT]\n"
                business_context += f"Company: {company.get('company_name', 'Unknown')}\n"
                business_context += f"Industry: {company.get('industry', 'Unknown')}\n"
                if company.get('target_market'):
                    business_context += f"Target Markets: {', '.join(company['target_market'][:3])}\n"
                if company.get('main_products'):
                    business_context += f"Main Products: {', '.join(company['main_products'][:3])}\n"
                context_sections.append(business_context)

            # Add marketing strategy context
            if self.context.get('strategies'):
                strategies = [s for s in self.context['strategies'] if s.get('status') == 'active']
                if strategies:
                    strategy = strategies[0]
                    marketing_context = "[MARKETING STRATEGY]\n"
                    marketing_context += f"Strategy Name: {strategy.get('name', 'Untitled')}\n"

                    if strategy.get('value_propositions'):
                        vp = strategy['value_propositions']
                        if isinstance(vp, dict) and vp.get('primary'):
                            marketing_context += f"Primary Value Prop: {vp['primary']}\n"

                    if strategy.get('tone_of_voice'):
                        tov = strategy['tone_of_voice']
                        if isinstance(tov, dict):
                            if tov.get('personality_traits'):
                                marketing_context += f"Brand Personality: {', '.join(tov['personality_traits'][:3])}\n"
                            if tov.get('writing_style'):
                                marketing_context += f"Writing Style: {tov['writing_style']}\n"

                    context_sections.append(marketing_context)

            # Add personas context
            if self.context.get('personas'):
                personas_context = "[TARGET PERSONAS]\n"
                for persona in self.context['personas'][:3]:
                    personas_context += f"\nPersona: {persona.get('name', 'Unknown')}\n"
                    personas_context += f"  Title: {persona.get('title', '')}\n"
                    personas_context += f"  Company: {persona.get('company_name', '')}\n"
                    if persona.get('pain_points'):
                        personas_context += f"  Pain Points: {', '.join(persona['pain_points'][:2])}\n"
                    if persona.get('goals'):
                        personas_context += f"  Goals: {', '.join(persona['goals'][:2])}\n"
                context_sections.append(personas_context)

            # Add brand voice context
            if self.context.get('strategies'):
                for strategy in self.context['strategies']:
                    if strategy.get('tone_of_voice') or strategy.get('brand_personality'):
                        brand_context = "[BRAND VOICE & GUIDELINES]\n"
                        tov = strategy.get('tone_of_voice', {})
                        if tov.get('personality_traits'):
                            brand_context += f"Personality Traits: {', '.join(tov['personality_traits'])}\n"
                        if tov.get('writing_style'):
                            brand_context += f"Writing Style: {tov['writing_style']}\n"
                        if tov.get('dos'):
                            brand_context += f"Do's: {', '.join(tov['dos'][:3])}\n"
                        if tov.get('donts'):
                            brand_context += f"Don'ts: {', '.join(tov['donts'][:3])}\n"
                        context_sections.append(brand_context)
                        break

            if context_sections:
                logger.info(f"[ContentAgent] Added {len(context_sections)} context sections to system prompt")
                enhanced_prompt = base_prompt + "\n\n**ENTERPRISE CONTEXT LOADED:**\n\n" + "\n\n".join(context_sections)

                # Add brand voice reminder if we have it
                if any('BRAND VOICE' in section for section in context_sections):
                    enhanced_prompt += "\n\n**✅ BRAND VOICE DETECTED: I can see you have brand guidelines established. Let's ensure all content aligns with these guidelines.**"
                else:
                    enhanced_prompt += "\n\n**⚠️ NO BRAND VOICE DETECTED: Before creating content, let's establish your brand voice to ensure consistency across all materials.**"

                logger.info(f"[ContentAgent] Enhanced prompt length: {len(enhanced_prompt)} chars")
                return enhanced_prompt

        except Exception as e:
            logger.error(f"[ContentAgent] Error building system prompt: {e}")

        return base_prompt

    # ===== DELEGATION METHODS FOR BACKWARD COMPATIBILITY =====
    # These methods delegate to the appropriate tool module

    # === Utility Tool Delegations ===
    async def check_brand_guidelines(self, check_type: str = "all") -> Dict[str, Any]:
        """Delegate to utility tools."""
        return await self.utility_tools.check_brand_guidelines(check_type)

    async def get_cross_agent_context(self, query: str = "") -> Dict[str, Any]:
        """Delegate to utility tools."""
        return await self.utility_tools.get_cross_agent_context(query)

    async def save_content_output(self, title: str, content_type: str, content: Dict[str, Any],
                                 summary: Optional[str] = None, keywords: Optional[List[str]] = None,
                                 tone: Optional[str] = None, word_count: Optional[int] = None,
                                 meta_description: Optional[str] = None, target_audience: Optional[str] = None) -> Dict[str, Any]:
        """Delegate to utility tools."""
        return await self.utility_tools.save_content_output(
            title, content_type, content, summary, keywords, tone,
            word_count, meta_description, target_audience
        )

    async def get_recent_content_outputs(self, content_type: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        """Delegate to utility tools."""
        return await self.utility_tools.get_recent_content_outputs(content_type, limit)

    # === Generation Tool Delegations ===
    async def generate_seo_blog_post(self, topic: str, keywords: Optional[List[str]] = None, word_count: int = 1500) -> Dict[str, Any]:
        """Delegate to generation tools."""
        return await self.generation_tools.generate_seo_blog_post(topic, keywords, word_count)

    async def create_thought_leadership_piece(self, topic: str, expertise_area: str, audience: str = "industry professionals") -> Dict[str, Any]:
        """Delegate to generation tools."""
        return await self.generation_tools.create_thought_leadership_piece(topic, expertise_area, audience)

    async def generate_usp_focused_content(self, product_service: str, unique_selling_points: List[str], content_type: str = "landing_page") -> Dict[str, Any]:
        """Delegate to generation tools."""
        return await self.generation_tools.generate_usp_focused_content(product_service, unique_selling_points, content_type)

    # === Template Tool Delegations ===
    async def get_content_ideation_templates(self, topic: str, count: int = 5) -> Dict[str, Any]:
        """Delegate to template tools."""
        return await self.template_tools.get_content_ideation_templates(topic, count)

    async def get_blog_writing_templates(self, content_idea_title: str) -> Dict[str, Any]:
        """Delegate to template tools."""
        return await self.template_tools.get_blog_writing_templates(content_idea_title)

    async def get_social_media_templates(self, content_idea_title: str, platforms: List[str]) -> Dict[str, Any]:
        """Delegate to template tools."""
        return await self.template_tools.get_social_media_templates(content_idea_title, platforms)

    async def get_content_calendar_templates(self, content_idea_titles: List[str], duration_days: int = 30) -> Dict[str, Any]:
        """Delegate to template tools."""
        return await self.template_tools.get_content_calendar_templates(content_idea_titles, duration_days)

    # === Planning Tool Delegations ===
    async def analyze_content_needs(self, include_prerequisites: bool = True, max_recommendations: int = 5) -> Dict[str, Any]:
        """Delegate to planning tools."""
        return await self.planning_tools.analyze_content_needs(include_prerequisites, max_recommendations)

    async def generate_content_plan(self, duration_weeks: int = 4, content_goals: Optional[List[str]] = None,
                                   preferred_channels: Optional[List[str]] = None, budget_range: Optional[str] = None) -> Dict[str, Any]:
        """Delegate to planning tools."""
        return await self.planning_tools.generate_content_plan(duration_weeks, content_goals, preferred_channels, budget_range)

    async def save_content_plan(self, title: str, executive_summary: str, content_pillars: List[str],
                               content_calendar: Dict[str, Any], channel_distribution: Dict[str, Any],
                               content_types: Optional[Dict[str, int]] = None, target_metrics: Optional[Dict[str, Any]] = None,
                               make_active: bool = False) -> Dict[str, Any]:
        """Delegate to planning tools."""
        return await self.planning_tools.save_content_plan(
            title, executive_summary, content_pillars, content_calendar,
            channel_distribution, content_types, target_metrics, make_active
        )

    async def get_active_content_plan(self) -> Dict[str, Any]:
        """Delegate to planning tools."""
        return await self.planning_tools.get_active_content_plan()

    async def design_email_drip_campaign(self, campaign_name: str, target_audience: str, campaign_goal: str,
                                        number_of_emails: int = 5, send_frequency: str = "weekly") -> Dict[str, Any]:
        """Delegate to planning tools."""
        return await self.planning_tools.design_email_drip_campaign(
            campaign_name, target_audience, campaign_goal, number_of_emails, send_frequency
        )

    async def create_social_media_calendar(self, duration_weeks: int = 4, platforms: Optional[List[str]] = None,
                                          content_themes: Optional[List[str]] = None,
                                          posting_frequency: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """Delegate to planning tools."""
        return await self.planning_tools.create_social_media_calendar(
            duration_weeks, platforms, content_themes, posting_frequency
        )

    # === Phase 4: Data Access Tools from BaseResourceTools ===

    async def list_content(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False
    ) -> Dict[str, Any]:
        """
        List existing content with pagination support.
        Delegates to ContentTools from BaseResourceTools.

        Args:
            limit: Number of content items to return
            offset: Number to skip for pagination
            include_archived: Whether to include archived content

        Returns:
            Dictionary with content list and metadata
        """
        logger.info(f"[Phase 4] Using ContentTools.list_resources: limit={limit}, offset={offset}")

        # Ensure ContentTools is initialized
        if not hasattr(self, 'content_tools') or not self.content_tools:
            self.content_tools = ContentTools(org_id=self.org_id, user_id=self.user_id)

        # Delegate to ContentTools from BaseResourceTools
        result = await self.content_tools.list_resources(
            limit=limit,
            offset=offset,
            include_archived=include_archived
        )

        # Transform response to match expected format
        if result["success"]:
            return {
                "content": result["resources"],
                "total": result.get("total", len(result["resources"])),
                "has_more": result.get("has_more", False),
                "current_page": offset // limit + 1 if limit > 0 else 1,
                "message": result["message"]
            }
        else:
            return {
                "content": [],
                "total": 0,
                "has_more": False,
                "error": result.get("error"),
                "message": result["message"]
            }

    async def get_content_details(self, content_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific content item.
        Delegates to ContentTools from BaseResourceTools.

        Args:
            content_id: UUID of the content to retrieve

        Returns:
            Dictionary with content details
        """
        logger.info(f"[Phase 4] Using ContentTools.get_resource_details: {content_id}")

        # Ensure ContentTools is initialized
        if not hasattr(self, 'content_tools') or not self.content_tools:
            self.content_tools = ContentTools(org_id=self.org_id, user_id=self.user_id)

        # Delegate to ContentTools from BaseResourceTools
        result = await self.content_tools.get_resource_details(content_id)

        # Transform response to match expected format
        if result["success"]:
            return {
                "content": result["resource"],
                "message": result["message"]
            }
        else:
            return {
                "content": None,
                "error": result.get("error"),
                "message": result["message"]
            }

    # === Helper Methods for Context Access ===
    def get_content_data(self) -> List[Dict[str, Any]]:
        """Get content data from enterprise context."""
        if not hasattr(self, 'context') or not self.context:
            return []
        return self.context.get('content', [])

    def get_strategy_data(self) -> List[Dict[str, Any]]:
        """Get marketing strategy data from enterprise context."""
        if not hasattr(self, 'context') or not self.context:
            return []
        return self.context.get('strategies', [])

    def get_persona_data(self) -> List[Dict[str, Any]]:
        """Get persona data from enterprise context."""
        if not hasattr(self, 'context') or not self.context:
            return []
        return self.context.get('personas', [])

    def get_campaign_data(self) -> List[Dict[str, Any]]:
        """Get campaign data from enterprise context."""
        if not hasattr(self, 'context') or not self.context:
            return []
        return [self.context.get('campaign')] if self.context.get('campaign') else []

    # === LLM-Powered Content Recommendations ===
    async def generate_recommendations(self, prompt: str) -> str:
        """
        Generate contextual content recommendations using LLM intelligence.
        Phase 2 implementation for LLM-powered recommendations system.
        """
        logger.info("Generating LLM-powered content recommendations")

        try:
            # Initialize Gemini client
            client = get_gemini_client()

            # Create the request for recommendation generation
            response = await client.aio.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=prompt)]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=1.0,  # Gemini 3 recommended default
                    max_output_tokens=2048,
                )
            )

            # Extract the recommendations text
            if response and response.candidates and len(response.candidates) > 0:
                recommendations_text = response.candidates[0].content.parts[0].text.strip()
                logger.info(f"Generated recommendations: {len(recommendations_text)} characters")
                return recommendations_text
            else:
                logger.warning("No recommendations generated by LLM")
                return '[]'  # Return empty JSON array as fallback

        except Exception as e:
            logger.error(f"Failed to generate LLM recommendations: {str(e)}")
            # Return fallback JSON structure
            return '''[
                {
                    "task": "Create introduction blog post for your company",
                    "reason": "Establish your content presence and introduce your value proposition",
                    "priority": "high",
                    "category": "introduction",
                    "estimatedTime": "30 minutes"
                }
            ]'''

    # === Main Processing Method ===
    async def process_request(self, session_id: str, user_message: str, user_id: str) -> Dict[str, Any]:
        """Processes a content-related query using a conversational, tool-based approach."""
        logger.info(f"Content agent processing request for session {session_id}")
        try:
            return await self.chat(session_id, user_message, user_id)
        except Exception as e:
            logger.error(f"Content agent request failed for session {session_id}: {str(e)}")
            raise