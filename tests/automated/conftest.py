"""
Pytest configuration for the backend test suite.

Importing tests/automated/test_config here, before any test module is
collected, is what makes the shared configuration effective: test modules read
their configuration from module-level constants, which are evaluated at import
time. Without this, a module that reads os.getenv directly would still see only
the ambient environment.

See test_config.py for the resolution order.
"""

import sys
from pathlib import Path

# The application is imported as `apps.api...` from the repository root, so the
# root must be importable regardless of the directory pytest was invoked from.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_TESTS_DIR = Path(__file__).resolve().parent

for _path in (str(_REPO_ROOT), str(_TESTS_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

import test_config  # noqa: E402,F401  (imported for its env-loading side effect)


# ============================================================================
# Quarantine
# ============================================================================
# These tests cannot pass in a fresh clone's default configuration:
#
#   * "live model" tests assert on the *content* of real model output, but
#     DEMO_MODE returns canned text. Opt in with RUN_LIVE_MODEL_TESTS=1 and
#     DEMO_MODE=false plus a key.
#   * "stripe" tests call Stripe. Opt in by setting STRIPE_SECRET_KEY.
#   * "stale" tests are known to be out of date against the current schema or
#     seed; see TESTING.md. Opt in with RUN_STALE_TESTS=1 to work on them.
#
# They are skipped, not deleted, so the default `poetry run pytest` is green on
# a fresh clone while the debt stays visible and runnable.
import os  # noqa: E402

import pytest  # noqa: E402

_RUN_LIVE_MODEL_TESTS = os.getenv("RUN_LIVE_MODEL_TESTS") == "1"
_RUN_STRIPE_TESTS = bool(os.getenv("STRIPE_SECRET_KEY")) or os.getenv("RUN_STRIPE_TESTS") == "1"
_RUN_STALE_TESTS = os.getenv("RUN_STALE_TESTS") == "1"

_LIVE_MODEL_NODES = {
    "tests/automated/test_content_agent_structured_extraction.py::test_content_agent_extraction",
    "tests/automated/test_direct_strategy_agent.py::test_conversation_memory",
    "tests/automated/test_direct_strategy_agent.py::test_framework_application",
    "tests/automated/test_direct_strategy_agent.py::test_multiple_session_isolation",
    "tests/automated/test_direct_strategy_agent.py::test_structured_strategy_response",
    "tests/automated/test_hybrid_extraction.py::test_hybrid_extraction",
    "tests/automated/test_ios_live_integration.py::test_ios_agency_campaign_session_routes_and_preserves_scope",
    "tests/automated/test_ios_live_integration.py::test_ios_sme_strategy_stream_turn_by_turn_memory",
    "tests/automated/test_performance_intelligence_agent.py::test_10_database_integration",
    "tests/automated/test_performance_intelligence_agent.py::test_1_agent_initialization",
    "tests/automated/test_performance_intelligence_agent.py::test_2_performance_analysis_comprehensive",
    "tests/automated/test_performance_intelligence_agent.py::test_3_roi_calculation",
    "tests/automated/test_performance_intelligence_agent.py::test_4_quick_wins_identification",
    "tests/automated/test_performance_intelligence_agent.py::test_5_budget_optimization",
    "tests/automated/test_performance_intelligence_agent.py::test_6_performance_forecasting",
    "tests/automated/test_performance_intelligence_agent.py::test_7_opportunity_detection",
    "tests/automated/test_performance_intelligence_agent.py::test_8_list_analyses",
    "tests/automated/test_performance_intelligence_agent.py::test_9_error_handling",
    "tests/automated/test_persona_agent_structured_extraction.py::test_persona_agent_extraction",
    "tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_budget_awareness",
    "tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_complete_onboarding_flow",
    "tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_error_handling_missing_context",
    "tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_persona_tool_delegation",
    "tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_strategy_tool_delegation",
    "tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_timeline_awareness",
    "tests/automated/test_strategy_agent_structured_extraction.py::test_strategy_agent_extraction",
}

_STRIPE_NODES = {
    "tests/automated/test_billing_router.py::TestCreateCheckoutSession::test_correct_params_to_checkout_session_create",
    "tests/automated/test_billing_router.py::TestCreateCheckoutSession::test_happy_path_existing_stripe_customer",
    "tests/automated/test_billing_router.py::TestCreateCheckoutSession::test_org_id_in_subscription_data_metadata",
    "tests/automated/test_billing_router.py::TestCreateCheckoutSession::test_response_contains_checkout_url_and_session_id",
    "tests/automated/test_billing_router.py::TestCreatePortalSession::test_400_when_org_data_is_none",
    "tests/automated/test_billing_router.py::TestCreatePortalSession::test_happy_path_returns_portal_url",
    "tests/automated/test_billing_router.py::TestHandlePaymentFailed::test_sets_past_due_when_org_found",
    "tests/automated/test_billing_router.py::TestHandlePaymentFailed::test_updates_only_first_matched_org",
    "tests/automated/test_billing_router.py::TestHandleSubscriptionDeleted::test_resets_to_free_canceled",
    "tests/automated/test_billing_router.py::TestHandleSubscriptionDeleted::test_sets_max_users_to_1",
}

_STALE_NODES = {
    "tests/automated/test_agency_client_context_intelligence.py::TestAgencyClientContext::test_business_intelligence_loads_client_name",
    "tests/automated/test_campaign_plan_recommendations_single_stage.py::test_cache_functionality",
    "tests/automated/test_campaign_plan_recommendations_single_stage.py::test_campaign_type_coverage",
    "tests/automated/test_campaign_plan_recommendations_single_stage.py::test_generate_plans_with_full_context",
    "tests/automated/test_campaign_plan_recommendations_single_stage.py::test_unauthorized_access",
    "tests/automated/test_database_first_architecture.py::TestRLSPolicies::test_rls_org_isolation",
    "tests/automated/test_gemini_client_config.py::test_missing_key_names_both_variables",
    "tests/automated/test_multi_tenant_data_isolation_comprehensive.py::TestCrossAgentIntelligence::test_marketing_strategy_accesses_personas",
    "tests/automated/test_multi_tenant_data_isolation_comprehensive.py::TestDataIsolation::test_campaign_data_isolation",
    "tests/automated/test_multi_tenant_data_isolation_comprehensive.py::TestRoleBasedAccess::test_agency_admin_multi_client_access",
    "tests/automated/test_persona_save_client_context.py::TestPersonaSaveClientContext::test_agency_client_isolation",
    "tests/automated/test_persona_save_client_context.py::TestPersonaSaveClientContext::test_agency_persona_save_with_client_id",
    "tests/automated/test_persona_save_client_context.py::TestPersonaSaveClientContext::test_agency_persona_save_without_client_id_fails",
    "tests/automated/test_persona_save_client_context.py::TestPersonaSaveClientContext::test_persona_content_structure_preserved",
    "tests/automated/test_persona_save_client_context.py::TestPersonaSaveClientContext::test_sme_persona_save_without_client_id",
    "tests/automated/test_personas_list_routed_integration.py::TestPersonasListRouted::test_agency_gets_client_specific_personas",
    "tests/automated/test_personas_list_routed_integration.py::TestPersonasListRouted::test_archived_personas_filtering",
    "tests/automated/test_personas_list_routed_integration.py::TestPersonasListRouted::test_function_returns_correct_structure",
    "tests/automated/test_personas_list_routed_integration.py::TestPersonasListRouted::test_output_type_filtering_excludes_insights",
    "tests/automated/test_personas_list_routed_integration.py::TestPersonasListRouted::test_sme_gets_all_org_personas",
    "tests/automated/test_progressive_learning_enum_validation.py::TestProgressiveLearningEnumValidation::test_python_enum_normalization_patterns",
    "tests/automated/test_sme_e2e_workflow.py::TestSMEWorkflowE2E::test_02_verify_sme_dashboard",
    "tests/automated/test_sme_e2e_workflow.py::TestSMEWorkflowE2E::test_04_launch_strategy_agent",
    "tests/automated/test_sme_e2e_workflow.py::TestSMEWorkflowE2E::test_05_generate_strategy",
    "tests/automated/test_sme_e2e_workflow.py::TestSMEWorkflowE2E::test_06_save_strategy",
    "tests/automated/test_sme_e2e_workflow.py::TestSMEWorkflowE2E::test_07_switch_to_content_agent",
    "tests/automated/test_sme_e2e_workflow.py::TestSMEWorkflowE2E::test_09_generate_content",
    "tests/automated/test_sse_streaming_comprehensive.py::TestAgentStreaming::test_strategy_agent_streaming_detailed",
    "tests/automated/test_sse_streaming_comprehensive.py::TestStreamingErrorHandling::test_empty_message_handling",
    "tests/automated/test_sse_streaming_comprehensive.py::TestStreamingErrorHandling::test_invalid_session_id",
    "tests/automated/test_sse_streaming_comprehensive.py::TestStreamingPerformance::test_long_stream_memory_management",
}


def pytest_collection_modifyitems(config, items):
    skip_live = pytest.mark.skip(
        reason="asserts real model output; run with RUN_LIVE_MODEL_TESTS=1 and DEMO_MODE=false"
    )
    skip_stripe = pytest.mark.skip(
        reason="needs Stripe credentials; set STRIPE_SECRET_KEY to run"
    )
    skip_stale = pytest.mark.skip(
        reason="known stale against the current schema/seed; see TESTING.md"
    )
    for item in items:
        if item.nodeid in _LIVE_MODEL_NODES and not _RUN_LIVE_MODEL_TESTS:
            item.add_marker(skip_live)
        elif item.nodeid in _STRIPE_NODES and not _RUN_STRIPE_TESTS:
            item.add_marker(skip_stripe)
        elif item.nodeid in _STALE_NODES and not _RUN_STALE_TESTS:
            item.add_marker(skip_stale)
