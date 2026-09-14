"""
Localization Service for STRAŦUM API.

Provides:
- Loading localized agent prompts
- Loading localized tool display names
- Loading localized error messages
- Caching for performance

Canonical locale support is defined in `apps.api.locales.registry`.
Do not trust older rollout comments elsewhere over the registry.
"""

import json
import logging
from typing import Dict, Any
from functools import lru_cache
from pathlib import Path
from apps.api.locales.registry import DEFAULT_LOCALE, SUPPORTED_LOCALES, normalize_locale, SupportedLocale

logger = logging.getLogger(__name__)

# Base path for locale files
LOCALES_BASE_PATH = Path(__file__).parent.parent / "locales"


def _get_locale_or_default(locale: str) -> SupportedLocale:
    """Validate locale and return default if invalid."""
    normalized = normalize_locale(locale)
    if normalized and normalized in SUPPORTED_LOCALES:
        return normalized
    logger.warning(f"Unsupported locale '{locale}', falling back to '{DEFAULT_LOCALE}'")
    return DEFAULT_LOCALE


@lru_cache(maxsize=100)
def _load_json_file(file_path: str) -> Dict[str, Any]:
    """
    Load and cache a JSON file.

    Uses LRU cache to avoid repeated disk reads.
    Cache is invalidated on server restart.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Locale file not found: {file_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in locale file {file_path}: {e}")
        return {}


def load_prompt(agent_type: str, locale: str = DEFAULT_LOCALE) -> str:
    """
    Load the system prompt for an agent in the specified locale.

    Args:
        agent_type: Agent identifier (e.g., "strategy", "persona")
        locale: Locale code (for example "en", "vi", or "es")

    Returns:
        System prompt string, or empty string if not found

    Example:
        prompt = load_prompt("strategy", "vi")
    """
    locale = _get_locale_or_default(locale)
    file_path = LOCALES_BASE_PATH / locale / "prompts" / f"{agent_type}.json"

    data = _load_json_file(str(file_path))

    # Try to get system_prompt key, fallback to entire content if it's a string
    if isinstance(data, dict):
        return data.get("system_prompt", data.get("prompt", ""))

    return ""


def load_greeting(agent_type: str, locale: str = DEFAULT_LOCALE) -> str:
    """
    Load the greeting message for an agent in the specified locale.

    Args:
        agent_type: Agent identifier (e.g., "strategy", "persona")
        locale: Locale code (for example "en", "vi", or "es")

    Returns:
        Greeting string, or default greeting if not found
    """
    locale = _get_locale_or_default(locale)
    file_path = LOCALES_BASE_PATH / locale / "prompts" / f"{agent_type}.json"

    data = _load_json_file(str(file_path))

    if isinstance(data, dict):
        greeting = data.get("greeting")
        if greeting:
            return greeting

    # Fallback to English if Vietnamese greeting not found
    if locale != DEFAULT_LOCALE:
        return load_greeting(agent_type, DEFAULT_LOCALE)

    return ""


def get_tool_display_names(locale: str = DEFAULT_LOCALE) -> Dict[str, str]:
    """
    Get localized tool display names.

    Args:
        locale: Locale code (for example "en", "vi", or "es")

    Returns:
        Dict mapping tool function names to display names

    Example:
        names = get_tool_display_names("vi")
        # {"get_swot_analysis": "Phân tích SWOT", ...}
    """
    locale = _get_locale_or_default(locale)
    file_path = LOCALES_BASE_PATH / locale / "tools.json"

    data = _load_json_file(str(file_path))

    if not data and locale != DEFAULT_LOCALE:
        # Fallback to English
        return get_tool_display_names(DEFAULT_LOCALE)

    return data


def get_tool_display_name(tool_name: str, locale: str = DEFAULT_LOCALE) -> str:
    """
    Get localized display name for a single tool.

    Args:
        tool_name: Function name (e.g., "get_swot_analysis")
        locale: Locale code

    Returns:
        Localized display name, or formatted function name if not found
    """
    names = get_tool_display_names(locale)

    if tool_name in names:
        return names[tool_name]

    # Fallback: format the function name
    return tool_name.replace("_", " ").replace("get ", "").title()


def get_error_message(key: str, locale: str = DEFAULT_LOCALE, **kwargs) -> str:
    """
    Get localized error message with optional interpolation.

    Args:
        key: Error message key (e.g., "validation.required")
        locale: Locale code
        **kwargs: Variables for interpolation

    Returns:
        Localized error message

    Example:
        msg = get_error_message("validation.required", "vi", field="Email")
        # "Email là bắt buộc"
    """
    locale = _get_locale_or_default(locale)
    file_path = LOCALES_BASE_PATH / locale / "errors.json"

    data = _load_json_file(str(file_path))

    # Navigate nested keys (e.g., "validation.required")
    keys = key.split(".")
    value = data
    for k in keys:
        if isinstance(value, dict):
            value = value.get(k)
        else:
            value = None
            break

    if value is None:
        # Fallback to English if not found
        if locale != DEFAULT_LOCALE:
            return get_error_message(key, DEFAULT_LOCALE, **kwargs)
        return key  # Return the key itself as fallback

    # Interpolate variables
    if kwargs and isinstance(value, str):
        try:
            return value.format(**kwargs)
        except KeyError:
            return value

    return value if isinstance(value, str) else str(value)


def get_all_prompts(locale: str = DEFAULT_LOCALE) -> Dict[str, Dict[str, str]]:
    """
    Load all agent prompts for a locale.

    Useful for batch operations or caching.

    Returns:
        Dict mapping agent_type to prompt data
    """
    locale = _get_locale_or_default(locale)
    prompts_dir = LOCALES_BASE_PATH / locale / "prompts"

    result = {}

    if prompts_dir.exists():
        for file_path in prompts_dir.glob("*.json"):
            agent_type = file_path.stem
            result[agent_type] = _load_json_file(str(file_path))

    return result


def clear_cache():
    """
    Clear the LRU cache for locale files.

    Call this when locale files are updated at runtime.
    """
    _load_json_file.cache_clear()
    logger.info("Locale file cache cleared")


# Convenience functions for common patterns

def format_analyzing_message(tool_names: list, locale: str = DEFAULT_LOCALE) -> str:
    """
    Format the "analyzing" message shown while tools execute.

    Args:
        tool_names: List of tool function names being executed
        locale: Locale code

    Returns:
        Localized message like "I'm analyzing using SWOT Analysis..."
    """
    display_names = [get_tool_display_name(name, locale) for name in tool_names]
    tools_str = ", ".join(display_names)

    if locale == "vi":
        return f"Tôi đang phân tích yêu cầu của bạn bằng {tools_str}..."
    if locale == "es":
        return f"Estoy analizando tu solicitud con {tools_str}..."
    return f"I'm analyzing your request using {tools_str}..."


def format_tool_complete_message(tool_name: str, locale: str = DEFAULT_LOCALE) -> str:
    """
    Format the completion message for a tool.

    Returns:
        Localized message like "✅ SWOT Analysis complete"
    """
    display_name = get_tool_display_name(tool_name, locale)

    if locale == "vi":
        return f"✅ {display_name} hoàn tất\n\n"
    if locale == "es":
        return f"✅ {display_name} completado\n\n"
    return f"✅ {display_name} complete\n\n"


def format_recommendation_intro(locale: str = DEFAULT_LOCALE) -> str:
    """
    Format the intro text before AI recommendations.
    """
    if locale == "vi":
        return "Dựa trên phân tích này, đây là đề xuất của tôi:\n\n"
    if locale == "es":
        return "Segun este analisis, esta es mi recomendacion:\n\n"
    return "Based on this analysis, here's my recommendation:\n\n"
