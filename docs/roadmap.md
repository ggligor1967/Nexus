# Roadmap

A status snapshot of what is done, what is in flight, and what is only a future candidate. Nothing
in "candidate future items" is approved or scheduled.

## Done

- **v0.5 — Runtime proof.** App boots; typecheck/build pass; E2E passes; RLS isolation verified;
  baseline committed. → [v0.5-runtime-verification.md](v0.5-runtime-verification.md)
- **v0.6 — Hardened baseline.** `npm ci` reproducibility; exact dependency pins; SEC-002 build-ready
  guard; SEC-003 `ai_plan_runs` server-write-only; reproducible CI pipeline; SEC-001 risk-accepted.
  → [v0.6-reproducibility-baseline.md](v0.6-reproducibility-baseline.md)
- **v0.7 — Artifact quality + revision UX.** Deterministic Markdown export; read-only
  revision history (model A); hardened `revisions` write path (migration `0003`); regenerate UI;
  read-only revision snapshot route. Promoted; hosted CI green.
  → [v0.7-promotion.md](v0.7-promotion.md)
- **v0.8 — Read-only revision diff / compare (current).** Pure deterministic `diffPlans(previous,
  next)` and a read-only `DiffView`, rendered inline on the existing revision snapshot route. No
  new route, no DB/RLS/service-role/write-path changes, no migrations. View-only: no restore, no
  diff export/download, no mutation. Merged to `main` (PR #3, merge commit `0896bc8`); hosted CI green.
  → [v0.8-promotion.md](v0.8-promotion.md)
- **QA-001 — logout `ERR_ABORTED` noise: resolved (closed, benign / won't-fix).** Investigated and
  confirmed benign browser/navigation teardown after a successful, awaited logout; no code change.
  [issue #2](https://github.com/ggligor1967/Nexus/issues/2) ·
  [closure comment](https://github.com/ggligor1967/Nexus/issues/2#issuecomment-4865452826). See
  [maintenance-backlog.md](maintenance-backlog.md).

## Current (in flight)

*Nothing currently in flight.*

## Not started

- **v0.9 planning** — **not open.** No scope has been approved. Product expansion remains blocked
  until a v0.9 scope is explicitly accepted (see [release-and-promotion.md](release-and-promotion.md)).

## Candidate future items (none approved)

These have been discussed as possible future directions. **None is implemented, scheduled, or
approved.** Do not treat any as available.

| Candidate | Notes |
|---|---|
| Revision **restore** / rollback | Roll a project back to a previous snapshot (revisions and the v0.8 diff are read-only; explicitly deferred). |
| **PDF export** | Only to be considered after the Markdown/revision flow is proven stable. |
| **Selected prototype marker** | Mark a chosen prototype option on a plan — deferred; explicit non-scope for v0.8. |
| **Diff export / download** | Export or download the computed diff (the v0.8 diff is view-only inline) — deferred. |
| **Market intelligence / scan** | Source-backed market research — currently explicit non-scope. |
| **Collaboration** | Multi-user projects/sharing — currently explicit non-scope. |

Also explicitly out of scope for the current product: deployment automation and enterprise CI/CD
expansion (see [ci-cd.md](ci-cd.md)).

## Approval gate

No candidate moves to "in flight" until a scope is written and approved. The recommended process is
in [release-and-promotion.md](release-and-promotion.md) ("Recording a future version"): write
`docs/vX.Y-planning.md` with scope + explicit non-scope + acceptance direction, get approval, then
implement.
