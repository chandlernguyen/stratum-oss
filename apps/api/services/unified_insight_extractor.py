"""
Unified Insight Extractor Service
Extracts business intelligence from all agent conversations using Gemini Flash-Lite
"""

import os
import json
import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from decimal import Decimal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from apps.api.config.gemini_models import DEFAULT_MODEL_LITE
from apps.api.utils.database import get_supabase_client
from apps.api.services.pii_detection import get_pii_detection_service
from apps.api.services.agent_specific_extractors import (
    AGENT_INSIGHT_MODELS,
    get_agent_extraction_prompt,
    get_agent_confidence_weights
)

logger = logging.getLogger(__name__)

class BaseInsight(BaseModel):
    """Common business context all agents extract."""
    company_name: Optional[str] = None
    industry: Optional[str] = None
    business_model: Optional[str] = None
    target_market: Optional[str] = None
    annual_revenue: Optional[str] = None
    employee_count: Optional[str] = None
    competitors: Optional[List[str]] = None
    unique_value_proposition: Optional[str] = None
    geography: Optional[str] = None
    growth_rate: Optional[str] = None
    challenges: Optional[List[str]] = None
    technology_stack: Optional[List[str]] = None

class AgentSpecificInsight(BaseModel):
    """Agent-specific insights with pre-defined fields for each agent type."""
    # Strategy insights
    strategic_focus: Optional[str] = None
    market_position: Optional[str] = None
    key_challenges: Optional[str] = None

    # Marketing insights
    marketing_budget: Optional[str] = None
    target_audience: Optional[str] = None
    messaging_focus: Optional[str] = None

    # Content insights
    content_types: Optional[str] = None
    publishing_frequency: Optional[str] = None
    top_topics: Optional[str] = None

    # Analytics insights
    key_metrics: Optional[str] = None
    reporting_tools: Optional[str] = None
    data_challenges: Optional[str] = None

class ExtractedInsight(BaseModel):
    """Complete insight structure with base and agent-specific parts."""
    base_insight: BaseInsight
    agent_specific_insight: AgentSpecificInsight

class HybridExtractedInsight(BaseModel):
    """Hybrid insight structure that can use agent-specific models."""
    base_insight: BaseInsight
    agent_specific_insight: Optional[Dict[str, Any]] = Field(default_factory=dict)

class UnifiedInsightExtractor:
    def __init__(self):
        """Initialize the extractor with configuration from environment."""
        # Use environment variable for model selection
        self.model_name = os.getenv("GEMINI_MODEL_INSIGHT_EXTRACTION", DEFAULT_MODEL_LITE)

        # Hybrid mode configuration
        self.use_hybrid_extraction = os.getenv("INSIGHT_EXTRACTION_HYBRID_MODE", "true").lower() == "true"

        # Initialize client with API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.error("GOOGLE_API_KEY not set - insight extraction disabled")
            self.client = None
        else:
            self.client = genai.Client(api_key=api_key)

        # Cost tracking (Flash-Lite verified pricing)
        self.input_cost_per_million = 0.10
        self.output_cost_per_million = 0.40

        # Load configuration
        self.enabled = os.getenv("INSIGHT_EXTRACTION_ENABLED", "false").lower() == "true"
        enabled_agents_str = os.getenv("INSIGHT_EXTRACTION_AGENTS", "")
        self.enabled_agents = [a.strip() for a in enabled_agents_str.split(",") if a.strip()]
        self.confidence_threshold = float(os.getenv("INSIGHT_EXTRACTION_CONFIDENCE_THRESHOLD", "0.70"))

        logger.info(f"UnifiedInsightExtractor initialized: enabled={self.enabled}, model={self.model_name}, agents={self.enabled_agents}")

    async def should_extract(self, agent_type: str, org_id: str) -> bool:
        """Check if extraction should run for this agent and org."""
        if not self.enabled:
            logger.debug(f"Extraction disabled globally")
            return False

        if not self.client:
            logger.debug(f"No Gemini client available")
            return False

        if agent_type not in self.enabled_agents:
            logger.debug(f"Agent {agent_type} not in enabled list: {self.enabled_agents}")
            return False

        # Check org cost limit
        if not await self._check_cost_limit(org_id):
            logger.warning(f"Org {org_id} exceeded monthly Gemini limit for insight extraction")
            return False

        return True

    async def extract_insights(
        self,
        message: str,
        agent_type: str,
        org_id: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Main extraction method - delegates to hybrid or generic based on configuration.
        """
        if self.use_hybrid_extraction and agent_type in AGENT_INSIGHT_MODELS:
            return await self.extract_insights_hybrid(
                message, agent_type, org_id, user_id, session_id, campaign_id
            )
        else:
            return await self.extract_insights_generic(
                message, agent_type, org_id, user_id, session_id, campaign_id
            )

    async def extract_insights_hybrid(
        self,
        message: str,
        agent_type: str,
        org_id: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Hybrid extraction using agent-specific schemas and prompts.
        """
        try:
            if not self.client:
                return None

            # Get agent-specific model and prompt
            agent_model = AGENT_INSIGHT_MODELS.get(agent_type)
            if not agent_model:
                logger.warning(f"No specific model for {agent_type}, falling back to generic")
                return await self.extract_insights_generic(
                    message, agent_type, org_id, user_id, session_id, campaign_id
                )

            # Create dynamic schema combining base + agent-specific
            class DynamicExtractedInsight(BaseModel):
                base_insight: BaseInsight
                agent_specific_insight: agent_model

            # Build hybrid prompt with agent-specific focus
            prompt = self._build_hybrid_prompt(message, agent_type)

            # Call Gemini API with agent-specific schema
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": DynamicExtractedInsight,
                    "temperature": 1.0  # Gemini 3 recommended default
                }
            )

            # Track API usage cost
            await self._track_usage(org_id, response.usage_metadata)

            # Parse response
            if response.parsed:
                insight_data = response.parsed.model_dump()

                # Calculate confidence with agent-specific weights
                confidence = self._calculate_confidence_hybrid(insight_data, agent_type)

                # Update metrics
                await self._update_metrics(
                    org_id, agent_type, True, confidence,
                    self._is_empty_insight(insight_data),
                    response.usage_metadata
                )

                if confidence < self.confidence_threshold:
                    logger.info(f"Hybrid insight confidence {confidence} below threshold {self.confidence_threshold}")
                    return None

                # Format for database storage
                return self._format_for_storage(
                    insight_data, agent_type, confidence,
                    org_id, user_id, session_id, campaign_id
                )
            else:
                logger.debug(f"No parsed response from hybrid extraction for {agent_type}")
                await self._update_metrics(org_id, agent_type, False, 0, True, response.usage_metadata if response else None)
                return None
        except Exception as e:
            logger.error(f"Hybrid insight extraction failed: {e}")
            # Fall back to generic extraction
            return await self.extract_insights_generic(
                message, agent_type, org_id, user_id, session_id, campaign_id
            )

    async def extract_insights_generic(
        self,
        message: str,
        agent_type: str,
        org_id: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Generic extraction method using original Chain of Thought prompting.
        Returns formatted insight data ready for database storage.
        """
        try:
            if not self.client:
                return None

            # Build the extraction prompt
            prompt = self._build_chain_of_thought_prompt(message, agent_type)

            # Call Gemini API with structured output
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ExtractedInsight,
                    "temperature": 1.0  # Gemini 3 recommended default
                }
            )

            # Track API usage cost
            await self._track_usage(org_id, response.usage_metadata)

            # Parse response
            if response.parsed:
                insight_data = response.parsed.model_dump()

                # Calculate confidence based on data completeness
                confidence = self._calculate_confidence(insight_data)

                # Update metrics
                await self._update_metrics(
                    org_id, agent_type, True, confidence,
                    self._is_empty_insight(insight_data),
                    response.usage_metadata
                )

                if confidence < self.confidence_threshold:
                    logger.info(f"Insight confidence {confidence} below threshold {self.confidence_threshold}")
                    return None

                # Format for database storage
                return self._format_for_storage(
                    insight_data, agent_type, confidence,
                    org_id, user_id, session_id, campaign_id
                )
            else:
                # Track empty response
                logger.debug(f"No parsed response from Gemini for {agent_type}")
                await self._update_metrics(org_id, agent_type, False, 0, True, response.usage_metadata if response else None)
                return None
        except Exception as e:
            logger.error(f"Insight extraction failed: {e}")
            return None

    def _build_hybrid_prompt(self, message: str, agent_type: str) -> str:
        """
        Build hybrid prompt using agent-specific extraction focus.
        """
        # Get agent-specific extraction guidance
        agent_specific_prompt = get_agent_extraction_prompt(agent_type)

        return f"""You are an expert business analyst specializing in {agent_type.replace('_', ' ')}.
Analyze the following conversation and extract structured business intelligence.

STEP 1 - Extract Core Business Facts:
Identify fundamental business information:
- Company name, industry, business model
- Size (revenue, employees)
- Target market and geography
- Competitors and unique value propositions
- Growth metrics and challenges
- Technology stack

STEP 2 - Extract Agent-Specific Insights:
{agent_specific_prompt}

STEP 3 - Structure Your Findings:
Return a JSON object with:
1. "base_insight": Core business facts (use null for missing information)
2. "agent_specific_insight": Domain-specific findings tailored to {agent_type}

IMPORTANT:
- Only extract what is explicitly stated or clearly implied
- Use null for missing information
- Keep extracted text concise and factual
- Focus on actionable business intelligence

Conversation to analyze:
{message}

Return ONLY valid JSON matching the schema."""

    def _calculate_confidence_hybrid(self, insight_data: Dict[str, Any], agent_type: str) -> float:
        """
        Calculate confidence using agent-specific weights.
        """
        base_insight = insight_data.get('base_insight', {})
        agent_insight = insight_data.get('agent_specific_insight', {})

        # Count populated fields
        base_fields = sum(1 for v in base_insight.values() if v is not None and v != "" and v != [])
        agent_fields = sum(1 for v in agent_insight.values() if v is not None and v != "" and v != [])

        # Get agent-specific weights
        base_weight, agent_weight = get_agent_confidence_weights(agent_type)

        # Calculate weighted confidence
        if base_fields + agent_fields == 0:
            return 0.0

        # Normalize based on expected field counts
        base_max = 8  # Expected base fields
        agent_max = 8  # Expected agent-specific fields

        base_score = min(base_fields / base_max, 1.0) * base_weight
        agent_score = min(agent_fields / agent_max, 1.0) * agent_weight

        return round(base_score + agent_score, 2)

    def _build_chain_of_thought_prompt(self, message: str, agent_type: str) -> str:
        """
        Build Chain of Thought prompt for better extraction quality.
        Each agent has specific focus areas for extraction.
        """
        # Agent-specific extraction focus
        agent_focus = {
            'strategy': 'strategic goals, business challenges, market positioning, growth plans, competitive advantages',
            'marketing_strategy': 'marketing goals, target audiences, channels, messaging themes, brand positioning',
            'content': 'content types, tone of voice, topics, brand guidelines, formats, publishing frequency',
            'analytics': 'KPIs, metrics, reporting needs, data tools, tracking requirements, performance goals',
            'roi_budget': 'budget ranges, ROI targets, cost constraints, investment priorities, resource allocation',
            'campaign_planning': 'campaign types, channels, timelines, resources, success criteria, execution plans',
            'quick_wins': 'immediate needs, constraints, quick opportunities, resource limits, time pressures',
            'competitive_intelligence': 'competitors, market gaps, differentiation, industry trends, competitive threats',
            'client_success': 'client types, services, retention strategies, success metrics, satisfaction drivers',
            'persona': 'customer segments, demographics, behaviors, pain points, preferences, journey stages'
        }

        focus_area = agent_focus.get(agent_type, 'relevant business information')

        return f"""You are an expert business analyst. Analyze the following conversation and extract structured business intelligence.

STEP 1 - Extract Core Business Facts:
Identify fundamental business information such as:
- Company name and industry
- Business model and size (employees, revenue)
- Target market and geography
- Competitors and market position
- Unique value propositions
- Growth rate and challenges
- Technology stack

STEP 2 - Extract {agent_type.replace('_', ' ').title()} Agent Specific Insights:
Focus specifically on: {focus_area}

STEP 3 - Structure Your Findings:
Format as a JSON object with two main sections:
1. "base_insight": Core business facts (use null for missing information)
2. "agent_specific_insight": Fill in ONLY the fields relevant to {agent_type} agent:
   - For strategy: strategic_focus, market_position, key_challenges
   - For marketing_strategy: marketing_budget, target_audience, messaging_focus
   - For content: content_types, publishing_frequency, top_topics
   - For analytics: key_metrics, reporting_tools, data_challenges
   Leave other fields as null

IMPORTANT RULES:
- Only extract what is explicitly stated or clearly implied
- Use null for missing information, never guess or make assumptions
- Keep extracted text concise and factual
- Focus on business-relevant information only
- For lists (competitors, challenges), extract as arrays

Conversation to analyze:
{message}

Return ONLY valid JSON matching the ExtractedInsight schema, no other text."""

    async def _check_cost_limit(self, org_id: str) -> bool:
        """Check if organization is within monthly cost limit."""
        supabase = get_supabase_client()

        try:
            # Call the database function to check and potentially reset usage
            result = supabase.rpc('check_and_reset_monthly_usage', {
                'p_org_id': org_id
            }).execute()

            if result.data and len(result.data) > 0:
                data = result.data[0]
                current_usage = float(data.get('current_usage', 0))
                monthly_limit = float(data.get('monthly_limit', 50.00))

                return current_usage < monthly_limit

            return True  # Allow if no limit set

        except Exception as e:
            logger.error(f"Failed to check cost limit: {e}")
            return True  # Allow on error to not block functionality

    async def _track_usage(self, org_id: str, usage_metadata: Any):
        """Track API usage cost in database."""
        try:
            if not usage_metadata:
                return

            # Calculate cost based on Flash-Lite pricing
            input_tokens = getattr(usage_metadata, 'prompt_token_count', 0)
            output_tokens = getattr(usage_metadata, 'candidates_token_count', 0)

            input_cost = (input_tokens / 1_000_000) * self.input_cost_per_million
            output_cost = (output_tokens / 1_000_000) * self.output_cost_per_million
            total_cost = input_cost + output_cost

            # Update organization usage using the database function
            supabase = get_supabase_client()
            supabase.rpc('increment_field', {
                'p_table_name': 'organizations',
                'p_field_name': 'gemini_monthly_usage',
                'p_increment_by': total_cost,
                'p_row_id': org_id
            }).execute()

            logger.debug(f"Tracked ${total_cost:.6f} for org {org_id} ({input_tokens} in, {output_tokens} out)")

        except Exception as e:
            logger.error(f"Failed to track usage: {e}")

    async def _update_metrics(
        self,
        org_id: str,
        agent_type: str,
        success: bool,
        confidence: float,
        is_empty: bool,
        usage_metadata: Any
    ):
        """Update extraction quality metrics in database."""
        try:
            # Calculate cost
            cost = 0
            if usage_metadata:
                input_tokens = getattr(usage_metadata, 'prompt_token_count', 0)
                output_tokens = getattr(usage_metadata, 'candidates_token_count', 0)
                cost = (input_tokens / 1_000_000) * self.input_cost_per_million + \
                       (output_tokens / 1_000_000) * self.output_cost_per_million

            # Update metrics using database function
            supabase = get_supabase_client()
            supabase.rpc('update_extraction_metrics', {
                'p_org_id': org_id,
                'p_agent_type': agent_type,
                'p_success': success,
                'p_confidence': confidence,
                'p_is_empty': is_empty,
                'p_cost': cost
            }).execute()

        except Exception as e:
            logger.error(f"Failed to update metrics: {e}")

    def _calculate_confidence(self, insight_data: Dict[str, Any]) -> float:
        """Calculate confidence score based on data completeness."""
        base_insight = insight_data.get('base_insight', {})
        agent_insight = insight_data.get('agent_specific_insight', {})

        # Count non-null fields in base insight
        base_fields = sum(1 for v in base_insight.values() if v is not None and v != "")

        # Count non-null fields in agent-specific insights
        agent_fields = sum(1 for v in agent_insight.values() if v is not None and v != "")

        # Calculate confidence (0 to 1)
        if base_fields + agent_fields == 0:
            return 0.0

        # Weight base insights higher (60%) and agent insights (40%)
        # Assuming max 8 important base fields and 3+ agent fields for good extraction
        base_score = min(base_fields / 8, 1.0) * 0.6
        agent_score = min(agent_fields / 3, 1.0) * 0.4

        return round(base_score + agent_score, 2)

    def _is_empty_insight(self, insight_data: Dict[str, Any]) -> bool:
        """Check if the extracted insight is essentially empty."""
        base_insight = insight_data.get('base_insight', {})
        agent_insight = insight_data.get('agent_specific_insight', {})

        # Check if all base fields are None or empty
        base_has_data = any(v for v in base_insight.values() if v)

        # Check if agent insights have any data
        agent_has_data = any(v for v in agent_insight.values() if v)

        return not (base_has_data or agent_has_data)

    def _format_for_storage(
        self,
        insight_data: Dict[str, Any],
        agent_type: str,
        confidence: float,
        org_id: str,
        user_id: Optional[str],
        session_id: Optional[str],
        campaign_id: Optional[str]
    ) -> Dict[str, Any]:
        """Format extracted insights for database storage in ai_insights table."""

        # Determine validation status based on confidence
        validation_status = 'auto_approved' if confidence >= 0.85 else 'pending'

        # Create a title based on what was extracted
        base_insight = insight_data.get('base_insight', {})
        company_name = base_insight.get('company_name', 'Unknown Company')
        title = f"{agent_type.replace('_', ' ').title()} Insights - {company_name}"

        return {
            'org_id': org_id,
            'user_id': user_id,
            'insight_type': 'learning',
            'source_type': 'agent_conversation',
            'source_agent': agent_type,
            'session_id': session_id,
            'campaign_id': campaign_id,
            'title': title,
            'content': insight_data,  # Stores both base and agent-specific
            'category': ['extracted', agent_type],
            'confidence_score': confidence,
            'validation_status': validation_status,
            'impact_score': self._calculate_impact_score(agent_type, confidence),
            'extraction_model': self.model_name,
            'extraction_cost': None  # Will be calculated separately if needed
        }

    def _calculate_impact_score(self, agent_type: str, confidence: float) -> int:
        """Calculate impact score based on agent type and confidence."""
        # Base scores by agent importance
        base_scores = {
            'strategy': 80,
            'marketing_strategy': 75,
            'persona': 70,
            'content': 65,
            'analytics': 70,
            'roi_budget': 75,
            'campaign_planning': 65,
            'quick_wins': 60,
            'competitive_intelligence': 75,
            'client_success': 70
        }

        base_score = base_scores.get(agent_type, 60)

        # Adjust by confidence (±10 points)
        if confidence >= 0.9:
            return min(base_score + 10, 100)
        elif confidence >= 0.8:
            return base_score + 5
        elif confidence < 0.6:
            return max(base_score - 10, 30)
        else:
            return base_score


# Singleton instance
_extractor_instance: Optional[UnifiedInsightExtractor] = None

def get_insight_extractor() -> UnifiedInsightExtractor:
    """Get or create singleton extractor instance."""
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = UnifiedInsightExtractor()
    return _extractor_instance

async def test_extractor():
    """Test function for the extractor."""
    extractor = get_insight_extractor()

    # Test message
    test_message = """
    I'm the CEO of TaskFlow Solutions, a $12M ARR project management SaaS company
    with 85 employees. We're facing increasing competition from Asana and Monday.com.
    Our customer churn has increased from 8% to 14% in the last year.
    """

    result = await extractor.extract_insights(
        message=test_message,
        agent_type='strategy',
        org_id='test-org-id'
    )

    if result:
        print(json.dumps(result, indent=2))
    else:
        print("No insights extracted")

if __name__ == "__main__":
    asyncio.run(test_extractor())