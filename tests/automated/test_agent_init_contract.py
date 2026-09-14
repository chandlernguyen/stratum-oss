"""
Every agent the chat router can build must accept the arguments it passes.

The router calls ``agent.__ainit__(org_id=..., user_id=..., campaign_id=...,
org_type=..., client_id=..., locale=...)``. When one agent's signature drifts,
the failure is a 500 on that agent's chat endpoint at runtime, not at import —
which is exactly how the Quick Start onboarding agent broke in DEMO_MODE.
"""

import inspect

from apps.api.routers.direct_agents import AGENT_MAP

ROUTER_KWARGS = {"org_id", "user_id", "campaign_id", "org_type", "client_id", "locale"}

# Consolidated into performance_intelligence and removed; see ARCHITECTURE.md.
DEPRECATED_AGENTS = {"analytics", "roi_budget", "quick_wins"}


def test_deprecated_agents_are_not_registered():
    assert not (DEPRECATED_AGENTS & set(AGENT_MAP)), (
        "these agents were consolidated into performance_intelligence and should "
        "not be reachable; leaving them registered exposes endpoints that fail "
        "under DEMO_MODE"
    )


def test_every_agent_accepts_the_router_kwargs():
    gaps = {}
    for name, agent_class in AGENT_MAP.items():
        parameters = inspect.signature(agent_class.__ainit__).parameters
        if any(p.kind is inspect.Parameter.VAR_KEYWORD for p in parameters.values()):
            continue
        missing = ROUTER_KWARGS - set(parameters)
        if missing:
            gaps[name] = sorted(missing)

    assert not gaps, (
        "these agents would raise TypeError on the router's __ainit__ call: "
        f"{gaps}"
    )
