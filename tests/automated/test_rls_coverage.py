"""
Every table in an exposed schema must have Row Level Security enabled.

Regression context: public.notification_push_deliveries was created without
ENABLE ROW LEVEL SECURITY and granted to anon and authenticated with full
privileges — including TRUNCATE — with zero policies defined. Because it lives in
the exposed `public` schema, anyone holding the publishable anon key (which ships
in the browser bundle) could read, modify, or wipe the push delivery queue
through the Data API.

The table holds push_device_id and apns_id, so this was both a data-exposure and
a denial-of-service issue.

This asserts the invariant across every table rather than naming one, because the
failure mode is "a new table forgot to enable RLS", which a single-table test
would not catch.
"""

import os

import pytest

psycopg2 = pytest.importorskip("psycopg2")

DB_URL = os.getenv(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@127.0.0.1:56322/postgres",
)

# Schemas reachable through the Supabase Data API.
EXPOSED_SCHEMAS = ("public", "agency")

# Tables only the backend should touch, via the service role. The service role
# bypasses RLS, so these need RLS enabled AND no grants to browser-facing roles.
INTERNAL_ONLY_TABLES = ("notification_push_deliveries",)


@pytest.fixture()
def cur():
    try:
        conn = psycopg2.connect(DB_URL, connect_timeout=3)
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"database not reachable: {exc}")
    yield conn.cursor()
    conn.close()


def test_all_exposed_tables_have_rls_enabled(cur):
    cur.execute(
        """
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = ANY(%s)
          AND NOT rowsecurity
        ORDER BY 1, 2
        """,
        (list(EXPOSED_SCHEMAS),),
    )
    missing = cur.fetchall()

    assert not missing, (
        "tables in exposed schemas without Row Level Security are reachable via "
        f"the Data API: {missing}"
    )


def test_internal_only_tables_are_not_granted_to_browser_roles(cur):
    cur.execute(
        """
        SELECT table_name, grantee
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee IN ('anon', 'authenticated')
          AND table_name = ANY(%s)
        ORDER BY 1, 2
        """,
        (list(INTERNAL_ONLY_TABLES),),
    )
    leaks = cur.fetchall()

    assert not leaks, (
        "internal tables must not be reachable by anon/authenticated; the anon "
        f"key is public: {leaks}"
    )


def test_materialized_views_are_not_readable_by_browser_roles(cur):
    """
    Materialized views cannot have Row Level Security.

    That makes a SELECT grant to anon/authenticated qualitatively different from
    the same grant on a table: on a table RLS constrains which rows are visible,
    but a matview returns EVERY tenant's rows. All seven matviews here carry
    org_id / client_id / user_id, so this was cross-tenant exposure — and the
    anon key ships in the browser bundle.

    A client-side .eq('org_id', ...) filter is not a security boundary.
    """
    cur.execute(
        """
        SELECT c.relname,
               has_table_privilege('anon', 'public.' || c.relname, 'SELECT'),
               has_table_privilege('authenticated', 'public.' || c.relname, 'SELECT')
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'm'
        ORDER BY 1
        """
    )
    exposed = [
        (name, "anon" if anon_can else "", "authenticated" if auth_can else "")
        for name, anon_can, auth_can in cur.fetchall()
        if anon_can or auth_can
    ]

    assert not exposed, (
        "materialized views are readable by browser-facing roles and carry "
        f"tenant data; RLS cannot protect them: {exposed}"
    )
