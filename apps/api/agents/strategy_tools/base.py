"""Base class for all strategy tool modules."""

from typing import Optional, Any, Dict
import logging


class StrategyToolBase:
    """Base class providing shared utilities for strategy tool modules.

    This class provides access to the parent agent's context, including:
    - Organization, user, and campaign IDs
    - Business context and strategic data
    - Logging utilities
    - Database access through the agent
    """

    def __init__(self, agent):
        """Initialize with reference to parent agent.

        Args:
            agent: The parent DirectStrategyAgent instance
        """
        self.agent = agent
        self.org_id = agent.org_id
        self.user_id = agent.user_id
        self.client_id = getattr(agent, 'client_id', None)  # FIX: Extract client_id for agency multi-tenant
        self.campaign_id = getattr(agent, 'campaign_id', None)
        self.context = getattr(agent, 'context', {})
        self.logger = logging.getLogger(__name__)

        # Access to agent's services (if available)
        self.db = getattr(agent, 'db', None)
        self.model = getattr(agent, 'model', None)

        # Session management
        self.current_session_id = getattr(agent, 'current_session_id', None)

    async def get_business_context(self) -> Optional[Dict[str, Any]]:
        """Get the current business context from database."""
        if not self.campaign_id:
            return None

        try:
            # Get company context
            result = await self.db.fetch_one(
                """
                SELECT * FROM companies
                WHERE org_id = :org_id
                ORDER BY created_at DESC
                LIMIT 1
                """,
                {"org_id": self.org_id}
            )
            return dict(result) if result else None
        except Exception as e:
            self.logger.error(f"Error fetching business context: {e}")
            return None

    async def get_existing_strategies(self) -> list:
        """Get all existing strategies for the current campaign."""
        if not self.campaign_id:
            return []

        try:
            results = await self.db.fetch_all(
                """
                SELECT * FROM marketing_strategies
                WHERE campaign_id = :campaign_id
                AND (archived_at IS NULL OR archived_at > CURRENT_TIMESTAMP)
                ORDER BY created_at DESC
                """,
                {"campaign_id": self.campaign_id}
            )
            return [dict(r) for r in results] if results else []
        except Exception as e:
            self.logger.error(f"Error fetching existing strategies: {e}")
            return []

    async def save_to_outputs(self, output_data: Dict[str, Any]) -> Dict[str, Any]:
        """🚀 NUCLEAR: Save strategy analysis using universal agent_outputs table.

        Args:
            output_data: Dictionary containing output data

        Returns:
            The saved output with ID
        """
        # Import universal service
        from apps.api.services.universal_output_service import get_universal_output_service
        service = get_universal_output_service()

        # Extract title and summary for top-level fields
        title = output_data.get('title', 'Strategy Analysis')
        summary = output_data.get('summary', 'Strategy framework analysis')

        # Prepare complete content preserving all data
        complete_content = {
            'framework_type': output_data.get('framework_type', 'strategy'),
            'framework_data': output_data.get('content', output_data),
            'metadata': output_data.get('metadata', {}),
            'analysis_complete': True
        }

        try:
            # Universal save with complete data preservation
            result = await service.save_agent_output(
                agent_type="strategy",
                output_type=output_data.get('framework_type', 'analysis'),
                content=complete_content,  # Complete strategy data preserved
                title=title,
                summary=summary,
                org_id=self.org_id,
                user_id=self.user_id if hasattr(self, 'user_id') else None,
                client_id=self.client_id,  # FIX: Pass client_id for agency multi-tenant schema routing
                session_id=self.current_session_id,
                campaign_id=self.campaign_id,
                metadata={
                    'framework_type': output_data.get('framework_type', 'strategy'),
                    'agent_type': 'strategy'
                },
                confidence_score=0.85
            )

            self.logger.info(f"✅ Strategy output saved via nuclear: {result['id']}")
            return result

        except Exception as e:
            self.logger.error(f"Error saving strategy output: {e}")
            raise

    def format_output(self, content: str, title: str, summary: str = None, metadata: Dict = None) -> Dict[str, Any]:
        """Format strategic analysis for saving to database.

        Args:
            content: The main analysis content
            title: Title of the analysis
            summary: Optional summary
            metadata: Optional metadata

        Returns:
            Formatted dictionary ready for database
        """
        return {
            'title': title,
            'summary': summary or f"Generated {title}",
            'content': content,
            'metadata': metadata or {},
            'org_id': self.org_id,
            'campaign_id': self.campaign_id,
            'session_id': self.current_session_id,
            'agent_type': 'strategy'
        }