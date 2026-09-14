#!/usr/bin/env python
"""
Comprehensive test suite for DirectMarketingStrategyAgent
Tests strategy creation, budget optimization, channel planning, and cross-agent integration
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

class MarketingStrategyAgentTester:
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
                print(f"✅ Organization ID: {self.org_id}")
                return True
            else:
                print("❌ Authentication failed")
                return False
        except Exception as e:
            print(f"❌ Auth error: {e}")
            return False
    
    def setup_test_campaign(self):
        """Create a test campaign for the marketing strategy"""
        try:
            # Create a test campaign
            campaign_data = {
                'id': str(uuid.uuid4()),
                'org_id': self.org_id,  # Note: column is org_id, not organization_id
                'name': f'Test Campaign {datetime.now().strftime("%Y%m%d_%H%M%S")}',
                'status': 'active',
                'budget_cents': 500000,  # $5000 in cents
                'start_date': datetime.now().date().isoformat(),
                'objectives': {'goal': 'lead_generation', 'target': 100}
            }
            
            result = self.supabase_service.table('campaigns') \
                .insert(campaign_data) \
                .execute()
            
            if result.data:
                self.campaign_id = result.data[0]['id']
                print(f"✅ Created test campaign: {self.campaign_id}")
                return True
        except Exception as e:
            print(f"❌ Campaign creation error: {e}")
            return False
    
    def create_session(self, agent_type="marketing_strategy"):
        """Create a new agent session"""
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
    
    def send_message(self, session_id, message, agent_type="marketing_strategy"):
        """Send a message to the agent and get response"""
        try:
            # Send chat message via SSE endpoint
            response = requests.post(
                f"{API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat",
                headers=self.auth_headers,
                json={
                    "session_id": session_id,
                    "message": message,
                    "user_id": self.user_id,
                    "agent_type": agent_type,
                    "org_id": self.org_id,  # Some endpoints may use org_id
                    "campaign_id": self.campaign_id
                },
                stream=True,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ Chat request failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
            
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
                            # The SSE format uses 'token' not 'content'
                            if 'token' in data:
                                full_response += data['token']
                            elif 'content' in data:
                                full_response += data['content']
                        except json.JSONDecodeError:
                            continue
            
            return full_response
            
        except Exception as e:
            print(f"❌ Message send error: {e}")
            return None
    
    def test_budget_optimization(self, session_id):
        """Test 1: Budget optimization with 70-20-10 rule"""
        print("\n🧪 Test 1: Budget Optimization (70-20-10 Rule)")
        
        message = """
        I have a monthly marketing budget of $500. I'm a small business 
        selling handmade crafts online. My goal is to get my first customers. 
        Please provide a budget allocation using the 70-20-10 rule.
        """
        
        response = self.send_message(session_id, message)
        
        if response:
            print(f"  ✓ Got response (length: {len(response)} chars)")
            if len(response) > 200:
                print(f"  Preview: {response[:200]}...")
            # Check for key budget allocation terms
            checks = {
                "70-20-10 mentioned": "70" in response or "seventy" in response.lower(),
                "Owned media discussed": "owned" in response.lower(),
                "Earned media discussed": "earned" in response.lower(),
                "Paid media discussed": "paid" in response.lower(),
                "Budget amounts specified": "$" in response,
                "Zero-budget tactics": "zero" in response.lower() or "free" in response.lower()
            }
            
            passed = all(checks.values())
            self.test_results.append(("Budget Optimization", passed))
            
            for check, result in checks.items():
                print(f"  {'✅' if result else '❌'} {check}")
            
            return passed
        else:
            self.test_results.append(("Budget Optimization", False))
            return False
    
    def test_messaging_framework(self, session_id):
        """Test 2: Messaging framework creation"""
        print("\n🧪 Test 2: Messaging Framework Creation")
        
        message = """
        Create a messaging framework for my handmade crafts business. 
        My target customers are environmentally conscious millennials who 
        appreciate unique, sustainable products. My main advantages are 
        eco-friendly materials and custom designs.
        """
        
        response = self.send_message(session_id, message)
        
        if response:
            checks = {
                "Value proposition": "value" in response.lower() and "proposition" in response.lower(),
                "Key messages": "message" in response.lower(),
                "Differentiation": "differentiat" in response.lower() or "unique" in response.lower(),
                "Tone of voice": "tone" in response.lower() or "voice" in response.lower(),
                "Target audience mentioned": "millennial" in response.lower() or "sustainable" in response.lower()
            }
            
            passed = sum(checks.values()) >= 4  # At least 4 out of 5
            self.test_results.append(("Messaging Framework", passed))
            
            for check, result in checks.items():
                print(f"  {'✅' if result else '❌'} {check}")
            
            return passed
        else:
            self.test_results.append(("Messaging Framework", False))
            return False
    
    def test_channel_strategy(self, session_id):
        """Test 3: Channel strategy planning"""
        print("\n🧪 Test 3: Channel Strategy Planning")
        
        message = """
        What marketing channels should I use for my handmade crafts business? 
        I have $500/month budget and want to reach eco-conscious millennials. 
        Please recommend specific channels and explain why.
        """
        
        response = self.send_message(session_id, message)
        
        if response:
            # Check for various channel mentions
            channels_mentioned = {
                "Email": "email" in response.lower(),
                "Social media": "social" in response.lower() or "instagram" in response.lower() or "facebook" in response.lower(),
                "Blog/Content": "blog" in response.lower() or "content" in response.lower(),
                "SEO": "seo" in response.lower() or "search" in response.lower(),
                "Partnerships": "partner" in response.lower() or "collab" in response.lower()
            }
            
            channel_count = sum(channels_mentioned.values())
            passed = channel_count >= 3  # At least 3 channels mentioned
            
            self.test_results.append(("Channel Strategy", passed))
            
            print(f"  Channels mentioned ({channel_count}/5):")
            for channel, mentioned in channels_mentioned.items():
                if mentioned:
                    print(f"    ✅ {channel}")
            
            return passed
        else:
            self.test_results.append(("Channel Strategy", False))
            return False
    
    def test_zero_budget_tactics(self, session_id):
        """Test 4: Zero-budget marketing tactics"""
        print("\n🧪 Test 4: Zero-Budget Marketing Tactics")
        
        message = """
        I have no budget for marketing right now. What free marketing tactics 
        can I use to promote my handmade crafts business? I need specific, 
        actionable tactics that cost $0.
        """
        
        response = self.send_message(session_id, message)
        
        if response:
            tactics_mentioned = {
                "Social media organic": "organic" in response.lower() or "free social" in response.lower(),
                "Content creation": "content" in response.lower() or "blog" in response.lower(),
                "Community engagement": "community" in response.lower() or "group" in response.lower(),
                "Email marketing": "email" in response.lower(),
                "SEO": "seo" in response.lower(),
                "Partnerships": "partner" in response.lower() or "collab" in response.lower(),
                "Reddit/Forums": "reddit" in response.lower() or "forum" in response.lower()
            }
            
            tactics_count = sum(tactics_mentioned.values())
            passed = tactics_count >= 4  # At least 4 tactics mentioned
            
            self.test_results.append(("Zero-Budget Tactics", passed))
            
            print(f"  Free tactics mentioned ({tactics_count}/7):")
            for tactic, mentioned in tactics_mentioned.items():
                if mentioned:
                    print(f"    ✅ {tactic}")
            
            return passed
        else:
            self.test_results.append(("Zero-Budget Tactics", False))
            return False
    
    def test_database_persistence(self):
        """Test 5: Check if data was saved to database"""
        print("\n🧪 Test 5: Database Persistence")
        
        try:
            # Check marketing_strategies table
            strategies = self.supabase_service.table('marketing_strategies') \
                .select('*') \
                .eq('campaign_id', self.campaign_id) \
                .execute()
            
            has_strategy = len(strategies.data) > 0 if strategies.data else False
            
            # Check marketing_strategy_outputs table
            outputs = self.supabase_service.table('marketing_strategy_outputs') \
                .select('*') \
                .order('created_at', desc=True) \
                .limit(5) \
                .execute()
            
            has_outputs = len(outputs.data) > 0 if outputs.data else False
            
            checks = {
                "Strategy record created": has_strategy,
                "Output records created": has_outputs
            }
            
            if has_outputs and outputs.data:
                print(f"  Found {len(outputs.data)} output records")
                for output in outputs.data[:3]:
                    print(f"    - {output.get('output_type', 'unknown')}")
            
            passed = all(checks.values())
            self.test_results.append(("Database Persistence", passed))
            
            for check, result in checks.items():
                print(f"  {'✅' if result else '❌'} {check}")
            
            return passed
        except Exception as e:
            print(f"❌ Database check error: {e}")
            self.test_results.append(("Database Persistence", False))
            return False
    
    def test_cross_agent_integration(self, session_id):
        """Test 6: Cross-agent data sharing capabilities"""
        print("\n🧪 Test 6: Cross-Agent Integration")
        
        message = """
        I have existing customer personas for eco-conscious millennials. 
        Create a marketing strategy that specifically targets these personas 
        and prepares messaging that the Content Agent can use.
        """
        
        response = self.send_message(session_id, message)
        
        if response:
            checks = {
                "Persona reference": "persona" in response.lower(),
                "Content agent mention": "content" in response.lower(),
                "Cross-agent data": "agent" in response.lower() or "share" in response.lower(),
                "Database saving": "save" in response.lower() or "database" in response.lower()
            }
            
            passed = sum(checks.values()) >= 2  # At least 2 mentions
            self.test_results.append(("Cross-Agent Integration", passed))
            
            for check, result in checks.items():
                print(f"  {'✅' if result else '❌'} {check}")
            
            return passed
        else:
            self.test_results.append(("Cross-Agent Integration", False))
            return False
    
    def cleanup(self):
        """Clean up test data"""
        try:
            if self.campaign_id:
                # Delete test campaign
                self.supabase_service.table('campaigns') \
                    .delete() \
                    .eq('id', self.campaign_id) \
                    .execute()
                print(f"🧹 Cleaned up test campaign: {self.campaign_id}")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("🚀 MARKETING STRATEGY AGENT TEST SUITE")
        print("="*60)
        
        # Setup
        if not self.setup_auth():
            print("❌ Authentication failed. Exiting.")
            return False
        
        if not self.setup_test_campaign():
            print("❌ Campaign setup failed. Exiting.")
            return False
        
        # Create session
        session_id = self.create_session()
        if not session_id:
            print("❌ Session creation failed. Exiting.")
            return False
        
        # Run tests
        print("\n" + "-"*60)
        print("Running Tests...")
        print("-"*60)
        
        self.test_budget_optimization(session_id)
        time.sleep(2)  # Avoid rate limiting
        
        self.test_messaging_framework(session_id)
        time.sleep(2)
        
        self.test_channel_strategy(session_id)
        time.sleep(2)
        
        self.test_zero_budget_tactics(session_id)
        time.sleep(2)
        
        self.test_database_persistence()
        
        self.test_cross_agent_integration(session_id)
        
        # Results summary
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        
        passed_count = sum(1 for _, passed in self.test_results if passed)
        total_count = len(self.test_results)
        
        for test_name, passed in self.test_results:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{status}: {test_name}")
        
        print("-"*60)
        print(f"Overall: {passed_count}/{total_count} tests passed")
        
        if passed_count == total_count:
            print("🎉 ALL TESTS PASSED!")
        elif passed_count >= total_count * 0.8:
            print("✅ Most tests passed (80%+)")
        else:
            print("⚠️ Several tests failed - review needed")
        
        # Cleanup
        self.cleanup()
        
        return passed_count == total_count

def main():
    """Main test runner"""
    tester = MarketingStrategyAgentTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        tester.cleanup()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        tester.cleanup()
        sys.exit(1)

if __name__ == "__main__":
    main()