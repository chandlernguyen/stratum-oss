"""
Multi-tenant models for organizations, clients, campaigns, and roles.
"""
from typing import Optional, List, Literal
from datetime import datetime, date
from pydantic import BaseModel, Field, validator
from uuid import UUID
from enum import Enum


# Enums
class OrganizationType(str, Enum):
    SME = "SME"
    AGENCY = "AGENCY"


class SubscriptionTier(str, Enum):
    FREE = "free"
    SOLO = "solo"
    TEAM = "team"
    AGENCY = "agency"
    # Legacy tiers — kept for backward compatibility with existing data
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class ClientStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CHURNED = "churned"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


# NOTE: This enum is DEPRECATED - Use permission-based checking instead
# Kept for backward compatibility only
class UserRole(str, Enum):
    # SME Roles
    SME_OWNER = "sme_owner"
    SME_MARKETING_DIRECTOR = "sme_marketing_director"
    SME_MARKETING_MANAGER = "sme_marketing_manager"
    SME_CONTENT_CREATOR = "sme_content_creator"
    SME_ANALYST = "sme_analyst"
    SME_VIEWER = "sme_viewer"
    
    # Agency Roles
    AGENCY_OWNER = "agency_owner"
    AGENCY_ADMIN = "agency_admin"
    ACCOUNT_DIRECTOR = "account_director"
    ACCOUNT_MANAGER = "account_manager"
    CREATIVE_DIRECTOR = "creative_director"
    STRATEGIST = "strategist"
    CLIENT_STAKEHOLDER = "client_stakeholder"
    CLIENT_COLLABORATOR = "client_collaborator"
    
    # Legacy mappings for backward compatibility
    OWNER = "sme_owner"  # Default SME owner
    ADMIN = "sme_marketing_director"
    MARKETING_MANAGER = "sme_marketing_manager"
    VIEWER = "sme_viewer"
    
    @property
    def display_name(self) -> str:
        """Get human-readable display name"""
        return self.name.replace('_', ' ').title()


# Request/Response Models
class OrganizationBase(BaseModel):
    name: str
    type: OrganizationType = OrganizationType.SME
    settings: dict = {}


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[dict] = None
    subscription_tier: Optional[SubscriptionTier] = None


class Organization(OrganizationBase):
    id: UUID
    slug: str  # Unique URL-safe identifier
    subscription_tier: SubscriptionTier
    max_users: int
    max_campaigns: int
    max_clients: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ClientBase(BaseModel):
    name: str
    status: ClientStatus = ClientStatus.ACTIVE
    brand_kit: dict = {}
    settings: dict = {}
    industry: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    monthly_budget_cents: Optional[int] = Field(None, ge=0, description="Monthly budget in cents")
    business_context: Optional[dict] = Field(default=None, description="Business context for AI agents")


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[ClientStatus] = None
    brand_kit: Optional[dict] = None
    settings: Optional[dict] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    monthly_budget_cents: Optional[int] = Field(None, ge=0, description="Monthly budget in cents")


class Client(ClientBase):
    id: UUID
    org_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]
    churned_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: Optional[UUID] = None
    status: CampaignStatus = CampaignStatus.DRAFT
    budget_cents: Optional[int] = Field(None, ge=0, description="Budget in cents (e.g., 10000 = $100.00)")
    objectives: dict = {}
    target_audience: Optional[str] = None
    metrics: dict = {}
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # New enhanced fields for better AI agent support
    campaign_type: Optional[str] = None
    marketing_channels: Optional[List[str]] = Field(default_factory=list)
    content_pillars: Optional[List[str]] = Field(default_factory=list)
    target_personas: Optional[List[str]] = Field(default_factory=list)
    success_metrics: Optional[dict] = Field(default_factory=dict)
    competitor_context: Optional[str] = None
    geographic_target: Optional[str] = None
    priority_level: Optional[str] = Field(default="medium")
    tags: Optional[List[str]] = Field(default_factory=list)
    
    @validator('budget_cents')
    def validate_budget(cls, v):
        if v is not None and v < 0:
            raise ValueError('Budget cannot be negative')
        return v


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    budget_cents: Optional[int] = Field(None, ge=0, description="Budget in cents")
    spent_cents: Optional[int] = Field(None, ge=0, description="Amount spent in cents")
    objectives: Optional[dict] = None
    target_audience: Optional[str] = None
    metrics: Optional[dict] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # New enhanced fields
    campaign_type: Optional[str] = None
    marketing_channels: Optional[List[str]] = None
    content_pillars: Optional[List[str]] = None
    target_personas: Optional[List[str]] = None
    success_metrics: Optional[dict] = None
    competitor_context: Optional[str] = None
    geographic_target: Optional[str] = None
    priority_level: Optional[str] = None
    tags: Optional[List[str]] = None


class Campaign(CampaignBase):
    id: UUID
    org_id: UUID
    spent_cents: int = Field(0, ge=0, description="Amount spent in cents")
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Computed properties for dollar amounts (for convenience)
    @property
    def budget_dollars(self) -> Optional[float]:
        return self.budget_cents / 100.0 if self.budget_cents else None
    
    @property
    def spent_dollars(self) -> float:
        return self.spent_cents / 100.0
    
    class Config:
        from_attributes = True


class UserRoleAssignment(BaseModel):
    user_id: UUID
    role: UserRole
    client_id: Optional[UUID] = None  # None = org-wide role


# New model for the comprehensive role system
class UserRoleAssignmentV2(BaseModel):
    """Role assignment in the new permission-based system"""
    user_id: UUID
    role: str  # Role name from roles table (e.g., 'sme_owner', 'agency_admin')
    client_id: Optional[UUID] = None  # None = org-wide role


class UserRoleResponse(BaseModel):
    """Response model for user role assignments in new system"""
    id: UUID
    user_id: UUID
    org_id: UUID
    role: str  # Role name as string
    client_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class WorkspaceContext(BaseModel):
    """Current user's workspace context"""
    organization: Organization
    current_client: Optional[Client] = None
    current_campaign: Optional[Campaign] = None
    user_roles: List[UserRoleResponse]  # Uses string role names now
    is_agency: bool
    can_manage_clients: bool
    can_create_campaigns: bool
    
    class Config:
        from_attributes = True


class SwitchWorkspaceRequest(BaseModel):
    client_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None


class PermissionCheck(BaseModel):
    """Result of permission check"""
    has_access: bool
    role: Optional[UserRole] = None
    reason: Optional[str] = None