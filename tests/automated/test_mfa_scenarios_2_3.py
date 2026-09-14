"""
Test MFA Scenarios 2 & 3 - AAL1 and AAL2 with MFA Enrolled

Scenario 2: AAL1 with MFA enrolled (should FAIL with 403)
Scenario 3: AAL2 with MFA enrolled (should PASS with 200)
"""

import os
import sys
import requests
import json

# Shared test configuration: ports, URLs and credentials live in
# test_config.py so they cannot drift from supabase/config.toml.
from test_config import (
    API_BASE_URL,
    SUPABASE_URL,
)

# Configuration
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0")

TEST_USER = {
    "email": "sme.owner@example.com",
    "password": "LocalDevOnly123!"
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'=' * 70}{Colors.RESET}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text: str):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_info(text: str):
    print(f"{Colors.YELLOW}ℹ️  {text}{Colors.RESET}")

def login_get_aal1_token(email: str, password: str) -> dict:
    """
    Login and get AAL1 token (before MFA verification)

    Returns:
        dict with 'access_token' and 'aal' level
    """
    print_info(f"Logging in as: {email} (getting AAL1 token)")

    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }

    try:
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 200:
            data = response.json()
            aal = data.get('aal', 'aal1')
            print_success(f"Login successful - AAL level: {aal}")
            return {
                'access_token': data['access_token'],
                'aal': aal,
                'user': data.get('user', {})
            }
        else:
            print_error(f"Login failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None

    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

def verify_mfa_and_get_aal2_token(aal1_session: dict, totp_code: str) -> dict:
    """
    Verify MFA with TOTP code and get AAL2 token

    Args:
        aal1_session: Session data from login (with AAL1 token)
        totp_code: 6-digit TOTP code from authenticator app

    Returns:
        dict with AAL2 access_token
    """
    print_info(f"Verifying MFA with code: {totp_code}")

    # Step 1: Get MFA factors
    factors_url = f"{SUPABASE_URL}/auth/v1/factors"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {aal1_session['access_token']}",
        "Content-Type": "application/json"
    }

    try:
        factors_response = requests.get(factors_url, headers=headers)
        if factors_response.status_code != 200:
            print_error(f"Failed to get MFA factors: {factors_response.status_code}")
            return None

        factors_data = factors_response.json()
        totp_factors = factors_data.get('totp', [])

        if not totp_factors:
            print_error("No TOTP factors found for user")
            return None

        factor_id = totp_factors[0]['id']
        print_info(f"Found TOTP factor: {factor_id}")

        # Step 2: Create MFA challenge
        challenge_url = f"{SUPABASE_URL}/auth/v1/factors/{factor_id}/challenge"
        challenge_response = requests.post(challenge_url, headers=headers)

        if challenge_response.status_code != 200:
            print_error(f"Failed to create MFA challenge: {challenge_response.status_code}")
            return None

        challenge_data = challenge_response.json()
        challenge_id = challenge_data['id']
        print_info(f"Created challenge: {challenge_id}")

        # Step 3: Verify TOTP code
        verify_url = f"{SUPABASE_URL}/auth/v1/factors/{factor_id}/verify"
        verify_payload = {
            "challenge_id": challenge_id,
            "code": totp_code
        }

        verify_response = requests.post(verify_url, headers=headers, json=verify_payload)

        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            aal = verify_data.get('aal', 'unknown')
            print_success(f"MFA verification successful - AAL level: {aal}")
            return {
                'access_token': verify_data['access_token'],
                'aal': aal
            }
        else:
            print_error(f"MFA verification failed: {verify_response.status_code}")
            print_error(f"Response: {verify_response.text}")
            return None

    except Exception as e:
        print_error(f"MFA verification error: {str(e)}")
        return None

def check_protected_endpoint(access_token: str, endpoint: str = "/api/v1/business-intelligence/dropdown-options") -> dict:
    """Test protected API endpoint"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers)

        result = {
            "status_code": response.status_code,
            "success": response.status_code == 200
        }

        try:
            result["json"] = response.json()
        except:
            result["text"] = response.text[:200]

        return result

    except Exception as e:
        return {
            "status_code": None,
            "success": False,
            "error": str(e)
        }

def check_scenario_2():
    """
    Scenario 2: AAL1 with MFA enrolled (should FAIL with 403)

    Expected:
    - User HAS MFA enrolled
    - Session is AAL1 (password only, no MFA verification)
    - Protected endpoint should return 403 Forbidden
    """
    print_header("SCENARIO 2: AAL1 with MFA Enrolled (should FAIL with 403)")

    # Step 1: Login to get AAL1 token
    session = login_get_aal1_token(TEST_USER["email"], TEST_USER["password"])
    if not session:
        print_error("Failed to login")
        return False

    aal_level = session.get('aal', 'unknown')
    print_info(f"Session AAL Level: {aal_level}")

    # Step 2: Test protected endpoint with AAL1 token
    print_info("Testing protected endpoint with AAL1 token...")
    result = check_protected_endpoint(session['access_token'])

    print(f"\n📊 Response:")
    print(f"   Status Code: {result['status_code']}")
    print(f"   Success: {result['success']}")

    if result.get('json'):
        print(f"   Response: {json.dumps(result['json'], indent=2)[:300]}")

    # Step 3: Verify result
    if result['status_code'] == 403:
        detail = result.get('json', {}).get('detail', {})
        if isinstance(detail, dict):
            error_code = detail.get('error') or detail.get('code')
            if error_code in ['mfa_required', 'AAL2_REQUIRED']:
                print_success("\n✅ TEST PASSED: AAL1 with MFA was blocked (403 Forbidden)")
                print_success("   Security enforcement working correctly!")
                return True

        print_success("\n✅ TEST PASSED: AAL1 with MFA was blocked (403 Forbidden)")
        return True
    else:
        print_error(f"\n❌ TEST FAILED: Expected 403 Forbidden, got {result['status_code']}")
        print_error("   SECURITY VULNERABILITY: MFA can be bypassed!")
        return False

def check_scenario_3(totp_code: str):
    """
    Scenario 3: AAL2 with MFA enrolled (should PASS with 200)

    Expected:
    - User HAS MFA enrolled
    - Session is AAL2 (password + MFA verification)
    - Protected endpoint should return 200 OK
    """
    print_header("SCENARIO 3: AAL2 with MFA Verified (should PASS with 200)")

    # Step 1: Login to get AAL1 token
    aal1_session = login_get_aal1_token(TEST_USER["email"], TEST_USER["password"])
    if not aal1_session:
        print_error("Failed to login")
        return False

    # Step 2: Verify MFA to upgrade to AAL2
    aal2_session = verify_mfa_and_get_aal2_token(aal1_session, totp_code)
    if not aal2_session:
        print_error("Failed to verify MFA")
        return False

    aal_level = aal2_session.get('aal', 'unknown')
    print_info(f"Session AAL Level: {aal_level}")

    if aal_level != 'aal2':
        print_error(f"Expected AAL2, got {aal_level}")
        return False

    # Step 3: Test protected endpoint with AAL2 token
    print_info("Testing protected endpoint with AAL2 token...")
    result = check_protected_endpoint(aal2_session['access_token'])

    print(f"\n📊 Response:")
    print(f"   Status Code: {result['status_code']}")
    print(f"   Success: {result['success']}")

    # Step 4: Verify result
    if result['status_code'] == 200:
        print_success("\n✅ TEST PASSED: AAL2 with MFA was allowed (200 OK)")
        print_success("   Legitimate MFA users can access protected endpoints!")
        return True
    else:
        print_error(f"\n❌ TEST FAILED: Expected 200 OK, got {result['status_code']}")
        if result.get('json'):
            print(f"   Response: {json.dumps(result['json'], indent=2)}")
        return False

def main():
    """Run MFA security tests"""
    print_header("MFA SECURITY TESTING - Scenarios 2 & 3")

    results = {}

    # Scenario 2: AAL1 with MFA (should fail)
    results['scenario_2'] = check_scenario_2()

    # Scenario 3: AAL2 with MFA (should pass)
    print_info("\n\n⚠️  Scenario 3 requires a current TOTP code from your authenticator app")
    totp_code = input("Enter 6-digit TOTP code (or press Enter to skip): ").strip()

    if totp_code and len(totp_code) == 6:
        results['scenario_3'] = check_scenario_3(totp_code)
    else:
        print_info("Skipping Scenario 3 (no TOTP code provided)")
        results['scenario_3'] = None

    # Summary
    print_header("TEST SUMMARY")

    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    skipped = sum(1 for v in results.values() if v is None)

    print(f"✅ Passed:  {Colors.GREEN}{passed}{Colors.RESET}")
    print(f"❌ Failed:  {Colors.RED}{failed}{Colors.RESET}")
    print(f"⏭️  Skipped: {Colors.YELLOW}{skipped}{Colors.RESET}")

    if failed > 0:
        print_error("\n🚨 SECURITY TEST FAILED!")
        sys.exit(1)
    elif passed > 0:
        print_success("\n✅ ALL TESTS PASSED!")
        if skipped > 0:
            print_info("Some tests were skipped - run with TOTP code for complete validation")
        sys.exit(0)
    else:
        print_info("\n⚠️  No tests completed")
        sys.exit(0)

if __name__ == "__main__":
    main()
