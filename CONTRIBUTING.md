# Contributing

Thanks for looking. Please read this before opening an issue or a pull request,
because the expectations here are unusual and stating them up front saves us both
time.

## What this repository is

This is **v1 of STRATUM, published as a reference implementation**. A later
version is developed privately and is not expected to resemble this codebase
closely.

It is published to be read and learned from, and to be a working example of a
multi-tenant agentic application. In practical terms:

- It is **not actively developed** — there is no roadmap and no release schedule.
- There is **no support commitment**; a reproducible report may still not be
  actioned.
- If you need something maintained, treat this as a starting point to fork rather
  than a project to depend on.

## Issues

Bug reports and questions are welcome. Please include:

- what you expected and what happened
- the commands you ran
- relevant log output

A clear, reproducible report is more useful than a fast one, even where it may
not be actioned.

## Pull requests

Small, focused PRs are welcome. Before opening one:

1. **Run the tests.** `npm test --prefix apps/web` needs nothing running.
   `poetry run pytest` needs the local Supabase stack; it is green by default
   because the non-hermetic tests are skipped (see `TESTING.md`).
2. **Run the linters.** `npm run lint --prefix apps/web`.
3. **Keep the diff small.** A targeted fix is far easier to review than a
   refactor, and unrelated reformatting will be asked to be split out.
4. **Add a test with behaviour changes.** Tests in this repository are the
   documentation of intent.

Larger changes — new features, architectural shifts — are unlikely to be merged,
because there is no roadmap for them to fit into. Forking is the better path.

## Conventions worth knowing

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- **Multi-tenant writes** go through the routed database functions
  (`*_routed()`) rather than duplicating schema selection in application code.
  See `ARCHITECTURE.md`.
- **Row Level Security is the isolation boundary.** Read `SECURITY.md` before
  changing anything that touches policies, materialized views or the service
  role.
- **Never commit secrets.** `.env` files are gitignored for a reason; use the
  `.env.example` templates. This repository is public, so a credential that
  reaches a commit is compromised even if it is removed later. Run
  `bash scripts/oss/leak-gate.sh --tracked` before every commit and push — CI is
  disabled, so nothing enforces it automatically. It checks for credentials,
  absolute machine paths, author identity in code and self-reported metrics.

## Development setup

Follow the step-by-step instructions in `README.md`. They are seven explicit
commands, each explained, and there is a troubleshooting section if something
does not work.

`DEMO_MODE` is on by default, so no model API key is needed to run the
application.
