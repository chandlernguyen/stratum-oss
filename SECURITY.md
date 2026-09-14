# Security

## Reporting a vulnerability

Open a private security advisory on this repository, or contact the maintainer
directly. Please do not open a public issue for a suspected vulnerability.

This is a reference implementation and is not maintained as a production service.
Reports are welcome but there is no support commitment and no bug bounty.

## The security model

This is a multi-tenant application. Understanding where the isolation boundary
actually is matters more than any individual control.

- **Two Postgres schemas.** SME data lives in `public`; agency data lives in
  `agency`.
- **Row Level Security is the isolation boundary.** Every table in an exposed
  schema has RLS enabled. Policies constrain which rows a request can see.
- **Writes go through routed functions.** `*_routed()` database functions detect
  the organisation type and target the correct schema. Application code should
  call these via `supabase.rpc()` rather than duplicating schema-selection logic.
- **The service role bypasses RLS.** It is used server-side only. It must never
  be exposed to a client.

### Defence in depth

Policies decide which rows a request may see; grants decide which operations and
columns it may attempt at all. The two are enforced independently:

- **Column-level grants on the tenant tables.** Browser roles may read what RLS
  exposes, but they hold `UPDATE` on the profile columns they legitimately edit
  and nothing on `users.org_id` or the billing columns of `organizations`. There
  is no table-level `UPDATE` grant, because a table grant overrides a column
  revoke.
- **No anonymous function access.** PostgreSQL grants `EXECUTE` to `PUBLIC` on
  every new function; the baseline revokes it from `PUBLIC` and `anon`, then
  grants it back only to `authenticated` and `service_role`. The browser makes no
  pre-login RPC call, so `anon` needs none.
- **Signup ignores client input.** `handle_new_user` provisions a fresh
  organisation and the default owner role. It does not honour a client-supplied
  `org_id` or `role` from `raw_user_meta_data`, which is user-controlled.
- **Team RPCs use the session, not a parameter.** `remove_team_member` and
  `update_team_member_role` take the caller from `auth.uid()`, falling back to an
  argument only for the service-role path, so a viewer cannot act as an owner.
- **MFA is enforced, and fails closed.** Routers mounted with `verify_aal2` reject
  an AAL1 session when the user has MFA enrolled, and the check denies (503)
  rather than allowing the request through if the enrollment lookup errors.
- **JWT verification is strict.** There is no default signing secret, and both
  the HS256 and ES256 paths pin the issuer and audience.
- **Rate limits.** A per-user cap on AI requests (`AI_RATE_LIMIT_REQUESTS` per
  `AI_RATE_LIMIT_WINDOW` seconds, default 10 in 60) is applied to the endpoints
  that reach a model, not only to chat.
- **Errors are sanitized, and tokens are not logged.** Stack traces are not
  returned to clients, and API docs are off unless `DEBUG=true`.

These live in the schema's layered migrations. `harden_tenant_isolation` is the
module to read for the grants, the signup trigger and the default privileges.

### Two things that are easy to get wrong

**Materialized views cannot have RLS.** A `SELECT` grant on a matview is
unrestricted read access to every tenant's rows — unlike the same grant on a
table, where RLS still constrains the rows. Do not grant browser-facing roles
access to a matview that contains tenant data.

**A client-side `.eq('org_id', ...)` filter is not a security boundary.** It runs
in the browser and can be removed. Row visibility must be enforced by RLS or by a
server-side endpoint.

## How the invariants are verified

- `tests/automated/test_rls_coverage.py` asserts the shape-level invariants
  across every table and materialized view: RLS is enabled, matviews are not
  readable by browser roles, and the internal push queue is not granted to them.
- `tests/automated/test_tenant_privilege_contract.py` asserts the grant-level
  invariants: `org_id` and the billing columns are not writable by browser roles,
  `anon` cannot execute any function, signup ignores client input, and default
  privileges do not re-grant `anon`.
- `tests/automated/test_team_rpc_authorization.py` proves the team RPCs reject a
  spoofed caller.

They assert properties across all objects rather than naming individual ones,
because the failure mode is "a new table forgot". CI runs all three against a
real Postgres (the `db` job in `.github/workflows/ci.yml`), so a migration that
loosens one of them fails the build.

**A word on `supabase db advisors`.** It detects security-definer and search-path
problems, but it does not inspect policy *expressions* or column privileges: on
this project's local stack it reports no issues even when `users.org_id` is
writable and `anon` can call privileged functions. Treat a clean run as
necessary, not sufficient; the tests above are the guard.

## What running this does to your machine

You are being asked to run someone else's code. Here is what it actually touches,
so the answer to "should I trust this?" does not have to be taken on faith.

**In the default `DEMO_MODE`:**

- No requests leave your machine to any model provider. The agents return
  canned output from a local stub, and no API key is involved.
- No account is created with anyone. There is nothing to sign up for.
- Everything runs in Docker containers on `127.0.0.1`. The database, the API and
  the website are all local; the ports are in the `563xx` range specifically to
  avoid colliding with other projects.
- `supabase start` downloads container images the first time (several hundred
  megabytes) and reuses them afterwards. `scripts/stop.sh --database` removes the
  running containers.

**When you turn `DEMO_MODE` off and add a model key**, the only additional egress
is to the provider you configured (Google's Gemini API) and, if you enable them,
the optional integrations you set keys for: Stripe, Resend, reCAPTCHA, Turnstile
and APNs. Each is inactive until its credentials are present.

**What the scripts do.** `scripts/verify-setup.sh` only reads: it checks for
tools and reports. `scripts/bootstrap.sh` writes exactly two files — `apps/api/.env`
and `apps/web/.env`, both from the committed templates, and only if they do not
already exist — plus a gitignored `.run/` directory holding logs and pids. It
also generates a random `PUSH_DISPATCH_SECRET` in `apps/api/.env` rather than
leaving the template's known placeholder. You can read both scripts; they are
short and commented.

## If you self-host this

Review the RLS policies against your own threat model. Enabling RLS is the
mechanism; whether the *policies* express the access model you intend is a
judgement only you can make.

Also review:

- **Grants.** When you add tables or functions, carry the hardening over:
  column-level `UPDATE` rather than table-level, no `EXECUTE` for `anon`, and
  `anon` removed from your default privileges. Run the tenant-isolation tests
  against your database. `harden_tenant_isolation` is the reference.
- **CORS.** `ALLOWED_ORIGINS` must be set to your own origins. The template ships
  a working local value, not a production one.
- **Secrets.** Set `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `RESEND_API_KEY`,
  `TURNSTILE_SECRET_KEY` and `PUSH_DISPATCH_SECRET` yourself. `PUSH_DISPATCH_SECRET`
  guards an internal endpoint and must be a long random value; the API treats the
  template placeholder as unconfigured.
- **The seed data is for local development only.** `supabase/seed.sql` creates
  accounts with known credentials. **Never run it against a deployed database.**
- **Contact address.** `CONTACT_EMAIL` is what your users are told to write to.
  Set it, or your users' support mail goes somewhere you do not control.

## Known residual issues

### Dependency advisories

`npm audit` reports 33 advisories across all dependencies; `npm audit --omit=dev`
reports two, both high — the pair below — so the rest are dev and build-time
only.

`remark-mdx-frontmatter` (latest, 5.2.0) depends on `toml <= 4.1.2`, which has two
high-severity advisories (uncontrolled recursion; prototype pollution). No patched
release exists, and `npm audit` reports "No fix available".

Assessed as **low practical risk**:

- It is a **build-time** dependency. It parses MDX frontmatter during the build,
  never in the browser and never at request time.
- Exploiting it requires control of MDX source files at build time. An attacker
  who can do that already has write access to the repository and build pipeline.

It is retained because the MDX pipeline is a live product feature — the Content
agent's blog post preview — not vestigial marketing tooling. Removing it to clear
a scanner warning would break functionality. Revisit when upstream ships a fix.

### Content-Security-Policy

The policy in `apps/web/vercel.json` includes `'unsafe-inline'` and
`'unsafe-eval'` in `script-src`. Both weaken CSP substantially.

They are present as compatibility debt and their justification has not been
verified. What is known:

- There is no `eval()` or `new Function()` anywhere in `apps/web/src`.
- There are no uses of `dangerouslySetInnerHTML`.
- The only inline `<script>` in the shell is a `application/ld+json` data block,
  which browsers do not execute.

That suggests both directives may be removable, but third-party scripts
(analytics, captcha) can require them, and removing them without browser testing
risks a silent production breakage. **Removal plan:** build with a strict policy,
load the app in a browser, and check the console for CSP violations across the
pages that use those third parties. Remove what reports clean.

`connect-src` no longer allows every origin. It lists Supabase, Stripe, the
analytics and captcha origins, and `'self'`. If you serve the API from an origin
other than the web app's, add that origin here, since the app calls it directly
when `VITE_API_URL` points elsewhere.

Note this policy only applies to Vercel deployments; the local and Docker paths
do not use `vercel.json`.

### Search paths

Database functions pin `search_path` explicitly. A function with a mutable
`search_path` can have unqualified references hijacked by an attacker able to
create objects in a schema earlier in the path. Keep new functions pinned.

## Reporting on this document

If any statement here does not match the code, the code is right and this
document is wrong. Please say so.
