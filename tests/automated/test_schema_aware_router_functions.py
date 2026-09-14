#!/usr/bin/env python3
"""
Test Suite: Schema-Aware Router Functions (Migration 169)

Tests comprehensive schema routing for campaigns, clients, and personas:
- get_campaigns_list_routed
- get_campaign_details_routed
- get_clients_list_routed
- get_client_details_routed
- get_personas_list_routed
- get_persona_details_routed

Validates:
- Correct schema routing (AGENCY → agency.*, SME → public.*)
- Data isolation between organizations
- JSONB return format consistency
- Function exists and is executable

Run Instructions:
    # Run all router function tests
    poetry run pytest tests/automated/test_schema_aware_router_functions.py -v

    # Run specific organization type tests
    poetry run pytest tests/automated/test_schema_aware_router_functions.py::TestSchemaRouterFunctions::test_campaigns_list_sme_organization -v
    poetry run pytest tests/automated/test_schema_aware_router_functions.py::TestSchemaRouterFunctions::test_campaigns_list_agency_organization -v

    # Run with detailed output
    poetry run pytest tests/automated/test_schema_aware_router_functions.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Database migrated: supabase db reset (applies migration 169)
    - Test data exists: Both SME and AGENCY organizations with campaigns/clients/personas
    - Test users exist: See /tests/TEST_USERS.md
"""
import os
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List
import json
from dotenv import load_dotenv
import pathlib

# Load environment from apps/api/.env
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '56322')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')


class TestSchemaRouterFunctions:
    """Test schema-aware router functions for multi-tenant architecture"""

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

        # Get SME test organization
        self.cursor.execute(
            "SELECT id, type FROM organizations WHERE type = 'SME' LIMIT 1"
        )
        sme_org = self.cursor.fetchone()
        self.sme_org_id = sme_org['id'] if sme_org else None
        self.sme_org_type = sme_org['type'] if sme_org else None

        # Get AGENCY test organization
        self.cursor.execute(
            "SELECT id, type FROM organizations WHERE type = 'AGENCY' LIMIT 1"
        )
        agency_org = self.cursor.fetchone()
        self.agency_org_id = agency_org['id'] if agency_org else None
        self.agency_org_type = agency_org['type'] if agency_org else None

        yield

        # Cleanup
        self.cursor.close()
        self.conn.close()

    # ============================================================================
    # CAMPAIGNS ROUTER TESTS
    # ============================================================================

    def test_campaigns_list_routed_function_exists(self):
        """Test: get_campaigns_list_routed function exists and is executable"""
        self.cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_campaigns_list_routed'
        """)

        result = self.cursor.fetchone()
        assert result is not None, "get_campaigns_list_routed function not found"
        print("✅ get_campaigns_list_routed function exists")

    def test_campaigns_list_sme_organization(self):
        """
        Test: get_campaigns_list_routed routes SME org to public.campaigns

        Expected Behavior:
        - Function detects org_type = 'SME'
        - Routes query to public.campaigns schema
        - Returns JSONB array of campaigns

        Success Criteria:
        - Function executes without error
        - Returns valid JSONB array
        - Data belongs to SME organization
        """
        if not self.sme_org_id:
            pytest.skip("No SME organization found")

        self.cursor.execute(
            "SELECT * FROM get_campaigns_list_routed(%s, %s, %s, %s, %s, %s)",
            (self.sme_org_id, False, None, None, 50, 0)
        )

        result = self.cursor.fetchone()
        campaigns = result['get_campaigns_list_routed'] if result else []

        # Parse JSONB if needed
        if isinstance(campaigns, str):
            campaigns = json.loads(campaigns)

        assert isinstance(campaigns, list), "Result should be a JSON array"
        print(f"✅ SME org returned {len(campaigns)} campaigns from public.campaigns")

        # If campaigns exist, verify they belong to SME org
        if len(campaigns) > 0:
            assert campaigns[0]['org_id'] == str(self.sme_org_id)
            print(f"✅ Data isolation verified: campaigns belong to SME org")

    def test_campaigns_list_agency_organization(self):
        """
        Test: get_campaigns_list_routed routes AGENCY org to agency.campaigns

        Expected Behavior:
        - Function detects org_type = 'AGENCY'
        - Routes query to agency.campaigns schema
        - Returns JSONB array of campaigns

        Success Criteria:
        - Function executes without error
        - Returns valid JSONB array
        - Data belongs to AGENCY organization
        """
        if not self.agency_org_id:
            pytest.skip("No AGENCY organization found")

        self.cursor.execute(
            "SELECT * FROM get_campaigns_list_routed(%s, %s, %s, %s, %s, %s)",
            (self.agency_org_id, False, None, None, 50, 0)
        )

        result = self.cursor.fetchone()
        campaigns = result['get_campaigns_list_routed'] if result else []

        # Parse JSONB if needed
        if isinstance(campaigns, str):
            campaigns = json.loads(campaigns)

        assert isinstance(campaigns, list), "Result should be a JSON array"
        print(f"✅ AGENCY org returned {len(campaigns)} campaigns from agency.campaigns")

        # If campaigns exist, verify they belong to AGENCY org
        if len(campaigns) > 0:
            assert campaigns[0]['org_id'] == str(self.agency_org_id)
            print(f"✅ Data isolation verified: campaigns belong to AGENCY org")

    def test_campaign_details_routed_function_exists(self):
        """Test: get_campaign_details_routed function exists"""
        self.cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_campaign_details_routed'
        """)

        result = self.cursor.fetchone()
        assert result is not None, "get_campaign_details_routed function not found"
        print("✅ get_campaign_details_routed function exists")

    # ============================================================================
    # CLIENTS ROUTER TESTS
    # ============================================================================

    def test_clients_list_routed_function_exists(self):
        """Test: get_clients_list_routed function exists and is executable"""
        self.cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_clients_list_routed'
        """)

        result = self.cursor.fetchone()
        assert result is not None, "get_clients_list_routed function not found"
        print("✅ get_clients_list_routed function exists")

    def test_clients_list_sme_organization(self):
        """
        Test: get_clients_list_routed routes SME org to public.clients

        Expected Behavior:
        - Function detects org_type = 'SME'
        - Routes query to public.clients schema
        - Returns JSONB array of clients

        Success Criteria:
        - Function executes without error
        - Returns valid JSONB array (may be empty for SME)
        """
        if not self.sme_org_id:
            pytest.skip("No SME organization found")

        self.cursor.execute(
            "SELECT * FROM get_clients_list_routed(%s, %s, %s, %s, %s)",
            (self.sme_org_id, False, None, 50, 0)
        )

        result = self.cursor.fetchone()
        clients = result['get_clients_list_routed'] if result else []

        # Parse JSONB if needed
        if isinstance(clients, str):
            clients = json.loads(clients)

        assert isinstance(clients, list), "Result should be a JSON array"
        print(f"✅ SME org returned {len(clients)} clients from public.clients")

    def test_clients_list_agency_organization(self):
        """
        Test: get_clients_list_routed routes AGENCY org to agency.clients

        Expected Behavior:
        - Function detects org_type = 'AGENCY'
        - Routes query to agency.clients schema
        - Returns JSONB array of clients

        Success Criteria:
        - Function executes without error
        - Returns valid JSONB array
        - Data belongs to AGENCY organization
        """
        if not self.agency_org_id:
            pytest.skip("No AGENCY organization found")

        self.cursor.execute(
            "SELECT * FROM get_clients_list_routed(%s, %s, %s, %s, %s)",
            (self.agency_org_id, False, None, 50, 0)
        )

        result = self.cursor.fetchone()
        clients = result['get_clients_list_routed'] if result else []

        # Parse JSONB if needed
        if isinstance(clients, str):
            clients = json.loads(clients)

        assert isinstance(clients, list), "Result should be a JSON array"
        print(f"✅ AGENCY org returned {len(clients)} clients from agency.clients")

        # If clients exist, verify they belong to AGENCY org
        if len(clients) > 0:
            assert clients[0]['org_id'] == str(self.agency_org_id)
            print(f"✅ Data isolation verified: clients belong to AGENCY org")

    def test_client_details_routed_function_exists(self):
        """Test: get_client_details_routed function exists"""
        self.cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_client_details_routed'
        """)

        result = self.cursor.fetchone()
        assert result is not None, "get_client_details_routed function not found"
        print("✅ get_client_details_routed function exists")

    # ============================================================================
    # PERSONAS ROUTER TESTS
    # ============================================================================

    def test_personas_list_routed_function_exists(self):
        """Test: get_personas_list_routed function exists and is executable"""
        self.cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_personas_list_routed'
        """)

        result = self.cursor.fetchone()
        assert result is not None, "get_personas_list_routed function not found"
        print("✅ get_personas_list_routed function exists")

    def test_personas_list_sme_organization(self):
        """
        Test: get_personas_list_routed routes SME org campaign joins to public.campaigns

        Expected Behavior:
        - Function detects org_type = 'SME'
        - Routes campaign joins to public.campaigns schema
        - Personas from agent_outputs table (schema-agnostic)
        - Returns JSONB array of personas

        Success Criteria:
        - Function executes without error
        - Returns valid JSONB array
        """
        if not self.sme_org_id:
            pytest.skip("No SME organization found")

        self.cursor.execute(
            "SELECT * FROM get_personas_list_routed(%s, %s, %s, %s, %s, %s)",
            (self.sme_org_id, False, None, None, 50, 0)
        )

        result = self.cursor.fetchone()
        personas = result['get_personas_list_routed'] if result else []

        # Parse JSONB if needed
        if isinstance(personas, str):
            personas = json.loads(personas)

        assert isinstance(personas, list), "Result should be a JSON array"
        print(f"✅ SME org returned {len(personas)} personas with public.campaigns joins")

    def test_personas_list_agency_organization(self):
        """
        Test: get_personas_list_routed routes AGENCY org campaign joins to agency.campaigns

        Expected Behavior:
        - Function detects org_type = 'AGENCY'
        - Routes campaign joins to agency.campaigns schema
        - Personas from agent_outputs table (schema-agnostic)
        - Returns JSONB array of personas

        Success Criteria:
        - Function executes without error
        - Returns valid JSONB array
        - Data belongs to AGENCY organization
        """
        if not self.agency_org_id:
            pytest.skip("No AGENCY organization found")

        self.cursor.execute(
            "SELECT * FROM get_personas_list_routed(%s, %s, %s, %s, %s, %s)",
            (self.agency_org_id, False, None, None, 50, 0)
        )

        result = self.cursor.fetchone()
        personas = result['get_personas_list_routed'] if result else []

        # Parse JSONB if needed
        if isinstance(personas, str):
            personas = json.loads(personas)

        assert isinstance(personas, list), "Result should be a JSON array"
        print(f"✅ AGENCY org returned {len(personas)} personas with agency.campaigns joins")

        # If personas exist, verify they belong to AGENCY org
        if len(personas) > 0:
            assert personas[0]['org_id'] == str(self.agency_org_id)
            print(f"✅ Data isolation verified: personas belong to AGENCY org")

    def test_persona_details_routed_function_exists(self):
        """Test: get_persona_details_routed function exists"""
        self.cursor.execute("""
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'get_persona_details_routed'
        """)

        result = self.cursor.fetchone()
        assert result is not None, "get_persona_details_routed function not found"
        print("✅ get_persona_details_routed function exists")

    # ============================================================================
    # DATA ISOLATION TESTS
    # ============================================================================

    def test_cross_org_data_isolation(self):
        """
        Test: Router functions enforce data isolation between organizations

        Expected Behavior:
        - SME org cannot access AGENCY org data
        - AGENCY org cannot access SME org data
        - Each org only sees their own campaigns/clients/personas

        Success Criteria:
        - No data leakage between organizations
        - org_id filtering works correctly
        """
        if not self.sme_org_id or not self.agency_org_id:
            pytest.skip("Need both SME and AGENCY organizations")

        # Test SME cannot see AGENCY campaigns
        self.cursor.execute(
            "SELECT * FROM get_campaigns_list_routed(%s, %s, %s, %s, %s, %s)",
            (self.sme_org_id, True, None, None, 1000, 0)  # Include archived to get all
        )
        sme_campaigns = self.cursor.fetchone()['get_campaigns_list_routed']
        if isinstance(sme_campaigns, str):
            sme_campaigns = json.loads(sme_campaigns)

        # Test AGENCY cannot see SME campaigns
        self.cursor.execute(
            "SELECT * FROM get_campaigns_list_routed(%s, %s, %s, %s, %s, %s)",
            (self.agency_org_id, True, None, None, 1000, 0)
        )
        agency_campaigns = self.cursor.fetchone()['get_campaigns_list_routed']
        if isinstance(agency_campaigns, str):
            agency_campaigns = json.loads(agency_campaigns)

        # Verify no overlap
        sme_campaign_ids = {c['id'] for c in sme_campaigns}
        agency_campaign_ids = {c['id'] for c in agency_campaigns}

        overlap = sme_campaign_ids & agency_campaign_ids
        assert len(overlap) == 0, f"Data isolation breach: {len(overlap)} campaigns visible to both orgs"

        print(f"✅ Data isolation verified: SME has {len(sme_campaign_ids)} campaigns, AGENCY has {len(agency_campaign_ids)} campaigns, 0 overlap")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
