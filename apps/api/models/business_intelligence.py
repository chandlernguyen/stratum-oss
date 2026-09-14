"""
Business Intelligence Models and Enums
Enterprise-grade structured data models with dropdown support
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID


# Enum definitions matching database schema (updated to match frontend values)
class CompanySizeEnum(str, Enum):
    ONE_TO_TEN = "1-10 employees"
    ELEVEN_TO_FIFTY = "11-50 employees"
    FIFTYONE_TO_TWOHUNDRED = "51-200 employees"
    TWOHUNDREDONE_TO_FIVEHUNDRED = "201-500 employees"
    FIVEHUNDREDONE_TO_THOUSAND = "501-1000 employees"
    THOUSAND_PLUS = "1000+ employees"


class IndustryEnum(str, Enum):
    SAAS_SOFTWARE = "SaaS/Software"
    ECOMMERCE = "E-commerce"
    PROFESSIONAL_SERVICES = "Professional Services"
    MANUFACTURING = "Manufacturing"
    HEALTHCARE = "Healthcare"
    RETAIL = "Retail"
    FINANCIAL_SERVICES = "Financial Services"
    EDUCATION = "Education"
    NON_PROFIT = "Non-profit"
    MEDIA_ENTERTAINMENT = "Media & Entertainment"
    REAL_ESTATE = "Real Estate"
    TRANSPORTATION = "Transportation"
    ENERGY = "Energy"
    AGRICULTURE = "Agriculture"
    OTHER = "Other"


class BusinessModelEnum(str, Enum):
    B2B = "B2B"
    B2C = "B2C"
    B2B2C = "B2B2C"
    SUBSCRIPTION = "Subscription"
    MARKETPLACE = "Marketplace"
    FREEMIUM = "Freemium"
    TRANSACTION_BASED = "Transaction-based"
    ADVERTISING = "Advertising"
    HYBRID = "Hybrid"


class CompanyStageEnum(str, Enum):
    IDEA = "Idea"
    MVP = "MVP"
    EARLY_TRACTION = "Early Traction"
    GROWTH = "Growth"
    SCALE = "Scale"
    MATURE = "Mature"


class FundingStatusEnum(str, Enum):
    BOOTSTRAPPED = "Bootstrapped"
    PRE_SEED = "Pre-seed"
    SEED = "Seed"
    SERIES_A = "Series A"
    SERIES_B = "Series B"
    SERIES_C_PLUS = "Series C+"
    PUBLIC = "Public"
    ACQUIRED = "Acquired"


class ConflictStatusEnum(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class DetailLevelEnum(str, Enum):
    SUMMARY = "summary"
    STANDARD = "standard"
    DETAILED = "detailed"


# Revenue and budget ranges for privacy
REVENUE_RANGES = [
    "< $100K",
    "$100K - $500K",
    "$500K - $1M",
    "$1M - $5M",
    "$5M - $10M",
    "$10M - $50M",
    "$50M - $100M",
    "$100M - $500M",
    "$500M+",
]

BUDGET_RANGES = [
    "< $1K/month",
    "$1K - $5K/month",
    "$5K - $10K/month",
    "$10K - $25K/month",
    "$25K - $50K/month",
    "$50K - $100K/month",
    "$100K - $250K/month",
    "$250K+/month",
]

# Geography codes (ISO countries + regions)
GEOGRAPHY_OPTIONS = [
    # Major regions
    "North America",
    "South America",
    "Europe",
    "Asia",
    "Africa",
    "Oceania",
    # Major countries
    "United States",
    "Canada",
    "United Kingdom",
    "Germany",
    "France",
    "China",
    "Japan",
    "India",
    "Australia",
    "Brazil",
    # Add more as needed
]


# Pydantic Models
class CoreBusinessData(BaseModel):
    """Core business data with structured fields"""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[UUID] = None
    org_id: UUID
    client_id: Optional[UUID] = None  # For agency multi-tenant support

    # Core Company Information
    company_name: str
    website: Optional[str] = None
    industry: Optional[IndustryEnum] = None
    company_size: Optional[CompanySizeEnum] = None
    geography: Optional[List[str]] = Field(default_factory=list)
    business_model: Optional[BusinessModelEnum] = None
    company_stage: Optional[CompanyStageEnum] = None
    funding_status: Optional[FundingStatusEnum] = None
    
    # Additional structured fields
    target_market: Optional[List[str]] = Field(default_factory=list)
    main_products: Optional[List[str]] = Field(default_factory=list)
    key_competitors: Optional[List[str]] = Field(default_factory=list)
    tech_stack: Optional[List[str]] = Field(default_factory=list)
    
    # Financial Information
    annual_revenue: Optional[str] = None
    marketing_budget: Optional[str] = None
    
    # Metadata
    data_completeness_score: Optional[int] = 0
    last_manual_update: Optional[datetime] = None
    last_ai_update: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[UUID] = None


class MarketIntelligence(BaseModel):
    """Market intelligence insights"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[UUID] = None
    org_id: UUID
    
    # Market Insights
    market_trends: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    opportunities: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    threats: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    market_size_estimate: Optional[str] = None
    growth_rate_estimate: Optional[str] = None
    
    # Competitive Position
    competitive_advantages: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    competitive_weaknesses: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    market_share_estimate: Optional[str] = None
    
    # Confidence & Source
    confidence_score: Optional[float] = None
    source_agent: Optional[str] = None
    extraction_date: Optional[datetime] = None
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CustomerIntelligence(BaseModel):
    """Customer intelligence insights"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[UUID] = None
    org_id: UUID
    
    # Customer Insights
    personas: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    pain_points: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    jobs_to_be_done: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    customer_journey: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Behavioral Data
    buying_behaviors: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    decision_factors: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    objections: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    # Demographics
    demographic_insights: Optional[Dict[str, Any]] = Field(default_factory=dict)
    psychographic_insights: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Confidence & Source
    confidence_score: Optional[float] = None
    source_agent: Optional[str] = None
    extraction_date: Optional[datetime] = None
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class IntelligenceConflict(BaseModel):
    """Conflict tracking for data reconciliation"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[UUID] = None
    org_id: UUID
    
    # Conflict Details
    field_name: str
    conflict_values: List[Dict[str, Any]]  # Array of {value, source, confidence, timestamp}
    resolution: Optional[Dict[str, Any]] = None
    
    # Resolution Metadata
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    resolution_reason: Optional[str] = None
    
    # Status
    status: ConflictStatusEnum = ConflictStatusEnum.PENDING
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AgentContextProfile(BaseModel):
    """Configuration for agent-specific context"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[UUID] = None
    agent_name: str
    
    # Context Configuration
    detail_level: DetailLevelEnum
    included_fields: List[str]
    special_additions: Optional[Dict[str, Any]] = Field(default_factory=dict)
    max_context_size: int = 4000
    
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Request/Response models for API
class CoreBusinessDataUpdate(BaseModel):
    """Request model for updating business data"""
    company_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[IndustryEnum] = None
    company_size: Optional[CompanySizeEnum] = None
    geography: Optional[List[str]] = None
    business_model: Optional[BusinessModelEnum] = None
    company_stage: Optional[CompanyStageEnum] = None
    funding_status: Optional[FundingStatusEnum] = None
    target_market: Optional[List[str]] = None
    main_products: Optional[List[str]] = None
    key_competitors: Optional[List[str]] = None
    tech_stack: Optional[List[str]] = None
    annual_revenue: Optional[str] = None
    marketing_budget: Optional[str] = None


class ConflictResolution(BaseModel):
    """Request model for resolving conflicts"""
    conflict_id: UUID
    selected_value: Any
    resolution_reason: Optional[str] = None


class BusinessIntelligenceResponse(BaseModel):
    """Unified response with all business intelligence data"""
    core_data: Optional[CoreBusinessData] = None
    market_intelligence: Optional[MarketIntelligence] = None
    customer_intelligence: Optional[CustomerIntelligence] = None
    pending_conflicts: Optional[List[IntelligenceConflict]] = None
    data_completeness_score: int = 0
    last_updated: Optional[datetime] = None


# Hybrid confidence calculation
def calculate_confidence(
    source: str,
    created_at: datetime,
    extraction_confidence: Optional[float] = None,
    validated: bool = False
) -> float:
    """
    Calculate confidence score with time decay for manual entries
    
    Manual entries start at 0.95 and decay after 3 months
    AI entries use extraction confidence with validation boost
    """
    from datetime import datetime, timezone
    
    now = datetime.now(timezone.utc)
    age_days = (now - created_at).days
    
    if source == 'manual':
        initial_confidence = 0.95
        months_old = age_days / 30
        
        if months_old > 3:
            # Max 35% decay over time
            decay = min(0.01 * (months_old - 3), 0.35)
            return initial_confidence - decay
        return initial_confidence
    
    elif source == 'ai' and extraction_confidence:
        # AI entries get 10% boost if validated
        boost = 1.1 if validated else 1.0
        return min(extraction_confidence * boost, 1.0)
    
    return 0.5  # Default confidence


# Array field merging utilities
def intelligent_array_merge(
    manual_array: List[str],
    ai_array: List[str],
    similarity_threshold: float = 0.7
) -> Dict[str, List[str]]:
    """
    Intelligently merge arrays with duplicate detection
    
    Returns:
    {
        'confirmed': items in both lists,
        'manual_only': items only in manual,
        'ai_suggestions': items only in AI
    }
    """
    from difflib import SequenceMatcher
    
    def are_similar(a: str, b: str) -> bool:
        """Check if two strings are similar enough to be considered duplicates"""
        ratio = SequenceMatcher(None, a.lower(), b.lower()).ratio()
        return ratio >= similarity_threshold
    
    confirmed = []
    manual_only = manual_array.copy()
    ai_suggestions = []
    
    for ai_item in ai_array:
        found_match = False
        for manual_item in manual_only:
            if are_similar(ai_item, manual_item):
                if manual_item not in confirmed:
                    confirmed.append(manual_item)
                manual_only.remove(manual_item)
                found_match = True
                break
        
        if not found_match:
            ai_suggestions.append(ai_item)
    
    return {
        'confirmed': confirmed,
        'manual_only': manual_only,
        'ai_suggestions': ai_suggestions
    }