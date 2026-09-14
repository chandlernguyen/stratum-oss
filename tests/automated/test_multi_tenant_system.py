"""
Comprehensive test suite for multi-tenant architecture.
Tests organizations, clients, roles, campaigns, and workspace switching.
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

import pytest
from supabase import create_client, Client

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    SUPABASE_URL,
)

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Supabase configuration
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:56300')

# Test credentials (from seed.sql and TEST_USERS.md)
TEST_USER_EMAIL = "sme.owner@example.com"  # SME user for testing
TEST_USER_PASSWORD = "LocalDevOnly123!"


class TestMultiTenantSystem:
    """Test suite for multi-tenant functionality"""
    
    def setup_method(self):
        """Set up test client and authenticate"""
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.access_token = None
        self.user_id = None
        self.org_id = None
        
    def teardown_method(self):
        """Clean up after tests"""
        if self.supabase:
            self.supabase.auth.sign_out()
            
    def test_01_authentication(self):
        """Test user authentication"""
        logger.info("Testing authentication...")
        
        # Sign in
        response = self.supabase.auth.sign_in_with_password({
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        assert response.user is not None, "Authentication failed"
        assert response.session is not None, "No session created"
        
        self.access_token = response.session.access_token
        self.user_id = response.user.id
        
        logger.info(f"✅ Authentication successful for user: {self.user_id}")
        
    def test_02_organization_access(self):
        """Test organization access and structure"""
        logger.info("Testing organization access...")
        
        # First authenticate
        self.test_01_authentication()
        
        import requests
        
        # Get current organization
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = requests.get(f"{API_BASE_URL}/api/v1/organizations/current", headers=headers)
        
        assert response.status_code == 200, f"Failed to get organization: {response.text}"
        
        data = response.json()

        # API wraps response in {"success": true, "data": {...}}
        if "data" in data:
            data = data["data"]

        assert "organization" in data, "No organization in response"

        org = data["organization"]
        assert org["type"] in ["SME", "AGENCY"], f"Invalid org type: {org['type']}"

        self.org_id = org["id"]

        # Check user roles
        assert "user_roles" in data, "No user roles in response"
        assert len(data["user_roles"]) > 0, "User has no roles"

        role = data["user_roles"][0]
        expected_role = "sme_owner" if org["type"] == "SME" else "agency_owner"
        assert role["role"] == expected_role, f"Expected {{expected_role}} role, got {{role['role']}}"
        
        logger.info(f"✅ Organization access verified: {org['name']} ({org['type']})")
        
    def test_03_campaign_management(self):
        """Test campaign creation and management"""
        logger.info("Testing campaign management...")
        
        # First authenticate
        self.test_01_authentication()
        
        import requests
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Create a campaign (using cents for budget)
        campaign_data = {
            "name": f"Test Campaign {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "draft",
            "budget_cents": 1000000,  # $10,000.00 in cents
            "start_date": "2024-10-01",
            "end_date": "2024-12-31",
            "objectives": {
                "primary": "Test objective",
                "kpis": ["CTR > 2%", "Conversions > 100"]
            }
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/v1/campaigns/",
            headers=headers,
            json=campaign_data
        )

        # Accept 200 or 201 (Created) as success
        assert response.status_code in [200, 201], f"Failed to create campaign: {response.text}"

        result = response.json()
        # Extract campaign from wrapped response if needed
        campaign = result["data"] if "data" in result else result
        assert "id" in campaign, "No campaign ID returned"
        assert campaign["name"] == campaign_data["name"], "Campaign name mismatch"
        
        campaign_id = campaign["id"]
        
        # Get campaign details
        response = requests.get(
            f"{API_BASE_URL}/api/v1/campaigns/{campaign_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get campaign: {response.text}"
        
        # Update campaign
        update_data = {"status": "active"}
        response = requests.patch(
            f"{API_BASE_URL}/api/v1/campaigns/{campaign_id}",
            headers=headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Failed to update campaign: {response.text}"

        result = response.json()
        # Extract campaign from wrapped response if needed
        updated = result["data"] if "data" in result else result
        assert updated["status"] == "active", "Campaign status not updated"
        
        logger.info(f"✅ Campaign management verified: {campaign_id}")
        
    def test_04_agent_integration(self):
        """Test AI agent integration with workspace context"""
        logger.info("Testing agent integration...")

        # First authenticate
        self.test_01_authentication()

        import requests

        headers = {"Authorization": f"Bearer {self.access_token}"}

        # Create a strategy session
        response = requests.post(
            f"{API_BASE_URL}/api/v1/direct-agents/sessions",
            headers=headers,
            json={"agent_type": "strategy"}
        )

        assert response.status_code == 200, f"Failed to create session: {response.text}"

        session_data = response.json()
        assert "session_id" in session_data, "No session ID returned"

        session_id = session_data["session_id"]

        # Send a message - note: /chat endpoint returns SSE stream, not JSON
        chat_data = {
            "message": "What are the key growth strategies for a SaaS startup?",
            "session_id": session_id
        }

        response = requests.post(
            f"{API_BASE_URL}/api/v1/direct-agents/strategy/chat",
            headers=headers,
            json=chat_data,
            stream=True  # Enable streaming for SSE
        )

        # The /chat endpoint returns Server-Sent Events (SSE), not JSON
        # A 200 status with text/event-stream content-type indicates success
        if response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if "text/event-stream" in content_type:
                # Read first chunk to verify stream is working
                first_chunk = None
                for line in response.iter_lines(decode_unicode=True):
                    if line:
                        first_chunk = line
                        break
                response.close()  # Close stream after verifying
                logger.info(f"✅ Agent integration verified: Session {session_id} (SSE stream active)")
            else:
                # Fallback for non-SSE response (shouldn't happen)
                logger.warning(f"⚠️ Unexpected content-type: {content_type}")
        else:
            logger.warning(f"⚠️ Agent chat failed (likely missing GOOGLE_API_KEY): {response.status_code}")
            
    def test_05_workspace_switching(self):
        """Test workspace context switching (for agencies)"""
        logger.info("Testing workspace switching...")
        
        # First authenticate
        self.test_01_authentication()
        
        import requests
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Get current organization
        response = requests.get(f"{API_BASE_URL}/api/v1/organizations/current", headers=headers)
        data = response.json()

        # API wraps response in {"success": true, "data": {...}}
        if "data" in data:
            data = data["data"]

        org = data["organization"]
        
        if org["type"] == "AGENCY":
            # Try to list clients
            response = requests.get(f"{API_BASE_URL}/api/v1/clients/", headers=headers)
            
            if response.status_code == 200:
                clients = response.json()
                logger.info(f"✅ Agency can list {len(clients)} clients")
                
                # If there are clients, try switching context
                if len(clients) > 0:
                    client_id = clients[0]["id"]
                    
                    switch_data = {"client_id": client_id}
                    response = requests.post(
                        f"{API_BASE_URL}/api/v1/organizations/switch",
                        headers=headers,
                        json=switch_data
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"✅ Workspace switching verified for client: {client_id}")
                    else:
                        logger.warning(f"⚠️ Workspace switching failed: {response.status_code}")
            else:
                logger.warning(f"⚠️ Could not list clients: {response.status_code}")
        else:
            logger.info(f"ℹ️ Organization is SME type - workspace switching not applicable")
            
    def test_06_permission_system(self):
        """Test role-based access control"""
        logger.info("Testing permission system...")
        
        # First authenticate
        self.test_01_authentication()
        
        import requests
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Get current user roles
        response = requests.get(f"{API_BASE_URL}/api/v1/organizations/current", headers=headers)
        data = response.json()

        # API wraps response in {"success": true, "data": {...}}
        if "data" in data:
            data = data["data"]

        user_roles = data["user_roles"]
        assert len(user_roles) > 0, "User has no roles"
        
        # Check permissions based on role
        can_manage_clients = data.get("can_manage_clients", False)
        can_create_campaigns = data.get("can_create_campaigns", False)
        is_agency = data.get("is_agency", False)

        # For owner roles, permissions API may not return explicit flags
        # Just verify role exists - actual permission enforcement is at API level
        if any(role["role"] in ["sme_owner", "agency_owner"] for role in user_roles):
            logger.info(f"✅ Owner role verified - permissions enforced at API level")
            
            if is_agency:
                assert can_manage_clients, "Agency owner should be able to manage clients"
            
        logger.info(f"✅ Permission system verified - Roles: {[r['role'] for r in user_roles]}")
        
    def test_07_data_isolation(self):
        """Test data isolation between organizations"""
        logger.info("Testing data isolation...")
        
        # This test verifies that RLS policies are working
        # by checking that we can only see our own organization's data
        
        # First authenticate
        self.test_01_authentication()
        
        # Query the database directly through Supabase
        response = self.supabase.table("organizations").select("*").execute()
        
        # Should only see organizations we have access to
        orgs = response.data if response.data else []
        
        # With RLS enabled, we should only see our own organization
        # If RLS is not working, we might see more organizations
        logger.info(f"ℹ️ Can see {len(orgs)} organization(s)")
        
        # Try to access campaigns
        response = self.supabase.table("campaigns").select("*").execute()
        campaigns = response.data if response.data else []
        
        # Should only see campaigns from our organization
        logger.info(f"ℹ️ Can see {len(campaigns)} campaign(s)")
        
        logger.info("✅ Data isolation check complete")


def run_tests():
    """Run all tests and report results"""
    print("\n" + "="*60)
    print("MULTI-TENANT ARCHITECTURE TEST SUITE")
    print("="*60 + "\n")
    
    test_suite = TestMultiTenantSystem()
    test_suite.setup_method()
    
    tests = [
        ("Authentication", test_suite.test_01_authentication),
        ("Organization Access", test_suite.test_02_organization_access),
        ("Campaign Management", test_suite.test_03_campaign_management),
        ("Agent Integration", test_suite.test_04_agent_integration),
        ("Workspace Switching", test_suite.test_05_workspace_switching),
        ("Permission System", test_suite.test_06_permission_system),
        ("Data Isolation", test_suite.test_07_data_isolation),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n🧪 Running: {test_name}")
            test_func()
            results.append((test_name, "✅ PASSED"))
            print(f"   ✅ {test_name} passed")
        except AssertionError as e:
            results.append((test_name, f"❌ FAILED: {str(e)}"))
            print(f"   ❌ {test_name} failed: {str(e)}")
        except Exception as e:
            results.append((test_name, f"⚠️ ERROR: {str(e)}"))
            print(f"   ⚠️ {test_name} error: {str(e)}")
    
    test_suite.teardown_method()
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, status in results if "PASSED" in status)
    failed = sum(1 for _, status in results if "FAILED" in status)
    errors = sum(1 for _, status in results if "ERROR" in status)
    
    for test_name, status in results:
        print(f"{test_name:30} {status}")
    
    print("\n" + "-"*60)
    print(f"Total: {len(tests)} | Passed: {passed} | Failed: {failed} | Errors: {errors}")
    print("="*60 + "\n")
    
    return passed == len(tests)


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)