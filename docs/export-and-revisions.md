# Export & Revisions

Two v0.7 artifact-quality features: a **deterministic Markdown export** and a **read-only revision
history**. Both are driven by the validated `plan_json` (the source of truth).

## Deterministic Markdown export

The renderer lives in `src/lib/export/markdown.ts` and is a **pure function**: identical inputs
always produce identical output (verified by the `markdown-unit` spec). Nothing time- or
random-based enters the export path — the only "time" value is the run's persisted `completed_at`.

### `planToMarkdown(projectName, plan, meta)`

- `projectName: string` — the project title (used in the `# heading` and frontmatter `title`).
- `plan: NexusPlan` — the validated plan.
- `meta: ExportMeta` — export metadata (below).

Returns a Markdown document with YAML frontmatter, a risk-level callout, numbered sections
(1 Product Thesis … 7 Build-Ready Checklist), a `### 2.4 Constraints` subsection, numbered prototype
options (`### Option N — <title>`), the full ethical risk report, the roadmap, and a build-ready
checklist.

`sanitizeFilename(title)` lowercases, replaces non-`[a-z0-9-_]` runs with `-`, trims, caps length,
and falls back to `nexus-plan`. The download filename is `<sanitized-title>.md`.

### `ExportMeta`

```ts
interface ExportMeta {
  exportedAt: string;   // = ai_plan_runs.completed_at (persisted)
  modelName: string;    // = ai_plan_runs.model_name    (persisted, e.g. "fixture")
  riskLevel: RiskLevel; // = plan.ethicalRiskReport.overallRiskLevel
}
```

All metadata is **persisted-only**: it comes from the completed run and the validated plan, never
from `Date.now()` or the request. That is what keeps the export reproducible.

### YAML frontmatter

```yaml
---
title: "<project title, quotes/newlines escaped>"
exported_at: "<completed_at>"
risk_level: "<low|medium|high|critical>"
model: "<model name>"
format: "nexus-markdown-v1"
source: "validated_plan_json"
---
```

Values are emitted through `yamlString()`, which escapes backslashes and double-quotes and flattens
newlines to spaces, so a title like `A "Risky"\nApp` becomes `title: "A \"Risky\" App"` on one line.
`format` and `source` are constant markers; `source: "validated_plan_json"` documents that the
export is rendered from the validated plan, not raw model text.

### `exportablePlanMarkdown` is excluded

`NexusPlan` contains an `exportablePlanMarkdown` field, but `planToMarkdown` **does not** embed it.
The exported document is built section-by-section from the structured plan; the model-authored
`exportablePlanMarkdown` blob is intentionally left out of the main output (asserted by the
`markdown-unit` spec).

### Persistence

`POST /api/projects/[id]/export/markdown` requires a completed run with `plan_json` (else `404`),
re-validates it, renders the Markdown, inserts an `exported_plans` row
(`format: "markdown"`, `content: <markdown>`, `ai_plan_run_id`), sets project `status: exported`,
and returns the file as a `text/markdown` download. The insert uses the user client under RLS.

## Revision history

Nexus records revisions using **model A**: a revision captures the transition between two completed
plans on the same project.

### When a revision is (and isn't) created

| Event | Revision created? |
|---|---|
| **First** successful generation (no prior completed plan) | **No** |
| Successful **regeneration** (a prior completed plan existed) | **Yes** — exactly one |
| Regeneration that **fails/invalid** (422) | **No** |

The revision row is written by the generate-plan API through the **admin/service-role client** and
is **non-fatal**: if the revision insert fails, a valid generation still returns `200` (the failure
is logged, not surfaced as an error).

### Snapshot fields

Each `revisions` row stores:

- `previous_snapshot` — the plan that was current before this regeneration,
- `new_snapshot` — the newly generated plan,
- `ai_plan_run_id` — the run that produced `new_snapshot`,
- `revision_note` — `"Plan regenerated"`.

> **Known, by design (model A):** regenerating from the *same* concept can produce
> `previous_snapshot === new_snapshot` (fixture output is deterministic). This is expected and does
> not require a diff. Tracked as a documented, non-blocking note — see
> [maintenance-backlog.md](maintenance-backlog.md).

### Read-only snapshot route

`/projects/[id]/revisions/[revisionId]` (`src/app/projects/[id]/revisions/[revisionId]/page.tsx`)
renders both snapshots via `GeneratedPlanView` in `readOnly` mode — no acknowledgement or
build-ready controls appear. It performs an explicit ownership check (defense in depth alongside
RLS); non-owners get the 404 page. Verified by `REV-UI-001` and `REV-RLS-001`.

### Not in v0.7

- **No restore** — you cannot roll a project back to a previous snapshot.
- **No diff/compare engine** — snapshots are shown in full, not as a computed diff.

These are future candidates only; see [roadmap.md](roadmap.md).

## User-facing flow

1. Generate a plan (first generation → no revision).
2. Click **Regenerate plan** → the prefilled concept intake reappears.
3. Adjust the concept and generate again → one revision is recorded; the new plan becomes current.
4. In **Revision History**, click **View snapshot** to open the read-only previous/new view.
5. **Export Markdown** at any time to download the current validated plan.
