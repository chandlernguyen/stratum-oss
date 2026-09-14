"""
The AI rate limiter, now shared rather than buried in the direct-agents router.

It is what stops one caller from driving unbounded Gemini spend, so it needs to
be reachable from every model endpoint and to behave predictably at its limit.
"""

import asyncio

import pytest
from fastapi import HTTPException

import apps.api.middleware.ai_rate_limit as rate_limit


def test_allows_up_to_the_limit_then_denies(monkeypatch):
    monkeypatch.setattr(rate_limit, "AI_RATE_LIMIT_ENABLED", True)
    rate_limit.rate_limit_store.clear()

    for _ in range(rate_limit.AI_RATE_LIMIT_REQUESTS):
        assert rate_limit.check_ai_rate_limit("user-limit") is True

    assert rate_limit.check_ai_rate_limit("user-limit") is False


def test_dependency_raises_429_once_exceeded(monkeypatch):
    monkeypatch.setattr(rate_limit, "AI_RATE_LIMIT_ENABLED", True)
    rate_limit.rate_limit_store.clear()

    for _ in range(rate_limit.AI_RATE_LIMIT_REQUESTS):
        rate_limit.check_ai_rate_limit("user-429")

    with pytest.raises(HTTPException) as caught:
        asyncio.run(rate_limit.enforce_ai_rate_limit({"id": "user-429"}))

    assert caught.value.status_code == 429


def test_limits_are_per_user(monkeypatch):
    monkeypatch.setattr(rate_limit, "AI_RATE_LIMIT_ENABLED", True)
    rate_limit.rate_limit_store.clear()

    for _ in range(rate_limit.AI_RATE_LIMIT_REQUESTS):
        rate_limit.check_ai_rate_limit("user-a")

    # A different user is unaffected.
    assert rate_limit.check_ai_rate_limit("user-b") is True


def test_disabled_always_allows(monkeypatch):
    monkeypatch.setattr(rate_limit, "AI_RATE_LIMIT_ENABLED", False)

    for _ in range(rate_limit.AI_RATE_LIMIT_REQUESTS + 5):
        assert rate_limit.check_ai_rate_limit("user-disabled") is True
