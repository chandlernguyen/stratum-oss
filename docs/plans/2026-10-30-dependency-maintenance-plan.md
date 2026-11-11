# Dependency maintenance plan — stratum-oss

Date: 2026-10-30. Status: planned; no implementation started.
Observed Git HEAD: `efa0ad2`; this is a snapshot, not a clean-tree assertion.

## Outcome and observed setup

Frozen public reference repository: security/reference maintenance only unless the owner explicitly changes that policy.

**Observed sources:** `AGENTS.md`, `TESTING.md`, `.nvmrc`, `.python-version`, `package.json`, `package-lock.json`, `pyproject.toml`, `poetry.lock`, `Dockerfile`, `.github/dependabot.yml`, `.github/workflows/ci.yml`. Node 22, Python 3.13 selectors; Poetry Python ^3.12 and Docker Poetry 1.7.1. Dependabot Actions only. Docs say CI disabled, but a local workflow file cannot prove remote state.

Version values are declarations/documented baselines, not installed-version measurements or verified
latest releases. No active remote CI, bot installation, hosting settings or test success is inferred
from a local configuration file or its absence.

**Binding constraints:** No roadmap, support or production environment. The Dependabot comment cites failing tests, while current AGENTS/TESTING describe green defaults with quarantine: reconcile instead of declaring current failure. Do not enable broad workflows, live-model/Stripe suites or package bots as a side effect of maintenance.

## Execution contract

- Planning only: no upgrade, install, migration, remote app setup, branch-policy change or deployment
  has been performed. Commands below are inspected declarations or explicitly proposed checks, not
  passing results. Re-read current instructions and `git status` before implementation; preserve user work.
- For maintained code, target the latest stable compatible packages and newest supported runtimes;
  production Node uses supported LTS. Resolve versions from official sources at execution time, record
  compatibility and migration evidence, then commit tested tool selection and native resolution.
  Do not float execution on `latest`. Frozen and documents-only projects retain the exceptions below.
- Each tool has one authoritative selector. Validate any necessary dotfiles, containers, CI and hosting
  constraints against it. Keep the existing package manager; preserve its source-manifest conventions.
  Prefer exact tested runtime/tool pins or a supported lock mechanism and reproducible installs.
- One updater per dependency surface. Initially no automerge. Proposed routine cadence is daily
  discovery/weekly batches, up to three open routine PRs, grouping compatible coupled families under
  stricter repo rules. Direct-main projects use their instructed workflow. A release cooldown is optional,
  not proof of safety; urgent security fixes receive expedited review/testing.
- New PR checks must enforce meaningful required failures, use minimal permissions and isolate package
  scripts from production secrets/deployment authority. Review transitive graphs, scripts and workflow
  changes. Never blanket-approve install scripts or test against real production data/paid providers.
- Record baseline failures separately. A hold needs reason, owner (maintainer until assigned), upstream
  trigger and next review date (proposed within 30 days). Acceptance requires actual results and affected
  behavior, with independent review under local rules. Missing environments are explicit evidence gaps.
- Recovery restores only the coherent upgrade and its reviewed lock/resolution through the repo workflow;
  preserve unrelated edits. No destructive reset/cache deletion. A code revert cannot reverse a data or
  asset-format migration; those require a separately reviewed transition/recovery plan. Keep release gates.

## Tasks

This file owns task state for this maintenance scope. Existing unrelated plans retain their progress.
Tasks are pending; each task depends on its predecessor unless marked conditional. No dependency on
another repo's implementation is required for baseline discovery. Pilot shared bot policy in a healthy
repo before copying it here; extract a shared preset only after multiple successful adopters need one.

### T1 — Confirm freeze and reconcile stale baseline claims

- [x] Done (2026-11-11). Disposition: **frozen, security-only maintenance**. Evidence:
  - **Observed (read-only `gh api`):** remote workflow `CI` is `disabled_manually`; `Dependabot Updates`
    and `Dependency Graph` are active. Secret scanning, push protection and Dependabot alerts were
    enabled on 2026-11-11. The one secret alert (Google API key in
    `tests/automated/test_prompt_injection_defense_simplified.py:56`) is a synthetic test fixture;
    it awaits the owner's "Used in tests" resolution.
  - **Observed:** open Dependabot alerts are all `pip`: 10 critical, 60 high, 30 medium. The criticals
    are Pillow (fixed in 13.0.0, a major) and certifi (fixed in 2026.10.18, compromised emSign CAs).
    Local `npm audit` (root) reported 1 critical (`tar`), 37 high, 20 moderate, 2 low.
  - **Observed baselines (2026-11-11, `efa0ad2`, lockfiles installed unchanged):**
    - Web on Node 22.23.4 (`npm ci --ignore-scripts`): `npm test` 60/60 pass (5 files);
      `npm run build` succeeds (only a >1000 kB `vendor` chunk-size warning).
    - Backend on Python 3.13, Poetry 2.4.3, local stack + `db reset`, API in `DEMO_MODE` with
      `GOOGLE_API_KEY` exported empty: `poetry run pytest` **304 pass, 85 skip, 0 fail**. A first run
      had 1 failure (`test_marketing_strategy_save_multi_tenant.py::…::test_agency_save_with_client_id`)
      because the test shells out to a host `psql`, which this Mac lacks; with `psql` forwarded into
      the DB container it passes. Environmental, not a code regression.
  - **Derived:** the `.github/dependabot.yml` "known-failing" comment is stale; the default suites are
    green. `TESTING.md` counts (298/82) are also out of date against 304/85.
  - **Observed toolchain drift** (fixed in T2):
    - Supabase CLI 3.1.0 refuses `supabase/config.toml` (`[inbucket]` → `[local_smtp]`); the
      baseline used CLI 2.122.0.
    - `poetry.lock` is generated by Poetry 2.4.3, but `Dockerfile` pins Poetry 1.7.1 and uses
      `--no-dev`, which Poetry 2.x removed. T2 confirmed the build fails.
    - Backend tests need a host `psql`, which `TESTING.md` does not list as a prerequisite.
    - The mise default Node here is 26; the repo selects 22 (`.nvmrc`, `engines`).
  - Playwright E2E and the Docker build were run under T2.
- **Depends on:** None.
- **Scope/files:** Read AGENTS/TESTING and updater comments, inspect quarantine policy and local prerequisites; verify remote workflow state only through authorized read-only access when available.
- **Acceptance and verification:** Record frozen/security-only disposition and actual baseline evidence or explicit missing environment; distinguish stale comments from executed test outcomes.

### T2 — Reproduce the reference environment if maintenance is justified

- [x] Done (2026-11-11). Authoritative selectors kept: `.nvmrc`/`engines` (Node 22), `.python-version`
  (3.13), `poetry.lock` (Poetry 2.4.3). No mise file added; the existing selectors are enough.
  - **Observed:** `docker build` failed at `poetry install` (Poetry 1.7.1 rejects `package-mode`).
    Fixed: `Dockerfile` pins Poetry 2.4.3 and installs `--only main`. The image now builds and
    `/api/v1/health` returns 200 with `DEMO_MODE=true` and a runtime `SUPABASE_URL`.
  - **Observed security finding:** with no `.dockerignore`, `COPY . .` baked local `apps/api/.env`
    (a real key) into the image. The broken build had hidden this. Added `.dockerignore` excluding
    env files (examples/templates kept), `.git`, `node_modules`, caches; verified no local env file
    in the rebuilt image. The one local image that contained it was deleted; it was never pushed.
  - `supabase/config.toml`: `[inbucket]` renamed to `[local_smtp]` (same keys). Observed: CLI 3.1.0
    starts and resets the stack; CLI 2.122.0 parses it with no config warning.
  - `TESTING.md`: `psql` listed as a backend-test prerequisite; counts corrected (backend 304/85,
    E2E subset 39/3).
  - **Observed E2E:** smoke + user-journeys + integration + multi-tenant on chromium: 39 pass,
    3 skip, 0 fail. The full 615-spec chromium run was not completed (stopped at ~230 for time);
    that scope was never part of the recorded baseline.
- **Depends on:** T1; preserve its decisions and baseline evidence.
- **Scope/files:** Only for an agreed narrow update, identify authoritative npm/Poetry/runtime sources; propose mise selection if useful and keep source/container declarations compatible.
- **Acceptance and verification:** `npm test --prefix apps/web`, `npm run build --prefix apps/web`, local `poetry run pytest`, and affected `cd apps/web && npx playwright test --project=chromium` follow TESTING prerequisites/quarantine. No live paid or production environment is required.

### T3 — Keep a single scoped updater owner

- [x] Done (2026-11-11). Package automation declined: Dependabot stays the single updater, Actions
  only; no CI re-enabled. Package security is owned by the maintainer from Dependabot alerts, reviewed
  monthly (next review by 2026-12-11), landing narrow locally tested fixes. The stale "known-failing"
  comment in `.github/dependabot.yml` now states this policy.
- **Depends on:** T2; preserve its decisions and baseline evidence.
- **Scope/files:** Preserve Actions Dependabot coverage and frozen status. Decide explicitly whether package-security coverage is warranted; reconcile stale explanatory comments if changing that policy.
- **Acceptance and verification:** No overlapping bots or automatic CI reactivation. If package automation is declined, document the security-review owner/cadence; no unsupported claim that remote CI runs.

### T4 — Verify a narrow security/reference change

- [x] Done (2026-11-11). Group: HTTP and TLS, per the audit's grouping hint. `poetry update` of
  certifi 2026.1.4→2026.10.23, urllib3 2.6.3→2.8.0, requests 2.32.5→2.34.2, idna 3.11→3.20; lock
  diff touches only these four, content-hash unchanged, every file hash matched PyPI.
  - **Observed:** `emSign ECC Root CA - G3` is absent from the new bundle (only unaffected
    `emSign Root CA - G1` remains). `pip-audit` on the installed env: HTTP/TLS rows 13→0; total
    181→168. Backend 304/85/0, E2E subset 39/3/0, container healthy with the new versions.
  - **Holds** (owner: maintainer; next review by 2026-12-11; trigger: monthly alert review):
    Pillow 13 (major, alone), auth/crypto group (pyjwt, python-jose — critical with no fix, remove if
    unused — ecdsa, cryptography, pyasn1), web stack (starlette with fastapi, python-multipart, anyio,
    h2/hpack), and the npm `tar` critical.
  - **Independent review** (fresh-context, 2026-11-11): no Critical. One Required, fixed:
    `.dockerignore` now also excludes the other secret-shaped paths `.gitignore` covers
    (signing keys, `jwt_secret`, `.p8`/`.pem`, `.envrc`, `.mcp.json`, `.vercel`, `.run`,
    `.playwright-mcp`, Supabase CLI metadata); image rebuilt and re-verified. Optional, not taken:
    trimming non-API folders from the image for size.
- **Depends on:** T3; preserve its decisions and baseline evidence.
- **Scope/files:** If such maintenance is selected, update one coherent affected group and review lock/scripts/compatibility. Otherwise close execution with the frozen disposition.
- **Acceptance and verification:** Affected reference checks pass and `bash scripts/oss/leak-gate.sh --tracked` is run bare/unpiped before any later commit/push per repo rules. No deploy or product revival occurs.

## Guidance and handoff

Relevant official guidance checked during planning:
[mise CI](https://mise.jdx.dev/continuous-integration.html),
[Renovate mise support](https://docs.renovatebot.com/modules/manager/mise/),
[shared presets](https://docs.renovatebot.com/config-presets/),
[release-age limitations](https://docs.renovatebot.com/key-concepts/minimum-release-age/),
[GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use).
These establish tool capabilities, not evidence that remote configuration is installed or secure.

Next action: none in this plan; T1–T4 are done. The groups held under T4 were taken up and closed
in [2026-11-11-security-groups-plan.md](2026-11-11-security-groups-plan.md), which owns the
remaining holds. This plan alone authorizes no implementation, remote setup, spending or release.
Do not reopen old feature plans merely because they contain unfinished tasks.

## Planning review

Independent read-only review completed 2026-10-30 across all 17 repo plans: Ready within planning
scope; no Critical or Required findings. Review checked task ordering, destination scope, verification
requirements, direct-main rules, frozen/docs-only status, podcast policy tests and security boundaries.
Optional: shared execution boilerplate is longer than needed for frozen/docs-only repos; explicit
exceptions take precedence. Remote settings and current test outcomes remain unverified. Repository
tests/builds were not run; no implementation or deployment is approved by this planning verdict.

## Python audit input — 2026-11-11

Written from a separate machine-wide audit session; use it as input to T2–T4, not as a task result.

`pip-audit` 2.10.1, run on Python 3.14 against `poetry export --without-hashes --all-groups --all-extras`
of `poetry.lock` (`--no-deps --disable-pip`). An earlier run on Python 3.11 skipped every
`python_version >= "3.12"` line and wrongly looked clean; disregard any "0 vulnerabilities" result
from before this one.

181 advisories in 22 of 101 locked packages. Counts below are advisory entries per package, as
pip-audit reports them:

| Package | Locked | Advisories | Fixed in |
|---|---|---|---|
| pillow | 11.3.0 | 74 | 13.0.0 (a major) |
| pyjwt | 2.11.0 | 22 | 2.15.0 |
| python-multipart | 0.0.9 | 14 | 0.0.31 |
| cryptography | 46.0.4 | 13 | 50.0.0 |
| pyasn1 | 0.6.2 | 12 | 0.6.5 |
| starlette | 0.48.0 | 12 | 1.3.1 |
| urllib3 | 2.6.3 | 7 | 2.8.0 |
| ecdsa | 0.19.1 | 4 | 0.19.2 (the Minerva advisory has no fix) |
| certifi | 2026.1.4 | 2 | 2026.10.18 |
| python-jose | 3.5.0 | 1 (critical, GHSA-3qf3-8w2g-rqmx) | none; remove it if unused |

Also below their fixes: anyio, google-cloud-aiplatform, h2, idna, pygments, pytest, python-dotenv,
requests, dnspython, fsspec, hpack, multidict.

Grouping hint for T4: auth and crypto (pyjwt, python-jose, ecdsa, cryptography, pyasn1), web
stack (starlette with fastapi, python-multipart, anyio, h2/hpack), HTTP and TLS (urllib3,
requests, idna, certifi), and Pillow alone because it's a major upgrade. LiteLLM is not installed:
it appears only as an optional extra of `google-cloud-aiplatform`, capped below 1.97, so the
poisoned 1.107.0 release could not resolve.
