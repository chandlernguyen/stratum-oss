"""
Regression test: public.permissions must accept INSERTs.

public.refresh_user_roles_cache() reads NEW.user_id / OLD.user_id, but it was
attached to public.permissions — a table with no user_id column. Every INSERT
into permissions therefore failed:

    record "new" has no field "user_id" (SQLSTATE 42703)

The defect stayed latent because the original migration chain inserted the RBAC
reference data BEFORE this trigger was created. It surfaced only once the
migrations were consolidated into a single baseline that creates the schema
first — and it would have broken the first permission anyone tried to add.

Permission rows are global reference data: a change affects every user's
effective roles, so there is no single affected user to notify. The trigger is
now statement-level and uses a generic refresh, matching the existing
role_permissions pattern.
"""

import os

import pytest

psycopg2 = pytest.importorskip("psycopg2")

DB_URL = os.getenv(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@127.0.0.1:56322/postgres",
)


@pytest.fixture()
def conn():
    try:
        c = psycopg2.connect(DB_URL, connect_timeout=3)
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"database not reachable: {exc}")
    yield c
    c.rollback()
    c.close()


def test_permission_insert_succeeds(conn):
    """The behaviour that was broken: adding a permission row."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO public.permissions (id, name, description, resource, action)
            VALUES (
                gen_random_uuid(),
                'regression.probe',
                'trigger regression probe',
                'regression',
                'probe'
            )
            RETURNING id
            """
        )
        assert cur.fetchone() is not None
    conn.rollback()


def test_permissions_trigger_is_statement_level_and_generic(conn):
    """
    Guard the shape of the fix, so the row-level trigger cannot be reintroduced.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.proname, t.tgtype
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_proc p ON p.oid = t.tgfoid
            WHERE c.relname = 'permissions' AND NOT t.tgisinternal
            """
        )
        rows = cur.fetchall()

    assert rows, "expected at least one trigger on public.permissions"

    for proname, tgtype in rows:
        assert proname != "refresh_user_roles_cache", (
            "public.permissions must not use the user-scoped refresh function: "
            "it reads NEW.user_id, and permissions has no user_id column"
        )
        assert tgtype & 1 == 0, (
            f"trigger {proname!r} on permissions is row-level (tgtype={tgtype}); "
            "a global reference-table change should be statement-level"
        )
