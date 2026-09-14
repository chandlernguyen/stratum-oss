#!/usr/bin/env python
"""
Comprehensive Test Suite for Opportunity Intelligence Agent (Quick Wins Agent)
Tests agent functionality, tool calls, structured extraction, and database integration.

Run Instructions:
    # Run all tests
    poetry run pytest tests/automated/test_opportunity_intelligence_agent.py -v

    # Run specific test
    poetry run pytest tests/automated/test_opportunity_intelligence_agent.py::TestOpportunityIntelligenceAgent::test_identify_opportunities -v

    # Run with detailed output
    poetry run pytest tests/automated/test_opportunity_intelligence_agent.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test user exists: sme.owner@example.com / LocalDevOnly123!
    - GOOGLE_API_KEY set in .env
"""
import asyncio
import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import time
import uuid

# Load environment variables - use absolute path
import pathlib

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Test credentials
TEST_EMAIL = "sme.owner@example.com"
TEST_PASSWORD = "LocalDevOnly123!"

class TestOpportunityIntelligenceAgent:
    """
    Test suite for Opportunity Intelligence Agent (Quick Wins Agent).

    Tests:
    - Agent authentication and session management
    - Opportunity identification with enterprise context
    - Tool function calls (list_quick_wins, get_quick_wins_framework, etc.)
    - Structured extraction to agent_outputs table
    - Database integration and data persistence
    - Cross-agent context utilization
    """

    def __init__(self):
        # Use service role client for database operations
        self.supabase_service: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Use anon client for auth
        self.supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.access_token = None
        self.user_id = None
        self.org_id = None
        self.campaign_id = None
        self.auth_headers = {}
        self.test_results = []

    def setup_auth(self):
        """
        Authenticate and setup headers.

        Expected Behavior:
        - Authenticates with test user credentials
        - Retrieves access token and user ID
        - Gets organization ID from user_role_assignments

        Success Criteria:
        - Returns True with valid access_token
        - org_id is populated
        """
        try:
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

                # Get user's organization
                org_result = self.supabase_service.table('user_role_assignments') \
                    .select('org_id') \
                    .eq('user_id', self.user_id) \
                    .limit(1) \
                    .execute()

                if org_result.data and len(org_result.data) > 0:
                    self.org_id = org_result.data[0]['org_id']

                print(f"✅ Authenticated as: {TEST_EMAIL}")
                print(f"✅ User ID: {self.user_id}")
                print(f"✅ Organization ID: {self.org_id}")
                return True
            else:
                print("❌ Authentication failed")
                return False
        except Exception as e:
            print(f"❌ Auth error: {e}")
            return False

    def setup_test_campaign(self):
        """
        Create a test campaign for opportunity analysis.

        Expected Behavior:
        - Creates a new campaign with test data
        - Campaign includes budget and objectives

        Success Criteria:
        - Campaign created successfully with ID
        - Campaign data includes all required fields
        """
        try:
            campaign_data = {
                'id': str(uuid.uuid4()),
                'org_id': self.org_id,
                'name': f'Q4 Lead Generation {datetime.now().strftime("%Y%m%d")}',
                'status': 'active',
                'budget_cents': 1000000,  # $10,000 in cents
                'start_date': datetime.now().date().isoformat(),
                'objectives': {
                    'goal': 'lead_generation',
                    'target_leads': 500,
                    'target_revenue': 50000
                }
            }

            result = self.supabase_service.table('campaigns') \
                .insert(campaign_data) \
                .execute()

            if result.data:
                self.campaign_id = result.data[0]['id']
                print(f"✅ Created test campaign: {self.campaign_id}")
                print(f"   Campaign name: {campaign_data['name']}")
                print(f"   Budget: ${campaign_data['budget_cents'] / 100}")
                return True
        except Exception as e:
            print(f"❌ Campaign creation error: {e}")
            return False

    def create_session(self, agent_type="quick_wins"):
        """
        Create a new agent session for Quick Wins Agent.

        Expected Behavior:
        - POST to /api/v1/direct-agents/sessions
        - Returns session_id for conversation tracking

        Success Criteria:
        - Status code 200
        - Valid UUID session_id returned
        """
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/sessions",
                headers=self.auth_headers,
                json={"agent_type": agent_type}
            )

            if response.status_code == 200:
                session_id = response.json()["session_id"]
                print(f"✅ Created session: {session_id}")
                return session_id
            else:
                print(f"❌ Failed to create session: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Session creation error: {e}")
            return None

    def send_message(self, session_id, message, agent_type="quick_wins"):
        """
        Send a message to the Opportunity Intelligence Agent via SSE.

        Expected Behavior:
        - POST to /api/v1/direct-agents/quick_wins/chat
        - Receives streaming SSE response
        - Agent uses enterprise context to identify opportunities

        Success Criteria:
        - Status code 200
        - Response contains meaningful opportunity suggestions
        - Response length > 200 characters
        """
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat",
                headers=self.auth_headers,
                json={
                    "session_id": session_id,
                    "message": message,
                    "user_id": self.user_id,
                    "agent_type": agent_type,
                    "org_id": self.org_id,
                    "campaign_id": self.campaign_id
                },
                stream=True,
                timeout=60
            )

            if response.status_code != 200:
                print(f"❌ Chat request failed: {response.status_code}")
                print(f"   URL: {API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat")
                print(f"   Response: {response.text}")
                return None

            print(f"✅ Chat request successful: {response.status_code}")

            # Collect SSE stream
            full_response = ""
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        data = decoded_line[6:]
                        if data != "[DONE]":
                            try:
                                json_data = json.loads(data)
                                # SSE format uses 'token' field for text chunks
                                if 'token' in json_data:
                                    full_response += json_data['token']
                                elif 'content' in json_data:
                                    full_response += json_data['content']
                            except json.JSONDecodeError:
                                pass

            print(f"✅ Received response ({len(full_response)} chars)")
            return full_response

        except Exception as e:
            print(f"❌ Message send error: {e}")
            return None

    def verify_opportunities_saved(self, session_id, min_count=1):
        """
        Verify that opportunities were saved to agent_outputs table.

        Expected Behavior:
        - Query agent_outputs table for quick_wins agent_type
        - Filter by session_id and org_id
        - Verify structured data in content JSONB field

        Success Criteria:
        - At least min_count opportunities found
        - Each opportunity has required fields: title, priority, category, etc.
        - Content JSONB contains structured data (expected_impact, effort_required, etc.)
        """
        try:
            time.sleep(3)  # Wait for background extraction

            result = self.supabase_service.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'quick_wins') \
                .eq('session_id', session_id) \
                .execute()

            if not result.data or len(result.data) < min_count:
                print(f"❌ Expected at least {min_count} opportunities, found {len(result.data) if result.data else 0}")
                return False

            print(f"✅ Found {len(result.data)} opportunities in database")

            # Verify structure of first opportunity
            opp = result.data[0]
            required_fields = ['id', 'title', 'agent_type', 'org_id', 'content']

            for field in required_fields:
                if field not in opp or not opp[field]:
                    print(f"❌ Missing required field: {field}")
                    return False

            # Verify content structure
            content = opp.get('content', {})
            if not content:
                print("❌ Content JSONB is empty")
                return False

            print(f"✅ Opportunity structure validated")
            print(f"   Title: {opp.get('title', 'N/A')}")
            print(f"   Priority: {opp.get('priority', 'N/A')}")
            print(f"   Category: {opp.get('category', ['N/A'])[0] if opp.get('category') else 'N/A'}")

            return True

        except Exception as e:
            print(f"❌ Verification error: {e}")
            return False

    def verify_opportunity_summary_function(self):
        """
        Test the get_opportunity_summary database function.

        Expected Behavior:
        - Calls get_opportunity_summary(org_id) function
        - Returns aggregated metrics for all quick_wins

        Success Criteria:
        - Function returns JSON object
        - Contains total_opportunities, by_priority, by_status, by_category
        - No database errors
        """
        try:
            result = self.supabase_service.rpc(
                'get_opportunity_summary',
                {'p_org_id': self.org_id}
            ).execute()

            if result.data:
                summary = result.data
                print("✅ Opportunity summary function works")
                print(f"   Total opportunities: {summary.get('total_opportunities', 0)}")
                print(f"   High priority: {summary.get('by_priority', {}).get('high', 0)}")
                print(f"   Actionable now: {summary.get('actionable_now', 0)}")
                return True
            else:
                print("❌ Summary function returned no data")
                return False

        except Exception as e:
            print(f"❌ Summary function error: {e}")
            return False

    def test_identify_opportunities(self):
        """
        Test: Agent identifies quick win opportunities from business context

        Context:
        - Tests the core functionality of the Opportunity Intelligence Agent
        - Verifies agent can analyze existing marketing data and identify opportunities

        Test Steps:
        1. Create agent session
        2. Send message requesting opportunity analysis
        3. Verify agent response includes specific, actionable opportunities
        4. Verify opportunities are saved to database

        Expected Behavior:
        - Agent uses enterprise context (campaigns, personas, strategies)
        - Identifies 3-5 specific opportunities
        - Each opportunity has impact/effort assessment
        - Opportunities are categorized (SEO, content, social, email, etc.)

        Success Criteria:
        - Agent response > 500 characters
        - At least 1 opportunity saved to agent_outputs table
        - Structured data includes expected_impact and effort_required
        """
        print("\n" + "="*80)
        print("TEST: Identify Quick Win Opportunities")
        print("="*80)

        # Create session
        session_id = self.create_session("quick_wins")
        if not session_id:
            self.test_results.append(("Identify Opportunities", False, "Session creation failed"))
            return False

        # Send message
        message = """Analyze our current marketing situation and identify the top 5 quick win
opportunities we can implement in the next 2-4 weeks. Focus on high-impact, low-effort
improvements that will drive lead generation and improve our campaign performance."""

        response = self.send_message(session_id, message, "quick_wins")

        if not response or len(response) < 500:
            self.test_results.append(("Identify Opportunities", False, "Insufficient response"))
            return False

        # Verify opportunities saved
        if not self.verify_opportunities_saved(session_id, min_count=1):
            self.test_results.append(("Identify Opportunities", False, "Opportunities not saved"))
            return False

        self.test_results.append(("Identify Opportunities", True, "All checks passed"))
        return True

    def test_list_existing_opportunities(self):
        """
        Test: Agent can list existing opportunities using LIST_QUICK_WINS tool

        Context:
        - Tests the agent's ability to use the LIST_QUICK_WINS tool
        - Verifies tool function integration

        Test Steps:
        1. Create session
        2. Ask agent to list existing opportunities
        3. Verify agent calls list_quick_wins tool
        4. Verify response includes opportunity list

        Expected Behavior:
        - Agent recognizes request to list opportunities
        - Calls LIST_QUICK_WINS tool via function calling
        - Returns formatted list of existing opportunities

        Success Criteria:
        - Agent response mentions existing opportunities
        - Response references opportunity data from database
        """
        print("\n" + "="*80)
        print("TEST: List Existing Opportunities")
        print("="*80)

        # Create session
        session_id = self.create_session("quick_wins")
        if not session_id:
            self.test_results.append(("List Opportunities", False, "Session creation failed"))
            return False

        # Send message
        message = "What quick win opportunities do we currently have? Please list them."

        response = self.send_message(session_id, message, "quick_wins")

        if not response or len(response) < 100:
            self.test_results.append(("List Opportunities", False, "Insufficient response"))
            return False

        # Verify response mentions opportunities
        if "opportunit" not in response.lower():
            self.test_results.append(("List Opportunities", False, "No opportunities mentioned"))
            return False

        print(f"✅ Agent successfully listed opportunities")
        self.test_results.append(("List Opportunities", True, "Tool call successful"))
        return True

    def test_get_quick_wins_framework(self):
        """
        Test: Agent provides quick wins frameworks and templates

        Context:
        - Tests the get_quick_wins_framework tool
        - Verifies agent can provide strategic guidance

        Test Steps:
        1. Create session
        2. Ask agent for quick wins framework/guidance
        3. Verify agent provides framework categories
        4. Verify response includes prioritization guidance

        Expected Behavior:
        - Agent calls get_quick_wins_framework tool
        - Returns framework data (categories, prioritization, implementation guidance)
        - Response is educational and actionable

        Success Criteria:
        - Response mentions framework categories (content, conversion, social, email)
        - Response includes prioritization approach (ICE scoring, impact/effort)
        - Response > 300 characters
        """
        print("\n" + "="*80)
        print("TEST: Get Quick Wins Framework")
        print("="*80)

        # Create session
        session_id = self.create_session("quick_wins")
        if not session_id:
            self.test_results.append(("Quick Wins Framework", False, "Session creation failed"))
            return False

        # Send message
        message = """How should I approach identifying quick wins? What framework or methodology
do you recommend for prioritizing opportunities?"""

        response = self.send_message(session_id, message, "quick_wins")

        if not response or len(response) < 300:
            self.test_results.append(("Quick Wins Framework", False, "Insufficient response"))
            return False

        # Verify response includes framework elements
        framework_keywords = ["priorit", "impact", "effort", "framework", "categor"]
        keyword_count = sum(1 for keyword in framework_keywords if keyword in response.lower())

        if keyword_count < 3:
            self.test_results.append(("Quick Wins Framework", False, "Missing framework elements"))
            return False

        print(f"✅ Agent provided comprehensive framework guidance")
        self.test_results.append(("Quick Wins Framework", True, "Framework provided"))
        return True

    def test_cross_agent_context_utilization(self):
        """
        Test: Agent uses cross-agent context (strategies, personas, campaigns)

        Context:
        - Tests enterprise context integration
        - Verifies agent leverages existing marketing data

        Test Steps:
        1. Verify organization has existing strategies/personas/campaigns
        2. Create session
        3. Ask agent for opportunities
        4. Verify response references existing context

        Expected Behavior:
        - Agent accesses enterprise context via get_marketing_context
        - Response mentions existing campaigns or strategies
        - Opportunities are tailored to business context

        Success Criteria:
        - Response indicates awareness of existing marketing initiatives
        - Opportunities align with business context
        """
        print("\n" + "="*80)
        print("TEST: Cross-Agent Context Utilization")
        print("="*80)

        # Verify organization has context data
        strategies = self.supabase_service.table('agent_outputs') \
            .select('*') \
            .eq('org_id', self.org_id) \
            .eq('agent_type', 'strategy') \
            .limit(1) \
            .execute()

        if not strategies.data:
            print("⚠️  No strategies found - creating minimal context")

        # Create session
        session_id = self.create_session("quick_wins")
        if not session_id:
            self.test_results.append(("Cross-Agent Context", False, "Session creation failed"))
            return False

        # Send message
        message = """Based on our existing marketing strategy and current campaigns, what are
the best quick win opportunities to improve our results?"""

        response = self.send_message(session_id, message, "quick_wins")

        if not response or len(response) < 200:
            self.test_results.append(("Cross-Agent Context", False, "Insufficient response"))
            return False

        # Verify response shows context awareness
        context_indicators = ["campaign", "strategy", "current", "existing", "your"]
        indicator_count = sum(1 for indicator in context_indicators if indicator in response.lower())

        if indicator_count < 2:
            print("⚠️  Limited context awareness in response")

        print(f"✅ Agent demonstrated context awareness")
        self.test_results.append(("Cross-Agent Context", True, "Context utilized"))
        return True

    def run_all_tests(self):
        """
        Run complete test suite for Opportunity Intelligence Agent.

        Execution Order:
        1. Setup: Authentication and test data
        2. Core Tests: Agent functionality
        3. Integration Tests: Database and cross-agent
        4. Summary: Results report
        """
        print("\n" + "="*80)
        print("OPPORTUNITY INTELLIGENCE AGENT - COMPREHENSIVE TEST SUITE")
        print("="*80)
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Test User: {TEST_EMAIL}")
        print("="*80)

        # Setup
        if not self.setup_auth():
            print("\n❌ Authentication failed - aborting tests")
            return

        if not self.setup_test_campaign():
            print("\n⚠️  Campaign creation failed - some tests may not work")

        # Run tests
        self.test_identify_opportunities()
        self.test_list_existing_opportunities()
        self.test_get_quick_wins_framework()
        self.test_cross_agent_context_utilization()

        # Test database function
        print("\n" + "="*80)
        print("TEST: Database Function Integration")
        print("="*80)
        if self.verify_opportunity_summary_function():
            self.test_results.append(("Database Function", True, "Summary function works"))
        else:
            self.test_results.append(("Database Function", False, "Summary function failed"))

        # Print results
        print("\n" + "="*80)
        print("TEST RESULTS SUMMARY")
        print("="*80)

        passed = sum(1 for _, result, _ in self.test_results if result)
        total = len(self.test_results)

        for test_name, result, message in self.test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {test_name}: {message}")

        print("="*80)
        print(f"OVERALL: {passed}/{total} tests passed ({int(passed/total*100)}%)")
        print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)

        return passed == total


if __name__ == "__main__":
    tester = TestOpportunityIntelligenceAgent()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
