#!/usr/bin/env python3
"""
StrategyTools - Phase 3 Implementation
Standardized CRUD operations for Strategy Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class StrategyTools(BaseResourceTools):
    """
    Strategy-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for strategy outputs.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize StrategyTools with strategy-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="strategy",
            resource_plural="strategies",
            api_base_path="/api/v1/strategies",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"StrategyTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        🚀 NUCLEAR: Use universal agent_outputs table instead of strategy_outputs.
        Lists strategies directly from the agent_outputs table filtering by agent_type.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with strategies list and metadata
        """
        logger.info(f"🚀 Nuclear listing strategies: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'strategy')

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
                    "message": f"Retrieved {len(response.data)} strategies"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No strategies found"
                }

        except Exception as e:
            logger.error(f"Error listing strategies: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list strategies"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific strategy by ID.

        Args:
            resource_id: The strategy ID

        Returns:
            Dictionary with strategy details
        """
        logger.info(f"Getting strategy details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'strategy')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved strategy {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "Strategy not found",
                    "message": f"No strategy found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting strategy details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get strategy {resource_id}"
            }

    async def list_strategies_by_type(
        self,
        framework_type: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List strategies filtered by framework type.
        
        Args:
            framework_type: Type of framework (e.g., "swot", "porter_five_forces", "bcg_matrix")
            limit: Maximum number of strategies to return
            
        Returns:
            Dictionary with strategies of the specified type
        """
        logger.info(f"Listing strategies of type: {framework_type}")
        
        filters = {
            "framework_type": framework_type
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_recent_strategies(
        self,
        days: int = 7,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get strategies created in the last N days.
        
        Args:
            days: Number of days to look back
            limit: Maximum number of strategies to return
            
        Returns:
            Dictionary with recent strategies
        """
        logger.info(f"Getting strategies from last {days} days")
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        filters = {
            "created_after": cutoff_date
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def create_strategy_with_frameworks(
        self,
        strategy_data: Dict[str, Any],
        frameworks: List[str]
    ) -> Dict[str, Any]:
        """
        Create a new strategy with multiple framework analyses.
        
        Args:
            strategy_data: Basic strategy information
            frameworks: List of framework types to include
            
        Returns:
            Dictionary with created strategy
        """
        # Ensure frameworks are included in the strategy data
        if "frameworks" not in strategy_data:
            strategy_data["frameworks"] = {}
        
        # Initialize empty framework structures
        for framework in frameworks:
            if framework not in strategy_data["frameworks"]:
                strategy_data["frameworks"][framework] = {
                    "type": framework,
                    "status": "pending",
                    "data": None
                }
        
        # Add metadata
        strategy_data["metadata"] = strategy_data.get("metadata", {})
        strategy_data["metadata"]["framework_count"] = len(frameworks)
        strategy_data["metadata"]["framework_types"] = frameworks
        
        return await self.create_resource(strategy_data)

    async def update_framework_data(
        self,
        strategy_id: str,
        framework_type: str,
        framework_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a specific framework within a strategy.
        
        Args:
            strategy_id: UUID of the strategy
            framework_type: Type of framework to update
            framework_data: New data for the framework
            
        Returns:
            Dictionary with updated strategy
        """
        logger.info(f"Updating {framework_type} for strategy {strategy_id}")
        
        # Get current strategy
        current = await self.get_resource_details(strategy_id)
        
        if not current["success"]:
            return current
        
        strategy = current["resource"]
        frameworks = strategy.get("frameworks", {})
        
        # Update the specific framework
        frameworks[framework_type] = {
            "type": framework_type,
            "status": "completed",
            "data": framework_data,
            "updated_at": datetime.now().isoformat()
        }
        
        # Update the strategy
        updates = {
            "frameworks": frameworks
        }
        
        return await self.update_resource(strategy_id, updates)

    async def compare_strategies(
        self,
        strategy_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Compare multiple strategies side by side.
        
        Args:
            strategy_ids: List of strategy UUIDs to compare
            
        Returns:
            Dictionary with comparison data
        """
        logger.info(f"Comparing {len(strategy_ids)} strategies")
        
        strategies = []
        for strategy_id in strategy_ids:
            result = await self.get_resource_details(strategy_id)
            if result["success"]:
                strategies.append(result["resource"])
        
        if not strategies:
            return {
                "success": False,
                "comparison": None,
                "message": "No valid strategies found for comparison"
            }
        
        # Build comparison structure
        comparison = {
            "strategy_count": len(strategies),
            "strategies": strategies,
            "frameworks_in_common": [],
            "unique_frameworks": {},
            "created_dates": [],
            "metadata_comparison": {}
        }
        
        # Find common and unique frameworks
        all_frameworks = set()
        for strategy in strategies:
            frameworks = strategy.get("frameworks", {})
            all_frameworks.update(frameworks.keys())
        
        # Check which frameworks are common
        for framework in all_frameworks:
            count = sum(1 for s in strategies if framework in s.get("frameworks", {}))
            if count == len(strategies):
                comparison["frameworks_in_common"].append(framework)
            else:
                comparison["unique_frameworks"][framework] = count
        
        # Compare metadata
        for strategy in strategies:
            comparison["created_dates"].append(strategy.get("created_at"))
        
        return {
            "success": True,
            "comparison": comparison,
            "message": f"Compared {len(strategies)} strategies successfully"
        }

    async def get_strategy_insights(
        self,
        strategy_id: str
    ) -> Dict[str, Any]:
        """
        Extract key insights from a strategy.
        
        Args:
            strategy_id: UUID of the strategy
            
        Returns:
            Dictionary with extracted insights
        """
        logger.info(f"Extracting insights from strategy {strategy_id}")
        
        result = await self.get_resource_details(strategy_id)
        
        if not result["success"]:
            return result
        
        strategy = result["resource"]
        frameworks = strategy.get("frameworks", {})
        
        insights = {
            "strategy_id": strategy_id,
            "title": strategy.get("title", "Untitled Strategy"),
            "created_at": strategy.get("created_at"),
            "framework_count": len(frameworks),
            "key_insights": [],
            "recommendations": [],
            "risk_factors": [],
            "opportunities": []
        }
        
        # Extract insights from SWOT if available
        if "swot" in frameworks:
            swot_data = frameworks["swot"].get("data", {})
            if swot_data:
                insights["opportunities"].extend(swot_data.get("opportunities", [])[:3])
                insights["risk_factors"].extend(swot_data.get("threats", [])[:3])
                insights["key_insights"].append(
                    f"Identified {len(swot_data.get('strengths', []))} key strengths"
                )
        
        # Extract insights from Porter's Five Forces if available
        if "porter_five_forces" in frameworks:
            porter_data = frameworks["porter_five_forces"].get("data", {})
            if porter_data:
                high_forces = []
                for force, analysis in porter_data.items():
                    if isinstance(analysis, dict) and analysis.get("level") == "high":
                        high_forces.append(force)
                if high_forces:
                    insights["risk_factors"].append(
                        f"High competitive pressure from: {', '.join(high_forces)}"
                    )
        
        # Extract insights from BCG Matrix if available
        if "bcg_matrix" in frameworks:
            bcg_data = frameworks["bcg_matrix"].get("data", {})
            if bcg_data:
                if bcg_data.get("stars"):
                    insights["opportunities"].append(
                        f"Star products/services: {', '.join(bcg_data['stars'][:2])}"
                    )
                if bcg_data.get("question_marks"):
                    insights["recommendations"].append(
                        f"Evaluate potential of: {', '.join(bcg_data['question_marks'][:2])}"
                    )
        
        return {
            "success": True,
            "insights": insights,
            "message": "Insights extracted successfully"
        }

    async def bulk_archive_old_strategies(
        self,
        days_old: int = 90,
        reason: str = "Auto-archive old strategies"
    ) -> Dict[str, Any]:
        """
        Archive strategies older than specified days.
        
        Args:
            days_old: Age threshold in days
            reason: Reason for archiving
            
        Returns:
            Dictionary with archive results
        """
        logger.info(f"Archiving strategies older than {days_old} days")
        
        cutoff_date = (datetime.now() - timedelta(days=days_old)).isoformat()
        
        # Get old strategies
        filters = {
            "created_before": cutoff_date
        }
        
        old_strategies = await self.list_resources(
            limit=100,
            filters=filters
        )
        
        if not old_strategies["success"] or not old_strategies["resources"]:
            return {
                "success": True,
                "archived_count": 0,
                "message": "No old strategies found to archive"
            }
        
        archived_count = 0
        failed_count = 0
        
        for strategy in old_strategies["resources"]:
            if not strategy.get("archived_at"):  # Not already archived
                result = await self.archive_resource(
                    strategy["id"],
                    reason=reason
                )
                if result["success"]:
                    archived_count += 1
                else:
                    failed_count += 1
        
        return {
            "success": failed_count == 0,
            "archived_count": archived_count,
            "failed_count": failed_count,
            "message": f"Archived {archived_count} old strategies"
        }

    async def get_strategy_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics about strategies.
        
        Returns:
            Dictionary with strategy statistics
        """
        logger.info("Getting strategy statistics")
        
        try:
            # Get all strategies
            all_result = await self.list_resources(
                limit=1000,
                include_archived=True
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "statistics": None,
                    "message": "Failed to retrieve strategies for statistics"
                }
            
            strategies = all_result["resources"]
            
            # Calculate statistics
            stats = {
                "total_count": len(strategies),
                "active_count": sum(1 for s in strategies if not s.get("archived_at")),
                "archived_count": sum(1 for s in strategies if s.get("archived_at")),
                "by_framework": {},
                "avg_frameworks_per_strategy": 0,
                "most_used_frameworks": [],
                "recent_7_days": 0,
                "recent_30_days": 0
            }
            
            # Time calculations
            now = datetime.now()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            framework_counts = {}
            total_framework_count = 0
            
            for strategy in strategies:
                # Time-based stats
                created_at = strategy.get("created_at")
                if created_at:
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    if created_date > week_ago:
                        stats["recent_7_days"] += 1
                    if created_date > month_ago:
                        stats["recent_30_days"] += 1
                
                # Framework stats
                frameworks = strategy.get("frameworks", {})
                total_framework_count += len(frameworks)
                
                for framework_type in frameworks.keys():
                    framework_counts[framework_type] = framework_counts.get(framework_type, 0) + 1
            
            # Calculate averages and top frameworks
            if strategies:
                stats["avg_frameworks_per_strategy"] = round(
                    total_framework_count / len(strategies), 2
                )
            
            stats["by_framework"] = framework_counts
            
            # Get top 5 most used frameworks
            if framework_counts:
                sorted_frameworks = sorted(
                    framework_counts.items(),
                    key=lambda x: x[1],
                    reverse=True
                )
                stats["most_used_frameworks"] = [
                    {"name": name, "count": count}
                    for name, count in sorted_frameworks[:5]
                ]
            
            return {
                "success": True,
                "statistics": stats,
                "message": "Strategy statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting strategy statistics: {str(e)}")
            return {
                "success": False,
                "statistics": None,
                "error": str(e),
                "message": "Failed to calculate strategy statistics"
            }