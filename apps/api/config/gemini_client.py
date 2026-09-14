"""
Shared Gemini client accessor.

The client is created on first use rather than at import time.

Constructing it eagerly (typically inside a service's __init__, where the
service is itself a module-level singleton) meant that merely importing the
application required GOOGLE_API_KEY. The result was an import-time crash:

    ValueError: Missing key inputs argument! To use the Google AI API, provide
    (`api_key`) arguments.

which blocks first-run setup, prevents a credential-free demo mode, and gives a
confusing failure instead of an actionable one.

Importing must be free. A missing key should surface when a client is actually
used, naming the variable that is missing.
"""

import logging
import os
from functools import lru_cache

from google import genai

logger = logging.getLogger(__name__)


def is_demo_mode() -> bool:
    """True when the application should use canned model output."""
    return os.getenv("DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}


@lru_cache(maxsize=1)
def get_gemini_client():
    """
    Return a process-wide Gemini client, creating it on first use.

    When DEMO_MODE is enabled, returns a deterministic stand-in that makes no
    network calls and needs no credentials. This is what allows someone to run
    the whole application — all nine agents, agency flows, locale switching —
    without a Gemini key.

    Otherwise both env var names are accepted: GOOGLE_API_KEY is what
    .env.example documents, while GEMINI_API_KEY is what the Gemini API docs and
    CLI use. Parts of this codebase already accept either, so the shared accessor
    does too rather than picking one arbitrarily.

    Cached so repeated access does not rebuild the underlying HTTP client.
    """
    if is_demo_mode():
        logger.warning(
            "DEMO_MODE is enabled: model calls return canned output. "
            "No Gemini API key is required and no cost is incurred. "
            "Unset DEMO_MODE and set GOOGLE_API_KEY for real analysis."
        )
        from apps.api.config.demo_gemini import DemoGeminiClient

        return DemoGeminiClient()

    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "Neither GOOGLE_API_KEY nor GEMINI_API_KEY is set; "
            "cannot create a Gemini client. Set DEMO_MODE=true to run without a key."
        )
    return genai.Client(api_key=api_key)
