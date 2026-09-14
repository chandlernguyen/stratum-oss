# Repository Guidelines

## What this is

STRATUM v1, published as a reference implementation: a multi-tenant AI
marketing-intelligence app — nine Gemini agents, an agency client-scoped
workspace, Row Level Security across two Postgres schemas, ten locales. Read
`README.md` to run it and `ARCHITECTURE.md` for the design.

It is frozen. There is no roadmap and no support commitment; fork it rather than
depend on it. When a plan, comment or doc conflicts with the code, the code wins.

## Layout

- `apps/api` — FastAPI. `routers/` (HTTP), `agents/` (nine agents and their
  tools), `services/` (context, caching, extraction), `middleware/`, `config/`.
- `apps/web` — React 19 + Vite SPA. `pages/`, `components/`, `hooks/`, `stores/`,
  `config/` (routes, pricing).
- `supabase/migrations` — the schema, layered one concern per file; see its
  README. `supabase/seed.sql` — local demo data.
- `tests/automated` — backend suite. `apps/web/src/**/*.test.tsx` — web unit.
- `scripts/` — bootstrap, stop, i18n tooling and the leak gate.

## Commands

Ports are the project's own `563xx` range: API `56300`, web `56310`, Supabase
`56321`.

```bash
scripts/bootstrap.sh          # whole stack + demo data, prints the logins
supabase start && supabase db reset
poetry run uvicorn apps.api.main:app --reload --port 56300
npm run dev --prefix apps/web
```

`DEMO_MODE` is on by default: the agents return canned output, with no key and no
cost.

## Architecture essentials

- **Two schemas.** SME data lives in `public`, agency data in `agency`. Writes go
  through `*_routed()` database functions that choose the schema from the caller's
  organisation type — do not duplicate that choice in application code.
- **Row Level Security is the isolation boundary.** Every table in an exposed
  schema has it enabled. Materialised views cannot have RLS, so anything
  tenant-scoped that is materialised has its browser-role grants revoked. A
  client-side `org_id` filter is not a boundary.
- **Agents stream with a manual tool loop.** Automatic function calling is off on
  purpose; function-result parts must carry the call id as well as the name.
- **Services build clients lazily.** That is what lets the app import and start
  without credentials, and what makes `DEMO_MODE` possible.
- **Ten locales.** Routes are locale-prefixed and the locale travels to the API in
  the `X-Locale` header.

Never trust a client-supplied `org_id` or `role`: derive identity from the session
(`auth.uid()`), and keep the service role server-side.

## Principles

Write the failing test first, watch it fail, then make it pass. Every behaviour
change ships with a test; in this repository the tests are the documentation of
intent.

Prefer the least code that solves the problem. No speculative abstraction, no
configuration for a need that is not here. Delete rather than comment out — git
remembers. When a file stops fitting in one reading, that is the signal to split
it.

For the interface: **progressive disclosure** — start from the smallest useful set
of choices and reveal more only when the user asks for it. **Less is more**;
typography, spacing and rhythm carry hierarchy before borders and colour do. Copy
should be calm, specific and credible, not hyped. Use the design tokens rather
than one-off values, and keep controls accessible — a label should be associated
with the input it names.

## Testing

```bash
npm test --prefix apps/web        # unit; needs nothing, green on a fresh clone
poetry run pytest                 # needs Supabase; green by default
```

Tests that need a live model, a Stripe key, or that are known stale are skipped
by default, each behind its own opt-in variable — see `TESTING.md`. Add a
non-hermetic test to that quarantine rather than leaving it red.

## Security

Never commit secrets. `.env` files are ignored and the `.env.example` templates
document the shape. Run `bash scripts/oss/leak-gate.sh --tracked` before pushing;
it is also a CI job. `supabase/seed.sql` creates accounts with known credentials
and is for local use only.

## Gotchas

- The API loads `apps/api/.env` by explicit path, not by walking up from the
  working directory.
- Vite reads `apps/web/.env` at startup, so create it before `npm run dev`.
- Local Supabase uses the `563xx` ports, not its defaults.
- Backend tests that touch the database need the stack up; they do not degrade
  gracefully.

## Commits and pull requests

Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), short and
imperative. Keep the diff focused and add a test with any behaviour change.
Larger features are unlikely to be merged — forking is the better path.
