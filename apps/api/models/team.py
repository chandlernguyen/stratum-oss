"""
Team Invitation Models
======================
Pydantic models for team member invitation and management API endpoints.

Related:
- Database: team_invitations table (Migration 145)
- Router: apps/api/routers/team.py
- Plan: docs/TEAM_INVITATION_SYSTEM_PLAN_2025_10_24.md
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# =============================================================================
# Request Models
# =============================================================================

class TeamInvitationCreate(BaseModel):
    """Create a new team invitation"""
    email: EmailStr = Field(..., description="Email address of the user to invite")
    role_id: UUID = Field(..., description="UUID of the role to assign (from roles table)")
    client_ids: Optional[List[UUID]] = Field(default=None, description="For account managers: client access list")

    @field_validator('email')
    @classmethod
    def email_lowercase(cls, v):
        """Ensure email is lowercase for consistency"""
        return v.lower()


class TeamInvitationAccept(BaseModel):
    """Accept a team invitation and create account"""
    invitation_token: str = Field(..., min_length=32, description="Secure invitation token from email")
    password: str = Field(..., min_length=8, description="User's chosen password")
    full_name: str = Field(..., min_length=1, max_length=255, description="User's full name")


class UpdateMemberRoleRequest(BaseModel):
    """Update an existing team member's role"""
    role_id: UUID = Field(..., description="UUID of the new role to assign")


class RemoveMemberRequest(BaseModel):
    """Optional request body for member removal (for future use)"""
    reason: Optional[str] = Field(default=None, max_length=500, description="Optional reason for removal")


class UpdateMemberClientsRequest(BaseModel):
    """Update a team member's client assignments"""
    client_ids: List[UUID] = Field(default=[], description="List of client IDs to assign (empty = all clients)")
    all_clients: bool = Field(default=False, description="If true, grants access to all clients")


# =============================================================================
# Response Models
# =============================================================================

class TeamInvitationResponse(BaseModel):
    """Response for a single team invitation"""
    id: UUID
    org_id: UUID
    email: str
    role_id: UUID
    role_name: Optional[str] = None  # Joined from roles table
    invited_by: UUID
    inviter_name: Optional[str] = None  # Joined from users table
    invitation_token: Optional[str] = None  # Only included for owner of invitation
    client_ids: Optional[List[UUID]] = None
    status: str  # 'pending', 'accepted', 'expired', 'revoked'
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    """Response for a team member (existing user)"""
    user_id: UUID
    email: str
    full_name: Optional[str] = None
    role_id: UUID
    role_name: str
    joined_at: datetime  # user.created_at
    last_active: Optional[datetime] = None
    # Client assignment fields (from migration 304)
    is_all_clients: bool = True  # Default to org-level access
    client_count: int = 0
    client_names: List[str] = []
    client_ids: List[UUID] = []

    class Config:
        from_attributes = True


class TeamListResponse(BaseModel):
    """Combined response: existing members + pending invitations"""
    members: List[TeamMemberResponse]
    pending_invitations: List[TeamInvitationResponse]
    total_members: int
    total_pending: int

    class Config:
        from_attributes = True


class TeamInvitationSendResponse(BaseModel):
    """Response after successfully sending an invitation"""
    invitation_id: UUID
    email: str
    role_name: str
    expires_at: datetime
    invitation_link: str  # Full URL for email template
    message: str = "Invitation sent successfully"

    class Config:
        from_attributes = True


class TeamInvitationAcceptResponse(BaseModel):
    """Response after successfully accepting an invitation"""
    user_id: UUID
    email: str
    org_id: UUID
    org_name: str
    role_name: str
    access_token: str
    refresh_token: str
    message: str = "Invitation accepted successfully"

    class Config:
        from_attributes = True


class UpdateMemberRoleResponse(BaseModel):
    """Response after successfully updating member role"""
    success: bool
    user_id: UUID
    email: str
    new_role_name: str
    previous_role_name: str
    message: str

    class Config:
        from_attributes = True


class RemoveMemberResponse(BaseModel):
    """Response after successfully removing a member"""
    success: bool
    user_id: UUID
    email: str
    full_name: str
    role_name: str
    message: str

    class Config:
        from_attributes = True


class UpdateMemberClientsResponse(BaseModel):
    """Response after successfully updating client assignments"""
    success: bool
    user_id: UUID
    assigned_count: int
    all_clients: bool
    message: str

    class Config:
        from_attributes = True


# =============================================================================
# Database Helper Models (Internal Use)
# =============================================================================

class RoleInfo(BaseModel):
    """Role information for display"""
    id: UUID
    name: str
    display_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
