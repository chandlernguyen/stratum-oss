"""
Agents must survive the SDK's deep copy of the request config.

google-genai 2.x calls ``config.model_copy(deep=True)`` inside
``generate_content_stream``. The config carries the agent's tools, which are
*bound methods* of the agent, so a deep copy recurses into the agent and its
genai client and hits the client's threading lock:

    TypeError: cannot pickle '_thread.RLock' object

That failed the first model turn for every real (non-DEMO_MODE) agent run — the
demo client never reaches the SDK, which is why it went unnoticed.
"""

import pytest
from google.genai import types

from apps.api.agents.direct_strategy_agent import DirectStrategyAgent


def test_agent_deepcopy_returns_itself():
    import copy

    agent = DirectStrategyAgent()
    assert copy.deepcopy(agent) is agent


def test_generation_config_with_tool_callables_can_be_deep_copied():
    agent = DirectStrategyAgent()

    # Raw callables, exactly as _get_agent_tools() provides them.
    config = types.GenerateContentConfig(tools=[agent.get_swot_analysis])

    # This is what google-genai 2.x does internally on every stream request.
    copied = config.model_copy(deep=True)

    assert copied is not config
