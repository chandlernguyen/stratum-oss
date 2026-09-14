# Testing

This document describes the four test layers in this repository, the exact
command to run each one, what is verified to work, and — importantly — what is
*not* covered. All numbers below were measured on this repository, not estimated.

## Summary

| Layer | Location | Command | Measured state |
|---|---|---|---|
| Backend (pytest) | `tests/automated/` | `poetry run pytest` | **298 pass, 82 skip, 0 fail** with the stack up and no model/Stripe keys |
| Web unit (Vitest) | `apps/web/src/**/*.test.{ts,tsx}` | `npm test --prefix apps/web` | **60 pass** (5 files) |
| Web E2E (Playwright) | `apps/web/tests/` | `cd apps/web && npx playwright test --project=chromium` | **37 pass, 3 skip, 0 fail** on chromium for smoke + user-journeys + integration + multi-tenant; 7 materially-stale specs quarantined behind `RUN_STALE_E2E=1` |
| Fresh-clone setup | — | see "Setup verification" | The seven README steps now run as written. Not automated |

A fresh clone's `poetry run pytest` is green. The 82 skips are deliberate: tests
that need a live model, Stripe credentials, or that are known stale are
quarantined rather than left red. Each category has an opt-in environment
variable, so the debt stays visible and runnable — see "Quarantined tests".

## Backend tests

The suite talks to two services: Supabase (REST, port `56321`) and the backend
API (port `56300`). Supabase must be running; the API must be running for the
integration tests.

```bash
supabase start

# One-time: create the test-server settings from the committed template.
cp apps/api/.env.test.local.example apps/api/.env.test.local

# In a second terminal. Later --env-file entries win, so .env.test.local
# overrides the DEMO_MODE and rate-limit settings from apps/api/.env.
poetry run uvicorn apps.api.main:app --host 127.0.0.1 --port 56300 \
  --env-file apps/api/.env \
  --env-file apps/api/.env.test.local

# Then:
poetry run pytest
```

`apps/api/.env.test.local` is gitignored and sets `DEMO_MODE=true` (no Google API
key needed, model calls return clearly-labelled canned output) and
`AI_RATE_LIMIT_ENABLED=false` (see below). It is created from the committed
`apps/api/.env.test.local.example`.

### Configuration

All backend test configuration lives in one place:
**`tests/automated/test_config.py`**. It resolves values in this order, first
match wins:

1. an explicit environment variable,
2. `tests/.env` (optional — see `tests/.env.example`),
3. `apps/api/.env` if present,
4. local-development defaults matching `supabase/config.toml`.

Test modules import from it rather than reading `os.getenv` themselves. Before
this module existed, roughly 54 test files each carried their own fallback of
`127.0.0.1:54321` and `localhost:8000` — Supabase's and FastAPI's *default*
ports. This project uses the `563xx` range, so those fallbacks pointed at
nothing and fixing one file did not fix the others.

If you change a port in `supabase/config.toml`, change it in `test_config.py`
and nowhere else.

### Why `AI_RATE_LIMIT_ENABLED=false`

The API limits each user to 10 AI requests per minute. The integration suite
issues far more than that from a single seeded user, so without this flag every
request after the tenth fails with 429 and the suite reports dozens of
misleading failures. The production default is unchanged (`10`/minute); the
flag only disables the check when explicitly set.

The one module that asserts rate limiting —
`tests/automated/test_rate_limiting_integration.py` — is skipped unless you ask
for it, because it needs the opposite server configuration:

```bash
# API started with AI_RATE_LIMIT_ENABLED=true (the default)
RUN_RATE_LIMIT_TESTS=1 poetry run pytest tests/automated/test_rate_limiting_integration.py
```

### DEMO_MODE and test expectations

Several tests assert on the *content* of real model output (SWOT terms, named
personas, specific recommendations). Under `DEMO_MODE=true` the agents return
canned output, so those assertions cannot pass regardless of correctness. Those
failures are expected in demo mode and are not test bugs. To exercise them for
real, set `DEMO_MODE=false` and provide `GOOGLE_API_KEY`.

The E2E specs of that kind are **skipped** rather than failed, so a red run means
something is actually broken. They are opt-in:

```bash
# API started with DEMO_MODE=false and a real GOOGLE_API_KEY
RUN_LIVE_MODEL_TESTS=1 npm run test:e2e --prefix apps/web
```

The gate lives in `apps/web/tests/helpers/liveModel.ts`. It applies only to specs
asserting on generated *content*; specs that merely need a chat to complete (SSE
framing, session creation, persistence) run fine under `DEMO_MODE` and must not
use it, or real regressions would be hidden. The backend equivalents are
`RUN_RATE_LIMIT_TESTS` and the quarantine gates below.

### Quarantined tests

`tests/automated/conftest.py` skips a known set of tests by node id, so the
default run is green without deleting them. Four opt-ins:

- **Live model** (`RUN_LIVE_MODEL_TESTS=1`, with `DEMO_MODE=false` and a key) —
  tests that assert on the *content* of real model output. Under `DEMO_MODE`
  the agents return canned text, so they cannot pass by design. Includes the
  agent content suites, and `test_structured_extraction_all_agents.py`, which
  gates itself with the same variable.
- **Live AAL2** (`RUN_MFA_AAL_TESTS=1`) —
  `test_mfa_aal_enforcement_live.py` logs in a seeded user against the running
  API and checks the gate rejects unauthenticated requests without blocking a
  user who has no MFA enrolled.
- **Stripe** (`STRIPE_SECRET_KEY` set) — `test_billing_router.py` makes real
  `stripe.checkout.Session.create` calls and fails with "No API key provided".
- **Stale** (`RUN_STALE_TESTS=1`) — tests known to be out of date against the
  current schema or seed (for example `test_personas_list_routed_integration.py`,
  `test_sme_e2e_workflow.py`, `test_sse_streaming_comprehensive.py`). These are
  test-quality debt, not infrastructure, and are the first thing to fix.

The skip lists are node ids, so a renamed test stops being skipped — which
surfaces as a failure rather than hiding one.

## All test commands

Run these from `apps/web`, or prefix with `--prefix apps/web` from the root.

| Command | Runs | When to use |
|---|---|---|
| `npm test` | Unit tests, once | The fastest check; run this first |
| `npm run test:unit:watch` | Unit tests in watch mode | While editing |
| `npm run test:unit:ui` | Vitest UI | Browsing results |
| `npm run test:coverage` | Unit tests + coverage | Before a release |
| `npm run test:smoke` | E2E login smoke path | Quick check that the stack works |
| `npm run test:e2e` | Every E2E spec, all browsers | Thorough, slow |
| `npm run test:e2e:ui` | Playwright UI | Debugging a spec |
| `npm run test:e2e:headed` | E2E in a visible browser | Watching behaviour |
| `npm run test:a11y` | Accessibility specs | Accessibility changes |

`npm test` deliberately means *unit tests*: they need no Supabase, no API and no
browser, so the default command is the one that always works. E2E is explicit
because it needs the full local stack.

## Web unit tests (Vitest)

```bash
npm test --prefix apps/web
```

Vitest is scoped by `include: ['src/**/*.test.{ts,tsx}']` in
`apps/web/vitest.config.ts`. That scoping matters: without it, Vitest's default
include also collects the Playwright specs under `apps/web/tests/` and tries to
run them as unit tests.

`jsdom` is a declared `devDependency`, alongside `@testing-library/*` and
`@vitest/coverage-v8`. Nothing needs installing by hand: `npm install` provides
the whole layer, devDependencies cost nothing at runtime, and they never reach
the production bundle. An earlier version of `src/test/README.md` asked each
developer to install the list manually, which is precisely how this layer ended
up configured but un-runnable — `environment: 'jsdom'` was set with jsdom in
nobody's `node_modules`.

All 60 unit tests pass. `CampaignDataEntryForm.test.tsx` was the last holdout:
its mock of the metrics hook was declared inside a test body, which Vitest
hoists to file scope, so a loading-state mock leaked into every test in the
file. The mock now sits at the top with the others, and the two tests that
assumed a native `<select>` address the component's own Select control instead.

## Web E2E tests (Playwright)

```bash
# The app under test must be reachable. Playwright starts Vite itself.
cd apps/web && npx playwright test --project=chromium
```

Two environment files are required, and both are gitignored:

- **`apps/web/.env`** — read by Vite for the running application. The README's
  `cp apps/web/.env.example apps/web/.env` is not sufficient on its own: the
  example ships `VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here`, and the
  app renders a blank page with a console error until that is replaced. Use the
  deterministic local values from `supabase/config.toml` and the `supabase
  start` output.
- **`apps/web/.env.test`** — loaded by `playwright.config.ts` at startup and
  read by the specs for credentials and org IDs. Create it from the committed
  template: `cp apps/web/.env.test.example apps/web/.env.test`. Every user it
  references must exist in `supabase/seed.sql`; all seeded users share the
  password `LocalDevOnly123!`.

Ports: Vite serves on `56310`, the API is proxied from `/api` to `56300`.

### Scope

`playwright.config.ts` excludes `**/archive/**` and `**/archived/**`. Of the 77
spec files on disk, **69 are live** and 8 are archived. Five browser projects
are configured (chromium, firefox, webkit, Mobile Chrome, Mobile Safari);
chromium is the sensible default locally.

This file is the single source of truth for how to run the tests. The 23
per-directory markdown files that used to sit under `apps/web/tests/` were
removed: they were dated working logs (migration progress, session summaries,
phase reports) that described ports and commands the project had since changed,
and they contradicted each other. They remain in git history if needed.


### The stale-port problem (fixed)

46 live spec files hardcoded `http://localhost:5173` — Vite's *default* port —
in 341 places, plus 17 references to `http://localhost:8000`, FastAPI's default.
Neither port is used by this project, so those specs could never have passed:
they failed with `net::ERR_CONNECTION_REFUSED` before reaching a single
assertion. All live specs now point at `56310` (frontend) and `56300` (API).

This is the same class of defect as the backend suite's hardcoded `54321`/`8000`
fallbacks: values copied from framework defaults rather than this project's
`563xx` range.

The fix moved these suites from "cannot connect" to "runs and asserts". Measured
effect on the auth suite: **13 pass / 11 fail**, where previously every spec
failed to load a page.

### Quarantined specs

The critical path is green on chromium: smoke plus the `user-journeys`,
`integration` and `multi-tenant` suites report 37 pass, 3 skip, 0 fail. Several
specs are quarantined because they assert UI which has since changed, not
because the app is broken; run them with `RUN_STALE_E2E=1`:

- `user-journeys/agency-client-routing.spec.ts` and
  `integration/agency-client-intelligence-tabs.spec.ts` — a rich client-switcher
  UI (dropdown, recent clients, search, breadcrumb banner) that the current
  client page does not have; it exposes a "Switch client" link instead.
- `user-journeys/sme-quick-start-5min-intelligence.spec.ts` — the old Quick Start
  *modal*; Quick Start is now a page reached from the Agents menu (`/quick-start`).
- `user-journeys/sme-first-time-user-complete.spec.ts` and
  `agency-first-time-user-complete.spec.ts` — assume the onboarding user has no
  business context on every run; the first test consumes it, so the file is not
  idempotent. The flows themselves are exercised by the manual run below.
- `multi-tenant/navigation-fix-validation.spec.ts` and
  `multi-tenant/schema-aware-router-hooks.spec.ts` — assert archived navigation
  and router behaviour that has been rewritten.

Three further tests inside `sme-intelligence-first-flow-2025-10.spec.ts` (IF3,
IF4, IF7) are marked `test.fixme`: they assert October-2025 marketing copy and
an old nav entry (`Outputs`, now `Library`).

### Manual verification (real model)

The first-run flows were also driven by hand against the live stack with a real
Gemini key, because several of the specs above could not be trusted:

- Signup provisioned a fresh organisation, a `public.users` profile and the
  `sme_owner` role (the signup trigger); business-context onboarding persisted to
  `core_business_data`.
- A real agent run completed a multi-turn tool loop (live `get_swot_analysis` and
  `get_porters_five_forces`) and rendered the analysis. This surfaced a crash —
  google-genai 2.x deep-copies the request config, and the tool callables are
  bound methods, so the copy hit the client's `RLock`
  (`cannot pickle '_thread.RLock' object`). `BaseGeminiAgent.__deepcopy__` fixes
  it; `tests/automated/test_agent_deepcopy_safety.py` guards it. `DEMO_MODE` never
  reaches the SDK, which is why only a live run found it.
- Progressive extraction fired on a data-rich conversation: business profile at
  0.85 confidence, metrics at 0.98, `learning_metadata` updated and outputs
  persisted.
- The agency client portfolio loaded and client context was preserved in the URL
  and breadcrumb.

The smoke path is verified green: both `tests/smoke` login specs pass against
the real stack.

## Setup verification

The seven documented setup steps in `README.md` have now been executed on this
working copy. Three genuine defects were found and fixed; the steps work as
written as of this commit.

1. **`apps/api/.env` was never read.** `main.py` called bare `load_dotenv()`,
   which searches upward from the *current working directory*. The documented
   command (`poetry run uvicorn ...` from the repository root) meant
   `find_dotenv()` returned `""`, so the file created by step 3 was silently
   ignored and the API died at import with
   `ValueError: SUPABASE_URL environment variable not set`. Fixed by loading
   `apps/api/.env` by explicit path.

2. **Step 3 produced a non-working config.** `apps/api/.env.example` shipped
   `SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"`. Because step 3 is a
   plain `cp`, the API started but every privileged Supabase call failed with
   `Expected 3 parts in JWT; got 1`. The example now contains the deterministic
   *local* service_role JWT (signed with the fixed local secret already present
   in the same file), with a comment to replace it for any real deployment.

3. **Step 7 ordered its two commands wrongly.** It started Vite and *then*
   created `apps/web/.env`. Vite reads env files at startup, so the website
   rendered a blank page with `Missing Supabase environment variables`. The `cp`
   now precedes `npm run dev`.

Also fixed: `apps/web/.env.example` shipped
`VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here` and
`TEST_EMAIL=test@example.com` (not a seeded user), so copying it produced a
blank page. It now carries the working local values.

Two collisions still must be handled by any *automated* fresh-clone verification:

1. **Ports.** A fresh clone's `supabase start` binds the same `563xx` ports as
   the development stack. Stop the dev stack first; do not run both.
2. **Container names.** A fresh clone reuses the same container names
   (`supabase_db_stratum`).

Any verification script should therefore stop anything on the relevant ports as
an explicit, visible step rather than silently racing the running stack.

## CI

`.github/workflows/ci.yml` defines four jobs. **It is disabled on this
repository**, so nothing runs automatically; re-enable it from Settings → Actions
(or `gh workflow enable CI`) if you want it back. The workflow is still the
reference for what to run locally.

| Job | What it runs |
|---|---|
| `leak-gate` | `scripts/oss/leak-gate.sh --tracked` — no credentials, machine paths or author identity in tracked files |
| `backend` | the hermetic modules named in the workflow; no Supabase, no API, no Postgres, no network |
| `web` | `vitest run` — every web unit test |
| `db` | starts Supabase, applies the migrations, and runs the RLS, privilege-contract and team-RPC tests against a real database |

The backend job runs with `SUPABASE_URL` and `API_BASE_URL` pointed at a **closed
port** (`127.0.0.1:9`) and `CLOUDSDK_CONFIG` at an empty directory, so a test that
starts depending on a live service — or on Application Default Credentials —
fails there rather than passing silently on a configured machine. That is what
caught `rag_service.py` constructing a Cloud Storage client at import time.

Run the same commands locally (earlier in this document). Note that
`supabase db advisors` is not a substitute for the `db` job: it does not inspect
policy expressions or column privileges.
