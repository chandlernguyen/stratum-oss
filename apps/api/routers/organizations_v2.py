"""
Organizations Router v2 - Using BaseRouter for standardized CRUD operations
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from uuid import UUID
from pydantic import BaseModel, Field
from supabase import Client

from apps.api.routers.base import BaseRouter
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.auth_database import get_service_role_client
from apps.api.utils.database import get_supabase_client
from apps.api.models.standard_responses import StandardResponse
from apps.api.models.multi_tenant import (
    Organization,
    OrganizationCreate,
    OrganizationUpdate,
    WorkspaceContext,
    SwitchWorkspaceRequest,
    UserRole,
    Client as ClientModel,
    Campaign
)
from apps.api.middleware.permissions_v2 import (
    require_permission,
    require_any_permission
)
import logging

logger = logging.getLogger(__name__)


class OrganizationsRouter(BaseRouter):
    """
    Organizations router with standard CRUD operations plus custom endpoints.
    Includes workspace management and role assignments.

    NOTE: Custom routes like /current must be registered BEFORE standard CRUD routes
    to avoid routing conflicts with /{resource_id}
    """

    def __init__(self):
        # Call parent init normally
        super().__init__(
            table_name="organizations",
            resource_name="organization",
            resource_name_plural="organizations",
            response_model=Organization,
            create_model=OrganizationCreate,
            update_model=OrganizationUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching /current
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add organization-specific custom endpoints."""

        @self.router.post("/generate-slug", response_model=StandardResponse)
        async def generate_slug_preview(
            request: Dict[str, str] = Body(...),
            db: Client = Depends(get_supabase_client)
        ):
            """Generate a unique slug preview for an organization name (no auth required for signup)"""
            org_name = request.get("name", "")

            if not org_name or len(org_name) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Organization name must be at least 2 characters"
                )

            # Use database function to generate unique slug
            slug_response = db.rpc("generate_unique_slug", {"input_text": org_name}).execute()

            if not slug_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate slug"
                )

            return StandardResponse(
                success=True,
                data={"slug": slug_response.data},
                message="Slug generated successfully"
            )

        @self.router.get("/current", response_model=StandardResponse)
        async def get_current_workspace(
            current_user: Dict[str, Any] = Depends(get_current_user),
            db: Client = Depends(get_supabase_client)
        ):
            """Get current user's workspace context including organization, roles, and permissions"""

            # Get user's organization
            user_response = db.table("users").select("org_id").eq(
                "id", current_user["id"]
            ).execute()

            if not user_response.data or len(user_response.data) == 0:
                # Return None for new users who haven't set up their organization yet
                return StandardResponse(
                    success=True,
                    data=None,
                    message="No workspace found for user"
                )

            org_id = user_response.data[0].get("org_id")

            if not org_id:
                # User exists but no organization yet - this is normal for new sign-ups
                return StandardResponse(
                    success=True,
                    data=None,
                    message="User has no organization"
                )

            # Get organization details
            org_response = db.table("organizations").select("*").eq(
                "id", org_id
            ).execute()

            if not org_response.data or len(org_response.data) == 0:
                return StandardResponse(
                    success=True,
                    data=None,
                    message="Organization not found"
                )

            organization = org_response.data[0]

            # Get user's roles
            roles_response = db.table("user_role_assignments").select(
                "*, roles(name)"
            ).eq(
                "user_id", current_user["id"]
            ).eq("org_id", org_id).execute()

            # Transform the role data
            user_roles = []
            if roles_response.data:
                for role_assignment in roles_response.data:
                    if role_assignment.get("roles"):
                        role_data = {
                            "id": role_assignment["role_id"],
                            "user_id": role_assignment["user_id"],
                            "org_id": role_assignment["org_id"],
                            "role": role_assignment["roles"]["name"],
                            "created_at": role_assignment.get("created_at"),
                            "updated_at": role_assignment.get("updated_at")
                        }
                        user_roles.append(role_data)

            # For now, we'll skip the permissions lookup since the function doesn't exist
            # TODO: Implement get_user_permissions function in database

            workspace_context = {
                "organization": organization,
                "user_roles": user_roles,
                "user_permissions": []  # Empty for now until function is created
            }

            return StandardResponse(
                success=True,
                data=workspace_context,
                message="Workspace context retrieved successfully"
            )

        @self.router.post("/switch", response_model=StandardResponse)
        async def switch_workspace_context(
            request: SwitchWorkspaceRequest,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db: Client = Depends(get_supabase_client)
        ):
            """Switch user's workspace context (client/campaign focus)"""

            # This endpoint is for switching context within the same organization
            # It sets the user's current client and campaign focus

            current_client = None
            current_campaign = None

            # Validate and set client if provided
            if request.client_id:
                client_response = db.table("clients").select("*").eq(
                    "id", str(request.client_id)
                ).eq("org_id", current_user["org_id"]).execute()

                if not client_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Client not found or you don't have access"
                    )
                current_client = client_response.data[0]

            # Validate and set campaign if provided
            if request.campaign_id:
                campaign_response = db.table("campaigns").select("*").eq(
                    "id", str(request.campaign_id)
                ).eq("org_id", current_user["org_id"]).execute()

                if not campaign_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Campaign not found or you don't have access"
                    )
                current_campaign = campaign_response.data[0]

                # If campaign is set but no client, use the campaign's client
                if current_campaign.get("client_id") and not current_client:
                    client_response = db.table("clients").select("*").eq(
                        "id", current_campaign["client_id"]
                    ).eq("org_id", current_user["org_id"]).execute()

                    if client_response.data:
                        current_client = client_response.data[0]

            return StandardResponse(
                success=True,
                data={
                    "current_client": current_client,
                    "current_campaign": current_campaign
                },
                message="Workspace context switched successfully"
            )

        @self.router.get("/available", response_model=StandardResponse)
        async def get_available_organizations(
            current_user: Dict[str, Any] = Depends(get_current_user),
            db: Client = Depends(get_supabase_client)
        ):
            """Get all organizations the user has access to"""

            # Get all organizations where user has a role
            roles_response = db.table("user_role_assignments").select(
                "org_id, organizations(id, name, slug, description, logo_url, created_at)"
            ).eq("user_id", current_user["id"]).execute()

            organizations = []
            if roles_response.data:
                for assignment in roles_response.data:
                    if assignment.get("organizations"):
                        organizations.append(assignment["organizations"])

            return StandardResponse(
                success=True,
                data=organizations,
                message=f"Found {len(organizations)} available organizations"
            )

        @self.router.post("/{organization_id}/invite", response_model=StandardResponse)
        @require_permission("organization:manage_members")
        async def invite_user_to_organization(
            organization_id: UUID,
            email: str = Body(..., embed=True),
            role: str = Body("member", embed=True),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db: Client = Depends(get_service_role_client)
        ):
            """Invite a user to join the organization"""

            # Verify organization exists and user has access
            org_check = db.table("organizations").select("id").eq(
                "id", str(organization_id)
            ).eq("id", current_user["org_id"]).execute()

            if not org_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization not found or you don't have access"
                )

            # Check if user already exists
            user_check = db.table("users").select("id").eq("email", email).execute()

            if user_check.data:
                # User exists, add to organization
                user_id = user_check.data[0]["id"]

                # Check if already member
                member_check = db.table("user_role_assignments").select("id").eq(
                    "user_id", user_id
                ).eq("org_id", str(organization_id)).execute()

                if member_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="User is already a member of this organization"
                    )

                # Get role ID
                role_response = db.table("roles").select("id").eq("name", role).execute()
                if not role_response.data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid role: {role}"
                    )

                # Assign role
                assignment_data = {
                    "user_id": user_id,
                    "org_id": str(organization_id),
                    "role_id": role_response.data[0]["id"],
                    "created_at": datetime.utcnow().isoformat()
                }

                db.table("user_role_assignments").insert(assignment_data).execute()

                return StandardResponse(
                    success=True,
                    data={"user_id": user_id, "status": "added"},
                    message="User added to organization"
                )
            else:
                # User doesn't exist, create invitation
                invitation_data = {
                    "org_id": str(organization_id),
                    "email": email,
                    "role": role,
                    "invited_by": current_user["id"],
                    "created_at": datetime.utcnow().isoformat(),
                    "status": "pending"
                }

                result = db.table("organization_invitations").insert(invitation_data).execute()

                # TODO: Send invitation email

                return StandardResponse(
                    success=True,
                    data=result.data[0] if result.data else None,
                    message="Invitation sent successfully"
                )

        @self.router.get("/{organization_id}/members", response_model=StandardResponse)
        @require_permission("organization:view_members")
        async def get_organization_members(
            organization_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db: Client = Depends(get_service_role_client)
        ):
            """Get all members of an organization"""

            # Verify user has access to this organization
            if str(organization_id) != current_user["org_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view members of your own organization"
                )

            # Get all members with their roles
            members_response = db.table("user_role_assignments").select(
                "*, users(id, email, full_name, avatar_url), roles(name)"
            ).eq("org_id", str(organization_id)).execute()

            members = []
            if members_response.data:
                for assignment in members_response.data:
                    if assignment.get("users"):
                        member_data = assignment["users"]
                        member_data["role"] = assignment["roles"]["name"] if assignment.get("roles") else None
                        member_data["joined_at"] = assignment.get("created_at")
                        members.append(member_data)

            return StandardResponse(
                success=True,
                data=members,
                message=f"Found {len(members)} members"
            )

        @self.router.delete("/{organization_id}/members/{user_id}", response_model=StandardResponse)
        @require_permission("organization:manage_members")
        async def remove_member_from_organization(
            organization_id: UUID,
            user_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db: Client = Depends(get_service_role_client)
        ):
            """Remove a member from the organization"""

            # Verify user has access to this organization
            if str(organization_id) != current_user["org_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only manage members of your own organization"
                )

            # Don't allow self-removal through this endpoint
            if str(user_id) == current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You cannot remove yourself from the organization"
                )

            # Remove user's role assignments
            result = db.table("user_role_assignments").delete().eq(
                "user_id", str(user_id)
            ).eq("org_id", str(organization_id)).execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Member not found in organization"
                )

            # Update user's org_id if this was their current org
            user_check = db.table("users").select("org_id").eq("id", str(user_id)).execute()
            if user_check.data and user_check.data[0].get("org_id") == str(organization_id):
                db.table("users").update({"org_id": None}).eq("id", str(user_id)).execute()

            return StandardResponse(
                success=True,
                data={"user_id": str(user_id)},
                message="Member removed from organization"
            )


# Create router instance
organizations_router = OrganizationsRouter()