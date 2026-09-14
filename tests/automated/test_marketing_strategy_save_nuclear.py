#!/usr/bin/env python
"""
Integration test for Marketing Strategy Agent save function (Nuclear Migration)
Tests that the save_marketing_strategy function properly saves to agent_outputs table
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

class MarketingStrategySaveTest:
    def __init__(self):
        # Use service role client for database operations
        self.supabase_service: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        # Use anon client for auth
        self.supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.access_token = None
        self.user_id = None
        self.org_id = None
        self.auth_headers = {}
        self.session_id = None

    def setup_auth(self):
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

                # Get user's organization (use first if multiple)
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

    def create_session(self):
        """Create a new agent session"""
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/sessions",
                headers=self.auth_headers,
                json={"agent_type": "marketing_strategy"}
            )

            if response.status_code == 200:
                self.session_id = response.json()["session_id"]
                print(f"✅ Created session: {self.session_id}")
                return True
            else:
                print(f"❌ Failed to create session: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Session creation error: {e}")
            return False

    def send_strategy_request(self):
        """Send a message requesting strategy creation AND save"""
        try:
            message = """
            I need you to create AND SAVE a marketing strategy for my business.

            Business details:
            - Product: Eco-friendly yoga mats made from recycled ocean plastic
            - Target audience: Health-conscious millennials
            - Budget: $2000/month
            - Goal: Launch in 3 months with 100 initial customers

            Step 1: Create messaging framework, channel strategy, and content pillars.
            Step 2: CALL THE save_marketing_strategy FUNCTION to save everything to the database.

            This is critical - I need the strategy saved so I can access it later.
            """

            print(f"\n📤 Sending strategy request...")

            # Send chat message via SSE endpoint
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/marketing_strategy/chat",
                headers=self.auth_headers,
                json={
                    "session_id": self.session_id,
                    "message": message,
                    "user_id": self.user_id,
                    "agent_type": "marketing_strategy",
                    "org_id": self.org_id
                },
                stream=True,
                timeout=60  # Longer timeout for strategy generation
            )

            if response.status_code != 200:
                print(f"❌ Chat request failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None

            # Collect SSE responses
            full_response = ""
            function_calls = []

            print("📥 Receiving response...")
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        if data_str == '[DONE]':
                            break
                        try:
                            data = json.loads(data_str)
                            # Collect content tokens
                            if 'token' in data:
                                full_response += data['token']
                            elif 'content' in data:
                                full_response += data['content']

                            # Track function calls
                            if 'function_call' in data:
                                function_calls.append(data['function_call'])
                        except json.JSONDecodeError:
                            continue

            print(f"✅ Got response (length: {len(full_response)} chars)")
            if function_calls:
                print(f"✅ Function calls detected: {len(function_calls)}")
                for call in function_calls:
                    print(f"   - {call.get('name', 'unknown')}")

            return {
                "response": full_response,
                "function_calls": function_calls
            }

        except Exception as e:
            print(f"❌ Message send error: {e}")
            return None

    def verify_database_save(self):
        """Verify that strategy was saved to agent_outputs table"""
        print(f"\n🔍 Checking database for saved strategy...")

        try:
            # Wait a bit for database writes to complete
            time.sleep(2)

            # Query agent_outputs table (SME user should use public schema)
            result = self.supabase_service.table('agent_outputs') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('agent_type', 'marketing_strategy') \
                .order('created_at', desc=True) \
                .limit(5) \
                .execute()

            if not result.data or len(result.data) == 0:
                print("❌ No records found in agent_outputs table")
                print(f"   Searched for: org_id={self.org_id}, agent_type='marketing_strategy'")

                # Debug: Check if there are ANY records for this org
                all_outputs = self.supabase_service.table('agent_outputs') \
                    .select('agent_type, created_at') \
                    .eq('org_id', self.org_id) \
                    .order('created_at', desc=True) \
                    .limit(10) \
                    .execute()

                if all_outputs.data:
                    print(f"   Found {len(all_outputs.data)} total agent_outputs for this org:")
                    for output in all_outputs.data:
                        print(f"     - {output['agent_type']} at {output['created_at']}")
                else:
                    print("   No agent_outputs found for this org at all")

                return False

            print(f"✅ Found {len(result.data)} record(s) in agent_outputs")

            # Examine the most recent record
            latest = result.data[0]
            print(f"\n📊 Latest Strategy Record:")
            print(f"   ID: {latest['id']}")
            print(f"   Agent Type: {latest['agent_type']}")
            print(f"   Created: {latest['created_at']}")
            print(f"   Session ID: {latest.get('session_id', 'N/A')}")

            # Validate JSONB content structure
            content = latest.get('content', {})
            if not isinstance(content, dict):
                print("❌ Content is not a valid JSONB object")
                return False

            print(f"\n📋 Content Structure:")
            required_fields = [
                'strategy_title',
                'positioning_statement',
                'target_audience',
                'key_messages',
                'recommended_channels'
            ]

            checks = {}
            for field in required_fields:
                has_field = field in content
                checks[field] = has_field
                status = "✅" if has_field else "❌"
                value_preview = str(content.get(field, ''))[:50] if has_field else "MISSING"
                print(f"   {status} {field}: {value_preview}...")

            # Overall validation
            passed_checks = sum(checks.values())
            total_checks = len(checks)

            if passed_checks == total_checks:
                print(f"\n✅ All {total_checks} required fields present")
                return True
            else:
                print(f"\n⚠️ Only {passed_checks}/{total_checks} required fields present")
                return False

        except Exception as e:
            print(f"❌ Database verification error: {e}")
            import traceback
            traceback.print_exc()
            return False

    def verify_ai_insights_save(self):
        """Verify that AI insights were saved to ai_insights table"""
        print(f"\n🔍 Checking ai_insights table...")

        try:
            result = self.supabase_service.table('ai_insights') \
                .select('*') \
                .eq('org_id', self.org_id) \
                .eq('insight_type', 'marketing_strategy') \
                .order('created_at', desc=True) \
                .limit(3) \
                .execute()

            if result.data and len(result.data) > 0:
                print(f"✅ Found {len(result.data)} AI insight(s)")
                latest = result.data[0]
                print(f"   Latest insight: {latest.get('summary', '')[:80]}...")
                return True
            else:
                print("⚠️ No AI insights found (optional feature)")
                return True  # This is optional, not a failure

        except Exception as e:
            print(f"⚠️ AI insights check error: {e}")
            return True  # This is optional, not a failure

    def run_test(self):
        """Run the complete test"""
        print("\n" + "="*70)
        print("🧪 MARKETING STRATEGY SAVE FUNCTION TEST (NUCLEAR MIGRATION)")
        print("="*70)

        # Setup
        if not self.setup_auth():
            print("\n❌ TEST FAILED: Authentication failed")
            return False

        # Create session
        if not self.create_session():
            print("\n❌ TEST FAILED: Session creation failed")
            return False

        # Send strategy request
        result = self.send_strategy_request()
        if not result:
            print("\n❌ TEST FAILED: Strategy request failed")
            return False

        # Check if save function was mentioned in response
        response_text = result['response'].lower()
        save_mentioned = any(word in response_text for word in ['saved', 'database', 'stored'])

        if save_mentioned:
            print("✅ Response mentions saving to database")
        else:
            print("⚠️ Response doesn't clearly mention saving (agent may have failed to call save function)")

        # Verify database save
        db_save_success = self.verify_database_save()

        # Verify AI insights (optional)
        self.verify_ai_insights_save()

        # Final result
        print("\n" + "="*70)
        print("📊 TEST RESULTS")
        print("="*70)

        if db_save_success:
            print("✅ TEST PASSED: Strategy successfully saved to agent_outputs table")
            print("✅ Nuclear migration pattern working correctly")
            print("✅ JSONB content structure validated")
            return True
        else:
            print("❌ TEST FAILED: Strategy was not saved to database")
            print("❌ The save_marketing_strategy function was not called or failed")

            # Provide debugging hints
            print("\n🔧 Debugging hints:")
            print("   1. Check backend logs for function call traces")
            print("   2. Verify save_marketing_strategy is properly registered as a tool")
            print("   3. Confirm indentation is correct (inner function, not class method)")
            print("   4. Check that agent actually enters tool execution loop")

            return False

def main():
    """Main test runner"""
    tester = MarketingStrategySaveTest()

    try:
        success = tester.run_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
