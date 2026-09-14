"""
Business Metrics Extraction Service
LLM-first approach using Gemini for intelligent metric categorization and normalization

This service extracts dynamic business metrics (churn rates, CAC, runway, NPS scores, etc.)
from agent conversations and saves them to core_business_data.business_metrics JSONB column.

Key Features:
- Trust LLM to normalize metric names (churn, customer churn → churn_rate)
- Trust LLM to categorize metrics (churn_rate → financial category)
- Trust LLM to extract numeric values (14% → 14.0)
- Trust LLM to generate aliases for deduplication
- No hardcoded mappings - comprehensive prompting guides consistent behavior
"""

from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from google import genai
import os
import logging

from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)


class MetricValue(BaseModel):
    """Individual metric with full metadata"""
    metric_name: str = Field(..., description="Normalized metric name in snake_case")
    value: str = Field(..., description="Display value (e.g., '14%', '$12M', '18 months')")
    numeric_value: Optional[float] = Field(None, description="Numeric value for calculations")
    value_type: str = Field(..., description="percentage | currency | count | duration")
    unit: Optional[str] = Field(None, description="Unit for display (%, USD, months, etc.)")
    current: Optional[str] = Field(None, description="Current value if trend data")
    previous: Optional[str] = Field(None, description="Previous value if trend data")
    trend: Optional[str] = Field(None, description="increasing | decreasing | stable")
    context: Optional[str] = Field(None, description="Additional context about the metric")
    aliases: List[str] = Field(default_factory=list, description="Alternative names for deduplication")


class BusinessMetricsData(BaseModel):
    """Categorized business metrics with LLM-guided normalization"""
    financial: List[MetricValue] = Field(default_factory=list, description="Financial metrics")
    marketing: List[MetricValue] = Field(default_factory=list, description="Marketing metrics")
    product: List[MetricValue] = Field(default_factory=list, description="Product metrics")
    operational: List[MetricValue] = Field(default_factory=list, description="Operational metrics")
    confidence_score: float = Field(default=0.8)
    extraction_date: datetime = Field(default_factory=datetime.now)


class BusinessMetricsExtractionService:
    """
    LLM-first business metrics extraction service.
    Uses Gemini 2.5 Flash with comprehensive prompting for consistent extraction.
    """

    def __init__(self):
        self.model = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)
        self.supabase = get_supabase_client()

    @property
    def client(self) -> genai.Client:
        """
        Lazily create the Gemini client.

        Creating it in __init__ meant that constructing this service required
        GOOGLE_API_KEY, and these services are built by module-level singletons
        — so importing the application crashed without a key.
        """
        return get_gemini_client()

    async def extract_business_metrics(
        self,
        conversation_text: str,
        organization_id: str
    ) -> Optional[BusinessMetricsData]:
        """
        Extract categorized business metrics using LLM intelligence.

        Args:
            conversation_text: Full conversation text from agent session
            organization_id: Organization ID for context

        Returns:
            BusinessMetricsData with categorized metrics, or None if no metrics found
        """

        prompt = f"""
Extract ANY business metrics mentioned in this conversation.

CATEGORIZATION GUIDELINES (trust your understanding):
- financial: revenue, costs, churn, profitability, runway, burn rate, ARR/MRR, CAC, LTV
- marketing: engagement, reach, conversion, awareness, open rates, CTR, ROAS, CPA
- product: adoption, satisfaction, retention, NPS, feature usage, active users
- operational: efficiency, velocity, quality, capacity, uptime, response time

NORMALIZATION GUIDELINES (use consistent snake_case naming):
- Normalize similar terms to canonical names (e.g., "churn", "customer churn" → "churn_rate")
- Use clear, descriptive metric names (e.g., "customer_acquisition_cost" not "cac")
- Be consistent across similar metrics (e.g., all rates should end with "_rate")
- CRITICAL: Normalize budget/spend metric names consistently:
  * "monthly marketing budget" → "marketing_budget_monthly"
  * "campaign budget per month" → "marketing_budget_monthly" (SAME NAME)
  * "monthly campaign budget" → "campaign_budget_monthly"
  * "total campaign budget" → "campaign_budget_total"

VALUE FORMATTING RULES (prevent duplicates):
- NEVER add time period to the value field (e.g., "$10,000/month" is WRONG)
- Use the 'unit' field for period information (e.g., unit: "USD/month")
- Keep values numeric and clean (e.g., "$10,000" not "$10,000 per month")
- Example: {{value: "$10,000", unit: "USD/month"}} not {{value: "$10,000/month"}}

For EACH metric found:
1. Choose appropriate category (financial/marketing/product/operational)
2. Use normalized metric_name in snake_case (SAME name for semantically identical metrics)
3. Extract display value WITHOUT time period suffix (e.g., "14%", "$12M", "18 months")
4. Extract numeric value (e.g., 14.0, 12000000, 18)
5. Identify value type (percentage, currency, count, duration)
6. Extract unit INCLUDING time period (e.g., "USD/month", "%", "months")
7. If trend mentioned, extract current, previous, trend
8. Generate comprehensive aliases including ALL variations you might encounter:
   * Include the canonical name from conversation
   * Include abbreviated forms (e.g., "cac" for "customer_acquisition_cost")
   * Include synonym variations (e.g., "monthly_budget", "budget_per_month", "budget_monthly")
   * Include word order variations (e.g., "marketing_budget_monthly", "monthly_marketing_budget")

EXAMPLES across all 9 agents:

STRATEGY AGENT:
"Churn increased from 8% to 14%" →
financial: [{{
  "metric_name": "churn_rate",
  "value": "14%",
  "numeric_value": 14.0,
  "value_type": "percentage",
  "unit": "%",
  "current": "14%",
  "previous": "8%",
  "trend": "increasing",
  "aliases": ["churn", "customer_churn", "churnrate"]
}}]

"CAC is up 40% to $850" →
financial: [{{
  "metric_name": "customer_acquisition_cost",
  "value": "$850",
  "numeric_value": 850,
  "value_type": "currency",
  "unit": "USD",
  "context": "up 40%",
  "aliases": ["cac", "acquisition_cost"]
}}]

"We have 18 months of runway" →
financial: [{{
  "metric_name": "runway_months",
  "value": "18 months",
  "numeric_value": 18,
  "value_type": "duration",
  "unit": "months",
  "aliases": ["runway", "cash_runway"]
}}]

CONTENT AGENT:
"Email open rate is 22%" →
marketing: [{{
  "metric_name": "email_open_rate",
  "value": "22%",
  "numeric_value": 22.0,
  "value_type": "percentage",
  "unit": "%",
  "aliases": ["open_rate", "email_opens"]
}}]

PERSONA AGENT:
"NPS score is 45" →
product: [{{
  "metric_name": "nps_score",
  "value": "45",
  "numeric_value": 45,
  "value_type": "count",
  "aliases": ["nps", "net_promoter_score"]
}}]

ANALYTICS AGENT:
"Conversion rate dropped to 2.3%" →
marketing: [{{
  "metric_name": "conversion_rate",
  "value": "2.3%",
  "numeric_value": 2.3,
  "value_type": "percentage",
  "unit": "%",
  "trend": "decreasing",
  "aliases": ["cvr", "conversion"]
}}]

ROI & BUDGET AGENT:
"ROAS is 3.5x" →
marketing: [{{
  "metric_name": "return_on_ad_spend",
  "value": "3.5x",
  "numeric_value": 3.5,
  "value_type": "count",
  "unit": "x",
  "aliases": ["roas", "ad_return"]
}}]

CAMPAIGN EXECUTION AGENT:
"Click-through rate is 1.8%" →
marketing: [{{
  "metric_name": "click_through_rate",
  "value": "1.8%",
  "numeric_value": 1.8,
  "value_type": "percentage",
  "unit": "%",
  "aliases": ["ctr", "clickthrough_rate"]
}}]

QUICK WINS AGENT:
"Response time improved to 2 hours" →
operational: [{{
  "metric_name": "response_time_hours",
  "value": "2 hours",
  "numeric_value": 2,
  "value_type": "duration",
  "unit": "hours",
  "trend": "decreasing",
  "aliases": ["response_time", "time_to_respond"]
}}]

COMPETITIVE INTELLIGENCE AGENT:
"Their market share is 23%" →
operational: [{{
  "metric_name": "competitor_market_share",
  "value": "23%",
  "numeric_value": 23,
  "value_type": "percentage",
  "unit": "%",
  "aliases": ["market_share"]
}}]

CLIENT SUCCESS AGENT:
"Retention rate is 94%" →
product: [{{
  "metric_name": "retention_rate",
  "value": "94%",
  "numeric_value": 94,
  "value_type": "percentage",
  "unit": "%",
  "aliases": ["retention", "customer_retention"]
}}]

Conversation:
{conversation_text[:50000]}

Return categorized metrics with proper normalization and comprehensive aliases.
Only extract explicitly mentioned metrics with >70% confidence.
Use your intelligence to categorize and normalize consistently.
"""

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": BusinessMetricsData
                }
            )

            if response.parsed:
                result = response.parsed
                result.extraction_date = datetime.now()
                logger.info(
                    f"Extracted business metrics with {result.confidence_score} confidence "
                    f"for org {organization_id}"
                )
                return result

            logger.debug(f"No business metrics extracted from conversation for org {organization_id}")
            return None

        except Exception as e:
            logger.error(f"Business metrics extraction failed for org {organization_id}: {e}", exc_info=True)
            return None

    async def save_to_core_business_data(
        self,
        metrics_data: BusinessMetricsData,
        org_id: str,
        agent_type: str,
        user_id: str,
        client_id: str = None  # For agency schema routing
    ) -> dict:
        """
        Save categorized business metrics using database-first UPSERT function with schema routing.

        DATABASE-FIRST PATTERN:
        - Single RPC call to upsert_business_profile_data() (SME) or upsert_business_metrics_routed() (Agency)
        - All merge logic happens in database (confidence comparison per metric)
        - No application-level SELECT-then-UPDATE pattern

        SCHEMA ROUTING:
        - SME (client_id=None): Uses public.core_business_data.business_metrics via upsert_business_profile_data()
        - Agency (client_id present): Uses agency.client_intelligence.ai_insights.business_metrics via upsert_business_metrics_routed()

        Args:
            metrics_data: Extracted metrics with categories
            org_id: Organization ID
            agent_type: Which agent extracted the metrics
            user_id: User who initiated the conversation
            client_id: Client ID for agency organizations (triggers schema routing)

        Returns:
            dict: Result summary from database function
                  {'updated_metrics': 5, 'skipped_metrics': 2, 'org_id': '...', ...}
        """

        # Convert Pydantic model (list format) to JSONB-compatible dict
        formatted_metrics = {
            'financial': {},
            'marketing': {},
            'product': {},
            'operational': {}
        }

        for category in ['financial', 'marketing', 'product', 'operational']:
            category_metrics = getattr(metrics_data, category)

            # Convert list of MetricValue to dict keyed by metric_name
            for metric_value in category_metrics:
                metric_name = metric_value.metric_name

                # Convert MetricValue to dict, excluding None values and metric_name (already used as key)
                metric_dict = metric_value.model_dump(exclude_none=True)
                metric_dict.pop('metric_name', None)  # Remove since it's the key

                formatted_metrics[category][metric_name] = metric_dict

        if not any(formatted_metrics.values()):
            logger.debug(f"No business metrics to save for org {org_id}")
            return {'updated_metrics': 0, 'skipped_metrics': 0}

        logger.info(f"[SAVE] Schema routing - client_id: {client_id}, org_id: {org_id}")

        try:
            # DATABASE-FIRST: Single RPC call with schema routing
            if client_id:
                # AGENCY: Route to agency.client_intelligence via routed function
                result = self.supabase.rpc(
                    'upsert_business_metrics_routed',
                    {
                        'p_org_id': org_id,
                        'p_client_id': client_id,
                        'p_metrics': formatted_metrics,
                        'p_source_agent': agent_type,
                        'p_confidence': metrics_data.confidence_score,
                        'p_user_id': user_id
                    }
                ).execute()
            else:
                # SME: Route to public.core_business_data via standard function
                result = self.supabase.rpc(
                    'upsert_business_profile_data',
                    {
                        'p_org_id': org_id,
                        'p_data': {},  # No profile fields this time
                        'p_metrics': formatted_metrics,
                        'p_source_agent': agent_type,
                        'p_confidence': metrics_data.confidence_score,
                        'p_user_id': user_id
                    }
                ).execute()

            if result.data:
                logger.info(
                    f"Business metrics updated for org {org_id}: "
                    f"{result.data.get('updated_metrics', 0)} metrics updated, "
                    f"{result.data.get('skipped_metrics', 0)} skipped (lower confidence)"
                )
                return result.data
            else:
                logger.warning(f"Database function returned no data for org {org_id}")
                return {'updated_metrics': 0, 'skipped_metrics': 0}

        except Exception as e:
            logger.error(f"Failed to save business metrics for org {org_id}: {e}", exc_info=True)
            raise
