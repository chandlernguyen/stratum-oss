"""
Locale Middleware for STRAŦUM API

Extracts locale from:
1. X-Locale header (explicit)
2. Accept-Language header (browser default)
3. Falls back to 'en'

Sets request.state.locale for use by agents and services.
"""

import logging
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from apps.api.locales.registry import DEFAULT_LOCALE, normalize_locale

logger = logging.getLogger(__name__)


def parse_accept_language(header: str) -> Optional[str]:
    """
    Parse Accept-Language header and return best matching locale.

    Examples:
        "vi-VN,vi;q=0.9,en;q=0.8" -> "vi"
        "en-US,en;q=0.9" -> "en"
        "fr-FR,fr;q=0.9" -> None (not supported)
    """
    if not header:
        return None

    # Parse languages with quality values
    languages = []
    for part in header.split(","):
        part = part.strip()
        if ";q=" in part:
            lang, q = part.split(";q=")
            try:
                quality = float(q)
            except ValueError:
                quality = 1.0
        else:
            lang = part
            quality = 1.0

        languages.append((lang, quality))

    # Sort by quality descending
    languages.sort(key=lambda x: x[1], reverse=True)

    # Find first supported locale
    for lang, _ in languages:
        normalized = normalize_locale(lang)
        if normalized:
            return normalized

    return None


class LocaleMiddleware(BaseHTTPMiddleware):
    """
    Middleware to extract and set locale for each request.

    Priority:
    1. X-Locale header (explicit override)
    2. Accept-Language header (browser preference)
    3. Default to 'en'
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Priority 1: Explicit X-Locale header
        locale = request.headers.get("X-Locale", "")

        normalized_locale = normalize_locale(locale)
        if normalized_locale:
            request.state.locale = normalized_locale
            logger.debug(f"Locale from X-Locale header: {normalized_locale}")
        else:
            # Priority 2: Accept-Language header
            accept_language = request.headers.get("Accept-Language", "")
            parsed_locale = parse_accept_language(accept_language)

            if parsed_locale:
                request.state.locale = parsed_locale
                logger.debug(f"Locale from Accept-Language: {parsed_locale}")
            else:
                # Priority 3: Default
                request.state.locale = DEFAULT_LOCALE
                logger.debug(f"Using default locale: {DEFAULT_LOCALE}")

        response = await call_next(request)
        return response


def get_locale_from_request(request: Request) -> str:
    """
    Helper to get locale from request state.

    Safe to call even if middleware didn't run.
    """
    return getattr(request.state, "locale", DEFAULT_LOCALE)
