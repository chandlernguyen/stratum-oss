"""
Campaigns Router v2 - Using BaseRouter for standardized CRUD operations
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import Depends, HTTPException, status, Query
from uuid import UUID

from apps.api.routers.base import BaseRouter
from apps.api.models.multi_tenant import (
    Campaign,
    CampaignCreate,
    CampaignUpdate,
    CampaignStatus
)
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.auth_database import get_service_role_client
from apps.api.models.standard_responses import StandardResponse


class CampaignsRouter(BaseRouter):
    """
    Campaigns router with standard CRUD operations plus custom endpoints.
    Migrates from status="archived" to archived_at pattern.
    """

    def __init__(self):
        super().__init__(
            table_name="campaigns",
            resource_name="campaign",
            resource_name_plural="campaigns",
            response_model=Campaign,
            create_model=CampaignCreate,
            update_model=CampaignUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching them
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add campaign-specific custom endpoints."""

        @self.router.post("/{campaign_id}/activate", response_model=StandardResponse)
        async def activate_campaign(
            campaign_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Activate a campaign (set status to active)."""
            try:
                # Verify ownership
                result = db.table("campaigns")\
                    .select("*")\
                    .eq("id", str(campaign_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Campaign not found"
                    )

                campaign = result.data[0]

                # Check if campaign can be activated
                if campaign.get("status") == "archived" or campaign.get("archived_at"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot activate an archived campaign"
                    )

                if campaign.get("status") == "active":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Campaign is already active"
                    )

                # Note: Removed auto-pause logic - organizations can run multiple campaigns simultaneously
                # Previous logic automatically paused all other active campaigns, which was overly restrictive

                # Activate this campaign
                update_result = db.table("campaigns")\
                    .update({
                        "status": "active",
                        "updated_at": datetime.utcnow().isoformat(),
                        "updated_by": current_user["id"]
                    })\
                    .eq("id", str(campaign_id))\
                    .execute()

                if not update_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to activate campaign"
                    )

                return StandardResponse(
                    success=True,
                    data=update_result.data[0],
                    message="Campaign activated successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to activate campaign: {str(e)}"
                )

        @self.router.get("/{campaign_id}/analytics", response_model=StandardResponse)
        async def get_campaign_analytics(
            campaign_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get analytics for a specific campaign."""
            try:
                # Verify ownership
                campaign_result = db.table("campaigns")\
                    .select("*")\
                    .eq("id", str(campaign_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not campaign_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Campaign not found"
                    )

                # Get related analytics data
                # This is a placeholder - implement actual analytics queries
                analytics_data = {
                    "campaign_id": str(campaign_id),
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                    "spend": 0,
                    "roi": 0,
                    "engagement_rate": 0,
                    "conversion_rate": 0,
                    "cost_per_acquisition": 0,
                    "generated_content_count": 0,
                    "active_personas": 0,
                    "strategies_used": 0
                }

                # Get content count for this campaign
                content_result = db.table("agent_messages")\
                    .select("*", count="exact")\
                    .eq("metadata->>campaign_id", str(campaign_id))\
                    .execute()

                if content_result.count:
                    analytics_data["generated_content_count"] = content_result.count

                # Get persona count (nuclear migration: agent_outputs table)
                persona_result = db.table("agent_outputs")\
                    .select("*", count="exact")\
                    .eq("campaign_id", str(campaign_id))\
                    .eq("agent_type", "persona")\
                    .eq("output_type", "persona")\
                    .is_("archived_at", "null")\
                    .execute()

                if persona_result.count:
                    analytics_data["active_personas"] = persona_result.count

                # Get strategy count
                strategy_result = db.table("marketing_strategies")\
                    .select("*", count="exact")\
                    .eq("campaign_id", str(campaign_id))\
                    .is_("archived_at", "null")\
                    .execute()

                if strategy_result.count:
                    analytics_data["strategies_used"] = strategy_result.count

                return StandardResponse(
                    success=True,
                    data=analytics_data,
                    message="Campaign analytics retrieved successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to get campaign analytics: {str(e)}"
                )

        @self.router.patch("/{campaign_id}/status", response_model=StandardResponse)
        async def update_campaign_status(
            campaign_id: UUID,
            new_status: CampaignStatus,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Update campaign status (draft, active, paused, completed)."""
            try:
                # Verify ownership
                result = db.table("campaigns")\
                    .select("*")\
                    .eq("id", str(campaign_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Campaign not found"
                    )

                campaign = result.data[0]

                # Check if already archived
                if campaign.get("archived_at"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot change status of an archived campaign"
                    )

                # Note: Removed auto-pause logic - organizations can run multiple campaigns simultaneously
                # Previous logic automatically paused all other active campaigns, which was overly restrictive

                # Update status
                update_result = db.table("campaigns")\
                    .update({
                        "status": new_status,
                        "updated_at": datetime.utcnow().isoformat(),
                        "updated_by": current_user["id"]
                    })\
                    .eq("id", str(campaign_id))\
                    .execute()

                if not update_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to update campaign status"
                    )

                return StandardResponse(
                    success=True,
                    data=update_result.data[0],
                    message=f"Campaign status updated to {new_status}"
                )

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update campaign status: {str(e)}"
                )

    # Override archive method to handle status migration
    async def archive(
        self, db, user: Dict, resource_id: UUID, reason: Optional[str]
    ) -> StandardResponse:
        """
        Archive a campaign - migrates from status="archived" to archived_at pattern.
        """
        try:
            # Verify ownership first
            existing = await self.get(db, user, resource_id)

            # Perform soft delete using new pattern
            archive_data = {
                "archived_at": datetime.utcnow().isoformat(),
                "archived_by": user["id"],
                "archive_reason": reason or "User requested deletion",
                "status": "archived",  # Keep for backward compatibility during migration
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": user["id"]
            }

            result = db.table(self.table_name)\
                .update(archive_data)\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .is_("archived_at", "null")\
                .execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to archive {self.resource_name}"
                )

            return StandardResponse(
                success=True,
                data={"id": str(resource_id), "archived_at": archive_data["archived_at"]},
                message=f"{self.resource_name.title()} archived successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to archive {self.resource_name}: {str(e)}"
            )


# Create router instance
campaigns_router = CampaignsRouter()