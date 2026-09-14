#!/usr/bin/env python
"""
Manual smoke script: Google GenAI direct-API integration.

This is a MANUAL script, not an automated test — it makes live API calls that
cost money and require credentials. Run it directly:

    poetry run python tests/automated/test_gemini_agent.py

It is skipped under pytest. Historically it called exit(1) at import time when
GOOGLE_API_KEY was unset, which raised SystemExit during collection and aborted
the entire test suite with INTERNALERROR — so no backend test could be run
without a live API key.
"""

import asyncio
import os

import pytest
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

from apps.api.config.gemini_models import DEFAULT_MODEL  # noqa: E402

# Model is configurable, matching the rest of the codebase, rather than a
# hardcoded id that the project no longer uses.
MODEL = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)

# Manual script: never run as part of the automated suite.
pytestmark = pytest.mark.skip(
    reason="manual smoke script: makes live Google GenAI API calls"
)

from google import genai  # noqa: E402  (after load_dotenv, intentionally)
from google.genai import types  # noqa: E402


def _get_client() -> genai.Client:
    """Create a client on demand, so importing this module is side-effect free."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY not found in environment; cannot run this smoke script"
        )
    return genai.Client(api_key=api_key)


async def check_simple_generation() -> bool:
    """Simple generation without structured output."""
    try:
        response = await _get_client().aio.models.generate_content(
            model=MODEL,
            contents="What is 2+2?",
            config=types.GenerateContentConfig(
                system_instruction="You are a helpful assistant. Be concise.",
                temperature=0.1,
                max_output_tokens=50,
            ),
        )
        print(f"✅ Simple generation successful: {response.text[:100]}")
        return True
    except Exception as e:
        print(f"❌ Simple generation failed: {e}")
        return False


async def check_structured_output() -> bool:
    """Structured output with a Pydantic schema."""
    from pydantic import BaseModel, Field

    class MathResponse(BaseModel):
        calculation: str = Field(description="The math calculation")
        result: int = Field(description="The numerical result")
        explanation: str = Field(description="Brief explanation")

    try:
        response = await _get_client().aio.models.generate_content(
            model=MODEL,
            contents="Calculate 25 * 4 and explain",
            config=types.GenerateContentConfig(
                system_instruction="You are a math tutor. Provide structured responses.",
                response_mime_type="application/json",
                response_schema=MathResponse,
                temperature=0.1,
            ),
        )

        if getattr(response, "parsed", None):
            parsed = response.parsed
            print("✅ Structured output successful:")
            print(f"   Calculation: {parsed.calculation}")
            print(f"   Result: {parsed.result}")
            print(f"   Explanation: {parsed.explanation}")
        else:
            print(f"✅ Got JSON response: {response.text[:200]}")
        return True
    except Exception as e:
        print(f"❌ Structured output failed: {e}")
        return False


async def check_conversation() -> bool:
    """Conversation with history."""
    try:
        conversation = """User: My name is Alice and I work at TechCorp.
Assistant: Nice to meet you, Alice! How can I help you at TechCorp today?
User: What was my name again?"""

        response = await _get_client().aio.models.generate_content(
            model=MODEL,
            contents=conversation,
            config=types.GenerateContentConfig(
                system_instruction="You are a helpful assistant with good memory.",
                temperature=0.1,
                max_output_tokens=100,
            ),
        )

        if "Alice" in response.text:
            print(f"✅ Conversation memory test successful: {response.text[:100]}")
            return True
        print(
            "⚠️  Conversation test response didn't mention Alice: "
            f"{response.text[:100]}"
        )
        return False
    except Exception as e:
        print(f"❌ Conversation test failed: {e}")
        return False


async def main() -> None:
    print("\n🧪 Testing Google GenAI Direct API Integration\n")
    results = [
        await check_simple_generation(),
        await check_structured_output(),
        await check_conversation(),
    ]
    print("\n" + "=" * 50)
    print(
        "✅ All checks passed!"
        if all(results)
        else "⚠️  Some checks failed. Please review the errors above."
    )
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
