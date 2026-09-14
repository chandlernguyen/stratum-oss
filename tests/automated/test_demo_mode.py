"""
DEMO_MODE: run the application with no API key, no network calls and no cost.

This is what makes the repository runnable by someone who has just cloned it.
The tests cover the contract the application depends on, not the exact canned
text:

- a client is available with no credentials at all
- sync, async and streaming call shapes all work
- structured output returns JSON that satisfies the requested schema, because
  the agents' extraction flows parse it and prose would break them
- demo output is visibly labelled, so it can never be mistaken for real analysis
"""

import json

import pytest

from apps.api.config.demo_gemini import DEMO_NOTICE, DEMO_TEXT, DemoGeminiClient
from apps.api.config.gemini_client import get_gemini_client, is_demo_mode

CREDENTIAL_VARS = ("GOOGLE_API_KEY", "GEMINI_API_KEY")


@pytest.fixture(autouse=True)
def _clear_cache():
    """get_gemini_client is lru_cached; DEMO_MODE must be re-evaluated per test."""
    get_gemini_client.cache_clear()
    yield
    get_gemini_client.cache_clear()


@pytest.fixture()
def demo(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    for var in CREDENTIAL_VARS:
        monkeypatch.delenv(var, raising=False)
    return get_gemini_client()


# --------------------------------------------------------------- flag parsing
@pytest.mark.parametrize("value", ["1", "true", "TRUE", "yes", "on", " true "])
def test_demo_mode_flag_accepts_common_truthy_values(monkeypatch, value):
    monkeypatch.setenv("DEMO_MODE", value)
    assert is_demo_mode() is True


@pytest.mark.parametrize("value", ["", "0", "false", "no", "off"])
def test_demo_mode_flag_rejects_falsey_values(monkeypatch, value):
    monkeypatch.setenv("DEMO_MODE", value)
    assert is_demo_mode() is False


# ------------------------------------------------------------- client surface
def test_demo_mode_needs_no_credentials(demo):
    assert isinstance(demo, DemoGeminiClient)


def test_without_demo_mode_a_missing_key_still_fails_loudly(monkeypatch):
    """Demo mode must not weaken the real path's configuration error."""
    monkeypatch.delenv("DEMO_MODE", raising=False)
    for var in CREDENTIAL_VARS:
        monkeypatch.delenv(var, raising=False)

    with pytest.raises(ValueError) as exc:
        get_gemini_client()

    message = str(exc.value)
    assert "GOOGLE_API_KEY" in message
    assert "DEMO_MODE" in message, "the error should point at the way out"


def test_sync_generate_content(demo):
    response = demo.models.generate_content(model="gemini-3.8-flash", contents="hi")
    assert DEMO_NOTICE in response.text


@pytest.mark.asyncio
async def test_async_generate_content(demo):
    response = await demo.aio.models.generate_content(
        model="gemini-3.8-flash", contents="hi"
    )
    assert DEMO_NOTICE in response.text


@pytest.mark.asyncio
async def test_streaming_yields_chunks(demo):
    stream = await demo.aio.models.generate_content_stream(
        model="gemini-3.8-flash", contents="hi"
    )
    chunks = [chunk.text async for chunk in stream]

    assert chunks, "streaming must yield at least one chunk"
    assert any(c.strip() for c in chunks)
    # Streaming UIs render progressively; joined chunks must equal the
    # non-streamed text so the two paths behave identically.
    assert "".join(chunks) == DEMO_TEXT


def test_response_never_fabricates_tool_calls(demo):
    """
    The agents' tool loops fall through to text when there are no function calls.
    Fabricating them would make the loop try to execute tools that do not exist.
    """
    response = demo.models.generate_content(model="gemini-3.8-flash", contents="hi")
    calls = [
        part.function_call
        for part in response.candidates[0].content.parts
        if getattr(part, "function_call", None)
    ]
    assert calls == []


# ---------------------------------------------------------- structured output
SCHEMA = {
    "type": "object",
    "required": ["summary", "confidence", "priority"],
    "properties": {
        "summary": {"type": "string"},
        "confidence": {"type": "number"},
        "priority": {"type": "string", "enum": ["high", "medium", "low"]},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
}


class _Config:
    """Stands in for types.GenerateContentConfig for the fields that matter."""

    def __init__(self, mime=None, schema=None):
        self.response_mime_type = mime
        self.response_schema = schema


def test_structured_output_satisfies_the_schema(demo):
    response = demo.models.generate_content(
        model="gemini-3.8-flash",
        contents="analyse",
        config=_Config("application/json", SCHEMA),
    )

    payload = json.loads(response.text)

    for field in SCHEMA["required"]:
        assert field in payload, f"required field {field!r} missing from demo output"

    assert payload["priority"] in SCHEMA["properties"]["priority"]["enum"], (
        "enum values must be honoured or database columns will reject them"
    )
    assert isinstance(payload["confidence"], (int, float))
    assert isinstance(payload["tags"], list)


def test_plain_text_request_returns_prose_not_json(demo):
    response = demo.models.generate_content(
        model="gemini-3.8-flash", contents="hi", config=_Config()
    )
    with pytest.raises(json.JSONDecodeError):
        json.loads(response.text)
