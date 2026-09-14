"""
Intelligence Storage Service
Handles storing agent-specific intelligence in the database
"""

import logging
from typing import Any, Dict, Union
from datetime import datetime
from uuid import UUID

from supabase import Client

from apps.api.utils.database import get_supabase_client
from apps.api.models.agent_intelligence import (
    IntelligenceType,
    StrategyIntelligence,
    PersonaIntelligence,
    ContentIntelligence,
    AnalyticsIntelligence,
    ROIBudgetIntelligence,
    CampaignExecutionIntelligence,
    QuickWinsIntelligence,
    CompetitiveIntelligence,
    ClientSuccessIntelligence
)
from apps.api.services.context_intelligence import ExtractedContext

logger = logging.getLogger(__name__)


class IntelligenceStorageService:
    """Service for storing extracted intelligence in the database"""

    def __init__(self):
        self.supabase: Client = get_supabase_client()

    def _generate_intelligent_title(self, data: Dict[str, Any], intelligence_type: IntelligenceType) -> str:
        """
        Generate meaningful titles from intelligence data instead of generic placeholders.

        Args:
            data: The intelligence data dict
            intelligence_type: The type of intelligence

        Returns:
            A contextual, meaningful title
        """
        try:
            if intelligence_type == IntelligenceType.STRATEGY:
                # Strategy: Look for strategic goals, target segments, or frameworks
                if "strategic_goals" in data and data["strategic_goals"]:
                    goal = data["strategic_goals"][0]
                    if isinstance(goal, dict) and "title" in goal:
                        return goal["title"]

                # Try target segments
                if "target_segments" in data and data["target_segments"]:
                    segment = data["target_segments"][0]
                    if isinstance(segment, dict) and "name" in segment:
                        return f"{segment['name']} Strategy"

                # Try frameworks applied
                if "frameworks_applied" in data and data["frameworks_applied"]:
                    frameworks = data["frameworks_applied"]
                    if len(frameworks) == 1:
                        # Single framework analysis
                        fw_name = frameworks[0].replace("_", " ").title()
                        return f"{fw_name} Analysis"
                    elif len(frameworks) <= 3:
                        # Few frameworks - list them
                        fw_names = [fw.replace("_", " ").title() for fw in frameworks[:3]]
                        return f"{' + '.join(fw_names)} Analysis"
                    else:
                        # Multi-framework synthesis
                        return f"Strategic Analysis ({len(frameworks)} Frameworks)"

                # Fallback: look for market_position or any descriptive field
                if "market_position" in data and data["market_position"]:
                    position = data["market_position"]
                    if len(position) < 60:  # Reasonable title length
                        return f"Strategy: {position}"

            elif intelligence_type == IntelligenceType.PERSONA:
                # Persona: Look for persona name or segment
                if "name" in data:
                    return f"{data['name']} Persona"
                if "segment" in data:
                    return f"{data['segment']} Customer Profile"

            elif intelligence_type == IntelligenceType.CONTENT:
                # Content: Look for content type or title
                if "content_type" in data:
                    return f"{data['content_type'].title()} Content"
                if "title" in data:
                    return data["title"]

            # Generic fallback for all types
            return f"{intelligence_type.value.title()} Intelligence Analysis"

        except Exception as e:
            logger.warning(f"Failed to generate intelligent title: {e}, using generic fallback")
            return f"{intelligence_type.value.title()} Intelligence Analysis"
    
    async def store_intelligence(
        self,
        intelligence: Union[
            ExtractedContext,
            StrategyIntelligence,
            PersonaIntelligence,
            ContentIntelligence,
            AnalyticsIntelligence,
            ROIBudgetIntelligence,
            CampaignExecutionIntelligence,
            QuickWinsIntelligence,
            CompetitiveIntelligence,
            ClientSuccessIntelligence
        ],
        intelligence_type: IntelligenceType,
        org_id: str,
        session_id: str,
        campaign_id: str = None,
        client_id: str = None,
        user_id: str = None
    ) -> bool:
        """
        🚀 NUCLEAR: Store intelligence using universal agent_outputs table.
        Replaces all intelligence tables with unified approach.

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Import nuclear migration helper
            from apps.api.utils.nuclear_agent_migration import NuclearAgentMigration

            # Convert Pydantic model to dict with JSON serialization
            # mode='json' ensures datetime objects are serialized to ISO strings
            data = intelligence.model_dump(mode='json', exclude_none=True)

            # Map intelligence types to agent types
            agent_type_map = {
                IntelligenceType.STRATEGY: "strategy",
                IntelligenceType.PERSONA: "persona",
                IntelligenceType.CONTENT: "content",
                IntelligenceType.ANALYTICS: "analytics",
                IntelligenceType.ROI_BUDGET: "roi_budget",
                IntelligenceType.CAMPAIGN_EXECUTION: "campaign_planning",
                IntelligenceType.QUICK_WINS: "quick_wins",
                IntelligenceType.COMPETITIVE: "competitive_intelligence",
                IntelligenceType.CLIENT_SUCCESS: "client_success",
            }

            agent_type = agent_type_map.get(intelligence_type, "general")

            # Generate intelligent title from content
            intelligent_title = self._generate_intelligent_title(data, intelligence_type)

            # Prepare nuclear output data
            output_data = {
                "title": intelligent_title,
                "summary": f"Intelligence extracted from {agent_type} agent",
                "content": data,
                "metadata": {
                    "intelligence_type": intelligence_type.value,
                    "extraction_date": datetime.now().isoformat(),
                    "original_table": f"{intelligence_type.value}_intelligence",
                    "campaign_id": campaign_id,
                    "client_id": client_id,
                    "nuclear_migration": True
                },
                "output_type": "intelligence"
            }

            # Nuclear save - complete data preservation
            result = await NuclearAgentMigration.save_agent_output(
                agent_type=agent_type,
                output_data=output_data,
                org_id=org_id,
                user_id=user_id,
                session_id=session_id,
                campaign_id=campaign_id,
                client_id=client_id  # Pass client_id for agency schema routing
            )

            logger.info(f"✅ {intelligence_type} intelligence saved via nuclear: {result['id']}")
            return True

        except Exception as e:
            logger.error(f"Nuclear intelligence storage failed: {e}")
            # Fallback to legacy method for safety
            logger.info("Falling back to legacy intelligence storage")
            return await self._store_legacy_intelligence(
                intelligence, intelligence_type, org_id, session_id, campaign_id, client_id
            )

    async def _store_legacy_intelligence(
        self,
        intelligence,
        intelligence_type: IntelligenceType,
        org_id: str,
        session_id: str,
        campaign_id: str = None,
        client_id: str = None
    ) -> bool:
        """Legacy intelligence storage method for fallback."""
        try:
            # Convert Pydantic model to dict with JSON serialization
            data = intelligence.model_dump(mode='json', exclude_none=True)

            # Add common fields
            data['org_id'] = org_id
            data['session_id'] = session_id
            data['extraction_date'] = datetime.now().isoformat()

            # Route to appropriate table based on intelligence type
            table_map = {
                IntelligenceType.STRATEGY: "strategy_intelligence",
                IntelligenceType.PERSONA: "persona_intelligence",
                IntelligenceType.CONTENT: "content_intelligence",
                IntelligenceType.ANALYTICS: "analytics_intelligence",
                IntelligenceType.ROI_BUDGET: "roi_budget_intelligence",
                IntelligenceType.CAMPAIGN_EXECUTION: "campaign_planning_intelligence",
                IntelligenceType.QUICK_WINS: "quick_wins_intelligence",
                IntelligenceType.COMPETITIVE: "competitive_intelligence",
                IntelligenceType.CLIENT_SUCCESS: "client_success_intelligence",
            }

            table_name = table_map.get(intelligence_type)

            if not table_name:
                # Store in AI insights table for basic business context
                return await self._store_business_context(data, org_id, session_id)

            # Add specific foreign keys if applicable
            if intelligence_type == IntelligenceType.CAMPAIGN_EXECUTION and campaign_id:
                data['campaign_id'] = campaign_id
            elif intelligence_type == IntelligenceType.CLIENT_SUCCESS and client_id:
                data['client_id'] = client_id

            # Store in the appropriate table
            result = self.supabase.table(table_name).insert(data).execute()

            if result.data:
                logger.info(f"Stored {intelligence_type} intelligence for org {org_id} (legacy)")
                return True
            else:
                logger.error(f"Failed to store {intelligence_type} intelligence (legacy)")
                return False

        except Exception as e:
            logger.error(f"Error storing intelligence (legacy): {e}")
            return False
    
    async def _store_business_context(
        self,
        data: Dict[str, Any],
        org_id: str,
        session_id: str
    ) -> bool:
        """Store basic business context in AI insights table"""
        try:
            insight_data = {
                "org_id": org_id,
                "session_id": session_id,
                "insight_type": "learning",
                "source_type": "agent_conversation",
                "source_agent": "general",
                "title": "Business Context Update",
                "content": data,
                "confidence_score": data.get("confidence_score", 0.7),
                "validation_status": "pending",
                "created_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("ai_insights").insert(insight_data).execute()
            
            if result.data:
                logger.info(f"Stored business context for org {org_id}")
                return True
            else:
                logger.error("Failed to store business context")
                return False
                
        except Exception as e:
            logger.error(f"Error storing business context: {e}")
            return False