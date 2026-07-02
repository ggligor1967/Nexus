# Testing & QA

Nexus is verified by Playwright E2E tests plus a Node-style unit spec for the Markdown renderer,
run against a local Supabase stack in **fixture** mode. This page documents the **current** suite
(derived from the actual test files), how to run it, and how to interpret common failures.

> Historical version docs report "E2E 8/8" — that was accurate at **v0.6**. The current suite is
> larger (v0.7 added export and revision coverage). Those historical documents are preserved as an
> audit trail; the matrix below reflects the code today.

## Test files

- `tests/e2e/nexus-v05.spec.ts` — 15 end-to-end scenarios (core flow + RLS isolation).
- `tests/e2e/markdown-unit.spec.ts` — 5 pure-function checks for `planToMarkdown` (run through
  the Playwright runner but requiring no browser/DB).

## E2E matrix

### Core flow (`Nexus v0.5 core flow`)

| ID | What it verifies |
|---|---|
| AUTH-001/002/003 | Sign up or log in, then logout re-protects `/dashboard`. |
| PROJECT + PLAN + EXPORT | Create project → generate fixture plan → export Markdown → `exported_plans` row persisted. |
| PLAN-002 | Concept under 50 chars is blocked client-side before any AI call. |
| PLAN-003/TEST-002 | `invalid_json` generation → `422`, run recorded `failed` with `raw_output`/`error_message`, `plan_json` null; subsequent export → `404`. |
| SEC-002 | Build-ready acknowledgement → `409` without a completed validated plan; `200` after one exists. |
| REV-SEC-001 | A client (anon+session) cannot directly `INSERT` a `revisions` row (RLS denies). |
| SEC-003 | A client can `SELECT` its own `ai_plan_runs` but cannot `INSERT`/`UPDATE` them; server value persists. |
| EXPORT-CONTENT | Exported Markdown has escaped frontmatter (`format`/`source`/`model`), `### 2.4 Constraints`, risk callout, `### Option 1 —`, and an escaped quoted title. |
| REV-001 | First generation creates no revision; a second (differing) generation creates exactly one, with differing snapshots. |
| REV-002/TEST | An `invalid_json` regeneration creates no revision. |
| REV-PAGE-001 | A completed plan and the revision panel survive a failed regeneration (failure banner shown, good plan retained). |
| REV-UI-001 | Regenerating via the UI creates one revision; the snapshot route renders both versions read-only (no build-ready control). |
| SAFETY-001/002 | A critical-risk plan disables build-ready until acknowledgement; the acknowledgement persists after refresh. |

> **Note:** `REV-UI-001` sets `test.setTimeout(180_000)` because it drives the full UI regenerate +
> revision-snapshot path (two complete generate cycles plus a cold snapshot-route compile) and can
> be slower locally, especially under disk pressure. `REV-RLS-001` raises its timeout the same way
> for its two-context setup.

### RLS isolation (`Nexus v0.5 RLS isolation proof`)

| ID | What it verifies |
|---|---|
| RLS-002/003/004 | User B cannot open, generate under, or export user A's project (404 page / `404` responses). |
| REV-RLS-001 | User B cannot open user A's revision snapshot route (404 page). |

### Markdown unit (`markdown-unit.spec.ts`)

| Check | What it verifies |
|---|---|
| Purity | Identical inputs produce identical output. |
| Frontmatter markers | Constant `format`/`source`/`model`/`exported_at` values present. |
| Title escaping | Quotes escaped, newlines flattened in the frontmatter title. |
| Sections | `### 2.4 Constraints`, risk callout, and `### Option 1 —` present. |
| Exclusion | `exportablePlanMarkdown` is not embedded in the output. |

## Running the tests

Prerequisites: local Supabase running, migrations applied, `.env.local` populated, and the app
running on the port in `E2E_BASE_URL`.

```powershell
# start Supabase + migrations first (see local-development.md), then:
npm run dev:3001        # in one shell; leave it running

# in another shell:
$env:E2E_BASE_URL='http://localhost:3001'
npm run test:e2e:local  # single worker — recommended locally
```

`npm run test:e2e` uses Playwright's default worker count; `npm run test:e2e:local` forces
`--workers=1`, which is more reliable on a single local machine.

### Run a single test

```powershell
npx playwright test -g "SEC-002"
npx playwright test -g "REV-UI-001"
```

## Modes

- **Fixture mode** (`NEXUS_AI_PROVIDER=fixture`, `NEXUS_FIXTURE_SCENARIO=auto`) — the default for
  QA/CI. Deterministic, offline, no OpenAI key. The surveillance-style concept used in
  `REV-UI-001`/`SAFETY-001` drives the `critical` scenario; `invalid_json` concepts drive the
  fail-closed path.
- **Invalid-JSON mode** — either set `NEXUS_FIXTURE_SCENARIO=invalid_json` or include the literal
  text `invalid_json` in the concept to exercise `422` + failed-run logging.

## Hosted CI role

Hosted GitHub Actions (`.github/workflows/nexus-ci.yml`) is the **authoritative** gate: it runs the
full suite on a clean runner (static-gates + e2e-local-supabase) on every PR and on pushes to
`main`. Local runs are for fast iteration; when local disk/cache pressure prevents a full local
run, CI is the source of truth. See [ci-cd.md](ci-cd.md).

## Manual live QA (summary)

With fixture mode and the app on 3001: sign up → create project → generate (standard) → export
Markdown → regenerate → open a revision snapshot; then generate a surveillance concept to confirm
the critical-risk acknowledgement gate. This mirrors the E2E coverage without code changes; see
[getting-started.md](getting-started.md).

## QA-001 — logout `ERR_ABORTED` (minor, non-blocking)

Logging out (`LogoutButton`) calls `supabase.auth.signOut()` and immediately navigates to `/login`
with `router.refresh()`. The in-flight sign-out request can be aborted by the navigation, producing
a benign `ERR_ABORTED` entry in the browser console. It does not affect logout correctness (the
session is cleared and protected routes redirect), and the E2E logout assertions pass.

- **Severity:** minor · **Blocker:** no.
- **Tracking:** [issue #2](https://github.com/ggligor1967/Nexus/issues/2) (open).
- See [maintenance-backlog.md](maintenance-backlog.md).

## Interpreting common failures

| Symptom | Likely cause / fix |
|---|---|
| `connect ECONNREFUSED 127.0.0.1:3001` | The app is not running on 3001. Start `npm run dev:3001` and ensure `E2E_BASE_URL` matches. |
| Tests hang on auth or DB assertions | Local Supabase not running / migrations not applied. Run `supabase start` + `migration up --local`. |
| `ENOSPC` in the npm cache | Point npm at a temp cache: `$env:npm_config_cache='C:\tmp\npm-cache-nexus'`. See [troubleshooting.md](troubleshooting.md). |
| `404`/"not found" where you expected data | Expected for unauthorized/cross-user access — non-owners get a 404 page and `404` API responses by design (RLS + ownership). |
| Missing `SUPABASE_*` env in DB-assertion helpers | Populate `.env.local`; the tests read it via `getEnv()` when process env is unset. |

For a broader list, see [troubleshooting.md](troubleshooting.md).
