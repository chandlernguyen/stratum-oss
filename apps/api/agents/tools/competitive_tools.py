#!/usr/bin/env python3
"""
CompetitiveTools - Phase 4 Implementation
Standardized CRUD operations for Competitive Intelligence Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CompetitiveTools(BaseResourceTools):
    """
    Competitive Intelligence-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for competitive analysis.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize CompetitiveTools with competitive intelligence-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="competitor",
            resource_plural="competitors",
            api_base_path="/api/v1/competitors",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"CompetitiveTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists agent_outputs directly from the agent_outputs table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with agent_outputs list and metadata
        """
        logger.info(f"Listing agent_outputs: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'competitive_intelligence')

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
                    "message": f"Retrieved {len(response.data)} agent_outputs"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No agent_outputs found"
                }

        except Exception as e:
            logger.error(f"Error listing agent_outputs: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list agent_outputs"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific competitive_intel by ID.

        Args:
            resource_id: The competitive_intel ID

        Returns:
            Dictionary with competitive_intel details
        """
        logger.info(f"Getting competitive_intel details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'competitive_intelligence')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved competitive_intel {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "competitive_intel not found",
                    "message": f"No competitive_intel found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting competitive_intel details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get competitive_intel {resource_id}"
            }

    async def list_competitors_by_tier(
        self,
        tier: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List competitors filtered by tier/threat level.
        
        Args:
            tier: Competitor tier (e.g., "direct", "indirect", "aspirational")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with competitors of the specified tier
        """
        logger.info(f"Listing competitors with tier: {tier}")
        
        filters = {
            "tier": tier
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_competitor_analysis(
        self,
        competitor_id: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive analysis for a specific competitor.
        
        Args:
            competitor_id: UUID of the competitor
            
        Returns:
            Dictionary with competitor analysis
        """
        logger.info(f"Getting analysis for competitor: {competitor_id}")
        
        # Get competitor details
        result = await self.get_resource_details(competitor_id)
        
        if not result["success"]:
            return result
        
        competitor = result["resource"]
        
        # Extract analysis data
        analysis = {
            "competitor_id": competitor_id,
            "name": competitor.get("name", "Unknown"),
            "tier": competitor.get("tier"),
            "strengths": competitor.get("strengths", []),
            "weaknesses": competitor.get("weaknesses", []),
            "opportunities": competitor.get("opportunities", []),
            "threats": competitor.get("threats", []),
            "market_share": competitor.get("market_share"),
            "key_strategies": competitor.get("key_strategies", []),
            "differentiators": competitor.get("differentiators", []),
            "pricing_strategy": competitor.get("pricing_strategy", {}),
            "marketing_channels": competitor.get("marketing_channels", [])
        }
        
        return {
            "success": True,
            "analysis": analysis,
            "message": "Competitor analysis retrieved"
        }

    async def get_competitive_gaps(
        self,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Identify competitive gaps and opportunities.
        
        Args:
            category: Optional category filter (e.g., "product", "marketing", "pricing")
            
        Returns:
            Dictionary with competitive gaps
        """
        logger.info(f"Identifying competitive gaps in category: {category}")
        
        filters = {}
        if category:
            filters["gap_category"] = category
        
        # This would typically query a gaps table or analyze competitor data
        result = await self.list_resources(
            limit=100,
            filters=filters
        )
        
        if not result["success"]:
            return result
        
        competitors = result["resources"]
        
        # Analyze gaps
        gaps = {
            "total_competitors": len(competitors),
            "identified_gaps": [],
            "opportunities": [],
            "threats": [],
            "recommendations": []
        }
        
        # Process competitor data to identify gaps
        for competitor in competitors:
            # Extract gaps from competitor analysis
            if competitor.get("gaps_identified"):
                gaps["identified_gaps"].extend(competitor["gaps_identified"])
            if competitor.get("opportunities"):
                gaps["opportunities"].extend(competitor["opportunities"])
            if competitor.get("threats"):
                gaps["threats"].extend(competitor["threats"])
        
        # Remove duplicates
        gaps["identified_gaps"] = list(set(gaps["identified_gaps"]))
        gaps["opportunities"] = list(set(gaps["opportunities"]))
        gaps["threats"] = list(set(gaps["threats"]))
        
        return {
            "success": True,
            "gaps": gaps,
            "message": "Competitive gaps analysis completed"
        }

    async def update_competitor_intel(
        self,
        competitor_id: str,
        intel_type: str,
        intel_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update competitor intelligence with new information.
        
        Args:
            competitor_id: UUID of the competitor
            intel_type: Type of intelligence (e.g., "pricing", "product", "marketing")
            intel_data: New intelligence data
            
        Returns:
            Dictionary with update result
        """
        logger.info(f"Updating {intel_type} intelligence for competitor: {competitor_id}")
        
        updates = {
            f"{intel_type}_intel": intel_data,
            f"{intel_type}_updated_at": datetime.now().isoformat(),
            "last_intel_update": datetime.now().isoformat()
        }
        
        return await self.update_resource(competitor_id, updates)

    async def get_market_position_analysis(self) -> Dict[str, Any]:
        """
        Analyze market positioning relative to competitors.
        
        Returns:
            Dictionary with market position analysis
        """
        logger.info("Analyzing market position")
        
        try:
            # Get all competitors
            all_result = await self.list_resources(
                limit=100,
                include_archived=False
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "position": None,
                    "message": "Failed to retrieve competitors for analysis"
                }
            
            competitors = all_result["resources"]
            
            # Analyze market position
            position = {
                "total_competitors": len(competitors),
                "by_tier": {
                    "direct": 0,
                    "indirect": 0,
                    "aspirational": 0
                },
                "market_share_distribution": {},
                "competitive_intensity": "medium",
                "key_differentiators": [],
                "competitive_advantages": [],
                "areas_for_improvement": []
            }
            
            total_market_share = 0
            
            for competitor in competitors:
                # Tier breakdown
                tier = competitor.get("tier", "indirect")
                if tier in position["by_tier"]:
                    position["by_tier"][tier] += 1
                
                # Market share
                market_share = competitor.get("market_share", 0)
                if market_share > 0:
                    position["market_share_distribution"][competitor.get("name", "Unknown")] = market_share
                    total_market_share += market_share
                
                # Collect differentiators
                differentiators = competitor.get("differentiators", [])
                position["key_differentiators"].extend(differentiators)
            
            # Calculate competitive intensity
            direct_competitors = position["by_tier"]["direct"]
            if direct_competitors > 5:
                position["competitive_intensity"] = "high"
            elif direct_competitors < 2:
                position["competitive_intensity"] = "low"
            
            # Remove duplicate differentiators
            position["key_differentiators"] = list(set(position["key_differentiators"]))
            
            return {
                "success": True,
                "position": position,
                "message": "Market position analysis completed"
            }
            
        except Exception as e:
            logger.error(f"Error analyzing market position: {str(e)}")
            return {
                "success": False,
                "position": None,
                "error": str(e),
                "message": "Failed to analyze market position"
            }