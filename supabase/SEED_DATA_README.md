# Seed data

`supabase/seed.sql` is the only seed file. `supabase/config.toml` loads it
automatically after migrations, so `supabase db reset` gives you a fully
populated local database:

```bash
supabase db reset
```

There is deliberately no second variant to swap in. An earlier version of this
directory shipped `seed.sql.minimal` and `seed.sql.full` alongside it, with
instructions to `cp` one over `seed.sql`; nothing loaded them, they had drifted
out of sync with the schema, and the documentation describing them was wrong
about how many users each contained. One seed, described accurately, is easier
to trust.

## What it creates

| | Count |
|---|---|
| Organizations | 13 |
| Test users | 27 |
| Agency clients | 3 |

**Every account uses the password `LocalDevOnly123!`.**

### Organizations

Four are for general use:

| Name | Slug | Type |
|---|---|---|
| Test SME Company | `test-sme-company` | SME |
| Test Agency Inc | `test-agency-inc` | AGENCY |
| Test SME Onboarding Org | `test-sme-onboarding-org` | SME |
| Test Agency Onboarding Org | `test-agency-onboarding-org` | AGENCY |

The remaining nine cover each billing tier in both trial and active states
(`billing-free-sme`, `billing-solo-trial`, `billing-team-active`, and so on), so
subscription-gating behaviour can be tested without changing any data first.

### Users

Users are named by the role they exercise:

- **SME**: `sme.owner@`, `sme.director@`, `sme.manager@`, `sme.analyst@`,
  `sme.viewer@`, `sme.onboarding@`
- **Agency**: `agency.owner@`, `agency.admin@`, `agency.account.manager@`,
  `agency.analyst@`, `agency.campaign.manager@`, `agency.viewer@`,
  `agency.creative@`, `agency.freelancer@`, `agency.strategist@`,
  `agency.client.viewer@`, `agency.onboarding@`
- **Billing**: `billing.free@`, `billing.solo@`, `billing.team@`,
  `billing.agency@`, plus `.trial`, `.expired` and `.pastdue` variants
- **Client contact**: `client.contact@`

All use `@example.com`, which is reserved by RFC 2606 for documentation and can
never route mail to a real person.

### Agency clients

Three rows in `agency.clients`, including `test-client-co` ("Test Client Co",
SaaS/Software) and `test-startup-xyz` ("Test Startup XYZ", E-commerce).

## Starting over

`supabase db reset` drops the database, re-runs the migration, and re-seeds. It
is safe to run whenever the database has drifted — that is the intended way back
to a known state.

## Using these accounts

`README.md` lists the two accounts worth signing in with first
(`sme.owner@example.com` and `agency.owner@example.com`). The rest exist for the
test suites: `tests/automated/test_config.py` reads the same credentials, and
`apps/web/.env.test` supplies them to the Playwright specs. If you add an account
here, add it in those two places as well or the tests will not see it.
