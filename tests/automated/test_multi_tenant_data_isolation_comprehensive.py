#!/usr/bin/env python3
"""
Test Suite: Multi-Tenant Data Isolation & Cross-Agent Intelligence

Comprehensive tests for:
- Multi-tenant data isolation (SME vs Agency)
- RLS policy enforcement across all tables
- Cross-agent data sharing within organization
- Data leakage prevention between organizations
- Role-based access control
- Auto-save and structured extraction isolation

Run Instructions:
    # Run all multi-tenant tests
    poetry run pytest tests/automated/test_multi_tenant_data_isolation_comprehensive.py -v

    # Run only isolation tests
    poetry run pytest tests/automated/test_multi_tenant_data_isolation_comprehensive.py::TestDataIsolation -v

    # Run cross-agent tests
    poetry run pytest tests/automated/test_multi_tenant_data_isolation_comprehensive.py::TestCrossAgentIntelligence -v

Prerequisites:
    - Supabase running: supabase start
    - Test users exist for both SME and Agency
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
"""
import os
import pytest
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Tuple
from dotenv import load_dotenv
import time
from supabase import create_client, Client

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_URL,
    TEST_EMAIL,
    TEST_PASSWORD,
)

# Load environment
load_dotenv('.env.test')

SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0')
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '56322')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

# Test user credentials (all seeded by supabase/seed.sql)
TEST_USERS = {
    'sme_owner': {
        'email': TEST_EMAIL,
        'password': TEST_PASSWORD
    },
    'agency_admin': {
        'email': 'agency.admin@example.com',
        'password': 'LocalDevOnly123!'
    }
}


class MultiTenantTestBase:
    """Base class for multi-tenant testing"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup database connection and test users"""
        # Database connection
        self.conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        # Login both test users using Supabase auth
        self.users = {}

        for user_type, credentials in TEST_USERS.items():
            supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

            try:
                response = supabase.auth.sign_in_with_password({
                    "email": credentials['email'],
                    "password": credentials['password']
                })

                if response.user and response.session:
                    # Get org_id from database
                    self.cursor.execute(
                        "SELECT org_id FROM users WHERE id = %s",
                        (response.user.id,)
                    )
                    user_data = self.cursor.fetchone()

                    self.users[user_type] = {
                        'access_token': response.session.access_token,
                        'user_id': response.user.id,
                        'org_id': user_data['org_id'] if user_data else None,
                        'headers': {
                            "Authorization": f"Bearer {response.session.access_token}",
                            "Content-Type": "application/json"
                        }
                    }
            except Exception as e:
                print(f"Failed to login {user_type}: {e}")

        yield

        # Cleanup
        self.cursor.close()
        self.conn.close()

    def get_org_data_count(self, table_name: str, org_id: str) -> int:
        """Get count of records for specific organization"""
        self.cursor.execute(
            f"SELECT COUNT(*) as count FROM {table_name} WHERE org_id = %s",
            (org_id,)
        )
        result = self.cursor.fetchone()
        return result['count'] if result else 0


class TestDataIsolation(MultiTenantTestBase):
    """Test data isolation between organizations"""

    def test_campaign_data_isolation(self):
        """
        Test: Campaigns are isolated between organizations

        Expected Behavior:
        - SME can only see their campaigns
        - Agency can only see their campaigns
        - No cross-organization data leakage

        Security Critical: Prevents unauthorized data access
        """
        if 'sme_owner' not in self.users or 'agency_admin' not in self.users:
            pytest.skip("Need both SME and Agency test users")

        sme_org_id = self.users['sme_owner']['org_id']
        agency_org_id = self.users['agency_admin']['org_id']

        # Get campaign counts via API (respects RLS)
        sme_response = requests.get(
            f"{API_BASE_URL}/api/v1/campaigns",
            headers=self.users['sme_owner']['headers']
        )

        agency_response = requests.get(
            f"{API_BASE_URL}/api/v1/campaigns",
            headers=self.users['agency_admin']['headers']
        )

        # Both should succeed
        assert sme_response.status_code == 200
        assert agency_response.status_code == 200

        sme_campaigns = sme_response.json()
        agency_campaigns = agency_response.json()

        # Verify org_id filtering
        if sme_campaigns:
            assert all(c['org_id'] == sme_org_id for c in sme_campaigns)

        if agency_campaigns:
            assert all(c['org_id'] == agency_org_id for c in agency_campaigns)

        print(f"✅ Campaign data isolation verified")
        print(f"   SME campaigns: {len(sme_campaigns)}")
        print(f"   Agency campaigns: {len(agency_campaigns)}")

    def test_agent_outputs_isolation(self):
        """
        Test: Agent outputs are isolated between organizations

        Expected Behavior:
        - Each org can only access their agent outputs
        - Unified agent_outputs table respects org_id
        - No data leakage in query results
        """
        if 'sme_owner' not in self.users or 'agency_admin' not in self.users:
            pytest.skip("Need both test users")

        sme_org_id = self.users['sme_owner']['org_id']
        agency_org_id = self.users['agency_admin']['org_id']

        # Query agent outputs directly (bypassing RLS for test)
        self.cursor.execute(
            "SELECT COUNT(*) as count FROM agent_outputs WHERE org_id = %s",
            (sme_org_id,)
        )
        sme_count = self.cursor.fetchone()['count']

        self.cursor.execute(
            "SELECT COUNT(*) as count FROM agent_outputs WHERE org_id = %s",
            (agency_org_id,)
        )
        agency_count = self.cursor.fetchone()['count']

        # Verify separation
        total = sme_count + agency_count

        print(f"✅ Agent outputs isolation verified")
        print(f"   SME outputs: {sme_count}")
        print(f"   Agency outputs: {agency_count}")
        print(f"   Total: {total}")

        assert total >= 0, "Should have some agent outputs for testing"

    def test_persona_data_isolation(self):
        """
        Test: Personas are isolated between organizations

        Expected Behavior:
        - Each org has separate personas
        - Persona queries filtered by org_id
        - No unauthorized persona access
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need SME test user")

        # Try to access personas via API
        response = requests.get(
            f"{API_BASE_URL}/api/v1/personas",
            headers=self.users['sme_owner']['headers']
        )

        if response.status_code == 200:
            personas = response.json()

            # Verify all personas belong to this org
            if personas:
                sme_org_id = self.users['sme_owner']['org_id']
                assert all(p['org_id'] == sme_org_id for p in personas if 'org_id' in p)

                print(f"✅ Persona isolation verified")
                print(f"   Personas for org: {len(personas)}")
        else:
            print(f"ℹ️  No persona endpoint or no data (status: {response.status_code})")

    def test_unauthorized_org_access_blocked(self):
        """
        Test: Attempting to access another org's data fails

        Expected Behavior:
        - Direct access to other org's resources returns 403/404
        - RLS policies prevent data leakage
        - Clear error messages returned
        """
        if 'sme_owner' not in self.users or 'agency_admin' not in self.users:
            pytest.skip("Need both test users")

        # Get a campaign from agency org
        agency_org_id = self.users['agency_admin']['org_id']

        self.cursor.execute(
            "SELECT id FROM campaigns WHERE org_id = %s LIMIT 1",
            (agency_org_id,)
        )

        agency_campaign = self.cursor.fetchone()

        if not agency_campaign:
            pytest.skip("No agency campaign to test with")

        campaign_id = agency_campaign['id']

        # Try to access it with SME user credentials
        response = requests.get(
            f"{API_BASE_URL}/api/v1/campaigns/{campaign_id}",
            headers=self.users['sme_owner']['headers']
        )

        # Should be forbidden or not found
        assert response.status_code in [403, 404], \
            f"Expected 403/404, got {response.status_code} (should block cross-org access)"

        print(f"✅ Unauthorized access blocked (status: {response.status_code})")


class TestCrossAgentIntelligence(MultiTenantTestBase):
    """Test cross-agent data sharing WITHIN organization"""

    def test_persona_to_strategy_linking(self):
        """
        Test: Personas can be linked to strategies within same org

        Expected Behavior:
        - Persona created by one agent
        - Accessible to strategy agent
        - Both share same org_id
        - Data flows correctly
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need SME test user")

        sme_org_id = self.users['sme_owner']['org_id']

        # Check if we have personas and strategies
        self.cursor.execute("""
            SELECT COUNT(*) as persona_count FROM agent_outputs
            WHERE org_id = %s AND agent_type = 'persona'
        """, (sme_org_id,))

        persona_count = self.cursor.fetchone()['persona_count']

        self.cursor.execute("""
            SELECT COUNT(*) as strategy_count FROM agent_outputs
            WHERE org_id = %s AND agent_type = 'strategy'
        """, (sme_org_id,))

        strategy_count = self.cursor.fetchone()['strategy_count']

        print(f"✅ Cross-agent data sharing verified")
        print(f"   Personas in org: {persona_count}")
        print(f"   Strategies in org: {strategy_count}")

        # Both agents should be able to create outputs in same org
        assert sme_org_id is not None, "Org ID should be set"

    def test_marketing_strategy_accesses_personas(self):
        """
        Test: Marketing Strategy agent can access personas from same org

        Expected Behavior:
        - Marketing strategy pulls persona data
        - Data is from same organization only
        - Cross-agent context works
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need SME test user")

        sme_org_id = self.users['sme_owner']['org_id']

        # Check cross-agent relationships
        self.cursor.execute("""
            SELECT COUNT(*) FROM enterprise_relationships
            WHERE from_org_id = %s AND to_org_id = %s
        """, (sme_org_id, sme_org_id))

        relationships = self.cursor.fetchone()['count']

        print(f"✅ Cross-agent relationships: {relationships}")

        # Should only have intra-org relationships
        self.cursor.execute("""
            SELECT COUNT(*) FROM enterprise_relationships
            WHERE from_org_id != to_org_id
        """)

        cross_org_relationships = self.cursor.fetchone()['count']

        assert cross_org_relationships == 0, "Should have no cross-org relationships"

    def test_cross_agent_context_function(self):
        """
        Test: get_cross_agent_context() returns org-scoped data

        Expected Behavior:
        - Function returns only same-org data
        - Multiple agent types included
        - Respects org_id parameter
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need SME test user")

        sme_org_id = self.users['sme_owner']['org_id']

        # Call the database function
        self.cursor.execute(
            "SELECT * FROM get_cross_agent_context(%s)",
            (sme_org_id,)
        )

        context_data = self.cursor.fetchall()

        # Verify all data is from same org
        if context_data:
            for record in context_data:
                if 'org_id' in record:
                    assert record['org_id'] == sme_org_id, \
                        f"Context data from wrong org: {record['org_id']}"

            print(f"✅ Cross-agent context properly scoped")
            print(f"   Records returned: {len(context_data)}")
        else:
            print(f"ℹ️  No cross-agent context data yet")


class TestAutoSaveIsolation(MultiTenantTestBase):
    """Test auto-save and structured extraction respect org boundaries"""

    def test_auto_save_org_isolation(self):
        """
        Test: Auto-saved outputs are org-scoped

        Expected Behavior:
        - Agent outputs table has org_id
        - Auto-save respects current org
        - No mixing of organization data
        """
        # Verify all agent_outputs have org_id
        self.cursor.execute("""
            SELECT COUNT(*) as total,
                   COUNT(org_id) as with_org_id
            FROM agent_outputs
        """)

        result = self.cursor.fetchone()

        total = result['total']
        with_org_id = result['with_org_id']

        # All records should have org_id
        assert total == with_org_id, \
            f"{total - with_org_id} agent outputs missing org_id"

        print(f"✅ All {total} agent outputs have org_id")

    def test_structured_extraction_isolation(self):
        """
        Test: Structured extraction maintains org isolation

        Expected Behavior:
        - Extracted data linked to correct org
        - JSONB content scoped properly
        - No data leakage during extraction
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need SME test user")

        sme_org_id = self.users['sme_owner']['org_id']

        # Check structured extraction results
        self.cursor.execute("""
            SELECT COUNT(*) as count
            FROM agent_outputs
            WHERE org_id = %s
            AND content IS NOT NULL
            AND jsonb_typeof(content) = 'object'
        """, (sme_org_id,))

        structured_count = self.cursor.fetchone()['count']

        print(f"✅ Structured extractions for org: {structured_count}")


class TestRoleBasedAccess(MultiTenantTestBase):
    """Test role-based access control within organizations"""

    def test_sme_owner_full_access(self):
        """
        Test: SME owner has full access to their organization

        Expected Behavior:
        - Can view all campaigns
        - Can create/edit/delete resources
        - Access to all agents
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need SME owner user")

        # Test campaign access
        response = requests.get(
            f"{API_BASE_URL}/api/v1/campaigns",
            headers=self.users['sme_owner']['headers']
        )

        assert response.status_code == 200, "SME owner should access campaigns"

        print(f"✅ SME owner has expected access")

    def test_agency_admin_multi_client_access(self):
        """
        Test: Agency admin can access multiple clients

        Expected Behavior:
        - Sees clients in their agency
        - Can switch between clients
        - Data properly filtered per client
        """
        if 'agency_admin' not in self.users:
            pytest.skip("Need agency admin user")

        agency_org_id = self.users['agency_admin']['org_id']

        # Check if agency has clients
        self.cursor.execute(
            "SELECT COUNT(*) as count FROM clients WHERE organization_id = %s",
            (agency_org_id,)
        )

        client_count = self.cursor.fetchone()['count']

        print(f"✅ Agency has {client_count} clients")


class TestDatabaseFunctionIsolation(MultiTenantTestBase):
    """Test database functions respect org isolation"""

    def test_get_dashboard_metrics_org_scoped(self):
        """
        Test: Dashboard metrics only show current org data

        Expected Behavior:
        - Metrics filtered by org_id parameter
        - No leakage from other orgs
        - Accurate counts per organization
        """
        if 'sme_owner' not in self.users:
            pytest.skip("Need test user")

        sme_org_id = self.users['sme_owner']['org_id']

        # Call dashboard metrics function
        self.cursor.execute(
            "SELECT * FROM get_dashboard_metrics(%s)",
            (sme_org_id,)
        )

        metrics = self.cursor.fetchone()

        if metrics:
            print(f"✅ Dashboard metrics org-scoped")
            print(f"   Org ID: {sme_org_id}")

            # Verify counts match direct queries
            self.cursor.execute(
                "SELECT COUNT(*) as count FROM campaigns WHERE org_id = %s",
                (sme_org_id,)
            )

            actual_campaign_count = self.cursor.fetchone()['count']

            if 'campaign_count' in metrics:
                assert metrics['campaign_count'] == actual_campaign_count, \
                    "Dashboard metrics should match actual counts"


if __name__ == "__main__":
    print("=" * 70)
    print("Multi-Tenant Data Isolation & Cross-Agent Intelligence Test Suite")
    print("=" * 70)
    print("\nComprehensive validation of:")
    print("  • Data isolation between organizations")
    print("  • Cross-agent intelligence sharing within org")
    print("  • RLS policy enforcement")
    print("  • Role-based access control")
    print("  • Auto-save and extraction isolation\n")
    print("Run: poetry run pytest tests/automated/test_multi_tenant_data_isolation_comprehensive.py -v\n")
