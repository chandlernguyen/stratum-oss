"""
Enterprise Context Service - Single source of truth for all cross-agent intelligence.
This service provides unified access to all business data across the platform.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from functools import lru_cache
import json

from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)

class EnterpriseContextService:
    """
    Centralized context service that provides unified access to all business data.
    This is the single source of truth for cross-agent intelligence sharing.
    """
    
    def __init__(self, org_id: str, user_id: Optional[str] = None, campaign_id: Optional[str] = None):
        """
        Initialize the context service with organization context.
        
        Args:
            org_id: Organization ID for data scoping
            user_id: Optional user ID for personalized context
            campaign_id: Optional campaign ID for campaign-specific context
        """
        self.org_id = org_id
        self.user_id = user_id
        self.campaign_id = campaign_id
        self.db = get_supabase_client()
        self._cache = {}
        self._cache_expiry = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
        
    def _get_cached_or_fetch(self, key: str, fetch_func):
        """Helper to manage caching of expensive queries."""
        now = datetime.utcnow()
        if key in self._cache and key in self._cache_expiry:
            if self._cache_expiry[key] > now:
                return self._cache[key]
        
        # Fetch fresh data
        data = fetch_func()
        self._cache[key] = data
        self._cache_expiry[key] = now + timedelta(seconds=self._cache_ttl)
        return data
        
    def get_full_context(self) -> Dict[str, Any]:
        """
        Returns complete business context for any agent.
        This includes ALL available data across the platform.
        """
        return {
            # Core Business Data
            "company": self._get_company_profile(),
            "organization": self._get_organization_details(),
            
            # Customer & Persona Data
            "personas": self._get_active_personas(),
            "persona_intelligence": self._get_persona_intelligence(),
            "persona_interactions": self._get_persona_interactions(),
            "customer_intelligence": self._get_customer_intelligence(),
            
            # Strategy & Marketing Data
            "strategies": self._get_marketing_strategies(),
            "strategy_outputs": self._get_strategy_outputs(),
            "strategy_intelligence": self._get_strategy_intelligence(),
            
            # Campaign Data
            "campaigns": self._get_active_campaigns(),
            "campaign_intelligence": self._get_campaign_intelligence(),
            "campaign_planning": self._get_campaign_planning_intelligence(),
            
            # Content & Creative
            "brand_guidelines": self._get_brand_guidelines(),
            "content_intelligence": self._get_content_intelligence(),
            "content_pillars": self._get_content_pillars(),
            
            # Analytics & Performance
            "analytics": self._get_analytics_intelligence(),
            "roi_budget": self._get_roi_budget_intelligence(),
            "performance_metrics": self._get_performance_metrics(),
            
            # Competitive & Market Intelligence
            "competitive": self._get_competitive_intelligence(),
            "market": self._get_market_intelligence(),
            "quick_wins": self._get_quick_wins_intelligence(),
            
            # Client Success
            "clients": self._get_clients(),
            "client_success": self._get_client_success_intelligence(),
            
            # AI Insights & Learning
            "ai_insights": self._get_ai_insights(),
            "validated_insights": self._get_validated_insights(),
            
            # Agent Context
            "agent_conversations": self._get_recent_agent_conversations(),
            "agent_context_profiles": self._get_agent_context_profiles()
        }
    
    def get_agent_specific_context(self, agent_type: str) -> Dict[str, Any]:
        """
        Returns filtered context optimized for specific agent needs.
        This reduces token usage while maintaining relevance.
        """
        # Get full context first
        full_context = self.get_full_context()
        
        # Agent-specific filtering and prioritization
        if agent_type == "strategy":
            return {
                "company": full_context["company"],
                "personas": full_context["personas"],
                "strategy_outputs": full_context["strategy_outputs"],
                "competitive": full_context["competitive"],
                "market": full_context["market"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["strategy", "market"])
            }
            
        elif agent_type == "persona":
            return {
                "company": full_context["company"],
                "personas": full_context["personas"],
                "persona_intelligence": full_context["persona_intelligence"],
                "persona_interactions": full_context["persona_interactions"],
                "customer_intelligence": full_context["customer_intelligence"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["persona", "customer"])
            }
            
        elif agent_type == "marketing_strategy":
            return {
                "company": full_context["company"],
                "personas": full_context["personas"],
                "strategies": full_context["strategies"],
                "strategy_outputs": full_context["strategy_outputs"],
                "campaigns": full_context["campaigns"],
                "content_pillars": full_context["content_pillars"],
                "competitive": full_context["competitive"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["marketing", "strategy"])
            }
            
        elif agent_type == "content":
            return {
                "company": full_context["company"],
                "brand_guidelines": full_context["brand_guidelines"],  # Primary focus for Content Agent
                "personas": full_context["personas"],
                "strategies": full_context["strategies"],
                "content_pillars": full_context["content_pillars"],
                "content_intelligence": full_context["content_intelligence"],
                "campaigns": full_context["campaigns"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["content", "creative"])
            }
            
        elif agent_type == "analytics":
            return {
                "campaigns": full_context["campaigns"],
                "analytics": full_context["analytics"],
                "performance_metrics": full_context["performance_metrics"],
                "roi_budget": full_context["roi_budget"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["analytics", "performance"])
            }
            
        elif agent_type == "roi_budget":
            return {
                "campaigns": full_context["campaigns"],
                "strategies": full_context["strategies"],
                "roi_budget": full_context["roi_budget"],
                "analytics": full_context["analytics"],
                "performance_metrics": full_context["performance_metrics"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["roi", "budget", "cost"])
            }
            
        elif agent_type == "campaign_planning":
            return {
                "campaigns": full_context["campaigns"],
                "strategies": full_context["strategies"],
                "campaign_planning": full_context["campaign_planning"],
                "content_intelligence": full_context["content_intelligence"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["campaign", "execution"])
            }
            
        elif agent_type == "quick_wins":
            return {
                "company": full_context["company"],
                "quick_wins": full_context["quick_wins"],
                "performance_metrics": full_context["performance_metrics"],
                "competitive": full_context["competitive"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["quick_wins", "opportunity"])
            }
            
        elif agent_type == "competitive_intelligence":
            return {
                "company": full_context["company"],
                "competitive": full_context["competitive"],
                "market": full_context["market"],
                "strategy_outputs": full_context["strategy_outputs"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["competitive", "market"])
            }
            
        elif agent_type == "client_success":
            return {
                "clients": full_context["clients"],
                "client_success": full_context["client_success"],
                "campaigns": full_context["campaigns"],
                "performance_metrics": full_context["performance_metrics"],
                "ai_insights": self._filter_insights(full_context["ai_insights"], ["client", "retention"])
            }
            
        else:
            # Default: return full context for unknown agents
            logger.warning(f"Unknown agent type: {agent_type}, returning full context")
            return full_context
    
    # =========== Core Business Data ===========
    
    def _get_company_profile(self) -> Dict[str, Any]:
        """Load core business data and company profile."""
        try:
            result = self.db.table('core_business_data') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .single() \
                .execute()
            return result.data if result.data else {}
        except Exception as e:
            logger.error(f"Error loading company profile: {e}")
            return {}
    
    def _get_organization_details(self) -> Dict[str, Any]:
        """Load organization details."""
        try:
            result = self.db.table('organizations') \
                .select('*') \
                .eq('id', self.org_id) \
                .single() \
                .execute()
            return result.data if result.data else {}
        except Exception as e:
            logger.error(f"Error loading organization: {e}")
            return {}
    
    # =========== Personas & Customer Intelligence ===========
    
    def _get_active_personas(self) -> List[Dict[str, Any]]:
        """Load all active personas from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'persona') \
                .eq('output_type', 'persona') \
                .is_('archived_at', 'null') \
                .order('created_at', desc=True) \
                .execute()

            # Extract personas from JSONB content field
            if not result.data:
                return []

            personas = []
            for item in result.data:
                content = item.get('content', {})
                metadata = item.get('metadata', {})
                persona = {
                    'id': item['id'],
                    'name': content.get('name'),
                    'title': content.get('title'),
                    'company_name': content.get('company_name'),
                    'industry': content.get('industry'),
                    'goals': content.get('goals', []),
                    'pain_points': content.get('pain_points', []),
                    'is_primary': metadata.get('is_primary', False),
                    # Add other fields as needed for context
                }
                personas.append(persona)

            return personas
        except Exception as e:
            logger.error(f"Error loading personas: {e}")
            return []
    
    def _get_persona_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load persona intelligence insights from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'persona') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading persona intelligence: {e}")
            return []
    
    def _get_persona_interactions(self) -> List[Dict[str, Any]]:
        """Load recent persona interactions."""
        try:
            result = self.db.table('persona_interactions') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('created_at', desc=True) \
                .limit(50) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading persona interactions: {e}")
            return []
    
    def _get_customer_intelligence(self) -> List[Dict[str, Any]]:
        """Load customer intelligence data."""
        try:
            result = self.db.table('customer_intelligence') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading customer intelligence: {e}")
            return []
    
    # =========== Strategy & Marketing ===========
    
    def _get_marketing_strategies(self) -> List[Dict[str, Any]]:
        """Load marketing strategies with full details."""
        try:
            result = self.db.table('marketing_strategies') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('created_at', desc=True) \
                .execute()
            
            # Also load linked personas for each strategy (nuclear migration compatible)
            if result.data:
                for strategy in result.data:
                    # Get persona links (just the IDs)
                    persona_links = self.db.table('marketing_strategy_personas') \
                        .select('persona_id') \
                        .eq('strategy_id', strategy['id']) \
                        .execute()

                    if persona_links.data:
                        persona_ids = [link['persona_id'] for link in persona_links.data]
                        # Fetch personas from agent_outputs
                        personas_result = self.db.table('agent_outputs') \
                            .select('*') \
                            .in_('id', persona_ids) \
                            .eq('agent_type', 'persona') \
                            .eq('output_type', 'persona') \
                            .execute()

                        # Extract persona data from JSONB
                        linked_personas = []
                        for item in (personas_result.data or []):
                            content = item.get('content', {})
                            linked_personas.append({
                                'id': item['id'],
                                'name': content.get('name'),
                                'title': content.get('title'),
                                'company_name': content.get('company_name'),
                            })
                        strategy['linked_personas'] = linked_personas
                    else:
                        strategy['linked_personas'] = []
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading marketing strategies: {e}")
            return []
    
    def _get_strategy_outputs(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load strategy framework outputs from agent_outputs table."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'strategy') \
                .order('created_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading strategy outputs: {e}")
            return []
    
    def _get_strategy_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load strategy intelligence insights from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'strategy') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading strategy intelligence: {e}")
            return []
    
    # =========== Campaigns ===========
    
    def _get_active_campaigns(self) -> List[Dict[str, Any]]:
        """Load active campaigns."""
        try:
            # First get campaigns through clients
            clients_result = self.db.table('clients') \
                .select('id') \
                .eq('org_id', self.org_id) \
                .execute()
            
            if not clients_result.data:
                return []
            
            client_ids = [c['id'] for c in clients_result.data]
            
            result = self.db.table('campaigns') \
                .select('*') \
                .in_('client_id', client_ids) \
                .eq('status', 'active') \
                .order('created_at', desc=True) \
                .execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading campaigns: {e}")
            return []
    
    def _get_campaign_intelligence(self) -> List[Dict[str, Any]]:
        """Load campaign intelligence."""
        try:
            result = self.db.table('campaign_intelligence') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading campaign intelligence: {e}")
            return []
    
    def _get_campaign_planning_intelligence(self) -> List[Dict[str, Any]]:
        """Load campaign execution intelligence."""
        try:
            result = self.db.table('campaign_planning_intelligence') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading campaign execution intelligence: {e}")
            return []
    
    # =========== Content & Creative ===========

    def _get_brand_guidelines(self) -> Dict[str, Any]:
        """Load active brand guidelines for the organization."""
        try:
            # First try to get campaign-specific guidelines if campaign_id is provided
            if self.campaign_id:
                result = self.db.table('brand_guidelines') \
                    .select('*') \
                    .eq('org_id', self.org_id) \
                    .eq('campaign_id', self.campaign_id) \
                    .is_('archived_at', 'null') \
                    .order('created_at', desc=True) \
                    .limit(1) \
                    .execute()
                if result.data:
                    return result.data[0]

            # Fall back to default organization guidelines
            result = self.db.table('brand_guidelines') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('is_default', True) \
                .is_('archived_at', 'null') \
                .limit(1) \
                .execute()

            if result.data:
                return result.data[0]

            # If no default, get any active guidelines
            result = self.db.table('brand_guidelines') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .is_('archived_at', 'null') \
                .order('created_at', desc=True) \
                .limit(1) \
                .execute()

            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Error loading brand guidelines: {e}")
            return {}

    def _get_content_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load content intelligence from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'content') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading content intelligence: {e}")
            return []
    
    def _get_content_pillars(self) -> List[str]:
        """Extract content pillars from marketing strategies."""
        try:
            strategies = self._get_marketing_strategies()
            pillars = []
            for strategy in strategies:
                if strategy.get('content_pillars'):
                    pillars.extend(strategy['content_pillars'])
            return list(set(pillars))  # Unique pillars
        except Exception as e:
            logger.error(f"Error extracting content pillars: {e}")
            return []
    
    # =========== Analytics & Performance ===========
    
    def _get_analytics_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load analytics intelligence from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'analytics') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading analytics intelligence: {e}")
            return []
    
    def _get_roi_budget_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load ROI and budget intelligence from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'roi_budget') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading ROI budget intelligence: {e}")
            return []
    
    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Aggregate performance metrics from various sources."""
        try:
            # This would aggregate metrics from campaigns, analytics, etc.
            campaigns = self._get_active_campaigns()
            metrics = {
                "total_campaigns": len(campaigns),
                "total_budget": sum(c.get('budget_cents', 0) for c in campaigns) / 100,
                "avg_roi": 0,  # Would calculate from actual data
                "conversion_rate": 0  # Would calculate from actual data
            }
            return metrics
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {e}")
            return {}
    
    # =========== Market & Competitive Intelligence ===========
    
    def _get_competitive_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load competitive intelligence from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'competitive_intelligence') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading competitive intelligence: {e}")
            return []
    
    def _get_market_intelligence(self) -> List[Dict[str, Any]]:
        """Load market intelligence."""
        try:
            result = self.db.table('market_intelligence') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading market intelligence: {e}")
            return []
    
    def _get_quick_wins_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load quick wins opportunities from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'quick_wins') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading quick wins intelligence: {e}")
            return []
    
    # =========== Client Success ===========
    
    def _get_clients(self) -> List[Dict[str, Any]]:
        """Load all clients for the organization."""
        try:
            result = self.db.table('clients') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('created_at', desc=True) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading clients: {e}")
            return []
    
    def _get_client_success_intelligence(self) -> List[Dict[str, Any]]:
        """🚀 NUCLEAR: Load client success intelligence from agent_outputs."""
        try:
            result = self.db.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'client_success') \
                .is_('archived_at', 'null') \
                .order('updated_at', desc=True) \
                .limit(20) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading client success intelligence: {e}")
            return []
    
    # =========== AI Insights & Learning ===========
    
    def _get_ai_insights(self) -> List[Dict[str, Any]]:
        """Load all AI-generated insights."""
        try:
            result = self.db.table('ai_insights') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .order('confidence_score', desc=True) \
                .limit(50) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading AI insights: {e}")
            return []
    
    def _get_validated_insights(self) -> List[Dict[str, Any]]:
        """Load only validated AI insights."""
        try:
            result = self.db.table('ai_insights') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('validation_status', 'approved') \
                .order('confidence_score', desc=True) \
                .limit(30) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading validated insights: {e}")
            return []
    
    # =========== Agent Context ===========
    
    def _get_recent_agent_conversations(self) -> List[Dict[str, Any]]:
        """Load recent agent conversations for context."""
        try:
            result = self.db.table('agent_conversations') \
                .select('id, agent_type, created_at, updated_at, session_data') \
                .eq('org_id', self.org_id) \
                .order('updated_at', desc=True) \
                .limit(10) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading agent conversations: {e}")
            return []
    
    def _get_agent_context_profiles(self) -> List[Dict[str, Any]]:
        """Load agent context profiles."""
        try:
            # Note: agent_context_profiles is global, not org-specific
            result = self.db.table('agent_context_profiles') \
                .select('*') \
                .order('updated_at', desc=True) \
                .execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error loading agent context profiles: {e}")
            return []
    
    # =========== Helper Methods ===========
    
    def _filter_insights(self, insights: List[Dict], categories: List[str]) -> List[Dict]:
        """Filter insights by category."""
        if not insights:
            return []
        
        filtered = []
        for insight in insights:
            if insight.get('category') in categories or \
               insight.get('source_agent') in categories:
                filtered.append(insight)
        return filtered[:20]  # Limit to top 20 relevant insights
    
    def format_for_prompt(self, context: Dict[str, Any], max_tokens: int = 2000) -> str:
        """
        Format context data into a concise prompt string.
        Prioritizes most relevant information within token limit.
        """
        prompt_parts = []
        
        # Company overview (highest priority)
        if context.get('company'):
            company = context['company']
            prompt_parts.append(f"[COMPANY CONTEXT]")
            prompt_parts.append(f"Name: {company.get('company_name', 'Unknown')}")
            prompt_parts.append(f"Industry: {company.get('industry', 'Unknown')}")
            prompt_parts.append(f"Stage: {company.get('company_stage', 'Unknown')}")
            if company.get('target_market'):
                prompt_parts.append(f"Markets: {', '.join(company['target_market'][:3])}")
        
        # Active personas
        if context.get('personas'):
            prompt_parts.append(f"\n[ACTIVE PERSONAS]")
            for persona in context['personas'][:3]:  # Top 3 personas
                prompt_parts.append(f"• {persona.get('name')} - {persona.get('title')}")
                if persona.get('pain_points'):
                    prompt_parts.append(f"  Pain Points: {', '.join(persona['pain_points'][:2])}")
        
        # Active strategies
        if context.get('strategies'):
            prompt_parts.append(f"\n[MARKETING STRATEGIES]")
            for strategy in context['strategies'][:2]:  # Top 2 strategies
                if strategy.get('status') == 'active':
                    prompt_parts.append(f"• {strategy.get('title', 'Strategy')}")
                    if strategy.get('value_propositions'):
                        prompt_parts.append(f"  Value Props: {strategy['value_propositions'].get('primary', '')[:100]}")
        
        # Key insights
        if context.get('validated_insights'):
            prompt_parts.append(f"\n[KEY INSIGHTS]")
            for insight in context['validated_insights'][:5]:  # Top 5 insights
                prompt_parts.append(f"• {insight.get('title', '')}: {insight.get('content', {}).get('description', '')[:100]}")
        
        # Join and truncate if needed
        prompt = "\n".join(prompt_parts)
        
        # Simple token estimation (avg 4 chars per token)
        estimated_tokens = len(prompt) // 4
        if estimated_tokens > max_tokens:
            # Truncate to fit
            max_chars = max_tokens * 4
            prompt = prompt[:max_chars] + "\n[Context truncated for token limit]"
        
        return prompt
    
    def get_summary_stats(self) -> Dict[str, int]:
        """Get summary statistics of available data."""
        full_context = self.get_full_context()
        return {
            "total_personas": len(full_context.get('personas', [])),
            "total_strategies": len(full_context.get('strategies', [])),
            "total_campaigns": len(full_context.get('campaigns', [])),
            "total_insights": len(full_context.get('ai_insights', [])),
            "validated_insights": len(full_context.get('validated_insights', [])),
            "total_clients": len(full_context.get('clients', []))
        }