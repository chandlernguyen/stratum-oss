"""
Brand Guidelines Router v2 - Using BaseRouter for standardized CRUD operations
"""
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import Depends, HTTPException, status, Query
from uuid import UUID
from pydantic import BaseModel, Field

from apps.api.routers.base import BaseRouter
from apps.api.auth.supabase_auth import get_current_user, get_current_user_with_org
from apps.api.utils.auth_database import get_service_role_client
from apps.api.models.standard_responses import StandardResponse
import logging

logger = logging.getLogger(__name__)


# Structured Brand Guidelines Models
class ToneOfVoice(BaseModel):
    """Brand tone of voice configuration"""
    primary: Optional[str] = Field(None, description="Primary tone description (e.g., 'Professional yet approachable')")
    characteristics: Optional[list[str]] = Field(default_factory=list, description="Tone characteristics (e.g., ['Confident', 'Empathetic'])")
    avoid: Optional[list[str]] = Field(default_factory=list, description="Tones to avoid (e.g., ['Overly casual', 'Jargon-heavy'])")


class PersonalityTraits(BaseModel):
    """Brand personality definition"""
    archetype: Optional[str] = Field(None, description="Brand archetype (e.g., 'The Expert', 'The Friend')")
    attributes: Optional[list[str]] = Field(default_factory=list, description="Personality attributes (e.g., ['Knowledgeable', 'Trustworthy'])")
    examples: Optional[str] = Field(None, description="Examples of how personality shows up in content")


class WritingStyle(BaseModel):
    """Writing style guidelines"""
    sentence_length: Optional[str] = Field(None, description="Preferred sentence length (e.g., 'Mix of short and medium sentences')")
    vocabulary: Optional[str] = Field(None, description="Vocabulary style (e.g., 'Professional but accessible')")
    perspective: Optional[str] = Field(None, description="Writing perspective (e.g., 'Second person (you/your)')")
    formatting: Optional[list[str]] = Field(default_factory=list, description="Preferred formatting (e.g., ['Bullet points', 'Subheadings'])")


class BrandVoice(BaseModel):
    """Complete brand voice configuration"""
    tone_of_voice: Optional[ToneOfVoice] = Field(default_factory=ToneOfVoice)
    personality_traits: Optional[PersonalityTraits] = Field(default_factory=PersonalityTraits)
    writing_style: Optional[WritingStyle] = Field(default_factory=WritingStyle)


class KeyMessages(BaseModel):
    """Key messaging framework"""
    primary: Optional[str] = Field(None, description="Main value proposition")
    supporting: Optional[list[str]] = Field(default_factory=list, description="3-5 supporting messages")
    differentiation: Optional[str] = Field(None, description="What makes you unique")


class ValuePropositions(BaseModel):
    """Value proposition framework"""
    functional: Optional[str] = Field(None, description="What you do (functional benefit)")
    emotional: Optional[str] = Field(None, description="How you make customers feel")
    social: Optional[str] = Field(None, description="Social proof/status benefit")


class ContentRules(BaseModel):
    """Content creation rules and guidelines"""
    always_do: Optional[list[str]] = Field(default_factory=list, description="Content do's")
    never_do: Optional[list[str]] = Field(default_factory=list, description="Content don'ts")
    required_elements: Optional[list[str]] = Field(default_factory=list, description="Must-include elements")
    prohibited_words: Optional[list[str]] = Field(default_factory=list, description="Banned words/phrases")


class Messaging(BaseModel):
    """Complete messaging framework"""
    key_messages: Optional[KeyMessages] = Field(default_factory=KeyMessages)
    value_propositions: Optional[ValuePropositions] = Field(default_factory=ValuePropositions)
    content_rules: Optional[ContentRules] = Field(default_factory=ContentRules)


class BrandStrategy(BaseModel):
    """Brand strategy context (optional)"""
    mission: Optional[str] = Field(None, description="Mission statement")
    vision: Optional[str] = Field(None, description="Vision statement")
    values: Optional[list[str]] = Field(default_factory=list, description="Core values")
    target_audience: Optional[str] = Field(None, description="Primary target audience description")


class VisualIdentity(BaseModel):
    """Visual identity reference (minimal)"""
    color_palette: Optional[list[str]] = Field(default_factory=list, description="Hex color codes")
    typography: Optional[list[str]] = Field(default_factory=list, description="Font families")
    logo_guidelines: Optional[str] = Field(None, description="Brief logo usage guidelines")


class StructuredGuidelines(BaseModel):
    """Complete structured brand guidelines"""
    brand_voice: Optional[BrandVoice] = Field(default_factory=BrandVoice, description="Brand voice & messaging guidelines (PRIMARY for Content Agent)")
    messaging: Optional[Messaging] = Field(default_factory=Messaging, description="Messaging framework and content rules")
    brand_strategy: Optional[BrandStrategy] = Field(default_factory=BrandStrategy, description="Brand strategy context (SECONDARY)")
    visual_identity: Optional[VisualIdentity] = Field(default_factory=VisualIdentity, description="Visual identity reference (MINIMAL)")


class BrandGuideline(BaseModel):
    """Complete brand guideline model with structured guidelines"""
    id: Optional[UUID] = None
    org_id: UUID
    campaign_id: Optional[UUID] = None
    name: str
    description: Optional[str] = ""
    guidelines: StructuredGuidelines = Field(default_factory=StructuredGuidelines, description="Structured brand guidelines for AI agents")
    is_default: bool = False
    version: int = 1
    parent_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[UUID] = None
    archive_reason: Optional[str] = None


class BrandGuidelineCreate(BaseModel):
    """Model for creating brand guidelines"""
    campaign_id: Optional[UUID] = None
    name: str = "Brand Guidelines"
    description: Optional[str] = ""
    guidelines: StructuredGuidelines = Field(default_factory=StructuredGuidelines, description="Structured brand guidelines for AI agents")
    is_default: Optional[bool] = False


class BrandGuidelineUpdate(BaseModel):
    """Model for updating brand guidelines"""
    name: Optional[str] = None
    description: Optional[str] = None
    guidelines: Optional[StructuredGuidelines] = None
    is_default: Optional[bool] = None


class BrandGuidelinesRouter(BaseRouter):
    """
    Brand Guidelines router with standard CRUD operations plus custom endpoints.
    Already uses archived_at pattern, so no migration needed.
    """

    def __init__(self):
        super().__init__(
            table_name="brand_guidelines",
            resource_name="brand guideline",
            resource_name_plural="brand-guidelines",
            response_model=BrandGuideline,
            create_model=BrandGuidelineCreate,
            update_model=BrandGuidelineUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching them
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add brand guidelines-specific custom endpoints."""

        @self.router.get("/active", response_model=StandardResponse)
        async def get_active_guidelines(
            campaign_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db = Depends(get_service_role_client)
        ):
            """Get active brand guidelines for organization or campaign."""
            try:
                query = db.table("brand_guidelines")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")

                if campaign_id:
                    # Get campaign-specific guidelines
                    query = query.eq("campaign_id", str(campaign_id))
                else:
                    # Get organization-wide guidelines
                    query = query.is_("campaign_id", "null")

                result = query.execute()

                return StandardResponse(
                    success=True,
                    data=result.data[0] if result.data else None,
                    message="Active brand guidelines retrieved"
                )

            except Exception as e:
                logger.error(f"Error getting active guidelines: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve active brand guidelines"
                )

        @self.router.patch("/{guidelines_id}/set-default", response_model=StandardResponse)
        async def set_default_guidelines(
            guidelines_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db = Depends(get_service_role_client)
        ):
            """Set brand guidelines as default/active for its scope."""
            try:
                # Verify ownership
                result = db.table("brand_guidelines")\
                    .select("*")\
                    .eq("id", str(guidelines_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Brand guidelines not found"
                    )

                guideline = result.data[0]

                # Archive other guidelines in same scope
                archive_data = {
                    "archived_at": datetime.utcnow().isoformat(),
                    "archived_by": current_user["id"],
                    "archive_reason": "Replaced by new default guideline",
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": current_user["id"]
                }

                if guideline.get("campaign_id"):
                    # Campaign-specific: archive others for same campaign
                    db.table("brand_guidelines")\
                        .update(archive_data)\
                        .eq("org_id", current_user["org_id"])\
                        .eq("campaign_id", guideline["campaign_id"])\
                        .neq("id", str(guidelines_id))\
                        .is_("archived_at", "null")\
                        .execute()
                else:
                    # Organization-wide: archive other org-wide guidelines
                    db.table("brand_guidelines")\
                        .update(archive_data)\
                        .eq("org_id", current_user["org_id"])\
                        .is_("campaign_id", "null")\
                        .neq("id", str(guidelines_id))\
                        .is_("archived_at", "null")\
                        .execute()

                # Restore this guideline if archived (make it active)
                update_result = db.table("brand_guidelines")\
                    .update({
                        "archived_at": None,
                        "archived_by": None,
                        "archive_reason": None,
                        "updated_at": datetime.utcnow().isoformat(),
                        "updated_by": current_user["id"]
                    })\
                    .eq("id", str(guidelines_id))\
                    .execute()

                if not update_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to set default brand guidelines"
                    )

                return StandardResponse(
                    success=True,
                    data=update_result.data[0],
                    message="Brand guidelines set as default"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error setting default guidelines: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to set default brand guidelines"
                )

        @self.router.post("/{guidelines_id}/duplicate", response_model=StandardResponse)
        async def duplicate_guidelines_custom(
            guidelines_id: UUID,
            name: str = Query(..., description="Name for the duplicate"),
            campaign_id: Optional[UUID] = Query(None, description="Campaign to assign duplicate to"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db = Depends(get_service_role_client)
        ):
            """
            Duplicate brand guidelines with a new name and optional campaign assignment.
            This overrides the base duplicate to handle campaign assignment.
            """
            try:
                # Get original guideline
                original = db.table("brand_guidelines")\
                    .select("*")\
                    .eq("id", str(guidelines_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not original.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Brand guidelines not found"
                    )

                # Prepare duplicate data
                duplicate_data = original.data[0].copy()

                # Remove unique fields
                fields_to_remove = ["id", "created_at", "created_by", "updated_at", "updated_by",
                                  "archived_at", "archived_by", "archive_reason"]
                for field in fields_to_remove:
                    duplicate_data.pop(field, None)

                # Update with new values
                duplicate_data.update({
                    "name": name,
                    "campaign_id": str(campaign_id) if campaign_id else None,
                    "version": 1,
                    "created_by": current_user["id"],
                    "updated_by": current_user["id"],
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                })

                # Insert duplicate
                result = db.table("brand_guidelines").insert(duplicate_data).execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to duplicate brand guidelines"
                    )

                return StandardResponse(
                    success=True,
                    data=result.data[0],
                    message="Brand guidelines duplicated successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error duplicating guidelines: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to duplicate brand guidelines"
                )


# Create router instance
brand_guidelines_router = BrandGuidelinesRouter()