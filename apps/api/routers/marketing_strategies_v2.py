"""
Marketing Strategies Router v2 - Using BaseRouter for standardized CRUD operations
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
from apps.api.services.universal_output_service import get_universal_output_service
import logging

logger = logging.getLogger(__name__)


# Pydantic Models for Marketing Strategies
class TargetAudience(BaseModel):
    """Target audience definition"""
    primary_segments: List[str] = Field(default=[], description="Primary market segments")
    demographics: Optional[Dict[str, Any]] = Field(default={}, description="Demographic details")
    psychographics: Optional[Dict[str, Any]] = Field(default={}, description="Psychographic characteristics")
    behavioral_patterns: Optional[Dict[str, Any]] = Field(default={}, description="Behavioral patterns")


class MessagingFramework(BaseModel):
    """Messaging and positioning framework"""
    value_propositions: List[str] = Field(default=[], description="Core value propositions")
    key_messages: Dict[str, List[str]] = Field(default={}, description="Key messages by audience/stage")
    tone_of_voice: Optional[Dict[str, Any]] = Field(default={}, description="Brand voice guidelines")
    differentiation_points: List[str] = Field(default=[], description="Competitive differentiation")


class ChannelStrategy(BaseModel):
    """Multi-channel marketing strategy"""
    owned_channels: List[Dict[str, Any]] = Field(default=[], description="Owned media channels")
    earned_channels: List[Dict[str, Any]] = Field(default=[], description="Earned media channels")
    paid_channels: List[Dict[str, Any]] = Field(default=[], description="Paid media channels")
    channel_mix_rationale: Optional[str] = Field(None, description="70-20-10 rule application")


class ContentStrategy(BaseModel):
    """Content marketing strategy"""
    content_pillars: List[str] = Field(default=[], description="Core content themes")
    content_formats: List[str] = Field(default=[], description="Preferred content formats")
    content_calendar: Optional[Dict[str, Any]] = Field(default={}, description="Publishing schedule")
    distribution_plan: Optional[Dict[str, Any]] = Field(default={}, description="Content distribution")


class MarketingMetrics(BaseModel):
    """KPIs and success metrics"""
    primary_kpis: List[Dict[str, Any]] = Field(default=[], description="Primary KPIs")
    secondary_metrics: List[Dict[str, Any]] = Field(default=[], description="Secondary metrics")
    success_criteria: Optional[Dict[str, Any]] = Field(default={}, description="Success definitions")
    measurement_approach: Optional[str] = Field(None, description="Analytics approach")


class MarketingStrategy(BaseModel):
    """Complete marketing strategy model"""
    id: Optional[UUID] = None
    org_id: UUID
    campaign_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    strategy_type: Optional[str] = Field(None, description="Type: growth, retention, awareness, etc.")
    target_audience: Optional[TargetAudience] = Field(default_factory=TargetAudience)
    messaging_framework: Optional[MessagingFramework] = Field(default_factory=MessagingFramework)
    channel_strategy: Optional[ChannelStrategy] = Field(default_factory=ChannelStrategy)
    content_strategy: Optional[ContentStrategy] = Field(default_factory=ContentStrategy)
    metrics: Optional[MarketingMetrics] = Field(default_factory=MarketingMetrics)
    budget_allocation: Optional[Dict[str, Any]] = Field(default={}, description="Budget by channel/activity")
    timeline: Optional[Dict[str, Any]] = Field(default={}, description="Implementation timeline")
    zero_budget_tactics: List[str] = Field(default=[], description="No-cost marketing tactics")
    quick_wins: List[str] = Field(default=[], description="Immediate impact opportunities")
    risks_and_mitigation: Optional[Dict[str, Any]] = Field(default={}, description="Risk assessment")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    archived_by: Optional[UUID] = None
    archive_reason: Optional[str] = None


class MarketingStrategyCreate(BaseModel):
    """Model for creating a marketing strategy"""
    campaign_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    strategy_type: Optional[str] = None
    target_audience: Optional[TargetAudience] = None
    messaging_framework: Optional[MessagingFramework] = None
    channel_strategy: Optional[ChannelStrategy] = None
    content_strategy: Optional[ContentStrategy] = None
    metrics: Optional[MarketingMetrics] = None
    budget_allocation: Optional[Dict[str, Any]] = None
    timeline: Optional[Dict[str, Any]] = None
    zero_budget_tactics: Optional[List[str]] = None
    quick_wins: Optional[List[str]] = None
    risks_and_mitigation: Optional[Dict[str, Any]] = None


class MarketingStrategyUpdate(BaseModel):
    """Model for updating a marketing strategy"""
    name: Optional[str] = None
    description: Optional[str] = None
    strategy_type: Optional[str] = None
    target_audience: Optional[TargetAudience] = None
    messaging_framework: Optional[MessagingFramework] = None
    channel_strategy: Optional[ChannelStrategy] = None
    content_strategy: Optional[ContentStrategy] = None
    metrics: Optional[MarketingMetrics] = None
    budget_allocation: Optional[Dict[str, Any]] = None
    timeline: Optional[Dict[str, Any]] = None
    zero_budget_tactics: Optional[List[str]] = None
    quick_wins: Optional[List[str]] = None
    risks_and_mitigation: Optional[Dict[str, Any]] = None


class MarketingStrategiesRouter(BaseRouter):
    """
    Marketing Strategies router with standard CRUD operations plus custom endpoints.
    Already uses archived_at pattern, so no migration needed.
    """

    def __init__(self):
        super().__init__(
            table_name="marketing_strategies",
            resource_name="marketing strategy",
            resource_name_plural="marketing-strategies",
            response_model=MarketingStrategy,
            create_model=MarketingStrategyCreate,
            update_model=MarketingStrategyUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching them
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add marketing strategy-specific custom endpoints."""

        @self.router.get("/campaign/{campaign_id}", response_model=StandardResponse)
        async def get_campaign_strategies(
            campaign_id: UUID,
            include_archived: bool = Query(False, description="Include archived strategies"),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get all marketing strategies for a specific campaign."""
            try:
                query = db.table("marketing_strategies")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .eq("campaign_id", str(campaign_id))

                if not include_archived:
                    query = query.is_("archived_at", "null")

                result = query.order("created_at", desc=True).execute()

                return StandardResponse(
                    success=True,
                    data=result.data,
                    message=f"Retrieved {len(result.data)} strategies for campaign"
                )

            except Exception as e:
                logger.error(f"Error getting campaign strategies: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve campaign strategies"
                )

        @self.router.get("/active", response_model=StandardResponse)
        async def get_active_strategies(
            campaign_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get active marketing strategies for organization or campaign."""
            try:
                query = db.table("marketing_strategies")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")

                if campaign_id:
                    query = query.eq("campaign_id", str(campaign_id))

                result = query.order("created_at", desc=True).execute()

                return StandardResponse(
                    success=True,
                    data=result.data,
                    message=f"Retrieved {len(result.data)} active strategies"
                )

            except Exception as e:
                logger.error(f"Error getting active strategies: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve active strategies"
                )

        @self.router.get("/zero-budget", response_model=StandardResponse)
        async def get_zero_budget_strategies(
            campaign_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get marketing strategies with zero-budget tactics."""
            try:
                query = db.table("marketing_strategies")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")\
                    .neq("zero_budget_tactics", "[]")

                if campaign_id:
                    query = query.eq("campaign_id", str(campaign_id))

                result = query.order("created_at", desc=True).execute()

                # Filter to only include strategies with actual zero-budget tactics
                strategies_with_tactics = [
                    s for s in result.data
                    if s.get("zero_budget_tactics") and len(s.get("zero_budget_tactics", [])) > 0
                ]

                return StandardResponse(
                    success=True,
                    data=strategies_with_tactics,
                    message=f"Retrieved {len(strategies_with_tactics)} strategies with zero-budget tactics"
                )

            except Exception as e:
                logger.error(f"Error getting zero-budget strategies: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve zero-budget strategies"
                )

        @self.router.post("/{strategy_id}/generate-outputs", response_model=StandardResponse)
        async def generate_strategy_outputs(
            strategy_id: UUID,
            output_types: List[str] = Query(..., description="Types of outputs to generate"),
            client_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Generate marketing outputs based on a strategy (content calendar, campaign briefs, etc.)."""
            try:
                # Verify ownership and get strategy
                result = db.table("marketing_strategies")\
                    .select("*")\
                    .eq("id", str(strategy_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Marketing strategy not found"
                    )

                strategy = result.data[0]

                # Generate outputs based on types requested
                outputs = {}
                for output_type in output_types:
                    if output_type == "content_calendar":
                        outputs["content_calendar"] = self._generate_content_calendar(strategy)
                    elif output_type == "campaign_brief":
                        outputs["campaign_brief"] = self._generate_campaign_brief(strategy)
                    elif output_type == "channel_plan":
                        outputs["channel_plan"] = self._generate_channel_plan(strategy)
                    elif output_type == "messaging_guide":
                        outputs["messaging_guide"] = self._generate_messaging_guide(strategy)

                # 🚀 NUCLEAR: Store outputs in agent_outputs table using UniversalOutputService
                universal_service = get_universal_output_service()

                output_result = await universal_service.save_agent_output(
                    org_id=current_user["org_id"],
                    user_id=current_user["id"],
                    agent_type="marketing_strategy",
                    output_type="generated_outputs",
                    title=f"Generated Outputs for {strategy.get('name', 'Strategy')}",
                    summary=f"Generated {len(outputs)} marketing outputs: {', '.join(outputs.keys())}",
                    content=outputs,
                    client_id=str(client_id) if client_id else None,
                    metadata={
                        "strategy_id": str(strategy_id),
                        "campaign_id": strategy.get("campaign_id"),
                        "output_types": list(outputs.keys())
                    }
                )

                return StandardResponse(
                    success=True,
                    data=outputs,
                    message=f"Generated {len(outputs)} outputs for strategy"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error generating outputs: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate strategy outputs"
                )

        @self.router.post("/{strategy_id}/duplicate", response_model=StandardResponse)
        async def duplicate_strategy_custom(
            strategy_id: UUID,
            name: str = Query(..., description="Name for the duplicate"),
            campaign_id: Optional[UUID] = Query(None, description="Campaign to assign duplicate to"),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Duplicate a marketing strategy with a new name and optional campaign assignment."""
            try:
                # Get original strategy
                original = db.table("marketing_strategies")\
                    .select("*")\
                    .eq("id", str(strategy_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not original.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Marketing strategy not found"
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
                    "created_by": current_user["id"],
                    "updated_by": current_user["id"],
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                })

                # Insert duplicate
                result = db.table("marketing_strategies").insert(duplicate_data).execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to duplicate marketing strategy"
                    )

                return StandardResponse(
                    success=True,
                    data=result.data[0],
                    message="Marketing strategy duplicated successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error duplicating strategy: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to duplicate marketing strategy"
                )

    def _generate_content_calendar(self, strategy: Dict) -> Dict:
        """Generate a content calendar based on strategy."""
        # Placeholder implementation - would integrate with AI agent
        return {
            "weeks": [],
            "content_themes": strategy.get("content_strategy", {}).get("content_pillars", []),
            "publishing_schedule": strategy.get("content_strategy", {}).get("content_calendar", {})
        }

    def _generate_campaign_brief(self, strategy: Dict) -> Dict:
        """Generate a campaign brief based on strategy."""
        return {
            "campaign_name": strategy.get("name"),
            "objectives": strategy.get("metrics", {}).get("primary_kpis", []),
            "target_audience": strategy.get("target_audience", {}),
            "key_messages": strategy.get("messaging_framework", {}).get("key_messages", {}),
            "channels": strategy.get("channel_strategy", {}),
            "timeline": strategy.get("timeline", {}),
            "budget": strategy.get("budget_allocation", {})
        }

    def _generate_channel_plan(self, strategy: Dict) -> Dict:
        """Generate a detailed channel plan."""
        return {
            "owned_channels": strategy.get("channel_strategy", {}).get("owned_channels", []),
            "earned_channels": strategy.get("channel_strategy", {}).get("earned_channels", []),
            "paid_channels": strategy.get("channel_strategy", {}).get("paid_channels", []),
            "channel_mix": strategy.get("channel_strategy", {}).get("channel_mix_rationale", "")
        }

    def _generate_messaging_guide(self, strategy: Dict) -> Dict:
        """Generate a messaging guide."""
        return {
            "value_propositions": strategy.get("messaging_framework", {}).get("value_propositions", []),
            "key_messages": strategy.get("messaging_framework", {}).get("key_messages", {}),
            "tone_of_voice": strategy.get("messaging_framework", {}).get("tone_of_voice", {}),
            "differentiation": strategy.get("messaging_framework", {}).get("differentiation_points", [])
        }


# Create router instance
marketing_strategies_router = MarketingStrategiesRouter()