#!/usr/bin/env python3
"""
ROIBudgetTools - Phase 4 Implementation
Standardized CRUD operations for ROI & Budget Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ROIBudgetTools(BaseResourceTools):
    """
    ROI & Budget-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for ROI tracking and budget management.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize ROIBudgetTools with ROI/budget-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="roi_budget",
            resource_plural="roi_budgets",
            api_base_path="/api/v1/roi-budgets",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"ROIBudgetTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists roi_budgets directly from the roi_budgets table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with roi_budgets list and metadata
        """
        logger.info(f"Listing roi_budgets: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'roi_budget')

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
                    "message": f"Retrieved {len(response.data)} roi_budgets"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No roi_budgets found"
                }

        except Exception as e:
            logger.error(f"Error listing roi_budgets: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list roi_budgets"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific roi_budget by ID.

        Args:
            resource_id: The roi_budget ID

        Returns:
            Dictionary with roi_budget details
        """
        logger.info(f"Getting roi_budget details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'roi_budget')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved roi_budget {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "roi_budget not found",
                    "message": f"No roi_budget found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting roi_budget details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get roi_budget {resource_id}"
            }

    async def list_budgets_by_status(
        self,
        status: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List budgets filtered by status.
        
        Args:
            status: Budget status (e.g., "active", "planned", "completed")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with budgets of the specified status
        """
        logger.info(f"Listing budgets with status: {status}")
        
        filters = {
            "status": status
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_roi_metrics(
        self,
        budget_id: str
    ) -> Dict[str, Any]:
        """
        Get ROI metrics for a specific budget.
        
        Args:
            budget_id: UUID of the budget
            
        Returns:
            Dictionary with ROI metrics
        """
        logger.info(f"Getting ROI metrics for budget: {budget_id}")
        
        # Get budget details
        result = await self.get_resource_details(budget_id)
        
        if not result["success"]:
            return result
        
        budget = result["resource"]
        
        # Calculate ROI metrics
        spent = budget.get("amount_spent", 0)
        revenue = budget.get("revenue_generated", 0)
        roi = 0
        if spent > 0:
            roi = ((revenue - spent) / spent) * 100
        
        metrics = {
            "budget_id": budget_id,
            "name": budget.get("name", "Untitled"),
            "status": budget.get("status"),
            "total_budget": budget.get("total_budget", 0),
            "amount_spent": spent,
            "amount_remaining": budget.get("total_budget", 0) - spent,
            "revenue_generated": revenue,
            "roi_percentage": round(roi, 2),
            "cost_per_acquisition": budget.get("cpa"),
            "conversion_rate": budget.get("conversion_rate"),
            "channels": budget.get("channels", [])
        }
        
        return {
            "success": True,
            "metrics": metrics,
            "message": "ROI metrics retrieved"
        }

    async def get_budget_performance_trend(
        self,
        budget_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get performance trend for a budget over time.
        
        Args:
            budget_id: UUID of the budget
            days: Number of days to analyze
            
        Returns:
            Dictionary with performance trend data
        """
        logger.info(f"Getting {days}-day trend for budget: {budget_id}")
        
        # Get budget details
        result = await self.get_resource_details(budget_id)
        
        if not result["success"]:
            return result
        
        budget = result["resource"]
        
        # Extract historical data if available
        trend_data = {
            "budget_id": budget_id,
            "period_days": days,
            "daily_metrics": budget.get("daily_metrics", []),
            "weekly_summaries": budget.get("weekly_summaries", []),
            "trend_direction": budget.get("trend_direction", "stable"),
            "forecast": budget.get("forecast", {})
        }
        
        return {
            "success": True,
            "trend": trend_data,
            "message": "Performance trend retrieved"
        }

    async def update_budget_allocation(
        self,
        budget_id: str,
        allocations: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Update budget allocations across channels.
        
        Args:
            budget_id: UUID of the budget
            allocations: Dictionary of channel allocations
            
        Returns:
            Dictionary with update result
        """
        logger.info(f"Updating allocations for budget: {budget_id}")
        
        updates = {
            "allocations": allocations,
            "allocation_updated_at": datetime.now().isoformat()
        }
        
        return await self.update_resource(budget_id, updates)

    async def get_budgets_by_date_range(
        self,
        start_date: str,
        end_date: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get budgets within a specific date range.
        
        Args:
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with budgets in the date range
        """
        logger.info(f"Getting budgets from {start_date} to {end_date}")
        
        filters = {
            "start_date_after": start_date,
            "end_date_before": end_date
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def calculate_roi_summary(self) -> Dict[str, Any]:
        """
        Calculate comprehensive ROI summary across all budgets.
        
        Returns:
            Dictionary with ROI summary statistics
        """
        logger.info("Calculating comprehensive ROI summary")
        
        try:
            # Get all budgets
            all_result = await self.list_resources(
                limit=1000,
                include_archived=False
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "summary": None,
                    "message": "Failed to retrieve budgets for summary"
                }
            
            budgets = all_result["resources"]
            
            # Calculate summary statistics
            summary = {
                "total_budgets": len(budgets),
                "active_budgets": sum(1 for b in budgets if b.get("status") == "active"),
                "total_allocated": 0,
                "total_spent": 0,
                "total_revenue": 0,
                "average_roi": 0,
                "best_performing_channel": None,
                "by_channel": {},
                "by_status": {}
            }
            
            total_roi = 0
            roi_count = 0
            channel_performance = {}
            
            for budget in budgets:
                # Aggregate totals
                summary["total_allocated"] += budget.get("total_budget", 0)
                summary["total_spent"] += budget.get("amount_spent", 0)
                summary["total_revenue"] += budget.get("revenue_generated", 0)
                
                # Status breakdown
                status = budget.get("status", "unknown")
                summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
                
                # Channel performance
                for channel in budget.get("channels", []):
                    if channel not in channel_performance:
                        channel_performance[channel] = {"spent": 0, "revenue": 0}
                    channel_performance[channel]["spent"] += budget.get("amount_spent", 0)
                    channel_performance[channel]["revenue"] += budget.get("revenue_generated", 0)
                
                # ROI calculation
                spent = budget.get("amount_spent", 0)
                revenue = budget.get("revenue_generated", 0)
                if spent > 0:
                    roi = ((revenue - spent) / spent) * 100
                    total_roi += roi
                    roi_count += 1
            
            # Calculate averages and best performers
            if roi_count > 0:
                summary["average_roi"] = round(total_roi / roi_count, 2)
            
            # Calculate channel ROIs
            best_roi = -float('inf')
            for channel, perf in channel_performance.items():
                if perf["spent"] > 0:
                    channel_roi = ((perf["revenue"] - perf["spent"]) / perf["spent"]) * 100
                    summary["by_channel"][channel] = {
                        "roi": round(channel_roi, 2),
                        "spent": perf["spent"],
                        "revenue": perf["revenue"]
                    }
                    if channel_roi > best_roi:
                        best_roi = channel_roi
                        summary["best_performing_channel"] = channel
            
            # Overall ROI
            if summary["total_spent"] > 0:
                summary["overall_roi"] = round(
                    ((summary["total_revenue"] - summary["total_spent"]) / summary["total_spent"]) * 100,
                    2
                )
            else:
                summary["overall_roi"] = 0
            
            return {
                "success": True,
                "summary": summary,
                "message": "ROI summary calculated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error calculating ROI summary: {str(e)}")
            return {
                "success": False,
                "summary": None,
                "error": str(e),
                "message": "Failed to calculate ROI summary"
            }