"""
Gemini 3.8 Flash requires every function result to carry the call id.

`types.Part.from_function_response()` cannot express the id — it accepts only
name/response/parts — so `build_function_response_part()` constructs the part
directly.

This matters because the failure mode is silent: the manual tool loop still
builds a well-formed request, the SDK does not complain, and the *following*
turn fails in a way that reads as model flakiness rather than a missing field.
The codebase disables automatic function calling in seven places and drives the
loop itself, so this path is the only one that builds tool results.
"""

from google.genai import types

from apps.api.agents.base_gemini_agent import build_function_response_part

CALL_ID = "call-abc-123"


def _function_call(name: str = "get_swot_analysis", call_id: str | None = CALL_ID):
    return types.FunctionCall(name=name, args={}, id=call_id)


def test_function_response_carries_the_call_id():
    """The regression: an id-less part is rejected on 3.8 Flash."""
    part = build_function_response_part(_function_call(), {"ok": True})

    assert part.function_response is not None
    assert part.function_response.id == CALL_ID


def test_function_response_carries_name_and_payload():
    part = build_function_response_part(
        _function_call(name="get_persona_context"), {"data": 1}
    )

    response = part.function_response
    assert response.name == "get_persona_context"
    assert response.response == {"result": {"data": 1}}


def test_missing_id_is_tolerated_but_preserved_as_none():
    """
    Older models may omit the id. We should not crash, but the absence must be
    visible rather than silently substituted with a fabricated value.
    """
    part = build_function_response_part(_function_call(call_id=None), "result")

    assert part.function_response.id is None
    assert part.function_response.name == "get_swot_analysis"
