"""
Tenant-isolation privilege contract.

RLS decides which *rows* a request sees. Grants decide which *operations* and
*columns* a role may attempt at all. The consolidated baseline shipped
table-level UPDATE on public.users and public.organizations to anon and
authenticated, which let any authenticated user rewrite their own ``org_id``
(tenant-hopping) or their organisation's billing columns (entitlement bypass)
straight through the Data API. A policy cannot close that: the column privilege
gap is the only fix.

These assertions are about privileges, not policies, so they hold regardless of
which policies exist, and they are deliberately generic: they will also catch a
future table that re-grants table-level UPDATE to a browser role.
"""

import os
import uuid

import pytest

psycopg2 = pytest.importorskip("psycopg2")

DB_URL = os.getenv(
    "SUPABASE_DB_URL",
    "postgresql://postgres:postgres@127.0.0.1:56322/postgres",
)

# Roles reachable through the Supabase Data API. The anon key is public.
BROWSER_ROLES = ("anon", "authenticated")

# Columns the browser legitimately writes: profile fields and locale.
USERS_WRITABLE_COLUMNS = (
    "full_name",
    "phone",
    "avatar_url",
    "preferences",
    "locale",
    "updated_at",
)

# Columns that decide which tenant a user belongs to.
USERS_PROTECTED_COLUMNS = ("id", "email", "org_id")

# Billing / entitlement columns the browser must never write.
ORGS_PROTECTED_COLUMNS = (
    "subscription_tier",
    "subscription_status",
    "max_users",
    "max_campaigns",
    "max_clients",
    "gemini_monthly_limit",
    "gemini_monthly_usage",
    "gemini_usage_reset_date",
    "stripe_customer_id",
    "stripe_subscription_id",
    "stripe_price_id",
    "trial_ends_at",
    "subscription_period_end",
    "grace_period_started_at",
    "grace_period_ends_at",
)

# Test / admin helpers that must not be reachable with the public anon key.
FORBIDDEN_ANON_FUNCTIONS = (
    "create_auth_user_direct",
    "assign_user_to_organization",
    "archive_record",
    "remove_team_member",
    "update_team_member_role",
    "complete_user_onboarding",
    "get_user_roles_cached",
    "check_user_mfa_enrolled",
)

# The seeded organisation used as the "victim" for the trigger probe.
VICTIM_ORG = "baa7abb7-742d-4d9e-9112-2a095c17f17c"


@pytest.fixture()
def cur():
    try:
        conn = psycopg2.connect(DB_URL, connect_timeout=3)
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"database not reachable: {exc}")
    yield conn.cursor()
    conn.rollback()
    conn.close()


def _column_priv(cur, role, table, column, privilege):
    cur.execute(
        "select has_column_privilege(%s, %s, %s, %s)",
        (role, f"public.{table}", column, privilege),
    )
    return cur.fetchone()[0]


def _table_priv(cur, role, table, privilege):
    cur.execute(
        "select has_table_privilege(%s, %s, %s)",
        (role, f"public.{table}", privilege),
    )
    return cur.fetchone()[0]


@pytest.mark.parametrize("role", BROWSER_ROLES)
def test_users_has_no_table_level_update(cur, role):
    assert not _table_priv(cur, role, "users", "UPDATE"), (
        f"{role} has table-level UPDATE on public.users; table grants override "
        "column revokes, so org_id becomes writable"
    )


@pytest.mark.parametrize("role", BROWSER_ROLES)
def test_users_identity_columns_not_writable(cur, role):
    leaking = [c for c in USERS_PROTECTED_COLUMNS if _column_priv(cur, role, "users", c, "UPDATE")]
    assert not leaking, f"{role} can UPDATE tenant/identity columns on users: {leaking}"


def test_users_safe_profile_columns_remain_writable(cur):
    missing = [c for c in USERS_WRITABLE_COLUMNS if not _column_priv(cur, "authenticated", "users", c, "UPDATE")]
    assert not missing, (
        f"authenticated lost UPDATE on profile columns it legitimately edits: {missing}"
    )


@pytest.mark.parametrize("role", BROWSER_ROLES)
def test_organizations_has_no_table_level_update(cur, role):
    assert not _table_priv(cur, role, "organizations", "UPDATE"), (
        f"{role} has table-level UPDATE on public.organizations; billing fields "
        "become self-service"
    )


@pytest.mark.parametrize("role", BROWSER_ROLES)
def test_organization_billing_columns_not_writable(cur, role):
    leaking = [c for c in ORGS_PROTECTED_COLUMNS if _column_priv(cur, role, "organizations", c, "UPDATE")]
    assert not leaking, f"{role} can UPDATE billing columns on organizations: {leaking}"


def test_forbidden_helpers_not_executable_by_anon(cur):
    cur.execute(
        """
        select p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = any(%s)
          and has_function_privilege('anon', p.oid, 'EXECUTE')
        order by 1
        """,
        (list(FORBIDDEN_ANON_FUNCTIONS),),
    )
    leaked = [r[0] for r in cur.fetchall()]
    assert not leaked, f"anon (public key) can execute privileged helpers: {leaked}"


def test_anon_has_no_execute_on_any_public_function(cur):
    cur.execute(
        """
        select p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and has_function_privilege('anon', p.oid, 'EXECUTE')
        order by 1
        """
    )
    leaked = [r[0] for r in cur.fetchall()]
    assert not leaked, (
        "the publishable anon key can execute public functions, but the browser "
        f"makes no pre-login RPC calls, so anon needs none: {leaked}"
    )


def test_default_privileges_do_not_grant_anon(cur):
    cur.execute(
        """
        select coalesce(d.defaclobjtype::text, '')
        from pg_default_acl d
        join pg_namespace n on n.oid = d.defaclnamespace
        where n.nspname = 'public'
          and pg_get_userbyid(d.defaclrole) = 'postgres'
          and array_to_string(d.defaclacl, ' ') like '%%anon=%%'
        """
    )
    grants = cur.fetchall()
    assert not grants, (
        "default privileges still grant future public objects to anon: "
        f"{grants}"
    )


def test_auth_users_signup_trigger_exists(cur):
    cur.execute(
        "select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal"
    )
    names = [r[0] for r in cur.fetchall()]
    assert "on_auth_user_created" in names, (
        "signup has no profile-provisioning trigger; a new auth user gets no "
        f"public.users row and no organisation. triggers found: {names}"
    )


def test_handle_new_user_ignores_client_supplied_org_and_role(cur):
    uid = str(uuid.uuid4())
    email = f"trigger-probe-{uid[:8]}@example.com"
    metadata = (
        '{"organization_type":"SME",'
        f'"org_id":"{VICTIM_ORG}",'
        '"role":"agency_owner"}'
    )
    try:
        cur.execute(
            """
            insert into auth.users (
              id, instance_id, aud, role, email, encrypted_password,
              email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
              created_at, updated_at
            )
            values (
              %s, '00000000-0000-0000-0000-000000000000', 'authenticated',
              'authenticated', %s, 'x', now(), '{}'::jsonb, %s::jsonb,
              now(), now()
            )
            """,
            (uid, email, metadata),
        )
        cur.execute("select org_id from public.users where id = %s", (uid,))
        row = cur.fetchone()
        assert row is not None, "handle_new_user did not create a public.users row"
        assert str(row[0]) != VICTIM_ORG, (
            "signup honoured a client-supplied org_id, dropping the user into "
            "another tenant"
        )

        cur.execute(
            """
            select r.name
            from public.user_role_assignments ura
            join public.roles r on r.id = ura.role_id
            where ura.user_id = %s
            """,
            (uid,),
        )
        roles = [r[0] for r in cur.fetchall()]
        assert "agency_owner" not in roles, (
            f"signup honoured a client-supplied role: {roles}"
        )
    finally:
        cur.connection.rollback()


# The privilege assertions above are the mechanism. These two prove the
# behaviour they guarantee, end to end, under a real authenticated session.

SEEDED_SME_OWNER = "11111111-1111-1111-1111-111111111111"


def test_update_policies_declare_with_check(cur):
    cur.execute(
        """
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname in ('public', 'agency')
          and cmd in ('UPDATE', 'ALL')
          and with_check is null
        order by 1, 2, 3
        """
    )
    missing = cur.fetchall()
    assert not missing, (
        "UPDATE/ALL policies that omit WITH CHECK. PostgreSQL applies USING as "
        "the implicit write check (verified for this schema), but a policy "
        "should state its write check explicitly: " + str(missing)
    )


def test_authenticated_cannot_rewrite_own_org_id(cur):
    try:
        cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (SEEDED_SME_OWNER,))
        cur.execute("set local role authenticated")
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cur.execute(
                "update public.users set org_id = org_id where id = %s",
                (SEEDED_SME_OWNER,),
            )
    finally:
        cur.connection.rollback()


def test_authenticated_can_still_update_own_profile(cur):
    try:
        cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (SEEDED_SME_OWNER,))
        cur.execute("set local role authenticated")
        cur.execute(
            "update public.users set full_name = full_name, locale = locale where id = %s",
            (SEEDED_SME_OWNER,),
        )
        assert cur.rowcount == 1
    finally:
        cur.connection.rollback()
