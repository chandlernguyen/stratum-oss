"""
Performance Intelligence Agent - Comprehensive Automated Test Suite

Tests the unified Performance Intelligence agent which consolidates:
- ROI & Budget Agent functionality
- Quick Wins Agent functionality
- Analytics Agent functionality

Test Coverage:
1. Agent initialization and enterprise context loading
2. Performance analysis tool (comprehensive, ROI, conversion focus)
3. ROI calculation with various scenarios
4. Quick wins identification across challenge areas
5. Budget optimization for different business goals
6. Performance forecasting
7. Opportunity detection (underperforming, high-potential, budget waste)
8. List and retrieve previous analyses
9. Error handling and edge cases

Usage:
    python tests/automated/test_performance_intelligence_agent.py

Expected Results:
    ✅ All 10 tests passing
    ✅ Agent initializes with enterprise context
    ✅ All 8 tools working correctly
    ✅ Proper error handling
    ✅ Database integration working

Created: 2025-10-11
Version: 1.0.0
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from apps.api.agents.direct_performance_intelligence_agent import DirectPerformanceIntelligenceAgent
from apps.api.utils.database import get_supabase_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
TEST_ORG_ID = "3bb5a9a1-be6a-4294-92ea-b2cfa3e0c8fa"  # TestOrg from setup script
TEST_USER_ID = "11111111-1111-1111-1111-111111111111"  # Test user
TEST_CAMPAIGN_ID = None  # Optional

class Colors:
    """ANSI color codes for terminal output."""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name: str):
    """Print formatted test header."""
    print(f"\n{Colors.HEADER}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{test_name}{Colors.ENDC}")
    print(f"{Colors.HEADER}{'=' * 80}{Colors.ENDC}\n")

def print_success(message: str):
    """Print success message."""
    print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")

def print_error(message: str):
    """Print error message."""
    print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")

def print_info(message: str):
    """Print info message."""
    print(f"{Colors.OKCYAN}ℹ️  {message}{Colors.ENDC}")


async def test_1_agent_initialization():
    """Test 1: Agent initialization with enterprise context."""
    print_test_header("TEST 1: Agent Initialization")

    try:
        # Initialize agent
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(
            org_id=TEST_ORG_ID,
            user_id=TEST_USER_ID,
            campaign_id=TEST_CAMPAIGN_ID
        )

        # Verify agent properties
        assert agent.agent_type == "performance_intelligence", "Agent type mismatch"
        assert agent.org_id == TEST_ORG_ID, "Org ID not set"
        assert agent.user_id == TEST_USER_ID, "User ID not set"
        assert agent.agent_tools is not None, "Agent tools not initialized"
        assert len(agent.agent_tools) == 8, f"Expected 8 tools, got {len(agent.agent_tools)}"

        # Verify context loaded
        if agent.context:
            print_info(f"Enterprise context loaded: {len(agent.context)} categories")
            if 'campaigns' in agent.context:
                print_info(f"  - Campaigns: {len(agent.context['campaigns'])}")
            if 'synthetic_personas' in agent.context:
                print_info(f"  - Personas: {len(agent.context['synthetic_personas'])}")

        print_success("Agent initialized successfully with all tools")
        return True

    except Exception as e:
        print_error(f"Agent initialization failed: {e}")
        return False


async def test_2_performance_analysis_comprehensive():
    """Test 2: Comprehensive performance analysis."""
    print_test_header("TEST 2: Comprehensive Performance Analysis")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Test with sample campaign metrics
        metrics = {
            "impressions": 150000,
            "clicks": 3750,
            "conversions": 125,
            "spend": 5000,
            "revenue": 12500
        }

        result = await agent.analyze_performance(
            campaign_metrics=json.dumps(metrics),
            analysis_focus="comprehensive",
            time_period="last_30_days",
            include_benchmarks=True
        )

        assert result["success"] is True, "Analysis failed"
        assert "analysis" in result, "Analysis data missing"

        analysis = result["analysis"]
        assert "metrics_summary" in analysis, "Metrics summary missing"
        assert "roi_analysis" in analysis, "ROI analysis missing"
        assert "conversion_analysis" in analysis, "Conversion analysis missing"
        assert "engagement_analysis" in analysis, "Engagement analysis missing"
        assert "benchmarks" in analysis, "Benchmarks missing"
        assert "quick_wins" in analysis, "Quick wins missing"

        print_info(f"Analysis type: {analysis['analysis_type']}")
        print_info(f"Metrics summary: {analysis['metrics_summary']}")
        print_info(f"ROI analysis: {analysis['roi_analysis']}")

        print_success("Comprehensive performance analysis completed")
        return True

    except Exception as e:
        print_error(f"Performance analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_3_roi_calculation():
    """Test 3: ROI calculation with various scenarios."""
    print_test_header("TEST 3: ROI Calculation")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Test scenario 1: Profitable campaign
        result1 = await agent.calculate_roi(
            campaign_name="Summer Sale Campaign",
            total_spend=10000,
            total_revenue=35000,
            additional_metrics=json.dumps({"conversions": 250})
        )

        assert result1["success"] is True, "ROI calculation failed"
        assert "roi_metrics" in result1, "ROI metrics missing"

        roi_metrics = result1["roi_metrics"]
        assert roi_metrics["roi_percentage"] == 250.0, f"ROI calculation error: {roi_metrics['roi_percentage']}"
        assert roi_metrics["roas"] == 3.5, f"ROAS calculation error: {roi_metrics['roas']}"
        assert roi_metrics["profit"] == 25000, f"Profit calculation error: {roi_metrics['profit']}"
        assert roi_metrics["performance_level"] == "excellent", "Performance level mismatch"

        print_info(f"Campaign: {result1['campaign_name']}")
        print_info(f"ROI: {roi_metrics['roi_percentage']}%")
        print_info(f"ROAS: {roi_metrics['roas']}x")
        print_info(f"Performance: {roi_metrics['performance_level']}")

        # Test scenario 2: Unprofitable campaign
        result2 = await agent.calculate_roi(
            campaign_name="Failed Test Campaign",
            total_spend=5000,
            total_revenue=2500
        )

        assert result2["success"] is True, "ROI calculation failed"
        assert result2["roi_metrics"]["roi_percentage"] == -50.0, "Negative ROI calculation error"
        assert result2["roi_metrics"]["performance_level"] == "unprofitable", "Performance level mismatch"

        print_info(f"Unprofitable campaign ROI: {result2['roi_metrics']['roi_percentage']}%")

        print_success("ROI calculation completed for all scenarios")
        return True

    except Exception as e:
        print_error(f"ROI calculation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_4_quick_wins_identification():
    """Test 4: Quick wins identification across challenge areas."""
    print_test_header("TEST 4: Quick Wins Identification")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Test different challenge areas
        challenge_areas = ["content", "conversion", "seo", "general"]

        for area in challenge_areas:
            result = await agent.identify_quick_wins(
                business_context=f"Need to improve {area} performance with limited resources",
                challenge_area=area,
                current_resources="limited"
            )

            assert result["success"] is True, f"Quick wins failed for {area}"
            assert "opportunities" in result, f"Opportunities missing for {area}"
            assert len(result["opportunities"]) > 0, f"No opportunities returned for {area}"

            print_info(f"{area.upper()}: Found {len(result['opportunities'])} quick win opportunities")

            # Verify opportunity structure
            first_opp = result["opportunities"][0]
            assert "title" in first_opp, "Opportunity title missing"
            assert "effort" in first_opp, "Effort level missing"
            assert "impact" in first_opp, "Impact level missing"
            assert "timeline" in first_opp, "Timeline missing"

        print_success("Quick wins identified for all challenge areas")
        return True

    except Exception as e:
        print_error(f"Quick wins identification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_5_budget_optimization():
    """Test 5: Budget optimization for different goals."""
    print_test_header("TEST 5: Budget Optimization")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Test different business goals
        goals = ["awareness", "leads", "revenue", "balanced_growth"]

        current_allocation = {
            "paid_search": 3000,
            "paid_social": 2000,
            "content_marketing": 1000,
            "email_marketing": 500
        }

        for goal in goals:
            result = await agent.optimize_budget(
                total_budget=10000,
                current_allocation=json.dumps(current_allocation),
                business_goals=goal
            )

            assert result["success"] is True, f"Budget optimization failed for {goal}"
            assert "recommended_allocation" in result, f"Recommendations missing for {goal}"

            recommended = result["recommended_allocation"]
            total_allocated = sum(recommended.values())

            # Verify total budget is allocated (allow 1% rounding tolerance)
            assert abs(total_allocated - 10000) < 100, f"Budget allocation error for {goal}: {total_allocated}"

            print_info(f"{goal.upper()}: Optimized allocation across {len(recommended)} channels")
            print_info(f"  Top channel: {max(recommended, key=recommended.get)} (${max(recommended.values()):,.0f})")

        print_success("Budget optimization completed for all business goals")
        return True

    except Exception as e:
        print_error(f"Budget optimization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_6_performance_forecasting():
    """Test 6: Performance forecasting."""
    print_test_header("TEST 6: Performance Forecasting")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Sample historical data
        historical = {
            "months": ["Jan", "Feb", "Mar", "Apr", "May"],
            "revenue": [10000, 12000, 11500, 13000, 14500],
            "spend": [3000, 3500, 3200, 3800, 4000]
        }

        result = await agent.forecast_performance(
            historical_data=json.dumps(historical),
            forecast_period="next_quarter",
            confidence_level=0.95
        )

        assert result["success"] is True, "Forecasting failed"
        assert "forecast" in result, "Forecast data missing"
        assert "assumptions" in result, "Assumptions missing"
        assert "risk_factors" in result, "Risk factors missing"

        print_info(f"Forecast period: {result['forecast_period']}")
        print_info(f"Confidence level: {result['confidence_level']}")
        print_info(f"Assumptions: {len(result['assumptions'])} listed")
        print_info(f"Risk factors: {len(result['risk_factors'])} identified")

        print_success("Performance forecasting completed")
        return True

    except Exception as e:
        print_error(f"Forecasting failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_7_opportunity_detection():
    """Test 7: Automated opportunity detection."""
    print_test_header("TEST 7: Opportunity Detection")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Test different scopes
        scopes = ["all", "underperforming", "high_potential", "budget_waste"]

        for scope in scopes:
            result = await agent.detect_opportunities(scope=scope)

            assert result["success"] is True, f"Opportunity detection failed for {scope}"
            assert "detected_opportunities" in result, f"Opportunities missing for {scope}"

            opportunities = result["detected_opportunities"]
            print_info(f"{scope.upper()}: Detected {len(opportunities)} opportunities")

            # Verify opportunity structure if any found
            if opportunities:
                first_opp = opportunities[0]
                assert "type" in first_opp, "Opportunity type missing"
                assert "title" in first_opp, "Opportunity title missing"
                assert "impact_score" in first_opp, "Impact score missing"
                assert "effort" in first_opp, "Effort level missing"

        print_success("Opportunity detection completed for all scopes")
        return True

    except Exception as e:
        print_error(f"Opportunity detection failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_8_list_analyses():
    """Test 8: List previous performance analyses."""
    print_test_header("TEST 8: List Previous Analyses")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        result = await agent.list_performance_analyses(limit=10)

        assert result["success"] is True, "List analyses failed"
        assert "analyses" in result, "Analyses list missing"
        assert "count" in result, "Count missing"

        print_info(f"Found {result['count']} previous analyses")

        if result["analyses"]:
            first = result["analyses"][0]
            print_info(f"Most recent: {first.get('title', 'Untitled')} ({first.get('output_type', 'unknown')})")

        print_success("List analyses completed")
        return True

    except Exception as e:
        print_error(f"List analyses failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_9_error_handling():
    """Test 9: Error handling and edge cases."""
    print_test_header("TEST 9: Error Handling")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Test 1: Invalid ROI calculation (zero spend)
        result1 = await agent.calculate_roi(
            campaign_name="Test Campaign",
            total_spend=0,
            total_revenue=1000
        )

        # Should handle gracefully, not crash
        assert result1 is not None, "ROI calculation returned None"
        print_info("✓ Handled zero spend scenario")

        # Test 2: Invalid JSON in performance analysis
        result2 = await agent.analyze_performance(
            campaign_metrics="invalid json {{{",
            analysis_focus="comprehensive"
        )

        # Should handle gracefully
        assert result2 is not None, "Performance analysis returned None"
        print_info("✓ Handled invalid JSON gracefully")

        # Test 3: Get non-existent analysis
        result3 = await agent.get_performance_analysis(
            analysis_id="00000000-0000-0000-0000-000000000000"
        )

        assert result3["success"] is False, "Should fail for non-existent ID"
        print_info("✓ Handled non-existent analysis ID")

        print_success("Error handling tests passed")
        return True

    except Exception as e:
        print_error(f"Error handling test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_10_database_integration():
    """Test 10: Database integration for saving analyses."""
    print_test_header("TEST 10: Database Integration")

    try:
        agent = DirectPerformanceIntelligenceAgent()
        await agent.__ainit__(org_id=TEST_ORG_ID, user_id=TEST_USER_ID)

        # Verify database connection
        supabase = get_supabase_client()

        # Check if agent_outputs table exists and is accessible
        result = supabase.table("agent_outputs") \
            .select("id") \
            .eq("org_id", TEST_ORG_ID) \
            .eq("agent_type", "performance_intelligence") \
            .limit(1) \
            .execute()

        print_info(f"Database connection successful")
        print_info(f"Found {len(result.data)} existing performance intelligence outputs")

        # Test list function which uses database
        list_result = await agent.list_performance_analyses(limit=5)
        assert list_result["success"] is True, "Database query via agent failed"

        print_success("Database integration verified")
        return True

    except Exception as e:
        print_error(f"Database integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests():
    """Run all Performance Intelligence agent tests."""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("=" * 80)
    print("PERFORMANCE INTELLIGENCE AGENT - COMPREHENSIVE TEST SUITE")
    print("=" * 80)
    print(f"{Colors.ENDC}\n")

    print_info("Testing unified agent consolidating ROI, Quick Wins, and Analytics functionality")
    print_info(f"Organization ID: {TEST_ORG_ID}")
    print_info(f"User ID: {TEST_USER_ID}")
    print()

    tests = [
        ("Agent Initialization", test_1_agent_initialization),
        ("Comprehensive Performance Analysis", test_2_performance_analysis_comprehensive),
        ("ROI Calculation", test_3_roi_calculation),
        ("Quick Wins Identification", test_4_quick_wins_identification),
        ("Budget Optimization", test_5_budget_optimization),
        ("Performance Forecasting", test_6_performance_forecasting),
        ("Opportunity Detection", test_7_opportunity_detection),
        ("List Previous Analyses", test_8_list_analyses),
        ("Error Handling", test_9_error_handling),
        ("Database Integration", test_10_database_integration)
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Print summary
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"{Colors.ENDC}\n")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = f"{Colors.OKGREEN}✅ PASS{Colors.ENDC}" if result else f"{Colors.FAIL}❌ FAIL{Colors.ENDC}"
        print(f"{status} - {test_name}")

    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.ENDC}")

    if passed == total:
        print(f"{Colors.OKGREEN}{Colors.BOLD}")
        print("🎉 ALL TESTS PASSED! Performance Intelligence Agent is ready for deployment.")
        print(f"{Colors.ENDC}")
        return 0
    else:
        print(f"{Colors.FAIL}{Colors.BOLD}")
        print(f"⚠️  {total - passed} test(s) failed. Please review and fix issues.")
        print(f"{Colors.ENDC}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
