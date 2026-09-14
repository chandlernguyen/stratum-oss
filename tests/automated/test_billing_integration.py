"""
Integration tests for billing endpoints using real local Supabase + API.

Requires:
- Local Supabase running (port 56321)
- API server running (port 56300)
- Database seeded with billing test users (supabase db reset)

Seed users (9 total):
- billing.free@example.com            → free/inactive      (blocked)
- billing.solo.trial@example.com      → solo/trial         (allowed — active trial)
- billing.solo@example.com            → solo/active        (allowed)
- billing.team.trial@example.com      → team/trial         (allowed — active trial)
- billing.team@example.com            → team/active        (allowed)
- billing.agency.trial@example.com    → agency/trial       (allowed — active trial)
- billing.agency@example.com          → agency/active      (allowed)
- billing.expired@example.com         → solo/trial         (blocked — trial_ends_at in the past)
- billing.pastdue@example.com         → team/past_due      (blocked — payment failed)

Run: poetry run pytest tests/automated/test_billing_integration.py -v -m integration
"""
import os
import pytest
import requests
from supabase import create_client

# ── Configuration ────────────────────────────────────────────────────────

API_BASE = os.getenv("TEST_API_BASE", "http://localhost:56300")
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:56321")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
)
PASSWORD = "LocalDevOnly123!"

BILLING_USERS = {
    "free": "billing.free@example.com",
    "solo_trial": "billing.solo.trial@example.com",
    "solo_active": "billing.solo@example.com",
    "team_trial": "billing.team.trial@example.com",
    "team_active": "billing.team@example.com",
    "agency_trial": "billing.agency.trial@example.com",
    "agency_active": "billing.agency@example.com",
    "expired_trial": "billing.expired@example.com",
    "past_due": "billing.pastdue@example.com",
}


# ── Helpers ──────────────────────────────────────────────────────────────


def _get_access_token(email: str) -> str:
    """Sign in via Supabase and return a JWT access token."""
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    response = client.auth.sign_in_with_password({"email": email, "password": PASSWORD})
    return response.session.access_token


def _api_get(path: str, token: str) -> requests.Response:
    return requests.get(
        f"{API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )


def _api_post(path: str, token: str, json: dict = None) -> requests.Response:
    return requests.post(
        f"{API_BASE}{path}",
        headers={"Authorization": f"Bearer {token}"},
        json=json or {},
        timeout=15,
    )


# ── Fixtures ─────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def free_token():
    return _get_access_token(BILLING_USERS["free"])


@pytest.fixture(scope="module")
def solo_trial_token():
    return _get_access_token(BILLING_USERS["solo_trial"])


@pytest.fixture(scope="module")
def solo_active_token():
    return _get_access_token(BILLING_USERS["solo_active"])


@pytest.fixture(scope="module")
def team_trial_token():
    return _get_access_token(BILLING_USERS["team_trial"])


@pytest.fixture(scope="module")
def team_active_token():
    return _get_access_token(BILLING_USERS["team_active"])


@pytest.fixture(scope="module")
def agency_trial_token():
    return _get_access_token(BILLING_USERS["agency_trial"])


@pytest.fixture(scope="module")
def agency_active_token():
    return _get_access_token(BILLING_USERS["agency_active"])


@pytest.fixture(scope="module")
def expired_trial_token():
    return _get_access_token(BILLING_USERS["expired_trial"])


@pytest.fixture(scope="module")
def past_due_token():
    return _get_access_token(BILLING_USERS["past_due"])


# ── TestSubscriptionStatusEndpoint ───────────────────────────────────────


@pytest.mark.integration
class TestSubscriptionStatusEndpoint:
    """Tests for GET /api/v1/billing/subscription with real DB data."""

    def test_free_user_sees_free_inactive(self, free_token):
        resp = _api_get("/api/v1/billing/subscription", free_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "free"
        assert data["status"] == "inactive"
        assert data["max_seats"] == 1
        assert data["is_trial_expired"] is False

    def test_solo_trial_sees_solo_trial(self, solo_trial_token):
        resp = _api_get("/api/v1/billing/subscription", solo_trial_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "solo"
        assert data["status"] == "trial"
        assert data["max_seats"] == 1
        assert data["trial_ends_at"] is not None
        assert data["is_trial_expired"] is False
        assert data["is_read_only"] is False

    def test_solo_active_sees_solo_active(self, solo_active_token):
        resp = _api_get("/api/v1/billing/subscription", solo_active_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "solo"
        assert data["status"] == "active"
        assert data["max_seats"] == 1
        assert data["is_trial_expired"] is False

    def test_team_trial_sees_team_trial(self, team_trial_token):
        resp = _api_get("/api/v1/billing/subscription", team_trial_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "team"
        assert data["status"] == "trial"
        assert data["max_seats"] == 3
        assert data["is_trial_expired"] is False

    def test_team_active_sees_team_active(self, team_active_token):
        resp = _api_get("/api/v1/billing/subscription", team_active_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "team"
        assert data["status"] == "active"
        assert data["max_seats"] == 3

    def test_agency_trial_sees_agency_trial(self, agency_trial_token):
        resp = _api_get("/api/v1/billing/subscription", agency_trial_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "agency"
        assert data["status"] == "trial"
        assert data["max_seats"] == 10
        assert data["is_trial_expired"] is False

    def test_agency_active_sees_agency_active(self, agency_active_token):
        resp = _api_get("/api/v1/billing/subscription", agency_active_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "agency"
        assert data["status"] == "active"
        assert data["max_seats"] == 10

    def test_expired_trial_sees_read_only(self, expired_trial_token):
        resp = _api_get("/api/v1/billing/subscription", expired_trial_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "solo"
        assert data["status"] == "trial"
        assert data["is_read_only"] is True
        assert data["is_trial_expired"] is True

    def test_past_due_user_sees_past_due(self, past_due_token):
        resp = _api_get("/api/v1/billing/subscription", past_due_token)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "team"
        assert data["status"] == "past_due"


# ── TestProtectedEndpointEnforcement ─────────────────────────────────────


@pytest.mark.integration
class TestProtectedEndpointEnforcement:
    """Verify that subscription-gated endpoints block/allow correctly."""

    def test_free_user_blocked_from_create_session(self, free_token):
        resp = _api_post(
            "/api/v1/direct-agents/sessions",
            free_token,
            json={"agent_type": "strategy"},
        )
        assert resp.status_code == 402

    def test_free_user_blocked_from_agent_chat(self, free_token):
        resp = _api_post(
            "/api/v1/direct-agents/strategy/chat",
            free_token,
            json={"message": "test", "session_id": "fake-session"},
        )
        assert resp.status_code == 402

    def test_solo_trial_user_can_create_session(self, solo_trial_token):
        resp = _api_post(
            "/api/v1/direct-agents/sessions",
            solo_trial_token,
            json={"agent_type": "strategy"},
        )
        assert resp.status_code in (200, 201)

    def test_team_active_user_can_create_session(self, team_active_token):
        resp = _api_post(
            "/api/v1/direct-agents/sessions",
            team_active_token,
            json={"agent_type": "strategy"},
        )
        assert resp.status_code in (200, 201)

    def test_agency_active_user_can_create_session(self, agency_active_token):
        resp = _api_post(
            "/api/v1/direct-agents/sessions",
            agency_active_token,
            json={"agent_type": "strategy", "client_id": "cccccccc-b444-b444-b444-cccccccccccc"},
        )
        assert resp.status_code in (200, 201)

    def test_expired_trial_blocked_from_create_session(self, expired_trial_token):
        resp = _api_post(
            "/api/v1/direct-agents/sessions",
            expired_trial_token,
            json={"agent_type": "strategy"},
        )
        assert resp.status_code == 402

    def test_expired_trial_blocked_from_agent_chat(self, expired_trial_token):
        resp = _api_post(
            "/api/v1/direct-agents/strategy/chat",
            expired_trial_token,
            json={"message": "test", "session_id": "fake-session"},
        )
        assert resp.status_code == 402

    def test_past_due_blocked_from_create_session(self, past_due_token):
        resp = _api_post(
            "/api/v1/direct-agents/sessions",
            past_due_token,
            json={"agent_type": "strategy"},
        )
        assert resp.status_code == 402

    def test_past_due_blocked_from_agent_chat(self, past_due_token):
        resp = _api_post(
            "/api/v1/direct-agents/strategy/chat",
            past_due_token,
            json={"message": "test", "session_id": "fake-session"},
        )
        assert resp.status_code == 402


# ── TestUnprotectedEndpointsStillWork ────────────────────────────────────


@pytest.mark.integration
class TestUnprotectedEndpointsStillWork:
    """Verify auth-only (non-subscription-gated) endpoints still work for free users."""

    def test_free_user_can_get_subscription(self, free_token):
        """Billing status endpoint is auth-only, not subscription-gated."""
        resp = _api_get("/api/v1/billing/subscription", free_token)
        assert resp.status_code == 200

    def test_free_user_can_list_sessions(self, free_token):
        """Session listing is auth-only, not subscription-gated."""
        resp = _api_get("/api/v1/direct-agents/strategy/sessions", free_token)
        assert resp.status_code == 200

    def test_expired_trial_can_get_subscription(self, expired_trial_token):
        """Expired trial can still access billing status (to see upgrade prompts)."""
        resp = _api_get("/api/v1/billing/subscription", expired_trial_token)
        assert resp.status_code == 200

    def test_past_due_can_get_subscription(self, past_due_token):
        """Past due can still access billing status (to update payment)."""
        resp = _api_get("/api/v1/billing/subscription", past_due_token)
        assert resp.status_code == 200
