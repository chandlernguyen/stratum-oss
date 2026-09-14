"""
Universal Agent Output Service - Nuclear Implementation
Consolidates all agent outputs into the comprehensive agent_outputs table.
Eliminates 15+ table sprawl with zero data loss.
"""
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from uuid import UUID
import uuid

from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)


class UniversalOutputService:
    """
    Universal service for all agent outputs.
    Replaces agent-specific tables with unified agent_outputs table.
    """

    def __init__(self):
        self.client = get_supabase_client()

    async def save_agent_output(
        self,
        agent_type: str,
        output_type: str,
        content: Dict[str, Any],
        title: str,
        org_id: str,
        user_id: str,
        summary: Optional[str] = None,
        session_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        client_id: Optional[str] = None,  # NEW: Required for agency orgs
        metadata: Optional[Dict[str, Any]] = None,
        confidence_score: float = 0.8,
        source_type: str = "agent_conversation"
    ) -> Dict[str, Any]:
        """
        Universal save function for all agent outputs.

        Uses save_agent_output_routed() database function for schema-aware writes:
        - AGENCY orgs: Writes to agency.agent_outputs (requires client_id)
        - SME orgs: Writes to public.agent_outputs (client_id ignored)

        Args:
            agent_type: Type of agent (marketing_strategy, content, strategy, persona, etc.)
            output_type: Type of output (strategy, analysis, content, framework, etc.)
            content: Complete LLM output preserved as JSONB (ZERO data loss)
            title: Human-readable title
            org_id: Organization ID
            user_id: User ID who created the output
            summary: Brief summary for display
            session_id: Agent conversation session ID
            campaign_id: Associated campaign ID
            client_id: Client ID (required for agency orgs, NULL for SME)
            metadata: Additional metadata (processing info, confidence, etc.)
            confidence_score: AI confidence in the output
            source_type: Source of the output

        Returns:
            Saved output record with ID (from correct schema)
        """
        try:
            # Call schema router function (Migration 203)
            # Database handles routing to correct schema based on org_type
            result = self.client.rpc('save_agent_output_routed', {
                # Required parameters
                'p_org_id': org_id,
                'p_user_id': user_id,
                'p_agent_type': agent_type,
                'p_output_type': output_type,
                'p_title': title,
                'p_content': content,
                # Optional parameters
                'p_client_id': client_id,
                'p_summary': summary or f"{agent_type.title()} output generated",
                'p_session_id': session_id,
                'p_campaign_id': campaign_id,
                'p_category': None,  # Can be extended in future
                'p_metadata': metadata or {},
                'p_confidence_score': confidence_score,
                'p_source_type': source_type,
                'p_status': 'draft'
            }).execute()

            if result.data:
                # Router function returns JSONB, convert to dict
                output_record = result.data if isinstance(result.data, dict) else result.data
                table_source = output_record.get('table_source', 'unknown')
                output_id = output_record.get('id')

                logger.info(
                    f"Saved {agent_type} output: {output_id} "
                    f"(schema: {table_source}, client_id: {client_id or 'N/A'})"
                )
                return output_record
            else:
                raise Exception("Failed to save agent output via router function")

        except Exception as e:
            logger.error(
                f"Error saving {agent_type} output via router: {str(e)} "
                f"(org_id: {org_id}, client_id: {client_id or 'N/A'})"
            )
            raise

    async def get_outputs(
        self,
        org_id: str,
        agent_type: Optional[str] = None,
        output_type: Optional[str] = None,
        campaign_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        include_archived: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Universal get function for all agent outputs.
        Replaces complex outputs_hub.py multi-table queries.

        Args:
            org_id: Organization ID
            agent_type: Filter by agent type
            output_type: Filter by output type
            campaign_id: Filter by campaign
            search: Search in title and content
            limit: Number of results
            offset: Pagination offset
            include_archived: Include archived outputs

        Returns:
            List of agent outputs
        """
        try:
            # Build query
            query = self.client.table("agent_outputs").select("*").eq("org_id", org_id)

            # Apply filters
            if agent_type:
                query = query.eq("agent_type", agent_type)
            if output_type:
                query = query.eq("output_type", output_type)
            if campaign_id:
                query = query.eq("campaign_id", campaign_id)
            if not include_archived:
                query = query.is_("archived_at", "null")

            # Search in title and JSONB content
            if search:
                query = query.or_(f"title.ilike.%{search}%,content::text.ilike.%{search}%")

            # Order and paginate
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

            result = query.execute()
            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching outputs: {str(e)}")
            raise

    async def get_output_by_id(
        self,
        output_id: str,
        org_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get single output by ID with org verification.
        """
        try:
            result = self.client.table("agent_outputs") \
                .select("*") \
                .eq("id", output_id) \
                .eq("org_id", org_id) \
                .single() \
                .execute()

            return result.data if result.data else None

        except Exception as e:
            logger.error(f"Error fetching output {output_id}: {str(e)}")
            return None

    async def update_output(
        self,
        output_id: str,
        org_id: str,
        updates: Dict[str, Any],
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing output.
        """
        try:
            # Add update metadata
            updates["updated_by"] = user_id
            updates["updated_at"] = datetime.utcnow().isoformat()

            result = self.client.table("agent_outputs") \
                .update(updates) \
                .eq("id", output_id) \
                .eq("org_id", org_id) \
                .execute()

            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"Error updating output {output_id}: {str(e)}")
            raise

    async def archive_output(
        self,
        output_id: str,
        org_id: str,
        user_id: str,
        reason: str = "User archived"
    ) -> bool:
        """
        Archive an output.
        """
        try:
            result = self.client.table("agent_outputs") \
                .update({
                    "archived_at": datetime.utcnow().isoformat(),
                    "archived_by": user_id,
                    "archive_reason": reason
                }) \
                .eq("id", output_id) \
                .eq("org_id", org_id) \
                .execute()

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error archiving output {output_id}: {str(e)}")
            raise

    async def delete_output(
        self,
        output_id: str,
        org_id: str,
        user_id: str
    ) -> bool:
        """
        Permanently delete an output.
        This removes the record from the database completely.
        """
        try:
            result = self.client.table("agent_outputs") \
                .delete() \
                .eq("id", output_id) \
                .eq("org_id", org_id) \
                .execute()

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error deleting output {output_id}: {str(e)}")
            raise

    async def restore_output(
        self,
        output_id: str,
        org_id: str,
        user_id: str
    ) -> bool:
        """
        Restore an archived output.
        """
        try:
            result = self.client.table("agent_outputs") \
                .update({
                    "archived_at": None,
                    "archived_by": None,
                    "archive_reason": None,
                    "restored_by": user_id,
                    "restored_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", output_id) \
                .eq("org_id", org_id) \
                .execute()

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error restoring output {output_id}: {str(e)}")
            raise


# Global service instance
_universal_output_service = None

def get_universal_output_service() -> UniversalOutputService:
    """Get singleton instance of universal output service."""
    global _universal_output_service
    if _universal_output_service is None:
        _universal_output_service = UniversalOutputService()
    return _universal_output_service