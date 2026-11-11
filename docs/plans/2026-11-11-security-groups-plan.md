# Security dependency groups — stratum-oss

Date: 2026-11-11. Status: **done** (executed 2026-11-11); commits `29886c1`..`987c310`, pushed to
`origin/main` 2026-11-11 (leak gate passed). Base: `origin/main` at `b62ffa0`.
Follows [2026-10-30-dependency-maintenance-plan.md](2026-10-30-dependency-maintenance-plan.md),
whose T4 listed these groups as held. This file owns task state for them.

## Dependabot follow-up — November 11, 2026

- **Observed:** GitHub still listed all 13 pasted alerts as open. The current
  `origin/main` lock already excludes `toml` (replaced by `smol-toml` through
  remark-mdx-frontmatter 6), and i18next-http-backend 4.0.10 exceeds the three
  patched versions, 4.0.2–4.0.4. Those 12 alerts disagree with the current graph;
  their eventual GitHub rescan/closure is **unknown**.
- **Changed:** root npm override scoped to typescript-estree's minimatch,
  9.0.9 → 11.0.8. ESLint's 3.1.5 remains unchanged. New transitive packages:
  nonrecursive-glob-match 1.1.0 and balanced-match 4.0.4; brace-expansion advances
  to 5.0.13. Lock entries are registry.npmjs.org URLs with integrity hashes,
  development-only, and have no install scripts. Installation disabled scripts.
- **Derived compatibility:** minimatch 11 removes makeRe, AST and several
  internal methods. The installed typescript-estree uses only the retained
  named minimatch function with `dot: true`. Its pattern inputs come from lint
  configuration. The override crosses the declared major range; revisit it when
  the consumer supports 11 directly. No runtime application code changed.
- **Observed checks:** `npm run test:dependencies` initially failed on locked
  minimatch 9.0.9, then passed all three checks after the update. The actual
  TypeScript parser accepts a matching default-project file and rejects an
  unlisted file. Node 22.23.4: web unit tests 60/60, production build passed.
  Full lint output is byte-identical before/after (158 existing errors, 1,409
  warnings). Final npm audit: zero vulnerabilities, including development
  dependencies. No Python, database, browser or deployment checks were needed
  for this lint dependency change.
- **Review:** a blind, fresh-context agent independently reviewed the complete
  diff and new test against HEAD `21b4f88`. No material findings. The reviewer
  independently passed all three dependency checks on Node 22.23.4 and 26.13.0,
  checked the installed graph and upstream advisory, and confirmed the consumer
  uses only the retained API. Audit, full lint comparison and web tests/build
  were not independently repeated; their results above are author-observed.
- **Delivery:** the owner authorized committing and pushing this follow-up.
  No alerts were dismissed, and no deployment or remote policy change was made.

## Outcome and scope

Clear the remaining high-value advisories in this frozen public reference repo **without reviving it
as a product**. That means removing what nothing uses, updating what is used, and changing nothing
else. The observed baseline is from `pip-audit` on the installed env after `b62ffa0`: 168 Python
advisory rows. They are pillow 74, pyjwt 22, python-multipart 14, cryptography 13, starlette 12,
pyasn1 12, ecdsa 4, python-jose 1 (critical, no fix), plus small residuals. `npm audit` (root lock):
1 critical (`tar`), 37 high, 20 moderate, 2 low.

**Out of scope:** feature work, refactors beyond deleting dead code that a removal requires,
re-enabling CI, enabling package bots, deploys, and Docker image publishing.

**Lenses applied to every task.** *Simplification:* deleting an unused dependency or dead path beats
upgrading it. *Security:* auth and request parsing get negative-case tests. *Review:* each group gets
one fresh-context review before commit.

## Grounding (observed 2026-11-11 unless labelled)

- **There are two JWT verifiers.** Every router imports `get_current_user_with_org` from
  `apps/api/auth/supabase_auth.py` (13 import sites), which uses **PyJWT**. `apps/api/main.py:317`
  defines a second `get_current_user_with_org` using **python-jose**
  (`from jose import jwt, jwk, JWTError` at `main.py:22`). Its only references are internal: it
  uses `get_jwks`/`jwks_cache` (`main.py:304–315`) and `JWKS_URL`/`AUDIENCE`/`ISSUER`
  (`main.py:88–90`). No module or test imports it, and there is no `dependency_overrides` use.
  **Derived:** it is dead code that shadows the real import. Blind spot: a string-based or dynamic
  reference would not show in grep. The full suite plus the E2E subset is the backstop.
  - *Correction:* the previous hand-off said python-jose was "never imported". That was a bad grep
    (`git grep -E` does not support `\s`). It is imported, but only by the dead path.
- **Pillow is unused.** It is declared at `pyproject.toml:40`, but nothing in the repo matches
  `PIL`/`Pillow` and no locked package depends on it. Blind spot: a lazy, optional import inside a
  dependency (for example an image helper in a Google SDK) would only fail at runtime on that path.
  The app passes no image objects (no `PIL` import exists to create them).
- **Removal dry run** (scratch copy, not the repo). Deleting `python-jose` and `Pillow` from
  `pyproject.toml` and running `poetry lock` (2.4.3) removes exactly `ecdsa`, `pillow`,
  `python-jose` and `rsa`. Nothing is added or changed. `pyasn1` stays, via `pyasn1-modules` and
  `google-auth`.
- **Upstream** (PyPI, 2026-11-11): PyJWT 2.15.1; cryptography 50.0.2 (major from 46); pyasn1 0.6.5;
  FastAPI 0.162.4 (requires `starlette>=0.46.0`); Starlette 1.10.0 (1.0.0 released 2026-03-22);
  python-multipart 0.0.33; sse-starlette 3.7.0 (requires `starlette>=0.49.1`, a major from the
  locked 2.4.1).
- **Locked web stack:** FastAPI 0.116.2 caps `starlette<0.49.0`, so the Starlette fixes force a
  FastAPI upgrade across many 0.x minors. `python-multipart = "^0.0.9"` is a caret on 0.0.x, which
  admits only 0.0.9, so the manifest itself must change. Starlette is used directly only in
  `apps/api/middleware/locale.py` (`BaseHTTPMiddleware`, `Request`, `Response`). No `on_event`,
  `on_startup` or `TemplateResponse` usage was found. Uploads go through
  `routers/direct_agents.py:564` and `routers/documents_v2.py:140`.
- **npm:** `tar` 7.5.7 is dev-only, required by `@mapbox/node-pre-gyp` and `@vercel/fun` under the
  root devDependency `vercel ^50.4.8`. No script or package.json script invokes the Vercel CLI.
  It is mentioned only in docs: `apps/api/CONFIG.md:123–124` and `SECURITY.md`; `apps/web/vercel.json`
  is hosting config, not the CLI. Direct vulnerable packages: `vercel` (fix is a major), `vite`
  7.x (high, fix within 7), `zod` (high, fix within ^4), `vitest` + `@vitest/*` (moderate), and
  majors only for `typescript-eslint`, `i18next-http-backend` and `remark-mdx-frontmatter`.
- **Existing auth tests** (`tests/automated/test_supabase_auth_config.py`): the known local secret
  is rejected, the issuer is pinned, there is no hard-coded anon key, the bearer token is not
  logged, and the JWT secret has no default. **Gap:** no tests for an expired token, wrong
  audience, a tampered signature, `alg: none` or HS/ES algorithm confusion, or the ES256/JWKS path.

## Execution contract

- **Environment:** the same as the previous plan's T2, with these recorded selectors and tools:
  - Node 22.23.4 and Poetry 2.4.3 (matching `.nvmrc` and the `poetry.lock` generator).
  - Supabase CLI 3.1.0 (`supabase start`, local `db reset`), with
    `DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`.
  - API started per `TESTING.md` with `DEMO_MODE=true` and `GOOGLE_API_KEY` exported empty.
  - `psql` on `PATH` (TESTING.md).
- **Standard checks per group, each with expected evidence:**
  - `poetry run pytest`: 304 pass / 85 skip / 0 fail, or more passes if tests are added.
  - `npm test --prefix apps/web` (60 pass) and `npm run build --prefix apps/web`.
  - E2E subset: `npx playwright test --project=chromium tests/smoke tests/user-journeys
    tests/integration tests/multi-tenant` (39 pass / 3 skip).
  - Docker build from the repo root, then `/api/v1/health` 200 with no local env file in the image.
  - `pip-audit` / `npm audit` before and after, showing the targeted rows gone.
  - Run only the checks the group can affect; for example an npm-only group skips Docker.
- **Completion standard** (AGENTS.md and global rules, not restated per task): every behaviour change
  ships with a test; one independent review per group; `bash scripts/oss/leak-gate.sh --tracked` run
  bare before each commit; Conventional Commits, one commit per group. **Push needs the owner's go
  for each run.** The earlier "commit and push" covered that change set only.
- **Recovery:** every task is a manifest/lock change plus code deletion, with no data or schema
  migration, so `git revert <commit>` fully restores it. Never push a lock that was not installed
  and tested locally.

## Tasks

### S1 — Single JWT verifier on current PyJWT; python-jose gone

- [x] Done — `29886c1`, follow-up `fb9c76a`. Observed:
  - 12 characterization tests passed on PyJWT 2.11. Four mutations (dropping the audience, signature
    or expiry check, and accepting HS256 off-local) each turned the matching test red.
  - Dead `main.py` verifier deleted (72 lines); pyflakes is clean.
  - Lock: −python-jose, −ecdsa, −rsa; pyjwt 2.15.1, cryptography 50.0.2 (changelog checked: no
    removed API in use), pyasn1 0.6.5.
  - Backend 316/85/0; E2E 39/3; Docker healthy.
  - **Resolves the earlier unknown:** local Supabase CLI 3.1.0 issues **ES256** tokens with a
    `kid`, so the E2E logins exercised the JWKS path.
  - Review: no Critical or Required. Optional, taken: removed a local unsigned-token test that
    passed for the missing `kid` (`fb9c76a`). Optional, not taken: assert `detail` text as well
    as 401.
- **Outcome:** one verifier (`auth/supabase_auth.py`, PyJWT ≥ 2.15.1) with negative-case tests;
  python-jose, ecdsa and rsa out of the lock; cryptography and pyasn1 on fixed versions.
- **Steps:**
  1. **Characterization tests first**, in `tests/automated/test_supabase_auth_config.py` (existing
     file) or a proposed `test_jwt_verification.py`, against `SupabaseAuth.verify_jwt_token`:
     - Valid HS256 token with a test secret → payload.
     - Expired token → rejected.
     - Wrong `aud` → rejected.
     - Wrong `iss` → rejected (already covered: extend it, don't duplicate).
     - Tampered signature → rejected.
     - `alg: none` → rejected.
     - On the ES256 path, an HS256 token → rejected.
     - ES256 with a test-generated EC key served through a mocked JWKS fetch → accepted, and an
       unknown `kid` → rejected.

     These are expected to **pass** on PyJWT 2.11 (no behaviour change is intended). Prove they can
     fail: in scratch, delete the `audience=` argument and drop `algorithms` pinning, and confirm
     the corresponding tests go red. Then restore.
  2. Delete the dead verifier in `main.py` (line 22 import, `get_jwks`/`jwks_cache`, lines 317–361,
     and `JWKS_URL`/`AUDIENCE`/`ISSUER` plus `OAuth2PasswordBearer` if they have no other user).
     Delete; do not comment out.
  3. Remove `python-jose` from `pyproject.toml`. Raise the floor to `pyjwt = "^2.15.1"`. Set
     `cryptography` to its fixed release and `pyasn1` ≥ 0.6.5 (a transitive pin via `poetry update`
     is enough). Then run `poetry lock`, followed by `poetry update pyjwt cryptography pyasn1`.
- **Decision point:** cryptography 46 → 50 is a major. Read its changelog for removed APIs used by
  PyJWT, google-auth or supabase. If anything breaks, ship S1 with cryptography at the highest
  passing release and hold the rest with a dated reason.
- **Acceptance:**
  - `git grep -n "jose"` finds nothing outside the npm lock.
  - The app imports.
  - The new tests pass, along with the standard backend suite, the E2E subset (login paths) and the
    Docker smoke.
  - `pip-audit` shows no rows for pyjwt, python-jose, ecdsa, rsa, pyasn1 or cryptography, or else
    a recorded hold.
- **Risk:** auth is the tenant boundary. The E2E subset logs in seeded SME and agency users, and
  that run is the end-to-end proof. Local Supabase may sign tokens HS256 or ES256 depending on CLI
  defaults, so record which path the E2E run exercised (**unknown** today).

### S2 — Remove unused Pillow

- [x] Done — `023dd9c`. Observed:
  - The lock diff removes only `pillow`. Remaining mentions are optional extras of the Google SDKs,
    which are not enabled.
  - Backend 316/85/0; Docker healthy; pillow rows 74→0.
  - E2E: one run had CP2 time out waiting for the Content Agent heading (frontend). It passed 3/3
    on repeat and the full subset passed (39/3), so it is recorded as an intermittent flake.
  - Review: clean. **Depends on:** none (independent of S1; order is for review load only).
- **Outcome:** Pillow out of `pyproject.toml` and the lock, clearing 74 advisory rows with no
  upgrade.
- **Steps:** re-run the usage search (`git grep -n -w -E "PIL|Pillow"`, plus `importlib`/`__import__`
  string use). Remove the line, run `poetry lock`, then `poetry sync`.
- **Decision criterion:** if any real use turns up, stop. Pillow 13 becomes its own major-upgrade
  task, with a test of that image path.
- **Acceptance:** the lock diff removes only `pillow`. The standard backend suite, the Docker build
  and smoke all pass, and `pip-audit` shows no pillow rows.

### S3 — Web stack on fixed Starlette, FastAPI and python-multipart

- [x] Done — `0f59ca5`. **S3a result:**
  - Read FastAPI's breaking changes for 0.117–0.162 and Starlette's 1.0 removals. None of the
    removed APIs are used; `@app.middleware` and `@app.exception_handler` still exist on
    FastAPI's app class.
  - sse-starlette 2.4.1 kept: it imports no removed Starlette API.
  - No code edits were needed.

  **S3 result:**
  - Four multipart tests added first (`tests/automated/test_upload_multipart.py`).
  - FastAPI 0.162.4, Starlette 1.10.0, python-multipart 0.0.33; anyio, h2 and hpack follow.
    `annotated-doc` and `opentelemetry-api` added as FastAPI requirements.
  - Backend 319/85/0; E2E 39/3; Docker healthy; web-stack rows 0.
  - Review: no Critical or Required.
  - **Holds:**
    - `Query(regex=)` → `pattern=` at `routers/insights.py:97,98,639` (deprecated, still accepted).
    - No browser upload check was run. `FileUploadButton.tsx:89` sets the multipart header by hand;
      this is pre-existing, and a manual upload check would close it.
- **S3a (investigation; can start any time):**
  - Read the FastAPI release notes from 0.116 to 0.162 and Starlette's 1.0 migration notes.
  - Check them against actual usage: `BaseHTTPMiddleware` in `middleware/locale.py`, the
    `UploadFile`/`Form` endpoints, SSE via `sse-starlette`, the lifespan pattern in `main.py` and
    the exception handlers.
  - Decide whether sse-starlette 2.4.1 works on Starlette 1.x or needs 3.x (a major; inspect its
    changelog).
  - **Decision:** list each required code change. If any needs more than a mechanical edit, split
    it into its own task before S3 starts.
- **Steps (S3):**
  1. Add the missing tests first:
     - Multipart upload accepted for a small TXT file on one upload route.
     - Oversized or malformed multipart → 4xx, not 500.
     - SSE framing already has tests (`test_sse_streaming_comprehensive.py`, partly quarantined);
       make sure at least one non-quarantined SSE test covers framing.
  2. `python-multipart = "^0.0.33"` in `pyproject.toml`.
  3. Bump FastAPI to the newest release whose Starlette range admits ≥ 1.3.1, together with
     `starlette`, `sse-starlette` (if S3a says so), `anyio`, and `h2`/`hpack` (through httpx).
  4. Apply only the edits S3a listed.
- **Acceptance:** the new tests pass, along with the standard backend suite and E2E subset (chat
  streaming flows) and the Docker smoke; `pip-audit` shows no rows for starlette, python-multipart,
  anyio, h2 or hpack.
- **Risk:** highest of the groups. Many 0.x minors and a Starlette major carry behaviour changes in
  validation and error responses. If the suite turns up incompatibilities S3a didn't predict,
  revert to the S2 state and re-plan rather than patching on the fly.

### S4 — npm dev toolchain: remove the unused Vercel CLI, patch in-range packages

- [x] Done — `32c64da`. Observed:
  - Vercel CLI removed (243 packages).
  - Updated: vite 7.3.8, vitest family 4.1.12, zod 4.6.7; follow-redirects, source-map-js,
    brace-expansion and undici patched.
  - Lock vs HEAD: 0 packages added, no new install scripts, every resolved URL on
    registry.npmjs.org.
  - npm audit: 1 critical / 37 high / 20 moderate / 2 low → 0 / 2 / 7 / 1.
  - npm 10.9.9 crashes on this update (arborist `edgesOut` of null), so the lock was written with
    npm 12.2.2. npm 10's `ci` and `install` both leave it byte-identical.
  - Web unit 60/60; build OK; E2E 39/3. Review: clean.
  - **Holds:**
    - `remark-mdx-frontmatter` 5→6 (major; clears the last two highs via `toml`).
    - `typescript-eslint` and `i18next-http-backend` majors (all three are used).
    - The stale tracked `apps/web/package-lock.json`. It is unused by the workspace, but GitHub
      raises about 25 Dependabot alerts on it, and a fork deploying `apps/web` as its Vercel root
      could install from it. **Resolved:** the owner chose deletion; removed in `d980e69` (pushed).
      Root `npm ci`, web unit tests 60/60 and the build all pass without it.
- **Assumption (reversible, recommended):** remove root devDependency `vercel`. Nothing invokes it,
  the repo is frozen with no deploy, and anyone deploying can use `npx vercel` / a global CLI as
  `apps/api/CONFIG.md` already implies. That clears `tar` and the Vercel-rooted highs. The
  alternative is upgrading `vercel` 50 → ≥ 66 (a major) to keep it installed; choose that only if
  the owner wants it in the lock.
- **Steps:**
  1. Edit root `package.json` and run `npm install` to regenerate `package-lock.json`.
  2. `npm update vite zod vitest @vitest/coverage-v8 @vitest/ui --prefix apps/web` within existing
     ranges (`vite ^7.1.2`, `zod ^4.1.5`, `vitest ^4.0.18`).
  3. Check whether `remark-mdx-frontmatter`, `typescript-eslint` and `i18next-http-backend` are
     used. Remove whatever isn't; leave majors for used ones as a recorded hold.
  4. Use `npm ci --ignore-scripts` for verification installs. Review any lifecycle scripts the new
    lock introduces before allowing them.
- **Acceptance:** the lock diff is confined to the named packages and their subtrees. `npm test`
  (60), the build, and the E2E subset (vite dev server) all pass. `npm audit` shows 0 critical,
  with highs reduced and the remainder listed with reasons.

### S5 — Residual minor batch (optional)

- [x] Done — `7d3ec27`, `987c310`.
  - multidict 7.2.1 has its own commit because it is a major. yarl is its only dependent; no
    `istr` subclassing.
  - `google-cloud-aiplatform` removed. It is unused, and on Python 3.13 it resolved to 1.91.0,
    whose fix conflicts with our `google-genai`/`google-cloud-storage` ranges. Its removal drops
    six packages only it needed (including numpy and shapely).
  - Updated: python-dotenv, pygments, fsspec, dnspython.
  - pytest 9.0.3, held on `~9.0.3`: pytest 9.2 broke collection of all 77 modules under
    pytest-asyncio 0.21 (observed).
  - Backend 319/85/0; E2E 39/3; Docker healthy; **pip-audit 0 rows**.
  - One run had a single ConnectionRefused to the local API that passed 3/3 alone and in a full
    rerun; the cause is unknown and the server did not restart.
  - Review: clean.
  - **Hold:** pytest-asyncio 0.21 → 1.x (major, 42 async test sites). After it lands, drop the
    `pytest = "~9.0.3"` pin.
- **Scope:** `poetry update` within existing ranges for python-dotenv, pytest, pygments,
  google-cloud-aiplatform, multidict, fsspec and dnspython. Close if they're all already fixed by
  then.
- **Acceptance:** the standard backend suite, and `pip-audit` showing only recorded holds.

### S6 — Close out

- [x] Done, except the post-push alert check.
  - Before the push, `gh api` showed 293 open Dependabot alerts against `origin/main`. They
    predate this run, and even `b62ffa0`'s certifi/urllib3 fixes still showed as open.
  - **Remaining:** after pushing, re-list the alerts. Expect only the stale `apps/web` lock and the
    held npm majors. Next monthly review: by 2026-12-11.
- Update the previous plan's T4 hold list to point here. Set the next monthly review date. Confirm
  Dependabot alert counts on GitHub match local audits; any alert still open needs a recorded
  reason. Read-only `gh api` only.

## Order and next step

Recommended order: **S1 → S2 → S4 → S3a → S3 → S5 → S6.** S1 comes first because auth is the
highest-consequence surface and it carries the python-jose critical. S2 and S4 are cheap deletions
that clear most of the remaining volume (74 pillow rows; the npm critical). S3 goes late because it
is the only group with real migration risk, and S3a's findings may reshape it.

**Next executable task:** S6's post-push alert check. Right after the push, GitHub had not rescanned
(the counts were unchanged). Holds are listed under
S3, S4 and S5. Owner decisions still open:
S4's Vercel CLI removal (the recommended assumption above), and push authorization for each group.
This plan authorizes no implementation, push, deploy or remote setting change.

## Held items — executed 2026-11-11

All verified on the final commit `fd6f2d7`: backend 323 pass / 85 skip / 0 fail; web unit 60/60;
build OK; E2E subset 39/3; Docker healthy; `pip-audit` 0; `npm audit` 0 critical, 0 high,
7 moderate; `npm audit --omit=dev` 0. Each commit had an independent review with no Critical or
Required findings.

- [x] `regex=` → `pattern=` in `routers/insights.py` — `4515dc7`, `995590f`. The deprecation test
  failed first, then passed; rejections are pinned to `string_pattern_mismatch`.
- [x] pytest-asyncio 0.21 → 1.4.1; pytest pin dropped (pytest 9.2.0) — `376dadf`, `995590f`.
  - Per-file pass/skip outcomes are identical before and after.
  - With warnings enabled (`-o addopts="" -W default`), the suite shows 0 unawaited or unhandled
    coroutines. The earlier check under `--disable-warnings` proved nothing.
  - `asyncio_default_fixture_loop_scope = "function"` set.
- [x] i18next-http-backend 3 → 4 — `85ac331`. Drops cross-fetch and node-fetch. Observed in a
  browser: `/vi/login` and `/ja/login` render their translations, and every `/locales/*.json`
  request returned 200.
- [x] remark-mdx-frontmatter 5 → 6 — `88403cc`. `toml` is replaced by `smol-toml`. No MDX files
  exist yet, so a scratch compile of YAML and TOML frontmatter through the `vite.config.ts` plugin
  chain is the evidence. `SECURITY.md` updated to match — `fd6f2d7`.
- [ ] **typescript-eslint — held, no upstream fix.** The advisory is in `minimatch` (fixed in
  ≥ 11.0.1), and every typescript-eslint release, the latest (8.72.2) included, requires
  `minimatch ^9`. It is dev-only lint tooling, so an override across two majors is not justified.
  Revisit when upstream moves.
- [x] **Browser upload check.**
  - Observed in the real UI: `FileUploadButton` sends `multipart/form-data` with a boundary.
  - The server parses the file and passes its type and size validation.
- **New finding, pre-existing, not fixed (out of scope):**
  - The upload route builds `genai.Client(api_key=GOOGLE_API_KEY)` directly
    (`routers/direct_agents.py`, around line 644) instead of using the demo-aware client.
  - Under `DEMO_MODE`, an upload therefore still needs, and with a key set would call, the real
    Gemini Files API.
  - With the key empty it fails locally with a sanitized 400. The fix belongs in a separate,
    tested change.
