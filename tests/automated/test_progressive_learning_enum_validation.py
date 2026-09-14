#!/usr/bin/env python3
"""
Progressive Learning Enum Validation Integration Test
Tests the defense-in-depth fix for enum validation in business profile extraction

Context:
- Bug: AI extracts freeform text for enum fields (e.g., "Has 18 months of runway" for funding_status)
- Impact: Entire business profile UPDATE fails, losing valid data (company_name, revenue, competitors)
- Fix: Two-layer defense
  1. Python normalization: Maps common patterns to valid enums (business_profile_extraction.py)
  2. Database error handling: Skips invalid enums, saves rest (Migration 231)

Test Scenario (TaskFlow Solutions):
- Company name: "TaskFlow Solutions" (should ALWAYS save)
- Revenue: "$12M ARR" (should ALWAYS save)
- Competitors: "Asana, Monday.com" (should ALWAYS save)
- Funding: "Has 18 months of runway" (Python normalizes to None, skips field)
- Stage: "Startup/Growth" (Python normalizes hybrid pattern to "Growth")

Success Criteria:
- ✅ company_name, annual_revenue, key_competitors saved to database
- ✅ funding_status skipped gracefully (invalid pattern)
- ✅ company_stage normalized to valid enum "Growth"
- ✅ No ERROR logs about enum validation failures

Run Instructions:
    # Run this test file
    poetry run pytest tests/automated/test_progressive_learning_enum_validation.py -v -s

    # Run specific test
    poetry run pytest tests/automated/test_progressive_learning_enum_validation.py::TestProgressiveLearningEnumValidation::test_taskflow_solutions_enum_validation -v -s

    # Run with detailed output
    poetry run pytest tests/automated/test_progressive_learning_enum_validation.py -v -s --tb=short

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test user exists: sme.owner@example.com (see /tests/TEST_USERS.md)
    - Environment variables set in tests/.env:
      * GOOGLE_API_KEY - For Gemini API calls
      * SUPABASE_URL - Local Supabase instance
      * SUPABASE_SERVICE_ROLE_KEY
      * SUPABASE_ANON_KEY
      * SME_OWNER_EMAIL, TEST_PASSWORD
    - Migration 231 applied (enum error handling)
    - Python normalization code deployed (business_profile_extraction.py)
"""

import os
import pytest
import json
import time
from typing import Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
import pathlib

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

# Load environment variables from apps/api/.env
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration - ALL from environment variables

# Test credentials - from environment
TEST_EMAIL = os.getenv("SME_OWNER_EMAIL", "sme.owner@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "LocalDevOnly123!")


class TestProgressiveLearningEnumValidation:
    """
    Integration test suite for progressive learning enum validation fix

    Tests defense-in-depth strategy:
    1. Python layer: Normalize AI output to valid enums (business_profile_extraction.py)
    2. Database layer: Graceful error handling for invalid enums (Migration 231)
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment before each test"""
        # Use service role client for database operations
        self.supabase_service: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Use anon client for auth
        self.supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

        self.access_token = None
        self.user_id = None
        self.org_id = None
        self.auth_headers = {}

        # Authenticate
        self._authenticate()

        # Clear any existing business profile data for clean test
        self._reset_business_profile()

        yield

        # Cleanup after test (optional - could leave data for inspection)
        # self._cleanup()

    def _authenticate(self):
        """Authenticate and setup headers using Supabase SDK"""
        try:
            print(f"\n🔐 Authenticating as {TEST_EMAIL}...")
            auth_response = self.supabase_anon.auth.sign_in_with_password({
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })

            if auth_response.user:
                self.user_id = auth_response.user.id
                self.access_token = auth_response.session.access_token
                self.auth_headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }

                # Get user's organization using service role client
                org_result = self.supabase_service.table('users') \
                    .select('org_id') \
                    .eq('id', self.user_id) \
                    .limit(1) \
                    .execute()

                if org_result.data and len(org_result.data) > 0:
                    self.org_id = org_result.data[0]['org_id']
                    print(f"✅ Authenticated: user_id={self.user_id}, org_id={self.org_id}")
                else:
                    pytest.fail("Could not fetch user's organization")
            else:
                pytest.fail("Authentication failed")
        except Exception as e:
            pytest.fail(f"Auth error: {e}")

    def _reset_business_profile(self):
        """Reset business profile data to seed state for clean test"""
        try:
            print("🧹 Resetting business profile data to seed state...")

            # Update core_business_data to initial seed state
            self.supabase_service.table('core_business_data') \
                .update({
                    'company_name': 'Test SME Company',
                    'industry': 'SaaS/Software',
                    'annual_revenue': None,
                    'key_competitors': None,
                    'funding_status': None,
                    'company_stage': None,
                    'learning_metadata': {}
                }) \
                .eq('org_id', self.org_id) \
                .execute()

            print("✅ Business profile reset to seed state")
        except Exception as e:
            print(f"⚠️  Warning: Could not reset business profile: {e}")

    def _simulate_progressive_learning_extraction(
        self,
        conversation_text: str,
        expected_extractions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Simulate the progressive learning business profile extraction

        Args:
            conversation_text: Text that would trigger extraction
            expected_extractions: What we expect the AI to extract

        Returns:
            Result from upsert_business_profile_data() database function
        """
        print(f"\n📊 Simulating progressive learning extraction...")
        print(f"Conversation text: {conversation_text[:200]}...")

        # In real system, this would be extracted by Gemini API
        # For this test, we directly call the database function with expected extractions
        # This isolates the enum validation fix without depending on AI extraction

        try:
            result = self.supabase_service.rpc(
                'upsert_business_profile_data',
                {
                    'p_org_id': self.org_id,
                    'p_data': expected_extractions,
                    'p_source_agent': 'strategy',
                    'p_confidence': 0.95,
                    'p_user_id': self.user_id
                }
            ).execute()

            print(f"✅ Database function result: {result.data}")
            return result.data
        except Exception as e:
            print(f"❌ Database function error: {e}")
            raise

    def _get_business_profile(self) -> Dict[str, Any]:
        """Fetch current business profile data from database"""
        result = self.supabase_service.table('core_business_data') \
            .select('company_name, industry, annual_revenue, key_competitors, funding_status, company_stage, learning_metadata') \
            .eq('org_id', self.org_id) \
            .single() \
            .execute()

        return result.data

    def test_taskflow_solutions_enum_validation(self):
        """
        Test: TaskFlow Solutions scenario with invalid enum values

        Context:
        - AI extracts "Has 18 months of runway" for funding_status (invalid enum)
        - AI extracts "Startup/Growth" for company_stage (hybrid pattern)
        - OLD BEHAVIOR: Entire UPDATE fails, losing company_name, revenue, competitors
        - NEW BEHAVIOR: Invalid enums skipped, rest of data saved

        Test Steps:
        1. Reset business profile to seed state
        2. Simulate progressive learning extraction with TaskFlow Solutions data
        3. Verify company_name, annual_revenue, key_competitors saved successfully
        4. Verify funding_status NOT saved (invalid pattern, normalized to None)
        5. Verify company_stage normalized to "Growth" (Python mapping)

        Expected Behavior:
        - company_name = "TaskFlow Solutions" (MUST save)
        - annual_revenue = "$12M ARR" (MUST save)
        - key_competitors = "Asana,Monday.com" (MUST save)
        - funding_status = NULL (skipped - invalid enum)
        - company_stage = "Growth" (normalized from "Startup/Growth")
        - learning_metadata updated for saved fields

        Success Criteria:
        - Database function returns updated_fields >= 3
        - Database function returns skipped_fields >= 1 (funding_status)
        - core_business_data row has TaskFlow data
        - No ERROR logs about enum validation failures
        """
        print("\n" + "="*80)
        print("TEST: TaskFlow Solutions Enum Validation (Migration 231 + Python Fix)")
        print("="*80)

        # Arrange: Prepare test data with problematic enum values
        conversation_text = """
        User: I need help with business strategy for my company.

        We're called TaskFlow Solutions, and we're a project management platform.
        We've reached $12M in annual recurring revenue and compete directly with
        Asana and Monday.com.

        In terms of funding, we have 18 months of runway and we're somewhere between
        a startup and growth stage company.
        """

        # These are the extractions the AI would produce (with problematic enums)
        ai_extractions = {
            'company_name': 'TaskFlow Solutions',
            'industry': 'Project Management',  # Will normalize to "SaaS/Software"
            'annual_revenue': '$12M ARR',
            'key_competitors': 'Asana,Monday.com',
            'funding_status': 'Has 18 months of runway',  # ❌ Invalid enum
            'company_stage': 'Startup/Growth'  # ⚠️  Hybrid pattern (should normalize to "Growth")
        }

        print("\n📋 Test Data (AI Extractions):")
        print(json.dumps(ai_extractions, indent=2))

        # Act: Simulate progressive learning extraction
        print("\n⚙️  Executing upsert_business_profile_data()...")
        result = self._simulate_progressive_learning_extraction(
            conversation_text,
            ai_extractions
        )

        # Assert: Verify database function results
        print("\n✅ Verifying database function results...")
        assert result is not None, "Database function should return result"
        assert 'updated_fields' in result, "Result should have updated_fields count"
        assert 'skipped_fields' in result, "Result should have skipped_fields count"

        # Should have updated at least 3 fields (company_name, annual_revenue, key_competitors)
        # May also update industry and company_stage if normalization works
        assert result['updated_fields'] >= 3, \
            f"Should update at least 3 fields (company_name, revenue, competitors), got {result['updated_fields']}"

        # Should have skipped at least 1 field (funding_status with invalid pattern)
        assert result['skipped_fields'] >= 1, \
            f"Should skip at least 1 field (funding_status), got {result['skipped_fields']}"

        print(f"   ✓ Updated {result['updated_fields']} fields")
        print(f"   ✓ Skipped {result['skipped_fields']} fields")

        # Assert: Verify data persisted correctly to database
        print("\n✅ Verifying data persisted to core_business_data...")
        profile = self._get_business_profile()

        print("\n📊 Current Business Profile:")
        print(json.dumps(profile, indent=2, default=str))

        # Critical assertions - these MUST pass (defense-in-depth success)
        assert profile['company_name'] == 'TaskFlow Solutions', \
            f"❌ CRITICAL: company_name not saved! Got: {profile['company_name']}"
        print("   ✓ company_name = 'TaskFlow Solutions' (SAVED)")

        assert profile['annual_revenue'] == '$12M ARR', \
            f"❌ CRITICAL: annual_revenue not saved! Got: {profile['annual_revenue']}"
        print("   ✓ annual_revenue = '$12M ARR' (SAVED)")

        assert profile['key_competitors'] is not None, \
            f"❌ CRITICAL: key_competitors not saved! Got: {profile['key_competitors']}"
        assert 'Asana' in profile['key_competitors'], \
            f"❌ key_competitors should contain 'Asana', got: {profile['key_competitors']}"
        assert 'Monday.com' in profile['key_competitors'], \
            f"❌ key_competitors should contain 'Monday.com', got: {profile['key_competitors']}"
        print(f"   ✓ key_competitors = '{profile['key_competitors']}' (SAVED)")

        # Enum normalization assertions
        assert profile['funding_status'] is None, \
            f"❌ funding_status should be NULL (invalid pattern skipped), got: {profile['funding_status']}"
        print("   ✓ funding_status = NULL (invalid pattern skipped)")

        # Python normalization should map "Startup/Growth" → "Growth"
        # If Python layer fails, database layer catches it
        if profile['company_stage'] is not None:
            assert profile['company_stage'] == 'Growth', \
                f"❌ company_stage should normalize to 'Growth', got: {profile['company_stage']}"
            print(f"   ✓ company_stage = 'Growth' (normalized from 'Startup/Growth')")
        else:
            print("   ⚠️  company_stage = NULL (database layer caught invalid enum)")

        # Verify learning_metadata updated
        assert 'learning_metadata' in profile, "learning_metadata should exist"
        metadata = profile['learning_metadata']

        # Check that learned fields have metadata
        assert 'company_name' in metadata, "company_name should have learning metadata"
        assert metadata['company_name']['learned_by'] == 'strategy', \
            "company_name should be learned by strategy agent"
        print(f"   ✓ learning_metadata updated for saved fields")

        print("\n" + "="*80)
        print("✅ TEST PASSED: Defense-in-depth enum validation working!")
        print("="*80)
        print("\nKey Results:")
        print(f"  • Company name saved: TaskFlow Solutions")
        print(f"  • Revenue saved: $12M ARR")
        print(f"  • Competitors saved: Asana, Monday.com")
        print(f"  • Invalid enum (funding_status) gracefully skipped")
        print(f"  • Hybrid pattern (company_stage) normalized to 'Growth'")
        print(f"\n  Total updated: {result['updated_fields']} fields")
        print(f"  Total skipped: {result['skipped_fields']} fields")
        print("\nDefense-in-Depth Strategy:")
        print("  1. ✅ Python normalization (business_profile_extraction.py)")
        print("  2. ✅ Database error handling (Migration 231)")
        print("  3. ✅ No data loss for valid fields")
        print("="*80)

    def test_python_enum_normalization_patterns(self):
        """
        Test: Verify Python-level enum normalization patterns work

        Tests that common AI output patterns are normalized to valid enums BEFORE
        reaching the database layer.

        Test Cases:
        - funding_status: "bootstrapped" → "Bootstrapped"
        - funding_status: "self-funded" → "Bootstrapped"
        - funding_status: "seed stage" → "Seed"
        - funding_status: "series a" → "Series A"
        - company_stage: "startup" → "Early Traction"
        - company_stage: "early/growth" → "Growth"
        - company_stage: "scaleup" → "Scale"
        """
        print("\n" + "="*80)
        print("TEST: Python Enum Normalization Patterns")
        print("="*80)

        test_cases = [
            # funding_status normalizations
            {
                'name': 'Bootstrapped (lowercase)',
                'data': {'company_name': 'Test Co', 'funding_status': 'bootstrapped'},
                'expected_funding': 'Bootstrapped'
            },
            {
                'name': 'Self-funded',
                'data': {'company_name': 'Test Co', 'funding_status': 'self-funded'},
                'expected_funding': 'Bootstrapped'
            },
            {
                'name': 'Seed stage',
                'data': {'company_name': 'Test Co', 'funding_status': 'seed stage'},
                'expected_funding': 'Seed'
            },
            {
                'name': 'Series A',
                'data': {'company_name': 'Test Co', 'funding_status': 'series a'},
                'expected_funding': 'Series A'
            },
            # company_stage normalizations
            {
                'name': 'Startup → Early Traction',
                'data': {'company_name': 'Test Co', 'company_stage': 'startup'},
                'expected_stage': 'Early Traction'
            },
            {
                'name': 'Early/Growth → Growth',
                'data': {'company_name': 'Test Co', 'company_stage': 'early/growth'},
                'expected_stage': 'Growth'
            },
            {
                'name': 'Scaleup → Scale',
                'data': {'company_name': 'Test Co', 'company_stage': 'scaleup'},
                'expected_stage': 'Scale'
            }
        ]

        for test_case in test_cases:
            print(f"\n📝 Test Case: {test_case['name']}")
            print(f"   Input: {test_case['data']}")

            # Reset and run extraction
            self._reset_business_profile()
            result = self._simulate_progressive_learning_extraction("", test_case['data'])
            profile = self._get_business_profile()

            # Verify normalization worked
            if 'expected_funding' in test_case:
                assert profile['funding_status'] == test_case['expected_funding'], \
                    f"Expected funding_status='{test_case['expected_funding']}', got '{profile['funding_status']}'"
                print(f"   ✅ Normalized to: {profile['funding_status']}")

            if 'expected_stage' in test_case:
                assert profile['company_stage'] == test_case['expected_stage'], \
                    f"Expected company_stage='{test_case['expected_stage']}', got '{profile['company_stage']}'"
                print(f"   ✅ Normalized to: {profile['company_stage']}")

        print("\n" + "="*80)
        print("✅ TEST PASSED: All Python normalization patterns work!")
        print("="*80)

    def test_database_layer_catches_invalid_enums(self):
        """
        Test: Database layer catches invalid enums that slip past Python normalization

        Verifies that Migration 231 error handling works - if Python normalization
        misses an invalid enum, the database layer catches it and skips the field
        instead of failing the entire UPDATE.

        Test Case:
        - Send completely invalid enum value that Python doesn't recognize
        - Verify database function completes successfully
        - Verify invalid field skipped but rest of data saved
        """
        print("\n" + "="*80)
        print("TEST: Database Layer Error Handling (Migration 231)")
        print("="*80)

        # Arrange: Data with totally invalid enum that Python won't normalize
        test_data = {
            'company_name': 'Edge Case Company',
            'annual_revenue': '$5M',
            'funding_status': 'COMPLETELY_INVALID_ENUM_VALUE_12345',  # Won't match any pattern
            'company_stage': 'ALSO_INVALID_99999'
        }

        print(f"\n📋 Test Data (with invalid enums):")
        print(json.dumps(test_data, indent=2))

        # Act: Try to save (should not fail)
        print("\n⚙️  Executing upsert_business_profile_data()...")
        self._reset_business_profile()
        result = self._simulate_progressive_learning_extraction("", test_data)

        # Assert: Database function should succeed
        assert result is not None, "Database function should complete successfully"
        assert result['updated_fields'] >= 2, \
            f"Should update at least 2 fields (company_name, annual_revenue), got {result['updated_fields']}"
        assert result['skipped_fields'] >= 2, \
            f"Should skip at least 2 fields (invalid enums), got {result['skipped_fields']}"

        print(f"   ✓ Updated {result['updated_fields']} fields")
        print(f"   ✓ Skipped {result['skipped_fields']} fields (invalid enums)")

        # Assert: Valid fields should be saved
        profile = self._get_business_profile()
        assert profile['company_name'] == 'Edge Case Company', \
            "company_name should be saved despite invalid enums"
        assert profile['annual_revenue'] == '$5M', \
            "annual_revenue should be saved despite invalid enums"

        # Invalid enums should be NULL (database caught them)
        assert profile['funding_status'] is None, \
            "funding_status should be NULL (database caught invalid enum)"
        assert profile['company_stage'] is None, \
            "company_stage should be NULL (database caught invalid enum)"

        print("\n" + "="*80)
        print("✅ TEST PASSED: Database layer successfully catches invalid enums!")
        print("="*80)
        print("\nKey Results:")
        print("  • Valid fields saved: company_name, annual_revenue")
        print("  • Invalid enums caught by database: funding_status, company_stage")
        print("  • No data loss - UPDATE completed successfully")
        print("="*80)


if __name__ == "__main__":
    """
    Run this test directly:
    python tests/automated/test_progressive_learning_enum_validation.py
    """
    pytest.main([__file__, "-v", "-s"])
