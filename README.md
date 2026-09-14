# STRATUM

A multi-tenant AI marketing-intelligence platform: nine specialised agents, an
agency client-scoped workspace, Row Level Security across two Postgres schemas,
and ten locales.

![The STRATUM dashboard, showing the intelligence briefing, readiness checklist
and agent activity](docs/screenshots/dashboard.png)

This is **v1, published as a reference implementation**. A later version is
developed privately and is not expected to resemble this codebase closely.

More on this, and the work around it, is at
**[chandlernguyen.com](https://chandlernguyen.com/)**.

## Running it

This is three things running together: a **website**, an **API**, and a
**database**. You run all three on your own machine. It takes about ten minutes,
most of which is one slow download.

There are two ways to do it. Take the first unless you want to see each command.

### The short way

```bash
scripts/bootstrap.sh
```

That checks the tools below, installs dependencies, creates both settings files,
starts the database, loads the demo data, starts the API and the website, and
waits until both answer. When it finishes it prints the URL and two accounts to
sign in with. It will not overwrite settings files you already have, so it is
safe to run again. Stop everything afterwards with `scripts/stop.sh`.

Nothing here needs an AI key or an account with anyone: the app starts in
`DEMO_MODE`, where the agents return clearly-labelled canned output instead of
calling a model.

If something is missing or already holding a port, run `scripts/verify-setup.sh`
on its own. It only inspects, and it says exactly what is wrong.

### The long way

Every command below is explained before you run it, so nothing is a black box.

### What you need first

| Tool | What it does for us | Where to get it |
|---|---|---|
| **Node.js 22** | Runs the website | [nodejs.org](https://nodejs.org) — take the LTS installer |
| **Python 3.12 or newer** | Runs the API | [python.org/downloads](https://www.python.org/downloads/) |
| **Poetry** | Installs the API's Python packages | [python-poetry.org](https://python-poetry.org/docs/#installation) |
| **Supabase CLI** | Runs the database on your machine | [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli/getting-started) |
| **Docker Desktop** | The database runs inside containers | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |

Check any of them by running its name with `--version`, for example
`node --version`. "command not found" means it is not installed yet.

**Docker Desktop must be open and running**, not merely installed. Leaving it
closed is the most common cause of a confusing failure two steps from now.

### About the settings file (worth reading once)

The API reads its configuration from `apps/api/.env`. You create that file in
step 3 by copying a template. The template ships with `DEMO_MODE="true"`, and
that is worth understanding:

**You do not need an AI key.** In demo mode the agents return clearly-labelled
canned text instead of calling a real model. You can click through every agent,
the agency client flows, and the language switcher without signing up for
anything, without a key, and without spending money.

When you want real AI later, open `apps/api/.env`, change `DEMO_MODE="false"`,
and add your `GOOGLE_API_KEY`.

### The seven steps

Run these from the folder you cloned into. Steps 1, 2 and 5 take a minute or two.
Step 4 is the slow one.

#### Step 1 — Install the website's packages

```bash
npm install
```

Downloads the JavaScript libraries the website needs into a folder called
`node_modules`. It installs the exact versions recorded in `package-lock.json`,
so you get the same result as everyone else, and finishes by reporting how many
packages it added.

It also runs three small postinstall scripts belonging to `esbuild` and
`@swc/core`, which set up the build tools. That is normal for those packages —
mentioned here so it is not a surprise.

#### Step 2 — Install the API's packages

```bash
poetry install
```

The same idea, for Python. It reads `pyproject.toml` and `poetry.lock` and
installs into a *virtual environment* — a private folder of packages that will
not interfere with anything else on your computer, and that you can delete
without consequence.

#### Step 3 — Create your settings file

```bash
cp apps/api/.env.example apps/api/.env
```

Copies the settings template to the real settings file. The `.example` version is
safe to read and to publish; the real file is ignored by git, so anything you put
in it stays on your machine. Open `apps/api/.env` in any text editor to look at
it.

#### Step 4 — Start the database  ⏱ *the slow one, first time only*

```bash
supabase start
```

Starts the database and the services around it as containers managed by Docker.
**The first run downloads several hundred megabytes of container images and can
take several minutes.** Later runs take seconds, because the images are cached on
your machine.

Leave this running. When it finishes it prints a table of URLs and keys. The line
you care about is labelled `API URL` on port `56321` — that is what the API
connects to.

If it appears to hang, that is almost certainly the download. If it fails
immediately, check that Docker Desktop is actually running.

#### Step 5 — Create the tables and load the demo data

```bash
supabase db reset
```

Builds the database structure from the layered migrations in
`supabase/migrations/`, then loads `supabase/seed.sql`: 27 demo accounts across
13 organisations, and some example campaigns. It prints its progress and ends
with `Finished supabase db reset`.

Safe to run again whenever you like. It rebuilds from scratch, which also makes it
the way back to a clean state if you change something and want to start over.

#### Step 6 — Start the API

Open a **new terminal window** and run:

```bash
poetry run uvicorn apps.api.main:app --reload --port 56300
```

This starts the backend on port 56300. `--reload` restarts it automatically when
you edit Python files, which is what you want while exploring. You should see a
line saying the application started.

**Leave this window open.** If you see `Address already in use`, something else is
already using port 56300.

#### Step 7 — Start the website

Create the website's settings file first. Vite reads it **at startup**, so if you
create it after starting the server the website renders a blank page with
`Missing Supabase environment variables` in the browser console:

```bash
cp apps/web/.env.example apps/web/.env
```

Then open a **second new terminal window** and run:

```bash
npm run dev --prefix apps/web
```

This starts the website on port 56310, and prints a line like
`Local: http://localhost:56310/`. **Leave this window open too.**

### Open it and sign in

Go to **<http://localhost:56310>**.

| Email | Signs you in as |
|---|---|
| `sme.owner@example.com` | a small business |
| `agency.owner@example.com` | an agency managing clients |

The password for both is `LocalDevOnly123!`.

Those accounts and that password exist only in the database you just created. They
are demo data, they never leave your machine, and they are not real accounts.

### When it does not work

Work down this list. Each check is one command.

**Is Docker running?** Open Docker Desktop and wait until it reports that it is.

**Is the database up?**

```bash
supabase status
```

Look for `API URL` and a healthy state. If it reports no containers, run
`supabase start` again.

**Are the tables there?** If step 5 did not finish, the API will fail with
confusing errors about missing tables. Re-run:

```bash
supabase db reset
```

**Is the API up?**

```bash
curl http://127.0.0.1:56300/api/v1/health
```

You should get JSON containing `"status":"ok"`. The same response reports whether
demo mode is on, which is the quickest way to confirm your settings file was read.

**Is the website up?** Open <http://localhost:56310>. If the page loads but
nothing works, the website probably cannot reach the API — check that
`apps/web/.env` points at `http://127.0.0.1:56300`.

**Is a port already in use?** `lsof -i :56300` (or `:56310`) tells you what is
holding it. Close that program, or change the port in both places.

### Stopping everything

Close the two terminal windows to stop the API and the website. To stop the
database containers:

```bash
supabase stop
```

Worth doing when you are finished rather than leaving it running — the containers
hold a meaningful amount of memory.

## What is in here

| Path | What it is |
|---|---|
| `apps/web` | React 19 + Vite frontend, ten locales |
| `apps/api` | FastAPI backend: agents, routers, services |
| `supabase/migrations` | Layered schema migrations, one concern per file |
| `tests/automated` | Backend test suite |
| `AGENTS.md` | Conventions for working in the tree, for humans and agents |
| `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md` | Design, threat model and test reference |

## The parts worth reading

If you are building something similar, these are the decisions that took the
most time to get right.

**Tenant isolation is a database concern, not an application one.** SME data
lives in `public`, agency data in `agency`, and Row Level Security decides what a
request can see. Writes go through `*_routed()` functions that detect the
organisation type and target the right schema, so no application code chooses a
schema. See `ARCHITECTURE.md`.

**Two RLS traps cost real debugging time, and both are silent:**

- *Materialized views cannot have RLS.* A `SELECT` grant on a matview returns
  every tenant's rows, whereas the same grant on a table is constrained by
  policies. Anything tenant-scoped that you materialize needs its grants
  revoked from browser-facing roles.
- *A client-side `org_id` filter is not a security boundary.* It runs in the
  browser. Row visibility must be enforced in the database or behind a
  server-side endpoint.

`tests/automated/test_rls_coverage.py` asserts both invariants across every table
and view rather than naming individual objects, because the failure mode is "a
new table forgot to enable RLS".

**The grants are as deliberate as the policies.** RLS decides which rows a
request sees; grants decide which operations and columns it can attempt at all.
Browser roles hold column-level `UPDATE` on the profile fields they edit and
nothing on `users.org_id` or the billing columns; `anon` can execute no function;
signup provisioning ignores a client-supplied `org_id` or `role`.
`tests/automated/test_tenant_privilege_contract.py` asserts this against a real
database.

**Agents stream, and the tool loop is manual.** Automatic function calling is
disabled deliberately so the streaming path stays under application control. That
means the application builds function-result parts itself, and on current Gemini
models those must carry the call id as well as the name — a missing id fails in a
way that looks like model flakiness rather than a configuration error.

**Progressively-loaded locale content.** Ten locales, each with its own routing
and a language switcher that persists across the authenticated app.

**`DEMO_MODE` is a first-class code path.** Making the application importable
without credentials required removing client construction from import time —
services hold a lazy `client` property rather than an eagerly-built client, so a
missing key surfaces at the point of use with a message that names the variable.

## Status and feedback

This is a reference implementation, not a product: there is no roadmap, no
release schedule and no support commitment. Read it, learn from it, fork it —
don't depend on it.

Feedback and bug reports are welcome, and a clear, reproducible report is more
useful than a fast one — though on an unmaintained project it may not be acted
on. It is published because a working multi-tenant agentic application is a more
useful artefact than an architecture diagram, and because the decisions that were
hard to get right are the ones worth sharing.

## Configuration

Everything user-facing is configurable, so a deployment does not inherit someone
else's branding or route support mail to them.

| Variable | Purpose |
|---|---|
| `DEMO_MODE` | Use canned model output; no API key needed |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | Real Gemini access |
| `GEMINI_THINKING_LEVEL` | `low` \| `medium` \| `high` — thinking tokens bill as output tokens |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database and auth |
| `FRONTEND_URL` | Origin used to build invitation links |
| `ALLOWED_ORIGINS` | CORS |
| `CONTACT_EMAIL`, `BRAND_NAME`, `SITE_URL` | Branding and the support address users are shown (the web app reads `VITE_`-prefixed equivalents) |

`apps/api/.env.example` and `apps/web/.env.example` document the rest, including
the per-user AI rate limit (`AI_RATE_LIMIT_REQUESTS` / `AI_RATE_LIMIT_WINDOW`)
and the optional Stripe, email and push integrations.

## Testing

```bash
# Web unit tests — no services or browser needed. The fastest check.
npm test --prefix apps/web

# Backend — needs Supabase running, and the API for the integration tests.
# DEMO_MODE returns canned model output, so no API key and no cost.
poetry run pytest

# Web end-to-end — needs the full local stack. Install browsers once:
npx --prefix apps/web playwright install
npm run test:smoke --prefix apps/web     # the login smoke path, quick
npm run test:e2e --prefix apps/web       # the live specs, chromium by default
```

`npm test` runs unit tests, not end-to-end. It needs nothing running, so it is
green on a fresh clone — that is why it is the default.

`poetry run pytest` is also green on a fresh clone with the local stack up. Tests
that need a live model, a Stripe key, or that are known stale are skipped by
default, each behind an opt-in environment variable; the same applies to the
materially-stale E2E specs (`RUN_STALE_E2E=1`). Nothing is deleted, so the debt
stays runnable — see `TESTING.md`.

`.github/workflows/ci.yml` defines those jobs — the hermetic unit layers and a
database job for the tenant-isolation tests — but it is **disabled on this
repository**. Run the commands above; the integration and E2E suites need Docker
and several minutes, so run them before a release.

**`TESTING.md` is the reference**: every command, what each layer covers, the
current measured pass counts, and what is deliberately not covered.

## Security

Read `SECURITY.md`. It documents the isolation model, the two traps above, what
self-hosters must review, and the known residual issues with their reasoning.

Two things to know before deploying anything built from this:

- **`supabase/seed.sql` creates accounts with known credentials.** It is for
  local development. Never run it against a deployed database.
- **`CONTACT_EMAIL` is what your users will be told to write to.** Set it.

## License

MIT. See `LICENSE`.
