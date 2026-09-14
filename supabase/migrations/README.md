# Migrations

The schema is built from layered migrations, one concern per file, applied in
filename (timestamp) order by `supabase db reset` and `supabase db push`.

This replaces a single ~30,000-line consolidated dump that was correct but
unreadable. The split is a pure reorganisation: dumping the schema before and
after produces byte-identical output apart from pg_dump's random session token.

The order is a dependency order — objects a later layer references must already
exist:

| # | File (stem) | Contents |
|---|---|---|
| 1 | `create_extensions_schemas_enums` | Extensions, schemas, enum types |
| 2 | `create_public_tables` | SME schema: tables, columns, constraints, RLS enablement |
| 3 | `create_agency_tables` | Agency schema: tables, columns, constraints |
| 4 | `seed_rbac_reference_data` | RBAC reference data (roles, permissions, role_permissions) |
| 5 | `create_functions_identity_org` | Functions: users, organisations, roles, invitations, onboarding, MFA |
| 6 | `create_functions_billing` | Functions: subscriptions, usage limits, billing |
| 7 | `create_functions_clients_campaigns` | Functions: clients and campaigns |
| 8 | `create_functions_agents_sessions` | Functions: agents and their sessions |
| 9 | `create_functions_outputs_insights` | Functions: outputs, approvals, recommendations, intelligence |
| 10 | `create_functions_collaboration_notifications` | Functions: comments, tasks, feedback, notifications |
| 11 | `create_functions_cache_infra` | Functions: caches, materialised-view refresh, audit, housekeeping |
| 12 | `create_functions_misc` | Functions that did not classify into a domain above |
| 13 | `create_views_and_materialized_views` | Views and materialised views |
| 14 | `create_indexes` | Indexes |
| 15 | `create_triggers` | Table triggers |
| 16 | `enable_rls_and_create_policies` | RLS enablement and every policy |
| 17 | `grant_data_api_access` | Data API grants per role |
| 18 | `schedule_cron_jobs` | pg_cron jobs |
| 19 | `retire_superseded_objects` | Final cleanup of objects the dump supersedes |
| 20 | `harden_tenant_isolation` | Least-privilege grants and safe signup provisioning |

Notes:

- **Views and materialised views use `security_invoker` where possible.**
  Materialised views cannot (RLS is unavailable on them), so their browser-role
  grants are revoked in `grant_data_api_access`; see `SECURITY.md`.
- **UPDATE and ALL policies state `WITH CHECK` explicitly.** PostgreSQL applies
  `USING` as the write check when it is omitted (verified for this schema), so
  this is not a behaviour change; it makes each policy state its own write check
  rather than relying on that default.
- **Functions are grouped by the entity in their name.** A few land in
  `create_functions_misc`; that file is the place to look when an obvious
  function is not in the domain you expected.
- **`harden_tenant_isolation` is the security layer.** It owns the signup
  trigger, the tenant-table column grants, the deny-by-default function grants
  and the default privileges. Read it alongside `SECURITY.md`.
- **Ordering constraints are real.** A `DROP FUNCTION` that the dump performed
  after its grants lives in `retire_superseded_objects` (step 19) for that
  reason, not alphabetically.

To add a change, create a new timestamped migration after these rather than
editing them:

```bash
supabase migration new describe_your_change
supabase db reset
```

The demo data lives separately in `supabase/seed.sql`.
