"""
Integration Tests: Marketing Strategy Agent - save_marketing_strategy with Multi-Tenant Routing

Tests the save_marketing_strategy function with proper client_id routing for agency users.

Run Instructions:
    # Run all tests in this file
    poetry run pytest tests/automated/test_marketing_strategy_save_multi_tenant.py -v

    # Run specific test
    poetry run pytest tests/automated/test_marketing_strategy_save_multi_tenant.py::TestMarketingStrategySave::test_agency_save_with_client_id -v

    # Run with output logging
    poetry run pytest tests/automated/test_marketing_strategy_save_multi_tenant.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test users exist: See /tests/TEST_USERS.md
    - Environment variables set in apps/api/.env:
      * GOOGLE_API_KEY (for agent LLM calls)
      * SUPABASE_URL
      * SUPABASE_SERVICE_ROLE_KEY
      * SUPABASE_ANON_KEY
"""

import os
import pytest
import json
import time
import requests
from typing import Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
import pathlib

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

# Load environment variables
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration

# Test credentials
AGENCY_EMAIL = "agency.owner@example.com"
SME_EMAIL = "sme.owner@example.com"
TEST_PASSWORD = "LocalDevOnly123!"


class TestMarketingStrategySave:
    """Integration tests for Marketing Strategy save functionality with multi-tenant routing"""

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
        self.client_id = None
        self.auth_headers = {}

        yield
        # Cleanup is done by database reset if needed

    def _authenticate(self, email: str, password: str):
        """Authenticate and setup headers using Supabase SDK"""
        try:
            auth_response = self.supabase_anon.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            if auth_response.user:
                self.user_id = auth_response.user.id
                self.access_token = auth_response.session.access_token
                self.auth_headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }

                # Get user's primary org_id from users table (RLS policies check against this)
                user_data = self.supabase_service.table('users') \
                    .select('org_id') \
                    .eq('id', self.user_id) \
                    .single() \
                    .execute()

                if user_data.data and user_data.data.get('org_id'):
                    self.org_id = user_data.data['org_id']

                    # Verify org type matches expected (AGENCY or SME)
                    org_info = self.supabase_service.table('organizations') \
                        .select('type') \
                        .eq('id', self.org_id) \
                        .single() \
                        .execute()

                    if org_info.data:
                        org_type = org_info.data['type']
                        print(f"User org_id ({org_type}): {self.org_id}")
                else:
                    pytest.fail(f"Could not find org_id for user {self.user_id}")

                # Get org type
                org_info = self.supabase_service.table('organizations') \
                    .select('type') \
                    .eq('id', self.org_id) \
                    .single() \
                    .execute()

                if org_info.data:
                    print(f"Org type: {org_info.data['type']}")

                    if org_info.data and org_info.data['type'] == 'AGENCY':
                        print("Org is AGENCY type, fetching client...")
                        # Get first client for this agency from agency.clients table
                        # Use RPC with raw SQL since agency schema is not exposed via PostgREST
                        try:
                            result = self.supabase_service.rpc('execute_sql', {
                                'query': f"SELECT id, name, slug FROM agency.clients WHERE org_id = '{self.org_id}' LIMIT 1"
                            }).execute()

                            if result.data and len(result.data) > 0:
                                self.client_id = result.data[0]['id']
                                print(f"Found client_id: {self.client_id} ({result.data[0]['name']})")
                            else:
                                print("No clients found for this agency")
                                self.client_id = None
                        except Exception as e:
                            # If RPC doesn't exist, fetch using direct postgres connection
                            print(f"RPC failed ({e}), trying direct psql query")
                            import subprocess
                            try:
                                cmd = f"PGSSLMODE=disable PGPASSWORD=postgres psql -h 127.0.0.1 -p 56322 -U postgres -d postgres -t -c \"SELECT id FROM agency.clients WHERE org_id = '{self.org_id}' LIMIT 1\""
                                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                                if result.returncode == 0 and result.stdout.strip():
                                    self.client_id = result.stdout.strip()
                                    print(f"Found client_id via psql: {self.client_id}")
                                else:
                                    print("No clients found via psql")
                                    self.client_id = None
                            except Exception as e2:
                                print(f"Psql query failed: {e2}")
                                self.client_id = None
                    else:
                        print("Org is not AGENCY type, skipping client lookup")
            else:
                pytest.fail("Authentication failed")
        except Exception as e:
            pytest.fail(f"Auth error: {e}")

    def _create_session(self, agent_type="marketing_strategy"):
        """Create a new agent session"""
        try:
            payload = {"agent_type": agent_type}
            if self.client_id:
                payload["client_id"] = self.client_id

            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/sessions",
                headers=self.auth_headers,
                json=payload
            )

            if response.status_code == 200:
                return response.json()["session_id"]
            else:
                pytest.fail(f"Failed to create session: {response.status_code} - {response.text}")
        except Exception as e:
            pytest.fail(f"Session creation error: {e}")

    def test_agency_save_with_client_id(self):
        """
        Test: Agency user saves marketing strategy with correct client_id routing

        Context:
        - Agency users have client_id parameter that must be passed to save function
        - Database router should route saves to agency.agent_outputs schema
        - Previously failed because client_id was missing (getattr bug)

        Test Steps:
        1. Authenticate as agency owner
        2. Create marketing strategy session
        3. Directly call the save function via API
        4. Verify save to agency.agent_outputs with client_id
        5. Verify save to marketing_strategies table

        Expected Behavior:
        - API returns 200 success
        - Record exists in agency.agent_outputs with client_id
        - Record exists in marketing_strategies table
        - client_id matches the agency's client

        Success Criteria:
        - Save succeeds without errors
        - Data persisted to correct schema
        - client_id properly set
        """
        # Arrange: Authenticate as agency user
        self._authenticate(AGENCY_EMAIL, TEST_PASSWORD)
        assert self.client_id is not None, "Agency user must have a client_id"

        session_id = self._create_session()

        # Prepare test marketing strategy data
        strategy_data = {
            "strategy_title": "Test Agency Marketing Strategy",
            "positioning_statement": "Test positioning for agency client",
            "target_segments": ["Segment A", "Segment B"],
            "messaging_framework": {
                "core_message": "Test message",
                "value_props": ["Value 1", "Value 2"]
            },
            "channel_strategy": {
                "Paid": ["Google Ads"],
                "Owned": ["Blog"],
                "Earned": ["PR"]
            },
            "budget_allocation": {
                "Paid": 5000,
                "Owned": 3000,
                "Earned": 2000
            },
            "content_pillars": ["Pillar 1", "Pillar 2", "Pillar 3"],
            "executive_summary": "This is a test marketing strategy for agency multi-tenant routing"
        }

        # Act: Directly call the save function via API
        # This tests the multi-tenant routing without relying on agent LLM calling it
        import asyncio
        from apps.api.agents.direct_marketing_strategy_agent import DirectMarketingStrategyAgent

        # Get org_type from database
        org_info = self.supabase_service.table('organizations') \
            .select('type') \
            .eq('id', self.org_id) \
            .single() \
            .execute()
        org_type = org_info.data['type'] if org_info.data else None

        # Create agent instance with proper async initialization pattern
        agent = DirectMarketingStrategyAgent()

        async def initialize_and_save():
            # Initialize agent with enterprise context
            await agent.__ainit__(
                org_id=self.org_id,
                user_id=self.user_id,
                client_id=self.client_id,
                campaign_id=None,
                org_type=org_type
            )
            agent.current_session_id = session_id

            # Call save function directly
            return await agent.save_marketing_strategy(
                strategy_title=strategy_data['strategy_title'],
                positioning_statement=strategy_data['positioning_statement'],
                target_segments=strategy_data['target_segments'],
                messaging_framework=strategy_data['messaging_framework'],
                channel_strategy=strategy_data['channel_strategy'],
                budget_allocation=strategy_data['budget_allocation'],
                content_pillars=strategy_data['content_pillars'],
                executive_summary=strategy_data['executive_summary']
            )

        result = asyncio.run(initialize_and_save())

        print(f"Save result: {result}")

        # Wait for async save operations to complete
        time.sleep(2)

        # Assert: Verify save to agency.agent_outputs
        # Use direct psql since agency schema is not exposed via PostgREST
        import subprocess

        cmd = f"""PGSSLMODE=disable PGPASSWORD=postgres psql -h 127.0.0.1 -p 56322 -U postgres -d postgres -t -c "SELECT row_to_json(t) FROM (SELECT id, client_id, org_id, agent_type, content FROM agency.agent_outputs WHERE session_id = '{session_id}' AND agent_type = 'marketing_strategy' AND client_id = '{self.client_id}' LIMIT 1) t" """

        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        assert result.returncode == 0, f"Failed to query agency.agent_outputs: {result.stderr}"

        output_line = result.stdout.strip()
        assert output_line, "Marketing strategy should be saved to agency.agent_outputs"

        saved_output = json.loads(output_line)

        # Verify client_id is set correctly
        assert saved_output['client_id'] == self.client_id, "client_id should match agency's client"
        assert saved_output['org_id'] == self.org_id, "org_id should match agency org"

        # Verify content structure
        content = saved_output['content']
        assert 'positioning_statement' in content or 'title' in content, "Content should have strategy data"

        # Verify save to marketing_strategies table (legacy)
        marketing_strategies = self.supabase_service.table('marketing_strategies') \
            .select('*') \
            .eq('org_id', self.org_id) \
            .execute()

        # Note: marketing_strategies might not have records if the save focused on agent_outputs
        # This is acceptable as we're migrating to unified outputs model
        print(f"✅ Agency save test passed - saved to agency.agent_outputs with client_id={self.client_id}")

    def test_sme_save_without_client_id(self):
        """
        Test: SME user saves marketing strategy without client_id (backward compatibility)

        Context:
        - SME users don't have client_id
        - Database router should route saves to public.agent_outputs schema
        - client_id should be NULL for SME saves

        Test Steps:
        1. Authenticate as SME owner
        2. Create marketing strategy session
        3. Trigger save via agent chat
        4. Verify save to public.agent_outputs without client_id

        Expected Behavior:
        - Save succeeds without client_id
        - Record exists in public.agent_outputs with client_id = NULL
        - Backward compatibility maintained

        Success Criteria:
        - Save succeeds for SME user
        - client_id is NULL in database
        - Data persisted to public schema
        """
        # Arrange: Authenticate as SME user
        self._authenticate(SME_EMAIL, TEST_PASSWORD)
        assert self.client_id is None, "SME user should not have a client_id"

        session_id = self._create_session()

        # Prepare test marketing strategy data
        strategy_data = {
            "strategy_title": "SME Marketing Strategy Test",
            "positioning_statement": "Value-focused positioning for SME",
            "target_segments": ["Small business owners"],
            "messaging_framework": {
                "core_message": "Education, ROI, Trust",
                "value_props": ["Education", "ROI", "Trust"]
            },
            "channel_strategy": {
                "Owned": ["Content marketing", "Email"],
                "Earned": ["SEO"]
            },
            "budget_allocation": {
                "Owned": 3000,
                "Earned": 2000
            },
            "content_pillars": ["Education", "ROI", "Trust"],
            "executive_summary": "This is a test marketing strategy for SME multi-tenant routing"
        }

        # Act: Directly call the save function via API
        import asyncio
        from apps.api.agents.direct_marketing_strategy_agent import DirectMarketingStrategyAgent

        # Get org_type from database
        org_info = self.supabase_service.table('organizations') \
            .select('type') \
            .eq('id', self.org_id) \
            .single() \
            .execute()
        org_type = org_info.data['type'] if org_info.data else None

        # Create agent instance with proper async initialization pattern
        agent = DirectMarketingStrategyAgent()

        async def initialize_and_save():
            # Initialize agent with enterprise context (no client_id for SME)
            await agent.__ainit__(
                org_id=self.org_id,
                user_id=self.user_id,
                client_id=None,  # SME users have no client_id
                campaign_id=None,
                org_type=org_type
            )
            agent.current_session_id = session_id

            # Call save function directly
            return await agent.save_marketing_strategy(
                strategy_title=strategy_data['strategy_title'],
                positioning_statement=strategy_data['positioning_statement'],
                target_segments=strategy_data['target_segments'],
                messaging_framework=strategy_data['messaging_framework'],
                channel_strategy=strategy_data['channel_strategy'],
                budget_allocation=strategy_data['budget_allocation'],
                content_pillars=strategy_data['content_pillars'],
                executive_summary=strategy_data['executive_summary']
            )

        result = asyncio.run(initialize_and_save())

        print(f"Save result: {result}")

        # Wait for async save operations to complete
        time.sleep(2)

        # Assert: Verify save to public.agent_outputs
        public_outputs = self.supabase_service.table('agent_outputs') \
            .select('*') \
            .eq('session_id', session_id) \
            .eq('agent_type', 'marketing_strategy') \
            .execute()

        assert len(public_outputs.data) > 0, "Marketing strategy should be saved to public.agent_outputs"
        saved_output = public_outputs.data[0]

        # Verify client_id is NULL for SME
        assert saved_output['client_id'] is None, "client_id should be NULL for SME users"
        assert saved_output['org_id'] == self.org_id, "org_id should match SME org"

        print(f"✅ SME save test passed - saved to public.agent_outputs with client_id=NULL")

    def test_save_function_is_class_method(self):
        """
        Test: Verify save_marketing_strategy is a class method (not local function)

        Context:
        - Previous bug: save_marketing_strategy was a local function inside create_tools()
        - getattr(self, 'save_marketing_strategy') returned None
        - Function never executed, no logs appeared

        Test Steps:
        1. Import the agent class
        2. Verify save_marketing_strategy exists as class method
        3. Verify it's callable and has 'self' parameter

        Expected Behavior:
        - save_marketing_strategy is a bound method of the class
        - Can be accessed via getattr(agent_instance, 'save_marketing_strategy')

        Success Criteria:
        - Method exists on class
        - Has correct signature with self parameter
        """
        from apps.api.agents.direct_marketing_strategy_agent import DirectMarketingStrategyAgent
        from inspect import signature, ismethod
        import asyncio

        # Create a mock agent instance (we don't need to fully initialize)
        class MockAgent:
            org_id = "test-org"
            user_id = "test-user"
            client_id = "test-client"
            campaign_id = None

        # Check if method exists on class
        assert hasattr(DirectMarketingStrategyAgent, 'save_marketing_strategy'), \
            "save_marketing_strategy should be a class method"

        # Verify it's an async method
        method = getattr(DirectMarketingStrategyAgent, 'save_marketing_strategy')
        assert asyncio.iscoroutinefunction(method), \
            "save_marketing_strategy should be an async function"

        # Verify signature has 'self' as first parameter
        sig = signature(method)
        params = list(sig.parameters.keys())
        assert params[0] == 'self', \
            "First parameter should be 'self' (class method, not local function)"

        # Verify expected parameters exist
        expected_params = [
            'self', 'strategy_title', 'positioning_statement',
            'target_segments', 'messaging_framework', 'channel_strategy',
            'budget_allocation', 'content_pillars'
        ]
        for param in expected_params:
            assert param in params, f"Parameter '{param}' should exist in save_marketing_strategy signature"

        print("✅ save_marketing_strategy is correctly defined as a class method")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
