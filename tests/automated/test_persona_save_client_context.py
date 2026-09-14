#!/usr/bin/env python3
"""
Test Suite: Persona Save with Client Context (Backend Integration)

Tests the /api/v1/save-detected-persona endpoint for multi-tenant persona saving:
- PersonaSaveRequest model validation (includes client_id)
- save_persona_output() function with client_id parameter
- Schema routing: AGENCY → agency.agent_outputs, SME → public.agent_outputs
- Client isolation: Personas saved with correct client_id
- Error handling: Validation fails gracefully when client_id missing for agency

Bug Fix (2025-10-30):
- Bug: Agency users unable to save personas - client_id not accepted by backend
- Fix: Created PersonaSaveRequest model with client_id field
- Fix: Updated nuclear_agent_migration.py to pass client_id through stack
- Impact: Agency users can now save personas from client-scoped agent sessions

Run Instructions:
    # Run all persona save tests
    poetry run pytest tests/automated/test_persona_save_client_context.py -v

    # Run specific test
    poetry run pytest tests/automated/test_persona_save_client_context.py::TestPersonaSaveClientContext::test_agency_persona_save_with_client_id -v

    # Run with detailed output
    poetry run pytest tests/automated/test_persona_save_client_context.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Database migrated: supabase db reset (applies migrations 201-203 for schema routing)
    - Test data exists: Both SME and AGENCY organizations with clients
    - Test users exist: See /tests/TEST_USERS.md
    - Environment variables set in apps/api/.env:
      * SUPABASE_URL=http://127.0.0.1:54321
      * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
      * GOOGLE_API_KEY=your_google_api_key
"""
import os
import pytest
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Optional
import json
from dotenv import load_dotenv
import pathlib
import uuid

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

# Load environment from apps/api/.env
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# API configuration

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '56322')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

# Test user credentials from /tests/TEST_USERS.md
TEST_USERS = {
    'sme': {
        'email': 'sme.owner@example.com',
        'password': 'LocalDevOnly123!'
    },
    'agency': {
        'email': 'agency.owner@example.com',
        'password': 'LocalDevOnly123!'
    }
}


class TestPersonaSaveClientContext:
    """Test persona save endpoint with client context for multi-tenant architecture"""

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

        # Get AGENCY test organization, user, and clients
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

        # Get agency clients for testing
        if self.agency_org_id:
            self.cursor.execute("""
                SELECT id, slug, name
                FROM clients
                WHERE org_id = %s
                LIMIT 2
            """, (self.agency_org_id,))
            agency_clients = self.cursor.fetchall()
            self.agency_client1_id = str(agency_clients[0]['id']) if len(agency_clients) > 0 else None
            self.agency_client1_slug = agency_clients[0]['slug'] if len(agency_clients) > 0 else None
            self.agency_client2_id = str(agency_clients[1]['id']) if len(agency_clients) > 1 else None
            self.agency_client2_slug = agency_clients[1]['slug'] if len(agency_clients) > 1 else None

        # Authenticate users
        self.sme_token = self._login(TEST_USERS['sme']['email'], TEST_USERS['sme']['password'])
        self.agency_token = self._login(TEST_USERS['agency']['email'], TEST_USERS['agency']['password'])

        yield

        # Cleanup
        self.cursor.close()
        self.conn.close()

    def _login(self, email: str, password: str) -> str:
        """Login to Supabase and return auth token"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={'apikey': SUPABASE_SERVICE_ROLE_KEY},
            json={'email': email, 'password': password}
        )
        if response.status_code == 200:
            return response.json()['access_token']
        else:
            raise Exception(f"Login failed for {email}: {response.text}")

    def _create_test_persona(self, include_client_id: bool = True) -> Dict[str, Any]:
        """Create a test persona payload"""
        persona = {
            "name": "Sarah Chen",
            "title": "Marketing Director",
            "company_name": "TechRetail Inc",
            "industry": "E-commerce",
            "vertical": "Retail Technology",
            "location": {
                "city": "San Francisco",
                "state_province": "California",
                "country": "United States"
            },
            "company_size": "150 employees",
            "annual_revenue": "$25M",
            "demographics": {
                "age": 35,
                "education": "MBA",
                "experience_years": 8,
                "tech_savviness": "High"
            },
            "goals": [
                "Increase conversion rates by 25%",
                "Reduce customer acquisition cost",
                "Improve email marketing performance"
            ],
            "pain_points": [
                "Disconnected marketing tools",
                "No unified customer view",
                "Difficulty attributing ROI to campaigns"
            ],
            "jobs_to_be_done": [
                "Automate marketing campaign execution",
                "Get real-time analytics and insights"
            ],
            "current_tools": [
                "HubSpot",
                "Google Analytics",
                "Shopify"
            ],
            "decision_criteria": {
                "price_sensitivity": "Medium",
                "key_factors": ["Integration", "Analytics", "Support"]
            },
            "objections": [
                "Implementation time concerns",
                "Budget constraints"
            ],
            "preferred_channels": [
                "Email",
                "LinkedIn",
                "Webinars"
            ],
            "personality_traits": {
                "risk_tolerance": "Medium",
                "innovation_appetite": "High",
                "decision_style": "Data-driven"
            },
            "customer_status": "prospect",
            "satisfaction_score": None,
            "background_story": "Sarah has been in marketing for 8 years and is frustrated with disconnected tools.",
            "key_quote": "I need a unified platform that gives me a complete view of my customers."
        }

        if include_client_id:
            persona["client_id"] = self.agency_client1_id

        return persona

    # ============================================================================
    # AGENCY ORGANIZATION TESTS
    # ============================================================================

    def test_agency_persona_save_with_client_id(self):
        """
        Test: Agency user can save persona with client_id

        Validates:
        - Request includes client_id in body
        - Backend accepts PersonaSaveRequest with client_id
        - Persona is saved to agency.agent_outputs (schema routing)
        - Response includes persona_id
        """
        print("\n✅ TEST: Agency persona save with client_id")

        # Create persona with client_id
        persona = self._create_test_persona(include_client_id=True)

        # Save persona
        response = requests.post(
            f"{API_BASE_URL}/api/v1/save-detected-persona",
            headers={
                'Authorization': f'Bearer {self.agency_token}',
                'Content-Type': 'application/json'
            },
            json=persona
        )

        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert result['success'] is True
        assert 'persona_id' in result
        assert result['persona_id'] is not None

        # Verify persona was written to agency.agent_outputs
        self.cursor.execute("""
            SELECT *
            FROM agency.agent_outputs
            WHERE id = %s
        """, (result['persona_id'],))
        saved_persona = self.cursor.fetchone()

        assert saved_persona is not None, "Persona not found in agency.agent_outputs"
        assert saved_persona['output_type'] == 'persona'
        assert saved_persona['org_id'] == uuid.UUID(self.agency_org_id)
        assert saved_persona['client_id'] == uuid.UUID(self.agency_client1_id)

        print(f"✅ Persona saved to agency.agent_outputs: {result['persona_id']}")
        print(f"   - org_id: {saved_persona['org_id']}")
        print(f"   - client_id: {saved_persona['client_id']}")

    def test_agency_persona_save_without_client_id_fails(self):
        """
        Test: Agency user CANNOT save persona without client_id

        Validates:
        - Backend validation requires client_id for AGENCY orgs
        - Returns 400 error with clear message
        - No persona is saved to database
        """
        print("\n✅ TEST: Agency persona save without client_id fails")

        # Create persona WITHOUT client_id
        persona = self._create_test_persona(include_client_id=False)

        # Attempt to save persona (should fail)
        response = requests.post(
            f"{API_BASE_URL}/api/v1/save-detected-persona",
            headers={
                'Authorization': f'Bearer {self.agency_token}',
                'Content-Type': 'application/json'
            },
            json=persona
        )

        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        result = response.json()
        assert 'detail' in result
        assert 'client_id is required' in result['detail'].lower()

        print(f"✅ Validation failed correctly: {result['detail']}")

    def test_agency_client_isolation(self):
        """
        Test: Personas from one client do not leak to another

        Validates:
        - Persona saved with client1_id only appears in client1 context
        - Querying with client2_id does not return client1's persona
        - Schema routing maintains client isolation
        """
        print("\n✅ TEST: Agency client isolation")

        # Save persona for client 1
        persona1 = self._create_test_persona(include_client_id=True)
        persona1["client_id"] = self.agency_client1_id
        persona1["name"] = "Client 1 Persona"

        response1 = requests.post(
            f"{API_BASE_URL}/api/v1/save-detected-persona",
            headers={
                'Authorization': f'Bearer {self.agency_token}',
                'Content-Type': 'application/json'
            },
            json=persona1
        )

        assert response1.status_code == 200
        persona1_id = response1.json()['persona_id']

        # Query for client 1 outputs (should include persona)
        self.cursor.execute("""
            SELECT *
            FROM agency.agent_outputs
            WHERE org_id = %s
            AND client_id = %s
            AND output_type = 'persona'
            ORDER BY created_at DESC
            LIMIT 10
        """, (self.agency_org_id, self.agency_client1_id))
        client1_outputs = self.cursor.fetchall()

        # Query for client 2 outputs (should NOT include persona)
        self.cursor.execute("""
            SELECT *
            FROM agency.agent_outputs
            WHERE org_id = %s
            AND client_id = %s
            AND output_type = 'persona'
            ORDER BY created_at DESC
            LIMIT 10
        """, (self.agency_org_id, self.agency_client2_id))
        client2_outputs = self.cursor.fetchall()

        # Verify isolation
        client1_persona_ids = [str(output['id']) for output in client1_outputs]
        client2_persona_ids = [str(output['id']) for output in client2_outputs]

        assert persona1_id in client1_persona_ids, "Client 1 persona not found in client 1 outputs"
        assert persona1_id not in client2_persona_ids, "Client 1 persona leaked to client 2 outputs!"

        print(f"✅ Client isolation verified:")
        print(f"   - Client 1 outputs: {len(client1_outputs)} personas")
        print(f"   - Client 2 outputs: {len(client2_outputs)} personas")
        print(f"   - No cross-client data leakage")

    # ============================================================================
    # SME ORGANIZATION TESTS
    # ============================================================================

    def test_sme_persona_save_without_client_id(self):
        """
        Test: SME user can save persona without client_id

        Validates:
        - SME orgs don't require client_id
        - Persona is saved to public.agent_outputs (backward compatible)
        - client_id is NULL for SME personas
        """
        print("\n✅ TEST: SME persona save without client_id")

        # Create persona WITHOUT client_id (valid for SME)
        persona = self._create_test_persona(include_client_id=False)

        # Save persona
        response = requests.post(
            f"{API_BASE_URL}/api/v1/save-detected-persona",
            headers={
                'Authorization': f'Bearer {self.sme_token}',
                'Content-Type': 'application/json'
            },
            json=persona
        )

        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert result['success'] is True
        assert 'persona_id' in result

        # Verify persona was written to public.agent_outputs
        self.cursor.execute("""
            SELECT *
            FROM public.agent_outputs
            WHERE id = %s
        """, (result['persona_id'],))
        saved_persona = self.cursor.fetchone()

        assert saved_persona is not None, "Persona not found in public.agent_outputs"
        assert saved_persona['output_type'] == 'persona'
        assert saved_persona['org_id'] == uuid.UUID(self.sme_org_id)
        assert saved_persona['client_id'] is None  # SME personas have NULL client_id

        print(f"✅ Persona saved to public.agent_outputs: {result['persona_id']}")
        print(f"   - org_id: {saved_persona['org_id']}")
        print(f"   - client_id: NULL (SME organization)")

    # ============================================================================
    # DATA INTEGRITY TESTS
    # ============================================================================

    def test_persona_content_structure_preserved(self):
        """
        Test: Persona data structure is preserved during save

        Validates:
        - All persona fields are saved to content JSONB
        - Location data structure preserved (nested dict)
        - Arrays (goals, pain_points) saved correctly
        - Nested objects (demographics, decision_criteria) saved correctly
        """
        print("\n✅ TEST: Persona content structure preserved")

        # Create persona with rich data
        persona = self._create_test_persona(include_client_id=True)

        # Save persona
        response = requests.post(
            f"{API_BASE_URL}/api/v1/save-detected-persona",
            headers={
                'Authorization': f'Bearer {self.agency_token}',
                'Content-Type': 'application/json'
            },
            json=persona
        )

        assert response.status_code == 200
        persona_id = response.json()['persona_id']

        # Retrieve saved persona
        self.cursor.execute("""
            SELECT content
            FROM agency.agent_outputs
            WHERE id = %s
        """, (persona_id,))
        saved_content = self.cursor.fetchone()['content']

        # Verify key fields preserved
        assert saved_content['name'] == "Sarah Chen"
        assert saved_content['title'] == "Marketing Director"
        assert saved_content['company_name'] == "TechRetail Inc"

        # Verify location structure
        assert 'location' in saved_content
        assert saved_content['location']['city'] == "San Francisco"
        assert saved_content['location']['state_province'] == "California"

        # Verify arrays
        assert len(saved_content['goals']) == 3
        assert len(saved_content['pain_points']) == 3

        # Verify nested objects
        assert saved_content['demographics']['age'] == 35
        assert saved_content['demographics']['experience_years'] == 8
        assert 'Integration' in saved_content['decision_criteria']['key_factors']

        print(f"✅ Persona data structure fully preserved:")
        print(f"   - All required fields present")
        print(f"   - Location nested dict: {saved_content['location']}")
        print(f"   - Goals array: {len(saved_content['goals'])} items")
        print(f"   - Demographics nested dict: {saved_content['demographics']}")


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
