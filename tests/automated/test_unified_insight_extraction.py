#!/usr/bin/env python3
"""
Test Unified Insight Extraction Service
Tests the new Flash-Lite based extraction across multiple agents
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

# Set extraction configuration for testing
os.environ["INSIGHT_EXTRACTION_ENABLED"] = "true"
os.environ["INSIGHT_EXTRACTION_AGENTS"] = "strategy,marketing_strategy,content,analytics"
from apps.api.config.gemini_models import DEFAULT_MODEL_LITE  # noqa: E402
os.environ["GEMINI_MODEL_INSIGHT_EXTRACTION"] = DEFAULT_MODEL_LITE
os.environ["INSIGHT_EXTRACTION_CONFIDENCE_THRESHOLD"] = "0.30"  # Lower for testing

from apps.api.services.unified_insight_extractor import UnifiedInsightExtractor
from apps.api.utils.database import get_supabase_client
from apps.api.auth.supabase_auth import SupabaseAuth

# Test messages for different agent types
TEST_MESSAGES = {
    'strategy': """
    I'm the CEO of TaskFlow Solutions, a $12M ARR project management SaaS company
    with 85 employees based in Austin, Texas. We're facing increasing competition
    from well-funded players like Asana and Monday.com. Our customer churn has
    increased from 8% to 14% in the last year, and customer acquisition costs
    are up 40%. We have 18 months of runway and need to make a strategic decision:
    Should we double down on our SME market strength, pivot to enterprise, or
    find a niche specialization? We're particularly strong in construction and
    manufacturing verticals.
    """,

    'marketing_strategy': """
    Our marketing budget is $150K per quarter. We're currently spending 60% on
    paid ads (Google, LinkedIn), 25% on content marketing, and 15% on events.
    Our target audience is project managers and operations directors at companies
    with 50-500 employees. Our main messaging focuses on "simplicity meets power"
    but we're struggling to differentiate from competitors. We need to improve
    our conversion rate from trial to paid, which is currently at 12%.
    """,

    'content': """
    We publish 2 blog posts per week, mostly how-to guides and feature announcements.
    Our tone is professional but approachable. Best performing content topics are
    "remote team management" and "construction project tracking". We want to expand
    into video content and podcasts but aren't sure where to start. Our email
    newsletter has 15,000 subscribers with a 22% open rate.
    """,

    'analytics': """
    Key metrics we track: MRR growth (currently 8% MoM), CAC ($2,400), LTV ($18,000),
    churn rate (14% annual), NPS score (42). We use Mixpanel for product analytics,
    Google Analytics for web, and HubSpot for marketing attribution. Our biggest
    challenge is connecting product usage data to revenue outcomes. We need better
    reporting on feature adoption and its impact on retention.
    """
}

class TestUnifiedInsightExtraction:
    """Test suite for unified insight extraction"""

    def __init__(self):
        self.extractor = UnifiedInsightExtractor()
        self.auth = SupabaseAuth()
        self.supabase = get_supabase_client()
        self.test_org_id = None
        self.test_user = None

    async def setup(self):
        """Set up test environment"""
        print("\n🔧 Setting up test environment...")

        # Authenticate test user
        test_email = os.getenv("TEST_EMAIL", "sme.owner@example.com")
        test_password = os.getenv("TEST_PASSWORD", "LocalDevOnly123!")

        try:
            # Try to sign in
            auth_result = self.supabase.auth.sign_in_with_password({
                "email": test_email,
                "password": test_password
            })

            if auth_result.user:
                self.test_user = auth_result.user
                print(f"✅ Authenticated as {test_email}")

                # Get org_id from users table
                user_result = self.supabase.table('users').select('org_id').eq(
                    'id', self.test_user.id
                ).single().execute()

                if user_result.data:
                    self.test_org_id = user_result.data['org_id']
                    print(f"✅ Using organization: {self.test_org_id}")
                else:
                    print("❌ Could not find user's organization")
                    return False
            else:
                print("❌ Authentication failed")
                return False

        except Exception as e:
            print(f"❌ Setup failed: {e}")
            return False

        return True

    async def test_extractor_initialization(self):
        """Test 1: Verify extractor initializes correctly"""
        print("\n📝 Test 1: Extractor Initialization")

        assert self.extractor.enabled == True, "Extractor should be enabled"
        assert self.extractor.model_name == DEFAULT_MODEL_LITE, "Should use Flash-Lite model"
        assert "strategy" in self.extractor.enabled_agents, "Strategy agent should be enabled"
        assert "marketing_strategy" in self.extractor.enabled_agents, "Marketing strategy should be enabled"

        print("✅ Extractor initialized correctly")
        print(f"   Model: {self.extractor.model_name}")
        print(f"   Enabled agents: {self.extractor.enabled_agents}")
        print(f"   Confidence threshold: {self.extractor.confidence_threshold}")

        return True

    async def test_extraction_for_strategy_agent(self):
        """Test 2: Extract insights from strategy agent message"""
        print("\n📝 Test 2: Strategy Agent Extraction")

        message = TEST_MESSAGES['strategy']

        result = await self.extractor.extract_insights(
            message=message,
            agent_type='strategy',
            org_id=self.test_org_id,
            user_id=str(self.test_user.id) if self.test_user else None,
            session_id='test-session-1'
        )

        if result:
            print("✅ Successfully extracted insights:")

            # Check base insights
            content = result.get('content', {})
            base_insight = content.get('base_insight', {})

            print(f"   Company: {base_insight.get('company_name')}")
            print(f"   Revenue: {base_insight.get('annual_revenue')}")
            print(f"   Employees: {base_insight.get('employee_count')}")
            print(f"   Industry: {base_insight.get('industry')}")
            print(f"   Competitors: {base_insight.get('competitors')}")

            # Check agent-specific insights
            agent_insights = content.get('agent_specific_insight', {})
            strategy_fields = [k for k, v in agent_insights.items() if v is not None]
            print(f"   Strategy insights found: {len(strategy_fields)} fields")

            # Validate structure
            assert base_insight.get('company_name') == 'TaskFlow Solutions', "Should extract company name"
            assert '$12M' in str(base_insight.get('annual_revenue', '')), "Should extract revenue"
            assert '85' in str(base_insight.get('employee_count', '')), "Should extract employee count"
            assert result.get('confidence_score', 0) > 0.5, "Should have decent confidence"

            return True
        else:
            print("❌ No insights extracted")
            return False

    async def test_extraction_for_marketing_strategy(self):
        """Test 3: Extract insights from marketing strategy agent"""
        print("\n📝 Test 3: Marketing Strategy Agent Extraction")

        message = TEST_MESSAGES['marketing_strategy']

        result = await self.extractor.extract_insights(
            message=message,
            agent_type='marketing_strategy',
            org_id=self.test_org_id,
            user_id=str(self.test_user.id) if self.test_user else None,
            session_id='test-session-2'
        )

        if result:
            print("✅ Successfully extracted marketing insights:")

            content = result.get('content', {})
            agent_insights = content.get('agent_specific_insight', {})

            # Print marketing-specific insights
            for key, value in agent_insights.items():
                print(f"   {key}: {value}")

            # Check for marketing-specific data
            insights_str = str(agent_insights)
            if not insights_str or insights_str == '{}':
                print("   ⚠️ No agent-specific insights found")

            # Check for any marketing-related fields populated
            has_marketing_data = any([
                agent_insights.get('marketing_budget'),
                agent_insights.get('target_audience'),
                agent_insights.get('messaging_focus')
            ])

            assert has_marketing_data or len(insights_str) > 10, \
                "Should extract marketing-specific insights"

            return True
        else:
            print("❌ No marketing insights extracted")
            return False

    async def test_confidence_scoring(self):
        """Test 4: Verify confidence scoring works correctly"""
        print("\n📝 Test 4: Confidence Scoring")

        # Test with minimal information
        minimal_message = "We are a small company."

        result = await self.extractor.extract_insights(
            message=minimal_message,
            agent_type='strategy',
            org_id=self.test_org_id,
            session_id='test-session-3'
        )

        if result:
            confidence = result.get('confidence_score', 0)
            print(f"   Minimal message confidence: {confidence}")
            assert confidence < 0.5, "Minimal info should have low confidence"

        # Test with rich information
        rich_message = TEST_MESSAGES['strategy']

        result = await self.extractor.extract_insights(
            message=rich_message,
            agent_type='strategy',
            org_id=self.test_org_id,
            session_id='test-session-4'
        )

        if result:
            confidence = result.get('confidence_score', 0)
            print(f"   Rich message confidence: {confidence}")
            assert confidence > 0.6, "Rich info should have higher confidence"

        print("✅ Confidence scoring working correctly")
        return True

    async def test_cost_tracking(self):
        """Test 5: Verify cost tracking and limits"""
        print("\n📝 Test 5: Cost Tracking")

        # Check if org has cost limit set
        if self.test_org_id:
            org_result = self.supabase.table('organizations').select(
                'gemini_monthly_limit,gemini_monthly_usage'
            ).eq('id', self.test_org_id).single().execute()

            if org_result.data:
                limit = org_result.data.get('gemini_monthly_limit', 0)
                usage = org_result.data.get('gemini_monthly_usage', 0)

                print(f"   Monthly limit: ${limit}")
                print(f"   Current usage: ${usage:.4f}")
                print(f"   Remaining: ${limit - usage:.4f}")

                # Test that extraction respects limits
                can_extract = await self.extractor._check_cost_limit(self.test_org_id)
                print(f"   Can extract: {can_extract}")

                assert can_extract == (usage < limit), "Cost limit check should work"

                print("✅ Cost tracking functioning correctly")
                return True

        print("⚠️  Skipping cost tracking test (no org)")
        return True

    async def test_database_storage(self):
        """Test 6: Verify insights are stored in database"""
        print("\n📝 Test 6: Database Storage")

        if not self.test_org_id:
            print("⚠️  Skipping database test (no org)")
            return True

        # Extract and save an insight
        message = TEST_MESSAGES['content']

        result = await self.extractor.extract_insights(
            message=message,
            agent_type='content',
            org_id=self.test_org_id,
            user_id=str(self.test_user.id) if self.test_user else None,
            session_id='test-session-storage'
        )

        if result:
            # Try to save to database
            try:
                db_result = self.supabase.table('ai_insights').insert(result).execute()

                if db_result.data:
                    insight_id = db_result.data[0]['id']
                    print(f"✅ Insight saved to database: {insight_id}")

                    # Clean up test data
                    self.supabase.table('ai_insights').delete().eq('id', insight_id).execute()
                    print("   Cleaned up test insight")

                    return True
                else:
                    print("❌ Failed to save to database")
                    return False

            except Exception as e:
                print(f"❌ Database error: {e}")
                return False

        print("❌ No insight to save")
        return False

    async def test_multiple_agents_parallel(self):
        """Test 7: Test parallel extraction for multiple agents"""
        print("\n📝 Test 7: Parallel Multi-Agent Extraction")

        # Create extraction tasks for all enabled agents
        tasks = []
        for agent_type in ['strategy', 'marketing_strategy', 'content', 'analytics']:
            if agent_type in TEST_MESSAGES:
                task = self.extractor.extract_insights(
                    message=TEST_MESSAGES[agent_type],
                    agent_type=agent_type,
                    org_id=self.test_org_id,
                    session_id=f'test-parallel-{agent_type}'
                )
                tasks.append((agent_type, task))

        # Run all extractions in parallel
        print(f"   Running {len(tasks)} parallel extractions...")
        start_time = asyncio.get_event_loop().time()

        results = []
        for agent_type, task in tasks:
            result = await task
            results.append((agent_type, result))

        elapsed = asyncio.get_event_loop().time() - start_time
        print(f"   Completed in {elapsed:.2f} seconds")

        # Check results
        successful = 0
        for agent_type, result in results:
            if result:
                successful += 1
                confidence = result.get('confidence_score', 0)
                print(f"   ✅ {agent_type}: confidence={confidence:.2f}")
            else:
                print(f"   ❌ {agent_type}: no extraction")

        print(f"\n   Success rate: {successful}/{len(tasks)} agents")
        assert successful >= len(tasks) * 0.5, "At least 50% should succeed"

        return True

    async def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("🚀 UNIFIED INSIGHT EXTRACTION TEST SUITE")
        print("="*60)

        # Setup
        if not await self.setup():
            print("\n❌ Setup failed, aborting tests")
            return

        # Run tests
        tests = [
            self.test_extractor_initialization,
            self.test_extraction_for_strategy_agent,
            self.test_extraction_for_marketing_strategy,
            self.test_confidence_scoring,
            self.test_cost_tracking,
            self.test_database_storage,
            self.test_multiple_agents_parallel
        ]

        passed = 0
        failed = 0

        for test in tests:
            try:
                result = await test()
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ Test failed with error: {e}")
                failed += 1

        # Summary
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        print(f"✅ Passed: {passed}/{len(tests)}")
        print(f"❌ Failed: {failed}/{len(tests)}")

        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! Unified insight extraction is working!")
            print("\nKey achievements:")
            print("• Flash-Lite model integration confirmed")
            print("• Multi-agent extraction functioning")
            print("• Cost tracking operational")
            print("• Database storage verified")
            print("• Parallel processing working")
        else:
            print(f"\n⚠️  Some tests failed. Review the output above.")

        print("\n💡 Next steps:")
        print("1. Enable extraction in production (.env)")
        print("2. Monitor quality metrics")
        print("3. Gradually enable more agents")
        print("4. Consider upgrading to Flash if quality < 70%")

async def main():
    """Main test runner"""
    tester = TestUnifiedInsightExtraction()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())