#!/usr/bin/env python3
"""
QuickWinsTools - Phase 4 Implementation
Standardized CRUD operations for Quick Wins Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class QuickWinsTools(BaseResourceTools):
    """
    Quick Wins-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for quick wins opportunities.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize QuickWinsTools with quick wins-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="quick_win",
            resource_plural="quick_wins",
            api_base_path="/api/v1/quick-wins",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"QuickWinsTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists quick_wins directly from the quick_wins table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with quick_wins list and metadata
        """
        logger.info(f"Listing quick_wins: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'quick_wins')

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
                    "message": f"Retrieved {len(response.data)} quick_wins"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No quick_wins found"
                }

        except Exception as e:
            logger.error(f"Error listing quick_wins: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list quick_wins"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific quick_win by ID.

        Args:
            resource_id: The quick_win ID

        Returns:
            Dictionary with quick_win details
        """
        logger.info(f"Getting quick_win details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'quick_wins')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved quick_win {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "quick_win not found",
                    "message": f"No quick_win found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting quick_win details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get quick_win {resource_id}"
            }

    async def list_quick_wins_by_priority(
        self,
        priority: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List quick wins filtered by priority level.
        
        Args:
            priority: Priority level (e.g., "high", "medium", "low")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with quick wins of the specified priority
        """
        logger.info(f"Listing quick wins with priority: {priority}")
        
        filters = {
            "priority": priority
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def list_actionable_quick_wins(
        self,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        List actionable quick wins that can be implemented immediately.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with actionable quick wins
        """
        logger.info("Listing actionable quick wins")
        
        filters = {
            "status": "ready",
            "implementation_time": "immediate"
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_quick_win_impact(
        self,
        quick_win_id: str
    ) -> Dict[str, Any]:
        """
        Get impact analysis for a specific quick win.
        
        Args:
            quick_win_id: UUID of the quick win
            
        Returns:
            Dictionary with impact analysis
        """
        logger.info(f"Getting impact analysis for quick win: {quick_win_id}")
        
        # Get quick win details
        result = await self.get_resource_details(quick_win_id)
        
        if not result["success"]:
            return result
        
        quick_win = result["resource"]
        
        # Extract impact metrics
        impact = {
            "quick_win_id": quick_win_id,
            "title": quick_win.get("title", "Untitled"),
            "priority": quick_win.get("priority"),
            "expected_impact": quick_win.get("expected_impact", {}),
            "effort_required": quick_win.get("effort_required"),
            "implementation_time": quick_win.get("implementation_time"),
            "roi_estimate": quick_win.get("roi_estimate"),
            "risk_level": quick_win.get("risk_level", "low")
        }
        
        return {
            "success": True,
            "impact": impact,
            "message": "Quick win impact analysis retrieved"
        }

    async def update_quick_win_status(
        self,
        quick_win_id: str,
        status: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update the status of a quick win.
        
        Args:
            quick_win_id: UUID of the quick win
            status: New status (e.g., "in_progress", "completed", "deferred")
            notes: Optional notes about the status change
            
        Returns:
            Dictionary with update result
        """
        logger.info(f"Updating quick win {quick_win_id} status to: {status}")
        
        updates = {
            "status": status,
            "status_updated_at": datetime.now().isoformat()
        }
        
        if notes:
            updates["status_notes"] = notes
        
        # Add completion timestamp if completed
        if status == "completed":
            updates["completed_at"] = datetime.now().isoformat()
        
        return await self.update_resource(quick_win_id, updates)

    async def get_quick_wins_by_category(
        self,
        category: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Get quick wins filtered by category.
        
        Args:
            category: Category of quick wins (e.g., "seo", "content", "social", "email")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with quick wins in the category
        """
        logger.info(f"Getting quick wins for category: {category}")
        
        filters = {
            "category": category
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def calculate_quick_wins_summary(self) -> Dict[str, Any]:
        """
        Calculate comprehensive summary of all quick wins.
        
        Returns:
            Dictionary with quick wins summary
        """
        logger.info("Calculating quick wins summary")
        
        try:
            # Get all quick wins
            all_result = await self.list_resources(
                limit=1000,
                include_archived=False
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "summary": None,
                    "message": "Failed to retrieve quick wins for summary"
                }
            
            quick_wins = all_result["resources"]
            
            # Calculate summary
            summary = {
                "total_opportunities": len(quick_wins),
                "by_priority": {
                    "high": 0,
                    "medium": 0,
                    "low": 0
                },
                "by_status": {},
                "by_category": {},
                "actionable_now": 0,
                "completed": 0,
                "average_estimated_impact": 0,
                "total_estimated_value": 0
            }
            
            total_impact = 0
            impact_count = 0
            
            for qw in quick_wins:
                # Priority breakdown
                priority = qw.get("priority", "medium").lower()
                if priority in summary["by_priority"]:
                    summary["by_priority"][priority] += 1
                
                # Status breakdown
                status = qw.get("status", "pending")
                summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
                
                # Category breakdown
                category = qw.get("category", "other")
                summary["by_category"][category] = summary["by_category"].get(category, 0) + 1
                
                # Actionable and completed counts
                if status == "ready" and qw.get("implementation_time") == "immediate":
                    summary["actionable_now"] += 1
                elif status == "completed":
                    summary["completed"] += 1
                
                # Impact metrics
                if qw.get("expected_impact"):
                    impact_value = qw["expected_impact"].get("value", 0)
                    total_impact += impact_value
                    impact_count += 1
                    summary["total_estimated_value"] += impact_value
            
            if impact_count > 0:
                summary["average_estimated_impact"] = round(total_impact / impact_count, 2)
            
            return {
                "success": True,
                "summary": summary,
                "message": "Quick wins summary calculated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error calculating quick wins summary: {str(e)}")
            return {
                "success": False,
                "summary": None,
                "error": str(e),
                "message": "Failed to calculate quick wins summary"
            }