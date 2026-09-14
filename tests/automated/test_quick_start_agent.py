#!/usr/bin/env python
"""
Test Suite: Quick Start Agent - Comprehensive onboarding intelligence generation

Tests the DirectQuickStartAgent which combines Strategy, Persona, and Marketing Strategy
capabilities to generate complete business intelligence in a single 5-minute session.

Run Instructions:
    # Run all tests in this file
    poetry run pytest tests/automated/test_quick_start_agent.py -v

    # Run specific test
    poetry run pytest tests/automated/test_quick_start_agent.py::TestQuickStartAgent::test_complete_onboarding_flow -v

    # Run with output logging
    poetry run pytest tests/automated/test_quick_start_agent.py -v -s

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test user exists: sme.owner@example.com (see test_config.py)
    - GOOGLE_API_KEY set in environment
"""
import os
import json
import time
import pytest
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
    TEST_EMAIL,
    TEST_PASSWORD,
)

# Load environment variables
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration - ALL from environment variables

# Test credentials come from test_config (seeded by supabase/seed.sql).


class TestQuickStartAgent:
    """
    Test suite for Quick Start Agent functionality.

    The Quick Start Agent combines capabilities from Strategy, Persona, and Marketing
    Strategy agents to provide comprehensive onboarding intelligence generation.
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

        # Quick Start wizard answers (simulating localStorage data)
        self.wizard_answers = {
            "company": "TechFlow Solutions - B2B SaaS project management platform for construction teams",
            "goal": "Generate 100 qualified enterprise leads per month for our project management software",
            "audience": "Construction project managers at mid-size firms (50-500 employees) struggling with team coordination",
            "budget": "5000-20000",
            "timeline": "3-6-months"
        }

        # Authenticate
        self._authenticate()

        yield
        # Cleanup after test (if needed)

    def _authenticate(self):
        """Authenticate and setup headers"""
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
            else:
                pytest.fail("Authentication failed")
        except Exception as e:
            pytest.fail(f"Auth error: {e}")

    def create_session(self, agent_type="quick_start"):
        """Create a new agent session"""
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/sessions",
                headers=self.auth_headers,
                json={"agent_type": agent_type}
            )

            if response.status_code == 200:
                session_id = response.json()["session_id"]
                return session_id
            else:
                pytest.fail(f"Failed to create session: {response.status_code} - {response.text}")
        except Exception as e:
            pytest.fail(f"Session creation error: {e}")

    def send_message(self, message: str, session_id: str = None, agent_type: str = "quick_start") -> Dict[str, Any]:
        """
        Send a message to the Quick Start agent and get response.

        Args:
            message: Message to send to agent
            session_id: Optional session ID for conversation continuity
            agent_type: Agent type (default: quick-start)

        Returns:
            Dict with 'message' and 'session_id'
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
                    "org_id": self.org_id
                },
                stream=True,
                timeout=120
            )

            if response.status_code != 200:
                return {"error": f"Status {response.status_code}: {response.text}"}

            # Collect SSE responses
            full_response = ""
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        if data_str == '[DONE]':
                            break
                        try:
                            data = json.loads(data_str)
                            if 'token' in data:
                                full_response += data['token']
                            elif 'content' in data:
                                full_response += data['content']
                            # Extract session_id if present
                            if 'session_id' in data and not session_id:
                                session_id = data['session_id']
                        except json.JSONDecodeError:
                            continue

            return {
                "message": full_response,
                "session_id": session_id
            }

        except Exception as e:
            return {"error": str(e)}

    def test_complete_onboarding_flow(self):
        """
        Test: Complete Quick Start onboarding flow with wizard answers

        Expected Behavior:
        - Agent acknowledges wizard answers
        - Provides comprehensive strategy + personas + marketing plan
        - Response is actionable and budget-aware

        Success Criteria:
        - Response > 500 characters
        - Mentions budget or timeline
        - References company/industry
        """
        session_id = self.create_session()

        initial_message = f"""I just completed the Quick Start wizard. Here's my context:

**Company**: {self.wizard_answers['company']}
**Goal**: {self.wizard_answers['goal']}
**Target Audience**: {self.wizard_answers['audience']}
**Monthly Budget**: ${self.wizard_answers['budget']}
**Timeline**: {self.wizard_answers['timeline']}

Please generate comprehensive marketing intelligence for me: business strategy, customer personas, and a complete marketing plan."""

        result = self.send_message(initial_message, session_id=session_id)

        assert 'error' not in result, f"Error in response: {result.get('error')}"
        assert 'message' in result
        assert len(result['message']) > 500, "Response should be comprehensive"

        response_text = result['message'].lower()

        # Should mention budget awareness
        assert any(keyword in response_text for keyword in ['budget', '$5', '$20', 'investment']), \
            "Should acknowledge budget constraints"

        # Should reference company/industry
        assert any(keyword in response_text for keyword in ['techflow', 'construction', 'project']), \
            "Should reference specific company context"

    def test_strategy_tool_delegation(self):
        """
        Test: Quick Start Agent correctly delegates to Strategy Agent tools

        Expected Behavior:
        - Agent recognizes request for SWOT analysis
        - Returns structured SWOT components
        - All quadrants present

        Success Criteria:
        - Response includes Strengths, Weaknesses, Opportunities, Threats
        """
        session_id = self.create_session()

        message = f"""Based on this business context:
{self.wizard_answers['company']}

Please provide a SWOT analysis to guide our strategy."""

        result = self.send_message(message, session_id=session_id)

        assert 'error' not in result
        response_text = result['message'].lower()

        # Verify SWOT components mentioned
        assert 'strength' in response_text, "Should include strengths"
        assert 'weakness' in response_text, "Should include weaknesses"
        assert 'opportunit' in response_text, "Should include opportunities"
        assert 'threat' in response_text, "Should include threats"

    def test_persona_tool_delegation(self):
        """
        Test: Quick Start Agent correctly delegates to Persona Agent tools

        Expected Behavior:
        - Agent creates buyer persona
        - Includes demographics, goals, pain points

        Success Criteria:
        - Response mentions persona or profile
        - Goals and pain points identified
        """
        session_id = self.create_session()

        message = f"""Create a detailed buyer persona for:
{self.wizard_answers['audience']}

Include demographics, goals, pain points, and preferred channels."""

        result = self.send_message(message, session_id=session_id)

        assert 'error' not in result
        response_text = result['message'].lower()

        # Verify persona components
        assert 'persona' in response_text or 'profile' in response_text
        assert 'goals' in response_text or 'objectives' in response_text
        assert 'pain' in response_text or 'challenge' in response_text

    def test_budget_awareness(self):
        """
        Test: Agent provides budget-appropriate recommendations

        Expected Behavior:
        - For $5K-20K budget, recommends multi-channel approach
        - Mentions appropriate tactics for budget level

        Success Criteria:
        - At least 3 channels mentioned
        - Recommendations align with stated budget
        """
        session_id = self.create_session()

        message = f"""Given my monthly budget of $5,000-20,000, what marketing channels should I focus on?

Target audience: {self.wizard_answers['audience']}
Timeline: {self.wizard_answers['timeline']}"""

        result = self.send_message(message, session_id=session_id)

        assert 'error' not in result
        response_text = result['message'].lower()

        # Should mention multiple channels appropriate for budget
        channel_count = sum([
            'linkedin' in response_text,
            'content' in response_text or 'blog' in response_text,
            'email' in response_text,
            'google' in response_text or 'search' in response_text,
            'social' in response_text
        ])
        assert channel_count >= 3, f"Should recommend at least 3 marketing channels, found {channel_count}"

    def test_timeline_awareness(self):
        """
        Test: Agent prioritizes tactics based on timeline

        Expected Behavior:
        - For 3-6 month timeline, balances quick wins with longer-term tactics
        - Emphasizes actionable steps

        Success Criteria:
        - Response mentions prioritization or timeline
        - Includes quick-to-implement tactics
        """
        session_id = self.create_session()

        message = f"""I need results in 3-6 months. What should I prioritize?

Company: {self.wizard_answers['company']}
Budget: ${self.wizard_answers['budget']}"""

        result = self.send_message(message, session_id=session_id)

        assert 'error' not in result
        response_text = result['message'].lower()

        # Should mention timeline awareness
        assert any(keyword in response_text for keyword in ['prioritize', 'focus', 'start', 'first']), \
            "Should emphasize prioritization"

    def test_conversation_memory(self):
        """
        Test: Agent maintains context across multiple messages

        Expected Behavior:
        - Session ID maintained across messages
        - Agent remembers previous context

        Success Criteria:
        - Same session ID returned
        - Follow-up response is contextually relevant
        """
        # Create session and send first message
        session_id = self.create_session()

        result1 = self.send_message(
            f"My company: {self.wizard_answers['company']}. What should my marketing strategy be?",
            session_id=session_id
        )

        assert 'error' not in result1

        # Follow-up message (without re-stating company info)
        time.sleep(2)
        result2 = self.send_message(
            "What about content topics?",
            session_id=session_id
        )

        assert 'error' not in result2
        assert len(result2['message']) > 100, "Should provide substantive answer based on context"

    def test_error_handling_missing_context(self):
        """
        Test: Agent handles vague requests gracefully

        Expected Behavior:
        - Agent asks clarifying questions
        - Professional, helpful tone

        Success Criteria:
        - HTTP 200 response (not error)
        - Response contains questions
        """
        session_id = self.create_session()

        result = self.send_message("Help me with marketing", session_id=session_id)

        assert 'error' not in result
        response_text = result['message']

        # Should ask for more information
        assert '?' in response_text, "Should ask clarifying questions"
        assert len(response_text) > 50, "Should provide helpful guidance"

    def test_response_time_performance(self):
        """
        Test: Agent responds within acceptable timeframe

        Performance Requirements:
        - Initial response: < 30 seconds

        Success Criteria:
        - Response time meets target
        - No timeout errors
        """
        session_id = self.create_session()

        start_time = time.time()

        result = self.send_message("Quick test message", session_id=session_id)

        elapsed_time = time.time() - start_time

        assert 'error' not in result
        assert elapsed_time < 30.0, f"Response took {elapsed_time:.2f}s (max 30s)"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
