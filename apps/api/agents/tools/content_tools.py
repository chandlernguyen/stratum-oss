#!/usr/bin/env python3
"""
ContentTools - Phase 4 Implementation
Standardized CRUD operations for Content Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ContentTools(BaseResourceTools):
    """
    Content-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for content outputs.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize ContentTools with content-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="content",
            resource_plural="contents",
            api_base_path="/api/v1/contents",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"ContentTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Use universal agent_outputs table instead of content_outputs.
        Lists content directly from the agent_outputs table filtering by agent_type.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with content list and metadata
        """
        logger.info(f"🚀 Nuclear listing content: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'content')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            # Apply archived filter
            if not include_archived:
                query = query.is_('archived_at', 'null')

            # Apply additional filters
            if filters:
                for key, value in filters.items():
                    if value is not None:
                        query = query.eq(key, value)

            # Apply sorting and pagination
            query = query.order('created_at', desc=True)
            query = query.range(offset, offset + limit - 1)

            # Execute query
            response = query.execute()

            if response.data is not None:
                return {
                    "success": True,
                    "resources": response.data,
                    "total": len(response.data),
                    "has_more": len(response.data) == limit,
                    "message": f"Retrieved {len(response.data)} content items"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No content found"
                }

        except Exception as e:
            logger.error(f"Error listing content: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list content"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific content item by ID.

        Args:
            resource_id: The content ID

        Returns:
            Dictionary with content details
        """
        logger.info(f"Getting content details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'content')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved content {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "Content not found",
                    "message": f"No content found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting content details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get content {resource_id}"
            }

    async def list_content_by_type(
        self,
        content_type: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List content filtered by type.
        
        Args:
            content_type: Type of content (e.g., "blog", "email", "social", "ad_copy")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with content of the specified type
        """
        logger.info(f"Listing content of type: {content_type}")
        
        filters = {
            "content_type": content_type
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def list_content_by_campaign(
        self,
        campaign_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        List all content associated with a specific campaign.
        
        Args:
            campaign_id: UUID of the campaign
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with campaign content
        """
        logger.info(f"Listing content for campaign: {campaign_id}")
        
        filters = {
            "campaign_id": campaign_id
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_recent_content(
        self,
        days: int = 7,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get content created in the last N days.
        
        Args:
            days: Number of days to look back
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with recent content
        """
        logger.info(f"Getting content from last {days} days")
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        filters = {
            "created_after": cutoff_date
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def create_content_with_metadata(
        self,
        content_data: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create new content with additional metadata.
        
        Args:
            content_data: Basic content information
            metadata: Additional metadata (tags, channels, performance metrics, etc.)
            
        Returns:
            Dictionary with created content
        """
        # Merge metadata into content data
        content_data["metadata"] = content_data.get("metadata", {})
        content_data["metadata"].update(metadata)
        
        # Add creation timestamp
        content_data["metadata"]["created_at"] = datetime.now().isoformat()
        
        return await self.create_resource(content_data)

    async def update_content_performance(
        self,
        content_id: str,
        performance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update performance metrics for a piece of content.
        
        Args:
            content_id: UUID of the content
            performance_data: Performance metrics (views, clicks, conversions, etc.)
            
        Returns:
            Dictionary with updated content
        """
        logger.info(f"Updating performance for content {content_id}")
        
        # Get current content
        current = await self.get_resource_details(content_id)
        
        if not current["success"]:
            return current
        
        content = current["resource"]
        performance = content.get("performance_metrics", {})
        
        # Update performance metrics
        performance.update(performance_data)
        performance["last_updated"] = datetime.now().isoformat()
        
        # Update the content
        updates = {
            "performance_metrics": performance
        }
        
        return await self.update_resource(content_id, updates)

    async def search_content_by_keywords(
        self,
        keywords: List[str],
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Search content by keywords.
        
        Args:
            keywords: List of keywords to search for
            limit: Maximum results to return
            
        Returns:
            Dictionary with matching content
        """
        logger.info(f"Searching content with keywords: {keywords}")
        
        # Join keywords for search query
        query = " ".join(keywords)
        
        return await self.search_resources(
            query=query,
            search_fields=["title", "content", "description", "tags"],
            limit=limit
        )

    async def get_content_variations(
        self,
        content_id: str
    ) -> Dict[str, Any]:
        """
        Get all variations/versions of a piece of content.
        
        Args:
            content_id: UUID of the original content
            
        Returns:
            Dictionary with content variations
        """
        logger.info(f"Getting variations for content {content_id}")
        
        filters = {
            "parent_content_id": content_id
        }
        
        result = await self.list_resources(
            limit=100,
            filters=filters
        )
        
        if result["success"]:
            return {
                "success": True,
                "variations": result["resources"],
                "count": len(result["resources"]),
                "message": f"Found {len(result['resources'])} variations"
            }
        else:
            return {
                "success": False,
                "variations": [],
                "message": "Failed to retrieve variations"
            }

    async def bulk_update_content_status(
        self,
        content_ids: List[str],
        status: str
    ) -> Dict[str, Any]:
        """
        Update the status of multiple content pieces.
        
        Args:
            content_ids: List of content UUIDs
            status: New status (draft, published, archived, etc.)
            
        Returns:
            Dictionary with update results
        """
        logger.info(f"Bulk updating {len(content_ids)} content items to status: {status}")
        
        success_count = 0
        failed_ids = []
        
        for content_id in content_ids:
            result = await self.update_resource(
                content_id,
                {"status": status, "status_updated_at": datetime.now().isoformat()}
            )
            if result["success"]:
                success_count += 1
            else:
                failed_ids.append(content_id)
        
        return {
            "success": len(failed_ids) == 0,
            "updated_count": success_count,
            "failed_ids": failed_ids,
            "message": f"Updated {success_count}/{len(content_ids)} content items"
        }

    async def get_content_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics about content.
        
        Returns:
            Dictionary with content statistics
        """
        logger.info("Getting content statistics")
        
        try:
            # Get all content
            all_result = await self.list_resources(
                limit=1000,
                include_archived=True
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "statistics": None,
                    "message": "Failed to retrieve content for statistics"
                }
            
            content_items = all_result["resources"]
            
            # Calculate statistics
            stats = {
                "total_count": len(content_items),
                "active_count": sum(1 for c in content_items if not c.get("archived_at")),
                "archived_count": sum(1 for c in content_items if c.get("archived_at")),
                "by_type": {},
                "by_status": {},
                "by_channel": {},
                "recent_7_days": 0,
                "recent_30_days": 0,
                "average_performance": {}
            }
            
            # Time calculations
            now = datetime.now()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            for item in content_items:
                if not item.get("archived_at"):
                    # Content type
                    content_type = item.get("content_type", "Unknown")
                    stats["by_type"][content_type] = stats["by_type"].get(content_type, 0) + 1
                    
                    # Status
                    status = item.get("status", "draft")
                    stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
                    
                    # Channel
                    channels = item.get("channels", [])
                    for channel in channels:
                        stats["by_channel"][channel] = stats["by_channel"].get(channel, 0) + 1
                    
                    # Time-based stats
                    created_at = item.get("created_at")
                    if created_at:
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        if created_date > week_ago:
                            stats["recent_7_days"] += 1
                        if created_date > month_ago:
                            stats["recent_30_days"] += 1
            
            return {
                "success": True,
                "statistics": stats,
                "message": "Content statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting content statistics: {str(e)}")
            return {
                "success": False,
                "statistics": None,
                "error": str(e),
                "message": "Failed to calculate content statistics"
            }