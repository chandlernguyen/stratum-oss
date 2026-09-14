#!/usr/bin/env python3
"""
ClientSuccessTools - Phase 4 Implementation
Standardized CRUD operations for Client Success Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ClientSuccessTools(BaseResourceTools):
    """
    Client Success-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for client management.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize ClientSuccessTools with client-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="client",
            resource_plural="clients",
            api_base_path="/api/v1/clients",
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"ClientSuccessTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists client_success_metrics directly from the client_success_metrics table.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with client_success_metrics list and metadata
        """
        logger.info(f"Listing client_success_metrics: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('agent_type', 'client_success')

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
                    "message": f"Retrieved {len(response.data)} client_success_metrics"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No client_success_metrics found"
                }

        except Exception as e:
            logger.error(f"Error listing client_success_metrics: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list client_success_metrics"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific client_success by ID.

        Args:
            resource_id: The client_success ID

        Returns:
            Dictionary with client_success details
        """
        logger.info(f"Getting client_success details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # 🚀 NUCLEAR: Query universal agent_outputs table
            query = supabase.table('agent_outputs').select('*').eq('id', resource_id).eq('agent_type', 'client_success')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                return {
                    "success": True,
                    "resource": response.data,
                    "message": f"Retrieved client_success {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "client_success not found",
                    "message": f"No client_success found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting client_success details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get client_success {resource_id}"
            }

    async def list_clients_by_health(
        self,
        health_score: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        List clients filtered by health score.
        
        Args:
            health_score: Health score category (e.g., "healthy", "at_risk", "critical")
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with clients of the specified health score
        """
        logger.info(f"Listing clients with health score: {health_score}")
        
        filters = {
            "health_score": health_score
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_client_health_metrics(
        self,
        client_id: str
    ) -> Dict[str, Any]:
        """
        Get health metrics and analysis for a specific client.
        
        Args:
            client_id: UUID of the client
            
        Returns:
            Dictionary with client health metrics
        """
        logger.info(f"Getting health metrics for client: {client_id}")
        
        # Get client details
        result = await self.get_resource_details(client_id)
        
        if not result["success"]:
            return result
        
        client = result["resource"]
        
        # Extract health metrics
        metrics = {
            "client_id": client_id,
            "name": client.get("name", "Unknown"),
            "health_score": client.get("health_score"),
            "engagement_level": client.get("engagement_level"),
            "satisfaction_score": client.get("satisfaction_score"),
            "retention_risk": client.get("retention_risk"),
            "lifetime_value": client.get("lifetime_value"),
            "last_interaction": client.get("last_interaction"),
            "upcoming_renewals": client.get("upcoming_renewals", []),
            "support_tickets": client.get("support_tickets", 0),
            "usage_metrics": client.get("usage_metrics", {})
        }
        
        return {
            "success": True,
            "metrics": metrics,
            "message": "Client health metrics retrieved"
        }

    async def update_client_engagement(
        self,
        client_id: str,
        engagement_type: str,
        engagement_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update client engagement record.
        
        Args:
            client_id: UUID of the client
            engagement_type: Type of engagement (e.g., "meeting", "email", "call")
            engagement_data: Engagement details
            
        Returns:
            Dictionary with update result
        """
        logger.info(f"Updating {engagement_type} engagement for client: {client_id}")
        
        updates = {
            "last_engagement": {
                "type": engagement_type,
                "data": engagement_data,
                "timestamp": datetime.now().isoformat()
            },
            "last_interaction": datetime.now().isoformat()
        }
        
        return await self.update_resource(client_id, updates)

    async def get_at_risk_clients(
        self,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get clients at risk of churn.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            Dictionary with at-risk clients
        """
        logger.info("Getting at-risk clients")
        
        filters = {
            "retention_risk": "high",
            "health_score_not": "healthy"
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def get_client_success_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive client success metrics summary.
        
        Returns:
            Dictionary with client success summary
        """
        logger.info("Getting client success summary")
        
        try:
            # Get all clients
            all_result = await self.list_resources(
                limit=1000,
                include_archived=False
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "summary": None,
                    "message": "Failed to retrieve clients for summary"
                }
            
            clients = all_result["resources"]
            
            # Calculate summary
            summary = {
                "total_clients": len(clients),
                "by_health": {
                    "healthy": 0,
                    "at_risk": 0,
                    "critical": 0
                },
                "by_engagement": {
                    "high": 0,
                    "medium": 0,
                    "low": 0
                },
                "average_satisfaction": 0,
                "total_lifetime_value": 0,
                "retention_rate": 0,
                "at_risk_count": 0,
                "upcoming_renewals_30_days": 0
            }
            
            total_satisfaction = 0
            satisfaction_count = 0
            retained_clients = 0
            
            for client in clients:
                # Health breakdown
                health = client.get("health_score", "unknown")
                if health in summary["by_health"]:
                    summary["by_health"][health] += 1
                
                # Engagement breakdown
                engagement = client.get("engagement_level", "medium")
                if engagement in summary["by_engagement"]:
                    summary["by_engagement"][engagement] += 1
                
                # Satisfaction metrics
                satisfaction = client.get("satisfaction_score")
                if satisfaction:
                    total_satisfaction += satisfaction
                    satisfaction_count += 1
                
                # Lifetime value
                ltv = client.get("lifetime_value", 0)
                summary["total_lifetime_value"] += ltv
                
                # Retention and risk
                if client.get("status") == "active":
                    retained_clients += 1
                if client.get("retention_risk") == "high":
                    summary["at_risk_count"] += 1
                
                # Upcoming renewals
                renewal_date = client.get("next_renewal_date")
                if renewal_date:
                    days_until = (datetime.fromisoformat(renewal_date) - datetime.now()).days
                    if 0 <= days_until <= 30:
                        summary["upcoming_renewals_30_days"] += 1
            
            # Calculate averages
            if satisfaction_count > 0:
                summary["average_satisfaction"] = round(total_satisfaction / satisfaction_count, 2)
            
            if len(clients) > 0:
                summary["retention_rate"] = round((retained_clients / len(clients)) * 100, 2)
            
            return {
                "success": True,
                "summary": summary,
                "message": "Client success summary retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting client success summary: {str(e)}")
            return {
                "success": False,
                "summary": None,
                "error": str(e),
                "message": "Failed to calculate client success summary"
            }