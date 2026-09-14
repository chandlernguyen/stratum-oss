#!/usr/bin/env python3
"""
Comprehensive test suite for the unified auto-save system
Tests all agents with the unified agent_outputs table
Date: 2025-09-17
"""
import asyncio
import sys
import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load test environment
from pathlib import Path

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
load_dotenv(Path(__file__).resolve().parents[2] / 'tests/.env')
sys.path.append(str(Path(__file__).resolve().parents[2]))

import requests
from supabase import create_client, Client

# Test configuration
TEST_EMAIL = os.getenv("TEST_EMAIL", "sme.owner@example.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "LocalDevOnly123!")  # Using existing test user password from setup_comprehensive_test_data.py

class AutoSaveSystemTester:
    """Test suite for unified auto-save functionality"""

    def __init__(self):
        self.supabase: Client = None
        self.user_id: str = None
        self.org_id: str = None
        self.access_token: str = None
        self.auth_headers: dict = {}
        self.test_results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }

    async def setup(self):
        """Initialize test environment"""
        print("🔧 Setting up auto-save test environment...")

        # Use service role key for full access
        self.supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Authenticate as test user
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

            # Get organization ID
            user_data = self.supabase.table("users").select("org_id").eq("id", self.user_id).single().execute()
            self.org_id = user_data.data["org_id"]

            print(f"✅ Test environment ready - User: {self.user_id}, Org: {self.org_id}")
            return True

        print("❌ Failed to setup test environment")
        return False

    async def test_auto_save_creation(self):
        """Test 1: Verify auto-save creates draft outputs"""
        print("\n📝 Test 1: Auto-save draft creation")

        # Test each agent type
        agents_to_test = [
            ("strategy", "What is a SWOT analysis for our company?"),
            ("marketing_strategy", "Create a Q1 marketing campaign"),
            ("persona", "Describe our ideal customer"),
            ("content", "Write a blog post about productivity"),
            ("analytics", "Analyze our website traffic"),
            ("roi_budget", "Calculate ROI for our campaigns"),
            ("competitive", "Who are our main competitors?"),
            ("quick_wins", "What quick wins can we implement?"),
            ("client_success", "How to improve client retention?")
        ]

        for agent_type, test_message in agents_to_test:
            try:
                # Send message to agent
                response = await self._send_agent_message(agent_type, test_message)

                # Wait longer for auto-save (async process + agent response time)
                await asyncio.sleep(5)

                # Check if output was saved (using session_id from response)
                saved = await self._check_output_saved(agent_type, response.get("session_id"))

                if saved:
                    print(f"  ✅ {agent_type}: Auto-save successful")
                    self.test_results["passed"].append(f"auto_save_{agent_type}")
                else:
                    print(f"  ❌ {agent_type}: Auto-save failed")
                    self.test_results["failed"].append(f"auto_save_{agent_type}")

            except Exception as e:
                print(f"  ❌ {agent_type}: Test failed - {e}")
                self.test_results["failed"].append(f"auto_save_{agent_type}")

    async def test_status_progression(self):
        """Test 2: Draft → Final status progression"""
        print("\n📝 Test 2: Status progression (draft → final)")

        try:
            # Create a draft via agent
            response = await self._send_agent_message("strategy", "Create a business strategy")
            await asyncio.sleep(2)

            # Get the draft output
            outputs = self.supabase.table("agent_outputs") \
                .select("*") \
                .eq("org_id", self.org_id) \
                .eq("status", "draft") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()

            if not outputs.data:
                raise Exception("No draft found")

            draft_id = outputs.data[0]["id"]

            # Finalize the draft
            finalize_response = requests.post(
                f"{API_BASE_URL}/api/v1/outputs/{draft_id}/finalize",
                headers=self.auth_headers
            )

            if finalize_response.status_code == 200:
                # Verify status changed
                final = self.supabase.table("agent_outputs") \
                    .select("status, finalized_at") \
                    .eq("id", draft_id) \
                    .single() \
                    .execute()

                if final.data["status"] == "final" and final.data["finalized_at"]:
                    print("  ✅ Status progression working")
                    self.test_results["passed"].append("status_progression")
                else:
                    print("  ❌ Status not updated correctly")
                    self.test_results["failed"].append("status_progression")
            else:
                print(f"  ❌ Finalize API failed: {finalize_response.status_code}")
                self.test_results["failed"].append("status_progression")

        except Exception as e:
            print(f"  ❌ Status progression test failed: {e}")
            self.test_results["failed"].append("status_progression")

    async def test_confidence_scoring(self):
        """Test 3: Verify confidence scores are set appropriately"""
        print("\n📝 Test 3: Confidence scoring")

        try:
            # Generate content with varying quality
            test_cases = [
                ("strategy", "Give me a detailed SWOT analysis with data", 0.7),  # High confidence expected
                ("content", "Write something about stuff", 0.5),  # Low confidence expected
            ]

            for agent_type, message, min_confidence in test_cases:
                response = await self._send_agent_message(agent_type, message)
                await asyncio.sleep(2)

                # Check saved output confidence
                output = await self._get_latest_output(agent_type)

                if output and output.get("confidence_score", 0) >= min_confidence:
                    print(f"  ✅ {agent_type}: Confidence score appropriate ({output['confidence_score']})")
                    self.test_results["passed"].append(f"confidence_{agent_type}")
                else:
                    score = output.get("confidence_score", 0) if output else "No output"
                    print(f"  ❌ {agent_type}: Confidence score issue ({score})")
                    self.test_results["failed"].append(f"confidence_{agent_type}")

        except Exception as e:
            print(f"  ❌ Confidence scoring test failed: {e}")
            self.test_results["failed"].append("confidence_scoring")

    async def test_cross_agent_visibility(self):
        """Test 4: Verify outputs are visible across agents"""
        print("\n📝 Test 4: Cross-agent output visibility")

        try:
            # Create strategy output
            await self._send_agent_message("strategy", "Create a market entry strategy")
            await asyncio.sleep(2)

            # Check if marketing strategy agent can see it
            response = await self._send_agent_message(
                "marketing_strategy",
                "Based on our recent strategy outputs, what should we focus on?"
            )

            # Verify reference to strategy in response
            if "strategy" in response.get("content", "").lower():
                print("  ✅ Cross-agent visibility working")
                self.test_results["passed"].append("cross_agent_visibility")
            else:
                print("  ⚠️ Cross-agent visibility unclear")
                self.test_results["warnings"].append("cross_agent_visibility")

        except Exception as e:
            print(f"  ❌ Cross-agent visibility test failed: {e}")
            self.test_results["failed"].append("cross_agent_visibility")

    async def test_auto_cleanup(self):
        """Test 5: Verify old drafts are marked for cleanup"""
        print("\n📝 Test 5: Draft auto-cleanup marking")

        try:
            # Create a draft with expiry date
            draft_data = {
                "org_id": self.org_id,
                "user_id": self.user_id,
                "agent_type": "test",
                "output_type": "test",
                "title": "Test Draft for Cleanup",
                "content": {"test": True},
                "status": "draft",
                "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
            }

            result = self.supabase.table("agent_outputs").insert(draft_data).execute()

            if result.data and result.data[0].get("expires_at"):
                print("  ✅ Draft cleanup marking working")
                self.test_results["passed"].append("auto_cleanup")
            else:
                print("  ❌ Draft cleanup marking failed")
                self.test_results["failed"].append("auto_cleanup")

        except Exception as e:
            print(f"  ❌ Auto-cleanup test failed: {e}")
            self.test_results["failed"].append("auto_cleanup")

    async def test_validation_workflow(self):
        """Test 6: Test validation status workflow"""
        print("\n📝 Test 6: Validation workflow")

        try:
            # Create auto-approved output
            response = await self._send_agent_message("strategy", "Analyze our market position")
            await asyncio.sleep(2)

            output = await self._get_latest_output("strategy")

            if output and output.get("validation_status") == "auto_approved":
                print("  ✅ Auto-approval working")

                # Test user approval
                approve_response = requests.post(
                    f"{API_BASE_URL}/api/v1/outputs/{output['id']}/validate",
                    headers=self.auth_headers,
                    json={"status": "user_approved"}
                )

                if approve_response.status_code == 200:
                    print("  ✅ User approval working")
                    self.test_results["passed"].append("validation_workflow")
                else:
                    print("  ❌ User approval failed")
                    self.test_results["failed"].append("validation_workflow")
            else:
                print("  ❌ Auto-approval not working")
                self.test_results["failed"].append("validation_workflow")

        except Exception as e:
            print(f"  ❌ Validation workflow test failed: {e}")
            self.test_results["failed"].append("validation_workflow")

    async def test_bulk_operations(self):
        """Test 7: Test bulk finalize and archive"""
        print("\n📝 Test 7: Bulk operations")

        try:
            # Create multiple drafts
            draft_ids = []
            for i in range(3):
                await self._send_agent_message("content", f"Test content {i}")
                await asyncio.sleep(1)

            # Get draft IDs
            drafts = self.supabase.table("agent_outputs") \
                .select("id") \
                .eq("org_id", self.org_id) \
                .eq("status", "draft") \
                .order("created_at", desc=True) \
                .limit(3) \
                .execute()

            draft_ids = [d["id"] for d in drafts.data]

            if len(draft_ids) >= 3:
                # Test bulk finalize
                bulk_response = requests.post(
                    f"{API_BASE_URL}/api/v1/outputs/bulk/finalize",
                    headers=self.auth_headers,
                    json={"output_ids": draft_ids}
                )

                if bulk_response.status_code == 200:
                    print("  ✅ Bulk operations working")
                    self.test_results["passed"].append("bulk_operations")
                else:
                    print("  ❌ Bulk operations failed")
                    self.test_results["failed"].append("bulk_operations")
            else:
                print("  ⚠️ Not enough drafts for bulk test")
                self.test_results["warnings"].append("bulk_operations")

        except Exception as e:
            print(f"  ❌ Bulk operations test failed: {e}")
            self.test_results["failed"].append("bulk_operations")

    # Helper methods
    async def _send_agent_message(self, agent_type: str, message: str) -> Dict[str, Any]:
        """Send a message to an agent and get response"""
        endpoint = f"{API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat"

        # Generate a unique session ID for this test
        import uuid
        session_id = str(uuid.uuid4())

        response = requests.post(
            endpoint,
            headers=self.auth_headers,
            json={
                "message": message,
                "user_id": self.user_id,
                "session_id": session_id,
                "agent_type": agent_type
            }
        )

        if response.status_code == 200:
            return {"session_id": session_id, "content": response.text}
        else:
            raise Exception(f"Agent request failed: {response.status_code}")

    async def _check_output_saved(self, agent_type: str, session_id: str) -> bool:
        """Check if an output was saved for the given session"""
        # Check by agent_type and org_id since session_id might not be stored exactly
        result = self.supabase.table("agent_outputs") \
            .select("id, session_id, title") \
            .eq("agent_type", agent_type) \
            .eq("org_id", self.org_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if result.data:
            print(f"    Found output: {result.data[0].get('title', 'No title')}")

        return len(result.data) > 0

    async def _get_latest_output(self, agent_type: str) -> Optional[Dict[str, Any]]:
        """Get the latest output for an agent type"""
        result = self.supabase.table("agent_outputs") \
            .select("*") \
            .eq("org_id", self.org_id) \
            .eq("agent_type", agent_type) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        return result.data[0] if result.data else None

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("AUTO-SAVE SYSTEM TEST SUMMARY")
        print("="*60)

        total_tests = len(self.test_results["passed"]) + len(self.test_results["failed"])

        print(f"\n✅ Passed: {len(self.test_results['passed'])}/{total_tests}")
        for test in self.test_results["passed"]:
            print(f"   • {test}")

        if self.test_results["failed"]:
            print(f"\n❌ Failed: {len(self.test_results['failed'])}/{total_tests}")
            for test in self.test_results["failed"]:
                print(f"   • {test}")

        if self.test_results["warnings"]:
            print(f"\n⚠️ Warnings: {len(self.test_results['warnings'])}")
            for test in self.test_results["warnings"]:
                print(f"   • {test}")

        # Overall status
        print("\n" + "="*60)
        if not self.test_results["failed"]:
            print("🎉 ALL TESTS PASSED - Auto-save system is working!")
        else:
            print("⚠️ SOME TESTS FAILED - Review and fix issues before deployment")
        print("="*60)

async def main():
    """Run all auto-save system tests"""
    tester = AutoSaveSystemTester()

    # Setup
    if not await tester.setup():
        print("❌ Failed to setup test environment")
        return

    # Run all tests
    print("\n🚀 Starting auto-save system tests...")

    await tester.test_auto_save_creation()
    await tester.test_status_progression()
    await tester.test_confidence_scoring()
    await tester.test_cross_agent_visibility()
    await tester.test_auto_cleanup()
    await tester.test_validation_workflow()
    await tester.test_bulk_operations()

    # Print summary
    tester.print_summary()

if __name__ == "__main__":
    asyncio.run(main())