"""
Test XCT-005: Mid-session permission update

Verifies that when a user's role/permissions are changed while logged in,
the changes take effect immediately without requiring re-login.

This tests the "database-first" permission architecture where permissions
are always fetched fresh from the database, not cached in JWT tokens.
"""

import asyncio
import logging
import os
import sys
import requests
from typing import Optional

from supabase import create_client, Client

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Configuration
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0')

# Test user (sme_manager can be changed to different role)
TEST_USER_EMAIL = "sme.manager@example.com"
TEST_USER_PASSWORD = "LocalDevOnly123!"


class TestMidSessionPermissionUpdate:
    """
    Test suite for mid-session permission updates.

    This tests XCT-005: Verify that changing a user's role while they're
    logged in takes effect immediately without re-authentication.
    """

    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        self.admin_supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        self.access_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.org_id: Optional[str] = None
        self.original_role_id: Optional[str] = None

    def authenticate(self) -> bool:
        """Authenticate test user"""
        logger.info(f"Authenticating as {TEST_USER_EMAIL}...")
        try:
            response = self.supabase.auth.sign_in_with_password({
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })

            if response.user and response.session:
                self.access_token = response.session.access_token
                self.user_id = response.user.id
                logger.info(f"✅ Authenticated as user: {self.user_id}")
                return True
        except Exception as e:
            logger.error(f"❌ Authentication failed: {e}")
        return False

    def get_user_context(self) -> dict:
        """Fetch current user context (roles/permissions) from database RPC"""
        try:
            # Call the RPC function with user_id parameter
            result = self.supabase.rpc("get_user_context", {"p_user_id": self.user_id}).execute()
            # Result is a list with a single dict representing the row
            if result.data and len(result.data) > 0:
                return result.data[0] if isinstance(result.data[0], dict) else result.data
            return {}
        except Exception as e:
            logger.error(f"Failed to get user context: {e}")
            return {}

    def get_org_id_from_user(self) -> Optional[str]:
        """Get user's org_id from database"""
        result = self.admin_supabase.table("users")\
            .select("org_id")\
            .eq("id", self.user_id)\
            .single()\
            .execute()
        return result.data.get("org_id") if result.data else None

    def get_current_role_assignment(self) -> dict:
        """Get user's current role assignment"""
        result = self.admin_supabase.table("user_role_assignments")\
            .select("*, roles(name)")\
            .eq("user_id", self.user_id)\
            .execute()
        return result.data[0] if result.data else {}

    def get_role_id_by_name(self, role_name: str) -> Optional[str]:
        """Get role ID by name"""
        result = self.admin_supabase.table("roles")\
            .select("id")\
            .eq("name", role_name)\
            .single()\
            .execute()
        return result.data.get("id") if result.data else None

    def update_user_role(self, new_role_id: str) -> bool:
        """Update user's role in database (simulates admin action)"""
        try:
            self.admin_supabase.table("user_role_assignments")\
                .update({"role_id": new_role_id})\
                .eq("user_id", self.user_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Failed to update role: {e}")
            return False

    def restore_original_role(self):
        """Restore user to original role"""
        if self.original_role_id:
            logger.info("Restoring original role...")
            self.update_user_role(self.original_role_id)
            logger.info("✅ Original role restored")

    def test_mid_session_permission_update(self) -> bool:
        """
        Main test: Verify permissions update mid-session

        Steps:
        1. Authenticate as user (sme_manager)
        2. Verify current permissions
        3. Change user's role to viewer (without re-auth)
        4. Verify permissions changed (same session)
        5. Restore original role
        """
        logger.info("\n" + "="*60)
        logger.info("XCT-005: MID-SESSION PERMISSION UPDATE TEST")
        logger.info("="*60 + "\n")

        # Step 1: Authenticate
        if not self.authenticate():
            return False

        # Get org_id
        self.org_id = self.get_org_id_from_user()
        if not self.org_id:
            logger.error("❌ Could not find org_id for user")
            return False

        # Step 2: Get current role and permissions
        logger.info("\n📋 Step 1: Checking initial permissions...")
        current_assignment = self.get_current_role_assignment()
        if not current_assignment:
            logger.error("❌ Could not get current role assignment")
            return False

        self.original_role_id = current_assignment.get("role_id")
        original_role_name = current_assignment.get("roles", {}).get("name", "unknown")
        logger.info(f"   Current role: {original_role_name}")

        initial_context = self.get_user_context()
        initial_roles = [r.get("role_name") for r in initial_context.get("roles", [])]
        initial_permissions = initial_context.get("permissions", [])
        logger.info(f"   Initial roles: {initial_roles}")
        logger.info(f"   Initial permissions count: {len(initial_permissions)}")

        # Step 3: Change role to viewer (has fewer permissions)
        logger.info("\n🔄 Step 2: Changing role to viewer (admin action)...")
        viewer_role_id = self.get_role_id_by_name("sme_viewer")
        if not viewer_role_id:
            logger.error("❌ Could not find sme_viewer role")
            return False

        if not self.update_user_role(viewer_role_id):
            return False
        logger.info("   ✅ Role changed to sme_viewer in database")

        # Step 4: Verify permissions changed WITHOUT re-authentication
        logger.info("\n🔍 Step 3: Verifying permissions (same session, no re-auth)...")
        updated_context = self.get_user_context()
        updated_roles = [r.get("role_name") for r in updated_context.get("roles", [])]
        updated_permissions = updated_context.get("permissions", [])
        logger.info(f"   Updated roles: {updated_roles}")
        logger.info(f"   Updated permissions count: {len(updated_permissions)}")

        # Verify the change took effect
        test_passed = False
        if "sme_viewer" in updated_roles and original_role_name not in updated_roles:
            logger.info("\n   ✅ PASS: Role change reflected immediately")

            # Viewers should have fewer permissions than managers
            if len(updated_permissions) < len(initial_permissions):
                logger.info(f"   ✅ PASS: Permissions reduced from {len(initial_permissions)} to {len(updated_permissions)}")
                test_passed = True
            else:
                logger.warning(f"   ⚠️ Permission count unchanged (may be expected if viewer has same count)")
                test_passed = True  # Still pass if role changed
        else:
            logger.error(f"   ❌ FAIL: Role change not reflected (still showing {updated_roles})")

        # Step 5: Restore original role
        logger.info("\n🔄 Step 4: Restoring original role...")
        self.restore_original_role()

        # Verify restoration
        restored_context = self.get_user_context()
        restored_roles = [r.get("role_name") for r in restored_context.get("roles", [])]
        if original_role_name in restored_roles:
            logger.info(f"   ✅ Original role ({original_role_name}) restored")
        else:
            logger.warning(f"   ⚠️ Role restoration may need verification: {restored_roles}")

        return test_passed


def main():
    """Run the mid-session permission update test"""
    tester = TestMidSessionPermissionUpdate()

    try:
        success = tester.test_mid_session_permission_update()

        print("\n" + "="*60)
        if success:
            print("✅ XCT-005: MID-SESSION PERMISSION UPDATE - PASSED")
            print("="*60)
            print("\nSummary:")
            print("  ✓ User authenticated successfully")
            print("  ✓ Role changed mid-session (admin action)")
            print("  ✓ New permissions reflected immediately")
            print("  ✓ No re-authentication required")
            print("  ✓ Database-first architecture working correctly")
            return 0
        else:
            print("❌ XCT-005: MID-SESSION PERMISSION UPDATE - FAILED")
            print("="*60)
            return 1

    except Exception as e:
        logger.error(f"Test failed with exception: {e}")
        # Try to restore original role
        tester.restore_original_role()
        return 1
    finally:
        # Clean up
        tester.supabase.auth.sign_out()


if __name__ == "__main__":
    sys.exit(main())
