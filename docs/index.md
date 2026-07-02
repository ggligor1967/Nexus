# Nexus Documentation

Documentation hub for **Omni-Intellect Nexus** — a Next.js 16 app that converts product
concepts into schema-validated, ethical, build-ready plans and exports them as Markdown.

## Current status

| Milestone | State | Record |
|---|---|---|
| v0.5 | RUNTIME VERIFIED — baseline committed | [v0.5 runtime verification](v0.5-runtime-verification.md) · [v0.5 test matrix](v0.5-test-matrix.md) |
| v0.6 | HARDENED BASELINE VERIFIED | [v0.6 reproducibility baseline](v0.6-reproducibility-baseline.md) |
| **v0.7 (current)** | **PROMOTED — Artifact Quality + Revision UX** | [v0.7 promotion](v0.7-promotion.md) · [v0.7 planning](v0.7-planning.md) |

- PR #1 merged to `main`; hosted CI on `main` is green.
- **QA-001** (benign logout `ERR_ABORTED` console noise) is open as a **minor, non-blocking**
  follow-up. See [maintenance backlog](maintenance-backlog.md) and
  [issue #2](https://github.com/ggligor1967/Nexus/issues/2).
- **v0.8 planning is not open** until a scope is explicitly approved. See [roadmap](roadmap.md).

## Quick links by audience

**User / operator**
- [Getting started](getting-started.md) — install, local Supabase, first manual flow.
- [Environment](environment.md) — variables, fixture vs OpenAI, safety.
- [Troubleshooting](troubleshooting.md) — common local failures and fixes.

**Developer**
- [Architecture](architecture.md) — App Router structure, request flow, clients, lifecycles.
- [API reference](api-reference.md) — every route: auth, input, output, errors, side effects.
- [Local development](local-development.md) — commands, Supabase, Windows caveats.
- [Export & revisions](export-and-revisions.md) — Markdown renderer + revision model.
- [AI provider](ai-provider.md) — fixture/OpenAI, scenarios, schema validation.

**QA / tester**
- [Testing & QA](testing-and-qa.md) — E2E matrix, modes, single-test runs, failure interpretation.

**Security reviewer**
- [Security model](security-model.md) — auth boundary, RLS, service-role, write restrictions.
- [Database & RLS](database-and-rls.md) — tables, ownership, policies, migrations.

**Release manager**
- [Release & promotion](release-and-promotion.md) — promotion model and version history.
- [CI/CD](ci-cd.md) — the current pipeline (and what is out of scope).
- [Roadmap](roadmap.md) · [Maintenance backlog](maintenance-backlog.md)

## Version history (audit trail)

The version/audit documents below are **preserved as-is** — they record what was true at each
milestone and are not rewritten. This hub links them; the guides above describe the **current**
(v0.7) state of the code.

- **v0.5** — runtime proof: app boots, typecheck/build pass, E2E passes, RLS isolation verified.
  → [v0.5-runtime-verification.md](v0.5-runtime-verification.md), [v0.5-test-matrix.md](v0.5-test-matrix.md)
- **v0.6** — hardening & reproducibility: `npm ci` baseline, dependency pins, service-role write
  restrictions (SEC-003), build-ready guard (SEC-002), reproducible CI pipeline.
  → [v0.6-reproducibility-baseline.md](v0.6-reproducibility-baseline.md)
- **v0.7** — artifact quality & revision UX: deterministic Markdown export, read-only revision
  history, hardened revisions write path (migration `0003`).
  → [v0.7-promotion.md](v0.7-promotion.md), [v0.7-planning.md](v0.7-planning.md)
- Design/plan artifacts: `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Scope boundary

Nexus deliberately keeps a narrow surface. The following are **not implemented** and are only
future candidates, none approved: revision restore, PDF export, diff/compare engine, market
intelligence/scan, collaboration, and deployment/enterprise-CI expansion. Do not treat any of
these as available. See [roadmap](roadmap.md).
