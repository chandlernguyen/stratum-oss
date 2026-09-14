#!/usr/bin/env python3
"""
AnalyticsTools - Phase 4 Implementation
Standardized CRUD operations for Analytics Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class AnalyticsTools(BaseResourceTools):
    """
    Analytics-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for analytics data.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize AnalyticsTools with analytics-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="analytics",
            resource_plural="analytics",
            api_base_path="/api/v1/analytics",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"AnalyticsTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists analytics directly from the analytics_data table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with analytics list and metadata
        """
        logger.info(f"Listing analytics: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'analytics')

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
                    "message": f"Retrieved {len(response.data)} analytics"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No analytics found"
                }

        except Exception as e:
            logger.error(f"Error listing analytics: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list analytics"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific analytics by ID.

        Args:
            resource_id: The analytics ID

        Returns:
            Dictionary with analytics details
        """
        logger.info(f"Getting analytics details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'analytics')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved analytics {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "analytics not found",
                    "message": f"No analytics found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting analytics details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get analytics {resource_id}"
            }

    async def list_analytics_by_type(
        self,
        analytics_type: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List analytics filtered by type.
        
        Args:
            analytics_type: Type of analytics (e.g., "performance", "engagement", "conversion")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with analytics of the specified type
        """
        logger.info(f"Listing analytics of type: {analytics_type}")
        
        filters = {
            "analytics_type": analytics_type
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_recent_analytics(
        self,
        days: int = 7,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get analytics from the last N days.
        
        Args:
            days: Number of days to look back
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with recent analytics
        """
        logger.info(f"Getting analytics from last {days} days")
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        filters = {
            "created_after": cutoff_date
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_analytics_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all analytics data.
        
        Returns:
            Dictionary with analytics summary
        """
        logger.info("Getting analytics summary")
        
        try:
            # Get all analytics
            all_result = await self.list_resources(
                limit=1000,
                include_archived=False
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "summary": None,
                    "message": "Failed to retrieve analytics for summary"
                }
            
            analytics_data = all_result["resources"]
            
            # Calculate summary
            summary = {
                "total_reports": len(analytics_data),
                "by_type": {},
                "by_status": {},
                "recent_30_days": 0,
                "key_metrics": {
                    "avg_engagement": 0,
                    "avg_conversion": 0,
                    "total_reach": 0
                }
            }
            
            # Analyze data
            now = datetime.now()
            month_ago = now - timedelta(days=30)
            
            for item in analytics_data:
                # Type breakdown
                analytics_type = item.get("analytics_type", "unknown")
                summary["by_type"][analytics_type] = summary["by_type"].get(analytics_type, 0) + 1
                
                # Status breakdown
                status = item.get("status", "draft")
                summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
                
                # Recent activity
                created_at = item.get("created_at")
                if created_at:
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    if created_date > month_ago:
                        summary["recent_30_days"] += 1
                
                # Aggregate metrics
                metrics = item.get("metrics", {})
                if metrics:
                    summary["key_metrics"]["total_reach"] += metrics.get("reach", 0)
            
            return {
                "success": True,
                "summary": summary,
                "message": "Analytics summary retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting analytics summary: {str(e)}")
            return {
                "success": False,
                "summary": None,
                "error": str(e),
                "message": "Failed to calculate analytics summary"
            }