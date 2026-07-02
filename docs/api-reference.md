# API Reference

All application routes discovered in `src/app/api/**` plus the auth-callback route handler.
Unless noted, every route uses the session-bound, RLS-respecting server client, calls
`requireApiUser()` first (`401` if unauthenticated), and enforces project ownership via
`getOwnedProject()` (`404` for non-owners). Request/response bodies are JSON unless stated.

Common error codes:

| Code | Meaning |
|---|---|
| `400` | Request body failed Zod validation. |
| `401` | No authenticated user (`{ "error": "Unauthorized." }`). |
| `404` | Project/resource not found **or** not owned by the caller. |
| `409` | Build-ready acknowledgement requested without a completed validated plan (SEC-002). |
| `422` | AI generation failed (invalid JSON or schema violation). |
| `500` | Unexpected database/server error. |

---

## `GET /api/projects`

- **Auth:** required.
- **Input:** none.
- **Output:** `200 { "projects": Project[] }` — the caller's projects, newest `updated_at` first.
- **RLS/ownership:** filtered by `user_id = auth user` (and RLS).
- **Errors:** `401`, `500`.
- **Side effects:** none.

## `POST /api/projects`

Create a project.

- **Auth:** required.
- **Input:**
  ```json
  {
    "title": "string (3–120 chars, required)",
    "description": "string (optional)",
    "language": "en | ro | bilingual (default en)",
    "platform": ["web | mobile | windows | ai | other"]  // default []
  }
  ```
- **Output:** `201 { "project": Project }`.
- **RLS/ownership:** inserts with `user_id = auth user`.
- **Errors:** `400` (invalid body), `401`, `500`.
- **Side effects:** upserts the caller's `users` profile row (id/email/display_name), then inserts
  the `projects` row.

## `GET /api/projects/[id]`

- **Auth:** required.
- **Input:** none.
- **Output:** `200 { "project": Project }`.
- **RLS/ownership:** returns the project only if owned by the caller.
- **Errors:** `401`, `404`.
- **Side effects:** none.

## `PATCH /api/projects/[id]`

Update title/description and/or set the build-ready acknowledgement.

- **Auth:** required; project must be owned.
- **Input:** (all optional)
  ```json
  {
    "title": "string (3–120)",
    "description": "string | null",
    "buildReadyAcknowledged": true
  }
  ```
- **Output:** `200 { "project": Project }`.
- **RLS/ownership:** update scoped to `id` + `user_id = auth user`.
- **Errors:** `400`, `401`, `404`,
  **`409`** — when `buildReadyAcknowledged: true` but there is no latest **completed**
  `ai_plan_runs` row whose `plan_json` passes `NexusPlanSchema`
  (`{ "error": "Build-ready acknowledgement requires a completed validated plan." }`). This is the
  **SEC-002** guard. `500` on DB error.
- **Side effects:** persists `build_ready_acknowledged` (and title/description) on the project.

## `DELETE /api/projects/[id]`

- **Auth:** required; project must be owned.
- **Input:** none.
- **Output:** `200 { "ok": true }`.
- **RLS/ownership:** delete scoped to `id` + `user_id = auth user`. Child rows cascade
  (`ON DELETE CASCADE` in the schema).
- **Errors:** `401`, `404`, `500`.
- **Side effects:** deletes the project and its dependent rows.

## `POST /api/projects/[id]/generate-plan`

Validate a concept, run the AI provider, validate the output, and persist the run. Runs on the
Node.js runtime and is `force-dynamic`.

- **Auth:** required; project must be owned.
- **Input** (`ConceptInput`, validated by `ConceptInputSchema`):
  ```json
  {
    "rawConcept": "string (≥ 50 chars, required)",
    "targetUsers": "string (optional)",
    "platform": ["web | mobile | windows | ai | other"],   // ≥ 1
    "outputType": "mvp_plan | technical_plan | ux_flow | ethical_review | full_prd",
    "language": "en | ro | bilingual",
    "riskDomain": "general | health | finance | children | education | surveillance | legal | ai_safety",
    "constraints": { "timeframe": "?", "budget": "?", "teamSize": "?", "technicalLevel": "beginner|intermediate|advanced" }  // optional
  }
  ```
- **Output (success):** `200 { "runId": string, "status": "completed", "plan": NexusPlan }`.
- **Errors:**
  - `400` — `ConceptInput` invalid (e.g. concept < 50 chars).
  - `401`, `404`.
  - **`422`** — AI returned invalid JSON or output failed `NexusPlanSchema`
    (`{ "error": "AI generation failed validation." }`). The run is recorded as `failed` with an
    `error_message`; `plan_json` stays null. **Fail-closed.**
  - `500` — DB error saving the concept or creating the run.
- **RLS/ownership:** ownership enforced before any write.
- **Side effects:**
  - Inserts a `concept_inputs` row (user client, RLS).
  - Inserts/updates an `ai_plan_runs` row (**admin/service-role client**): `running` → `completed`
    or `failed`.
  - On success: sets project `status: generated, build_ready_acknowledged: false`.
  - If a prior completed plan existed: inserts one `revisions` row (admin client, **non-fatal** —
    a failed revision insert does not turn a valid `200` into an error).

## `POST /api/projects/[id]/export/markdown`

Render and persist the current validated plan as Markdown, returned as a download.

- **Auth:** required; project must be owned.
- **Input:** none.
- **Output:** `200` with body = Markdown text; headers
  `Content-Type: text/markdown; charset=utf-8` and
  `Content-Disposition: attachment; filename="<sanitized-title>.md"`.
- **Errors:**
  - `404` — no latest **completed** run with `plan_json`
    (`{ "error": "No completed validated plan found." }`), or non-owner.
  - `401`, `500` (DB error saving the export record).
- **RLS/ownership:** reads the completed run and inserts the export via the **user client** (RLS).
- **Side effects:** re-validates `plan_json` with `NexusPlanSchema`, renders via
  `planToMarkdown(project.title, plan, meta)`, inserts an `exported_plans` row (`format: "markdown"`,
  `content`), and sets project `status: exported`. See [export-and-revisions.md](export-and-revisions.md).

---

## `GET /auth/callback`

Supabase OAuth/email code-exchange handler (not under `/api`).

- **Auth:** n/a (establishes the session).
- **Input:** query params `code` (optional), `next` (optional, default `/dashboard`).
- **Output:** `302` redirect to `next` (same origin). If `code` is present, exchanges it for a
  session first (`exchangeCodeForSession`).
- **Side effects:** sets the session cookie when a `code` is exchanged.

---

## Notes

- There is **no** REST route for reading revisions; the read-only snapshot is a **page**
  (`/projects/[id]/revisions/[revisionId]`), not an API endpoint. Non-owners get a 404 page.
- Plan generation and revision writes go through the service-role client; users can read their own
  `ai_plan_runs`/`revisions` but cannot write them directly (enforced by RLS — see
  [database-and-rls.md](database-and-rls.md)).
