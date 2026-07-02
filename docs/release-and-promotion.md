# Release & Promotion

How Nexus milestones move from "implemented" to "promoted", and the record of each promotion. This
mirrors what actually happened for v0.5–v0.7 and how future versions should be recorded.

## Promotion model

A version is promoted only after all of the following:

1. **Local gate** — `npm ci`, `npm run typecheck`, `npm run build`, and E2E pass locally
   (`npm run test:e2e:local`). If local disk/cache pressure prevents the full run, note it and rely
   on hosted CI as the authoritative gate.
2. **Hosted CI** — `.github/workflows/nexus-ci.yml` (static-gates + e2e-local-supabase) is **green**
   on the PR and on the merge commit to `main`. Hosted CI is the authoritative gate.
3. **Manual QA** — the core flow is exercised in fixture mode (and the critical-risk path checked).
4. **Documentation update** — docs reflect the new state (this suite).
5. **Release/tag decision** — record the promotion in a `docs/vX.Y-*.md` document; tag if desired.

Binding invariants every version must preserve: `npm ci` reproducibility; typecheck/build/E2E
green; RLS isolation between users; validated `plan_json` as the source of truth; server-controlled
artifact/write paths; hosted CI green before promotion.

## What blocks promotion

- Any failing local gate or **red hosted CI** job.
- Broken RLS isolation or a bypass of the service-role-only write paths.
- Unvalidated plan output being persisted/rendered (must stay fail-closed).
- Introduction of out-of-scope product surface without an approved scope.
- Unpinned direct dependencies (the pin check fails CI) or new **high/critical** audit findings.

## What is non-blocking

- **QA-001** — benign logout `ERR_ABORTED` console noise — **resolved (closed, benign / won't-fix)** ([issue #2](https://github.com/ggligor1967/Nexus/issues/2)).
- **CI-WARN-001** — GitHub Actions runtime deprecation annotations.
- **SEC-001** — two **moderate** next→postcss advisories, risk-accepted (fix is a SemVer-major
  downgrade). `npm audit --audit-level=high` still passes.

See [maintenance-backlog.md](maintenance-backlog.md).

## Version history

### v0.5 — Runtime verified (baseline committed)

App boots, typecheck/build pass, E2E passes, RLS isolation verified manually; Git baseline
committed. Ran on port 3001 (3000 occupied); Supabase stack minimized (DB/Auth/API on; Realtime/
Storage/Edge/Analytics off). Formal release/tagging unblocked.
Record: [v0.5-runtime-verification.md](v0.5-runtime-verification.md),
[v0.5-test-matrix.md](v0.5-test-matrix.md).

### v0.6 — Hardened baseline verified

`npm ci` reproducibility baseline; direct dependency pins (DEP-001); Next.js workspace-root and
middleware→proxy migrations (TECH-001/002); build-ready guard (SEC-002); `ai_plan_runs`
server-write-only (SEC-003); full E2E matrix (8/8 at that time); reproducible CI pipeline added and
confirmed green on hosted Actions. SEC-001 deferred with risk acceptance. Product expansion
remained forbidden. Record: [v0.6-reproducibility-baseline.md](v0.6-reproducibility-baseline.md).

### v0.7 — Artifact Quality + Revision UX (current, promoted)

Deterministic Markdown export (pure `planToMarkdown`, escaped YAML frontmatter, persisted-only
metadata, `exportablePlanMarkdown` excluded); read-only revision history (model A); hardened
revisions write path (migration `0003`); regenerate UI; read-only revision snapshot route. PR #1
merged to `main`; hosted CI green on both the PR and the merge commit. 10 minor review findings
triaged **defer** (documented, non-blocking). Records:
[v0.7-planning.md](v0.7-planning.md), [v0.7-promotion.md](v0.7-promotion.md),
[PR #1](https://github.com/ggligor1967/Nexus/pull/1).

## Recording a future version

Do **not** open v0.8 scope until it is explicitly approved (see [roadmap.md](roadmap.md)). When a
future version is approved and delivered:

1. Add `docs/vX.Y-planning.md` (scope + explicit non-scope + acceptance direction) before coding.
2. Implement on a feature branch; keep commits clean (no WIP).
3. Add `docs/vX.Y-promotion.md` recording: delivered scope, out-of-scope-confirmed-absent, commits,
   hosted CI evidence (run URLs + commit), tests added, invariants preserved, and any deferred
   findings.
4. Update this suite (README, `docs/index.md`, and the affected guides) to the new state.
5. Update [roadmap.md](roadmap.md) and [maintenance-backlog.md](maintenance-backlog.md).

Preserve prior version docs unchanged — they are the audit trail.
