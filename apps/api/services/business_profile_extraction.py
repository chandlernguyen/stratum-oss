"""
Business Profile Extraction Service
Database-first approach using upsert_business_profile_data() function

This service extracts business profile data (company name, competitors, revenue, etc.)
from agent conversations and saves it to core_business_data table using a single
database RPC call. Follows database-first architecture principles.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from google import genai
import os
import logging

from apps.api.config.gemini_models import DEFAULT_MODEL
from apps.api.utils.database import get_supabase_client
from apps.api.config.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)


class BusinessProfileData(BaseModel):
    """Lightweight schema for business context extraction"""

    company_name: Optional[str] = Field(None, description="Official company name")
    industry: Optional[str] = Field(None, description="Industry sector")
    company_size: Optional[str] = Field(None, description="Number of employees or size range")
    annual_revenue: Optional[str] = Field(None, description="Annual revenue or ARR")
    marketing_budget: Optional[str] = Field(None, description="Marketing budget")
    key_competitors: Optional[List[str]] = Field(None, description="Specific competitor company/brand names ONLY (e.g., 'Microsoft', 'Salesforce', 'Starbucks', 'Dunkin''). Do NOT extract vague descriptions like 'a new competitor', 'a large company', or 'local businesses'. If no specific names mentioned, return empty list.")
    tech_stack: Optional[List[str]] = Field(None, description="Technologies used")
    geography: Optional[List[str]] = Field(None, description="Geographic markets")
    business_model: Optional[str] = Field(None, description="Business model (SaaS, marketplace, etc)")
    target_market: Optional[List[str]] = Field(None, description="Target customer segments")
    website: Optional[str] = Field(None, description="Company website")
    company_stage: Optional[str] = Field(None, description="Company stage (startup, growth, etc)")
    funding_status: Optional[str] = Field(None, description="Funding status")
    main_products: Optional[List[str]] = Field(None, description="Main products/services")

    confidence_score: float = 0.8
    extraction_date: datetime = Field(default_factory=datetime.now)


class BusinessProfileExtractionService:
    """
    Database-first business profile extraction service.
    Uses upsert_business_profile_data() database function for all writes.
    """

    # Enum normalization mappings (LLM output → Database enum)
    INDUSTRY_MAPPING = {
        'project management': 'SaaS/Software',
        'project management saas': 'SaaS/Software',
        'saas': 'SaaS/Software',
        'software': 'SaaS/Software',
        'technology': 'SaaS/Software',
        'fintech': 'Financial Services',
        'finance': 'Financial Services',
        'banking': 'Financial Services',
        'edtech': 'Education',
        'healthtech': 'Healthcare',
        'medical': 'Healthcare',
        'ecommerce': 'E-commerce',
        'online retail': 'E-commerce',
        'construction': 'Manufacturing',  # Close enough for now
    }

    COMPANY_SIZE_MAPPING = {
        '1-10': '1-10 employees',
        '10-50': '11-50 employees',
        '11-50': '11-50 employees',
        '51-200': '51-200 employees',
        '201-500': '201-500 employees',
        '500-1000': '501-1000 employees',
        '501-1000': '501-1000 employees',
        '1000+': '1000+ employees',
        'less than 10': '1-10 employees',
        'under 10': '1-10 employees',
        'small': '11-50 employees',
        'medium': '51-200 employees',
        'large': '201-500 employees',
    }

    BUSINESS_MODEL_MAPPING = {
        'b2b saas': 'B2B',
        'b2c saas': 'B2C',
        'saas': 'Subscription',
        'subscription': 'Subscription',
        'marketplace': 'Marketplace',
        'freemium': 'Freemium',
        'advertising': 'Advertising',
        'transaction': 'Transaction-based',
        'hybrid': 'Hybrid',
    }

    FUNDING_STATUS_MAPPING = {
        'bootstrapped': 'Bootstrapped',
        'self-funded': 'Bootstrapped',
        'self funded': 'Bootstrapped',
        'unfunded': 'Bootstrapped',
        'pre-seed': 'Pre-seed',
        'pre seed': 'Pre-seed',
        'preseed': 'Pre-seed',
        'seed': 'Seed',
        'seed stage': 'Seed',
        'seed funded': 'Seed',
        'series a': 'Series A',
        'series b': 'Series B',
        'series c': 'Series C+',
        'series d': 'Series C+',
        'series e': 'Series C+',
        'late stage': 'Series C+',
        'public': 'Public',
        'publicly traded': 'Public',
        'ipo': 'Public',
        'acquired': 'Acquired',
        'exit': 'Acquired',
        # Patterns to skip (not funding stages)
        'has runway': None,
        'months of runway': None,
        'runway': None,
        'venture backed': None,  # Too vague
        'vc funded': None,  # Too vague
    }

    COMPANY_STAGE_MAPPING = {
        'idea': 'Idea',
        'ideation': 'Idea',
        'concept': 'Idea',
        'mvp': 'MVP',
        'minimum viable product': 'MVP',
        'beta': 'MVP',
        'early traction': 'Early Traction',
        'early stage': 'Early Traction',
        'traction': 'Early Traction',
        'startup': 'Early Traction',  # Generic "startup" → Early Traction
        'growth': 'Growth',
        'growth stage': 'Growth',
        'scaling': 'Scale',
        'scale': 'Scale',
        'scaleup': 'Scale',
        'mature': 'Mature',
        'established': 'Mature',
        'enterprise': 'Mature',
        # Hybrid patterns (AI often combines stages)
        'startup/growth': 'Growth',  # Actual error from logs
        'early/growth': 'Growth',
        'seed/growth': 'Growth',
    }

    def _map_revenue_to_range(self, revenue_str: str) -> Optional[str]:
        """
        Map specific revenue values to dropdown ranges.
        Examples: "$4.9M" → "$1M - $10M", "$150K" → "$100K - $1M"
        """
        if not revenue_str:
            return None

        import re

        # Extract numeric value and unit
        match = re.search(r'[\$]?([\d,.]+)\s*([KMB])?', revenue_str, re.IGNORECASE)
        if not match:
            return None

        try:
            value_str = match.group(1).replace(',', '')
            value = float(value_str)
            unit = match.group(2).upper() if match.group(2) else ''

            # Convert to actual number
            if unit == 'K':
                value *= 1_000
            elif unit == 'M':
                value *= 1_000_000
            elif unit == 'B':
                value *= 1_000_000_000

            # Map to ranges (matching dropdown options)
            if value < 100_000:
                return 'Under $100K'
            elif value < 1_000_000:
                return '$100K - $1M'
            elif value < 10_000_000:
                return '$1M - $10M'
            elif value < 50_000_000:
                return '$10M - $50M'
            elif value < 100_000_000:
                return '$50M - $100M'
            else:
                return '$100M+'

        except (ValueError, AttributeError):
            return None

    def _map_budget_to_range(self, budget_str: str) -> Optional[str]:
        """
        Map specific budget values to dropdown ranges.
        Examples: "$25,000/month" → "$10K - $25K/month", "$50k" → "$25K - $50K/month"
        """
        if not budget_str:
            return None

        import re

        # Extract numeric value and unit
        match = re.search(r'[\$]?([\d,.]+)\s*([KMB])?', budget_str, re.IGNORECASE)
        if not match:
            return None

        try:
            value_str = match.group(1).replace(',', '')
            value = float(value_str)
            unit = match.group(2).upper() if match.group(2) else ''

            # Convert to actual number
            if unit == 'K':
                value *= 1_000
            elif unit == 'M':
                value *= 1_000_000

            # Map to ranges (matching dropdown options)
            if value < 1_000:
                return 'Under $1K/month'
            elif value < 5_000:
                return '$1K - $5K/month'
            elif value < 10_000:
                return '$5K - $10K/month'
            elif value < 25_000:
                return '$10K - $25K/month'
            elif value < 50_000:
                return '$25K - $50K/month'
            else:
                return '$50K+/month'

        except (ValueError, AttributeError):
            return None

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

    def _normalize_enum(self, value: Optional[str], mapping: dict) -> Optional[str]:
        """Normalize LLM output to valid database enum value"""
        if not value:
            return None

        # Try exact match first
        if value in mapping.values():
            return value

        # Try case-insensitive match with mapping
        value_lower = value.lower().strip()
        if value_lower in mapping:
            return mapping[value_lower]

        # Try partial match (e.g., "SaaS Company" → "SaaS/Software")
        for key, enum_value in mapping.items():
            if key in value_lower or value_lower in key:
                return enum_value

        # Return None if no match (database will keep existing value)
        logger.debug(f"Could not normalize enum value '{value}' - will skip field")
        return None

    async def extract_business_profile(
        self,
        conversation_text: str,
        organization_id: str
    ) -> Optional[BusinessProfileData]:
        """
        Extract business profile data from conversation.
        Focused, lightweight extraction for company context.
        """

        prompt = f"""
        Extract business profile information from this conversation.
        Only extract information that is explicitly mentioned with high confidence.

        Conversation:
        {conversation_text[:50000]}

        Extract the following if clearly mentioned:
        - Company name (official name)
        - Industry/sector
        - Company size (number of employees or range like "10-50", "50-200")
        - Annual revenue (ARR, MRR, or revenue figures like "$12M ARR", "$5M revenue")
        - Marketing budget (if mentioned)
        - Competitors (ONLY specific company/brand names like "Microsoft", "Salesforce", "Starbucks". Do NOT include vague descriptions like "a new competitor", "a large company", or "local businesses")
        - Technologies/tech stack (platforms, languages, tools mentioned)
        - Geographic markets (countries, regions, "North America", "US", etc)
        - Business model (SaaS, marketplace, e-commerce, consulting, etc)
        - Target market or customer segments
        - Company website (if mentioned)
        - Company stage (startup, growth, enterprise, etc)
        - Funding status (bootstrapped, seed, Series A, etc)
        - Main products or services

        Return ONLY fields where you have >70% confidence.
        If nothing relevant found, return empty/null fields.
        Set confidence_score based on clarity of information (0.7-1.0).
        """

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": BusinessProfileData
                }
            )

            if response.parsed:
                result = response.parsed
                result.extraction_date = datetime.now()
                logger.info(f"Extracted business profile with {result.confidence_score} confidence for org {organization_id}")
                logger.info(f"[EXTRACTION] Full extracted profile: {result.model_dump()}")
                return result

            logger.debug(f"No business profile data extracted from conversation for org {organization_id}")
            return None

        except Exception as e:
            logger.error(f"Business profile extraction failed for org {organization_id}: {e}", exc_info=True)
            return None

    async def save_to_core_business_data(
        self,
        profile_data: BusinessProfileData,
        org_id: str,
        agent_type: str,
        user_id: str,
        client_id: str = None  # For agency schema routing
    ) -> dict:
        """
        Save business profile data using database-first UPSERT function with schema routing.

        DATABASE-FIRST PATTERN:
        - Single RPC call to upsert_business_profile_data() (SME) or upsert_business_profile_data_routed() (Agency)
        - All merge logic happens in database (confidence comparison, array deduplication)
        - No application-level SELECT-then-UPDATE pattern

        SCHEMA ROUTING:
        - SME (client_id=None): Uses public.core_business_data via upsert_business_profile_data()
        - Agency (client_id present): Uses agency.client_intelligence via upsert_business_profile_data_routed()

        Returns:
            dict: Result summary from database function
                  {'updated_fields': 5, 'skipped_fields': 2, 'org_id': '...', ...}
        """

        # TWO-TIER STORAGE: Build both enum-mapped values (for core fields)
        # and specific learned values (for learning_metadata)
        data_dict = {}
        learning_metadata = {}

        for field, value in profile_data.model_dump(exclude_none=True).items():
            if field in ['confidence_score', 'extraction_date']:
                continue

            # Store original specific value in learning_metadata
            if isinstance(value, list):
                learning_metadata[f"{field}_learned"] = value  # Keep as list
            else:
                learning_metadata[f"{field}_learned"] = value  # Keep original specific value

            # Normalize enum fields for core data
            if field == 'industry':
                normalized = self._normalize_enum(value, self.INDUSTRY_MAPPING)
                if normalized:
                    data_dict[field] = normalized
                else:
                    logger.info(f"Keeping specific industry '{value}' in learning_metadata only")

            elif field == 'company_size':
                normalized = self._normalize_enum(value, self.COMPANY_SIZE_MAPPING)
                if normalized:
                    data_dict[field] = normalized
                else:
                    logger.info(f"Keeping specific company_size '{value}' in learning_metadata only")

            elif field == 'annual_revenue':
                # NEW: Map specific revenue to range
                mapped_range = self._map_revenue_to_range(value)
                if mapped_range:
                    data_dict[field] = mapped_range
                    logger.info(f"Mapped revenue '{value}' → '{mapped_range}' (specific kept in learning_metadata)")
                else:
                    logger.info(f"Could not map revenue '{value}' to range - keeping in learning_metadata only")

            elif field == 'marketing_budget':
                # NEW: Map specific budget to range
                mapped_range = self._map_budget_to_range(value)
                if mapped_range:
                    data_dict[field] = mapped_range
                    logger.info(f"Mapped budget '{value}' → '{mapped_range}' (specific kept in learning_metadata)")
                else:
                    logger.info(f"Could not map budget '{value}' to range - keeping in learning_metadata only")

            elif field == 'business_model':
                normalized = self._normalize_enum(value, self.BUSINESS_MODEL_MAPPING)
                if normalized:
                    data_dict[field] = normalized
                else:
                    logger.info(f"Keeping specific business_model '{value}' in learning_metadata only")

            elif field == 'funding_status':
                normalized = self._normalize_enum(value, self.FUNDING_STATUS_MAPPING)
                if normalized:
                    data_dict[field] = normalized
                else:
                    logger.info(f"Keeping specific funding_status '{value}' in learning_metadata only")

            elif field == 'company_stage':
                normalized = self._normalize_enum(value, self.COMPANY_STAGE_MAPPING)
                if normalized:
                    data_dict[field] = normalized
                else:
                    logger.info(f"Keeping specific company_stage '{value}' in learning_metadata only")

            # Non-enum fields (company_name, website, etc) - store as-is in both places
            elif field not in ['industry', 'company_size', 'annual_revenue', 'marketing_budget',
                               'business_model', 'funding_status', 'company_stage']:
                if isinstance(value, list):
                    data_dict[field] = ','.join(value)
                else:
                    data_dict[field] = value

        if not data_dict:
            logger.info(f"No business profile data to save for org {org_id}")
            return {'updated_fields': 0, 'skipped_fields': 0}

        # Add learning_metadata directly into data_dict with special key
        # Database function will extract and merge this into learning_metadata column
        data_dict['_learning_metadata'] = learning_metadata

        logger.info(f"[SAVE] Data dict being sent to database (includes _learning_metadata): {data_dict}")
        logger.info(f"[SAVE] Schema routing - client_id: {client_id}, org_id: {org_id}")

        try:
            # DATABASE-FIRST: Single RPC call with schema routing
            if client_id:
                # AGENCY: Route to agency.client_intelligence via routed function
                result = self.supabase.rpc(
                    'upsert_business_profile_data_routed',
                    {
                        'p_org_id': org_id,
                        'p_client_id': client_id,
                        'p_data': data_dict,
                        'p_source_agent': agent_type,
                        'p_confidence': profile_data.confidence_score,
                        'p_user_id': user_id
                    }
                ).execute()
            else:
                # SME: Route to public.core_business_data via standard function
                result = self.supabase.rpc(
                    'upsert_business_profile_data',
                    {
                        'p_org_id': org_id,
                        'p_data': data_dict,
                        'p_source_agent': agent_type,
                        'p_confidence': profile_data.confidence_score,
                        'p_user_id': user_id
                    }
                ).execute()

            if result.data:
                logger.info(
                    f"Business profile updated for org {org_id}: "
                    f"{result.data.get('updated_fields', 0)} fields updated, "
                    f"{result.data.get('skipped_fields', 0)} skipped (lower confidence)"
                )
                return result.data
            else:
                logger.warning(f"Database function returned no data for org {org_id}")
                return {'updated_fields': 0, 'skipped_fields': 0}

        except Exception as e:
            logger.error(f"Failed to save business profile for org {org_id}: {e}", exc_info=True)
            raise
