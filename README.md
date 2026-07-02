# Omni-Intellect Nexus

Nexus turns messy software concepts into structured, ethical, **build-ready** product plans.
A user submits a concept intake form, the app generates a schema-validated plan (`NexusPlan`)
via an AI provider, renders it, and can export it as deterministic Markdown. Successful
regenerations are recorded as read-only revisions.

## Status

| Milestone | State |
|---|---|
| v0.5 | RUNTIME VERIFIED — baseline committed |
| v0.6 | HARDENED BASELINE VERIFIED — CI reproducibility + RLS/service-role hardening |
| **v0.7 (current)** | **PROMOTED — Artifact Quality + Revision UX** (PR #1 merged to `main`, hosted CI green) |

Product expansion beyond v0.7 is **not open** until a v0.8 scope is explicitly approved.
See [`docs/roadmap.md`](docs/roadmap.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Supabase (Auth + Postgres, RLS) ·
Zod validation · OpenAI SDK · Playwright E2E. All direct dependencies are pinned to exact
versions (CI enforces this).

## Features

- Email/password auth with route protection (`src/proxy.ts`).
- Project workspace with per-user isolation enforced by Row Level Security.
- Concept intake → AI plan generation → **schema-validated** `plan_json` (fail-closed on invalid output).
- Ethical risk report with a critical-risk build-ready acknowledgement gate.
- Deterministic Markdown export with YAML frontmatter, persisted to `exported_plans`.
- Read-only revision history for regenerations (no restore/diff in v0.7).
- Deterministic **fixture** AI mode for offline, reproducible QA and CI.

## Quick start

Prerequisites: Node.js (CI validates on Node 22 — use Node 22 LTS), Docker (for local Supabase),
and the Supabase CLI via `npx supabase@2.108.0`.

```powershell
# 1. Install exact dependencies
npm ci

# 2. Start local Supabase and apply migrations (Docker must be running)
npx supabase@2.108.0 start
npx supabase@2.108.0 migration up --local

# 3. Create .env.local from the template, then fill in the values printed by `supabase status`
Copy-Item .env.example .env.local

# 4. Run the app (port 3001 is the project convention; CI uses it too)
npm run dev:3001
```

Open <http://localhost:3001>, sign up, create a project, and generate a plan.
With `NEXUS_AI_PROVIDER=fixture` (the default in `.env.example`) no OpenAI key is required —
generation is deterministic. Full walkthrough: [`docs/getting-started.md`](docs/getting-started.md).

## Environment

Copy `.env.example` to `.env.local` (git-ignored) and fill in values. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, browser-safe.
- `SUPABASE_SERVICE_ROLE_KEY` — **secret, server-only**. Never expose to the browser.
- `NEXUS_AI_PROVIDER` — `fixture` (default, deterministic) or `openai`.
- `NEXUS_FIXTURE_SCENARIO` — `auto` | `standard` | `critical` | `invalid_json`.
- `OPENAI_API_KEY`, `OPENAI_MODEL` — only needed when `NEXUS_AI_PROVIDER=openai`.

Details and safety notes: [`docs/environment.md`](docs/environment.md).

## Tests

```powershell
npm run typecheck        # tsc --noEmit
npm run build            # production build
npm run test:e2e         # Playwright (default workers)
npm run test:e2e:local   # Playwright (single worker — recommended locally)
```

E2E requires a running local Supabase stack, applied migrations, and the app on port 3001.
See [`docs/testing-and-qa.md`](docs/testing-and-qa.md) and [`docs/local-development.md`](docs/local-development.md).

## Continuous integration

`.github/workflows/nexus-ci.yml` runs on every pull request and on pushes to `main`, with two
jobs: **static-gates** (npm ci, dependency-pin check, `npm audit --audit-level=high`, typecheck,
build) and **e2e-local-supabase** (local Supabase, migrations, app on 3001, Playwright).
Both jobs are expected to be **green** before promotion. Details: [`docs/ci-cd.md`](docs/ci-cd.md).

## Documentation

Start at the documentation hub: **[`docs/index.md`](docs/index.md)**.
Current release record: **[`docs/v0.7-promotion.md`](docs/v0.7-promotion.md)**.
