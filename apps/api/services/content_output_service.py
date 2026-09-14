"""
🚀 NUCLEAR: Content Output Service - Phase 4 Implementation
Unified service for saving and managing content outputs using UniversalOutputService.
Updated to use nuclear architecture with agent_outputs table.
Date: 2025-09-23
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import UUID
import uuid

from apps.api.services.universal_output_service import get_universal_output_service
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)


class ContentOutputService:
    """🚀 NUCLEAR: Service for managing content outputs using universal agent_outputs table."""

    def __init__(self):
        self.client = get_supabase_client()
        self.universal_service = get_universal_output_service()

    async def save_content_output(
        self,
        org_id: str,
        user_id: str,
        title: str,
        content_type: str,
        content: Dict[str, Any],
        summary: Optional[str] = None,
        campaign_id: Optional[str] = None,
        session_id: Optional[str] = None,
        plan_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        seo_data: Optional[Dict[str, Any]] = None,
        client_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Save a content output using UniversalOutputService.

        Args:
            org_id: Organization ID
            user_id: User ID
            title: Content title
            content_type: Type of content (blog_post, social_media, email, etc.)
            content: Main content body with rich structure
            summary: Brief summary of the content
            campaign_id: Associated campaign ID
            session_id: Agent conversation session ID
            plan_id: Associated content plan ID
            metadata: Tool-specific metadata (keywords, tone, etc.)
            seo_data: SEO optimization data

        Returns:
            Created content output record from agent_outputs table
        """
        try:
            # Prepare content for nuclear architecture
            structured_content = {
                "content_body": content if isinstance(content, dict) else {"body": content},
                "content_type": content_type,
                "seo_data": seo_data or {},
                "plan_id": plan_id,
                "status": "draft"
            }

            # Prepare metadata with all additional fields
            enhanced_metadata = {
                **(metadata or {}),
                "campaign_id": campaign_id,
                "session_id": session_id,
                "original_content_type": content_type,
                "nuclear_migration": "2025-09-23"
            }

            # Use UniversalOutputService to save to agent_outputs table
            result = await self.universal_service.save_agent_output(
                org_id=org_id,
                user_id=user_id,
                agent_type="content",
                output_type=content_type,
                title=title,
                summary=summary or f"Content output: {content_type}",
                content=structured_content,
                metadata=enhanced_metadata,
                client_id=client_id
            )

            logger.info(f"🚀 NUCLEAR: Saved content output to agent_outputs: {result['id']}")
            return result

        except Exception as e:
            logger.error(f"🚀 NUCLEAR: Error saving content output: {str(e)}")
            raise

    async def save_content_plan(
        self,
        org_id: str,
        user_id: str,
        title: str,
        executive_summary: str,
        content_pillars: List[str],
        content_calendar: Dict[str, Any],
        channel_distribution: Dict[str, Any],
        campaign_id: Optional[str] = None,
        session_id: Optional[str] = None,
        content_types: Optional[Dict[str, Any]] = None,
        target_metrics: Optional[Dict[str, Any]] = None,
        is_active: bool = False,
        client_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Save a content plan using UniversalOutputService.

        Args:
            org_id: Organization ID
            user_id: User ID
            title: Plan title
            executive_summary: Executive summary
            content_pillars: List of content themes/pillars
            content_calendar: Publishing schedule
            channel_distribution: Channel strategy
            campaign_id: Associated campaign ID
            session_id: Agent conversation session ID
            content_types: Mix of content types
            target_metrics: Success metrics
            is_active: Whether this is the active plan

        Returns:
            Created content plan record from agent_outputs table
        """
        try:
            # Prepare plan content for nuclear architecture
            plan_content = {
                "executive_summary": executive_summary,
                "content_pillars": content_pillars,
                "content_calendar": content_calendar,
                "channel_distribution": channel_distribution,
                "content_types": content_types or {},
                "target_metrics": target_metrics or {},
                "is_active": is_active,
                "status": "draft"
            }

            # Prepare metadata
            plan_metadata = {
                "campaign_id": campaign_id,
                "session_id": session_id,
                "plan_type": "content_plan",
                "is_active": is_active,
                "nuclear_migration": "2025-09-23"
            }

            # Use UniversalOutputService to save to agent_outputs table
            result = await self.universal_service.save_agent_output(
                org_id=org_id,
                user_id=user_id,
                agent_type="content",
                output_type="content_plan",
                title=title,
                summary=executive_summary,
                content=plan_content,
                metadata=plan_metadata,
                client_id=client_id
            )

            logger.info(f"🚀 NUCLEAR: Saved content plan to agent_outputs: {result['id']}")
            return result

        except Exception as e:
            logger.error(f"🚀 NUCLEAR: Error saving content plan: {str(e)}")
            raise

    async def get_content_outputs(
        self,
        org_id: str,
        campaign_id: Optional[str] = None,
        content_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        🚀 NUCLEAR: Get content outputs from agent_outputs table.

        Args:
            org_id: Organization ID
            campaign_id: Filter by campaign
            content_type: Filter by content type
            status: Filter by status
            limit: Maximum number of results

        Returns:
            List of content outputs from agent_outputs table
        """
        try:
            # Query agent_outputs table with agent_type='content'
            query = self.client.table("agent_outputs").select("*").eq("org_id", org_id).eq("agent_type", "content")

            # Apply filters using metadata fields
            if campaign_id:
                query = query.contains("metadata", {"campaign_id": campaign_id})
            if content_type:
                query = query.eq("output_type", content_type)
            if status:
                query = query.contains("content", {"status": status})

            query = query.order("created_at", desc=True).limit(limit)

            result = query.execute()
            return result.data if result.data else []

        except Exception as e:
            logger.error(f"🚀 NUCLEAR: Error fetching content outputs: {str(e)}")
            return []

    async def get_active_content_plan(
        self,
        org_id: str,
        campaign_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        🚀 NUCLEAR: Get the active content plan from agent_outputs table.

        Args:
            org_id: Organization ID
            campaign_id: Campaign ID

        Returns:
            Active content plan or None
        """
        try:
            # Query agent_outputs for content plans with is_active=true
            query = self.client.table("agent_outputs").select("*") \
                .eq("org_id", org_id) \
                .eq("agent_type", "content") \
                .eq("output_type", "content_plan") \
                .contains("metadata", {"is_active": True})

            if campaign_id:
                query = query.contains("metadata", {"campaign_id": campaign_id})

            result = query.limit(1).execute()

            if result.data and len(result.data) > 0:
                return result.data[0]
            return None

        except Exception as e:
            logger.error(f"🚀 NUCLEAR: Error fetching active content plan: {str(e)}")
            return None

    async def update_content_output_status(
        self,
        output_id: str,
        org_id: str,
        status: str,
        published_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Update the status of a content output in agent_outputs table.

        Args:
            output_id: Content output ID
            org_id: Organization ID (for security)
            status: New status
            published_url: URL if published

        Returns:
            Updated content output from agent_outputs table
        """
        try:
            # Use UniversalOutputService to update the record
            result = await self.universal_service.update_output(
                output_id=output_id,
                org_id=org_id,
                updates={
                    "content": {
                        "status": status,
                        "updated_at": datetime.utcnow().isoformat(),
                        **({"published_url": published_url} if published_url else {})
                    },
                    "metadata": {
                        "status": status,
                        **({"published_at": datetime.utcnow().isoformat()} if status == "published" else {})
                    }
                }
            )

            logger.info(f"🚀 NUCLEAR: Updated content output status in agent_outputs: {output_id}")
            return result

        except Exception as e:
            logger.error(f"🚀 NUCLEAR: Error updating content output status: {str(e)}")
            raise

    async def link_content_to_plan(
        self,
        output_id: str,
        plan_id: str,
        org_id: str
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Link a content output to a content plan in agent_outputs table.

        Args:
            output_id: Content output ID
            plan_id: Content plan ID
            org_id: Organization ID (for security)

        Returns:
            Updated content output from agent_outputs table
        """
        try:
            # Use UniversalOutputService to update the record
            result = await self.universal_service.update_output(
                output_id=output_id,
                org_id=org_id,
                updates={
                    "content": {
                        "plan_id": plan_id
                    },
                    "metadata": {
                        "linked_plan_id": plan_id,
                        "linked_at": datetime.utcnow().isoformat()
                    }
                }
            )

            logger.info(f"🚀 NUCLEAR: Linked content to plan in agent_outputs: {output_id} -> {plan_id}")
            return result

        except Exception as e:
            logger.error(f"🚀 NUCLEAR: Error linking content to plan: {str(e)}")
            raise