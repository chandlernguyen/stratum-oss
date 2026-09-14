"""
Business Intelligence Service - Unified Business Context Loading

This service provides a single interface for loading business intelligence data
that works seamlessly for both SME and Agency organizations.

Key Features:
- Single function call: get_business_intelligence_routed(org_id, client_id)
- Field name normalization: Database-level mapping handles inconsistencies
- Schema routing: Automatically routes to correct schema based on org_type
- Consistent structure: Returns standardized JSONB regardless of source

Architecture:
- SME: Loads from public.core_business_data (org-level)
- Agency: Loads from agency.client_intelligence + agency.clients (client-level)
- Field mapping: company_name → name, learning_metadata → ai_insights

Related Documentation:
- /docs/architecture/UNIFIED_BUSINESS_INTELLIGENCE_ACTION_PLAN_2025_10_29.md
- Migration 186: unified_business_intelligence_router
- /docs/SEPARATE_SCHEMA_ARCHITECTURE_DECISION_2025_10_27.md

Created: 2025-10-29
"""
from typing import Dict, Any, Optional
import logging
import asyncio

from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)


class BusinessIntelligenceService:
    """
    Unified business intelligence service for loading business context.

    Replaces multiple code paths with single database function call that handles:
    - Schema routing (public vs agency)
    - Field name normalization
    - Missing field defaults
    - Consistent JSONB structure

    Usage:
        service = BusinessIntelligenceService()

        # SME: Load org-level business data
        sme_data = await service.get_intelligence(org_id="123", client_id=None)

        # Agency: Load client-specific business data
        agency_data = await service.get_intelligence(org_id="456", client_id="789")
    """

    def __init__(self):
        """Initialize service with database client."""
        self.db = get_supabase_client()

    async def get_intelligence(
        self,
        org_id: str,
        client_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Load business intelligence using unified database function.

        Calls get_business_intelligence_routed() which:
        - Routes to correct schema based on org_type lookup
        - Normalizes field names for consistency
        - Handles missing fields with appropriate defaults
        - Returns standardized JSONB structure

        Args:
            org_id: Organization ID (required)
            client_id: Client ID (required for AGENCY, None for SME)

        Returns:
            Standardized business intelligence dictionary with fields:
            - name: Business/client name
            - industry: Industry classification
            - website: Website URL
            - status: Client status (Agency only)
            - company_size: Size classification
            - company_stage: Growth stage
            - business_model: Business model type
            - target_market: Target market segments (array)
            - key_competitors: Key competitors (array)
            - unique_value_proposition: UVP description
            - marketing_budget: Marketing budget amount
            - current_marketing_channels: Active channels (array)
            - marketing_goals: Marketing objectives (array)
            - ai_insights: AI-learned insights (JSONB)
            - persona_patterns: Persona patterns (JSONB)
            - content_themes: Content themes (JSONB)
            - campaign_preferences: Campaign preferences (JSONB)
            - data_completeness_score: Completeness percentage (0-100)
            - conversation_count: Number of AI interactions
            - last_interaction_at: Last interaction timestamp
            - learning_milestones: Learning milestones (JSONB)
            - client_id: Client ID (Agency) or NULL (SME)
            - org_id: Organization ID
            - last_updated: Last update timestamp

        Example:
            >>> service = BusinessIntelligenceService()
            >>> # SME usage
            >>> intelligence = await service.get_intelligence(org_id="abc", client_id=None)
            >>> print(intelligence['name'])  # Company name from core_business_data
            >>>
            >>> # Agency usage
            >>> intelligence = await service.get_intelligence(org_id="def", client_id="ghi")
            >>> print(intelligence['name'])  # Client name from agency.clients
        """
        try:
            # Prepare parameters
            params = {
                'p_org_id': org_id,
                'p_client_id': client_id
            }

            # Log the call
            context_type = "Agency client" if client_id else "SME organization"
            logger.info(
                f"[BusinessIntelligence] Loading {context_type} intelligence "
                f"(org_id={org_id[:8]}...{', client_id=' + client_id[:8] + '...' if client_id else ''})"
            )

            # Call unified database function
            result = await asyncio.to_thread(
                lambda: self.db.rpc('get_business_intelligence_routed', params).execute()
            )

            intelligence = result.data if result.data else None

            if intelligence:
                # Log success with data completeness
                completeness = intelligence.get('data_completeness_score', 0)
                conv_count = intelligence.get('conversation_count', 0)
                logger.info(
                    f"[BusinessIntelligence] ✅ Loaded {context_type} intelligence "
                    f"(completeness: {completeness}%, conversations: {conv_count})"
                )
            else:
                logger.warning(
                    f"[BusinessIntelligence] No intelligence found for {context_type} "
                    f"(org_id={org_id[:8]}...)"
                )

            return intelligence

        except Exception as e:
            logger.error(
                f"[BusinessIntelligence] Failed to load intelligence for org_id={org_id[:8]}...: {e}",
                exc_info=True
            )
            return None

    async def get_intelligence_for_agent(
        self,
        org_id: str,
        client_id: Optional[str],
        agent_type: str
    ) -> Dict[str, Any]:
        """
        Load business intelligence formatted for agent consumption.

        This is a convenience method that:
        1. Loads intelligence using get_intelligence()
        2. Formats it for agent prompt injection
        3. Adds agent-specific logging

        Args:
            org_id: Organization ID
            client_id: Client ID (Agency) or None (SME)
            agent_type: Type of agent requesting intelligence

        Returns:
            Dictionary with intelligence data ready for agent prompt
        """
        intelligence = await self.get_intelligence(org_id, client_id)

        if not intelligence:
            logger.warning(
                f"[BusinessIntelligence] No intelligence available for {agent_type} agent"
            )
            return {}

        # Log agent-specific context loading
        logger.info(
            f"[BusinessIntelligence] Providing intelligence to {agent_type} agent "
            f"(completeness: {intelligence.get('data_completeness_score', 0)}%)"
        )

        return intelligence

    def format_intelligence_for_prompt(
        self,
        intelligence: Optional[Dict[str, Any]]
    ) -> str:
        """
        Format business intelligence for agent prompt injection.

        Converts structured intelligence data into formatted text suitable
        for inclusion in agent system prompts.

        Args:
            intelligence: Business intelligence dictionary

        Returns:
            Formatted string for prompt injection
        """
        if not intelligence:
            return ""

        parts = []
        parts.append("=" * 80)
        parts.append("BUSINESS INTELLIGENCE CONTEXT")
        parts.append("=" * 80)

        # Basic information
        if intelligence.get('name'):
            parts.append(f"\nBUSINESS: {intelligence['name']}")
            logger.info(f"[BusinessIntelligence] Formatting - name: {intelligence['name']}")
        if intelligence.get('industry'):
            parts.append(f"INDUSTRY: {intelligence['industry']}")
            logger.info(f"[BusinessIntelligence] Formatting - industry: {intelligence['industry']}")
        if intelligence.get('website'):
            parts.append(f"WEBSITE: {intelligence['website']}")

        # Company profile
        if intelligence.get('company_size'):
            parts.append(f"COMPANY SIZE: {intelligence['company_size']}")
        if intelligence.get('company_stage'):
            parts.append(f"COMPANY STAGE: {intelligence['company_stage']}")
        if intelligence.get('business_model'):
            parts.append(f"BUSINESS MODEL: {intelligence['business_model']}")

        # Market context
        target_market = intelligence.get('target_market')
        if isinstance(target_market, list) and target_market:
            parts.append(f"TARGET MARKET: {', '.join(target_market)}")

        competitors = intelligence.get('key_competitors')
        if isinstance(competitors, list) and competitors:
            parts.append(f"KEY COMPETITORS: {', '.join(competitors)}")

        if intelligence.get('unique_value_proposition'):
            parts.append(f"VALUE PROPOSITION: {intelligence['unique_value_proposition']}")

        # Marketing context
        if intelligence.get('marketing_budget'):
            parts.append(f"MARKETING BUDGET: {intelligence['marketing_budget']}")

        channels = intelligence.get('current_marketing_channels')
        if isinstance(channels, list) and channels:
            parts.append(f"MARKETING CHANNELS: {', '.join(channels)}")

        goals = intelligence.get('marketing_goals')
        if isinstance(goals, list) and goals:
            parts.append(f"MARKETING GOALS: {', '.join(goals)}")

        # Progressive learning metrics
        completeness = intelligence.get('data_completeness_score')
        if completeness is not None:
            parts.append(f"\nDATA COMPLETENESS: {completeness}%")

        conv_count = intelligence.get('conversation_count')
        if conv_count:
            parts.append(f"CONVERSATION COUNT: {conv_count} interactions")

        # AI-learned insights
        ai_insights = intelligence.get('ai_insights')
        if isinstance(ai_insights, dict) and ai_insights:
            parts.append("\nAI-LEARNED INSIGHTS:")
            for key, value in ai_insights.items():
                if value:
                    parts.append(f"  • {key}: {value}")

        parts.append("=" * 80)

        return "\n".join(parts)


# Factory function for service creation
def create_business_intelligence_service() -> BusinessIntelligenceService:
    """Factory function to create business intelligence service instance."""
    return BusinessIntelligenceService()


# Convenience function for direct intelligence loading
async def get_business_intelligence(
    org_id: str,
    client_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Convenience function for loading business intelligence.

    Args:
        org_id: Organization ID
        client_id: Client ID (Agency) or None (SME)

    Returns:
        Business intelligence dictionary or None if not found
    """
    service = BusinessIntelligenceService()
    return await service.get_intelligence(org_id, client_id)
