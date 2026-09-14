#!/usr/bin/env python3
"""
Test Hybrid Insight Extraction with Agent-Specific Schemas
Tests the enhanced extraction with tailored schemas for each agent
"""

import os
import sys
import asyncio
import json
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
env_path = project_root / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configure for hybrid testing
os.environ["INSIGHT_EXTRACTION_ENABLED"] = "true"
os.environ["INSIGHT_EXTRACTION_HYBRID_MODE"] = "true"
os.environ["INSIGHT_EXTRACTION_AGENTS"] = "strategy,marketing_strategy,persona,content"
from apps.api.config.gemini_models import DEFAULT_MODEL_LITE  # noqa: E402
os.environ["GEMINI_MODEL_INSIGHT_EXTRACTION"] = DEFAULT_MODEL_LITE
os.environ["INSIGHT_EXTRACTION_CONFIDENCE_THRESHOLD"] = "0.30"

from apps.api.services.unified_insight_extractor import UnifiedInsightExtractor

# Test messages tailored for each agent
TEST_MESSAGES = {
    'strategy': """
    We're TaskFlow Solutions, a $12M ARR SaaS company with 85 employees.
    Our strategic goal is to become the #1 project management tool for construction companies
    by 2026. We have a competitive advantage in our industry-specific features like
    blueprint integration and materials tracking. Our main risk is that Procore might
    enter our market segment. We're resource-constrained on engineering talent and have
    18 months of runway. Our strategic priorities are: 1) Expand to electrical contractors,
    2) Build mobile-first experience, 3) Achieve SOC2 compliance.
    """,

    'marketing_strategy': """
    Our marketing budget is $150K per quarter. We target project managers and operations
    directors at construction companies with 50-500 employees. Our value proposition is
    "Built by contractors, for contractors" and we position ourselves as the specialist
    alternative to generic tools. We use 60% paid search, 25% content marketing, and
    15% trade shows. Our main messaging themes are efficiency, compliance, and ROI.
    Current conversion from trial to paid is 12% and we aim to reach 20% by Q2.
    """,

    'persona': """
    Our primary customer segment is construction project managers aged 35-50, mostly male,
    located in Texas, California, and Florida. They value practicality over aesthetics,
    are skeptical of new technology, but frustrated with Excel and paper-based systems.
    Their main pain points are tracking multiple job sites, managing subcontractors, and
    regulatory compliance. They buy when they lose a bid due to poor cost estimates or
    face compliance issues. Decision process involves free trial, team evaluation, then
    C-suite approval. They prefer phone and email over chat support.
    """,

    'content': """
    We publish 2 blog posts weekly, 1 case study monthly, and a quarterly industry report.
    Our publishing cadence is Tuesday/Thursday for blogs. Content themes include
    construction tech trends, compliance guides, and project management tips. Our tone
    is professional but approachable - we avoid jargon and use construction metaphors.
    We distribute through our blog, LinkedIn, and industry publications like ENR and
    Constructor Magazine. Content goals are thought leadership and SEO traffic.
    We measure success through organic traffic (currently 45K/month) and content-attributed
    trials (22% of all trials).
    """
}

async def test_hybrid_extraction():
    """Test hybrid extraction for multiple agents"""
    extractor = UnifiedInsightExtractor()

    print("\n" + "="*60)
    print("🚀 TESTING HYBRID INSIGHT EXTRACTION")
    print("="*60)
    print(f"Mode: {'Hybrid' if extractor.use_hybrid_extraction else 'Generic'}")
    print(f"Model: {extractor.model_name}")
    print(f"Enabled agents: {extractor.enabled_agents}")
    print()

    results = {}

    for agent_type, message in TEST_MESSAGES.items():
        print(f"\n📝 Testing {agent_type.upper()} Agent")
        print("-" * 40)

        result = await extractor.extract_insights(
            message=message,
            agent_type=agent_type,
            org_id='test-org-' + agent_type,
            session_id=f'test-session-{agent_type}'
        )

        if result:
            content = result.get('content', {})
            base_insight = content.get('base_insight', {})
            agent_insight = content.get('agent_specific_insight', {})
            confidence = result.get('confidence_score', 0)

            print(f"✅ Extraction successful (confidence: {confidence})")

            # Show base insights
            print("\n🏢 Base Business Context:")
            for key, value in base_insight.items():
                if value:
                    print(f"  • {key}: {value}")

            # Show agent-specific insights
            print(f"\n🎯 {agent_type.title()}-Specific Insights:")
            for key, value in agent_insight.items():
                if value:
                    print(f"  • {key}: {value}")

            # Count populated fields
            base_count = sum(1 for v in base_insight.values() if v)
            agent_count = sum(1 for v in agent_insight.values() if v)
            print(f"\n📊 Field Coverage: {base_count} base + {agent_count} specific = {base_count + agent_count} total")

            results[agent_type] = {
                'success': True,
                'confidence': confidence,
                'base_fields': base_count,
                'agent_fields': agent_count
            }
        else:
            print("❌ Extraction failed or below confidence threshold")
            results[agent_type] = {'success': False}

    # Summary
    print("\n" + "="*60)
    print("📊 HYBRID EXTRACTION SUMMARY")
    print("="*60)

    successful = sum(1 for r in results.values() if r.get('success'))
    print(f"Success rate: {successful}/{len(TEST_MESSAGES)} agents")

    for agent, stats in results.items():
        if stats.get('success'):
            print(f"  ✅ {agent}: confidence={stats['confidence']:.2f}, "
                  f"fields={stats['base_fields']}+{stats['agent_fields']}")
        else:
            print(f"  ❌ {agent}: failed")

    # Recommendations
    print("\n💡 Recommendations:")
    avg_confidence = sum(r.get('confidence', 0) for r in results.values() if r.get('success')) / max(successful, 1)
    if avg_confidence >= 0.7:
        print("  • Extraction quality is good - ready for production")
    elif avg_confidence >= 0.5:
        print("  • Extraction quality is acceptable - monitor and iterate")
    else:
        print("  • Consider upgrading to standard Flash model for better quality")

    if successful < len(TEST_MESSAGES) * 0.75:
        print("  • Some agents failing - review prompts and schemas")

    print("\n✨ Hybrid approach benefits:")
    print("  • Agent-specific fields capture domain expertise")
    print("  • Tailored prompts improve extraction relevance")
    print("  • Weighted confidence reflects agent priorities")

if __name__ == "__main__":
    asyncio.run(test_hybrid_extraction())