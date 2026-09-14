"""Base class for all content tool modules."""

from typing import Optional, Any, Dict
import logging


class ContentToolBase:
    """Base class providing shared utilities for content tool modules.

    This class provides access to the parent agent's context, including:
    - Organization, user, and campaign IDs
    - Business context and marketing strategies
    - Logging utilities
    - Database access through the agent
    """

    def __init__(self, agent):
        """Initialize with reference to parent agent.

        Args:
            agent: The parent DirectContentAgent instance
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

    async def get_marketing_strategy(self) -> Optional[Dict[str, Any]]:
        """Get the current marketing strategy from database."""
        if not self.campaign_id:
            return None

        try:
            result = await self.db.fetch_one(
                """
                SELECT * FROM marketing_strategies
                WHERE campaign_id = :campaign_id
                AND (archived_at IS NULL OR archived_at > CURRENT_TIMESTAMP)
                ORDER BY created_at DESC
                LIMIT 1
                """,
                {"campaign_id": self.campaign_id}
            )
            return dict(result) if result else None
        except Exception as e:
            self.logger.error(f"Error fetching marketing strategy: {e}")
            return None

    async def get_personas(self) -> list:
        """Get all personas for the current campaign."""
        if not self.campaign_id:
            return []

        try:
            results = await self.db.fetch_all(
                """
                SELECT * FROM personas
                WHERE campaign_id = :campaign_id
                AND (archived_at IS NULL OR archived_at > CURRENT_TIMESTAMP)
                ORDER BY is_primary DESC, created_at DESC
                """,
                {"campaign_id": self.campaign_id}
            )
            return [dict(r) for r in results] if results else []
        except Exception as e:
            self.logger.error(f"Error fetching personas: {e}")
            return []

    async def get_brand_guidelines(self) -> Optional[Dict[str, Any]]:
        """Get brand guidelines for the organization."""
        if not self.org_id:
            return None

        try:
            result = await self.db.fetch_one(
                """
                SELECT * FROM brand_guidelines
                WHERE org_id = :org_id
                AND (archived_at IS NULL OR archived_at > CURRENT_TIMESTAMP)
                ORDER BY created_at DESC
                LIMIT 1
                """,
                {"org_id": self.org_id}
            )
            return dict(result) if result else None
        except Exception as e:
            self.logger.error(f"Error fetching brand guidelines: {e}")
            return None

    async def save_to_outputs(self, output_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save content to the content_outputs table.

        Args:
            output_data: Dictionary containing output data

        Returns:
            The saved output with ID
        """
        # Ensure required fields are present
        output_data.setdefault('org_id', self.org_id)
        output_data.setdefault('campaign_id', self.campaign_id)
        output_data.setdefault('session_id', self.current_session_id)
        output_data.setdefault('agent_type', 'content')

        # Use agent's save method if available
        if hasattr(self.agent, '_save_to_outputs'):
            return await self.agent._save_to_outputs(output_data)
        else:
            # Direct database save as fallback
            try:
                result = await self.db.execute(
                    """
                    INSERT INTO content_outputs
                    (org_id, campaign_id, session_id, agent_type, title, summary, content, metadata)
                    VALUES (:org_id, :campaign_id, :session_id, :agent_type, :title, :summary, :content, :metadata)
                    RETURNING id
                    """,
                    output_data
                )
                output_data['id'] = result
                return output_data
            except Exception as e:
                self.logger.error(f"Error saving to outputs: {e}")
                raise

    def format_output(self, content: str, title: str, summary: str = None, metadata: Dict = None) -> Dict[str, Any]:
        """Format content for saving to database.

        Args:
            content: The main content
            title: Title of the content
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
            'agent_type': 'content'
        }