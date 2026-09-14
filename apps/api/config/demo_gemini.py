"""
Deterministic stand-in for the Gemini client, used when DEMO_MODE is enabled.

Purpose: let someone run the whole application — all nine agents, the agency
client-scoped flows, the locale switcher — with no API key, no network calls and
no cost. It returns clearly-labelled canned output rather than pretending to be a
model.

Design notes:

- It mimics only the surface this codebase uses: `client.models.generate_content`
  (sync), `client.aio.models.generate_content` (async) and
  `client.aio.models.generate_content_stream` (async iterator).
- Structured output is supported by generating a minimal value that satisfies the
  supplied JSON Schema, because the agents use `response_schema` +
  `response_mime_type="application/json"` for extraction flows. Returning prose
  there would break their parsers.
- It never returns function calls. That is deliberate: the agents' tool loops
  then fall through to the text path, which is enough to exercise the UI without
  fabricating tool results.
- Output is prefixed with a visible notice so demo content can never be mistaken
  for real analysis.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Optional

logger = logging.getLogger(__name__)

DEMO_NOTICE = "[DEMO MODE]"

DEMO_TEXT = (
    f"{DEMO_NOTICE} This is canned output. DEMO_MODE is enabled, so no model was "
    "called and no API key is required. Set DEMO_MODE=false and provide "
    "GOOGLE_API_KEY to run real analysis."
)

_MAX_SCHEMA_DEPTH = 6


def _placeholder_for(schema: Any, depth: int = 0) -> Any:
    """
    Build a minimal example value satisfying a JSON Schema fragment.

    Enough for the agents' extraction flows to parse successfully. Enum values are
    honoured because database enum columns reject anything else.
    """
    if depth > _MAX_SCHEMA_DEPTH or not isinstance(schema, dict):
        return None

    if schema.get("enum"):
        return schema["enum"][0]

    if "const" in schema:
        return schema["const"]

    schema_type = schema.get("type")
    if isinstance(schema_type, list):
        schema_type = next((t for t in schema_type if t != "null"), None)

    if schema_type == "object" or "properties" in schema:
        properties = schema.get("properties", {}) or {}
        # Fill every declared property, not only the required ones: agent code
        # reads optional fields directly and would raise KeyError on a strictly
        # minimal object.
        return {
            key: _placeholder_for(sub_schema, depth + 1)
            for key, sub_schema in properties.items()
        }

    if schema_type == "array":
        item = _placeholder_for(schema.get("items", {}), depth + 1)
        return [item] if item is not None else []

    if schema_type == "string":
        return f"{DEMO_NOTICE} sample"
    if schema_type == "integer":
        return 0
    if schema_type == "number":
        return 0.0
    if schema_type == "boolean":
        return True

    return None


class _DemoPart:
    """A response part. Never carries a function_call, by design."""

    def __init__(self, text: Optional[str] = None):
        self.text = text
        self.function_call = None


class _DemoContent:
    def __init__(self, parts):
        self.role = "model"
        self.parts = parts


class _DemoCandidate:
    def __init__(self, parts):
        self.content = _DemoContent(parts)
        self.finish_reason = "STOP"


class _DemoUsage:
    prompt_token_count = 0
    candidates_token_count = 0
    thoughts_token_count = None
    total_token_count = 0


class _DemoResponse:
    def __init__(self, text: str, parsed: Any = None):
        self.text = text
        self.parsed = parsed
        self.candidates = [_DemoCandidate([_DemoPart(text)])]
        self.usage_metadata = _DemoUsage()


def _build_response(config: Any) -> _DemoResponse:
    """Honour structured-output requests, otherwise return prose."""
    mime = getattr(config, "response_mime_type", None) if config else None
    schema = getattr(config, "response_schema", None) if config else None

    if mime == "application/json" and schema:
        payload = _placeholder_for(schema)
        return _DemoResponse(json.dumps(payload), parsed=payload)

    return _DemoResponse(DEMO_TEXT)


class _DemoModels:
    """Mirrors google.genai's models surface for the calls this project makes."""

    def generate_content(self, *, model=None, contents=None, config=None, **_):
        logger.debug("%s sync generate_content for model=%s", DEMO_NOTICE, model)
        return _build_response(config)


async def _stream_words(text: str) -> AsyncIterator[_DemoResponse]:
    """Yield text in word-sized chunks so streaming UIs render progressively."""
    words = str(text).split(" ")
    for index, word in enumerate(words):
        suffix = "" if index == len(words) - 1 else " "
        yield _DemoResponse(word + suffix)


class _DemoAsyncModels(_DemoModels):
    async def generate_content(self, *, model=None, contents=None, config=None, **_):
        logger.debug("%s async generate_content for model=%s", DEMO_NOTICE, model)
        return _build_response(config)

    async def generate_content_stream(
        self, *, model=None, contents=None, config=None, **_
    ) -> AsyncIterator[_DemoResponse]:
        """
        Awaitable that RESOLVES TO an async iterator, matching the real SDK.

        Callers write `stream = await client...generate_content_stream(...)` then
        `async for chunk in stream`. An async generator function would return the
        generator directly and break that await.
        """
        logger.debug("%s stream for model=%s", DEMO_NOTICE, model)
        return _stream_words(_build_response(config).text)


class _DemoAio:
    def __init__(self):
        self.models = _DemoAsyncModels()


class DemoGeminiClient:
    """Drop-in replacement for genai.Client when DEMO_MODE is enabled."""

    def __init__(self):
        self.models = _DemoModels()
        self.aio = _DemoAio()

    # Attributes the real client exposes that callers may feature-detect.
    def __getattr__(self, name: str):
        raise AttributeError(
            f"DemoGeminiClient does not implement {name!r}. DEMO_MODE supports "
            "only the models surface used by this application."
        )
