# Web app

The React frontend for STRATUM. See the [root README](../README.md) for what the
project is and how to run the whole stack — this file covers only the frontend.

## Stack

| | |
|---|---|
| Framework | React 19 |
| Build | Vite 7 (`@vitejs/plugin-react-swc`) |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS v4 |
| State | Zustand stores, TanStack Query for server state |
| Routing | React Router 7 |
| i18n | i18next, 10 locales (`de en es fr ja ko pt-BR vi zh-CN zh-HK`) |
| Tests | Vitest (unit), Playwright (E2E) |

## Running it

The frontend needs the API and database running. The root README sets up all
three; the short version:

```bash
npm install                 # from the repository root
cp .env.example .env        # Vite reads this at startup, not afterwards
npm run dev                 # http://127.0.0.1:56310
```

`npm run dev` serves on **56310**. That port is not arbitrary: Supabase's
`site_url` allow-list and the API's CORS config are both set to it, so changing
it means changing those too.

The app talks to the API through a Vite proxy: requests to `/api` are forwarded
to `http://localhost:56300` (see `vite.config.ts`). You do not need to set an API
URL for local development.

## Settings

Environment variables are read by Vite at **startup**. Creating or editing
`.env` while the dev server is running has no effect until you restart it, and
the app renders a blank page with `Missing Supabase environment variables` in the
console if the file is absent.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Local Supabase REST endpoint (`http://127.0.0.1:56321`) |
| `VITE_SUPABASE_ANON_KEY` | Local anon key from `supabase start` |
| `VITE_API_URL` | API origin, used for non-proxied calls |
| `VITE_BRAND_NAME`, `VITE_BRAND_DOMAIN`, `VITE_CONTACT_EMAIL` | Branding shown to users |
| `VITE_RECAPTCHA_SITE_KEY`, `VITE_TURNSTILE_SITE_KEY` | Optional captchas; leave blank locally |

`.env.example` documents the rest and carries working local values.

## Layout

```
src/
├── components/   Feature components, grouped by area (agents, agency, ui, …)
├── pages/        Route targets
├── stores/       Zustand stores (auth, sessions, …)
├── hooks/        Data and behaviour hooks
├── lib/          API client, PKCE, locale and other pure helpers
├── config/       Brand and site identity
├── locales/      Translation source files
└── test/         Vitest setup (see src/test/README.md)
```

The route table is in `src/App.tsx`. SME agent pages are top-level (`/strategy`,
`/persona`, `/content`); the `/agents/:agentType` form is the client-scoped
variant under `/clients/:clientSlug` for agencies. There is no `/agents/strategy`
for an SME user.

## Agents

Twelve agent keys are registered in `apps/api/routers/direct_agents.py`
(`AGENT_MAP`), with `performance_intelligence` the current consolidation of the
older `analytics`, `roi_budget` and `quick_wins` entries. The frontend renders
whatever the API exposes; it does not keep its own agent list.

## Testing

```bash
npm test                 # unit tests (Vitest) — needs nothing running
npm run test:unit:watch  # watch mode
npm run test:coverage    # with a coverage report
npm run test:smoke       # E2E login path, needs the full stack
npm run test:e2e         # every E2E spec, all browsers
```

`npm test` runs unit tests, not E2E, because unit tests need no services and
therefore always work. `TESTING.md` at the repository root is the reference for
every command, the current pass counts, and what is deliberately not covered.

## Build

```bash
npm run build     # tsc -b && vite build
npm run preview   # serve the production build locally
```

The build emits a large vendor chunk (about 2.5 MB, 909 kB gzipped) and warns
about it. That is expected for this app: `manualChunks` in `vite.config.ts`
deliberately keeps React and its dependants together, because splitting them
caused initialisation-order failures under React 19.
