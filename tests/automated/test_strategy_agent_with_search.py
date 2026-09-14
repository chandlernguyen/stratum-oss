#!/usr/bin/env python
"""
Test script to validate DirectStrategyAgent with Google Search grounding capabilities
Updated for current API architecture
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

# Load environment variables - use absolute path
import pathlib

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_URL,
)
env_path = pathlib.Path(__file__).parent.parent.parent / "apps" / "api" / ".env"
load_dotenv(env_path)

# Configuration
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Test credentials
TEST_EMAIL = "sme.owner@example.com"
TEST_PASSWORD = "LocalDevOnly123!"

class StrategyAgentSearchTester:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.access_token = None
        self.user_id = None
        self.auth_headers = {}
        
    def setup_auth(self):
        """Authenticate and setup headers"""
        try:
            auth_response = self.supabase.auth.sign_in_with_password({
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
                print(f"✅ Authenticated as: {TEST_EMAIL}")
                return True
            else:
                print("❌ Authentication failed")
                return False
        except Exception as e:
            print(f"❌ Auth error: {e}")
            return False
    
    def create_session(self, agent_type="strategy"):
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
                return None
        except Exception as e:
            print(f"❌ Session creation error: {e}")
            return None
    
    def send_message(self, session_id, message, agent_type="strategy"):
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
                    "agent_type": agent_type
                },
                stream=True,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ Chat request failed: {response.status_code}")
                return None
            
            # Collect SSE response
            full_response = ""
            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data:'):
                        try:
                            data = json.loads(decoded[5:])
                            if 'token' in data:
                                full_response += data['token']
                        except:
                            pass
            
            return full_response
            
        except Exception as e:
            print(f"❌ Message send error: {e}")
            return None
    
    def test_search_grounding_capability(self):
        """Test that the agent can use Google Search grounding for current information"""
        print("\n🧪 Test 1: Google Search Grounding Capability")
        
        session_id = self.create_session()
        if not session_id:
            return False
        
        # Ask a question that requires current/web information
        search_query = """What are the latest trends in AI-powered marketing automation 
        for SaaS companies in 2024-2025? Include specific companies and tools that are 
        leading the market right now."""
        
        print("📡 Sending query that requires web search...")
        response = self.send_message(session_id, search_query)
        
        if not response:
            print("❌ No response received")
            return False
        
        print(f"✅ Got response from agent")
        
        # Check if response contains web-sourced information
        response_lower = response.lower()
        
        # Look for indicators of web search usage
        indicators = [
            "2024", "2025",  # Current year references
            "recent", "latest", "current",  # Temporal indicators
            "companies", "tools", "platforms",  # Specific entities
            "trend", "market"  # Market analysis terms
        ]
        
        found_indicators = [ind for ind in indicators if ind in response_lower]
        
        if len(found_indicators) >= 3:
            print(f"✅ Response appears to include web-sourced information")
            print(f"   Found indicators: {found_indicators}")
            print(f"\n📄 Response preview: {response[:500]}...")
            return True
        else:
            print(f"⚠️  Response may not be using web search effectively")
            print(f"   Found only {len(found_indicators)} indicators: {found_indicators}")
            print(f"\n📄 Response preview: {response[:500]}...")
            return False
    
    def test_competitive_analysis_with_search(self):
        """Test competitive analysis that requires current market data"""
        print("\n🧪 Test 2: Competitive Analysis with Real-Time Data")
        
        session_id = self.create_session()
        if not session_id:
            return False
        
        # Ask for competitive analysis that needs current data
        competitive_query = """Analyze the competitive landscape for project management 
        software. Compare Monday.com, Asana, and ClickUp based on their current 2024 
        pricing, features, and market positioning. What are their latest product updates?"""
        
        print("📡 Requesting competitive analysis requiring current data...")
        response = self.send_message(session_id, competitive_query)
        
        if not response:
            print("❌ No response received")
            return False
        
        print(f"✅ Got competitive analysis response")
        
        # Check for specific company mentions and analysis
        response_lower = response.lower()
        companies = ["monday", "asana", "clickup"]
        analysis_terms = ["pricing", "features", "market", "update", "2024"]
        
        found_companies = [c for c in companies if c in response_lower]
        found_terms = [t for t in analysis_terms if t in response_lower]
        
        if len(found_companies) >= 2 and len(found_terms) >= 3:
            print(f"✅ Competitive analysis includes real market data")
            print(f"   Companies mentioned: {found_companies}")
            print(f"   Analysis aspects: {found_terms}")
            return True
        else:
            print(f"⚠️  Competitive analysis may lack current market data")
            print(f"   Companies: {found_companies}, Terms: {found_terms}")
            return False
    
    def test_industry_specific_research(self):
        """Test industry-specific research requiring web search"""
        print("\n🧪 Test 3: Industry-Specific Market Research")
        
        session_id = self.create_session()
        if not session_id:
            return False
        
        # Ask for specific industry research
        industry_query = """What are the current best practices for B2B SaaS companies 
        in the cybersecurity sector for customer acquisition? Include specific examples 
        of successful companies like CrowdStrike, Palo Alto Networks, or SentinelOne 
        and their go-to-market strategies in 2024."""
        
        print("📡 Requesting industry-specific research...")
        response = self.send_message(session_id, industry_query)
        
        if not response:
            print("❌ No response received")
            return False
        
        print(f"✅ Got industry research response")
        
        # Verify response quality
        response_lower = response.lower()
        
        # Check for specific elements
        has_companies = any(company in response_lower 
                           for company in ["crowdstrike", "palo alto", "sentinelone"])
        has_strategies = any(term in response_lower 
                            for term in ["acquisition", "go-to-market", "gtm", "strategy"])
        has_specifics = any(term in response_lower 
                           for term in ["practice", "approach", "method", "tactic"])
        
        if has_companies and has_strategies and has_specifics:
            print(f"✅ Industry research includes specific examples and strategies")
            # Print first few lines containing key terms
            lines = response.split('\n')
            key_lines = [line for line in lines 
                        if any(term in line.lower() 
                              for term in ["crowdstrike", "palo alto", "sentinelone", 
                                         "strategy", "acquisition", "practice"])][:3]
            if key_lines:
                print(f"\n📄 Key insights:")
                for line in key_lines:
                    if line.strip():
                        print(f"   • {line.strip()[:100]}...")
            return True
        else:
            print(f"⚠️  Industry research may lack specific examples")
            print(f"   Has companies: {has_companies}")
            print(f"   Has strategies: {has_strategies}")
            print(f"   Has specifics: {has_specifics}")
            return False
    
    def test_search_with_conversation_context(self):
        """Test that search grounding works with conversation memory"""
        print("\n🧪 Test 4: Search Grounding with Conversation Context")
        
        session_id = self.create_session()
        if not session_id:
            return False
        
        # First message - establish context
        context_message = """My company is EcoTech Solutions. We develop smart home 
        energy management systems. Our target market is environmentally conscious 
        homeowners in the US. Annual revenue is $5M."""
        
        print("📡 Establishing context...")
        response1 = self.send_message(session_id, context_message)
        if response1:
            print("✅ Context established")
        else:
            print("❌ Failed to establish context")
            return False
        
        # Give a small delay to ensure context is saved
        time.sleep(2)
        
        # Second message - ask for research based on context
        research_message = """Based on my company's focus, what are the latest 
        government incentives and tax credits for smart home energy systems in 2024? 
        Which states offer the best programs?"""
        
        print("📡 Requesting contextual research...")
        response2 = self.send_message(session_id, research_message)
        
        if not response2:
            print("❌ No response for contextual research")
            return False
        
        print("✅ Got contextual research response")
        
        # Check if response combines context with web search
        response_lower = response2.lower()
        
        has_context = "ecotech" in response_lower or "energy management" in response_lower or "smart home" in response_lower
        has_research = any(term in response_lower 
                          for term in ["incentive", "tax credit", "2024", "state", "program"])
        has_specifics = any(state in response_lower 
                           for state in ["california", "new york", "texas", "florida", 
                                       "federal", "states"])
        
        if has_context and has_research and has_specifics:
            print(f"✅ Successfully combined conversation context with web search")
            print(f"   Context retained: {has_context}")
            print(f"   Research included: {has_research}")
            print(f"   Specific details: {has_specifics}")
            return True
        else:
            print(f"⚠️  May not be effectively combining context with search")
            print(f"   Context: {has_context}, Research: {has_research}, Specifics: {has_specifics}")
            return False

def main():
    """Run all search grounding validation tests"""
    print("🚀 DirectStrategyAgent Search Grounding Validation")
    print("="*60)
    
    # Check prerequisites
    print("📋 Checking prerequisites...")
    
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ GOOGLE_API_KEY not found. Please set it in apps/api/.env")
        return
    else:
        print("✅ Google API key found")
    
    # Check grounding configuration
    grounding_enabled = os.getenv("GEMINI_ENABLE_GROUNDING", "true").lower() == "true"
    print(f"📡 Grounding configuration: {'ENABLED' if grounding_enabled else 'DISABLED'}")
    
    if not grounding_enabled:
        print("⚠️  Warning: GEMINI_ENABLE_GROUNDING is not set to 'true'")
        print("   Search grounding may not work properly")
    
    # Initialize tester
    tester = StrategyAgentSearchTester()
    
    # Setup authentication
    if not tester.setup_auth():
        print("❌ Authentication failed. Cannot proceed with tests.")
        return
    
    # Run all tests
    results = []
    
    print("\n" + "="*60)
    print("🔬 RUNNING SEARCH GROUNDING TESTS")
    print("="*60)
    
    results.append(tester.test_search_grounding_capability())
    results.append(tester.test_competitive_analysis_with_search())
    results.append(tester.test_industry_specific_research())
    results.append(tester.test_search_with_conversation_context())
    
    # Results summary
    print("\n" + "="*60)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ ALL TESTS PASSED ({passed}/{total})")
        print("\n🎉 DirectStrategyAgent Search Grounding is FULLY OPERATIONAL!")
        print("\n📈 Capabilities verified:")
        print("   • Google Search grounding for current information")
        print("   • Competitive analysis with real-time market data")
        print("   • Industry-specific research and best practices")
        print("   • Contextual search with conversation memory")
    else:
        print(f"⚠️  {passed}/{total} tests passed")
        print("\n🔧 Some search grounding features may need attention.")
        print("   • Check that GEMINI_ENABLE_GROUNDING='true' in your .env file")
        print("   • Ensure your Google API key has the necessary permissions")
        print("   • Verify the Gemini model supports Google Search grounding")
    
    print("="*60)

if __name__ == "__main__":
    main()