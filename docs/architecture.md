# Architecture

Nexus is a Next.js 16 App Router application. Authenticated users create projects, submit a
concept, and receive a **schema-validated** plan (`NexusPlan`) that is the single source of truth
for rendering, export, and revisions.

## Request flow

```
Browser
  → Next.js proxy middleware (src/proxy.ts)      # route protection
    → App Router pages (src/app/**/page.tsx)      # server components
    → API route handlers (src/app/api/**/route.ts)
        ├─ Auth guard        (src/lib/auth/guards.ts)      # requireApiUser / getOwnedProject
        ├─ Zod validation    (src/lib/validation/concept.ts, src/lib/ai/schema.ts)
        ├─ Supabase clients  (src/lib/supabase/server.ts)  # server (RLS) + admin (service role)
        ├─ AI layer          (src/lib/ai/*)
        └─ Markdown export   (src/lib/export/markdown.ts)
```

## App Router structure

```
src/app/
  layout.tsx                         # root layout + metadata
  page.tsx                           # public home
  not-found.tsx                      # "404 — Not found" (also shown for non-owned resources)
  login/page.tsx, sign-up/page.tsx   # render AuthForm
  auth/callback/route.ts             # GET: exchangeCodeForSession → redirect(next)
  dashboard/page.tsx                 # project list + create form (protected)
  projects/[id]/page.tsx             # project workspace (protected)
  projects/[id]/revisions/[revisionId]/page.tsx   # read-only revision snapshot (protected)
  api/projects/route.ts              # GET (list) / POST (create)
  api/projects/[id]/route.ts         # GET / PATCH / DELETE
  api/projects/[id]/generate-plan/route.ts   # POST
  api/projects/[id]/export/markdown/route.ts # POST
```

Pages that read user data are `export const dynamic = "force-dynamic"` and call
`supabase.auth.getUser()` server-side, redirecting to `/login?next=...` when there is no session.

## Auth / proxy flow

`src/proxy.ts` is the Next.js 16 proxy middleware (the renamed successor to `middleware.ts`; it
exports a `proxy()` function and a `config.matcher`). Its matcher covers `/dashboard/:path*`,
`/projects/:path*`, `/login`, and `/sign-up`. It:

- refreshes the Supabase session cookie on each request,
- redirects unauthenticated users away from protected prefixes (`/dashboard`, `/projects`) to
  `/login?next=<path>`, and
- redirects authenticated users away from `/login` and `/sign-up` to `/dashboard`.

If Supabase env vars are missing, the proxy passes the request through unchanged (fail-open at the
edge) — the API guards and RLS remain the real enforcement points. See
[security-model.md](security-model.md).

## API route flow

Every handler that touches user data follows the same shape:

1. `createServerSupabaseClient()` — session-bound, RLS-respecting client.
2. `requireApiUser(supabase)` — returns `401` if there is no authenticated user.
3. `getOwnedProject(supabase, id, userId)` — returns the project only if it belongs to the caller;
   handlers return `404` otherwise (non-owners cannot distinguish "missing" from "not yours").
4. Zod validation of the request body.
5. Reads/writes via the appropriate Supabase client.

## Supabase clients

Two clients, defined in `src/lib/supabase/server.ts` (+ a browser client in
`src/lib/supabase/client.ts`):

- **`createServerSupabaseClient()`** — anon key + cookie-based session, **respects RLS**. Used for
  all user-scoped reads and for user-owned writes (`projects`, `concept_inputs`, `exported_plans`).
- **`createAdminSupabaseClient()`** — service-role key, **bypasses RLS**, no persisted session.
  Used **only** to write the audit tables `ai_plan_runs` and `revisions` (see
  [database-and-rls.md](database-and-rls.md) and [security-model.md](security-model.md)).
- **`createBrowserSupabaseClient()`** — anon key in the browser, used by `AuthForm` and
  `LogoutButton` for sign-in/sign-up/sign-out only.

## AI provider layer (`src/lib/ai/`)

- `provider.ts` — reads `NEXUS_AI_PROVIDER` (default `fixture`; unknown values throw) and dispatches.
- `generatePlan.ts` — thin wrapper (`generatePlanFromAI`) over the provider.
- `fixtureProvider.ts` — deterministic plan; infers `standard`/`critical`/`invalid_json` from
  `NEXUS_FIXTURE_SCENARIO` or the prompt text.
- `openaiProvider.ts` — lazily constructs the OpenAI client per call, requests JSON output, applies
  a 45s timeout, strips code fences.
- `prompt.ts` — builds the prompt from a validated `ConceptInput`.
- `schema.ts` — `NexusPlanSchema` (Zod) that **all** AI output must satisfy.

Details: [ai-provider.md](ai-provider.md).

## Validated `plan_json` lifecycle

`POST /api/projects/[id]/generate-plan`:

1. Auth + ownership; read the latest **completed** run's `plan_json` as `previousPlan` (for a
   possible revision).
2. Validate `ConceptInput` (Zod; `rawConcept` ≥ 50 chars) → `400` on failure.
3. Insert a `concept_inputs` row (user client, RLS).
4. Insert an `ai_plan_runs` row with `status: running` (**admin client**).
5. Build the prompt, call the AI provider, `JSON.parse`, then `NexusPlanSchema.parse`.
6. **On success:** update the run to `completed` with `raw_output` + `plan_json` (admin); set the
   project to `status: generated, build_ready_acknowledged: false` (user client); if `previousPlan`
   existed, insert a `revisions` row (admin, non-fatal). Return `200 { runId, status, plan }`.
7. **On any failure** (invalid JSON or schema violation): update the run to `failed` with
   `error_message` (admin); return `422 { error: "AI generation failed validation." }`.

The validated `plan_json` — never the raw model output — is the source of truth for rendering,
export, and revision snapshots. Invalid output is never rendered; the project page shows a failure
banner instead.

## Export lifecycle

`POST /api/projects/[id]/export/markdown`: requires the latest **completed** run with `plan_json`
(else `404`), re-validates it, renders deterministic Markdown via `planToMarkdown(...)`, persists
an `exported_plans` row (user client, RLS), sets project `status: exported`, and returns the file
as a `text/markdown` attachment. See [export-and-revisions.md](export-and-revisions.md).

## Revision lifecycle (model A)

A revision is recorded **only** when a successful regeneration follows an existing completed plan:

- First generation → **no** revision.
- Successful regeneration → **one** revision with `previous_snapshot`, `new_snapshot`, and
  `revision_note: "Plan regenerated"` (written via the admin client, non-fatal on error).
- Failed/invalid regeneration → **no** revision (the failure occurs before the revision insert).

The read-only snapshot route renders both snapshots via `GeneratedPlanView` in `readOnly` mode.
There is no restore and no diff engine in v0.7.

## UI composition

The project workspace (`src/app/projects/[id]/page.tsx`) reads the latest run (any status, drives
only the failure banner), the latest **completed** run (drives the visible plan/export/revisions),
all revisions, and the latest concept input (to prefill the intake). It composes:

- **`ConceptIntakeForm`** — concept intake; posts to `generate-plan`; enforces the 50-char minimum
  client-side too. Shown when there is no completed plan yet.
- **`GeneratedPlanView`** — renders the validated plan (thesis, deconstruction, strategy,
  `PrototypeOptions`, `EthicalRiskPanel`, roadmap); accepts a `readOnly` prop.
- **`EthicalRiskPanel`** — risk report + the critical-risk build-ready acknowledgement control
  (hidden in `readOnly`).
- **`ExportActions`** — triggers the Markdown export/download.
- **`RevisionHistoryPanel`** — lists revisions with links to snapshots.
- **`RegeneratePanel`** — re-reveals a prefilled `ConceptIntakeForm` to regenerate.

When a completed plan exists, the page shows `GeneratedPlanView + ExportActions +
RevisionHistoryPanel + RegeneratePanel`; otherwise it shows `ConceptIntakeForm`. A failed **latest**
run adds a failure banner above the (still-visible) good completed plan.

## Source-of-truth invariant

The **validated `plan_json`** persisted on a `completed` `ai_plan_runs` row is authoritative
everywhere: the UI renders it, the Markdown export re-validates and renders it (frontmatter
`source: "validated_plan_json"`), and revision snapshots store it. Raw model output is retained
only in `ai_plan_runs.raw_output` for auditing and is never rendered to users.
