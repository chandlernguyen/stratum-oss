"""
Team-management RPCs must derive the caller from the verified session, not from
a parameter.

``remove_team_member`` and ``update_team_member_role`` take ``p_user_id`` and
treat it as "the caller". Under PostgREST any authenticated user can invoke
them, and nothing stops them passing someone else's id, so a viewer could remove
or re-role members simply by naming an owner. The fix prefers ``auth.uid()``
when a session is present and falls back to ``p_user_id`` only for the trusted
server-side (``service_role``) path, which carries no ``auth.uid()``.
"""

import os

import pytest

psycopg2 = pytest.importorskip("psycopg2")

DB_URL = os.getenv(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@127.0.0.1:56322/postgres",
)

# Seeded "Test SME Company" members. remove_team_member accepts SME owners.
SME_ORG = "baa7abb7-742d-4d9e-9112-2a095c17f17c"
SME_OWNER = "11111111-1111-1111-1111-111111111111"
SME_ANALYST = "11111111-1111-1111-1111-111111111114"
SME_VIEWER = "11111111-1111-1111-1111-111111111115"

# Seeded "Test Agency Inc" members. update_team_member_role is agency-only.
AGENCY_ORG = "70038b0e-a1f8-4ed2-9bc8-40b94ee41cff"
AGENCY_OWNER = "44444444-4444-4444-4444-444444444444"
AGENCY_ANALYST = "44444444-4444-4444-4444-444444444449"
AGENCY_VIEWER = "44444444-4444-4444-4444-44444444444d"


@pytest.fixture()
def cur():
    try:
        conn = psycopg2.connect(DB_URL, connect_timeout=3)
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"database not reachable: {exc}")
    yield conn.cursor()
    conn.rollback()
    conn.close()


def _act_as(cur, user_id):
    """Put the connection into a real authenticated session for ``user_id``."""
    cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (user_id,))
    cur.execute("set local role authenticated")


def _role_id(cur, name):
    cur.execute("select id from public.roles where name = %s", (name,))
    return cur.fetchone()[0]


def test_remove_team_member_ignores_spoofed_caller(cur):
    try:
        _act_as(cur, SME_VIEWER)
        with pytest.raises(psycopg2.errors.RaiseException) as excinfo:
            cur.execute(
                "select public.remove_team_member(%s, %s, %s)",
                (SME_OWNER, SME_ANALYST, SME_ORG),
            )
        assert "permission denied" in str(excinfo.value).lower()
    finally:
        cur.connection.rollback()


def test_remove_team_member_still_works_for_the_real_owner(cur):
    try:
        _act_as(cur, SME_OWNER)
        cur.execute(
            "select public.remove_team_member(%s, %s, %s)",
            (SME_OWNER, SME_ANALYST, SME_ORG),
        )
        assert cur.fetchone() is not None
    finally:
        cur.connection.rollback()


def test_update_team_member_role_ignores_spoofed_caller(cur):
    viewer_role_id = _role_id(cur, "agency_viewer")
    try:
        _act_as(cur, AGENCY_VIEWER)
        with pytest.raises(psycopg2.errors.RaiseException):
            cur.execute(
                "select public.update_team_member_role(%s, %s, %s, %s)",
                (AGENCY_OWNER, AGENCY_ANALYST, viewer_role_id, AGENCY_ORG),
            )
    finally:
        cur.connection.rollback()


def test_remove_team_member_falls_back_to_parameter_without_a_session(cur):
    """The API calls this with the service role, which carries no auth.uid()."""
    cur.execute(
        "select public.remove_team_member(%s, %s, %s)",
        (SME_OWNER, SME_ANALYST, SME_ORG),
    )
    assert cur.fetchone() is not None
    cur.connection.rollback()
