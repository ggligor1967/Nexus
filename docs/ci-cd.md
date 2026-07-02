# CI/CD

This documents the **current** CI pipeline only: `.github/workflows/nexus-ci.yml`. It is a single
reproducible workflow. Enterprise/deployment tooling is explicitly **out of scope** (see the end
of this page).

## Triggers

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

Runs on every pull request and on pushes to `main`. `permissions: contents: read`. The Supabase
CLI version is pinned via `env.SUPABASE_CLI_VERSION: 2.108.0`.

## Job: `static-gates`

Runs on `ubuntu-latest`, Node 22 (`actions/setup-node@v4`, npm cache). Steps:

1. **Checkout** (`actions/checkout@v4`).
2. **Install** — `npm ci` (exact, lockfile-driven).
3. **Dependency pin check** — a small Node script fails the build if any direct dependency in
   `package.json` uses `latest` or a `^`/`~` range. All direct deps must be **exact pins**.
4. **Audit** — `npm audit --audit-level=high` (fails only on high/critical). The known
   next→postcss issues are **moderate**, so they do not fail this gate — see
   [maintenance-backlog.md](maintenance-backlog.md) (SEC-001).
5. **Typecheck** — `npm run typecheck` (`tsc --noEmit`).
6. **Build** — `npm run build`.

## Job: `e2e-local-supabase`

Runs on `ubuntu-latest`. Steps:

1. **Checkout** + **Setup Node 22**.
2. **Install** — `npm ci`.
3. **Install Playwright Chromium** — `npx playwright install --with-deps chromium`.
4. **Start Supabase local** — `npx supabase@2.108.0 start`.
5. **Apply migrations** — `npx supabase@2.108.0 migration up --local` (includes `0002` and `0003`).
6. **Create fixture environment** — reads `supabase status -o json`, verifies `API_URL`/`ANON_KEY`/
   `SERVICE_ROLE_KEY` are present, and writes a `.env.local` with those values plus
   `NEXUS_AI_PROVIDER=fixture`, `NEXUS_FIXTURE_SCENARIO=auto`, `E2E_BASE_URL=http://localhost:3001`,
   and the E2E user credentials.
7. **Start app on 3001** — `npm run dev:3001` in the background, then polls
   `curl http://localhost:3001` for up to ~120s; dumps `next-dev.log` and fails if it never comes up.
8. **Run E2E** — `npm run test:e2e:local` with `E2E_BASE_URL=http://localhost:3001`.
9. **Upload failure artifacts** (`if: failure()`) — `next-dev.log`, `test-results/`,
   `playwright-report/` (artifact `nexus-ci-failure-artifacts`).
10. **Stop app** and **Stop Supabase** (`if: always()`).

## Expected result

Both jobs green. Promotion requires hosted CI green on the PR and on the merge commit to `main`
(see [release-and-promotion.md](release-and-promotion.md)). A docs-only change still triggers both
jobs; they are expected to remain green.

## Known CI note

**CI-WARN-001** (non-blocking): GitHub Actions emits runtime warnings for `actions/checkout@v4` and
`actions/setup-node@v4` (their bundled Node runtime is older than the runner's default). These are
annotations only and do not fail the build. Revisit when a stable newer action major is standard.
See [maintenance-backlog.md](maintenance-backlog.md).

## Explicitly out of scope

The following are **not** part of the pipeline and are not planned as part of the current CI scope:

- Docker image build/publishing and GHCR
- `semantic-release` / automated versioning
- Deployment / release automation to any environment
- Lighthouse / performance audits
- OWASP ZAP / DAST scanning
- Any broader "enterprise CI/CD" suite

The v0.6 record accepted a CI/CD blueprint as **backlog only**; the active scope is this one
reproducible workflow. Do not document the above as available.
