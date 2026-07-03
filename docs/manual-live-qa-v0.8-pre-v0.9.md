# Manual Live QA — v0.8 pre-v0.9 discovery

## Environment

- Branch: `qa/live-v0.8-pre-v0.9`
- HEAD: `787a202`
- Date/time: `2026-07-03T14:47:07.3605135+03:00`
- Local/deployed URL: local `http://localhost:3001`
- Supabase mode: local Supabase CLI stack (`npx supabase@2.108.0`)
- AI provider mode: `fixture`
- Fixture scenario: `auto`
- Browser used: VS Code integrated browser (Playwright-assisted live navigation)
- Test users used:
  - User A: `liveqa.a.1783079006730@example.test`
  - User B: `liveqa.b.1783079173644@example.test`

## Gate summary

| Gate | Status | Evidence |
| --- | --- | --- |
| Typecheck | PASS | `npm run typecheck` completed successfully in pre-flight. |
| Build | PASS | `npm run build` completed successfully in pre-flight. |
| Supabase boot | PASS | `docker info` succeeded; `npx supabase@2.108.0 status -o json` returned local endpoints; `migration up --local` reported `Local database is up to date.` |
| App boot | PASS | `npm run dev:3001` reached `Ready`, and `http://localhost:3001` returned HTTP 200. |
| Live QA overall | WARN | All functional flows passed; one known benign logout console/network `ERR_ABORTED` observation (QA-001) remains visible during logout without breaking session cleanup or route protection. |

## Flow results

### 1. Public/auth flow

- Status: PASS
- Evidence summary:
  - Landing page loaded at `/`.
  - User A sign-up succeeded and redirected to `/dashboard`.
  - Logout redirected to `/login`.
  - Visiting `/dashboard` after logout redirected to `/login?next=%2Fdashboard`.
  - Login again as User A returned to `/dashboard`.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - Browser network diagnostics recorded `POST http://127.0.0.1:54321/auth/v1/logout?scope=global -> net::ERR_ABORTED` during logout.
  - Functional logout behavior still succeeded; this matches the known benign QA-001 pattern.

### 2. Project creation + standard generation

- Status: PASS
- Evidence summary:
  - Created project `v0.8 live QA pre-v0.9` at `http://localhost:3001/projects/c279e8f1-f825-4243-87c1-a0be5f457584`.
  - Submitted a valid concept > 50 characters and generated a standard fixture plan.
  - Verified rendered sections:
    - Product Thesis
    - Deconstruction
    - Strategy
    - Prototype Options
    - Ethical Risk Report
    - Roadmap
    - Export
    - Revision History
    - Regenerate
  - Initial standard plan rendered with `Overall risk level: medium`.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - The standard generation flow felt deterministic and stable in fixture mode.

### 3. Markdown export

- Status: PASS
- Evidence summary:
  - Export request returned HTTP 200.
  - Verified Markdown content included:
    - YAML frontmatter
    - `format: "nexus-markdown-v1"`
    - `source: "validated_plan_json"`
    - `model: "fixture"`
    - risk callout
    - `### 2.4 Constraints`
    - `### Option 1 —`
  - Export excerpt confirmed the expected title, timestamp, medium risk level, and frontmatter structure.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - Content is structurally correct and readable for technical handoff.
  - Presentation remains Markdown-first rather than stakeholder-polished; this is an observation, not a defect.

### 4. Revision + v0.8 diff flow

- Status: PASS
- Evidence summary:
  - Regenerated the same project using a surveillance-style concept.
  - Current project URL after regeneration remained the same and the live plan switched to a critical-risk variant.
  - Revision History showed exactly one revision.
  - Opened snapshot route `http://localhost:3001/projects/c279e8f1-f825-4243-87c1-a0be5f457584/revisions/2478c66c-c65b-44db-8582-180d8eb48a49`.
  - Verified:
    - previous version renders
    - new version renders
    - read-only mode is active
    - no build-ready / acknowledgement mutation controls appear on the snapshot route
    - diff panel (`What changed`) renders
    - risk-level change is visible as `medium → critical`
    - the new risk value includes `critical`
  - Diff summary surfaced changed sections for Product thesis, Strategy, and Ethical risk.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - Diff is understandable to a user.
  - UX observations:
    - Not too sparse for this case, but the page becomes long because the diff summary is followed by two full snapshots.
    - Labels were generally clear.
    - Some users may want quicker navigation between diff summary and full snapshots.
    - Unchanged sections being collapsible (or anchor-linked) could improve scan speed.
    - The risk change is visible, but stronger visual emphasis for a severity jump to `critical` may help.
    - A restore action would likely be useful because the snapshot is informative but not actionable.

### 5. Critical risk gate

- Status: PASS
- Evidence summary:
  - On the critical plan, `Mark build-ready` was disabled until acknowledgement.
  - Checking `I acknowledge the safeguards and red lines.` enabled the action.
  - After saving, the page displayed `build-ready acknowledged` in the header and `Build-ready acknowledged` on the action button.
  - A full reload preserved:
    - header badge
    - checked acknowledgement checkbox
    - `Build-ready acknowledged` button state
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - Manual testing showed that reloading before the save completes can create a transient misleading state; waiting for the persisted acknowledged state avoids false negatives.
  - Final persisted behavior passed.

### 6. Failed regeneration resilience

- Status: PASS
- Evidence summary:
  - Triggered a failed regeneration using concept text containing `invalid_json`.
  - UI surfaced `AI generation failed validation.` during submission.
  - After reload, the project page showed `Last generation failed` while keeping the previous valid critical plan visible.
  - Revision count remained `1`; no new revision was created for the failed regeneration.
  - Export still returned HTTP 200 and continued to use the latest completed valid plan (`risk_level: "critical"`, `model: "fixture"`).
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - This is a strong resilience behavior and matched the expected fail-closed path.

### 7. RLS / multi-user isolation

- Status: PASS
- Evidence summary:
  - Created User B in a separate browser context.
  - User B received `404 — Not found` for User A project URL.
  - User B received `404 — Not found` for User A revision snapshot URL.
  - The 404 state did not leak User A data.
  - User B successfully created an independent project at `http://localhost:3001/projects/fa725e23-0796-4318-8399-88a763c1178d`.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - Isolation behavior matched the product’s intended ownership boundaries.

### 8. Logout observation / QA-001 regression check

- Status: WARN
- Evidence summary:
  - From an active authenticated session, logout redirected to `/login`.
  - Visiting `/dashboard` immediately after logout redirected to `/login?next=%2Fdashboard`.
  - Browser diagnostics again captured `POST http://127.0.0.1:54321/auth/v1/logout?scope=global -> net::ERR_ABORTED`.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - Treated as known benign QA-001 behavior only because logout succeeded and protected routes remained protected.
  - No user-facing auth break was observed.

### 9. v0.9 discovery notes

- Status: PASS
- Evidence summary:
  - Collected and classified observations into the required buckets.
  - No implementation was performed and no planning scope was opened.
- Screenshots or artifact filenames: none saved; browser-session evidence only.
- Notes:
  - See the discovery table below for the distilled candidate list.

## v0.8 regression verdict

| Check | Status | Evidence |
| --- | --- | --- |
| Read-only revision diff works | PASS | Snapshot route rendered both versions, showed the diff panel, surfaced `medium → critical`, and exposed no mutation controls. |
| RLS isolation preserved | PASS | User B received 404 for User A project and revision URLs and could still create an independent project. |
| Export still works | PASS | Standard export returned HTTP 200 with all required markers; export after failed regeneration still returned the last valid completed plan. |
| Critical-risk gate still works | PASS | Build-ready remained blocked until acknowledgement, then persisted across reload. |
| Failed-generation resilience | PASS | Invalid JSON generation failed safely, preserved the prior good plan, and did not create a new revision. |

## v0.9 discovery table

| ID | Observation | Bucket | User value | Risk/blast radius | Suggested next step | Candidate priority | Requires implementation? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OBS-001 | Revision history and snapshot compare are useful, but there is no way to restore a previous good revision after a successful regenerate. | Restore / rollback candidate | High — lets users recover from a worse regeneration without copy/paste or re-entry. | Medium to high — touches revision semantics, write paths, and confirmation UX. | Scope restore semantics, audit trail expectations, and guardrails before any implementation. | High | yes |
| OBS-002 | The diff panel is understandable, but the snapshot page becomes long because users must scan the summary and then two full snapshots in one view. | Diff UX improvement candidate | Medium to high — faster review of changes, less scrolling fatigue. | Low to medium — mostly snapshot-route presentation. | Evaluate collapsible unchanged sections, sticky anchors, or jump links between summary and snapshots. | Medium | yes |
| OBS-003 | The risk-level change is visible as plain text (`medium → critical`), but a stronger severity emphasis could improve safety comprehension. | Diff UX improvement candidate | Medium — helps users notice safety escalations faster. | Low — presentation-only if implemented carefully. | Explore accessible severity styling for critical transitions. | Medium | yes |
| OBS-004 | Markdown export is structurally correct and useful, but still feels Markdown-first rather than presentation-ready for broad stakeholder sharing. | PDF export candidate | Medium — easier sharing beyond technical readers. | Medium — export pipeline/UI surface only. | Validate whether a styled export format (PDF or print-friendly rendering) is the real stakeholder need. | Medium | yes |
| OBS-005 | Prototype options are clear, but nothing explicitly marks the primary / recommended option to build next. | Selected prototype marker candidate | Medium — reduces ambiguity when handing off the artifact. | Medium — may affect schema, UI, and export conventions. | Assess whether a dedicated recommended marker is warranted or whether ordering + rationale is sufficient. | Medium | yes |
| OBS-006 | Local manual QA depends on Docker Desktop and the local Supabase stack; once started, the stack was stable, but it is a hard prerequisite. | Reliability / CI / local-dev maintenance | Low to medium — faster bring-up for future QA runs. | Low — documentation/tooling/process scope. | Add or refine a preflight runbook / health-check note for Docker + Supabase readiness. | Low | no |
| OBS-007 | Logout still produces a browser-visible `ERR_ABORTED` on the Supabase logout request, but auth cleanup and route protection remain correct. | Not a v0.9 candidate / no action | Low — no user-facing failure observed. | Low — currently console noise only. | Keep tracked as known benign QA-001 unless it starts affecting user-visible behavior. | Low | no |
| OBS-008 | Failed regeneration resilience worked well: last good plan stayed visible and export kept using the latest completed valid plan. | Not a v0.9 candidate / no action | High — current behavior already protects users from failed outputs. | Low — no issue found in this pass. | No action; retain regression coverage. | Low | no |

## Recommendation

If v0.9 planning is opened later, this QA evidence most strongly supports prioritizing **revision restore** first.

Rationale:

- The app already has revision history and a useful read-only compare view.
- Successful regenerations can materially change the plan, including risk level, and today the prior version is viewable but not actionable.
- Markdown export is already functional and deterministic, so PDF/export polish feels less urgent than closing the recovery loop on revisions.
- Diff UX polish is the next most credible follow-up, but restore appears to provide the larger user-value step given the current state of the product.

Secondary candidates from this pass:

1. Diff UX polish
2. Selected prototype marker
3. PDF export
4. Maintenance-only work (local QA ergonomics)

## Strict boundary

- No v0.9 scope is approved by this report.
- No implementation was performed.
- This report is evidence for a future planning decision only.
