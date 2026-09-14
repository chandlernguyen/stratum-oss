#!/usr/bin/env python
"""
Comprehensive Test Suite for Campaign Plan Recommendations Endpoint
Tests single-stage LLM generation with full context, cache functionality, ICE scoring, and cross-agent intelligence.

Run Instructions:
    # Run all tests
    poetry run pytest tests/automated/test_campaign_plan_recommendations_single_stage.py -v

    # Run specific test
    poetry run pytest tests/automated/test_campaign_plan_recommendations_single_stage.py::test_generate_plans_with_full_context -v

    # Run with detailed output
    poetry run pytest tests/automated/test_campaign_plan_recommendations_single_stage.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test user exists: sme.owner@example.com / LocalDevOnly123!
    - GOOGLE_API_KEY set in .env
    - Campaign plan cache table exists (migration 088)

Architecture:
    Single-stage LLM approach using Gemini 2.5 Flash with full context
    - No summarization (removed two-stage complexity)
    - Direct full-context prompting (50k tokens → Gemini Flash)
    - Faster, simpler, better quality
    - Consistent with all other agents (Marketing Strategy, Content, etc.)
"""
import os
import pytest
import json
import httpx
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
import pathlib
from pathlib import Path

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

# Load environment variables
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Test credentials
TEST_EMAIL = "sme.owner@example.com"
TEST_PASSWORD = "LocalDevOnly123!"


# Fixtures
@pytest.fixture(scope="module")
def auth_setup():
    """
    Setup authentication for all tests.

    Returns:
        dict: Contains access_token, user_id, org_id, and headers
    """
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    # Authenticate
    auth_response = supabase.auth.sign_in_with_password({
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    assert auth_response.user is not None, "Authentication failed"

    user_id = auth_response.user.id
    access_token = auth_response.session.access_token

    # Get org_id
    user_data = supabase.table("users").select("org_id").eq("id", user_id).execute()
    assert len(user_data.data) > 0, "User not found in database"
    org_id = user_data.data[0]["org_id"]

    return {
        "access_token": access_token,
        "user_id": user_id,
        "org_id": org_id,
        "headers": {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    }


@pytest.fixture(scope="module")
def supabase_client():
    """Create Supabase service client"""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@pytest.fixture
def sample_business_context():
    """Sample business context for testing"""
    return {
        "company_name": "Test SaaS Company",
        "industry": "Software/SaaS",
        "main_products": ["Project Management Tool", "Team Collaboration Platform"],
        "target_market": ["Small Businesses", "Startups", "Remote Teams"],
        "marketing_budget": "$50,000/month",
        "team_size": "25 employees",
        "goals": ["Increase MRR by 30%", "Reduce churn to <5%"],
        "challenges": ["High CAC", "Low trial-to-paid conversion"]
    }


@pytest.fixture
def sample_agent_outputs():
    """Sample agent outputs for testing cross-agent intelligence"""
    return {
        "strategy": [
            {
                "id": "strategy-1",
                "title": "SWOT Analysis for SaaS Growth",
                "summary": "Comprehensive SWOT analysis identifying key strengths in product quality and opportunities in SME market",
                "content": {
                    "strengths": ["Strong product features", "Good customer support"],
                    "weaknesses": ["Limited brand awareness", "High CAC"],
                    "opportunities": ["SME market growth", "Remote work trends"],
                    "threats": ["Increased competition", "Economic downturn"]
                }
            }
        ],
        "marketing_strategy": [
            {
                "id": "mktg-1",
                "title": "Content Marketing Strategy",
                "summary": "Focus on educational content and SEO to drive organic growth",
                "content": {
                    "channels": ["Blog", "SEO", "Email", "LinkedIn"],
                    "key_messages": ["Simplify project management", "Save time, increase productivity"]
                }
            }
        ],
        "content": [
            {
                "id": "content-1",
                "title": "Blog Post: 10 Project Management Tips",
                "summary": "Educational blog post targeting SME decision makers",
                "content": {
                    "format": "Blog post",
                    "word_count": 1500,
                    "target_audience": "SME managers"
                }
            }
        ]
    }


# Tests

def test_generate_plans_with_full_context(auth_setup, sample_business_context, sample_agent_outputs):
    """
    Test: Generate campaign plans using single-stage LLM with full context

    Architecture:
    - Uses Gemini 2.5 Flash directly with full context (no summarization)
    - Passes all agent outputs raw (strategy, marketing_strategy, content, etc.)
    - Generates 3-5 campaign plans with ICE scoring

    Expected Behavior:
    - Returns 200 status code
    - Response contains "plans" array with 3-5 plans
    - Each plan has ICE score (0-10 range)
    - Plans are sorted by ICE score (highest first)
    - No summarization step (single LLM call)

    Success Criteria:
    - Response time < 15 seconds (single-stage is faster than two-stage)
    - All plans have required fields (title, description, channels, ICE scores)
    - ICE scores calculated correctly: (Impact × Confidence × Ease) / 100
    - Plans leverage cross-agent intelligence from full context
    """
    request_payload = {
        "org_id": auth_setup["org_id"],
        "business_context": sample_business_context,
        "personas": [],
        "strategies": [],
        "campaign_metrics": [],
        "agent_outputs": sample_agent_outputs,
        "active_campaigns": []
    }

    start_time = time.time()

    response = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        headers=auth_setup["headers"],
        json=request_payload,
        timeout=30.0
    )

    elapsed_time = time.time() - start_time

    # Assertions
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    assert data["success"] is True, "Response should indicate success"
    assert "plans" in data, "Response should contain plans"
    assert len(data["plans"]) >= 3, f"Should generate at least 3 plans, got {len(data['plans'])}"
    assert len(data["plans"]) <= 5, f"Should generate at most 5 plans, got {len(data['plans'])}"

    # Verify single-stage performance (should be faster than two-stage)
    assert elapsed_time < 15.0, f"Single-stage should complete in <15s, took {elapsed_time:.2f}s"

    # Validate plan structure
    for plan in data["plans"]:
        # Required fields
        assert "id" in plan, "Plan should have id"
        assert "title" in plan, "Plan should have title"
        assert "description" in plan, "Plan should have description"
        assert "campaign_type" in plan, "Plan should have campaign_type"
        assert "channels" in plan, "Plan should have channels"
        assert "ice_score" in plan, "Plan should have ICE score"
        assert "impact" in plan, "Plan should have impact rating"
        assert "confidence" in plan, "Plan should have confidence rating"
        assert "ease" in plan, "Plan should have ease rating"
        assert "estimated_duration" in plan, "Plan should have estimated_duration"
        assert "expected_outcomes" in plan, "Plan should have expected_outcomes"
        assert "prerequisites" in plan, "Plan should have prerequisites"
        assert "risk_factors" in plan, "Plan should have risk_factors"

        # Validate ICE score calculation
        impact_score = {"High": 8, "Medium": 5, "Low": 3}.get(plan["impact"], 5)
        confidence_score = {"High": 8, "Medium": 5, "Low": 3}.get(plan["confidence"], 5)
        ease_score = {"High": 8, "Medium": 5, "Low": 3}.get(plan["ease"], 5)
        expected_ice = round((impact_score * confidence_score * ease_score) / 100, 2)

        assert plan["ice_score"] == expected_ice, f"ICE score mismatch: expected {expected_ice}, got {plan['ice_score']}"

        # Validate data types
        assert isinstance(plan["channels"], list), "Channels should be a list"
        assert len(plan["channels"]) > 0, "Should have at least one channel"
        assert isinstance(plan["expected_outcomes"], list), "Expected outcomes should be a list"
        assert isinstance(plan["prerequisites"], list), "Prerequisites should be a list"
        assert isinstance(plan["risk_factors"], list), "Risk factors should be a list"

    # Verify plans are sorted by ICE score (descending)
    ice_scores = [plan["ice_score"] for plan in data["plans"]]
    assert ice_scores == sorted(ice_scores, reverse=True), "Plans should be sorted by ICE score (highest first)"

    print(f"✅ Test passed: Generated {len(data['plans'])} plans in {elapsed_time:.2f}s (single-stage)")
    print(f"   Top plan: {data['plans'][0]['title']} (ICE: {data['plans'][0]['ice_score']})")


def test_cache_functionality(auth_setup, sample_business_context, sample_agent_outputs, supabase_client):
    """
    Test: Cache functionality for campaign plan recommendations

    Expected Behavior:
    - First call generates plans and caches them
    - Second call with same input retrieves from cache (instant)
    - Cache expires after 2 hours

    Success Criteria:
    - First call: generation_time > 5s
    - Second call: generation_time < 1s (cache hit)
    - Cache record exists in campaign_plan_recommendation_cache table
    - Cache includes data_hash for invalidation
    """
    request_payload = {
        "org_id": auth_setup["org_id"],
        "business_context": sample_business_context,
        "personas": [],
        "strategies": [],
        "campaign_metrics": [],
        "agent_outputs": sample_agent_outputs,
        "active_campaigns": []
    }

    # Clear any existing cache for this org
    supabase_client.table("campaign_plan_recommendation_cache").delete().eq(
        "org_id", auth_setup["org_id"]
    ).execute()

    # First call - should generate and cache
    start_time_1 = time.time()
    response_1 = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        headers=auth_setup["headers"],
        json=request_payload,
        timeout=30.0
    )
    elapsed_time_1 = time.time() - start_time_1

    assert response_1.status_code == 200
    data_1 = response_1.json()
    assert data_1["success"] is True
    assert len(data_1["plans"]) >= 3

    # Verify cache record was created
    cache_records = supabase_client.table("campaign_plan_recommendation_cache").select("*").eq(
        "org_id", auth_setup["org_id"]
    ).execute()

    assert len(cache_records.data) > 0, "Cache record should exist"
    cache_record = cache_records.data[0]
    assert "data_hash" in cache_record, "Cache should have data_hash"
    assert "plans" in cache_record, "Cache should store plans"
    assert "generation_time_ms" in cache_record, "Cache should track generation time"

    # Second call with same input - should hit cache
    start_time_2 = time.time()
    response_2 = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        headers=auth_setup["headers"],
        json=request_payload,
        timeout=30.0
    )
    elapsed_time_2 = time.time() - start_time_2

    assert response_2.status_code == 200
    data_2 = response_2.json()

    # Verify cache hit (should be much faster)
    assert elapsed_time_2 < 1.0, f"Cache hit should be instant, took {elapsed_time_2:.2f}s"

    # Verify same plans returned
    assert len(data_2["plans"]) == len(data_1["plans"]), "Cache should return same number of plans"
    assert data_2["plans"][0]["id"] == data_1["plans"][0]["id"], "Cache should return exact same plans"

    print(f"✅ Test passed: Cache working correctly")
    print(f"   First call (generate): {elapsed_time_1:.2f}s")
    print(f"   Second call (cache hit): {elapsed_time_2:.2f}s")
    print(f"   Speedup: {elapsed_time_1 / elapsed_time_2:.1f}x faster")


def test_missing_business_context(auth_setup):
    """
    Test: Graceful handling when business context is missing

    Expected Behavior:
    - Returns success=False
    - Includes needs_setup=True flag
    - Provides helpful message

    Success Criteria:
    - Returns 200 (not an error, just needs setup)
    - Response indicates setup needed
    - No plans generated
    """
    request_payload = {
        "org_id": auth_setup["org_id"],
        "business_context": None,  # Missing business context
        "personas": [],
        "strategies": [],
        "campaign_metrics": [],
        "agent_outputs": {},
        "active_campaigns": []
    }

    response = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        headers=auth_setup["headers"],
        json=request_payload,
        timeout=10.0
    )

    assert response.status_code == 200, "Should return 200 for needs_setup state"

    data = response.json()
    assert data["success"] is False, "Should indicate failure when context missing"
    assert data.get("needs_setup") is True, "Should flag that setup is needed"
    assert "message" in data, "Should provide guidance message"
    assert "plans" not in data or data["plans"] is None, "Should not generate plans without context"

    print(f"✅ Test passed: Gracefully handles missing business context")
    print(f"   Message: {data['message']}")


def test_unauthorized_access(sample_business_context):
    """
    Test: Verify authorization - users can only access their own org's plans

    Expected Behavior:
    - Request with wrong org_id returns 403
    - Request without auth token returns 401

    Success Criteria:
    - Proper HTTP status codes
    - No data leakage across organizations
    """
    # Test 1: No auth token
    request_payload = {
        "org_id": "fake-org-id",
        "business_context": sample_business_context,
        "personas": [],
        "strategies": [],
        "campaign_metrics": [],
        "agent_outputs": {},
        "active_campaigns": []
    }

    response_no_auth = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        json=request_payload,
        timeout=10.0
    )

    assert response_no_auth.status_code == 401, f"Should return 401 without auth, got {response_no_auth.status_code}"

    # Test 2: Valid auth but wrong org_id
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    auth_response = supabase.auth.sign_in_with_password({
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    headers = {
        "Authorization": f"Bearer {auth_response.session.access_token}",
        "Content-Type": "application/json"
    }

    request_payload["org_id"] = "00000000-0000-0000-0000-000000000000"  # Wrong org

    response_wrong_org = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        headers=headers,
        json=request_payload,
        timeout=10.0
    )

    assert response_wrong_org.status_code == 403, f"Should return 403 for wrong org, got {response_wrong_org.status_code}"

    print(f"✅ Test passed: Authorization working correctly")
    print(f"   No auth: {response_no_auth.status_code}")
    print(f"   Wrong org: {response_wrong_org.status_code}")


def test_campaign_type_coverage(auth_setup, sample_business_context, sample_agent_outputs):
    """
    Test: Verify campaign plans cover different strategic objectives

    Expected Behavior:
    - Plans should span different campaign types (awareness, consideration, conversion, retention)
    - Should provide diverse strategic coverage

    Success Criteria:
    - At least 2 different campaign types represented
    - Plans address different stages of customer journey
    """
    request_payload = {
        "org_id": auth_setup["org_id"],
        "business_context": sample_business_context,
        "personas": [],
        "strategies": [],
        "campaign_metrics": [],
        "agent_outputs": sample_agent_outputs,
        "active_campaigns": []
    }

    response = httpx.post(
        f"{API_BASE_URL}/api/v1/campaign-plans/recommendations",
        headers=auth_setup["headers"],
        json=request_payload,
        timeout=30.0
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    campaign_types = [plan["campaign_type"] for plan in data["plans"]]
    unique_types = set(campaign_types)

    assert len(unique_types) >= 2, f"Should have at least 2 different campaign types, got {unique_types}"

    # Verify valid campaign types
    valid_types = {"awareness", "consideration", "conversion", "retention"}
    for campaign_type in campaign_types:
        assert campaign_type in valid_types, f"Invalid campaign type: {campaign_type}"

    print(f"✅ Test passed: Campaign type coverage validated")
    print(f"   Campaign types: {unique_types}")
    print(f"   Distribution: {dict((t, campaign_types.count(t)) for t in unique_types)}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
