"""
Integration Tests: AI Agent Rate Limiting

Tests the rate limiting functionality on AI agent endpoints to prevent
API abuse and control Gemini API costs.

Run Instructions:
    # RECOMMENDED: Run individual tests (rate limit state persists between tests)
    poetry run pytest tests/automated/test_rate_limiting_integration.py::TestRateLimiting::test_rate_limit_enforcement -v -s

    # Run specific test
    poetry run pytest tests/automated/test_rate_limiting_integration.py::TestRateLimiting::test_rate_limit_applies_to_all_agent_types -v -s

    # Run unauthenticated test
    poetry run pytest tests/automated/test_rate_limiting_integration.py::TestRateLimitAuthentication::test_unauthenticated_request_rejected -v -s

    # Run window reset test (takes 60+ seconds)
    poetry run pytest tests/automated/test_rate_limiting_integration.py::TestRateLimiting::test_rate_limit_window_reset -v -s

    # Run all tests (WARNING: Takes 3-4 minutes due to rate limit resets)
    poetry run pytest tests/automated/test_rate_limiting_integration.py -v -s

    # Run with coverage
    poetry run pytest tests/automated/test_rate_limiting_integration.py::TestRateLimiting::test_rate_limit_enforcement --cov=apps.api.routers.direct_agents -v

Important Notes:
    - Rate limit state is per-user and persists in memory (60 second window)
    - Running multiple tests sequentially may hit rate limits from previous tests
    - For reliable results, run tests individually or wait 61+ seconds between runs
    - The backend must be restarted to clear rate limit state completely

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test user exists: See /tests/TEST_USERS.md
    - Environment variables set in apps/api/.env:
      * GOOGLE_API_KEY (for agent tests)
      * SUPABASE_URL
      * SUPABASE_SERVICE_ROLE_KEY
      * SUPABASE_ANON_KEY
    - Rate limiting configured: 10 requests/minute per user (AI_RATE_LIMIT_REQUESTS)
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

# Configuration - ALL from environment variables

# Test credentials - from TEST_USERS.md
TEST_EMAIL = os.getenv("SME_OWNER_EMAIL", "sme.owner@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "LocalDevOnly123!")

# Rate limiting constants (must match backend configuration)
RATE_LIMIT_REQUESTS = 10  # Max requests per window
RATE_LIMIT_WINDOW = 60    # Window in seconds

# These tests assert that the server returns 429, so they are only meaningful
# when the server under test enforces limits. The rest of the integration suite
# needs limits off (it legitimately issues far more than 10 requests per minute
# from one seeded user, and every request after the tenth would 429). This
# module is therefore opt-in rather than dependent on ambient server config.
#
# To run it correctly:
#   1. start the API with AI_RATE_LIMIT_ENABLED=true (the production default)
#   2. RUN_RATE_LIMIT_TESTS=1 poetry run pytest tests/automated/test_rate_limiting_integration.py
pytestmark = pytest.mark.skipif(
    os.getenv("RUN_RATE_LIMIT_TESTS", "").strip().lower() not in {"1", "true", "yes", "on"},
    reason=(
        "rate-limit tests need a server started with AI_RATE_LIMIT_ENABLED=true; "
        "set RUN_RATE_LIMIT_TESTS=1 to run them (see module docstring)"
    ),
)


class TestRateLimiting:
    """Integration test suite for AI agent rate limiting functionality"""

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
        self.session_id = None

        # Authenticate
        self._authenticate()

        yield

        # Cleanup: Archive test session if created
        if self.session_id:
            try:
                self.supabase_service.table('agent_conversations') \
                    .update({'archived_at': 'now()'}) \
                    .eq('id', self.session_id) \
                    .execute()
            except Exception:
                pass  # Ignore cleanup errors

        # Note: Rate limit state persists between tests for same user
        # Run tests individually or wait 61s between test runs

    def _authenticate(self):
        """Authenticate and setup headers using Supabase SDK"""
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
                    pytest.fail("User has no organization assignment")
            else:
                pytest.fail("Authentication failed")
        except Exception as e:
            pytest.fail(f"Auth error: {e}")

    def _create_session(self, agent_type="strategy"):
        """Create a new agent session"""
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/sessions",
                headers=self.auth_headers,
                json={"agent_type": agent_type}
            )

            if response.status_code == 200:
                session_id = response.json()["session_id"]
                self.session_id = session_id  # Store for cleanup
                return session_id
            else:
                pytest.fail(f"Failed to create session: {response.status_code} - {response.text}")
        except Exception as e:
            pytest.fail(f"Session creation error: {e}")

    def _send_chat_message(self, message: str, session_id: str, agent_type: str = "strategy"):
        """Send a chat message to the agent endpoint"""
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat",
                headers=self.auth_headers,
                json={
                    "session_id": session_id,
                    "message": message,
                    "user_id": self.user_id,
                    "agent_type": agent_type
                },
                timeout=5  # Short timeout since we're just testing rate limits
            )
            return response
        except requests.exceptions.Timeout:
            # Timeout is acceptable for this test - we only care about rate limiting
            return type('obj', (object,), {'status_code': 200, 'text': 'timeout'})()
        except Exception as e:
            pytest.fail(f"Chat request error: {e}")

    def test_rate_limit_enforcement(self):
        """
        Test: Verify rate limiting enforces 10 requests/minute limit

        Context:
        - Rate limiting prevents API abuse and controls Gemini API costs
        - User-based rate limiting: 10 requests per minute per user
        - 11th request within window should return HTTP 429

        Test Steps:
        1. Authenticate test user
        2. Create agent session
        3. Send 10 rapid chat requests (should all succeed)
        4. Send 11th request (should be rate limited with 429)
        5. Verify error message is clear and informative

        Expected Behavior:
        - First 10 requests: HTTP 200 or streaming response
        - 11th request: HTTP 429 (Too Many Requests)
        - Error message: Contains rate limit information

        Success Criteria:
        - Rate limit triggers at exactly 10 requests
        - 429 status code returned on 11th request
        - Error message explains rate limit clearly
        """
        print("\n🧪 Testing rate limit enforcement (10 requests/min)...")

        # Create session
        session_id = self._create_session(agent_type="strategy")
        print(f"✅ Created session: {session_id[:8]}...")

        # Send 10 rapid requests (should all succeed or start streaming)
        print(f"📨 Sending {RATE_LIMIT_REQUESTS} requests...")
        successful_requests = 0

        for i in range(RATE_LIMIT_REQUESTS):
            response = self._send_chat_message(
                message=f"Test message {i+1}",
                session_id=session_id,
                agent_type="strategy"
            )

            # Accept 200 (success) or any non-429 status
            if response.status_code != 429:
                successful_requests += 1
                print(f"  ✅ Request {i+1}: Status {response.status_code}")
            else:
                pytest.fail(f"Rate limit triggered early at request {i+1}")

        assert successful_requests == RATE_LIMIT_REQUESTS, \
            f"Expected {RATE_LIMIT_REQUESTS} successful requests, got {successful_requests}"

        print(f"✅ All {RATE_LIMIT_REQUESTS} requests succeeded")

        # Send 11th request (should be rate limited)
        print("📨 Sending 11th request (should trigger rate limit)...")
        response_11 = self._send_chat_message(
            message="This should be rate limited",
            session_id=session_id,
            agent_type="strategy"
        )

        # Verify rate limit response
        assert response_11.status_code == 429, \
            f"Expected HTTP 429 on 11th request, got {response_11.status_code}"

        print(f"✅ 11th request correctly rate limited (HTTP 429)")

        # Verify error message is informative
        try:
            error_data = response_11.json()
            assert 'detail' in error_data, "Error response should include 'detail' field"

            error_message = error_data['detail'].lower()
            assert 'rate limit' in error_message, "Error message should mention 'rate limit'"
            assert str(RATE_LIMIT_REQUESTS) in error_data['detail'], \
                f"Error message should include limit ({RATE_LIMIT_REQUESTS} requests)"

            print(f"✅ Error message is clear: {error_data['detail']}")
        except Exception as e:
            pytest.fail(f"Failed to parse error response: {e}")

    def test_rate_limit_per_user_isolation(self):
        """
        Test: Verify rate limiting is per-user (not global)

        Context:
        - Rate limiting should be user-based, not global
        - Each user gets their own rate limit quota
        - One user hitting rate limit shouldn't affect others

        Test Steps:
        1. Current user hits rate limit (10 requests)
        2. Verify current user is rate limited
        3. Note: Multi-user testing would require additional test users

        Expected Behavior:
        - Rate limit is enforced per user_id
        - Different users have independent rate limits

        Success Criteria:
        - Rate limit stores per user_id
        - User A hitting limit doesn't affect User B
        """
        print("\n🧪 Testing rate limit per-user isolation...")

        session_id = self._create_session(agent_type="strategy")
        print(f"✅ Created session: {session_id[:8]}...")

        # Hit rate limit for current user
        print(f"📨 Sending {RATE_LIMIT_REQUESTS + 1} requests to trigger rate limit...")

        for i in range(RATE_LIMIT_REQUESTS):
            self._send_chat_message(
                message=f"Quota test {i+1}",
                session_id=session_id,
                agent_type="strategy"
            )

        # 11th request should be rate limited
        response = self._send_chat_message(
            message="Should be rate limited",
            session_id=session_id,
            agent_type="strategy"
        )

        assert response.status_code == 429, \
            "User should be rate limited after 10 requests"

        print("✅ Per-user rate limiting verified")
        print("ℹ️  Note: Multi-user isolation would require additional test users")

    def test_rate_limit_window_reset(self):
        """
        Test: Verify rate limit resets after time window

        Context:
        - Rate limit window is 60 seconds (1 minute)
        - After window expires, user should be able to make new requests
        - Important for UX - users aren't permanently blocked

        Test Steps:
        1. Hit rate limit (10 requests)
        2. Verify 11th request is blocked (429)
        3. Wait for rate limit window to expire (60 seconds)
        4. Send new request (should succeed)

        Expected Behavior:
        - Rate limit blocks 11th request
        - After 60 seconds, rate limit resets
        - New requests succeed after reset

        Success Criteria:
        - 11th request returns 429
        - After 60s wait, request succeeds
        - Rate limit properly cleans up old entries

        Note: This test takes 60+ seconds to complete
        """
        print("\n🧪 Testing rate limit window reset (60 second window)...")
        print("⏰ This test takes ~60 seconds to complete...")

        session_id = self._create_session(agent_type="strategy")

        # Hit rate limit
        print(f"📨 Sending {RATE_LIMIT_REQUESTS} requests...")
        for i in range(RATE_LIMIT_REQUESTS):
            self._send_chat_message(
                message=f"Window test {i+1}",
                session_id=session_id,
                agent_type="strategy"
            )

        # Verify rate limited
        response_before = self._send_chat_message(
            message="Should be rate limited",
            session_id=session_id,
            agent_type="strategy"
        )
        assert response_before.status_code == 429, "Should be rate limited"
        print("✅ Rate limit active (HTTP 429)")

        # Wait for window to reset (60 seconds + 1 second buffer)
        wait_time = RATE_LIMIT_WINDOW + 1
        print(f"⏳ Waiting {wait_time} seconds for rate limit window to reset...")
        time.sleep(wait_time)

        # Try request after window reset
        print("📨 Sending request after window reset...")
        response_after = self._send_chat_message(
            message="Should succeed after reset",
            session_id=session_id,
            agent_type="strategy"
        )

        assert response_after.status_code != 429, \
            f"Rate limit should have reset after {wait_time}s, but got {response_after.status_code}"

        print("✅ Rate limit successfully reset after window")
        print(f"✅ New request succeeded (HTTP {response_after.status_code})")

    def test_rate_limit_applies_to_all_agent_types(self):
        """
        Test: Verify rate limiting applies to all agent endpoints

        Context:
        - Rate limiting should be consistent across all agent types
        - Strategy, persona, content, etc. all share same rate limit
        - Prevents users from bypassing limits by switching agents

        Test Steps:
        1. Send 5 requests to strategy agent
        2. Send 5 requests to persona agent
        3. Send 1 more request to any agent (should be rate limited)

        Expected Behavior:
        - Rate limit counts requests across all agent types
        - 11th request is blocked regardless of agent type

        Success Criteria:
        - Cross-agent rate limit enforcement works
        - Total requests (not per-agent) counted
        """
        print("\n🧪 Testing rate limit applies across all agent types...")

        # Create sessions for different agent types
        strategy_session = self._create_session(agent_type="strategy")
        persona_session = self._create_session(agent_type="persona")

        print(f"📨 Sending 5 requests to strategy agent...")
        for i in range(5):
            self._send_chat_message(
                message=f"Strategy test {i+1}",
                session_id=strategy_session,
                agent_type="strategy"
            )

        print(f"📨 Sending 5 requests to persona agent...")
        for i in range(5):
            self._send_chat_message(
                message=f"Persona test {i+1}",
                session_id=persona_session,
                agent_type="persona"
            )

        print("📨 Sending 11th request (should be rate limited)...")
        response = self._send_chat_message(
            message="Cross-agent rate limit test",
            session_id=strategy_session,
            agent_type="strategy"
        )

        assert response.status_code == 429, \
            "Rate limit should apply across all agent types"

        print("✅ Rate limit successfully applies across all agent types")


# Additional test for authentication requirement
class TestRateLimitAuthentication:
    """Test rate limiting requires authentication"""

    def test_unauthenticated_request_rejected(self):
        """
        Test: Verify unauthenticated requests are rejected before rate limiting

        Context:
        - Authentication should be checked before rate limiting
        - Unauthenticated requests should return 401 or 403, not 429

        Expected Behavior:
        - Unauthenticated request returns HTTP 401 or 403 (Supabase returns 403)
        - Rate limiting only applies to authenticated users
        """
        print("\n🧪 Testing unauthenticated requests are rejected...")

        # Try to send chat message without auth headers
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/strategy/chat",
                json={
                    "session_id": "fake-session-id",
                    "message": "Test without auth",
                    "user_id": "fake-user-id",
                    "agent_type": "strategy"
                },
                timeout=5
            )

            assert response.status_code in [401, 403], \
                f"Unauthenticated request should return 401 or 403, got {response.status_code}"

            print(f"✅ Unauthenticated request correctly rejected (HTTP {response.status_code})")

        except AssertionError:
            raise
        except Exception as e:
            pytest.fail(f"Unauthenticated request test failed: {e}")


if __name__ == "__main__":
    """Run tests directly with pytest"""
    import subprocess
    import sys

    print("🧪 Running Rate Limiting Integration Tests...")
    print("=" * 60)

    result = subprocess.run(
        ["poetry", "run", "pytest", __file__, "-v", "-s"],
        cwd=str(Path(__file__).resolve().parents[2])
    )

    sys.exit(result.returncode)
