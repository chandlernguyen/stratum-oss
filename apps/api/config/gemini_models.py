"""
Gemini Model Configuration for Multi-Model Strategy
Defines available models, cost parameters, and routing logic.

Gemini 3.8 Flash: $0.75/$3.75 per million tokens (introductory, through
Dec 31 2026; $1.50/$7.50 thereafter)
- All agents use gemini-3.8-flash
- Supports: Caching, Function Calling, Google Search, Structured Outputs, Thinking
- Does NOT support combining built-in tools with function calling in the same request
- Temperature: Google recommends 1.0 default for Gemini 3 (lower values may cause looping)
- Thinking: thinking_level accepts low/medium/high (default medium).
  "minimal" is NOT valid on 3.8 Flash and returns 400 INVALID_ARGUMENT; use "low".
  thinking_budget is no longer used by this codebase.
"""
from enum import Enum
from typing import Dict, Literal
from pydantic import BaseModel, Field


class ModelName(str, Enum):
    """Available Gemini models — all point to Gemini 3.8 Flash"""
    FLASH_LITE = "gemini-3.8-flash"
    FLASH = "gemini-3.8-flash"
    FLASH_PREVIEW = "gemini-3.8-flash"  # Same as FLASH
    PRO = "gemini-3.8-flash"


# Single source of truth for default model IDs — import these instead of hardcoding strings
DEFAULT_MODEL = ModelName.FLASH.value
DEFAULT_MODEL_LITE = ModelName.FLASH_LITE.value


class ModelConfig(BaseModel):
    """Configuration for a specific Gemini model"""
    name: str = Field(..., description="Official model name in Gemini API")
    display_name: str = Field(..., description="Human-readable name for UI")
    input_cost_per_million: float = Field(..., description="Cost per million input tokens (USD)")
    output_cost_per_million: float = Field(..., description="Cost per million output tokens (USD)")
    cached_input_cost_per_million: float = Field(..., description="Cost per million cached input tokens (USD)")
    max_tokens: int = Field(..., description="Maximum output tokens supported")
    best_for: list[str] = Field(default_factory=list, description="Use cases this model excels at")
    limitations: list[str] = Field(default_factory=list, description="Known limitations")


# Model Configuration Database
AVAILABLE_MODELS: Dict[ModelName, ModelConfig] = {
    ModelName.FLASH_LITE: ModelConfig(
        name="gemini-3.8-flash",
        display_name="Gemini 3.8 Flash",
        input_cost_per_million=0.75,
        output_cost_per_million=3.75,
        cached_input_cost_per_million=0.1875,  # UNVERIFIED: 25% of input, matching the
        # previous model's ratio; confirm against the official pricing page
        max_tokens=65536,
        best_for=[
            "Quick analytics queries",
            "Simple content suggestions",
            "Fast persona insights",
            "ROI calculations",
            "Quick wins identification"
        ],
        limitations=[
            "Preview model - may change before stable release"
        ]
    ),
    ModelName.FLASH: ModelConfig(
        name="gemini-3.8-flash",
        display_name="Gemini 3.8 Flash",
        input_cost_per_million=0.75,
        output_cost_per_million=3.75,
        cached_input_cost_per_million=0.1875,  # UNVERIFIED: 25% of input, matching the
        # previous model's ratio; confirm against the official pricing page
        max_tokens=65536,
        best_for=[
            "Standard persona development",
            "Content generation",
            "Marketing strategy briefs",
            "Campaign planning",
            "Competitive analysis"
        ],
        limitations=[
            "Preview model - may change before stable release"
        ]
    ),
    ModelName.FLASH_PREVIEW: ModelConfig(
        name="gemini-3.8-flash",
        display_name="Gemini 3.8 Flash",
        input_cost_per_million=0.75,
        output_cost_per_million=3.75,
        cached_input_cost_per_million=0.1875,  # UNVERIFIED: 25% of input, matching the
        # previous model's ratio; confirm against the official pricing page
        max_tokens=65536,
        best_for=[
            "Large scale processing",
            "Agentic use cases",
            "Complex business strategies",
            "Multi-framework analysis"
        ],
        limitations=[
            "Preview model - may change before stable release"
        ]
    ),
    ModelName.PRO: ModelConfig(
        name="gemini-3.8-flash",
        display_name="Gemini 3.8 Flash",
        input_cost_per_million=0.75,
        output_cost_per_million=3.75,
        cached_input_cost_per_million=0.1875,  # UNVERIFIED: 25% of input, matching the
        # previous model's ratio; confirm against the official pricing page
        max_tokens=65536,
        best_for=[
            "Enterprise-grade strategic analysis",
            "High-stakes campaign planning",
            "Complex multi-agent workflows",
            "Executive-level business insights"
        ],
        limitations=[
            "Preview model - may change before stable release"
        ]
    )
}


# Agent-to-Model Mapping (Default Assignments)
AGENT_MODEL_DEFAULTS: Dict[str, ModelName] = {
    "analytics": ModelName.FLASH_LITE,      # Fast metrics, clear ROI
    "quick_wins": ModelName.FLASH_PREVIEW,  # Complex opportunity analysis
    "persona": ModelName.FLASH,             # Standard complexity
    "content": ModelName.FLASH,             # Standard generation
    "marketing_strategy": ModelName.FLASH,  # Standard planning
    "strategy": ModelName.FLASH_PREVIEW,    # Complex frameworks
    "campaign": ModelName.FLASH_PREVIEW,    # Multi-channel coordination
    "roi_budget": ModelName.FLASH,          # Balance cost and accuracy
    "competitive": ModelName.FLASH_PREVIEW, # Deep analysis
    "client_success": ModelName.FLASH,      # Relationship management
    "ad_creative": ModelName.FLASH          # Creative generation
}


class QueryComplexity(str, Enum):
    """Query complexity levels for dynamic model routing"""
    SIMPLE = "simple"        # Flash-Lite
    STANDARD = "standard"    # Flash
    COMPLEX = "complex"      # Flash-Preview
    ENTERPRISE = "enterprise" # Pro


def get_model_for_agent(agent_type: str, complexity: QueryComplexity = QueryComplexity.STANDARD) -> ModelName:
    """
    Get the appropriate model for an agent based on query complexity.

    Args:
        agent_type: Agent identifier (e.g., "strategy", "persona")
        complexity: Detected or specified query complexity

    Returns:
        ModelName enum value for the recommended model
    """
    # Override with complexity-based routing
    if complexity == QueryComplexity.SIMPLE:
        return ModelName.FLASH_LITE
    elif complexity == QueryComplexity.ENTERPRISE:
        return ModelName.FLASH_PREVIEW  # Flash-Preview is 30x faster than Pro with 87-90% quality
    elif complexity == QueryComplexity.COMPLEX:
        return ModelName.FLASH_PREVIEW

    # Default to agent-specific mapping for STANDARD complexity
    return AGENT_MODEL_DEFAULTS.get(agent_type, ModelName.FLASH)


def get_model_config(model_name: ModelName) -> ModelConfig:
    """
    Get configuration details for a specific model.

    Args:
        model_name: ModelName enum value

    Returns:
        ModelConfig with cost and capability details
    """
    return AVAILABLE_MODELS[model_name]


def calculate_cost(
    model_name: ModelName,
    input_tokens: int,
    output_tokens: int,
    cached_input_tokens: int = 0
) -> dict:
    """
    Calculate the cost for a specific request.

    Args:
        model_name: ModelName enum value
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        cached_input_tokens: Number of cached input tokens (75% savings)

    Returns:
        Dictionary with cost breakdown
    """
    config = AVAILABLE_MODELS[model_name]

    # Calculate costs per component
    uncached_input = input_tokens - cached_input_tokens
    uncached_input_cost = (uncached_input / 1_000_000) * config.input_cost_per_million
    cached_input_cost = (cached_input_tokens / 1_000_000) * config.cached_input_cost_per_million
    output_cost = (output_tokens / 1_000_000) * config.output_cost_per_million

    total_cost = uncached_input_cost + cached_input_cost + output_cost

    # Calculate savings from caching
    without_cache_cost = (input_tokens / 1_000_000) * config.input_cost_per_million + output_cost
    cache_savings = without_cache_cost - total_cost if cached_input_tokens > 0 else 0

    return {
        "model_name": model_name.value,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cached_input_tokens": cached_input_tokens,
        "uncached_input_cost_usd": round(uncached_input_cost, 6),
        "cached_input_cost_usd": round(cached_input_cost, 6),
        "output_cost_usd": round(output_cost, 6),
        "total_cost_usd": round(total_cost, 6),
        "cache_savings_usd": round(cache_savings, 6),
        "cache_savings_percent": round((cache_savings / without_cache_cost * 100), 2) if without_cache_cost > 0 else 0
    }
