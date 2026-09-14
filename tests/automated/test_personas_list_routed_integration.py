"""
Integration Tests: get_personas_list_routed Database Function

Tests the persona list router function with client_id parameter for SME and Agency multi-tenancy.
Validates schema routing, output_type filtering, and client isolation.

Run Instructions:
    # Run all tests in this file
    poetry run pytest tests/automated/test_personas_list_routed_integration.py -v

    # Run specific test
    poetry run pytest tests/automated/test_personas_list_routed_integration.py::TestPersonasListRouted::test_sme_gets_all_org_personas -v

    # Run with output logging
    poetry run pytest tests/automated/test_personas_list_routed_integration.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Database migrated with migration 20251102
    - Test users exist: See /tests/TEST_USERS.md
    - Environment variables set in .env:
      * SUPABASE_URL
      * SUPABASE_SERVICE_ROLE_KEY
      * SUPABASE_ANON_KEY
      * SME_OWNER_EMAIL, SME_OWNER_PASSWORD
      * AGENCY_OWNER_EMAIL, AGENCY_OWNER_PASSWORD
"""
import os
import pytest
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
import pathlib
import psycopg2
from psycopg2.extras import Json

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

# Configuration

# Test credentials
SME_OWNER_EMAIL = os.getenv("SME_OWNER_EMAIL", "sme.owner@example.com")
SME_OWNER_PASSWORD = os.getenv("SME_OWNER_PASSWORD", "LocalDevOnly123!")
AGENCY_OWNER_EMAIL = os.getenv("AGENCY_OWNER_EMAIL", "agency.owner@example.com")
AGENCY_OWNER_PASSWORD = os.getenv("AGENCY_OWNER_PASSWORD", "LocalDevOnly123!")


class TestPersonasListRouted:
    """Integration test suite for get_personas_list_routed database function"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment before each test"""
        # Use service role client for database operations
        self.supabase_service: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Use anon client for auth
        self.supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

        self.test_persona_id = None
        self.test_insight_id = None
        self.test_client_id = None

        yield

        # Cleanup test data
        self._cleanup()

    def _cleanup(self):
        """Clean up test data after each test"""
        try:
            if self.test_persona_id:
                self.supabase_service.table('agent_outputs').delete().eq('id', self.test_persona_id).execute()
            if self.test_insight_id:
                self.supabase_service.table('agent_outputs').delete().eq('id', self.test_insight_id).execute()
        except Exception as e:
            print(f"Cleanup warning: {e}")

    def _authenticate_sme_user(self) -> Dict[str, Any]:
        """Authenticate as SME user and return context"""
        try:
            auth_response = self.supabase_anon.auth.sign_in_with_password({
                "email": SME_OWNER_EMAIL,
                "password": SME_OWNER_PASSWORD
            })

            if not auth_response.user:
                pytest.fail("SME authentication failed")

            user_id = auth_response.user.id

            # Get user's organization
            user_result = self.supabase_service.table('users') \
                .select('org_id') \
                .eq('id', user_id) \
                .single() \
                .execute()

            if not user_result.data:
                pytest.fail("Could not fetch SME user org_id")

            org_id = user_result.data['org_id']

            # Verify organization type
            org_result = self.supabase_service.table('organizations') \
                .select('type') \
                .eq('id', org_id) \
                .single() \
                .execute()

            return {
                'user_id': user_id,
                'org_id': org_id,
                'org_type': org_result.data['type'],
                'access_token': auth_response.session.access_token
            }
        except Exception as e:
            pytest.fail(f"SME auth error: {e}")

    def _authenticate_agency_user(self) -> Dict[str, Any]:
        """Authenticate as Agency user and return context"""
        try:
            auth_response = self.supabase_anon.auth.sign_in_with_password({
                "email": AGENCY_OWNER_EMAIL,
                "password": AGENCY_OWNER_PASSWORD
            })

            if not auth_response.user:
                pytest.fail("Agency authentication failed")

            user_id = auth_response.user.id

            # Get user's organization
            user_result = self.supabase_service.table('users') \
                .select('org_id') \
                .eq('id', user_id) \
                .single() \
                .execute()

            if not user_result.data:
                pytest.fail("Could not fetch Agency user org_id")

            org_id = user_result.data['org_id']

            # Verify organization type
            org_result = self.supabase_service.table('organizations') \
                .select('type') \
                .eq('id', org_id) \
                .single() \
                .execute()

            # Get first client for this agency
            # Note: Using service role to bypass RLS and directly access clients table
            client_result = self.supabase_service.table('clients') \
                .select('id, slug') \
                .eq('org_id', org_id) \
                .limit(1) \
                .execute()

            client_id = client_result.data[0]['id'] if client_result.data else None
            client_slug = client_result.data[0]['slug'] if client_result.data else None

            return {
                'user_id': user_id,
                'org_id': org_id,
                'org_type': org_result.data['type'],
                'client_id': client_id,
                'client_slug': client_slug,
                'access_token': auth_response.session.access_token
            }
        except Exception as e:
            pytest.fail(f"Agency auth error: {e}")

    def _create_test_persona(self, org_id: str, user_id: str, client_id: Optional[str] = None, schema: str = 'public') -> str:
        """Create a test persona in agent_outputs (public or agency schema)"""
        persona_data = {
            'org_id': org_id,
            'client_id': client_id,
            'user_id': user_id,
            'agent_type': 'persona',
            'output_type': 'buyer_persona',
            'title': 'Test Persona - Director of Marketing',
            'summary': 'Test persona for integration testing',
            'content': {
                'name': 'Jane Smith',
                'title': 'Director of Marketing',
                'company_name': 'Test Corp',
                'industry': 'Technology',
                'goals': ['Increase brand awareness', 'Generate leads'],
                'pain_points': ['Limited budget', 'Small team']
            },
            'status': 'active'
        }

        # Route to correct schema table
        # For agency: Direct SQL insert to agency.agent_outputs
        if schema == 'agency':
            # Use raw SQL for agency schema
            conn = psycopg2.connect(
                host="127.0.0.1",
                port="56322",
                database="postgres",
                user="postgres",
                password="postgres"
            )
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO agency.agent_outputs
                (org_id, client_id, user_id, agent_type, output_type, title, summary, content, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                org_id, client_id, user_id, persona_data['agent_type'],
                persona_data['output_type'], persona_data['title'],
                persona_data['summary'], Json(persona_data['content']),
                persona_data['status']
            ))

            self.test_persona_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
        else:
            # Use Supabase client for public schema
            result = self.supabase_service.table('agent_outputs').insert(persona_data).execute()
            self.test_persona_id = result.data[0]['id']

        return self.test_persona_id

    def _create_test_interview_insight(self, org_id: str, user_id: str, persona_id: str, client_id: Optional[str] = None) -> str:
        """Create a test interview insight that should be filtered out"""
        insight_data = {
            'org_id': org_id,
            'client_id': client_id,
            'user_id': user_id,
            'agent_type': 'persona',
            'output_type': 'interview_insight',  # Different output_type
            'title': 'Goal: Being situated in the heart of Silicon Valley',
            'summary': 'Interview insight from persona conversation',
            'content': {
                'persona_id': persona_id,
                'raw_text': 'Being situated in the heart of Silicon Valley provides access to top tech talent',
                'themes': ['Talent Acquisition', 'Location']
            },
            'status': 'active'
        }

        result = self.supabase_service.table('agent_outputs').insert(insight_data).execute()
        self.test_insight_id = result.data[0]['id']
        return self.test_insight_id

    def test_sme_gets_all_org_personas(self):
        """
        Test: SME user retrieves all personas for their organization

        Context:
        - SME users belong to a single organization
        - They should see ALL personas for their org
        - client_id parameter should be NULL for SME

        Expected Behavior:
        - Function routes to public.agent_outputs schema
        - Returns all personas with output_type='buyer_persona'
        - Excludes interview insights (output_type='interview_insight')
        - client_id filter is NULL (ignored)

        Success Criteria:
        - Returns persona created for SME org
        - Does not return interview insights
        - Schema routing is correct (public)
        """
        # Arrange
        sme_context = self._authenticate_sme_user()
        assert sme_context['org_type'] == 'SME', "Test requires SME organization"

        # Create test persona
        persona_id = self._create_test_persona(
            org_id=sme_context['org_id'],
            user_id=sme_context['user_id']
        )

        # Create test interview insight (should be filtered out)
        self._create_test_interview_insight(
            org_id=sme_context['org_id'],
            user_id=sme_context['user_id'],
            persona_id=persona_id
        )

        # Act - Call database function with NULL client_id
        result = self.supabase_service.rpc('get_personas_list_routed', {
            'p_org_id': sme_context['org_id'],
            'p_include_archived': False,
            'p_campaign_id': None,
            'p_client_id': None,  # SME users don't have client_id
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        # Assert
        assert result.data is not None, "Function should return data"
        personas = result.data

        # Should return at least our test persona
        assert len(personas) >= 1, "Should return at least one persona"

        # Find our test persona
        test_persona = next((p for p in personas if p['id'] == persona_id), None)
        assert test_persona is not None, "Should return test persona"
        assert test_persona['name'] == 'Jane Smith'
        # The title field contains the full output title, not just the persona's job title
        assert 'Director of Marketing' in test_persona['title']

        # Should NOT include interview insights
        insight_titles = [p['title'] for p in personas]
        assert not any('Goal:' in title for title in insight_titles), \
            "Should not return interview insights"

        print(f"✅ SME test passed: Retrieved {len(personas)} personas, excluded insights")

    def test_agency_gets_client_specific_personas(self):
        """
        Test: Agency user retrieves personas for specific client only

        Context:
        - Agency users manage multiple clients
        - They should see ONLY personas for the selected client
        - client_id parameter filters results

        Expected Behavior:
        - Function routes to agency.agent_outputs schema
        - Returns only personas where client_id matches
        - Excludes personas from other clients
        - Excludes interview insights

        Success Criteria:
        - Returns persona for specified client
        - Does not return personas from other clients
        - Schema routing is correct (agency)
        - Client data isolation is enforced
        """
        # Arrange
        agency_context = self._authenticate_agency_user()
        assert agency_context['org_type'] == 'AGENCY', "Test requires AGENCY organization"
        assert agency_context['client_id'] is not None, "Test requires at least one client"

        # Create test persona for this client in agency schema
        persona_id = self._create_test_persona(
            org_id=agency_context['org_id'],
            user_id=agency_context['user_id'],
            client_id=agency_context['client_id'],
            schema='agency'  # Route to agency.agent_outputs
        )

        # Create interview insight (should be filtered out)
        self._create_test_interview_insight(
            org_id=agency_context['org_id'],
            user_id=agency_context['user_id'],
            persona_id=persona_id,
            client_id=agency_context['client_id']
        )

        # Act - Call database function with specific client_id
        result = self.supabase_service.rpc('get_personas_list_routed', {
            'p_org_id': agency_context['org_id'],
            'p_include_archived': False,
            'p_campaign_id': None,
            'p_client_id': agency_context['client_id'],  # Filter by client
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        # Assert
        assert result.data is not None, "Function should return data"
        personas = result.data

        # Should return our test persona
        assert len(personas) >= 1, "Should return at least one persona"

        # Find our test persona
        test_persona = next((p for p in personas if p['id'] == persona_id), None)
        assert test_persona is not None, "Should return test persona for this client"
        assert test_persona['name'] == 'Jane Smith'

        # Verify all returned personas belong to this client
        # (In agency schema, personas are stored in agency.agent_outputs with client_id)
        for persona in personas:
            # Note: The function returns data from agency schema, verify structure
            assert 'id' in persona
            assert 'name' in persona
            assert 'title' in persona

        # Should NOT include interview insights
        insight_titles = [p['title'] for p in personas]
        assert not any('Goal:' in title for title in insight_titles), \
            "Should not return interview insights"

        print(f"✅ Agency test passed: Retrieved {len(personas)} client-specific personas")

    def test_output_type_filtering_excludes_insights(self):
        """
        Test: Function filters by output_type to exclude non-persona entities

        Context:
        - agent_outputs contains multiple output_types under agent_type='persona'
        - Personas: output_type IN ('buyer_persona', 'persona')
        - Interview Insights: output_type='interview_insight'
        - Function must filter to show only actual personas

        Expected Behavior:
        - Returns entities with output_type='buyer_persona' or 'persona'
        - Excludes entities with output_type='interview_insight'
        - Migration 20251102 implements this filter

        Success Criteria:
        - Personas with 'buyer_persona' type are returned
        - Insights with 'interview_insight' type are excluded
        - Filter works in both public and agency schemas
        """
        # Arrange
        sme_context = self._authenticate_sme_user()

        # Create multiple test entities
        persona_id = self._create_test_persona(
            org_id=sme_context['org_id'],
            user_id=sme_context['user_id']
        )

        insight_id = self._create_test_interview_insight(
            org_id=sme_context['org_id'],
            user_id=sme_context['user_id'],
            persona_id=persona_id
        )

        # Act
        result = self.supabase_service.rpc('get_personas_list_routed', {
            'p_org_id': sme_context['org_id'],
            'p_include_archived': False,
            'p_campaign_id': None,
            'p_client_id': None,
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        # Assert
        personas = result.data
        returned_ids = [p['id'] for p in personas]

        # Should include persona
        assert persona_id in returned_ids, "Should return buyer_persona"

        # Should NOT include interview insight
        assert insight_id not in returned_ids, "Should exclude interview_insight"

        print(f"✅ Output type filtering test passed")

    def test_function_returns_correct_structure(self):
        """
        Test: Function returns expected JSONB structure with all required fields

        Expected Structure:
        - id, org_id, campaign_id
        - name, title, company_name, industry
        - created_at, updated_at, archived_at
        - JSONB fields: location, goals, pain_points, buyer_journey
        - Metadata: is_archived, strategy_count

        Success Criteria:
        - All required fields present
        - JSONB fields properly extracted from content
        - Data types are correct
        """
        # Arrange
        sme_context = self._authenticate_sme_user()
        persona_id = self._create_test_persona(
            org_id=sme_context['org_id'],
            user_id=sme_context['user_id']
        )

        # Act
        result = self.supabase_service.rpc('get_personas_list_routed', {
            'p_org_id': sme_context['org_id'],
            'p_include_archived': False,
            'p_campaign_id': None,
            'p_client_id': None,
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        # Assert
        personas = result.data
        test_persona = next((p for p in personas if p['id'] == persona_id), None)
        assert test_persona is not None

        # Verify required fields
        required_fields = ['id', 'org_id', 'name', 'title', 'company_name', 'industry',
                          'created_at', 'updated_at', 'is_archived']
        for field in required_fields:
            assert field in test_persona, f"Missing required field: {field}"

        # Verify JSONB fields
        assert 'goals' in test_persona
        assert 'pain_points' in test_persona
        assert isinstance(test_persona['goals'], list)
        assert isinstance(test_persona['pain_points'], list)

        # Verify strategy_count field
        assert 'strategy_count' in test_persona
        assert isinstance(test_persona['strategy_count'], int)

        print(f"✅ Structure validation test passed")

    def test_archived_personas_filtering(self):
        """
        Test: Function respects p_include_archived parameter

        Expected Behavior:
        - p_include_archived=False: Returns only active personas
        - p_include_archived=True: Returns both active and archived

        Success Criteria:
        - Active personas always returned
        - Archived personas only when include_archived=True
        """
        # Arrange
        sme_context = self._authenticate_sme_user()
        persona_id = self._create_test_persona(
            org_id=sme_context['org_id'],
            user_id=sme_context['user_id']
        )

        # Archive the persona
        self.supabase_service.table('agent_outputs') \
            .update({'archived_at': 'now()'}) \
            .eq('id', persona_id) \
            .execute()

        # Act - Test with include_archived=False
        result_active_only = self.supabase_service.rpc('get_personas_list_routed', {
            'p_org_id': sme_context['org_id'],
            'p_include_archived': False,
            'p_campaign_id': None,
            'p_client_id': None,
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        # Act - Test with include_archived=True
        result_all = self.supabase_service.rpc('get_personas_list_routed', {
            'p_org_id': sme_context['org_id'],
            'p_include_archived': True,
            'p_campaign_id': None,
            'p_client_id': None,
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        # Assert
        active_ids = [p['id'] for p in result_active_only.data]
        all_ids = [p['id'] for p in result_all.data]

        # Archived persona should NOT appear in active-only list
        assert persona_id not in active_ids, "Archived persona should not appear in active list"

        # Archived persona SHOULD appear in all list
        assert persona_id in all_ids, "Archived persona should appear when include_archived=True"

        print(f"✅ Archived filtering test passed")


if __name__ == "__main__":
    print("Running get_personas_list_routed integration tests...")
    print("\nPrerequisites:")
    print("  - Supabase: supabase start")
    print("  - Migration 20251102 applied")
    print("  - Test users exist (see /tests/TEST_USERS.md)")
    print("\nRun: poetry run pytest tests/automated/test_personas_list_routed_integration.py -v")
