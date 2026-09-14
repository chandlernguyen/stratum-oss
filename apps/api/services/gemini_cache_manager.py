"""
Gemini Context Cache Manager
Implements Google's Context Caching API to dramatically reduce response times
and token costs by caching frequently-used context data.

Expected improvements:
- Time to first chunk: 15s → 3-5s (75% faster)
- Token costs: 75% reduction on cached context
- Better UX with faster responses
"""

import hashlib
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from google import genai
from google.genai import types

from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)


class GeminiCacheManager:
    """
    Manages context caching for Gemini API calls.

    This service creates and manages cached contexts for enterprise data,
    enabling 75% cost savings and dramatically faster response times.
    """

    def __init__(self, api_key: str):
        """Initialize cache manager with Gemini client"""
        self.client = genai.Client(api_key=api_key)
        self._cache_registry: Dict[str, Dict[str, Any]] = {}
        self._enabled = os.getenv("ENABLE_CONTEXT_CACHING", "true").lower() == "true"

        # TTL configurations (in hours)
        self.ttl_config = {
            'stable': int(os.getenv("CACHE_TTL_STABLE", "24")),  # 24 hours for stable data
            'dynamic': int(os.getenv("CACHE_TTL_DYNAMIC", "1")),  # 1 hour for dynamic data
            'session': int(os.getenv("CACHE_TTL_SESSION", "6"))   # 6 hours for session data
        }

        logger.info(f"GeminiCacheManager initialized: enabled={self._enabled}, TTL={self.ttl_config}")

    def create_enterprise_cache(
        self,
        org_id: str,
        context_data: Dict[str, Any],
        agent_type: str,
        ttl_type: str = 'stable'
    ) -> Optional[str]:
        """
        Create a cached context for an organization's enterprise data.

        Args:
            org_id: Organization ID
            context_data: Enterprise context data from ProgressiveLearningContextService
            agent_type: Type of agent (strategy, persona, content, etc.)
            ttl_type: Type of TTL to use ('stable', 'dynamic', 'session')

        Returns:
            Cache name/ID for use in generation requests, or None if caching disabled
        """
        if not self._enabled:
            logger.debug("Context caching is disabled")
            return None

        # Generate cache key based on content hash
        cache_key = self._generate_cache_key(org_id, agent_type, context_data)

        # Check if valid cache already exists
        if cache_key in self._cache_registry:
            cached_item = self._cache_registry[cache_key]
            if cached_item['expires_at'] > datetime.utcnow():
                logger.info(f"Using existing cache: {cached_item['name']}")
                return cached_item['name']
            else:
                logger.info(f"Cache expired for key: {cache_key}")
                del self._cache_registry[cache_key]

        # Format context for caching
        formatted_context = self._format_context_for_cache(context_data, agent_type)

        # Check if context is large enough for caching (min 1024 tokens for Flash)
        if len(formatted_context) < 1500:  # Temporary lower threshold for testing
            logger.info(f"Context too small for caching: {len(formatted_context)} chars")
            return None

        # Get TTL in seconds
        ttl_hours = self.ttl_config.get(ttl_type, 24)
        ttl_seconds = ttl_hours * 3600

        try:
            # Create cache with TTL
            logger.info(f"Creating cache for {org_id}-{agent_type} with {ttl_hours}h TTL")

            cached_content = self.client.caches.create(
                model=DEFAULT_MODEL,  # Using Flash Preview for complex agents
                config=types.CreateCachedContentConfig(
                    contents=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(text=formatted_context)
                            ],
                        )
                    ],
                    system_instruction=self._get_system_instruction(agent_type),
                    display_name=f"{org_id}-{agent_type}-{datetime.utcnow().strftime('%Y%m%d')}",
                    ttl=f"{ttl_seconds}s",
                ),
            )

            # Store in registry
            self._cache_registry[cache_key] = {
                'name': cached_content.name,
                'expires_at': datetime.utcnow() + timedelta(seconds=ttl_seconds),
                'token_count': getattr(cached_content.usage_metadata, 'total_token_count', 0) if cached_content.usage_metadata else 0,
                'org_id': org_id,
                'agent_type': agent_type,
                'created_at': datetime.utcnow()
            }

            token_count = getattr(cached_content.usage_metadata, 'total_token_count', 0) if cached_content.usage_metadata else 0
            logger.info(
                f"Created cache: {cached_content.name} "
                f"with {token_count} tokens"
            )
            return cached_content.name

        except Exception as e:
            logger.error(f"Failed to create cache: {e}")
            return None

    def _generate_cache_key(self, org_id: str, agent_type: str, context_data: Dict) -> str:
        """Generate a unique key for cache lookup"""
        # Create hash of significant context content
        company = context_data.get('company') or context_data.get('core_business_data', {})
        # Ensure company is a dict, not a list
        if isinstance(company, list):
            company = company[0] if company else {}
        significant_data = {
            'org_id': org_id,
            'agent_type': agent_type,
            # Include key context elements that affect responses
            'company': company.get('company_name') if isinstance(company, dict) else None,
            'industry': company.get('industry') if isinstance(company, dict) else None,
            'brand_guidelines': bool(context_data.get('brand_guidelines')),
            'personas_count': len(context_data.get('personas', [])),  # Nuclear migration: key changed
            'strategies_count': len(context_data.get('strategy_outputs', []))
        }

        content_str = json.dumps(significant_data, sort_keys=True)
        content_hash = hashlib.md5(content_str.encode()).hexdigest()[:8]
        return f"{org_id}_{agent_type}_{content_hash}"

    def _format_context_for_cache(self, context_data: Dict[str, Any], agent_type: str) -> str:
        """Format enterprise context into a structured prompt string for caching"""
        prompt_parts = []

        # Add metadata
        prompt_parts.append(f"[CACHED CONTEXT - {datetime.utcnow().isoformat()}]")
        prompt_parts.append(f"[AGENT TYPE: {agent_type}]")

        # Company context (handle both 'company' and 'core_business_data' keys)
        company = context_data.get('company') or context_data.get('core_business_data', {})
        # Ensure company is a dict, not a list
        if isinstance(company, list):
            company = company[0] if company else {}
        if company and isinstance(company, dict):
            prompt_parts.append("\n[ENTERPRISE BUSINESS CONTEXT]")
            prompt_parts.append(f"Company: {company.get('company_name', 'Unknown')}")
            prompt_parts.append(f"Industry: {company.get('industry', 'Unknown')}")
            prompt_parts.append(f"Stage: {company.get('company_stage', 'Unknown')}")
            prompt_parts.append(f"Size: {company.get('company_size', 'Unknown')}")

            if company.get('target_market'):
                markets = company['target_market'][:3] if isinstance(company['target_market'], list) else company['target_market']
                prompt_parts.append(f"Target Markets: {markets}")

            if company.get('main_products'):
                products = company['main_products'][:3] if isinstance(company['main_products'], list) else company['main_products']
                prompt_parts.append(f"Main Products: {products}")

            if company.get('annual_revenue'):
                prompt_parts.append(f"Annual Revenue: {company['annual_revenue']}")

            if company.get('marketing_budget'):
                prompt_parts.append(f"Marketing Budget: {company['marketing_budget']}")

            # Add more detailed company information
            if company.get('company_description'):
                prompt_parts.append(f"Description: {company['company_description']}")

            if company.get('value_proposition'):
                prompt_parts.append(f"Value Proposition: {company['value_proposition']}")

            if company.get('business_model'):
                prompt_parts.append(f"Business Model: {company['business_model']}")

            if company.get('key_challenges'):
                challenges = company['key_challenges'][:3] if isinstance(company['key_challenges'], list) else company['key_challenges']
                prompt_parts.append(f"Key Challenges: {challenges}")

            if company.get('competitive_advantages'):
                advantages = company['competitive_advantages'][:3] if isinstance(company['competitive_advantages'], list) else company['competitive_advantages']
                prompt_parts.append(f"Competitive Advantages: {advantages}")

        # Brand guidelines (critical for consistency)
        if context_data.get('brand_guidelines'):
            guidelines = context_data['brand_guidelines']
            # Ensure guidelines is a dict, not a list
            if isinstance(guidelines, list):
                guidelines = guidelines[0] if guidelines else {}
            prompt_parts.append("\n[BRAND GUIDELINES]")

            if guidelines.get('brand_voice'):
                voice = guidelines['brand_voice']
                if isinstance(voice, dict):
                    prompt_parts.append(f"Brand Voice: {voice.get('tone', 'Professional')}")
                    if voice.get('personality'):
                        prompt_parts.append(f"Personality: {voice['personality']}")
                else:
                    prompt_parts.append(f"Brand Voice: {voice}")

            if guidelines.get('visual_identity'):
                prompt_parts.append(f"Visual Identity: {guidelines['visual_identity']}")

            if guidelines.get('messaging_pillars'):
                pillars = guidelines['messaging_pillars'][:3] if isinstance(guidelines['messaging_pillars'], list) else guidelines['messaging_pillars']
                prompt_parts.append(f"Messaging Pillars: {pillars}")

            # Add more brand guideline details to increase context size
            for key, value in guidelines.items():
                if key not in ['brand_voice', 'visual_identity', 'messaging_pillars'] and value:
                    if isinstance(value, (str, int, float)):
                        prompt_parts.append(f"{key.replace('_', ' ').title()}: {value}")
                    elif isinstance(value, list) and value:
                        items = value[:2] if len(value) > 2 else value
                        prompt_parts.append(f"{key.replace('_', ' ').title()}: {items}")
                    elif isinstance(value, dict) and value:
                        # Include dict content up to 200 chars
                        dict_str = str(value)[:200]
                        prompt_parts.append(f"{key.replace('_', ' ').title()}: {dict_str}")

        # Add detailed strategy outputs for context richness
        if context_data.get('strategy_outputs'):
            strategies = context_data['strategy_outputs']
            if strategies:
                prompt_parts.append(f"\n[PREVIOUS STRATEGIES: {len(strategies)}]")
                for i, strategy in enumerate(strategies[:3]):  # Show up to 3
                    title = strategy.get('title', f'Strategy {i+1}')
                    summary = strategy.get('summary', 'No summary')[:150]
                    created = strategy.get('created_at', '')[:10]
                    prompt_parts.append(f"- {title} ({created}): {summary}...")

        # Add more comprehensive organization details
        if context_data.get('organizations'):
            org = context_data['organizations']
            # Ensure org is a dict, not a list
            if isinstance(org, list):
                org = org[0] if org else {}
            prompt_parts.append("\n[ORGANIZATION DETAILS]")
            if isinstance(org, dict):
                for key, value in org.items():
                    if value and key not in ['id', 'created_at', 'updated_at']:
                        if isinstance(value, (str, int, float)):
                            prompt_parts.append(f"{key.replace('_', ' ').title()}: {value}")
                        elif isinstance(value, list) and value:
                            items = value[:2] if len(value) > 2 else value
                            prompt_parts.append(f"{key.replace('_', ' ').title()}: {items}")

        # Active campaigns
        if context_data.get('campaigns'):
            campaigns = context_data['campaigns']
            if campaigns:
                prompt_parts.append(f"\n[ACTIVE CAMPAIGNS: {len(campaigns)}]")
                for campaign in campaigns[:3]:  # Show top 3
                    prompt_parts.append(f"- {campaign.get('name', 'Unnamed')}: {campaign.get('status', 'active')}")

        # Agent-specific context
        if agent_type == 'strategy' and context_data.get('strategy_outputs'):
            strategies = context_data['strategy_outputs']
            prompt_parts.append(f"\n[PREVIOUS STRATEGIES: {len(strategies)}]")
            for strategy in strategies[:2]:  # Show recent 2
                prompt_parts.append(f"- {strategy.get('title', 'Strategy')}: {strategy.get('created_at', '')[:10]}")

        elif agent_type == 'persona' and context_data.get('personas'):  # Nuclear migration
            personas = context_data['personas']
            prompt_parts.append(f"\n[EXISTING PERSONAS: {len(personas)}]")
            for persona in personas[:3]:  # Show top 3
                prompt_parts.append(f"- {persona.get('name', 'Persona')}: {persona.get('title', 'Unknown role')}")

        elif agent_type == 'content' and context_data.get('content_outputs'):
            contents = context_data['content_outputs']
            prompt_parts.append(f"\n[RECENT CONTENT: {len(contents)}]")
            for content in contents[:2]:  # Show recent 2
                prompt_parts.append(f"- {content.get('title', 'Content')}: {content.get('type', 'Unknown type')}")

        elif agent_type == 'marketing_strategy' and context_data.get('marketing_strategies'):
            strategies = context_data['marketing_strategies']
            prompt_parts.append(f"\n[MARKETING STRATEGIES: {len(strategies)}]")
            for strategy in strategies[:2]:  # Show recent 2
                prompt_parts.append(f"- {strategy.get('name', 'Strategy')}: {strategy.get('created_at', '')[:10]}")

        # Add instruction for using this context and examples to increase token count
        prompt_parts.append("\n[CONTEXT USAGE INSTRUCTIONS]")
        prompt_parts.append("Use the above enterprise context to provide relevant, personalized responses.")
        prompt_parts.append("Maintain consistency with brand guidelines and reference existing strategies/content when applicable.")
        prompt_parts.append("Consider the company's industry, stage, and resources when making recommendations.")

        # Add detailed strategic context to reach minimum token threshold
        prompt_parts.append("\n[STRATEGIC CONTEXT FOR ANALYSIS]")
        prompt_parts.append("When analyzing this company's business strategy, consider these key factors:")
        prompt_parts.append("1. Market Position: Analyze the company's competitive positioning within their industry segment")
        prompt_parts.append("2. Growth Stage Implications: Consider the specific challenges and opportunities for companies at this growth stage")
        prompt_parts.append("3. Resource Constraints: Factor in the company size and likely resource limitations when making recommendations")
        prompt_parts.append("4. Industry Dynamics: Consider the specific trends and competitive forces in their industry")
        prompt_parts.append("5. Brand Consistency: Ensure all recommendations align with established brand guidelines and voice")
        prompt_parts.append("6. Historical Context: Reference previous strategies and their outcomes when making new recommendations")

        prompt_parts.append("\n[ANALYSIS FRAMEWORK GUIDELINES]")
        prompt_parts.append("Apply these strategic frameworks as appropriate:")
        prompt_parts.append("- SWOT Analysis: Comprehensive assessment of Strengths, Weaknesses, Opportunities, and Threats")
        prompt_parts.append("- Porter's Five Forces: Industry analysis considering supplier power, buyer power, competitive rivalry, threat of substitutes, and barriers to entry")
        prompt_parts.append("- Business Model Canvas: Evaluate key partnerships, activities, resources, value propositions, customer relationships, channels, customer segments, cost structure, and revenue streams")
        prompt_parts.append("- ICE Prioritization: Score initiatives on Impact, Confidence, and Ease of implementation")
        prompt_parts.append("- Blue Ocean Strategy: Identify opportunities to create uncontested market space")
        prompt_parts.append("- McKinsey 7S Framework: Analyze strategy, structure, systems, shared values, style, staff, and skills")

        prompt_parts.append("\n[IMPLEMENTATION CONSIDERATIONS]")
        prompt_parts.append("When providing strategic recommendations, always include:")
        prompt_parts.append("- Specific, actionable next steps tailored to the company's size and resources")
        prompt_parts.append("- Timeline considerations appropriate for their growth stage and industry")
        prompt_parts.append("- Resource requirements and potential budget implications")
        prompt_parts.append("- Key performance indicators to measure success")
        prompt_parts.append("- Risk mitigation strategies for identified threats and challenges")
        prompt_parts.append("- Integration points with existing business processes and brand guidelines")

        # Build the formatted context
        formatted_context = "\n".join(prompt_parts)

        # Ensure minimum token count (Gemini requires 2048+ tokens for caching with Flash models)
        # Rough estimate: 1 token ≈ 3.5 characters (more conservative to avoid underestimation)
        estimated_tokens = len(formatted_context) // 3.5
        MIN_TOKENS_REQUIRED = 2048

        if estimated_tokens < MIN_TOKENS_REQUIRED:
            # Add additional strategic guidance padding to reach minimum
            padding_needed = int(MIN_TOKENS_REQUIRED - estimated_tokens)
            logger.info(f"Context below minimum ({int(estimated_tokens)} < {MIN_TOKENS_REQUIRED}), adding {padding_needed} tokens of padding")

            padding_parts = []
            padding_parts.append("\n[EXTENDED STRATEGIC GUIDANCE]")
            padding_parts.append("This enterprise context cache enables personalized strategic analysis across all agents.")
            padding_parts.append("The following additional guidance ensures comprehensive and tailored recommendations:")

            padding_parts.append("\n**Industry-Specific Best Practices:**")
            padding_parts.append("Consider industry-specific trends, regulatory requirements, and competitive dynamics when formulating strategies.")
            padding_parts.append("Research current market conditions, emerging technologies, and customer behavior shifts relevant to this industry.")
            padding_parts.append("Identify industry leaders and analyze their strategic approaches for applicable insights.")

            padding_parts.append("\n**Growth Stage Strategies:**")
            padding_parts.append("Startup Stage: Focus on product-market fit, customer acquisition, and rapid iteration based on feedback.")
            padding_parts.append("Growth Stage: Scale operations, build repeatable processes, expand market reach, and optimize unit economics.")
            padding_parts.append("Established Stage: Enhance operational efficiency, explore new markets, innovate product lines, and defend market position.")

            padding_parts.append("\n**Resource Optimization:**")
            padding_parts.append("Maximize impact with available resources by prioritizing high-ROI initiatives and leveraging existing assets.")
            padding_parts.append("Consider cost-effective alternatives like partnerships, automation, and process optimization.")
            padding_parts.append("Balance short-term wins with long-term strategic investments for sustainable growth.")

            padding_parts.append("\n**Brand Alignment:**")
            padding_parts.append("Ensure all strategic recommendations reinforce brand positioning and messaging consistency.")
            padding_parts.append("Maintain authentic brand voice across all customer touchpoints and marketing channels.")
            padding_parts.append("Build brand equity through consistent delivery of value propositions and customer promises.")

            padding_parts.append("\n**Data-Driven Decision Making:**")
            padding_parts.append("Base strategic recommendations on quantitative data and validated customer insights.")
            padding_parts.append("Establish clear metrics and KPIs to measure progress toward strategic objectives.")
            padding_parts.append("Implement feedback loops to continuously refine strategies based on performance data.")

            padding_parts.append("\n**Competitive Differentiation:**")
            padding_parts.append("Identify unique value propositions that distinguish this company from competitors.")
            padding_parts.append("Develop defensive strategies to protect core advantages and market positions.")
            padding_parts.append("Explore blue ocean opportunities where competition is irrelevant or minimal.")

            padding_parts.append("\n**Risk Management:**")
            padding_parts.append("Anticipate potential risks and develop contingency plans for various scenarios.")
            padding_parts.append("Balance innovation with risk mitigation to enable calculated strategic bets.")
            padding_parts.append("Monitor external factors (economic, technological, regulatory) that could impact strategies.")

            formatted_context += "\n" + "\n".join(padding_parts)
            logger.info(f"Added padding, new estimated tokens: {int(len(formatted_context) // 3.5)}")

        return formatted_context

    def _get_system_instruction(self, agent_type: str) -> str:
        """Get agent-specific system instructions for cached context"""
        instructions = {
            'strategy': (
                "You are a strategic business advisor specializing in comprehensive business analysis "
                "using proven frameworks like SWOT, Porter's Five Forces, and Blue Ocean Strategy. "
                "Use the cached enterprise context to provide tailored strategic recommendations."
            ),
            'persona': (
                "You are an expert in customer psychology and persona development. "
                "Use the cached context to create detailed, data-driven customer personas "
                "that align with the company's target market and existing personas."
            ),
            'content': (
                "You are a creative content strategist who creates engaging marketing materials. "
                "Use the cached brand guidelines and context to ensure all content "
                "maintains brand consistency and speaks to the target audience."
            ),
            'marketing_strategy': (
                "You are a marketing strategy expert bridging business goals with tactical execution. "
                "Use the cached context to create comprehensive go-to-market strategies "
                "that leverage existing personas and align with business objectives."
            ),
            'analytics': (
                "You are a data-driven analytics expert providing actionable insights. "
                "Use the cached context to analyze performance metrics and provide "
                "recommendations that align with business goals."
            ),
            'roi_budget': (
                "You are a financial strategist optimizing marketing ROI and budget allocation. "
                "Use the cached context to provide budget recommendations that "
                "match the company's stage and resources."
            ),
            'campaign_planning': (
                "You are a campaign execution specialist ensuring successful deployment. "
                "Use the cached context to create detailed execution plans that "
                "leverage existing strategies and resources."
            ),
            'quick_wins': (
                "You are a specialist in identifying immediate impact opportunities. "
                "Use the cached context to find quick wins appropriate for the "
                "company's current stage and resources."
            ),
            'competitive_intelligence': (
                "You are a competitive analysis expert providing market insights. "
                "Use the cached context to analyze competitive positioning "
                "relative to the company's industry and market."
            ),
            'client_success': (
                "You are a client success specialist focused on retention and growth. "
                "Use the cached context to provide strategies that enhance "
                "client satisfaction and lifetime value."
            )
        }

        return instructions.get(agent_type, (
            "You are a helpful AI assistant. Use the cached enterprise context "
            "to provide relevant and personalized responses."
        ))

    async def generate_with_cache(
        self,
        cache_name: str,
        user_prompt: str,
        model: str = DEFAULT_MODEL,
        temperature: float = 1.0,
        max_output_tokens: int = 8192
    ):
        """
        Generate content using a cached context.

        Args:
            cache_name: The cache identifier returned from create_enterprise_cache
            user_prompt: The user's query/prompt
            model: Gemini model to use
            temperature: Generation temperature
            max_output_tokens: Maximum tokens to generate

        Returns:
            Generated response with cache usage metrics
        """
        try:
            response = await self.client.aio.models.generate_content(
                model=model,
                contents=user_prompt,
                config={
                    "cached_content": cache_name,
                    "temperature": temperature,
                    "max_output_tokens": max_output_tokens,
                }
            )

            # Log cache hit metrics if available
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                cached_tokens = getattr(response.usage_metadata, 'cached_content_token_count', 0)
                if cached_tokens > 0:
                    logger.info(f"Cache hit - Used {cached_tokens} cached tokens")

            return response

        except Exception as e:
            logger.error(f"Failed to use cached context: {e}")
            raise

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about current cache usage"""
        now = datetime.utcnow()

        active_caches = [
            cache for cache in self._cache_registry.values()
            if cache['expires_at'] > now
        ]

        expired_caches = [
            cache for cache in self._cache_registry.values()
            if cache['expires_at'] <= now
        ]

        total_tokens = sum(cache.get('token_count', 0) for cache in active_caches)

        return {
            'enabled': self._enabled,
            'active_caches': len(active_caches),
            'expired_caches': len(expired_caches),
            'total_cached_tokens': total_tokens,
            'cache_by_agent': self._get_cache_by_agent(active_caches),
            'oldest_cache': min(
                (cache['created_at'] for cache in active_caches),
                default=None
            ),
            'newest_cache': max(
                (cache['created_at'] for cache in active_caches),
                default=None
            )
        }

    def _get_cache_by_agent(self, caches: List[Dict]) -> Dict[str, int]:
        """Get cache count by agent type"""
        by_agent = {}
        for cache in caches:
            agent_type = cache.get('agent_type', 'unknown')
            by_agent[agent_type] = by_agent.get(agent_type, 0) + 1
        return by_agent

    def cleanup_expired_caches(self):
        """Remove expired caches from registry"""
        now = datetime.utcnow()
        expired_keys = [
            key for key, item in self._cache_registry.items()
            if item['expires_at'] <= now
        ]

        for key in expired_keys:
            logger.info(f"Removing expired cache: {key}")
            del self._cache_registry[key]

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired caches")

    def clear_all_caches(self):
        """Clear all caches (useful for testing or forced refresh)"""
        count = len(self._cache_registry)
        self._cache_registry.clear()
        logger.info(f"Cleared {count} caches from registry")


# Factory function for creating cache manager
def create_cache_manager(api_key: Optional[str] = None) -> GeminiCacheManager:
    """Create a GeminiCacheManager instance"""
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("No Gemini API key found in environment")

    return GeminiCacheManager(api_key=api_key)