#!/usr/bin/env python3
"""
MarketingStrategyTools - Phase 4 Implementation
Standardized CRUD operations for Marketing Strategy Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)


class MarketingStrategyTools(BaseResourceTools):
    """
    Marketing Strategy-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for marketing strategies.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize MarketingStrategyTools with marketing-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="marketing_strategy",
            resource_plural="marketing_strategies",
            api_base_path="/api/v1/marketing-strategies",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"MarketingStrategyTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists marketing_strategies directly from the marketing_strategies table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with marketing_strategies list and metadata
        """
        logger.info(f"Listing marketing_strategies: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # Build query
            query = supabase.table('marketing_strategies').select('*')

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
                    "message": f"Retrieved {len(response.data)} marketing_strategies"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No marketing_strategies found"
                }

        except Exception as e:
            logger.error(f"Error listing marketing_strategies: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list marketing_strategies"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific marketing_strategy by ID.

        Args:
            resource_id: The marketing_strategy ID

        Returns:
            Dictionary with marketing_strategy details
        """
        logger.info(f"Getting marketing_strategy details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # Query for the specific marketing_strategy
            query = supabase.table('marketing_strategies').select('*').eq('id', resource_id)

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved marketing_strategy {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "marketing_strategy not found",
                    "message": f"No marketing_strategy found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting marketing_strategy details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get marketing_strategy {resource_id}"
            }

    async def list_strategies_by_status(
        self,
        status: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List marketing strategies filtered by status.
        
        Args:
            status: Status of strategies (e.g., "active", "draft", "archived")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with strategies of the specified status
        """
        logger.info(f"Listing marketing strategies with status: {status}")
        
        filters = {
            "status": status
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_active_strategy(self) -> Dict[str, Any]:
        """
        Get the currently active marketing strategy.
        
        Returns:
            Dictionary with the active strategy
        """
        logger.info("Getting active marketing strategy")
        
        result = await self.list_strategies_by_status("active", limit=1)
        
        if result["success"] and result["resources"]:
            return {
                "success": True,
                "strategy": result["resources"][0],
                "message": "Active strategy retrieved"
            }
        else:
            return {
                "success": False,
                "strategy": None,
                "message": "No active marketing strategy found"
            }

    async def activate_strategy(
        self,
        strategy_id: str
    ) -> Dict[str, Any]:
        """
        Activate a marketing strategy (deactivating others).
        
        Args:
            strategy_id: UUID of the strategy to activate
            
        Returns:
            Dictionary with activation result
        """
        logger.info(f"Activating marketing strategy: {strategy_id}")
        
        try:
            # First deactivate all current active strategies
            active = await self.list_strategies_by_status("active", limit=100)
            
            if active["success"] and active["resources"]:
                for strategy in active["resources"]:
                    if strategy["id"] != strategy_id:
                        await self.update_resource(
                            strategy["id"],
                            {"status": "inactive"}
                        )
            
            # Now activate the selected strategy
            result = await self.update_resource(
                strategy_id,
                {"status": "active", "activated_at": "now()"}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error activating strategy: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to activate strategy"
            }

    async def get_strategy_metrics(
        self,
        strategy_id: str
    ) -> Dict[str, Any]:
        """
        Get performance metrics for a marketing strategy.
        
        Args:
            strategy_id: UUID of the strategy
            
        Returns:
            Dictionary with strategy metrics
        """
        logger.info(f"Getting metrics for strategy: {strategy_id}")
        
        # Get the strategy
        result = await self.get_resource_details(strategy_id)
        
        if not result["success"]:
            return result
        
        strategy = result["resource"]
        
        # Extract metrics from strategy data
        metrics = {
            "strategy_id": strategy_id,
            "title": strategy.get("title", "Untitled"),
            "status": strategy.get("status", "unknown"),
            "created_at": strategy.get("created_at"),
            "performance": strategy.get("performance_metrics", {}),
            "channels": strategy.get("channels", []),
            "target_segments": strategy.get("target_segments", []),
            "key_messages": len(strategy.get("key_messages", [])),
            "content_count": strategy.get("content_count", 0)
        }
        
        return {
            "success": True,
            "metrics": metrics,
            "message": "Strategy metrics retrieved"
        }

    async def clone_strategy(
        self,
        strategy_id: str,
        new_title: str
    ) -> Dict[str, Any]:
        """
        Clone an existing marketing strategy.
        
        Args:
            strategy_id: UUID of the strategy to clone
            new_title: Title for the cloned strategy
            
        Returns:
            Dictionary with cloned strategy
        """
        logger.info(f"Cloning strategy {strategy_id} as '{new_title}'")
        
        modifications = {
            "title": new_title,
            "status": "draft",
            "is_clone": True,
            "cloned_from": strategy_id
        }
        
        return await self.duplicate_resource(strategy_id, modifications)

    async def get_strategy_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics about marketing strategies.
        
        Returns:
            Dictionary with strategy statistics
        """
        logger.info("Getting marketing strategy statistics")
        
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
                "active_count": sum(1 for s in strategies if s.get("status") == "active"),
                "draft_count": sum(1 for s in strategies if s.get("status") == "draft"),
                "archived_count": sum(1 for s in strategies if s.get("archived_at")),
                "by_channel": {},
                "by_segment": {},
                "avg_performance": {}
            }
            
            # Analyze strategies
            for strategy in strategies:
                if not strategy.get("archived_at"):
                    # Channels
                    for channel in strategy.get("channels", []):
                        stats["by_channel"][channel] = stats["by_channel"].get(channel, 0) + 1
                    
                    # Segments
                    for segment in strategy.get("target_segments", []):
                        stats["by_segment"][segment] = stats["by_segment"].get(segment, 0) + 1
            
            return {
                "success": True,
                "statistics": stats,
                "message": "Marketing strategy statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting strategy statistics: {str(e)}")
            return {
                "success": False,
                "statistics": None,
                "error": str(e),
                "message": "Failed to calculate statistics"
            }