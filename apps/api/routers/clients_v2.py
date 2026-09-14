"""
Clients Router v2 - Using BaseRouter for standardized CRUD operations
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import Depends, HTTPException, status, Query
from uuid import UUID
from pydantic import BaseModel, Field

from apps.api.routers.base import BaseRouter
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.auth_database import get_service_role_client
from apps.api.models.standard_responses import StandardResponse
from apps.api.models.multi_tenant import (
    Client as ClientModel,
    ClientCreate,
    ClientUpdate
)
import logging

logger = logging.getLogger(__name__)


class ClientsRouter(BaseRouter):
    """
    Clients router with standard CRUD operations plus custom endpoints.
    Manages client accounts for agencies within organizations.
    """

    def __init__(self):
        super().__init__(
            table_name="clients",
            resource_name="client",
            resource_name_plural="clients",
            response_model=ClientModel,
            create_model=ClientCreate,
            update_model=ClientUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching them
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add client-specific custom endpoints."""

        @self.router.get("/active", response_model=StandardResponse)
        async def get_active_clients(
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get all active clients for the organization."""
            try:
                result = db.table("clients")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")\
                    .order("created_at", desc=True)\
                    .execute()

                return StandardResponse(
                    success=True,
                    data=result.data,
                    message=f"Retrieved {len(result.data)} active clients"
                )

            except Exception as e:
                logger.error(f"Error getting active clients: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve active clients"
                )

        @self.router.get("/{client_id}/campaigns", response_model=StandardResponse)
        async def get_client_campaigns(
            client_id: UUID,
            include_archived: bool = Query(False, description="Include archived campaigns"),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get all campaigns for a specific client."""
            try:
                # Verify client ownership
                client_check = db.table("clients")\
                    .select("id")\
                    .eq("id", str(client_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not client_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Client not found"
                    )

                # Get campaigns
                query = db.table("campaigns")\
                    .select("*")\
                    .eq("client_id", str(client_id))\
                    .eq("org_id", current_user["org_id"])

                if not include_archived:
                    query = query.is_("archived_at", "null")

                result = query.order("created_at", desc=True).execute()

                return StandardResponse(
                    success=True,
                    data=result.data,
                    message=f"Retrieved {len(result.data)} campaigns for client"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting client campaigns: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve client campaigns"
                )

        @self.router.get("/{client_id}/analytics", response_model=StandardResponse)
        async def get_client_analytics(
            client_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get analytics overview for a specific client."""
            try:
                # Verify client ownership
                client_check = db.table("clients")\
                    .select("*")\
                    .eq("id", str(client_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not client_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Client not found"
                    )

                client = client_check.data[0]

                # Get campaign count
                campaigns_result = db.table("campaigns")\
                    .select("*", count="exact")\
                    .eq("client_id", str(client_id))\
                    .is_("archived_at", "null")\
                    .execute()

                # Get active campaigns
                active_campaigns = db.table("campaigns")\
                    .select("*", count="exact")\
                    .eq("client_id", str(client_id))\
                    .eq("status", "active")\
                    .is_("archived_at", "null")\
                    .execute()

                # Get document count
                documents_result = db.table("documents")\
                    .select("*", count="exact")\
                    .eq("client_id", str(client_id))\
                    .is_("archived_at", "null")\
                    .execute()

                # Get persona count across all client campaigns (nuclear migration: agent_outputs table)
                campaign_ids = [c["id"] for c in campaigns_result.data] if campaigns_result.data else []
                personas_count = 0
                if campaign_ids:
                    personas_result = db.table("agent_outputs")\
                        .select("*", count="exact")\
                        .in_("campaign_id", campaign_ids)\
                        .eq("agent_type", "persona")\
                        .eq("output_type", "persona")\
                        .is_("archived_at", "null")\
                        .execute()
                    personas_count = personas_result.count or 0

                analytics = {
                    "client_id": str(client_id),
                    "client_name": client.get("name"),
                    "total_campaigns": campaigns_result.count or 0,
                    "active_campaigns": active_campaigns.count or 0,
                    "total_documents": documents_result.count or 0,
                    "total_personas": personas_count,
                    "client_since": client.get("created_at"),
                    "last_activity": client.get("updated_at")
                }

                return StandardResponse(
                    success=True,
                    data=analytics,
                    message="Client analytics retrieved successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting client analytics: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve client analytics"
                )

        @self.router.post("/{client_id}/quick-campaign", response_model=StandardResponse)
        async def create_quick_campaign(
            client_id: UUID,
            campaign_name: str = Query(..., description="Name for the campaign"),
            campaign_type: str = Query("general", description="Type of campaign"),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Create a quick campaign for a client with minimal setup."""
            try:
                # Verify client ownership
                client_check = db.table("clients")\
                    .select("*")\
                    .eq("id", str(client_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not client_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Client not found"
                    )

                # Create campaign
                campaign_data = {
                    "org_id": current_user["org_id"],
                    "client_id": str(client_id),
                    "name": campaign_name,
                    "description": f"Quick {campaign_type} campaign",
                    "type": campaign_type,
                    "status": "draft",
                    "created_by": current_user["id"],
                    "updated_by": current_user["id"],
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }

                result = db.table("campaigns").insert(campaign_data).execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create campaign"
                    )

                return StandardResponse(
                    success=True,
                    data=result.data[0],
                    message="Campaign created successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error creating quick campaign: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create quick campaign"
                )

        @self.router.get("/health-scores", response_model=StandardResponse)
        async def get_client_health_scores(
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get health scores for all clients (engagement metrics)."""
            try:
                # Get all clients
                clients_result = db.table("clients")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")\
                    .execute()

                health_scores = []
                for client in clients_result.data:
                    # Calculate simple health score based on activity
                    campaigns_count = db.table("campaigns")\
                        .select("*", count="exact")\
                        .eq("client_id", client["id"])\
                        .eq("status", "active")\
                        .execute()

                    # Calculate days since last update
                    last_update = datetime.fromisoformat(client["updated_at"].replace("Z", "+00:00"))
                    days_inactive = (datetime.now(last_update.tzinfo) - last_update).days

                    # Simple health score calculation
                    if campaigns_count.count > 0 and days_inactive < 7:
                        health = "healthy"
                        score = 90
                    elif campaigns_count.count > 0 and days_inactive < 30:
                        health = "good"
                        score = 70
                    elif days_inactive < 60:
                        health = "at_risk"
                        score = 40
                    else:
                        health = "inactive"
                        score = 20

                    health_scores.append({
                        "client_id": client["id"],
                        "client_name": client["name"],
                        "health_status": health,
                        "health_score": score,
                        "active_campaigns": campaigns_count.count or 0,
                        "days_since_activity": days_inactive
                    })

                # Sort by health score
                health_scores.sort(key=lambda x: x["health_score"], reverse=True)

                return StandardResponse(
                    success=True,
                    data=health_scores,
                    message=f"Health scores calculated for {len(health_scores)} clients"
                )

            except Exception as e:
                logger.error(f"Error calculating health scores: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to calculate client health scores"
                )


# Create router instance
clients_router = ClientsRouter()