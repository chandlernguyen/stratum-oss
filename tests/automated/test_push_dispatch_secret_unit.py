"""
The push-dispatch endpoint's shared secret must not ship as a known placeholder.

The template ships ``PUSH_DISPATCH_SECRET="replace-with-a-long-random-secret"``.
If the API accepted that value, every deployment that copied the template
verbatim — which is exactly what the documented setup does — would share the
same secret, and the internal dispatch endpoint would be effectively open. The
placeholder is therefore treated as "not configured".
"""

import pytest
from fastapi import HTTPException

from apps.api.routers.mobile_push import require_dispatch_secret

PLACEHOLDER = "replace-with-a-long-random-secret"


def test_placeholder_is_treated_as_unconfigured(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", PLACEHOLDER)
    with pytest.raises(HTTPException) as caught:
        require_dispatch_secret(PLACEHOLDER)
    assert caught.value.status_code == 503


def test_missing_secret_is_unconfigured(monkeypatch):
    monkeypatch.delenv("PUSH_DISPATCH_SECRET", raising=False)
    with pytest.raises(HTTPException) as caught:
        require_dispatch_secret("anything")
    assert caught.value.status_code == 503


def test_configured_secret_accepts_a_matching_header(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "a-real-random-value")
    require_dispatch_secret("a-real-random-value")


def test_configured_secret_rejects_a_mismatch(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "a-real-random-value")
    with pytest.raises(HTTPException) as caught:
        require_dispatch_secret("wrong")
    assert caught.value.status_code == 401
