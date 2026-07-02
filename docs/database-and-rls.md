# Database & Row Level Security

Postgres schema managed by Supabase migrations in `supabase/migrations/`. Every table has Row
Level Security (RLS) enabled; user isolation is enforced in the database, not only in application
code.

## Tables

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Public profile mirrored from `auth.users` | `id` (→ `auth.users`), `email`, `display_name`, `preferred_language` |
| `projects` | User-owned workspace | `id`, `user_id` (→ `users`), `title`, `status` (`draft`/`generated`/`revised`/`exported`), `language`, `platform[]`, `build_ready_acknowledged` |
| `concept_inputs` | Submitted concept per generation | `id`, `project_id`, `raw_concept`, `target_users`, `platform[]`, `output_type`, `risk_domain`, `constraints` (jsonb) |
| `ai_plan_runs` | Audit record of each AI run | `id`, `project_id`, `concept_input_id`, `model_name`, `status` (`queued`/`running`/`completed`/`failed`), `raw_output`, `plan_json` (jsonb), `error_message`, `completed_at` |
| `exported_plans` | Persisted export artifacts | `id`, `project_id`, `ai_plan_run_id`, `format` (`markdown`/`pdf`), `content`, `file_path` |
| `revisions` | Read-only regeneration audit | `id`, `project_id`, `ai_plan_run_id`, `revision_note`, `previous_snapshot` (jsonb), `new_snapshot` (jsonb) |

> `format` allows `pdf` at the column level, but **PDF export is not implemented** — only
> `markdown` is written today. The column constraint is forward-looking, not a feature.

Triggers keep `users.updated_at` / `projects.updated_at` current, and a `SECURITY DEFINER`
`handle_new_user()` trigger syncs `auth.users` into `public.users` on signup.

## Ownership model

- `projects.user_id` ties a project to a Supabase auth user.
- Child tables (`concept_inputs`, `ai_plan_runs`, `exported_plans`, `revisions`) do not store
  `user_id`; they inherit ownership through their `project_id` using the pattern:

  ```sql
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = <child>.project_id
      AND p.user_id = (select auth.uid())
  )
  ```

## RLS model (per table)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | own row | own row — fallback only¹ | own row | — |
| `projects` | own | own | own | own |
| `concept_inputs` | own (via project) | own (via project) | — | — (cascades with project) |
| `ai_plan_runs` | own (via project) | **none** (removed in `0002`) | **none** (removed in `0002`) | — |
| `exported_plans` | own (via project) | own (via project) | — | — |
| `revisions` | own (via project) | **none** (removed in `0003`) | none (never existed) | — |

¹ **`users` INSERT is a fallback, not the normal path.** Normal signup does not rely on this
policy: the `handle_new_user()` `SECURITY DEFINER` trigger (migration `0001`) automatically
inserts/updates the profile row in `public.users` when a row is created in `auth.users`. The RLS
INSERT policy ("Users can insert own profile fallback") only backstops the profile upsert performed
by `POST /api/projects` if the trigger-created row is somehow absent.

### What this means for writes

- **User-client writes (RLS-checked):** `projects`, `concept_inputs`, `exported_plans` are written
  by the session-bound server client under the INSERT policies above. The export route, for
  example, inserts `exported_plans` via the user client.
- **Service-role writes only:** `ai_plan_runs` and `revisions` have **no** authenticated
  INSERT/UPDATE policies. They are written exclusively by `createAdminSupabaseClient()`
  (service role, RLS-bypassing) inside the generate-plan API. Users may still **SELECT** their own
  rows in these tables.

This split is deliberate: the audit tables (`ai_plan_runs`, `revisions`) must reflect only what
trusted server code recorded, while user-owned artifacts remain user-writable under RLS.

## Security rules

### SEC-002 — build-ready requires a completed validated plan

`PATCH /api/projects/[id]` with `buildReadyAcknowledged: true` is rejected with **409** unless the
latest **completed** `ai_plan_runs` row has a `plan_json` that passes `NexusPlanSchema`. A project
cannot be marked build-ready off an empty, failed, or malformed plan. (Enforced in the API; see
[api-reference.md](api-reference.md) and [security-model.md](security-model.md).)

### SEC-003 — `ai_plan_runs` are server-write-only

Migration `0002_restrict_ai_plan_run_writes.sql` drops the authenticated INSERT and UPDATE policies
on `ai_plan_runs`. Writes go only through the service-role client in the API; users can read their
own runs but cannot insert or tamper with them. Verified by E2E test `SEC-003`.

### v0.7 — `revisions` are server-write-only

Migration `0003_restrict_revision_writes.sql` drops the authenticated INSERT policy on `revisions`
(mirroring SEC-003; there was never an UPDATE policy). SELECT-own is retained. Revision rows are
server-written audit events, produced only by the generate-plan API via the admin client. Verified
by E2E test `REV-SEC-001`.

## Migrations

| File | Purpose |
|---|---|
| `0001_nexus_v05.sql` | Base schema: 6 tables, indexes, `updated_at` + `handle_new_user` triggers, RLS enabled, and initial policies (SELECT/INSERT/UPDATE as originally granted). |
| `0002_restrict_ai_plan_run_writes.sql` | SEC-003: drop authenticated INSERT/UPDATE on `ai_plan_runs`. |
| `0003_restrict_revision_writes.sql` | v0.7: drop authenticated INSERT on `revisions` (UPDATE drop is a documented no-op); SELECT-own retained. |

Apply locally with:

```powershell
npx supabase@2.108.0 migration up --local
```

RLS isolation between users is proven end-to-end by the `RLS-*` and `REV-RLS-001` Playwright
tests — see [testing-and-qa.md](testing-and-qa.md).
