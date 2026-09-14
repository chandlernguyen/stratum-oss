"""
Progressive Learning Context Service - Always Fresh, No Caching

This service implements the progressive learning architecture where business context
is learned organically through agent conversations. NO CACHING - always queries live
from database for fresh data.

Key Principle: Every agent conversation is an opportunity to learn more about the business.
Data freshness is critical for cross-agent intelligence sharing.

Performance: PostgreSQL functions provide ~5-10ms queries, fast enough without caching.

Schema Routing (Week 1 Integration):
- Added org_type parameter and SchemaRouter integration
- Prepares infrastructure for agency vs SME schema routing
- Full implementation in subsequent phases
"""
from typing import Dict, Any, List, Optional
import logging
import asyncio

from apps.api.utils.database import get_supabase_client
from apps.api.services.schema_router import SchemaRouter

logger = logging.getLogger(__name__)

class ProgressiveLearningContextService:
    """
    Progressive learning context service implementing:
    1. Always-fresh database queries (NO CACHING!)
    2. PostgreSQL functions for efficient live queries (~5-50ms)
    3. Cross-agent intelligence sharing (immediate visibility)
    4. Progressive business context learning (organic through conversations)
    """

    # Comprehensive Business Context Tables
    COMPREHENSIVE_CONTEXT_TABLES = {
        'core_business_data',      # Company fundamentals (progressively learned)
        'organizations',           # Organization details
        'campaigns',              # Campaign data
        'brand_guidelines',       # Brand consistency rules
        'agent_outputs',          # Universal storage for all agent outputs
        'marketing_strategies',   # Marketing plans
        'clients'                # Client information
    }

    DEEP_ANALYSIS_TABLES = [
        'ai_insights',
        'validated_insights',
        'agent_conversations',
        'agent_context_profiles',
        'persona_interactions'
    ]

    def __init__(
        self,
        org_id: str,
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        org_type: Optional[str] = None,  # Week 3: Added for schema routing
        client_id: Optional[str] = None   # Week 3: Added for agency client scoping
    ):
        """
        Initialize progressive learning context service (NO CACHING!)

        Args:
            org_id: Organization ID
            user_id: Optional user ID
            campaign_id: Optional campaign ID
            org_type: Optional organization type ('SME' or 'AGENCY') for schema routing
            client_id: Optional client ID (required for AGENCY orgs)
        """
        self.org_id = org_id
        self.user_id = user_id
        self.campaign_id = campaign_id
        self.org_type = org_type
        self.client_id = client_id  # Week 3: Store client_id
        self.db = get_supabase_client()

        # Week 3: Initialize SchemaRouter if org_type provided
        if org_type:
            try:
                self.schema_router = SchemaRouter(org_type)
                context_info = f"{self.schema_router.get_schema()} schema"
                if self.schema_router.should_use_client_scoping() and client_id:
                    context_info += f", client_id={client_id[:8]}..."
                logger.info(f"[ProgressiveLearning] Schema routing enabled: {context_info}")
            except ValueError as e:
                logger.warning(f"[ProgressiveLearning] Invalid org_type '{org_type}': {e}. Falling back to public schema.")
                self.schema_router = None
        else:
            self.schema_router = None
            logger.debug("[ProgressiveLearning] No org_type provided, using public schema (backward compatible)")

        # NO _cache or _cache_expiry - always query live!

    async def get_progressive_context(
        self,
        agent_type: str,
        query_complexity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Load comprehensive business context with ALWAYS-FRESH data.

        Uses routed database function for schema-aware context loading:
        - AGENCY: Calls get_agent_context_routed → agency.get_agent_context (client-scoped)
        - SME: Calls get_agent_context_routed → public.get_agent_context (org-scoped)

        Performance: 91% faster than multi-query approach (12s → 1.2s)

        Args:
            agent_type: Type of agent (for logging and cross-agent intelligence)
            query_complexity: Optional complexity hint ('simple', 'moderate', 'complex')

        Returns:
            Comprehensive context dictionary with fresh business data
        """
        start_time = asyncio.get_event_loop().time()

        try:
            # Week 3: Use routed function if schema routing is enabled
            if self.schema_router:
                # Schema-aware context loading
                function_name = 'get_agent_context_routed'
                params = {
                    'p_org_id': self.org_id,
                    'p_agent_type': agent_type
                }

                # Add client_id for agency organizations
                if self.schema_router.should_use_client_scoping():
                    if not self.client_id:
                        logger.error(f"[ProgressiveLearning] client_id required for AGENCY organization")
                        raise ValueError("client_id required for agency organizations")
                    params['p_client_id'] = self.client_id
                else:
                    params['p_client_id'] = None

                logger.info(
                    f"[ProgressiveLearning] Loading context via {function_name}() "
                    f"for {agent_type} agent (schema={self.schema_router.get_schema()})"
                )
            else:
                # Backward compatible: Use original function
                function_name = 'get_agent_context'
                params = {
                    'p_org_id': self.org_id,
                    'p_agent_type': agent_type
                }
                logger.info(f"[ProgressiveLearning] Loading context via {function_name}() for {agent_type} agent...")

            result = await asyncio.to_thread(
                lambda: self.db.rpc(function_name, params).execute()
            )

            context = result.data if result.data else {}
            elapsed_ms = (asyncio.get_event_loop().time() - start_time) * 1000

            logger.info(f"[ProgressiveLearning] ✅ Loaded fresh context in {elapsed_ms:.2f}ms via database function")

            # Optional: Add deep analysis context for complex queries
            if query_complexity == 'complex':
                additional_fetches = {}
                for table in self.DEEP_ANALYSIS_TABLES:
                    if table not in context:
                        additional_fetches[table] = self._fetch_table_async(table)

                if additional_fetches:
                    additional_results = await asyncio.gather(*additional_fetches.values(), return_exceptions=True)
                    for i, table_name in enumerate(additional_fetches.keys()):
                        result = additional_results[i]
                        if not isinstance(result, Exception):
                            context[table_name] = result

            return context

        except Exception as e:
            # Fallback to legacy multi-query approach
            logger.warning(f"[ProgressiveLearning] Database function failed ({e}), falling back to legacy multi-query approach...")
            return await self._get_progressive_context_legacy(agent_type, query_complexity)

    async def _get_progressive_context_legacy(
        self,
        agent_type: str,
        query_complexity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        LEGACY: Multi-query context loading (12s).
        Only used as fallback if get_agent_context() database function fails.
        """
        context = {}
        table_fetches = {}

        # Use progressive learning function for core business context
        # This is ~5-10ms and includes both core data + recent insights
        table_fetches['progressive_business_context'] = self._fetch_progressive_business_context()

        # Load comprehensive context for ALL agents (Database-First Architecture)
        for table in self.COMPREHENSIVE_CONTEXT_TABLES:
            # Skip core_business_data - already included in progressive context
            if table == 'core_business_data':
                continue

            # Special handling for organizations table
            if table == 'organizations':
                table_fetches[table] = self._fetch_table_async(table, single=True, column="id", value=self.org_id)
            elif table == 'agent_outputs':
                # Use cross-agent intelligence function for relevant insights
                table_fetches[table] = self._fetch_cross_agent_intelligence(
                    current_agent=agent_type,
                    query_context=None,  # Can be enhanced with query context
                    limit=50
                )
            else:
                table_fetches[table] = self._fetch_table_async(table, limit=50)

        # Optional: Add deep analysis context for complex queries
        if query_complexity == 'complex':
            for table in self.DEEP_ANALYSIS_TABLES:
                if table not in table_fetches:
                    table_fetches[table] = self._fetch_table_async(table)

        # Execute all fetches in parallel (Database-First performance)
        logger.info(f"[ProgressiveLearning] LEGACY: Loading context with {len(table_fetches)} queries...")
        start_time = asyncio.get_event_loop().time()

        results = await asyncio.gather(*table_fetches.values(), return_exceptions=True)

        elapsed_ms = (asyncio.get_event_loop().time() - start_time) * 1000

        # Process all results
        for i, table_name in enumerate(table_fetches.keys()):
            result = results[i]
            if isinstance(result, Exception):
                logger.error(f"Failed to fetch {table_name}: {result}")
                context[table_name] = [] if table_name != 'progressive_business_context' else {}
            else:
                context[table_name] = result

        logger.info(f"[ProgressiveLearning] LEGACY: Loaded context in {elapsed_ms:.2f}ms")
        return context

    async def _fetch_progressive_business_context(self) -> Dict[str, Any]:
        """
        Fetch progressive business context using database function.

        Performance: ~5-10ms for complete context assembly.
        Returns: {'core_business': {...}, 'recent_insights': [...], 'assembled_at': '...'}
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.db.rpc('get_progressive_business_context', {
                    'p_org_id': self.org_id
                }).execute()
            )

            context = result.data if result.data else {
                'core_business': {},
                'recent_insights': [],
                'assembled_at': None
            }

            logger.debug(f"[ProgressiveLearning] Fetched context with {len(context.get('recent_insights', []))} recent insights")
            return context
        except Exception as e:
            logger.error(f"Failed to fetch progressive business context: {e}")
            return {'core_business': {}, 'recent_insights': [], 'assembled_at': None}

    async def _fetch_cross_agent_intelligence(
        self,
        current_agent: str,
        query_context: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fetch cross-agent intelligence using database function with relevance scoring.

        Performance: ~3-5ms for relevance-ranked insights.
        Returns: List of agent outputs with relevance scores
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.db.rpc('get_cross_agent_intelligence', {
                    'p_org_id': self.org_id,
                    'p_current_agent': current_agent,
                    'p_query_context': query_context,
                    'p_limit': limit
                }).execute()
            )

            insights = result.data if result.data else []

            # Log agent type distribution for debugging
            if insights:
                agent_types = set(insight.get('agent_type', 'unknown') for insight in insights)
                logger.debug(f"[ProgressiveLearning] Fetched {len(insights)} insights from agents: {sorted(agent_types)}")

            return insights
        except Exception as e:
            logger.error(f"Failed to fetch cross-agent intelligence: {e}")
            return []

    async def update_business_learning(
        self,
        field: str,
        value: List[str],
        source_agent: str,
        confidence: float = 0.8
    ) -> Optional[Dict[str, Any]]:
        """
        Update business learning using database function.

        Merges new learnings into core_business_data.
        Supported fields: key_competitors, main_products, target_market, tech_stack, geography

        Args:
            field: Field name to update
            value: Array of values to add
            source_agent: Agent that learned this information
            confidence: Confidence level (0.0-1.0)

        Returns:
            Update result or None if failed
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.db.rpc('update_business_learning', {
                    'p_org_id': self.org_id,
                    'p_field': field,
                    'p_value': value,
                    'p_source_agent': source_agent,
                    'p_confidence': confidence
                }).execute()
            )

            update_info = result.data if result.data else None
            if update_info:
                logger.info(f"[ProgressiveLearning] {source_agent} learned {field}: {value} (confidence={confidence})")

            return update_info
        except Exception as e:
            logger.error(f"Failed to update business learning for {field}: {e}")
            return None

    async def _fetch_table_async(
        self,
        table_name: str,
        single: bool = False,
        limit: int = 20,
        column: str = "org_id",
        value: Any = None
    ) -> Any:
        """
        Async table fetch using asyncio.to_thread to avoid blocking.

        ALWAYS FETCHES LIVE - NO CACHING!
        """
        try:
            query_value = value if value is not None else self.org_id
            query = self.db.table(table_name).select('*').eq(column, query_value)

            if single:
                # Fetch a single record
                result = await asyncio.to_thread(query.single().execute)
                return result.data if result.data else {}
            else:
                # Fetch a list of records
                query = query.order("created_at", desc=True).limit(limit)
                result = await asyncio.to_thread(query.execute)
                return result.data if result.data else []
        except Exception as e:
            logger.error(f"Async fetch failed for table '{table_name}': {e}")
            return {} if single else []

    def get_schema_qualified_table(self, base_table: str) -> str:
        """
        Get schema-qualified table name based on org_type (Week 1 helper).

        This method prepares infrastructure for future schema-aware querying.
        Currently returns base table name for backward compatibility.

        Args:
            base_table: Base table name (e.g., 'clients', 'client_intelligence')

        Returns:
            Schema-qualified table name (e.g., 'agency.clients' or 'public.clients')

        Examples:
            >>> service = ProgressiveLearningContextService(org_id="123", org_type="AGENCY")
            >>> service.get_schema_qualified_table("clients")
            'agency.clients'

            >>> service = ProgressiveLearningContextService(org_id="456", org_type="SME")
            >>> service.get_schema_qualified_table("clients")
            'public.clients'

        TODO (Week 2+): Use this method in _fetch_table_async() for actual routing
        """
        if self.schema_router:
            qualified_name = self.schema_router.get_table_name(base_table)
            logger.debug(f"[ProgressiveLearning] Schema-qualified table: {qualified_name}")
            return qualified_name

        # Backward compatible: return base table name (uses public schema by default)
        return base_table


# Factory function for creating progressive learning context service
def create_progressive_learning_context_service(
    org_id: str,
    user_id: Optional[str] = None,
    campaign_id: Optional[str] = None
) -> ProgressiveLearningContextService:
    """Factory function to create progressive learning context service instance"""
    return ProgressiveLearningContextService(org_id, user_id, campaign_id)
