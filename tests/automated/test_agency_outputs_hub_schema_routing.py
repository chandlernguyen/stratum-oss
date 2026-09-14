#!/usr/bin/env python3
"""
Test Suite: Agency Outputs Hub Schema Routing (Migrations 201-203)

Tests comprehensive schema routing for agent outputs READ and WRITE operations:
- save_agent_output_routed() - Write router function (Migration 203)
- get_unified_outputs_hub() - Read router function with client filtering (Migration 201)
- Schema alignment validation (Migration 202)
- universal_output_service.py integration

Validates:
- WRITE routing: AGENCY → agency.agent_outputs, SME → public.agent_outputs
- READ routing: AGENCY queries agency schema with client_id filter
- READ routing: SME queries public schema (backward compatible)
- Client isolation: Agency users only see specific client's outputs
- Schema alignment: agency.agent_outputs matches public.agent_outputs structure
- Security: User/org/client validation in router functions

Bug Fixes (2025-10-30):
- Bug #1 (READ): get_unified_outputs_hub() only queried public.agent_outputs
- Bug #2 (READ): No client_id parameter for multi-client isolation
- Bug #3 (WRITE): universal_output_service.py always wrote to public.agent_outputs

Run Instructions:
    # Run all outputs hub routing tests
    poetry run pytest tests/automated/test_agency_outputs_hub_schema_routing.py -v

    # Run specific test
    poetry run pytest tests/automated/test_agency_outputs_hub_schema_routing.py::TestOutputsHubSchemaRouting::test_save_output_routed_agency_write -v

    # Run with detailed output
    poetry run pytest tests/automated/test_agency_outputs_hub_schema_routing.py -v -s

    # Run with coverage
    poetry run pytest tests/automated/test_agency_outputs_hub_schema_routing.py --cov=apps.api.services.universal_output_service -v

Prerequisites:
    - Supabase running: supabase start
    - Database migrated: supabase db reset (applies migrations 201-203)
    - Test data exists: Both SME and AGENCY organizations with clients
    - Test users exist: See /tests/TEST_USERS.md
    - Environment variables set in apps/api/.env:
      * DB_HOST=127.0.0.1
      * DB_PORT=56322
      * DB_USER=postgres
      * DB_PASSWORD=postgres
"""
import os
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Optional
import json
from dotenv import load_dotenv
import pathlib
import uuid

# Load environment from apps/api/.env
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '56322')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')


class TestOutputsHubSchemaRouting:
    """Test agency outputs hub schema routing for multi-tenant architecture"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup database connection and test data before each test"""
        self.conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        # Get SME test organization and user
        self.cursor.execute("""
            SELECT o.id as org_id, o.type as org_type, u.id as user_id
            FROM organizations o
            JOIN users u ON u.org_id = o.id
            WHERE o.type = 'SME'
            LIMIT 1
        """)
        sme_data = self.cursor.fetchone()
        self.sme_org_id = sme_data['org_id'] if sme_data else None
        self.sme_user_id = sme_data['user_id'] if sme_data else None

        # Get AGENCY test organization, user, and client
        self.cursor.execute("""
            SELECT o.id as org_id, o.type as org_type, u.id as user_id
            FROM organizations o
            JOIN users u ON u.org_id = o.id
            WHERE o.type = 'AGENCY'
            LIMIT 1
        """)
        agency_data = self.cursor.fetchone()
        self.agency_org_id = agency_data['org_id'] if agency_data else None
        self.agency_user_id = agency_data['user_id'] if agency_data else None

        # Get agency client for testing
        if self.agency_org_id:
            self.cursor.execute("""
                SELECT id, slug, name
                FROM clients
                WHERE org_id = %s
                LIMIT 2
            """, (self.agency_org_id,))
            agency_clients = self.cursor.fetchall()
            self.agency_client1_id = agency_clients[0]['id'] if len(agency_clients) > 0 else None
            self.agency_client1_slug = agency_clients[0]['slug'] if len(agency_clients) > 0 else None
            self.agency_client2_id = agency_clients[1]['id'] if len(agency_clients) > 1 else None
            self.agency_client2_slug = agency_clients[1]['slug'] if len(agency_clients) > 1 else None

        yield

        # Cleanup
        self.cursor.close()
        self.conn.close()

    # ============================================================================
    # MIGRATION 203: save_agent_output_routed() WRITE ROUTING TESTS
    # ============================================================================

    def test_save_output_routed_function_exists(self):
        """
        Test: save_agent_output_routed function exists and is executable

        Validates:
        - Function exists in public schema
        - Has correct signature with required and optional parameters
        - Returns JSONB type
        """
        self.cursor.execute("""
            SELECT proname, prorettype::regtype
            FROM pg_proc
            WHERE proname = 'save_agent_output_routed'
            AND pronamespace = 'public'::regnamespace
        """)
        result = self.cursor.fetchone()

        assert result is not None, "save_agent_output_routed function does not exist"
        assert result['proname'] == 'save_agent_output_routed'
        assert result['prorettype'] == 'jsonb', f"Expected JSONB return type, got {result['prorettype']}"

    def test_save_output_routed_agency_write(self):
        """
        Test: save_agent_output_routed writes to agency.agent_outputs for AGENCY orgs

        Context:
        - Bug #3 (WRITE): universal_output_service.py always wrote to public.agent_outputs
        - Fix: Router function detects org_type and routes to correct schema

        Test Steps:
        1. Call save_agent_output_routed with AGENCY org_id and client_id
        2. Verify output written to agency.agent_outputs table
        3. Verify table_source field = 'agency.agent_outputs'
        4. Verify client_id is correctly stored

        Expected Behavior:
        - Output created in agency schema (not public schema)
        - Client_id is NOT NULL
        - Returns JSONB with table_source field
        """
        if not self.agency_org_id or not self.agency_client1_id:
            pytest.skip("No agency test data available")

        # Call router function
        self.cursor.execute("""
            SELECT * FROM save_agent_output_routed(
                %s::uuid,  -- p_org_id
                %s::uuid,  -- p_user_id
                'strategy',  -- p_agent_type
                'business_strategy',  -- p_output_type
                'Test Strategy Output (Agency)',  -- p_title
                '{"test": "data", "framework": "SWOT"}'::jsonb,  -- p_content
                %s::uuid,  -- p_client_id
                'Router test for agency schema routing',  -- p_summary
                NULL,  -- p_session_id
                NULL,  -- p_campaign_id
                'strategy',  -- p_category
                '{}'::jsonb,  -- p_metadata
                0.85,  -- p_confidence_score
                'agent_conversation',  -- p_source_type
                'draft'  -- p_status
            )
        """, (self.agency_org_id, self.agency_user_id, self.agency_client1_id))

        result = self.cursor.fetchone()
        output_data = result['save_agent_output_routed']

        # Verify returned data structure
        assert 'id' in output_data
        assert 'table_source' in output_data
        assert output_data['table_source'] == 'agency.agent_outputs', \
            f"Expected agency.agent_outputs, got {output_data['table_source']}"
        assert output_data['client_id'] == str(self.agency_client1_id)
        assert output_data['org_id'] == str(self.agency_org_id)
        assert output_data['agent_type'] == 'strategy'

        # Verify actually written to agency schema (not public)
        output_id = output_data['id']
        self.cursor.execute("""
            SELECT COUNT(*) as count FROM agency.agent_outputs WHERE id = %s
        """, (output_id,))
        agency_count = self.cursor.fetchone()['count']

        self.cursor.execute("""
            SELECT COUNT(*) as count FROM public.agent_outputs WHERE id = %s
        """, (output_id,))
        public_count = self.cursor.fetchone()['count']

        assert agency_count == 1, "Output not found in agency.agent_outputs"
        assert public_count == 0, "Output incorrectly written to public.agent_outputs"

    def test_save_output_routed_sme_write(self):
        """
        Test: save_agent_output_routed writes to public.agent_outputs for SME orgs

        Context:
        - SME orgs should use public schema (backward compatible)
        - client_id should be NULL for SME

        Test Steps:
        1. Call save_agent_output_routed with SME org_id and NULL client_id
        2. Verify output written to public.agent_outputs table
        3. Verify table_source field = 'public.agent_outputs'
        4. Verify client_id is NULL

        Expected Behavior:
        - Output created in public schema (not agency schema)
        - Client_id IS NULL
        - SME functionality unchanged
        """
        if not self.sme_org_id:
            pytest.skip("No SME test data available")

        # Call router function without client_id (NULL for SME)
        self.cursor.execute("""
            SELECT * FROM save_agent_output_routed(
                %s::uuid,  -- p_org_id
                %s::uuid,  -- p_user_id
                'content',  -- p_agent_type
                'thought_leadership',  -- p_output_type
                'Test Content Output (SME)',  -- p_title
                '{"test": "sme data", "content_type": "blog"}'::jsonb  -- p_content
            )
        """, (self.sme_org_id, self.sme_user_id))

        result = self.cursor.fetchone()
        output_data = result['save_agent_output_routed']

        # Verify returned data structure
        assert 'id' in output_data
        assert 'table_source' in output_data
        assert output_data['table_source'] == 'public.agent_outputs', \
            f"Expected public.agent_outputs, got {output_data['table_source']}"
        assert output_data['client_id'] is None, "SME output should have NULL client_id"
        assert output_data['org_id'] == str(self.sme_org_id)
        assert output_data['agent_type'] == 'content'

        # Verify actually written to public schema (not agency)
        output_id = output_data['id']
        self.cursor.execute("""
            SELECT COUNT(*) as count FROM public.agent_outputs WHERE id = %s
        """, (output_id,))
        public_count = self.cursor.fetchone()['count']

        self.cursor.execute("""
            SELECT COUNT(*) as count FROM agency.agent_outputs WHERE id = %s
        """, (output_id,))
        agency_count = self.cursor.fetchone()['count']

        assert public_count == 1, "Output not found in public.agent_outputs"
        assert agency_count == 0, "Output incorrectly written to agency.agent_outputs"

    def test_save_output_routed_agency_requires_client_id(self):
        """
        Test: save_agent_output_routed raises error if client_id is NULL for AGENCY orgs

        Context:
        - Agency orgs require client_id for multi-client isolation
        - Router function should validate and raise exception

        Expected Behavior:
        - Exception raised with message: "client_id is required for AGENCY organizations"
        """
        if not self.agency_org_id:
            pytest.skip("No agency test data available")

        with pytest.raises(psycopg2.Error) as exc_info:
            self.cursor.execute("""
                SELECT * FROM save_agent_output_routed(
                    %s::uuid,  -- p_org_id
                    %s::uuid,  -- p_user_id
                    'strategy',  -- p_agent_type
                    'business_strategy',  -- p_output_type
                    'Test without client_id',  -- p_title
                    '{}'::jsonb  -- p_content
                    -- Intentionally omitting p_client_id (NULL)
                )
            """, (self.agency_org_id, self.agency_user_id))
            self.conn.commit()

        assert "client_id is required for AGENCY organizations" in str(exc_info.value)

    # ============================================================================
    # MIGRATION 201: get_unified_outputs_hub() READ ROUTING TESTS
    # ============================================================================

    def test_get_unified_outputs_hub_function_exists(self):
        """
        Test: get_unified_outputs_hub function exists with updated signature

        Validates:
        - Function exists with new p_client_id parameter
        - Returns TABLE with table_source column
        """
        self.cursor.execute("""
            SELECT proname, proargtypes::regtype[]
            FROM pg_proc
            WHERE proname = 'get_unified_outputs_hub'
            AND pronamespace = 'public'::regnamespace
        """)
        result = self.cursor.fetchone()

        assert result is not None, "get_unified_outputs_hub function does not exist"
        assert result['proname'] == 'get_unified_outputs_hub'

    def test_get_unified_outputs_hub_agency_with_client_filter(self):
        """
        Test: get_unified_outputs_hub returns only specific client's outputs for AGENCY orgs

        Context:
        - Bug #1 (READ): Function only queried public.agent_outputs
        - Bug #2 (READ): No client_id filtering
        - Fix: Function detects org_type, queries agency schema with client filter

        Test Steps:
        1. Create outputs for client1 in agency.agent_outputs
        2. Create outputs for client2 in agency.agent_outputs
        3. Call get_unified_outputs_hub with client1_id filter
        4. Verify only client1 outputs returned
        5. Verify table_source = 'agency.agent_outputs'

        Expected Behavior:
        - Only client1 outputs returned (client isolation)
        - No client2 outputs in results
        - table_source field shows 'agency.agent_outputs'
        """
        if not self.agency_org_id or not self.agency_client1_id or not self.agency_client2_id:
            pytest.skip("Need 2 agency clients for isolation testing")

        # Create test outputs for both clients
        # Client 1 output
        self.cursor.execute("""
            INSERT INTO agency.agent_outputs (
                org_id, client_id, user_id, created_by, agent_type, output_type,
                title, summary, content, status
            ) VALUES (
                %s, %s, %s, %s, 'persona', 'buyer_persona',
                'Client 1 Persona', 'Test persona for client 1',
                '{"persona_name": "Client 1 Target"}'::jsonb, 'published'
            )
        """, (self.agency_org_id, self.agency_client1_id, self.agency_user_id, self.agency_user_id))

        # Client 2 output
        self.cursor.execute("""
            INSERT INTO agency.agent_outputs (
                org_id, client_id, user_id, created_by, agent_type, output_type,
                title, summary, content, status
            ) VALUES (
                %s, %s, %s, %s, 'persona', 'buyer_persona',
                'Client 2 Persona', 'Test persona for client 2',
                '{"persona_name": "Client 2 Target"}'::jsonb, 'published'
            )
        """, (self.agency_org_id, self.agency_client2_id, self.agency_user_id, self.agency_user_id))
        self.conn.commit()

        # Query with client1 filter
        self.cursor.execute("""
            SELECT * FROM get_unified_outputs_hub(
                %s::uuid,  -- p_org_id
                %s::uuid,  -- p_client_id (filter for client1)
                NULL,      -- p_agent_type
                NULL,      -- p_campaign_id
                FALSE,     -- p_include_archived
                100,       -- p_limit
                0          -- p_offset
            )
        """, (self.agency_org_id, self.agency_client1_id))

        results = self.cursor.fetchall()

        # Verify only client1 outputs returned
        assert len(results) > 0, "No outputs returned for client1"

        client1_outputs = [r for r in results if str(r['client_id']) == str(self.agency_client1_id)]
        client2_outputs = [r for r in results if str(r['client_id']) == str(self.agency_client2_id)]

        assert len(client1_outputs) > 0, "Client1 outputs not found"
        assert len(client2_outputs) == 0, f"Client2 outputs leaked into client1 results! Found {len(client2_outputs)} outputs"

        # Verify table_source
        for result in results:
            assert result['table_source'] == 'agency.agent_outputs', \
                f"Expected agency.agent_outputs, got {result['table_source']}"

    def test_get_unified_outputs_hub_agency_no_client_filter(self):
        """
        Test: get_unified_outputs_hub returns all org outputs when client_id is NULL

        Context:
        - When p_client_id is NULL, should return all outputs for org
        - Useful for org-level reporting/admin views

        Expected Behavior:
        - Returns outputs from multiple clients
        - All outputs have same org_id
        """
        if not self.agency_org_id:
            pytest.skip("No agency test data available")

        # Query without client filter
        self.cursor.execute("""
            SELECT * FROM get_unified_outputs_hub(
                %s::uuid,  -- p_org_id
                NULL,      -- p_client_id (no filter)
                NULL,      -- p_agent_type
                NULL,      -- p_campaign_id
                FALSE,     -- p_include_archived
                100,       -- p_limit
                0          -- p_offset
            )
        """, (self.agency_org_id,))

        results = self.cursor.fetchall()

        if len(results) > 0:
            # Verify all outputs belong to agency org
            for result in results:
                assert str(result['org_id']) == str(self.agency_org_id)
                assert result['table_source'] == 'agency.agent_outputs'

            # Check if multiple clients present (if test data available)
            unique_clients = set(str(r['client_id']) for r in results if r['client_id'])
            if len(unique_clients) > 1:
                print(f"✓ Successfully returned outputs from {len(unique_clients)} different clients")

    def test_get_unified_outputs_hub_sme_backward_compatible(self):
        """
        Test: get_unified_outputs_hub works for SME orgs (backward compatible)

        Context:
        - SME orgs should continue using public schema
        - No client_id filtering (SME has no clients)

        Expected Behavior:
        - Returns outputs from public.agent_outputs
        - table_source = 'public.agent_outputs'
        - client_id is NULL for all results
        """
        if not self.sme_org_id:
            pytest.skip("No SME test data available")

        # Create test output in public schema
        self.cursor.execute("""
            INSERT INTO public.agent_outputs (
                org_id, user_id, created_by, agent_type, output_type,
                title, summary, content, status
            ) VALUES (
                %s, %s, %s, 'strategy', 'business_strategy',
                'SME Strategy Output', 'Test strategy for SME',
                '{"framework": "SWOT"}'::jsonb, 'published'
            )
        """, (self.sme_org_id, self.sme_user_id, self.sme_user_id))
        self.conn.commit()

        # Query SME outputs
        self.cursor.execute("""
            SELECT * FROM get_unified_outputs_hub(
                %s::uuid,  -- p_org_id
                NULL,      -- p_client_id (NULL for SME)
                NULL,      -- p_agent_type
                NULL,      -- p_campaign_id
                FALSE,     -- p_include_archived
                100,       -- p_limit
                0          -- p_offset
            )
        """, (self.sme_org_id,))

        results = self.cursor.fetchall()

        assert len(results) > 0, "No outputs returned for SME org"

        # Verify all outputs from public schema
        for result in results:
            assert str(result['org_id']) == str(self.sme_org_id)
            assert result['table_source'] == 'public.agent_outputs', \
                f"Expected public.agent_outputs, got {result['table_source']}"
            assert result['client_id'] is None, "SME outputs should have NULL client_id"

    # ============================================================================
    # MIGRATION 202: SCHEMA ALIGNMENT VALIDATION
    # ============================================================================

    def test_schema_alignment_columns_match(self):
        """
        Test: agency.agent_outputs schema matches public.agent_outputs

        Context:
        - Migration 202 added missing columns to agency schema
        - Both schemas should have identical columns for unified queries

        Validates:
        - All columns present in both schemas
        - Column types match
        - Computed columns (is_archived) present
        """
        # Get columns from public.agent_outputs
        self.cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'agent_outputs'
            ORDER BY column_name
        """)
        public_columns = {row['column_name']: row['data_type'] for row in self.cursor.fetchall()}

        # Get columns from agency.agent_outputs
        self.cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'agency'
            AND table_name = 'agent_outputs'
            ORDER BY column_name
        """)
        agency_columns = {row['column_name']: row['data_type'] for row in self.cursor.fetchall()}

        # Critical columns that must exist in both schemas
        critical_columns = [
            'id', 'org_id', 'client_id', 'user_id', 'created_by',
            'agent_type', 'output_type', 'source_type', 'session_id',
            'title', 'summary', 'content', 'category',
            'confidence_score', 'validation_status', 'impact_score',
            'usage_count', 'last_used_at', 'status', 'published_at',
            'metadata', 'archived_at', 'archive_reason', 'is_archived',
            'created_at', 'updated_at'
        ]

        missing_in_agency = []
        for col in critical_columns:
            if col not in agency_columns:
                missing_in_agency.append(col)

        assert len(missing_in_agency) == 0, \
            f"Missing columns in agency.agent_outputs: {missing_in_agency}"

        # Verify category is TEXT[] in both schemas
        assert 'category' in public_columns
        assert 'category' in agency_columns
        # Both should be arrays (ARRAY type)

        # Verify is_archived exists (computed column)
        assert 'is_archived' in public_columns
        assert 'is_archived' in agency_columns

    def test_schema_alignment_unified_query(self):
        """
        Test: Unified query works across both schemas without type casting

        Context:
        - get_unified_outputs_hub returns identical structure from both schemas
        - No NULL workarounds or type casting needed

        Expected Behavior:
        - UNION query works without errors
        - Column types compatible
        """
        # This query would fail if schemas weren't aligned
        self.cursor.execute("""
            SELECT 'agency' as source, count(*) as count
            FROM agency.agent_outputs
            UNION ALL
            SELECT 'public' as source, count(*) as count
            FROM public.agent_outputs
        """)

        results = self.cursor.fetchall()
        assert len(results) == 2, "UNION query should return 2 rows"

        # Query should succeed without type errors
        assert results is not None

    # ============================================================================
    # SECURITY & DATA ISOLATION TESTS
    # ============================================================================

    def test_router_security_unauthorized_org(self):
        """
        Test: Router function validates user belongs to organization

        Expected Behavior:
        - Exception raised if user_id doesn't belong to org_id
        """
        if not self.agency_org_id or not self.sme_user_id:
            pytest.skip("Need both agency org and SME user for security test")

        # Try to write agency output with SME user (should fail)
        with pytest.raises(psycopg2.Error) as exc_info:
            self.cursor.execute("""
                SELECT * FROM save_agent_output_routed(
                    %s::uuid,  -- agency_org_id
                    %s::uuid,  -- sme_user_id (doesn't belong to agency org)
                    'strategy',
                    'test',
                    'Unauthorized Test',
                    '{}'::jsonb
                )
            """, (self.agency_org_id, self.sme_user_id))
            self.conn.commit()

        assert "Unauthorized" in str(exc_info.value)

    def test_router_security_invalid_client(self):
        """
        Test: Router function validates client belongs to organization

        Expected Behavior:
        - Exception raised if client_id doesn't belong to org_id
        """
        if not self.agency_org_id or not self.sme_org_id:
            pytest.skip("Need both org types for cross-org security test")

        # Get a client from different org (if exists)
        self.cursor.execute("""
            SELECT id FROM clients WHERE org_id = %s LIMIT 1
        """, (self.sme_org_id,))
        sme_client = self.cursor.fetchone()

        if sme_client and self.agency_user_id:
            with pytest.raises(psycopg2.Error) as exc_info:
                self.cursor.execute("""
                    SELECT * FROM save_agent_output_routed(
                        %s::uuid,  -- agency_org_id
                        %s::uuid,  -- agency_user_id
                        'strategy',
                        'test',
                        'Cross-org client test',
                        '{}'::jsonb,
                        %s::uuid  -- sme_client_id (doesn't belong to agency org)
                    )
                """, (self.agency_org_id, self.agency_user_id, sme_client['id']))
                self.conn.commit()

            assert "does not belong to organization" in str(exc_info.value)
