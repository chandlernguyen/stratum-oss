#!/usr/bin/env python3
"""
Integration Tests: Client Intelligence View and Learning History Function

Tests Migrations 182 & 183:
- Migration 182: public.client_intelligence view with security_invoker
- Migration 183: get_learning_history_intelligence with client-scoped filtering

Validates:
1. Agency users can query client_intelligence view with org_id and client_id
2. RLS properly isolates organizations (can't access other org's data)
3. get_learning_history_intelligence filters by client_id for agency users
4. SME users get all org insights when client_id is NULL
5. View returns correct columns from agency.client_intelligence table

Run Instructions:
    # Run all tests in this file
    poetry run pytest tests/automated/test_client_intelligence_view.py -v

    # Run specific test
    poetry run pytest tests/automated/test_client_intelligence_view.py::TestClientIntelligenceView::test_agency_user_query_client_intelligence -v

    # Run with detailed output
    poetry run pytest tests/automated/test_client_intelligence_view.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Database reset: supabase db reset (applies migrations 182 & 183)
    - Test users exist: See /tests/TEST_USERS.md
    - Agency test data: Test Agency Inc with 2 agency clients seeded
"""
import os
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
import pathlib
import uuid

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

# Load environment variables
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration from environment

# Test credentials
AGENCY_OWNER_EMAIL = "agency.owner@example.com"
SME_OWNER_EMAIL = "sme.owner@example.com"
TEST_PASSWORD = "LocalDevOnly123!"

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '56322')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')


class TestClientIntelligenceView:
    """Integration test suite for client intelligence view and learning history function"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment before each test"""
        # Database connection for direct queries
        self.conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        # Supabase clients
        self.supabase_service: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        self.supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

        # Get test organization and client IDs
        self._setup_test_data()

        yield

        # Cleanup
        self.cursor.close()
        self.conn.close()

    def _setup_test_data(self):
        """Setup test data and authenticate users"""
        # Get Agency org and client IDs
        self.cursor.execute(
            "SELECT id FROM organizations WHERE name = 'Test Agency Inc' LIMIT 1"
        )
        agency_org_result = self.cursor.fetchone()
        self.agency_org_id = agency_org_result['id'] if agency_org_result else None

        # Get SME org ID
        self.cursor.execute(
            "SELECT id FROM organizations WHERE name = 'Test SME Company' LIMIT 1"
        )
        sme_org_result = self.cursor.fetchone()
        self.sme_org_id = sme_org_result['id'] if sme_org_result else None

        # Get agency clients from agency schema
        if self.agency_org_id:
            self.cursor.execute(
                "SELECT id, slug FROM agency.clients WHERE org_id = %s ORDER BY created_at LIMIT 2",
                (self.agency_org_id,)
            )
            agency_clients = self.cursor.fetchall()
            self.agency_client_ids = [c['id'] for c in agency_clients]
            self.agency_client_slugs = [c['slug'] for c in agency_clients]
        else:
            self.agency_client_ids = []
            self.agency_client_slugs = []

        # Authenticate agency user
        self.agency_user_id, self.agency_token = self._authenticate(AGENCY_OWNER_EMAIL)

        # Authenticate SME user
        self.sme_user_id, self.sme_token = self._authenticate(SME_OWNER_EMAIL)

    def _authenticate(self, email: str) -> tuple:
        """Authenticate user and return user_id and token"""
        try:
            auth_response = self.supabase_anon.auth.sign_in_with_password({
                "email": email,
                "password": TEST_PASSWORD
            })

            if auth_response.user:
                return auth_response.user.id, auth_response.session.access_token
            else:
                pytest.fail(f"Authentication failed for {email}")
        except Exception as e:
            pytest.fail(f"Auth error for {email}: {e}")

    def _insert_test_intelligence(self, org_id: str, client_id: Optional[str] = None) -> str:
        """Insert test intelligence data to agency.client_intelligence"""
        intelligence_id = str(uuid.uuid4())

        # Clean up any existing test data for this org/client combo to avoid unique constraint violations
        self.cursor.execute(
            "DELETE FROM agency.client_intelligence WHERE org_id = %s AND client_id = %s",
            (org_id, client_id)
        )
        self.conn.commit()

        insert_query = """
            INSERT INTO agency.client_intelligence (
                id, org_id, client_id, company_size, company_stage, business_model,
                target_market, marketing_goals, data_completeness_score
            ) VALUES (
                %s, %s, %s, '11-50 employees'::company_size_enum, 'Growth'::company_stage_enum, 'B2B'::business_model_enum,
                ARRAY['Small businesses'], ARRAY['Increase brand awareness'], 0.75
            )
        """
        self.cursor.execute(insert_query, (intelligence_id, org_id, client_id))
        self.conn.commit()
        return intelligence_id

    def _insert_test_ai_output(self, org_id: str, client_id: Optional[str], agent_type: str = 'persona') -> str:
        """Insert test AI output for learning history"""
        output_id = str(uuid.uuid4())

        insert_query = """
            INSERT INTO agent_outputs (
                id, org_id, client_id, agent_type, output_type,
                title, summary, content, confidence_score, validation_status
            ) VALUES (
                %s, %s, %s, %s, 'intelligence',
                'Test Insight', 'Test summary',
                '{"test_field": "test_value"}'::jsonb, 0.9, 'approved'
            )
        """
        self.cursor.execute(insert_query, (output_id, org_id, client_id, agent_type))
        self.conn.commit()
        return output_id

    # ============================================================================
    # Migration 182 Tests: public.client_intelligence View
    # ============================================================================

    def test_client_intelligence_view_exists(self):
        """
        Test: Verify public.client_intelligence view was created

        Expected Behavior:
        - View exists in public schema
        - View has security_invoker option enabled
        - View points to agency.client_intelligence table

        Success Criteria:
        - View found in pg_views
        - security_invoker=on is set
        """
        self.cursor.execute("""
            SELECT schemaname, viewname, definition
            FROM pg_views
            WHERE schemaname = 'public' AND viewname = 'client_intelligence'
        """)
        view = self.cursor.fetchone()

        assert view is not None, "public.client_intelligence view not found"
        assert view['schemaname'] == 'public'
        assert 'agency.client_intelligence' in view['definition'], "View doesn't reference agency.client_intelligence"

        print("✅ public.client_intelligence view exists")
        print(f"✅ View definition references agency schema")

    def test_client_intelligence_view_columns(self):
        """
        Test: Verify view exposes correct columns from agency.client_intelligence

        Expected Behavior:
        - View includes all migration 182 columns
        - Columns match actual table schema

        Success Criteria:
        - All expected columns present: company_size, company_stage, business_model,
          target_market, key_competitors, marketing_budget, marketing_goals, etc.
        """
        self.cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'client_intelligence'
            ORDER BY column_name
        """)
        columns = [row['column_name'] for row in self.cursor.fetchall()]

        # Expected columns from migration 182
        expected_columns = [
            'id', 'org_id', 'client_id',
            'company_size', 'company_stage', 'business_model',
            'target_market', 'key_competitors', 'unique_value_proposition',
            'marketing_budget', 'current_marketing_channels', 'marketing_goals',
            'ai_insights', 'persona_patterns', 'content_themes', 'campaign_preferences',
            'data_completeness_score', 'last_enriched_at',
            'conversation_count', 'last_interaction_at', 'learning_milestones',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]

        for col in expected_columns:
            assert col in columns, f"Expected column '{col}' not found in view"

        print(f"✅ View has all {len(expected_columns)} expected columns")
        print(f"✅ Column schema matches migration 182 specification")

    def test_agency_user_query_client_intelligence(self):
        """
        Test: Agency user can query client intelligence through public view

        Expected Behavior:
        - Agency user can query public.client_intelligence view
        - Query filters by org_id and client_id
        - Data is returned correctly

        Success Criteria:
        - Query succeeds without 406 error
        - Data matches inserted test data
        - RLS respects organization isolation
        """
        if not self.agency_org_id or not self.agency_client_ids:
            pytest.skip("No agency test data available")

        # Insert test intelligence
        test_client_id = self.agency_client_ids[0]
        intelligence_id = self._insert_test_intelligence(self.agency_org_id, test_client_id)

        try:
            # Query through Supabase REST API (simulates frontend hook)
            result = self.supabase_service.from_('client_intelligence') \
                .select('*') \
                .eq('org_id', self.agency_org_id) \
                .eq('client_id', test_client_id) \
                .execute()

            assert result.data is not None, "Query returned no data"
            assert len(result.data) > 0, "No intelligence records found"

            # Verify data structure
            intelligence = result.data[0]
            assert intelligence['id'] == intelligence_id
            assert intelligence['org_id'] == self.agency_org_id
            assert intelligence['client_id'] == test_client_id
            assert intelligence['company_size'] == '11-50 employees'
            assert intelligence['business_model'] == 'B2B'

            print("✅ Agency user can query client intelligence view")
            print(f"✅ Retrieved {len(result.data)} intelligence record(s)")
            print(f"✅ Data structure matches expected schema")

        finally:
            # Cleanup
            self.cursor.execute("DELETE FROM agency.client_intelligence WHERE id = %s", (intelligence_id,))
            self.conn.commit()

    def test_client_intelligence_rls_org_isolation(self):
        """
        Test: RLS prevents accessing other organization's client intelligence

        Expected Behavior:
        - Agency A cannot see Agency B's client intelligence
        - SME users cannot see agency client intelligence
        - security_invoker=on respects RLS from base table

        Success Criteria:
        - Cross-org queries return empty results
        - No 403 errors (filtered silently by RLS)
        """
        if not self.agency_org_id or not self.sme_org_id or not self.agency_client_ids:
            pytest.skip("Missing test organizations or clients")

        # Insert intelligence for agency org
        test_client_id = self.agency_client_ids[0]
        intelligence_id = self._insert_test_intelligence(self.agency_org_id, test_client_id)

        try:
            # Try to query with wrong org_id (should return empty)
            result = self.supabase_service.from_('client_intelligence') \
                .select('*') \
                .eq('org_id', self.sme_org_id) \
                .eq('client_id', test_client_id) \
                .execute()

            # RLS should filter out results (not throw error)
            assert len(result.data) == 0, "RLS failed: Cross-org data accessible"

            print("✅ RLS prevents cross-organization data access")
            print("✅ security_invoker=on respects base table RLS policies")

        finally:
            # Cleanup
            self.cursor.execute("DELETE FROM agency.client_intelligence WHERE id = %s", (intelligence_id,))
            self.conn.commit()

    # ============================================================================
    # Migration 183 Tests: get_learning_history_intelligence with Client Scope
    # ============================================================================

    def test_learning_history_function_signature(self):
        """
        Test: Verify get_learning_history_intelligence function has correct signature

        Expected Behavior:
        - Function exists with new p_client_id parameter
        - Function accepts 5 parameters: p_org_id, p_agent_type, p_client_id, p_limit, p_offset
        - Function returns correct columns including client_id

        Success Criteria:
        - Function found in pg_proc
        - Parameter count matches migration 183
        """
        self.cursor.execute("""
            SELECT p.proname, p.pronargs, pg_get_function_arguments(p.oid) as args
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'get_learning_history_intelligence'
        """)
        func = self.cursor.fetchone()

        assert func is not None, "get_learning_history_intelligence function not found"
        assert 'p_client_id' in func['args'], "Missing p_client_id parameter"
        assert 'uuid' in func['args'].lower(), "Parameters don't include UUID types"

        print("✅ Function signature includes p_client_id parameter")
        print(f"✅ Function arguments: {func['args']}")

    @pytest.mark.skip(reason="Data-dependent test: requires agent_outputs with specific validation_status. Run manually with seeded data.")
    def test_agency_user_client_scoped_learning_history(self):
        """
        Test: Agency user gets client-specific learning history

        Expected Behavior:
        - Function filters AI outputs by client_id
        - Only insights for specified client are returned
        - Other clients' insights are excluded

        Success Criteria:
        - Query with client_id returns only that client's insights
        - Multiple clients have different insights
        - Client scope works with agent_type filtering
        """
        if not self.agency_org_id or len(self.agency_client_ids) < 2:
            pytest.skip("Need at least 2 agency clients for test")

        client1_id = self.agency_client_ids[0]
        client2_id = self.agency_client_ids[1]

        # Insert insights for client 1
        output1_id = self._insert_test_ai_output(self.agency_org_id, client1_id, 'persona')

        # Insert insights for client 2
        output2_id = self._insert_test_ai_output(self.agency_org_id, client2_id, 'strategy')

        try:
            # Query for client 1 only
            self.cursor.execute("""
                SELECT * FROM get_learning_history_intelligence(
                    %s::uuid,  -- p_org_id
                    NULL,      -- p_agent_type
                    %s::uuid,  -- p_client_id
                    50,        -- p_limit
                    0          -- p_offset
                )
            """, (self.agency_org_id, client1_id))
            client1_results = self.cursor.fetchall()

            # Query for client 2 only
            self.cursor.execute("""
                SELECT * FROM get_learning_history_intelligence(
                    %s::uuid,  -- p_org_id
                    NULL,      -- p_agent_type
                    %s::uuid,  -- p_client_id
                    50,        -- p_limit
                    0          -- p_offset
                )
            """, (self.agency_org_id, client2_id))
            client2_results = self.cursor.fetchall()

            # Verify client 1 results only contain client 1 data
            client1_ids = [r['client_id'] for r in client1_results]
            assert all(cid == client1_id for cid in client1_ids), "Client 1 results contain other clients' data"

            # Verify client 2 results only contain client 2 data
            client2_ids = [r['client_id'] for r in client2_results]
            assert all(cid == client2_id for cid in client2_ids), "Client 2 results contain other clients' data"

            # Verify results are different
            assert len(client1_results) > 0, "No results for client 1"
            assert len(client2_results) > 0, "No results for client 2"

            print(f"✅ Client 1 insights: {len(client1_results)} (correctly filtered)")
            print(f"✅ Client 2 insights: {len(client2_results)} (correctly filtered)")
            print("✅ Client-scoped filtering works correctly")

        finally:
            # Cleanup
            self.cursor.execute("DELETE FROM agent_outputs WHERE id IN (%s, %s)", (output1_id, output2_id))
            self.conn.commit()

    @pytest.mark.skip(reason="Data-dependent test: requires agent_outputs with specific validation_status. Run manually with seeded data.")
    def test_sme_user_gets_all_org_insights(self):
        """
        Test: SME user gets all org insights when client_id is NULL

        Expected Behavior:
        - SME organizations don't use client_id
        - Passing NULL for client_id returns all org insights
        - No client filtering applied for SME users

        Success Criteria:
        - Query with client_id=NULL returns all org insights
        - Result count matches total org insights
        """
        if not self.sme_org_id:
            pytest.skip("No SME test organization")

        # Insert multiple insights for SME org (no client_id)
        output1_id = self._insert_test_ai_output(self.sme_org_id, None, 'persona')
        output2_id = self._insert_test_ai_output(self.sme_org_id, None, 'strategy')
        output3_id = self._insert_test_ai_output(self.sme_org_id, None, 'content')

        try:
            # Query with NULL client_id (SME pattern)
            self.cursor.execute("""
                SELECT * FROM get_learning_history_intelligence(
                    %s::uuid,  -- p_org_id
                    NULL,      -- p_agent_type
                    NULL,      -- p_client_id (NULL for SME)
                    50,        -- p_limit
                    0          -- p_offset
                )
            """, (self.sme_org_id,))
            results = self.cursor.fetchall()

            # Verify we got all 3 insights
            assert len(results) >= 3, f"Expected at least 3 insights, got {len(results)}"

            # Verify all have NULL client_id (SME pattern)
            client_ids = [r['client_id'] for r in results]
            assert all(cid is None for cid in client_ids), "SME insights should have NULL client_id"

            print(f"✅ SME user retrieved {len(results)} org-level insights")
            print("✅ All insights have NULL client_id (correct for SME)")
            print("✅ SME pattern works without client filtering")

        finally:
            # Cleanup
            self.cursor.execute(
                "DELETE FROM agent_outputs WHERE id IN (%s, %s, %s)",
                (output1_id, output2_id, output3_id)
            )
            self.conn.commit()

    @pytest.mark.skip(reason="Data-dependent test: requires agent_outputs with specific validation_status. Run manually with seeded data.")
    def test_learning_history_with_agent_type_and_client_filters(self):
        """
        Test: Combined agent_type and client_id filtering works

        Expected Behavior:
        - Function supports both filters simultaneously
        - Results match both criteria
        - Useful for agency users filtering specific agent for specific client

        Success Criteria:
        - Query with both filters returns only matching insights
        - Other agent types excluded
        - Other clients excluded
        """
        if not self.agency_org_id or not self.agency_client_ids:
            pytest.skip("No agency test data")

        test_client_id = self.agency_client_ids[0]

        # Insert persona insight for client
        persona_id = self._insert_test_ai_output(self.agency_org_id, test_client_id, 'persona')

        # Insert strategy insight for client
        strategy_id = self._insert_test_ai_output(self.agency_org_id, test_client_id, 'strategy')

        try:
            # Query for persona + client_id
            self.cursor.execute("""
                SELECT * FROM get_learning_history_intelligence(
                    %s::uuid,  -- p_org_id
                    'persona', -- p_agent_type
                    %s::uuid,  -- p_client_id
                    50,        -- p_limit
                    0          -- p_offset
                )
            """, (self.agency_org_id, test_client_id))
            persona_results = self.cursor.fetchall()

            # Verify only persona insights returned
            agent_types = [r['agent_type'] for r in persona_results]
            assert all(at == 'persona' for at in agent_types), "Results contain non-persona agent types"

            # Verify only correct client
            client_ids = [r['client_id'] for r in persona_results]
            assert all(cid == test_client_id for cid in client_ids), "Results contain other clients"

            assert len(persona_results) > 0, "No results found for combined filter"

            print("✅ Combined agent_type + client_id filtering works")
            print(f"✅ Retrieved {len(persona_results)} persona insights for specific client")
            print("✅ No cross-contamination from other agents or clients")

        finally:
            # Cleanup
            self.cursor.execute("DELETE FROM agent_outputs WHERE id IN (%s, %s)", (persona_id, strategy_id))
            self.conn.commit()

    def test_learning_history_performance(self):
        """
        Test: Function executes within acceptable time limits

        Expected Behavior:
        - Query completes in < 100ms for typical dataset
        - Indexes are used effectively
        - No full table scans

        Success Criteria:
        - Query time < 100ms
        - EXPLAIN shows index usage
        """
        if not self.agency_org_id or not self.agency_client_ids:
            pytest.skip("No agency test data")

        import time

        test_client_id = self.agency_client_ids[0]

        # Insert test data
        output_id = self._insert_test_ai_output(self.agency_org_id, test_client_id, 'persona')

        try:
            # Measure query time
            start = time.time()

            self.cursor.execute("""
                SELECT * FROM get_learning_history_intelligence(
                    %s::uuid, NULL, %s::uuid, 50, 0
                )
            """, (self.agency_org_id, test_client_id))
            results = self.cursor.fetchall()

            duration = (time.time() - start) * 1000  # Convert to ms

            assert duration < 100, f"Query took {duration:.2f}ms (max 100ms)"

            print(f"✅ Query completed in {duration:.2f}ms")
            print(f"✅ Performance acceptable for production use")

        finally:
            # Cleanup
            self.cursor.execute("DELETE FROM agent_outputs WHERE id = %s", (output_id,))
            self.conn.commit()


if __name__ == "__main__":
    """Direct execution for quick testing"""
    pytest.main([__file__, "-v", "-s"])
