"""
Agent Configuration Management
Centralized configuration for all AI agents with sensible defaults and agent-specific overrides.

This module implements the Agent Configuration Pattern to solve initialization order bugs
in our agent inheritance chain. See docs/AGENT_TOKEN_LIMIT_ARCHITECTURE_2025_10_15.md for details.
"""
from dataclasses import dataclass, field, replace
from typing import Optional, Dict, List
import os
import logging

logger = logging.getLogger(__name__)


def get_safety_settings_for_marketing():
    """
    Get production-grade safety settings optimized for marketing intelligence applications.

    Marketing content requires stricter filtering than general AI applications because:
    1. Brand reputation - Marketing content directly represents the brand
    2. Professional tone - Content must be workplace-appropriate
    3. Inclusive messaging - Avoid discriminatory or offensive language
    4. Legal compliance - Reduce risk of problematic content generation

    Threshold Strategy for Marketing Intelligence:
    - HARASSMENT: BLOCK_MEDIUM_AND_ABOVE - Marketing should be respectful and professional
    - HATE_SPEECH: BLOCK_MEDIUM_AND_ABOVE - Marketing must be inclusive and non-discriminatory
    - SEXUALLY_EXPLICIT: BLOCK_LOW_AND_ABOVE - Stricter filter for professional marketing context
    - DANGEROUS_CONTENT: BLOCK_MEDIUM_AND_ABOVE - Marketing shouldn't promote harmful activities

    These settings are more conservative than Google's default (BLOCK_ONLY_HIGH) to ensure
    brand-safe, professional marketing content generation.

    Returns:
        List of SafetySetting objects configured for marketing intelligence

    Note:
        Import types from google.genai when using these settings:
        from google.genai import types
    """
    try:
        from google.genai import types

        return [
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT",
                threshold="BLOCK_MEDIUM_AND_ABOVE"  # Marketing should be respectful
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH",
                threshold="BLOCK_MEDIUM_AND_ABOVE"  # Marketing must be inclusive
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold="BLOCK_LOW_AND_ABOVE"  # Stricter for professional marketing
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold="BLOCK_MEDIUM_AND_ABOVE"  # No promotion of harmful activities
            ),
        ]
    except ImportError:
        logger.error("Failed to import google.genai.types - safety settings unavailable")
        return []


@dataclass
class AgentConfig:
    """
    Configuration for a specific agent with sensible defaults.

    Priority (following 12-Factor App principles):
    1. Agent-specific env var (GEMINI_MAX_OUTPUT_TOKENS_QUICK_START) - Highest (operations override)
    2. Global env var (GEMINI_MAX_OUTPUT_TOKENS)
    3. Code-based override (_token_overrides dict)
    4. Class default (8192) - Lowest

    Attributes:
        agent_type: Identifier for the agent (e.g., 'quick_start', 'strategy')
        max_output_tokens: Maximum tokens in agent response (Gemini 2.5 Flash supports up to 65,535)
        temperature: Sampling temperature for response randomness (0.0-1.0)
        thinking_level: Thinking effort for Gemini 3 — "low", "medium" or "high"
        enable_grounding: Whether to enable Google Search grounding
        enable_caching: Whether to enable context caching for performance

    Usage:
        # Auto-configuration based on agent type
        config = AgentConfig.from_env('quick_start')
        # Quick Start automatically gets 16,384 tokens

        # Manual override with type safety
        config = get_agent_config('strategy', max_output_tokens=10000)
    """
    agent_type: str
    max_output_tokens: int = 8192  # Gemini recommended default for cost control
    temperature: float = 1.0  # Gemini 3 recommended default (lower values may cause looping)
    thinking_level: str = "medium"  # Gemini 3.8 default; "minimal" is not valid
    enable_grounding: bool = True  # Enable Google Search by default
    enable_caching: bool = True  # Enable context caching for performance

    @classmethod
    def from_env(cls, agent_type: str) -> 'AgentConfig':
        """
        Create agent configuration with explicit priority order.

        Priority (following 12-Factor App principles):
        1. Agent-specific env var (GEMINI_MAX_OUTPUT_TOKENS_QUICK_START) - Highest (operations override)
        2. Global env var (GEMINI_MAX_OUTPUT_TOKENS)
        3. Code-based override (TOKEN_OVERRIDES dict)
        4. Class default (8192) - Lowest

        Args:
            agent_type: Agent identifier for looking up specific config

        Returns:
            AgentConfig with appropriate settings
        """
        # Agent-specific token overrides - Priority 3 in configuration hierarchy
        # Documented reason for each override
        TOKEN_OVERRIDES = {
            # Quick Start generates SWOT analysis + customer personas + marketing strategy in single response
            # Rationale: ~12K tokens needed (SWOT:3K + Personas:4K + Strategy:5K) + safety margin
            'quick_start': 16384,

            # Performance Intelligence analyzes multi-metric dashboards with detailed recommendations
            # Rationale: Comprehensive ROI analysis with recommendations needs 1.5x default
            'performance_intelligence': 12288,

            # Future agents with custom requirements go here:
            # 'complex_analysis': 20000,
        }

        # 1. Agent-specific environment variable (highest priority)
        env_key = f"GEMINI_MAX_OUTPUT_TOKENS_{agent_type.upper()}"
        max_tokens_str = os.getenv(env_key)
        source = f"agent-specific env var ({env_key})"

        # 2. Global environment variable
        if max_tokens_str is None:
            env_key = "GEMINI_MAX_OUTPUT_TOKENS"
            max_tokens_str = os.getenv(env_key)
            source = f"global env var ({env_key})"

        if max_tokens_str:
            max_output_tokens = int(max_tokens_str)
        else:
            # 3. Code-based override
            if agent_type in TOKEN_OVERRIDES:
                max_output_tokens = TOKEN_OVERRIDES[agent_type]
                source = "code override"
            else:
                # 4. Class default (lowest priority)
                max_output_tokens = 8192
                source = "class default"

        logger.info(f"[{agent_type}] max_output_tokens={max_output_tokens} from {source}")

        return cls(
            agent_type=agent_type,
            max_output_tokens=max_output_tokens,
            temperature=float(os.getenv("GEMINI_TEMPERATURE", "1.0")),
            thinking_level=os.getenv("GEMINI_THINKING_LEVEL", "medium"),
            enable_grounding=os.getenv("GEMINI_ENABLE_GROUNDING", "true").lower() == "true",
            enable_caching=os.getenv("GEMINI_ENABLE_CACHING", "true").lower() == "true",
        )


def get_agent_config(agent_type: str, **overrides) -> AgentConfig:
    """
    Convenience function to get agent configuration with type-safe overrides.

    Uses dataclasses.replace() for type-safe, immutable-style updates.

    Args:
        agent_type: Agent identifier
        **overrides: Any config attributes to override

    Returns:
        AgentConfig with applied overrides

    Example:
        config = get_agent_config('strategy', max_output_tokens=10000)
    """
    config = AgentConfig.from_env(agent_type)

    try:
        # Type-safe and efficient way to apply overrides using dataclasses.replace()
        return replace(config, **overrides)
    except TypeError as e:
        logger.warning(f"Invalid override attributes for '{agent_type}': {e}")
        return config
