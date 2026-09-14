"""
Live AAL2 gate behaviour.

Seeded users have no MFA enrolled, so the AAL2 gate must let them through at
AAL1, and it must still reject unauthenticated requests. Needs the running API
and local Supabase, so it is skipped unless RUN_MFA_AAL_TESTS=1. Adapted from
the private repository's script, which printed instead of asserting and used
framework-default ports.
"""

import os

import pytest
import requests

import test_config

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_MFA_AAL_TESTS") != "1",
    reason="needs the running API and local Supabase; set RUN_MFA_AAL_TESTS=1",
)

# A route the app mounts with Depends(verify_aal2).
GATED_ROUTE = "/api/v1/direct-agents/strategy/sessions"


def _access_token() -> str:
    response = requests.post(
        f"{test_config.SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": test_config.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": test_config.TEST_EMAIL, "password": test_config.TEST_PASSWORD},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def test_unauthenticated_request_is_rejected():
    response = requests.get(f"{test_config.API_BASE_URL}{GATED_ROUTE}", timeout=15)
    assert response.status_code in (401, 403)


def test_user_without_mfa_is_not_blocked_by_the_gate():
    token = _access_token()
    response = requests.get(
        f"{test_config.API_BASE_URL}{GATED_ROUTE}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    # A user with no MFA enrolled must not be rejected for AAL2.
    assert response.status_code != 403, response.text[:200]
