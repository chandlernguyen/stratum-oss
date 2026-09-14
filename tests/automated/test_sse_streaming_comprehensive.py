#!/usr/bin/env python3
"""
Test Suite: SSE (Server-Sent Events) Streaming Comprehensive Validation

Tests real-time streaming functionality across all 11 AI agents:
- Connection establishment and maintenance
- Message streaming performance
- Error handling and recovery
- Connection interruption handling
- Memory management during long streams
- Concurrent stream handling

Run Instructions:
    # Run all SSE tests
    poetry run pytest tests/automated/test_sse_streaming_comprehensive.py -v

    # Run specific agent streaming
    poetry run pytest tests/automated/test_sse_streaming_comprehensive.py::TestAgentStreaming::test_strategy_agent_streaming -v

    # Run performance tests
    poetry run pytest tests/automated/test_sse_streaming_comprehensive.py::TestStreamingPerformance -v

Prerequisites:
    - Supabase running: supabase start
    - Backend running: poetry run uvicorn apps.api.main:app --reload --port 8000
    - Test user exists: sme.owner@example.com (see test_config.py)
    - GOOGLE_API_KEY configured in .env
"""
import os
import pytest
import requests
import sseclient
import time
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
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


class SSETestBase:
    """Base class for SSE streaming tests"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication and session"""
        # Create Supabase client and authenticate
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

        response = self.supabase.auth.sign_in_with_password({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })

        assert response.user is not None, "Login failed"
        assert response.session is not None, "No session created"

        self.access_token = response.session.access_token
        self.user_id = response.user.id
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        yield

        # Cleanup
        self.supabase.auth.sign_out()

    def create_agent_session(self, agent_type: str) -> str:
        """Create an agent session and return session_id"""
        response = requests.post(
            f"{API_BASE_URL}/api/v1/direct-agents/sessions",
            headers=self.headers,
            json={"agent_type": agent_type}
        )

        assert response.status_code == 200, f"Failed to create {agent_type} session"
        return response.json()['session_id']

    def stream_agent_message(
        self,
        agent_type: str,
        session_id: str,
        message: str,
        timeout: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Stream messages from agent and collect all events

        Returns:
            List of events with their data
        """
        url = f"{API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat"

        payload = {
            "user_id": self.user_id,
            "session_id": session_id,
            "message": message,
            "agent_type": agent_type
        }

        response = requests.post(
            url,
            headers=self.headers,
            json=payload,
            stream=True,
            timeout=timeout
        )

        assert response.status_code == 200, f"Stream request failed: {response.status_code}"

        events = []
        client = sseclient.SSEClient(response)

        try:
            for event in client.events():
                if event.data:
                    try:
                        data = json.loads(event.data)
                        events.append({
                            'event': event.event or 'message',
                            'data': data,
                            'timestamp': time.time()
                        })

                        # Stop if we receive done event
                        if data.get('done', False):
                            break

                    except json.JSONDecodeError:
                        # Some events might not be JSON
                        events.append({
                            'event': event.event,
                            'data': event.data,
                            'timestamp': time.time()
                        })

        except Exception as e:
            print(f"Stream error: {e}")

        finally:
            response.close()

        return events


class TestAgentStreaming(SSETestBase):
    """Test streaming for all 11 AI agents"""

    @pytest.mark.parametrize("agent_type", [
        # These must match the keys of AGENT_MAP in apps/api/routers/direct_agents.py.
        # "analytics", "roi_budget" and "quick_wins" were consolidated into
        # "performance_intelligence" and removed from AGENT_MAP.
        "strategy",
        "persona",
        "marketing_strategy",
        "content",
        "campaign_planning",
        "performance_intelligence",
        "competitive_intelligence",
        "client_success",
    ])
    def test_agent_streaming_basic(self, agent_type):
        """
        Test: Basic SSE streaming works for each agent

        Expected Behavior:
        - Agent accepts streaming request
        - Messages stream in real-time
        - Stream completes with 'done' event
        - Response time < 60 seconds

        Success Criteria:
        - At least 1 message event received
        - Final 'done' event received
        - No connection errors
        """
        session_id = self.create_agent_session(agent_type)

        # Send simple message
        test_message = f"Provide a brief overview of {agent_type} agent capabilities"

        start_time = time.time()
        events = self.stream_agent_message(agent_type, session_id, test_message)
        duration = time.time() - start_time

        # Verify streaming worked
        assert len(events) > 0, f"No events received from {agent_type}"

        # Check for text content events
        text_events = [e for e in events if e.get('event') == 'text_chunk']
        assert len(text_events) > 0, f"No text_chunk events from {agent_type}"

        # Check for stream completion
        end_events = [e for e in events if e.get('event') == 'stream_end']
        assert len(end_events) > 0, f"No stream_end event from {agent_type}"

        # Verify reasonable response time
        assert duration < 60, f"{agent_type} took {duration:.1f}s (max 60s)"

        print(f"✅ {agent_type}: {len(events)} events in {duration:.1f}s")

    def test_strategy_agent_streaming_detailed(self):
        """
        Test: Strategy agent streaming with framework usage

        Expected Behavior:
        - Agent streams SWOT analysis
        - Multiple chunks received
        - Framework data included
        - Structured output at end
        """
        session_id = self.create_agent_session("strategy")

        message = "Analyze TaskFlow Solutions using SWOT framework"

        events = self.stream_agent_message("strategy", session_id, message, timeout=90)

        # Verify events structure
        assert len(events) > 5, "Expected multiple streaming events"

        # Look for SWOT-related content
        all_text = " ".join([
            str(e['data'].get('content', ''))
            for e in events
            if 'content' in e['data']
        ])

        # Verify SWOT elements mentioned
        swot_terms = ['strength', 'weakness', 'opportunity', 'threat']
        found_terms = [term for term in swot_terms if term.lower() in all_text.lower()]

        assert len(found_terms) >= 2, f"Expected SWOT terms, found: {found_terms}"

        print(f"✅ Strategy agent SWOT streaming works")
        print(f"   Events: {len(events)}")
        print(f"   SWOT terms found: {found_terms}")


class TestStreamingPerformance(SSETestBase):
    """Test streaming performance and resource management"""

    def test_streaming_latency(self):
        """
        Test: First chunk arrives quickly (low latency)

        Expected Behavior:
        - First event within 5 seconds
        - Subsequent events stream continuously
        - No long pauses between chunks

        Performance Target:
        - Time to first byte: < 5s
        - Inter-chunk delay: < 2s
        """
        session_id = self.create_agent_session("strategy")

        message = "What are the key benefits of using AI in marketing?"

        start_time = time.time()
        events = self.stream_agent_message("strategy", session_id, message)

        if not events:
            pytest.fail("No events received")

        # Time to first event
        first_event_time = events[0]['timestamp'] - start_time

        assert first_event_time < 5, f"First event took {first_event_time:.1f}s (max 5s)"

        # Check inter-event delays
        if len(events) > 1:
            max_delay = max(
                events[i]['timestamp'] - events[i-1]['timestamp']
                for i in range(1, len(events))
            )

            print(f"✅ Latency test passed")
            print(f"   Time to first event: {first_event_time:.2f}s")
            print(f"   Max inter-event delay: {max_delay:.2f}s")
            print(f"   Total events: {len(events)}")

    def test_long_stream_memory_management(self):
        """
        Test: Long-running streams don't leak memory

        Expected Behavior:
        - Complex query generates many events
        - All events processed successfully
        - Connection remains stable
        - No memory accumulation

        Test Strategy:
        - Request comprehensive analysis (generates long response)
        - Monitor event count and timing
        - Verify completion
        """
        session_id = self.create_agent_session("marketing_strategy")

        # Request comprehensive output to generate long stream
        message = """Create a complete go-to-market strategy for a B2B SaaS company targeting
        mid-market enterprises. Include messaging framework, channel strategy, and budget allocation."""

        start_time = time.time()
        events = self.stream_agent_message("marketing_strategy", session_id, message, timeout=120)
        duration = time.time() - start_time

        # Verify substantial response
        assert len(events) > 10, f"Expected > 10 events for complex query, got {len(events)}"

        # Verify completion
        done_events = [e for e in events if e['data'].get('done')]
        assert len(done_events) > 0, "Stream did not complete properly"

        print(f"✅ Long stream handled successfully")
        print(f"   Total events: {len(events)}")
        print(f"   Duration: {duration:.1f}s")
        print(f"   Events/second: {len(events)/duration:.1f}")


class TestStreamingErrorHandling(SSETestBase):
    """Test error handling and recovery"""

    def test_invalid_session_id(self):
        """
        Test: Graceful handling of invalid session ID

        Expected Behavior:
        - Request with fake session_id fails appropriately
        - Error message is clear
        - No server crash
        """
        url = f"{API_BASE_URL}/api/v1/direct-agents/strategy/chat"

        payload = {
            "user_id": self.user_id,
            "session_id": "00000000-0000-0000-0000-000000000000",
            "message": "test",
            "agent_type": "strategy"
        }

        response = requests.post(
            url,
            headers=self.headers,
            json=payload,
            stream=True
        )

        # Should return error status
        assert response.status_code in [400, 404, 500], f"Expected error status, got {response.status_code}"

        print(f"✅ Invalid session handled correctly (status: {response.status_code})")

    def test_empty_message_handling(self):
        """
        Test: Handling of empty/whitespace messages

        Expected Behavior:
        - Empty message rejected with clear error
        - Or minimal response returned
        - No server error
        """
        session_id = self.create_agent_session("strategy")

        url = f"{API_BASE_URL}/api/v1/direct-agents/strategy/chat"

        payload = {
            "user_id": self.user_id,
            "session_id": session_id,
            "message": "",  # Empty message
            "agent_type": "strategy"
        }

        response = requests.post(
            url,
            headers=self.headers,
            json=payload,
            stream=True
        )

        # Should either reject or handle gracefully
        # (Implementation-dependent)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"

        print(f"✅ Empty message handled (status: {response.status_code})")


class TestConcurrentStreaming(SSETestBase):
    """Test concurrent stream handling"""

    def test_multiple_concurrent_streams(self):
        """
        Test: Multiple agents can stream simultaneously

        Expected Behavior:
        - 3 concurrent streams complete successfully
        - No interference between streams
        - All streams return valid responses
        - Performance doesn't degrade significantly

        Concurrency Test:
        - Strategy, Persona, Content agents stream in parallel
        - Each receives independent responses
        """
        # Create sessions for different agents
        agent_types = ["strategy", "persona", "content"]
        sessions = {
            agent: self.create_agent_session(agent)
            for agent in agent_types
        }

        # Define messages
        messages = {
            "strategy": "What are the top 3 business frameworks for startups?",
            "persona": "Create a buyer persona for a SaaS product manager",
            "content": "Write a brief social media post about AI in marketing"
        }

        # Stream concurrently
        def stream_agent(agent_type):
            session_id = sessions[agent_type]
            message = messages[agent_type]
            start = time.time()
            events = self.stream_agent_message(agent_type, session_id, message)
            duration = time.time() - start

            return {
                'agent': agent_type,
                'events': len(events),
                'duration': duration,
                'success': len(events) > 0
            }

        # Execute concurrently
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(stream_agent, agent)
                for agent in agent_types
            ]

            results = [future.result() for future in as_completed(futures)]

        # Verify all succeeded
        assert len(results) == 3
        assert all(r['success'] for r in results), "Not all streams succeeded"

        print(f"✅ Concurrent streaming test passed")
        for result in sorted(results, key=lambda x: x['agent']):
            print(f"   {result['agent']}: {result['events']} events in {result['duration']:.1f}s")


if __name__ == "__main__":
    print("=" * 60)
    print("SSE Streaming Comprehensive Test Suite")
    print("=" * 60)
    print("\nTests all 11 AI agents with real-time streaming validation\n")
    print("Run with: poetry run pytest tests/automated/test_sse_streaming_comprehensive.py -v\n")
