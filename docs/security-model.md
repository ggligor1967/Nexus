# Security Model

Nexus enforces access control at three layers: the proxy middleware (edge), the API guards
(application), and Row Level Security (database). User data is isolated per-user, and the
privileged service-role key is confined to server-side audit writes.

## Auth boundary

- Auth is Supabase email/password. Sessions are cookie-based; the server, proxy, and browser each
  use an appropriate Supabase client (`src/lib/supabase/{server,client}.ts`).
- **Proxy-protected routes** (`src/proxy.ts`, matcher `/dashboard/:path*`, `/projects/:path*`,
  `/login`, `/sign-up`): unauthenticated requests to protected prefixes are redirected to
  `/login?next=<path>`; authenticated users are bounced off `/login`/`/sign-up` to `/dashboard`.
  If Supabase env vars are absent the proxy passes through — the API guards and RLS remain the
  authoritative checks, so this edge layer is defense-in-depth, not the sole gate.
- **Protected pages** additionally call `supabase.auth.getUser()` server-side and `redirect()` to
  login when there is no session (dashboard, project, and revision-snapshot pages).

## API guards

Defined in `src/lib/auth/guards.ts`:

- **`requireApiUser(supabase)`** — the first call in every data-touching handler; returns `401`
  `{ "error": "Unauthorized." }` when there is no authenticated user.
- **`getOwnedProject(supabase, projectId, userId)`** — fetches the project scoped to the caller.
  Handlers return `404` when it is absent, so a non-owner cannot distinguish "does not exist" from
  "not yours" (**non-owner 404 behavior**). This is also enforced by RLS underneath.

## Row Level Security

Every table has RLS enabled (migration `0001`). Users can only see/act on rows tied to their own
`user_id`, directly (`projects`) or through the `EXISTS (… projects.user_id = auth.uid())` pattern
(child tables). Full policy matrix and migrations: [database-and-rls.md](database-and-rls.md).
Isolation is proven end-to-end by the `RLS-*` and `REV-RLS-001` tests.

## Service-role use

`createAdminSupabaseClient()` uses `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS**. It is:

- constructed only in `src/lib/supabase/server.ts`,
- used only server-side by the generate-plan API,
- used only to write the **audit tables** `ai_plan_runs` and `revisions`.

It is never imported into client components and never returned to the browser. See "No service role
in the client" below.

## Server-controlled writes

The write surface is intentionally split:

- **User-client writes (RLS-enforced):** `projects`, `concept_inputs`, `exported_plans`. These are
  the user's own artifacts and are written under the caller's session.
- **Service-role writes only:** `ai_plan_runs` and `revisions`. Users may `SELECT` their own rows
  but cannot `INSERT`/`UPDATE` them; only trusted server code records them.

### `ai_plan_runs` write restriction (SEC-003)

Migration `0002` removes the authenticated INSERT/UPDATE policies on `ai_plan_runs`. A client cannot
create or tamper with run records; the server owns the run lifecycle (`running` → `completed`/
`failed`). Verified by `SEC-003`.

### `revisions` write restriction (v0.7)

Migration `0003` removes the authenticated INSERT policy on `revisions` (SELECT-own retained).
Revisions are server-written audit events, produced only by the generate-plan API. Verified by
`REV-SEC-001`.

## Build-ready guard (SEC-002)

`PATCH /api/projects/[id]` with `buildReadyAcknowledged: true` re-reads the latest **completed**
run and re-validates its `plan_json` with `NexusPlanSchema`. If there is no completed, schema-valid
plan, it returns **409** and the flag is not set. A project cannot be marked build-ready off an
empty, failed, or malformed plan. Verified by `SEC-002`.

## Critical-risk acknowledgement

When a plan's `ethicalRiskReport.overallRiskLevel` is `critical`, `EthicalRiskPanel` disables the
**Mark build-ready** control until the user checks the acknowledgement box; the choice is persisted
via the SEC-002-guarded PATCH and survives refresh. Verified by `SAFETY-001/002`. Read-only views
(revision snapshots) never expose the acknowledgement control.

## User isolation behavior (summary)

- Cross-user project reads/writes: **404** (page + API).
- Cross-user generate/export: **404**.
- Cross-user revision snapshot: **404** page.
- Direct client writes to `ai_plan_runs`/`revisions`: **denied** by RLS.

## No service role in the client

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never be:

- prefixed with `NEXT_PUBLIC_`,
- imported by a `"use client"` component,
- included in an API response body, or
- logged/committed.

The browser only ever uses the anon key (`createBrowserSupabaseClient()`), which is RLS-scoped to
the signed-in user. See [environment.md](environment.md) for the service-role warning and rotation
guidance.
