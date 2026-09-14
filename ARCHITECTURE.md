# Architecture

How this system is put together, and why. Read `README.md` first for what the
project is; this file is the design.

## Shape

Three tiers, plus the database.

```
apps/web   React 19 + Vite SPA
             │  X-Locale header, Supabase session
             ▼
apps/api   FastAPI
             ├── routers/      HTTP surface
             ├── agents/       nine specialised agents
             └── services/     context, caching, extraction
             │
             ▼
supabase   Postgres + Auth (GoTrue) + Data API (PostgREST)
             ├── public   SME data
             └── agency   agency data
```

The backend talks to Postgres through PostgREST via `supabase-py`, not through a
direct database connection. That choice has consequences: every query is an HTTP
call with row-level security applied to the caller's token, which is what makes
per-request tenant isolation automatic rather than something application code has
to remember.

## Multi-tenancy

This is the part worth understanding, because everything else is arranged around
it.

**Two schemas.** SME data lives in `public`; agency data in `agency`. They have
parallel structures rather than a shared table with a discriminator column. That
duplication is deliberate: agency and SME entities diverged enough that a shared
table accumulated nullable columns and conditional constraints.

**Writes go through routed functions.** Rather than application code deciding
which schema to touch, it calls a `*_routed()` database function, which inspects
the caller's organisation type and dispatches:

```python
supabase.rpc("create_campaign_routed", {...})
```

The routing decision lives in one place, in the database, where it can be tested
and where it cannot be bypassed by a new code path that forgot to check.

**Row Level Security is the boundary.** Every table in an exposed schema has RLS
enabled. Policies constrain rows by `auth.uid()` and organisation membership. The
service role bypasses RLS and is used server-side only.

**Two traps, both silent:**

*Materialized views cannot have RLS.* A `SELECT` grant on a matview returns
every tenant's rows; the same grant on a table is constrained by policies. This
is easy to miss because the grant looks identical. Anything tenant-scoped that
gets materialized needs its grants revoked from browser-facing roles — not just
"protected by RLS", because RLS is not available there.

*A client-side `org_id` filter is not a boundary.* It runs in the browser and can
be removed. Visibility must be enforced in the database or behind a server-side
endpoint.

Both are guarded by `tests/automated/test_rls_coverage.py`, which asserts the
invariants across every table and view rather than naming particular objects.

## The agents

Nine active agents, each a subclass of `BaseGeminiAgent`:

| Agent | Role |
|---|---|
| `quick_start` | Onboarding: consolidates strategy, persona and marketing strategy |
| `strategy` | Business analysis across eleven frameworks |
| `persona` | Customer profiling and interview simulation |
| `marketing_strategy` | Bridges personas to channel and messaging plans |
| `content` | Brand-aware content generation |
| `performance_intelligence` | Analytics, ROI and budget optimisation |
| `competitive_intelligence` | Competitor analysis |
| `client_success` | Agency client health |
| `campaign_planning` | Campaign plan generation |

`analytics`, `roi_budget` and `quick_wins` were consolidated into
`performance_intelligence` and removed. Existing sessions still reference their
output types, but they are no longer reachable as agents.

Agents share a system-prompt structure, a tool registry and progressive
context. What differs is the prompt, the tools and the output schema.

## Streaming and the tool loop

Agents stream responses over server-sent events. The flow is:

1. The client POSTs to `/api/v1/direct-agents/{agent}/chat`.
2. The backend calls the model with `generate_content_stream`.
3. Text chunks are yielded as SSE events as they arrive.
4. If the model requests a tool, the tool runs and its result is appended to the
   conversation, then the loop continues.

**Automatic function calling is disabled deliberately**, in favour of a manual
loop, so that streaming and tool execution stay under application control. The
cost is that the application must build function-result parts itself. On current
Gemini models those parts must carry the **call id** as well as the function
name; omitting it produces a failure that presents as model flakiness rather than
a schema complaint. `build_function_response_part()` exists as a named, tested
unit for exactly that reason.

The loop is bounded by `MAX_TURNS` so a model that keeps calling tools cannot run
indefinitely.

## Progressive context

Each agent is given business context assembled from prior sessions: extracted
business profile, metrics, personas, and strategy outputs. Extraction runs
asynchronously after a conversation rather than blocking the response, so the
user is not waiting on it.

The extracted context is filtered by confidence and rate-limited, so a short or
low-signal conversation does not trigger an expensive extraction pass. Context is
cached (including provider-side caching) because it is largely stable per
organisation and would otherwise be re-sent on every turn.

## Localization

Ten locales: `en`, `vi`, `es`, `fr`, `ja`, `ko`, `zh-CN`, `de`, `pt-BR`, `zh-HK`.

Public and authenticated routes are locale-prefixed. The locale is propagated to
the API with an `X-Locale` header so error messages and generated metadata match
the interface language. Translation namespaces are loaded lazily rather than
bundled, because ten locales of a large UI is not something to ship in the entry
chunk.

Brand and contact values available to translations are injected as i18next
`defaultVariables`, so locale files reference `{{contactEmail}}` rather than
hardcoding one operator's address — a template that hardcodes a support address
routes other people's users to it.

## Configuration over construction

Services hold a lazy `client` property rather than building a Gemini client in
`__init__`. This is not stylistic: several services are instantiated at module
import via module-level singletons, so eager construction made **importing the
application** require an API key. The failure surfaced as an opaque SDK error
before the app could start.

Importing is now free, and a missing key fails at the point of use with a message
naming the variable. That is also what makes `DEMO_MODE` possible.

## Tradeoffs, and what I would do differently

**Two parallel schemas duplicate a lot of DDL.** It buys clean data separation
and simpler policies. With hindsight the duplication cost more in maintenance
than the discriminator column would have, though the isolation is genuinely
cleaner.

**Manual function calling is a lot of code.** It was chosen for streaming
control. If streaming-with-tools is available through a higher-level API, that
trade is worth revisiting.

**The migration chain reached 321 files** before being consolidated. Many were
corrective (`fix_`, `_v2`, `remove_`), which is a smell: changes were applied by
appending rather than by editing, and the schema's true state was only knowable
by replaying history. It is now rebuilt in dependency order as a small set of
layered migrations under `supabase/migrations/` — one concern per file (tables,
functions by domain, views, indexes, triggers, policies, grants, cron, and a
final security-hardening pass). Each layer is readable on its own, and
`supabase db reset` rebuilds the whole schema from them. The split was verified
by dumping the schema before and after and confirming the two are identical.

**Zod-free typing.** Backend validation uses Pydantic; the frontend trusts API
shapes largely without runtime validation. A shared schema would be better.

## Testing

`tests/automated` holds the backend suite. It mixes genuine unit tests with
integration tests that need a live stack and seeded data, and with manual smoke
scripts that make real (billable) model calls. The manual scripts are skipped
under pytest; they are run directly.

The security invariants (`tests/automated/test_rls_coverage.py`) and the demo-mode contract
(`tests/automated/test_demo_mode.py`) are the ones most worth keeping green.
