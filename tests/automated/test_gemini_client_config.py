"""
Unit tests for the shared Gemini client accessor.

No network calls are made: genai.Client(api_key=...) constructs without
contacting the API, so these exercise key resolution and caching only.
"""

import pytest

from apps.api.config.gemini_client import get_gemini_client


@pytest.fixture(autouse=True)
def _clear_client_cache():
    """lru_cache would otherwise leak state between tests."""
    get_gemini_client.cache_clear()
    yield
    get_gemini_client.cache_clear()


def test_accepts_google_api_key(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "dummy-google")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert get_gemini_client() is not None


def test_falls_back_to_gemini_api_key(monkeypatch):
    """GEMINI_API_KEY is what the Gemini API docs and CLI use."""
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-gemini")
    assert get_gemini_client() is not None


def test_missing_key_names_both_variables(monkeypatch):
    """The error must tell you which variables would have worked."""
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(ValueError) as exc:
        get_gemini_client()

    message = str(exc.value)
    assert "GOOGLE_API_KEY" in message
    assert "GEMINI_API_KEY" in message


def test_client_is_cached(monkeypatch):
    """Repeated access returns the same client rather than rebuilding it."""
    monkeypatch.setenv("GOOGLE_API_KEY", "dummy")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    assert get_gemini_client() is get_gemini_client()
