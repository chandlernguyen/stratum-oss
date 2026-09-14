"""
Structured extraction across agent types.

The extractor calls Gemini, so this needs a real model: it is skipped unless
RUN_LIVE_MODEL_TESTS=1 (with DEMO_MODE=false and a key), the same gate the E2E
content specs use. Adapted from the private repository, where this was a
print-only script with no assertions.
"""

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_MODEL_TESTS") != "1",
    reason="needs a live model; set RUN_LIVE_MODEL_TESTS=1 with DEMO_MODE=false and a key",
)

# One representative response per agent that has an extraction schema. The
# analytics/roi_budget/quick_wins schemas remain but those agents were removed.
SAMPLE_CONTENT = {
    "strategy": (
        "SWOT analysis: Strengths include fast onboarding and a modern UI; "
        "weaknesses are limited brand awareness. Opportunities: an underserved "
        "mid-market. Threats: incumbent bundling. Recommend focusing on "
        "mid-market specialty subcontractors."
    ),
    "persona": (
        "Primary persona: Operations Manager, 35-50, at construction "
        "subcontractors with 20-100 staff. Goals: reduce manual admin. Pain "
        "points: Excel and WhatsApp. Buying behaviour: values fast "
        "time-to-value and clear ROI."
    ),
    "content": (
        "Blog post draft: 'Automating Construction Workflows'. Target keyword: "
        "construction workflow automation. Outline: intro, three benefits, CTA. "
        "Tone: practical. Suggested channels: blog and LinkedIn."
    ),
    "marketing_strategy": (
        "Channel plan: LinkedIn for demand generation, Google Search for "
        "high-intent queries, webinars for the mid-funnel. Budget split 40/40/20. "
        "Messaging: 'zero-training field adoption'. KPIs: 50 MQLs per month."
    ),
    "campaign_planning": (
        "Campaign 'Q4 Subcontractor Push': objective 50 leads per month, "
        "audience mid-market subcontractors, channels LinkedIn and email, budget "
        "$40k, timeline 12 weeks, success metric CAC under $500."
    ),
    "competitive_intelligence": (
        "Competitors: Procore (enterprise, high cost), Autodesk Construction "
        "Cloud (bundled), Buildertrend (SMB). Differentiation: faster "
        "time-to-value and lower TCO. Gap: mid-market specialty subcontractors."
    ),
    "client_success": (
        "Client health: onboarding complete, product adoption 60%, NPS 42, three "
        "open support tickets. Risk: low field usage. Recommendation: schedule "
        "a training session and check in with the champion."
    ),
}


@pytest.mark.asyncio
async def test_extraction_returns_structured_data_for_each_agent():
    from apps.api.services.structured_extractor import create_structured_extractor

    extractor = create_structured_extractor(os.environ["GOOGLE_API_KEY"])

    failures = {}
    for agent_type, content in SAMPLE_CONTENT.items():
        result = await extractor.extract(agent_type, content)
        if result.get("extraction_status") != "success" or not result.get("structured_data"):
            failures[agent_type] = result.get("extraction_status") or result

    assert not failures, f"extraction did not return structured data: {failures}"
