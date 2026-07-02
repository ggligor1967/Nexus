# Maintenance Backlog

Known, tracked, **non-blocking** items. None blocks the current v0.7 promotion. Each item lists
status, severity, whether it blocks, a link (where available), and acceptance criteria.

## QA-001 — logout `ERR_ABORTED` console noise

- **Status:** OPEN.
- **Severity:** minor.
- **Blocker:** no.
- **Link:** [issue #2](https://github.com/ggligor1967/Nexus/issues/2).
- **Detail:** `LogoutButton` calls `supabase.auth.signOut()` then immediately navigates to `/login`
  with `router.refresh()`; the in-flight request can be aborted, logging a benign `ERR_ABORTED`.
  Logout is correct and protected routes still redirect.
- **Acceptance criteria:** logout produces no `ERR_ABORTED` console entry (e.g. await/settle the
  sign-out before navigating, or otherwise sequence the request and redirect), with logout behavior
  and the AUTH-00x E2E assertions unchanged.

## CI-WARN-001 — GitHub Actions runtime deprecation warnings

- **Status:** OPEN (monitor).
- **Severity:** minor.
- **Blocker:** no.
- **Link:** — (annotations on CI runs).
- **Detail:** `actions/checkout@v4` and `actions/setup-node@v4` emit runtime deprecation
  annotations (bundled action Node runtime older than the runner default). Annotation-only; both
  jobs pass.
- **Acceptance criteria:** upgrade to stable newer action majors when available, with both CI jobs
  still green and no new runtime warnings.

## SEC-001 — next → postcss moderate advisories (risk-accepted)

- **Status:** DEFERRED WITH RISK ACCEPTANCE.
- **Severity:** moderate (2 advisories).
- **Blocker:** no — `npm audit --audit-level=high` passes because these are moderate, not high.
- **Link:** [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) (postcss XSS via
  unescaped `</style>`, CWE-79, CVSS 6.1); `next` is affected transitively via `postcss`.
- **Detail:** the only fix `npm audit` offers is `next@9.3.3` via `--force` — a SemVer-major
  breaking downgrade — so it is not applied. Direct dependency specs are pinned and `npm ci` is
  reproducible.
- **Acceptance criteria:** upgrade to a compatible Next/PostCSS release that clears the advisories
  without a major downgrade; re-run `npm ci`, typecheck, build, and E2E before/after the bump.

## DOC-STALE-001 — project `CLAUDE.md` service-role note is stale

- **Status:** OPEN (documentation only; recorded per this task, not fixed).
- **Severity:** minor (documentation).
- **Blocker:** no.
- **Link:** — (`CLAUDE.md`, "Two Supabase clients" section; file is untracked in git).
- **Detail:** `CLAUDE.md` states the admin client is "Used **only** for `ai_plan_runs`
  INSERT/UPDATE (see SEC-003)," but since v0.7 the generate-plan API also writes `revisions` through
  the admin/service-role client (migration `0003`). This doc suite
  ([database-and-rls.md](database-and-rls.md), [security-model.md](security-model.md)) describes
  both write paths correctly.
- **Acceptance criteria:** update the `CLAUDE.md` note to include `revisions` as a service-role
  write path. Left to the user to decide, since `CLAUDE.md` is outside this task's deliverable set
  and commit scope.

## Deferred v0.7 minor review findings (from PR #1)

All 10 were triaged **defer** by the final whole-branch review of
[PR #1](https://github.com/ggligor1967/Nexus/pull/1); none blocks merge. Listed here for
completeness. Common properties: **Status** DEFERRED, **Blocker** no.

| # | Finding | Severity | Acceptance criteria (if addressed) |
|---|---|---|---|
| 1 | `markdown-unit`'s `not.toContain(exportablePlanMarkdown)` would be vacuous if that field were ever empty (fixture guarantees non-empty). | trivial | Assert the field is non-empty, or exclude by a structural marker. |
| 2 | `REV-001` uses `expect.poll` though the insert is awaited before the 200 (no real eventual consistency). | trivial | Replace poll with a direct assertion. |
| 3 | `EthicalRiskPanel` error `<p>` sits outside the `!readOnly` guard — inert in readOnly (`setError` unreachable there). | trivial | Move the error `<p>` inside the `!readOnly` block for clarity. |
| 4 | `RevisionHistoryPanel` row date uses `toISOString()` — not human-friendly. | cosmetic | Format the date for display. |
| 5 | Project page issues 5 serial Supabase queries; the last 4 are independent and could be `Promise.all`-parallelized. | perf-only | Parallelize the independent reads. |
| 6 | `REV-PAGE-001` forced-failure POST omits `targetUsers` — benign (422 comes from the `invalid_json` signal). | trivial | Include `targetUsers` for parity. |
| 7 | Snapshot route uses `.select("*")` — could narrow to `previous_snapshot,new_snapshot`. | hygiene | Select only the needed columns. |
| 8 | `REV-RLS-001` closes browser contexts without `try/finally` (matches the pre-existing RLS test pattern). | trivial | Wrap context cleanup in `try/finally`. |
| 9 | `REV-RLS-001`/`REV-001` admin `revisions` query uses `.limit(1)` without `.order()` (deterministic today: one revision per fresh per-run project). | trivial | Add an explicit `.order()` for robustness. |
| 10 | **By design (model A):** regenerating the **same** concept writes a revision with `previous_snapshot === new_snapshot`. | by design | Documented in [export-and-revisions.md](export-and-revisions.md); no change required unless a diff/restore feature is approved. |

> These are recorded, not hidden. Addressing any of them is optional and, being test/UI-hygiene or
> perf items, should not change externally observable behavior. Any change here is out of scope for
> the documentation task.
