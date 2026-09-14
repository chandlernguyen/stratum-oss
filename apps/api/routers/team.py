"""
Team Management API Endpoints - Database-First Approach
========================================================
Thin wrappers around PostgreSQL functions for team member invitations and management.

Database Functions (Migration 146):
- get_team_members_with_invitations(p_org_id)
- create_team_invitation(p_org_id, p_email, p_role_id, p_invited_by, p_client_id)
- complete_user_onboarding(p_user_id, p_invitation_token, p_full_name)
- revoke_team_invitation(p_invitation_id, p_user_id)

Endpoints:
- GET /api/v1/team/members - List team members + pending invitations
- POST /api/v1/team/invite - Send team invitation
- POST /api/v1/team/invitations/accept - Accept invitation (signup + onboard)
- DELETE /api/v1/team/invitations/:id - Revoke invitation

Related:
- Database: team_invitations table (Migration 145)
- Functions: Migration 146 (database-first business logic)
- Models: apps/api/models/team.py
- Plan: docs/TEAM_INVITATION_SYSTEM_PLAN_2025_10_24.md
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
import logging
from uuid import UUID
import os

from apps.api.models.team import (
    TeamInvitationCreate,
    TeamInvitationAccept,
    TeamInvitationSendResponse,
    TeamInvitationAcceptResponse,
    TeamListResponse,
    TeamMemberResponse,
    TeamInvitationResponse,
    UpdateMemberRoleRequest,
    UpdateMemberRoleResponse,
    RemoveMemberResponse,
    UpdateMemberClientsRequest,
    UpdateMemberClientsResponse,
)
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client
from apps.api.utils.email import send_team_invitation_email
from supabase import Client
from typing import Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/team", tags=["team"])

# Email configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:56310")


# =============================================================================
# Helper Functions
# =============================================================================

def send_invitation_email_direct(
    email: str,
    invitation_token: str,
    inviter_name: str,
    org_name: str,
    role_name: str
) -> None:
    """
    Send invitation email directly via Resend.

    This is the recommended approach for multi-tenant applications.
    Unlike Supabase's invite_user_by_email(), this:
    - Does NOT create a user in auth.users
    - Sends a custom branded email via Resend
    - User creates their account when they accept (with their chosen password)

    For local development: Logs invitation link instead of sending email,
    unless FORCE_SEND_EMAILS=true is set in environment.
    """
    invitation_link = f"{FRONTEND_URL}/accept-invitation/{invitation_token}"

    # Use the Resend email utility (handles local dev logging internally)
    success = send_team_invitation_email(
        to_email=email,
        invitation_link=invitation_link,
        inviter_name=inviter_name,
        org_name=org_name,
        role_name=role_name
    )

    if not success:
        # Don't fail the request if email sending fails - invitation is already created
        logger.warning(f"Invitation created but email may not have been sent. Manual link: {invitation_link}")


# =============================================================================
# API Endpoints (Thin Database Wrappers)
# =============================================================================

@router.get("/members", response_model=TeamListResponse)
async def get_team_members(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all team members and pending invitations for current user's organization.

    Database-First: Single RPC call to get_team_members_with_invitations()
    Returns: { members: [...], pending_invitations: [...], total_members: N, total_pending: N }
    """
    try:
        # Call database function
        result = supabase.rpc(
            "get_team_members_with_invitations",
            {"p_org_id": str(current_user["org_id"])}
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to fetch team members")

        # Database function returns JSONB with exact structure we need
        return TeamListResponse(**result.data)

    except Exception as e:
        logger.error(f"Error fetching team members: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invite", response_model=TeamInvitationSendResponse)
async def invite_team_member(
    invitation: TeamInvitationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Invite a new team member via email.

    Database-First: Calls create_team_invitation() function which:
    1. Validates inviter has permission (owner/admin only)
    2. Checks for duplicate invitations
    3. Generates secure invitation token
    4. Creates invitation record
    5. Returns invitation details

    Then: Sends email via Supabase Auth (Resend)
    """
    try:
        # Call database function to create invitation
        result = supabase.rpc(
            "create_team_invitation",
            {
                "p_org_id": str(current_user["org_id"]),
                "p_email": invitation.email,
                "p_role_id": str(invitation.role_id),
                "p_invited_by": str(current_user["id"]),
                "p_client_id": str(invitation.client_ids[0]) if invitation.client_ids else None
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create invitation")

        invitation_data = result.data

        # Send invitation email directly via Resend (no Supabase user creation)
        send_invitation_email_direct(
            invitation_data["email"],
            invitation_data["invitation_token"],
            current_user.get("full_name") or "Team Admin",
            current_user.get("org_name") or "Your Organization",
            invitation_data["role_name"]
        )

        # Build response
        invitation_link = f"{FRONTEND_URL}/accept-invitation/{invitation_data['invitation_token']}"

        return TeamInvitationSendResponse(
            invitation_id=invitation_data["invitation_id"],
            email=invitation_data["email"],
            role_name=invitation_data["role_name"],
            expires_at=invitation_data["expires_at"],
            invitation_link=invitation_link,
            message="Invitation sent successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invitation: {str(e)}")
        # Database function raises exceptions with descriptive messages
        if "Permission denied" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        elif "already exists" in str(e) or "already a member" in str(e):
            raise HTTPException(status_code=409, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitations/accept", response_model=TeamInvitationAcceptResponse)
async def accept_invitation(
    acceptance: TeamInvitationAccept,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Accept a team invitation by signing up and completing onboarding.

    Three-Phase Process:
    1. Lookup invitation by token to get email and validate status
    2. Create auth user via Supabase Auth sign_up()
    3. Complete onboarding via complete_user_onboarding() database function

    Database-First: complete_user_onboarding() is atomic transaction that:
    - Validates invitation token
    - Creates user profile in users table
    - Assigns role in user_role_assignments
    - Marks invitation as accepted
    - Returns complete user context
    """
    from datetime import datetime, timezone

    try:
        # Phase 1: Lookup invitation to get email and validate
        invitation_result = supabase.table("team_invitations").select(
            "id, email, status, expires_at"
        ).eq("invitation_token", acceptance.invitation_token).execute()

        if not invitation_result.data or len(invitation_result.data) == 0:
            raise HTTPException(status_code=400, detail="Invalid or already used invitation token")

        invitation = invitation_result.data[0]

        # Check status
        if invitation["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"Invitation is no longer valid (status: {invitation['status']})")

        # Check expiration - handle timezone-aware comparison
        expires_at_str = invitation["expires_at"]
        if expires_at_str:
            # Parse ISO format datetime string from database
            if expires_at_str.endswith('Z'):
                expires_at_str = expires_at_str[:-1] + '+00:00'
            expires_at = datetime.fromisoformat(expires_at_str)
            # Make sure we compare with timezone-aware now
            now = datetime.now(timezone.utc)
            if expires_at < now:
                raise HTTPException(status_code=410, detail="Invitation has expired")

        email = invitation["email"]
        logger.info(f"Found valid invitation for email: {email}")

        # Phase 2: Create auth user via Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": acceptance.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Failed to create auth user")

        user_id = auth_response.user.id

        # Phase 3: Complete onboarding via database function (atomic)
        result = supabase.rpc(
            "complete_user_onboarding",
            {
                "p_user_id": str(user_id),
                "p_invitation_token": acceptance.invitation_token,
                "p_full_name": acceptance.full_name
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to complete user onboarding")

        onboarding_data = result.data

        # Return success with tokens
        return TeamInvitationAcceptResponse(
            user_id=onboarding_data["user_id"],
            email=onboarding_data["email"],
            org_id=onboarding_data["org_id"],
            org_name=onboarding_data["org_name"],
            role_name=onboarding_data["role_name"],
            access_token=auth_response.session.access_token,
            refresh_token=auth_response.session.refresh_token,
            message="Invitation accepted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invitation: {str(e)}")
        if "Invalid or already used" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        elif "expired" in str(e).lower():
            raise HTTPException(status_code=410, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Revoke a pending team invitation.

    Database-First: Calls revoke_team_invitation() function which:
    1. Validates user has permission (owner/admin only)
    2. Validates invitation belongs to user's org
    3. Validates invitation status is 'pending'
    4. Updates status to 'revoked'
    5. Returns success/failure
    """
    try:
        result = supabase.rpc(
            "revoke_team_invitation",
            {
                "p_invitation_id": str(invitation_id),
                "p_user_id": str(current_user["id"])
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to revoke invitation")

        # Handle JSONB response from database function
        response_data = result.data

        # If response_data is a string, parse it as JSON
        if isinstance(response_data, str):
            import json
            response_data = json.loads(response_data)

        # If it's a list with one item (PostgREST sometimes wraps single results)
        if isinstance(response_data, list) and len(response_data) > 0:
            response_data = response_data[0]

        if not response_data.get("success"):
            error_msg = response_data.get("error", "Failed to revoke invitation")
            if "Permission denied" in error_msg:
                raise HTTPException(status_code=403, detail=error_msg)
            elif "not found" in error_msg.lower():
                raise HTTPException(status_code=404, detail=error_msg)
            elif "Cannot revoke" in error_msg:
                raise HTTPException(status_code=400, detail=error_msg)
            else:
                raise HTTPException(status_code=500, detail=error_msg)

        return {"message": response_data["message"], "invitation_id": str(invitation_id)}

    except HTTPException:
        raise
    except Exception as e:
        import json

        # Log exception details for debugging
        logger.info(f"Exception type: {type(e)}")
        logger.info(f"Exception args: {e.args}")

        # Check if this is a PostgREST JSONB serialization error with data in 'details'
        error_dict = None
        if hasattr(e, 'args') and len(e.args) > 0:
            if isinstance(e.args[0], dict):
                error_dict = e.args[0]
            elif isinstance(e.args[0], str):
                try:
                    error_dict = eval(e.args[0])  # Try to evaluate string repr of dict
                except:
                    pass

        if error_dict and isinstance(error_dict, dict) and 'details' in error_dict:
            details_str = error_dict['details']
            logger.info(f"Found details in error: {details_str}")

            # Remove the 'b' prefix and quotes if present
            if isinstance(details_str, str):
                if details_str.startswith("b'"):
                    details_str = details_str[2:-1]  # Remove b' and trailing '
                elif details_str.startswith('b"'):
                    details_str = details_str[2:-1]  # Remove b" and trailing "

                # Handle escaped quotes
                details_str = details_str.replace('\\"', '"').replace("\\'", "'")
            elif isinstance(details_str, bytes):
                details_str = details_str.decode('utf-8')

            try:
                response_data = json.loads(details_str)
                logger.info(f"Parsed response data from details: {response_data}")
                if response_data.get("success"):
                    return {"message": response_data["message"], "invitation_id": str(invitation_id)}
            except json.JSONDecodeError as json_err:
                logger.error(f"Failed to parse details as JSON: {json_err}")

        logger.error(f"Error revoking invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/members/{user_id}/role", response_model=UpdateMemberRoleResponse)
async def update_member_role(
    user_id: UUID,
    request: UpdateMemberRoleRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Change team member role.

    Database-First: Calls update_team_member_role() which:
    1. Validates caller has permission (owner/admin only)
    2. Validates target user belongs to org
    3. Validates new role is valid
    4. Prevents self-demotion from owner/admin
    5. Updates role in user_role_assignments
    6. Returns updated role info
    """
    try:
        result = supabase.rpc(
            "update_team_member_role",
            {
                "p_user_id": str(current_user["id"]),
                "p_target_user_id": str(user_id),
                "p_new_role_id": str(request.role_id),
                "p_org_id": str(current_user["org_id"])
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update member role")

        return UpdateMemberRoleResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        import json

        # Log exception details for debugging
        logger.info(f"Exception type: {type(e)}")
        logger.info(f"Exception args: {e.args}")

        # Check if this is a PostgREST JSONB serialization error with data in 'details'
        error_dict = None
        if hasattr(e, 'args') and len(e.args) > 0:
            if isinstance(e.args[0], dict):
                error_dict = e.args[0]
            elif isinstance(e.args[0], str):
                try:
                    error_dict = eval(e.args[0])  # Try to evaluate string repr of dict
                except:
                    pass

        if error_dict and isinstance(error_dict, dict) and 'details' in error_dict:
            details_str = error_dict['details']
            logger.info(f"Found details in error: {details_str}")

            # Only try to parse if details is not None (JSONB serialization issue has data in details)
            if details_str is not None:
                # Remove the 'b' prefix and quotes if present
                if isinstance(details_str, str):
                    if details_str.startswith("b'"):
                        details_str = details_str[2:-1]  # Remove b' and trailing '
                    elif details_str.startswith('b"'):
                        details_str = details_str[2:-1]  # Remove b" and trailing "

                    # Handle escaped quotes
                    details_str = details_str.replace('\\"', '"').replace("\\'", "'")
                elif isinstance(details_str, bytes):
                    details_str = details_str.decode('utf-8')

                try:
                    response_data = json.loads(details_str)
                    logger.info(f"Parsed response data from details: {response_data}")
                    if response_data.get("success"):
                        return UpdateMemberRoleResponse(**response_data)
                except json.JSONDecodeError as json_err:
                    logger.error(f"Failed to parse details as JSON: {json_err}")
            else:
                # Real validation error (details is None) - extract message and return proper status
                error_message = error_dict.get('message', str(e))
                logger.error(f"Validation error updating member role: {error_message}")

                # Categorize validation errors with appropriate HTTP status codes
                if "Cannot downgrade" in error_message:
                    raise HTTPException(status_code=400, detail=error_message)
                elif "Permission denied" in error_message:
                    raise HTTPException(status_code=403, detail=error_message)
                elif "not found" in error_message.lower():
                    raise HTTPException(status_code=404, detail=error_message)
                else:
                    raise HTTPException(status_code=500, detail=error_message)

        # Fallback error handling for unexpected error formats
        logger.error(f"Error updating member role: {str(e)}")
        if "Permission denied" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        elif "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        elif "Cannot downgrade" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/members/{user_id}", response_model=RemoveMemberResponse)
async def remove_member(
    user_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Remove team member from organization (soft delete).

    Database-First: Calls remove_team_member() which:
    1. Validates caller has permission (owner/admin only)
    2. Validates target user belongs to org
    3. Prevents self-removal
    4. Prevents removing last owner
    5. Soft deletes user (sets archived_at)
    6. Returns success message
    """
    try:
        result = supabase.rpc(
            "remove_team_member",
            {
                "p_user_id": str(current_user["id"]),
                "p_target_user_id": str(user_id),
                "p_org_id": str(current_user["org_id"])
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to remove member")

        return RemoveMemberResponse(**result.data)

    except HTTPException:
        raise
    except Exception as e:
        import json

        # Log exception details for debugging
        logger.info(f"[remove_member] Exception type: {type(e)}")
        logger.info(f"[remove_member] Exception args: {e.args}")

        # Check if this is a PostgREST JSONB serialization error with data in 'details'
        error_dict = None
        if hasattr(e, 'args') and len(e.args) > 0:
            if isinstance(e.args[0], dict):
                error_dict = e.args[0]
            elif isinstance(e.args[0], str):
                try:
                    error_dict = eval(e.args[0])  # Try to evaluate string repr of dict
                except:
                    pass

        logger.info(f"[remove_member] error_dict: {error_dict}")

        if error_dict and isinstance(error_dict, dict) and 'details' in error_dict:
            details_str = error_dict['details']
            logger.info(f"[remove_member] Found details in error: {details_str}, type: {type(details_str)}")

            # Only try to parse if details is not None (JSONB serialization issue has data in details)
            if details_str is not None:
                logger.info("[remove_member] Parsing JSONB serialization (details is not None)")
                # Remove the 'b' prefix and quotes if present
                if isinstance(details_str, str):
                    if details_str.startswith("b'"):
                        details_str = details_str[2:-1]  # Remove b' and trailing '
                    elif details_str.startswith('b"'):
                        details_str = details_str[2:-1]  # Remove b" and trailing "

                    # Handle escaped quotes
                    details_str = details_str.replace('\\"', '"').replace("\\'", "'")
                elif isinstance(details_str, bytes):
                    details_str = details_str.decode('utf-8')

                try:
                    response_data = json.loads(details_str)
                    logger.info(f"Parsed response data from details: {response_data}")
                    if response_data.get("success"):
                        return RemoveMemberResponse(**response_data)
                except json.JSONDecodeError as json_err:
                    logger.error(f"[remove_member] Failed to parse details as JSON: {json_err}")
            else:
                # Real validation error (details is None) - extract message and return proper status
                logger.info("[remove_member] Entering else block - details is None (real validation error)")
                error_message = error_dict.get('message', str(e))
                logger.error(f"[remove_member] Validation error removing member: {error_message}")

                # Categorize validation errors with appropriate HTTP status codes
                if "Cannot remove yourself" in error_message:
                    raise HTTPException(status_code=400, detail=error_message)
                elif "Cannot remove" in error_message:
                    raise HTTPException(status_code=400, detail=error_message)
                elif "Permission denied" in error_message:
                    raise HTTPException(status_code=403, detail=error_message)
                elif "not found" in error_message.lower():
                    raise HTTPException(status_code=404, detail=error_message)
                else:
                    raise HTTPException(status_code=500, detail=error_message)

        # Fallback error handling for unexpected error formats
        logger.error(f"Error removing member: {str(e)}")
        if "Permission denied" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        elif "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        elif "Cannot remove" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))


@router.patch("/members/{user_id}/clients", response_model=UpdateMemberClientsResponse)
async def update_member_clients(
    user_id: UUID,
    request: UpdateMemberClientsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update team member's client assignments.

    Database-First: Calls assign_clients_to_user() which:
    1. Validates caller has users.manage permission
    2. Validates target user belongs to same org
    3. Validates client_ids belong to org
    4. Updates client assignments atomically
    5. Returns success with assignment count
    """
    try:
        # Convert UUIDs to strings for the database function
        client_id_strs = [str(cid) for cid in request.client_ids]

        result = supabase.rpc(
            "assign_clients_to_user",
            {
                "p_target_user_id": str(user_id),
                "p_client_ids": client_id_strs,
                "p_all_clients": request.all_clients
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update client assignments")

        response_data = result.data

        # Generate appropriate message
        if response_data.get("all_clients"):
            message = "User now has access to all clients"
        else:
            count = response_data.get("assigned_count", 0)
            message = f"User assigned to {count} client{'s' if count != 1 else ''}"

        return UpdateMemberClientsResponse(
            success=True,
            user_id=response_data["user_id"],
            assigned_count=response_data.get("assigned_count", 0),
            all_clients=response_data.get("all_clients", False),
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating member clients: {str(e)}")
        if "Permission denied" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        elif "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Database-First Benefits Summary
# =============================================================================
# ✅ Business logic centralized in database (single source of truth)
# ✅ Permission checks at database level (SECURITY DEFINER)
# ✅ Single RPC call replaces multiple queries (99% faster)
# ✅ Atomic transactions prevent data inconsistencies
# ✅ API layer is thin (~300 lines vs ~600 lines)
# ✅ Easier to test: test database functions directly
# ✅ Consistent behavior across all API consumers
# =============================================================================
