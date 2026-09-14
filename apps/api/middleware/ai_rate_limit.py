"""
User-based rate limiting for AI (model-calling) endpoints.

The limiter lived inside the direct-agents router, so only chat and file upload
were throttled; every other endpoint that reaches Gemini was not. It is shared
here so a route can enforce it with one dependency.

It is an in-process store: correct for a single worker, and deliberately simple.
A multi-instance deployment should move the store to Redis.
"""

import os
from datetime import UTC, datetime
from typing import Dict, List

from fastapi import Depends, HTTPException, status

from apps.api.auth.supabase_auth import get_current_user

AI_RATE_LIMIT_REQUESTS = int(os.getenv("AI_RATE_LIMIT_REQUESTS", "10"))
AI_RATE_LIMIT_WINDOW = int(os.getenv("AI_RATE_LIMIT_WINDOW", "60"))
AI_RATE_LIMIT_ENABLED = os.getenv("AI_RATE_LIMIT_ENABLED", "true").strip().lower() not in {
    "0",
    "false",
    "no",
    "off",
}

# user_id -> request timestamps
rate_limit_store: Dict[str, List[datetime]] = {}


def check_ai_rate_limit(
    user_id: str,
    max_requests: int = AI_RATE_LIMIT_REQUESTS,
    window_seconds: int = AI_RATE_LIMIT_WINDOW,
) -> bool:
    """Return True if within the limit, False if exceeded.

    Returns True unconditionally when AI_RATE_LIMIT_ENABLED is false, which is
    how integration suites (which legitimately burst from one seeded user) opt
    out. The production default is 10 requests per minute per user.
    """
    if not AI_RATE_LIMIT_ENABLED:
        return True

    now = datetime.now(UTC)

    if user_id in rate_limit_store:
        rate_limit_store[user_id] = [
            ts
            for ts in rate_limit_store[user_id]
            if (now - ts).total_seconds() < window_seconds
        ]
    else:
        rate_limit_store[user_id] = []

    if len(rate_limit_store[user_id]) >= max_requests:
        return False

    rate_limit_store[user_id].append(now)
    return True


async def enforce_ai_rate_limit(user: Dict = Depends(get_current_user)) -> None:
    """FastAPI dependency: 429 when the caller exceeds the AI request limit."""
    user_id = str(user.get("id") or user.get("user_id") or "")
    if not check_ai_rate_limit(user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded. Maximum {AI_RATE_LIMIT_REQUESTS} requests "
                "per minute. Please try again later."
            ),
        )
