#!/usr/bin/env python3
"""
CampaignTools - Phase 4 Implementation
Standardized CRUD operations for Campaign Execution Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CampaignTools(BaseResourceTools):
    """
    Campaign-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for campaign management.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize CampaignTools with campaign-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="campaign",
            resource_plural="campaigns",
            api_base_path="/api/v1/campaigns",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"CampaignTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists campaigns directly from the campaigns table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with campaigns list and metadata
        """
        logger.info(f"Listing campaigns: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # Build query
            query = supabase.table('campaigns').select('*')

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
                    "message": f"Retrieved {len(response.data)} campaigns"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No campaigns found"
                }

        except Exception as e:
            logger.error(f"Error listing campaigns: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list campaigns"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific campaign by ID.

        Args:
            resource_id: The campaign ID

        Returns:
            Dictionary with campaign details
        """
        logger.info(f"Getting campaign details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # Query for the specific campaign
            query = supabase.table('campaigns').select('*').eq('id', resource_id)

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved campaign {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "campaign not found",
                    "message": f"No campaign found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting campaign details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get campaign {resource_id}"
            }

    async def list_active_campaigns(
        self,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List all active campaigns.
        
        Args:
            limit: Maximum number of campaigns to return
            
        Returns:
            Dictionary with active campaigns
        """
        logger.info("Listing active campaigns")
        
        filters = {
            "status": "active"
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def list_campaigns_by_channel(
        self,
        channel: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List campaigns filtered by marketing channel.
        
        Args:
            channel: Marketing channel (e.g., "email", "social", "seo", "ppc")
            limit: Maximum number of campaigns to return
            
        Returns:
            Dictionary with campaigns for the specified channel
        """
        logger.info(f"Listing campaigns for channel: {channel}")
        
        filters = {
            "channel": channel
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_campaign_performance(
        self,
        campaign_id: str
    ) -> Dict[str, Any]:
        """
        Get performance metrics for a specific campaign.
        
        Args:
            campaign_id: UUID of the campaign
            
        Returns:
            Dictionary with campaign performance data
        """
        logger.info(f"Getting performance for campaign: {campaign_id}")
        
        # Get campaign details
        result = await self.get_resource_details(campaign_id)
        
        if not result["success"]:
            return result
        
        campaign = result["resource"]
        
        # Extract performance metrics
        performance = {
            "campaign_id": campaign_id,
            "name": campaign.get("name", "Untitled"),
            "status": campaign.get("status"),
            "start_date": campaign.get("start_date"),
            "end_date": campaign.get("end_date"),
            "metrics": campaign.get("performance_metrics", {}),
            "budget": campaign.get("budget", {}),
            "channels": campaign.get("channels", []),
            "roi": campaign.get("roi")
        }
        
        return {
            "success": True,
            "performance": performance,
            "message": "Campaign performance retrieved"
        }

    async def update_campaign_status(
        self,
        campaign_id: str,
        status: str
    ) -> Dict[str, Any]:
        """
        Update the status of a campaign.
        
        Args:
            campaign_id: UUID of the campaign
            status: New status (e.g., "active", "paused", "completed", "draft")
            
        Returns:
            Dictionary with update result
        """
        logger.info(f"Updating campaign {campaign_id} status to: {status}")
        
        updates = {
            "status": status,
            "status_updated_at": datetime.now().isoformat()
        }
        
        # Add activation/completion timestamps
        if status == "active":
            updates["activated_at"] = datetime.now().isoformat()
        elif status == "completed":
            updates["completed_at"] = datetime.now().isoformat()
        
        return await self.update_resource(campaign_id, updates)

    async def get_campaigns_by_date_range(
        self,
        start_date: str,
        end_date: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get campaigns within a specific date range.
        
        Args:
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            limit: Maximum number of campaigns to return
            
        Returns:
            Dictionary with campaigns in the date range
        """
        logger.info(f"Getting campaigns from {start_date} to {end_date}")
        
        filters = {
            "start_date_after": start_date,
            "end_date_before": end_date
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_campaign_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics about campaigns.
        
        Returns:
            Dictionary with campaign statistics
        """
        logger.info("Getting campaign statistics")
        
        try:
            # Get all campaigns
            all_result = await self.list_resources(
                limit=1000,
                include_archived=True
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "statistics": None,
                    "message": "Failed to retrieve campaigns for statistics"
                }
            
            campaigns = all_result["resources"]
            
            # Calculate statistics
            stats = {
                "total_count": len(campaigns),
                "active_count": sum(1 for c in campaigns if c.get("status") == "active"),
                "paused_count": sum(1 for c in campaigns if c.get("status") == "paused"),
                "completed_count": sum(1 for c in campaigns if c.get("status") == "completed"),
                "draft_count": sum(1 for c in campaigns if c.get("status") == "draft"),
                "by_channel": {},
                "total_budget": 0,
                "average_roi": 0
            }
            
            total_roi = 0
            roi_count = 0
            
            for campaign in campaigns:
                # Channel breakdown
                for channel in campaign.get("channels", []):
                    stats["by_channel"][channel] = stats["by_channel"].get(channel, 0) + 1
                
                # Budget totals
                budget = campaign.get("budget", {})
                if isinstance(budget, dict):
                    stats["total_budget"] += budget.get("total", 0)
                
                # ROI average
                roi = campaign.get("roi")
                if roi is not None:
                    total_roi += roi
                    roi_count += 1
            
            if roi_count > 0:
                stats["average_roi"] = round(total_roi / roi_count, 2)
            
            return {
                "success": True,
                "statistics": stats,
                "message": "Campaign statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting campaign statistics: {str(e)}")
            return {
                "success": False,
                "statistics": None,
                "error": str(e),
                "message": "Failed to calculate campaign statistics"
            }