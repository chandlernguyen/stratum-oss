"""
Enterprise Base Agent - Enhanced base class that extends BaseGeminiAgent with unified context.
Preserves all BaseGeminiAgent functionality while adding enterprise context capabilities.
"""
from typing import Dict, Any, List, Optional
from abc import abstractmethod
from datetime import datetime, UTC
import asyncio
import logging

from apps.api.agents.base_gemini_agent import BaseGeminiAgent, genai, types
from apps.api.services.enterprise_context_service import EnterpriseContextService
from apps.api.services.progressive_learning_context_service import ProgressiveLearningContextService
from apps.api.services.business_intelligence_service import BusinessIntelligenceService
from apps.api.services.unified_insight_extractor import get_insight_extractor
from apps.api.services.structured_extractor import create_structured_extractor
from apps.api.services.gemini_cache_manager import GeminiCacheManager
from apps.api.services.session_service import SessionService
from apps.api.services.localization import load_prompt, load_greeting
from apps.api.utils.database import get_supabase_client
from apps.api.config.agent_config import AgentConfig
from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.config.gemini_client import get_gemini_client
import os

logger = logging.getLogger(__name__)

class EnterpriseBaseAgent(BaseGeminiAgent):
    """
    Enhanced base class that extends BaseGeminiAgent with enterprise context.
    """
    
    def __init__(self, **kwargs):
        pass

    async def __ainit__(
        self,
        org_id: Optional[str] = None,
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        agent_type: str = None,
        tools: List[types.Tool] = None,
        org_type: Optional[str] = None,  # Week 3: Added for schema routing
        client_id: Optional[str] = None,  # Week 3: Added for agency client scoping
        locale: str = "en"  # Localization: User's preferred language
    ):
        self.org_id = org_id
        self.user_id = user_id
        self.campaign_id = campaign_id
        self.agent_type = agent_type or self.get_agent_type()
        self.org_type = org_type  # Week 3: Store for schema routing
        self.client_id = client_id  # Week 3: Store for client-scoped queries
        self.locale = locale  # Localization: Store for prompt loading

        if self.org_id:
            # Week 3: Pass org_type and client_id to ProgressiveLearningContextService for schema routing
            self.context_service = ProgressiveLearningContextService(
                org_id=self.org_id,
                user_id=self.user_id,
                campaign_id=self.campaign_id,
                org_type=self.org_type,  # Week 3: Enable schema routing
                client_id=self.client_id  # Week 3: Enable client scoping for agency
            )
            self.context = await self.context_service.get_progressive_context(self.agent_type)

            # Load unified business intelligence (Migration 186)
            bi_service = BusinessIntelligenceService()
            self.business_intelligence = await bi_service.get_intelligence(
                org_id=self.org_id,
                client_id=self.client_id  # None for SME, UUID for Agency
            )

            # Week 3: Enhanced logging with org_type and client_id
            context_info = f"{len(self.context)} data categories"
            if self.org_type:
                schema = "agency" if self.org_type == "AGENCY" else "public"
                context_info += f", schema={schema}"
            if self.client_id:
                context_info += f", client_id={self.client_id[:8]}..."
            if self.business_intelligence:
                completeness = self.business_intelligence.get('data_completeness_score', 0)
                context_info += f", business_intelligence={completeness}%"

            logger.info(f"[{self.agent_type}] Loaded progressive learning context with {context_info} (ALWAYS FRESH)")
        else:
            self.context_service = None
            self.context = {}
            self.business_intelligence = None
            logger.warning(f"[{self.agent_type}] No org_id provided, running without enterprise context")
        
        self.system_prompt = self._build_system_prompt_with_context()
        agent_tools = tools or self._get_agent_tools()
        
        # Use AgentConfig for centralized configuration management
        self.config = AgentConfig.from_env(self.agent_type)

        # Manually perform setup from BaseGeminiAgent.__init__ to avoid super() call issues
        self.agent_tools = agent_tools
        self.session_service = SessionService()
        self.enable_grounding = self.config.enable_grounding
        self.enable_dynamic_routing = True  # Phase 2: Enable dynamic model selection based on query complexity
        self.thinking_level = self.config.thinking_level

        env_key = f"GEMINI_MODEL_{self.agent_type.upper()}"
        self.model_name = os.getenv(env_key, os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL))
        self.temperature = self.config.temperature
        self.max_output_tokens = self.config.max_output_tokens

        self.generation_config = types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_output_tokens,
            thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level)
        )

        # Shared accessor: returns the DEMO_MODE stand-in when DEMO_MODE is on,
        # otherwise a real client built from GOOGLE_API_KEY / GEMINI_API_KEY.
        self.client = get_gemini_client()
        self._streaming_enabled = True
        self._consecutive_stream_failures = 0
        self.max_stream_failures = 3

        self.cache_manager = None
        self._cached_context_name = None
        if self.org_id and self.context:
            try:
                api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
                if api_key:
                    self.cache_manager = GeminiCacheManager(api_key=api_key)
                    ttl_type = 'stable' if self.agent_type in ['strategy', 'persona'] else 'dynamic'
                    self._cached_context_name = self.cache_manager.create_enterprise_cache(
                        org_id=self.org_id,
                        context_data=self.context,
                        agent_type=self.agent_type,
                        ttl_type=ttl_type
                    )
                    if self._cached_context_name:
                        logger.info(f"[{self.agent_type}] Created context cache: {self._cached_context_name}")

                        # Phase 2: Add cache to refresh queue for proactive warming
                        try:
                            supabase = get_supabase_client()
                            ttl_hours = 24 if ttl_type == 'stable' else (6 if ttl_type == 'session' else 1)
                            supabase.rpc('add_cache_to_refresh_queue', {
                                'p_org_id': self.org_id,
                                'p_agent_type': self.agent_type,
                                'p_cache_name': self._cached_context_name,
                                'p_context_data': self.context,
                                'p_ttl_type': ttl_type,
                                'p_ttl_hours': ttl_hours
                            }).execute()
                            logger.info(f"[{self.agent_type}] Added cache to refresh queue: {self._cached_context_name}")
                        except Exception as queue_error:
                            logger.warning(f"[{self.agent_type}] Failed to add cache to refresh queue: {queue_error}")
            except Exception as e:
                logger.warning(f"[{self.agent_type}] Failed to initialize cache manager: {e}")
                self.cache_manager = None

        if self.org_id:
            self.current_org_id = self.org_id
            self.current_user_id = self.user_id
            self.current_campaign_id = self.campaign_id
    
    @abstractmethod
    def get_agent_type(self) -> str:
        pass

    @abstractmethod
    def get_base_prompt(self) -> str:
        """Return the base system prompt (fallback if localized prompt not available)."""
        pass

    @abstractmethod
    def _get_agent_tools(self) -> List[types.Tool]:
        pass

    def get_localized_prompt(self) -> str:
        """
        Load localized system prompt from JSON files.
        Falls back to get_base_prompt() if localized version not available.
        """
        localized_prompt = load_prompt(self.agent_type, self.locale)
        if localized_prompt:
            logger.info(f"[{self.agent_type}] Using localized prompt for locale={self.locale}")
            return localized_prompt
        logger.info(f"[{self.agent_type}] Localized prompt not found for locale={self.locale}, using default")
        return self.get_base_prompt()

    def get_localized_greeting(self) -> str:
        """
        Load localized greeting message from JSON files.
        """
        return load_greeting(self.agent_type, self.locale)

    def _build_system_prompt_with_context(self) -> str:
        logger.info(f"[{self.agent_type}] Building system prompt with context (has_business_intelligence={self.business_intelligence is not None}, locale={self.locale})")
        base_prompt = self.get_localized_prompt()

        # Multilingual instruction - tells AI to respond in user's language
        multilingual_instruction = """
**Language Instruction:**
Always respond in the same language the user uses. If the user writes in Vietnamese, respond entirely in Vietnamese. If in English, respond in English. Match the user's language naturally throughout the conversation. This applies to all your responses, recommendations, and analysis outputs.
"""

        if not self.context_service:
            logger.warning(f"[{self.agent_type}] No context_service available, returning base prompt with multilingual instruction")
            return f"{base_prompt}\n\n{multilingual_instruction}"
        context_prompt = self._format_enterprise_context()
        final_prompt = f"{base_prompt}\n\n{multilingual_instruction}\n\n{context_prompt}"
        logger.info(f"[{self.agent_type}] Final system prompt: {len(final_prompt)} chars (base={len(base_prompt)}, context={len(context_prompt)})")
        # Log first 500 chars of context for debugging
        logger.debug(f"[{self.agent_type}] Context preview: {context_prompt[:500]}")
        return final_prompt
    
    def _format_enterprise_context(self) -> str:
        logger.info(f"[{self.agent_type}] _format_enterprise_context() called (has_business_intelligence={self.business_intelligence is not None}, has_context={self.context is not None})")

        if not self.context:
            logger.warning(f"[{self.agent_type}] No context available, returning placeholder")
            return "[No enterprise context available]"

        if 'brand_guidelines' in self.context and isinstance(self.context['brand_guidelines'], list):
            if self.context['brand_guidelines']:
                self.context['brand_guidelines'] = self.context['brand_guidelines'][0]
            else:
                self.context['brand_guidelines'] = {}

        prompt_parts = []
        today_date = datetime.now(UTC).strftime("%B %d, %Y")  # e.g., "November 14, 2025"
        prompt_parts.append(f"IMPORTANT: Today's date is {today_date}. When creating plans, timelines, or dates, always use this as your reference point and ensure all dates are in the future or present, never in the past.")

        # Unified Business Intelligence (pre-loaded in __ainit__)
        # Migration 186 + BusinessIntelligenceService replaces 95 lines of duplicate code
        if self.business_intelligence:
            logger.info(f"[{self.agent_type}] Business intelligence found: {len(self.business_intelligence)} fields")
            if 'name' in self.business_intelligence:
                logger.info(f"[{self.agent_type}] Business intelligence name: {self.business_intelligence.get('name')}")
        else:
            logger.warning(f"[{self.agent_type}] No business_intelligence in _format_enterprise_context() - was it loaded in __ainit__?")

        if self.business_intelligence:
            logger.info(f"[{self.agent_type}] Formatting business intelligence with {len(self.business_intelligence)} fields")
            # Format intelligence for prompt injection
            bi_service = BusinessIntelligenceService()
            formatted_intelligence = bi_service.format_intelligence_for_prompt(self.business_intelligence)
            if formatted_intelligence:
                logger.info(f"[{self.agent_type}] Formatted intelligence: {len(formatted_intelligence)} characters")
                prompt_parts.append(formatted_intelligence)
            else:
                logger.warning(f"[{self.agent_type}] format_intelligence_for_prompt returned empty string!")

            # Add client-specific guidance for Agency workflow
            if self.client_id:
                prompt_parts.append("\nWhen the user asks about 'this client' or 'the client', they are referring to the client listed above.")
                prompt_parts.append("ALWAYS reference the client's name, industry, and specific business context when providing recommendations or analysis.")
        else:
            logger.warning(f"[{self.agent_type}] No business_intelligence available in _format_enterprise_context()")

        if self.context.get('brand_guidelines'):
            guidelines = self.context.get('brand_guidelines')
            if isinstance(guidelines, dict):
                prompt_parts.append("\n[BRAND GUIDELINES]")
                if guidelines.get('brand_voice'):
                    voice = guidelines['brand_voice']
                    if isinstance(voice, dict) and voice.get('tone_of_voice'):
                        prompt_parts.append(f"Tone of Voice: {voice.get('tone_of_voice')}")

        # Include campaigns
        if self.context.get('campaigns') and isinstance(self.context['campaigns'], list):
            campaigns = self.context['campaigns']
            if campaigns:
                prompt_parts.append("\n[EXISTING CAMPAIGNS]")
                for campaign in campaigns[:10]:
                    name = campaign.get('name', 'Untitled Campaign')
                    status = campaign.get('status', 'unknown')
                    campaign_type = campaign.get('campaign_type', 'general')
                    budget = campaign.get('budget', 0)
                    prompt_parts.append(f"• {name} ({campaign_type}, ${budget:,}, {status})")

        # Include personas (nuclear migration: key changed from 'synthetic_personas' to 'personas')
        if self.context.get('personas') and isinstance(self.context['personas'], list):
            personas = self.context['personas']
            if personas:
                prompt_parts.append("\n[EXISTING PERSONAS]")
                for persona in personas:
                    name = persona.get('name', 'Unknown')
                    title = persona.get('title', 'Unknown Title')
                    company = persona.get('company_name', 'Unknown Company')
                    industry = persona.get('industry', '')
                    goals = persona.get('goals', [])
                    pain_points = persona.get('pain_points', [])

                    persona_line = f"• {name} - {title} at {company}"
                    if industry:
                        persona_line += f" ({industry})"
                    prompt_parts.append(persona_line)

                    if goals and isinstance(goals, list) and goals:
                        prompt_parts.append(f"  Goals: {', '.join(goals[:3])}")
                    if pain_points and isinstance(pain_points, list) and pain_points:
                        prompt_parts.append(f"  Pain Points: {', '.join(pain_points[:3])}")

        # Include marketing strategies
        if self.context.get('marketing_strategies') and isinstance(self.context['marketing_strategies'], list):
            strategies = self.context['marketing_strategies']
            if strategies:
                prompt_parts.append("\n[EXISTING MARKETING STRATEGIES]")
                for strategy in strategies:
                    title = strategy.get('title', 'Untitled Strategy')
                    strategy_type = strategy.get('strategy_type', 'Unknown')
                    status = strategy.get('status', 'draft')
                    target_audience = strategy.get('target_audience', '')

                    strategy_line = f"• {title} ({strategy_type}, {status})"
                    if target_audience:
                        strategy_line += f" - Target: {target_audience[:100]}"
                    prompt_parts.append(strategy_line)

        # Include recent agent outputs (content, analysis, etc.)
        if self.context.get('agent_outputs') and isinstance(self.context['agent_outputs'], list):
            outputs = self.context['agent_outputs']
            if outputs:
                prompt_parts.append("\n[RECENT AGENT OUTPUTS]")
                # Group by agent type
                by_agent = {}
                for output in outputs[:20]:  # Limit to most recent 20
                    agent_type = output.get('agent_type', 'unknown')
                    if agent_type not in by_agent:
                        by_agent[agent_type] = []
                    by_agent[agent_type].append(output)

                for agent_type, agent_outputs in by_agent.items():
                    prompt_parts.append(f"  {agent_type.replace('_', ' ').title()} Agent:")
                    for output in agent_outputs[:5]:  # Show up to 5 per agent type
                        title = output.get('title', 'Untitled')
                        output_type = output.get('output_type', 'analysis')
                        created_at = output.get('created_at', '')
                        if created_at:
                            try:
                                created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime('%m/%d')
                            except:
                                created_date = ''
                        else:
                            created_date = ''

                        date_str = f" ({created_date})" if created_date else ""
                        prompt_parts.append(f"    - {title} [{output_type}]{date_str}")

        # Include AI insights
        if self.context.get('ai_insights') and isinstance(self.context['ai_insights'], list):
            insights = self.context['ai_insights']
            if insights:
                prompt_parts.append("\n[KEY AI INSIGHTS]")
                for insight in insights[:10]:  # Show top 10 insights
                    title = insight.get('insight_title', 'Untitled Insight')
                    insight_type = insight.get('insight_type', 'general')
                    confidence = insight.get('confidence_score', 0)
                    prompt_parts.append(f"• {title} [{insight_type}, {confidence:.0%} confidence]")

        # Include clients information
        if self.context.get('clients') and isinstance(self.context['clients'], list):
            clients = self.context['clients']
            if clients:
                prompt_parts.append("\n[CLIENT INFORMATION]")
                for client in clients:
                    name = client.get('company_name', 'Unnamed Client')
                    industry = client.get('industry', 'Unknown Industry')
                    status = client.get('status', 'active')
                    prompt_parts.append(f"• {name} ({industry}, {status})")

        return "\n".join(prompt_parts)
    
    async def chat(self, session_id: str, message: str, user_id: str, file_info: Optional[List[Dict[str, Any]]] = None):
        async for event in super().chat(session_id, message, user_id, file_info=file_info):
            yield event