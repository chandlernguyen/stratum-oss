"""
Progressive Learning Service for Business Context

Automatically extracts business context from agent conversations with intelligent
filtering to avoid duplicate or low-value extractions.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from supabase import Client
import os
import json
from pydantic import BaseModel, Field

from apps.api.services.context_intelligence import ContextIntelligenceService
from apps.api.services.enhanced_context_intelligence import EnhancedContextIntelligenceService
from apps.api.services.intelligence_storage import IntelligenceStorageService
from apps.api.services.business_profile_extraction import BusinessProfileExtractionService
from apps.api.services.business_metrics_extraction import BusinessMetricsExtractionService
from apps.api.models.agent_intelligence import AGENT_INTELLIGENCE_MAP, IntelligenceType
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)

class ProgressiveLearningService:
    """
    Service that learns business context progressively from agent interactions.
    
    Key Features:
    1. Automatic context extraction after significant conversations
    2. Intelligent filtering to avoid duplicate extractions
    3. Confidence-based thresholds for extraction triggers
    4. Rate limiting to prevent excessive API calls
    """
    
    def __init__(self):
        self.supabase: Client = get_supabase_client()
        self.context_intelligence = ContextIntelligenceService()
        self.enhanced_intelligence = EnhancedContextIntelligenceService()  # Enhanced agent-specific extraction
        self.intelligence_storage = IntelligenceStorageService()  # Storage service for agent intelligence
        self.business_profile_service = BusinessProfileExtractionService()  # Business profile extraction
        self.business_metrics_service = BusinessMetricsExtractionService()  # Business metrics extraction (NEW)
        self.min_conversation_length = int(os.getenv("MIN_CONVERSATION_LENGTH", "300"))  # chars
        self.min_confidence_threshold = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.7"))
        self.rate_limit_minutes = int(os.getenv("CONTEXT_EXTRACTION_RATE_LIMIT", "10"))  # minutes between extractions
        
    async def process_conversation_update(
        self,
        session_id: str,
        agent_type: str,
        user_message: str,
        assistant_response: str,
        user_id: str,
        organization_id: str,
        client_id: str = None,  # Required for AGENCY organizations
        campaign_id: str = None
    ):
        """
        Process a conversation update and determine if context extraction should occur.

        Args:
            session_id: Agent session ID
            agent_type: Type of agent (strategy, persona, etc.)
            user_message: Latest user message
            assistant_response: Latest assistant response
            user_id: User who sent the message
            organization_id: Organization ID for context storage
            client_id: Client ID for agency organizations (required for schema routing)
            campaign_id: Campaign ID if conversation is campaign-specific
        """
        try:
            # Check if we should extract context from this conversation
            should_extract = await self._should_extract_context(
                session_id, agent_type, user_message, assistant_response, organization_id, client_id
            )

            if not should_extract:
                logger.info(f"⚠️ Skipping context extraction for session {session_id} - should_extract=False")
                return

            # Get full conversation for context
            conversation_text = await self._get_conversation_context(session_id)

            if len(conversation_text) < self.min_conversation_length:
                logger.info(f"⚠️ Conversation too short for extraction: {len(conversation_text)} chars (min: {self.min_conversation_length})")
                return

            # TRIPLE EXTRACTION IN PARALLEL (database-first for all three)
            logger.info(f"Triggering triple extraction (agent intelligence + business profile + business metrics) for {agent_type} agent, session {session_id}")

            try:
                agent_intelligence, business_profile, business_metrics = await asyncio.gather(
                    # Existing agent-specific extraction
                    self.enhanced_intelligence.extract_intelligence(
                        conversation_text, agent_type, organization_id
                    ),
                    # Business profile extraction
                    self.business_profile_service.extract_business_profile(
                        conversation_text, organization_id
                    ),
                    # NEW: Business metrics extraction
                    self.business_metrics_service.extract_business_metrics(
                        conversation_text, organization_id
                    ),
                    return_exceptions=True
                )
            except Exception as e:
                logger.error(f"Triple extraction failed for session {session_id}: {e}", exc_info=True)
                return

            # Process agent intelligence (existing logic)
            if agent_intelligence and not isinstance(agent_intelligence, Exception):
                extraction_result = agent_intelligence

                if not extraction_result:
                    logger.warning(f"No agent intelligence extracted for session {session_id}")
                elif extraction_result.confidence_score < self.min_confidence_threshold:
                    logger.warning(f"Agent intelligence confidence too low for session {session_id}: {extraction_result.confidence_score} < {self.min_confidence_threshold}")
                    extraction_result = None  # Skip saving
            else:
                if isinstance(agent_intelligence, Exception):
                    logger.error(f"Agent intelligence extraction failed: {agent_intelligence}")
                extraction_result = None

            # Save agent intelligence if valid
            if extraction_result and extraction_result.confidence_score >= self.min_confidence_threshold:
                # Determine intelligence type from agent type
                intelligence_type = AGENT_INTELLIGENCE_MAP.get(agent_type)

                if intelligence_type:
                    # Store using the specialized intelligence storage service
                    success = await self.intelligence_storage.store_intelligence(
                        intelligence=extraction_result,
                        intelligence_type=intelligence_type,
                        org_id=organization_id,
                        session_id=session_id,
                        campaign_id=campaign_id,
                        client_id=client_id,  # Pass client_id for agency schema routing
                        user_id=user_id
                    )

                    if success:
                        logger.info(f"Successfully stored {intelligence_type} intelligence for session {session_id}")
                    else:
                        logger.error(f"Failed to store {intelligence_type} intelligence for session {session_id}")
                else:
                    # Fall back to basic business context storage for unmapped agents
                    extracted_dict = extraction_result.model_dump(exclude_none=True)
                    confidence = extracted_dict.pop('confidence_score', 0.0)

                    await self._store_extracted_context(
                        session_id=session_id,
                        agent_type=agent_type,
                        extracted_context=extracted_dict,
                        confidence_score=confidence,
                        user_id=user_id,
                        organization_id=organization_id
                    )

                logger.info(f"Successfully stored agent intelligence for session {session_id}")

            # Save business profile (NEW - database-first with agency routing)
            if business_profile and not isinstance(business_profile, Exception):
                if business_profile.confidence_score >= self.min_confidence_threshold:
                    try:
                        result = await self.business_profile_service.save_to_core_business_data(
                            profile_data=business_profile,
                            org_id=organization_id,
                            agent_type=agent_type,
                            user_id=user_id,
                            client_id=client_id  # Pass client_id for agency schema routing
                        )
                        logger.info(
                            f"Business profile updated for session {session_id}: "
                            f"{result.get('updated_fields', 0)} fields updated, "
                            f"{result.get('skipped_fields', 0)} skipped (lower confidence)"
                        )
                    except Exception as e:
                        logger.error(f"Failed to save business profile for session {session_id}: {e}", exc_info=True)
                else:
                    logger.debug(
                        f"Business profile confidence too low for session {session_id}: "
                        f"{business_profile.confidence_score} < {self.min_confidence_threshold}"
                    )
            elif isinstance(business_profile, Exception):
                logger.error(f"Business profile extraction failed for session {session_id}: {business_profile}")

            # Save business metrics (NEW - database-first with agency routing)
            if business_metrics and not isinstance(business_metrics, Exception):
                if business_metrics.confidence_score >= self.min_confidence_threshold:
                    try:
                        result = await self.business_metrics_service.save_to_core_business_data(
                            metrics_data=business_metrics,
                            org_id=organization_id,
                            agent_type=agent_type,
                            user_id=user_id,
                            client_id=client_id  # Pass client_id for agency schema routing
                        )
                        logger.info(
                            f"Business metrics updated for session {session_id}: "
                            f"{result.get('updated_metrics', 0)} metrics updated, "
                            f"{result.get('skipped_metrics', 0)} skipped (lower confidence)"
                        )
                    except Exception as e:
                        logger.error(f"Failed to save business metrics for session {session_id}: {e}", exc_info=True)
                else:
                    logger.debug(
                        f"Business metrics confidence too low for session {session_id}: "
                        f"{business_metrics.confidence_score} < {self.min_confidence_threshold}"
                    )
            elif isinstance(business_metrics, Exception):
                logger.error(f"Business metrics extraction failed for session {session_id}: {business_metrics}")

        except Exception as e:
            logger.error(f"Progressive learning failed for session {session_id}: {str(e)}")
    
    async def _should_extract_context(
        self,
        session_id: str,
        agent_type: str,
        user_message: str,
        assistant_response: str,
        organization_id: str,
        client_id: str = None
    ) -> bool:
        """
        Use LLM to intelligently determine if context extraction should be triggered.
        """
        try:
            # Check rate limiting - don't extract too frequently
            recent_extractions = self.supabase.table("ai_insights").select("created_at").eq(
                "session_id", session_id
            ).gte(
                "created_at", (datetime.now() - timedelta(minutes=self.rate_limit_minutes)).isoformat()
            ).execute()
            
            if recent_extractions.data:
                logger.debug(f"Rate limited: Recent extraction found for session {session_id}")
                return False
            
            # Use LLM to determine if the conversation contains valuable business context
            analysis_result = await self.context_intelligence.analyze_conversation_relevance(
                user_message=user_message,
                assistant_response=assistant_response,
                organization_id=organization_id,
                client_id=client_id  # Pass for multi-tenant schema routing
            )
            
            if analysis_result.get("should_extract", False):
                logger.info(f"LLM determined extraction needed: {analysis_result.get('reason', 'No reason provided')}")
                return True
            else:
                logger.debug(f"LLM determined no extraction needed: {analysis_result.get('reason', 'No reason provided')}")
                return False
            
        except Exception as e:
            logger.error(f"Error checking extraction criteria: {str(e)}")
            return False
    
    async def _get_conversation_context(self, session_id: str) -> str:
        """
        Get the full conversation context for the session.
        """
        try:
            # Use routed function for schema-aware message lookup
            # get_conversation_history_routed returns messages in chronological order already
            messages_result = self.supabase.rpc('get_conversation_history_routed', {
                'p_session_id': session_id,
                'p_limit': 10
            }).execute()

            if not messages_result.data or len(messages_result.data) == 0:
                return ""

            # Messages are already in chronological order from the RPC function
            messages_data = messages_result.data
            
            conversation_parts = []
            total_length = 0
            max_length = 50000
            
            for msg in messages_data:
                content = msg.get("content", "")
                role = msg.get("role", "")
                
                if not content:
                    continue
                    
                part = f"{role}: {content}"
                if total_length + len(part) > max_length:
                    break
                    
                conversation_parts.append(part)
                total_length += len(part)
            
            return "\n".join(conversation_parts)
            
        except Exception as e:
            logger.error(f"Error getting conversation context for session {session_id}: {str(e)}")
            return ""
    
    async def _store_extracted_context(
        self,
        session_id: str,
        agent_type: str, 
        extracted_context: Dict[str, Any],
        confidence_score: float,
        user_id: str,
        organization_id: str
    ):
        """
        Store extracted context in the agent_context_history table for user approval.
        """
        try:
            # Check for duplicate context (same session and similar extracted data)
            existing_extractions = self.supabase.table("ai_insights").select(
                "content"
            ).eq("session_id", session_id).eq("validation_status", "pending").execute()
            
            # Simple duplicate detection - check if extracted context is very similar
            for existing in existing_extractions.data:
                existing_context = existing.get("content", {})
                similarity = self._calculate_context_similarity(extracted_context, existing_context)
                if similarity > 0.8:  # 80% similar
                    logger.debug(f"Skipping duplicate context extraction for session {session_id}")
                    return
            
            # Store the extracted context as an insight
            self.supabase.table("ai_insights").insert({
                "org_id": organization_id,
                "user_id": user_id,
                "insight_type": "learning",  # Changed from "business_context" to match constraint
                "source_type": "agent_conversation",  # Changed from "conversation" to match constraint
                "source_agent": agent_type,
                "session_id": session_id,
                "title": f"Business Context from {agent_type.replace('_', ' ').title()}",
                "content": extracted_context,
                "confidence_score": confidence_score,
                "validation_status": "pending",  # Requires user approval
                "created_at": datetime.now().isoformat()
            }).execute()
            
            logger.info(f"Stored extracted context for approval - session: {session_id}, confidence: {confidence_score}")
            
        except Exception as e:
            logger.error(f"Error storing extracted context: {str(e)}")
            raise
    
    def _calculate_context_similarity(self, context1: Dict[str, Any], context2: Dict[str, Any]) -> float:
        """
        Calculate similarity between two context objects (simple implementation).
        """
        try:
            if not context1 or not context2:
                return 0.0
                
            # Convert to sets of key-value pairs for comparison
            set1 = set()
            set2 = set()
            
            for k, v in context1.items():
                if isinstance(v, str):
                    set1.add(f"{k}:{v.lower()}")
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item, str):
                            set1.add(f"{k}:{item.lower()}")
            
            for k, v in context2.items():
                if isinstance(v, str):
                    set2.add(f"{k}:{v.lower()}")
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item, str):
                            set2.add(f"{k}:{item.lower()}")
            
            if not set1 or not set2:
                return 0.0
                
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            
            return intersection / union if union > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating context similarity: {str(e)}")
            return 0.0

# Global instance for easy access
progressive_learning_service = ProgressiveLearningService()