#!/usr/bin/env python3
"""
Base test class for all automated tests
Provides common setup, authentication, and utilities for testing
"""
import os
import sys
import asyncio
from pathlib import Path
from supabase import create_client, Client
import requests

# Get project root dynamically
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.append(str(PROJECT_ROOT))

# Shared test configuration. Importing it also loads tests/.env and
# apps/api/.env. Ports and credentials live in test_config.py, not here.
from test_config import (  # noqa: E402
    AGENCY_OWNER_EMAIL,
    API_BASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    TEST_EMAIL,
    TEST_PASSWORD,
)

class BaseAgentTest:
    """Base class for all agent tests with common setup and utilities"""

    def __init__(self):
        # Configuration comes from test_config, which resolves env vars, then
        # tests/.env, then apps/api/.env, then the project's 563xx defaults.
        self.SUPABASE_URL = SUPABASE_URL
        self.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY
        self.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY
        self.TEST_EMAIL = TEST_EMAIL
        self.TEST_PASSWORD = TEST_PASSWORD
        self.API_BASE_URL = API_BASE_URL
        self.AGENCY_OWNER_EMAIL = AGENCY_OWNER_EMAIL

        # Test state
        self.supabase: Client = None
        self.user_id: str = None
        self.org_id: str = None
        self.access_token: str = None
        self.auth_headers: dict = {}
        self.results = {}

        # Agent configuration - Updated to match backend AGENT_MAP (10 agents)
        self.AGENTS = {
            'strategy': {
                'name': 'Strategy Agent',
                'endpoint': 'strategy',
                'test_message': 'Quick SWOT analysis please'
            },
            'persona': {
                'name': 'Persona Agent',
                'endpoint': 'persona',
                'test_message': 'Create one simple persona'
            },
            'marketing_strategy': {
                'name': 'Marketing Strategy Agent',
                'endpoint': 'marketing_strategy',
                'test_message': 'Brief marketing strategy'
            },
            'content': {
                'name': 'Content Agent',
                'endpoint': 'content',
                'test_message': 'One content idea'
            },
            'analytics': {
                'name': 'Analytics Agent',
                'endpoint': 'analytics',
                'test_message': 'Quick analytics overview'
            },
            'roi_budget': {
                'name': 'ROI & Budget Agent',
                'endpoint': 'roi_budget',
                'test_message': 'Simple budget tip'
            },
            'campaign_execution': {
                'name': 'Campaign Execution Agent',
                'endpoint': 'campaign_execution',
                'test_message': 'One campaign idea'
            },
            'quick_wins': {
                'name': 'Quick Wins Agent',
                'endpoint': 'quick_wins',
                'test_message': 'One quick win'
            },
            'competitive_intelligence': {
                'name': 'Competitive Intelligence Agent',
                'endpoint': 'competitive_intelligence',
                'test_message': 'Brief competitor analysis'
            },
            'client_success': {
                'name': 'Client Success Agent',
                'endpoint': 'client_success',
                'test_message': 'One retention tip'
            }
        }

    async def setup(self):
        """Initialize test environment with authentication"""
        print("🔧 Setting up test environment...")

        # Initialize Supabase client
        self.supabase = create_client(self.SUPABASE_URL, self.SUPABASE_ANON_KEY)

        # Authenticate user
        try:
            # Try to sign in
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": self.TEST_EMAIL,
                "password": self.TEST_PASSWORD
            })

            self.user_id = auth_response.user.id
            self.access_token = auth_response.session.access_token

            # Get org_id from database (single source of truth)
            user_data = self.supabase.table('users')\
                .select('org_id')\
                .eq('id', self.user_id)\
                .single()\
                .execute()

            self.org_id = user_data.data['org_id']

            # Set up auth headers
            self.auth_headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            print(f"✅ Authenticated user: {self.TEST_EMAIL}")
            print(f"   User ID: {self.user_id}")
            print(f"   Org ID: {self.org_id}")

        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            raise

    async def create_agent_session(self, agent_type: str) -> str:
        """Create a new agent session and return session_id"""
        try:
            response = requests.post(
                f"{self.API_BASE_URL}/api/v1/direct-agents/sessions",
                headers=self.auth_headers,
                json={"agent_type": agent_type}
            )
            response.raise_for_status()

            session_data = response.json()
            session_id = session_data.get('session_id')

            print(f"✅ Created {agent_type} session: {session_id}")
            return session_id

        except Exception as e:
            print(f"❌ Failed to create {agent_type} session: {e}")
            raise

    async def send_message_to_agent(self, agent_type: str, session_id: str, message: str) -> dict:
        """Send message to agent and return response"""
        try:
            response = requests.post(
                f"{self.API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat",
                headers=self.auth_headers,
                json={
                    "user_id": self.user_id,
                    "session_id": session_id,
                    "message": message,
                    "agent_type": agent_type
                }
            )
            response.raise_for_status()

            response_data = response.json()
            print(f"✅ {agent_type.title()} agent responded successfully")
            return response_data

        except Exception as e:
            print(f"❌ {agent_type.title()} agent failed: {e}")
            raise

    async def test_database_function(self, function_name: str, params: dict) -> dict:
        """Test a database RPC function"""
        try:
            result = self.supabase.rpc(function_name, params).execute()
            print(f"✅ Database function {function_name} executed successfully")
            return result.data
        except Exception as e:
            print(f"❌ Database function {function_name} failed: {e}")
            raise

    async def cleanup(self):
        """Clean up test environment"""
        print("🧹 Cleaning up test environment...")
        try:
            if self.supabase:
                self.supabase.auth.sign_out()
                print("✅ Signed out successfully")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")

    def print_results_summary(self):
        """Print a summary of test results"""
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)

        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result.get('success', False))

        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")

        print("\nDetailed Results:")
        for test_name, result in self.results.items():
            status = "✅ PASS" if result.get('success', False) else "❌ FAIL"
            print(f"  {status} {test_name}")
            if not result.get('success', False) and result.get('error'):
                print(f"    Error: {result['error']}")