# Local Development

Commands and workflows for developing Nexus locally. Examples use Windows PowerShell (the primary
supported dev environment); bash equivalents are given where they differ meaningfully.

## npm scripts

All scripts are defined in `package.json`:

| Command | What it does |
|---|---|
| `npm ci` | Canonical install from `package-lock.json` (exact, reproducible). Use instead of `npm install`. |
| `npm run dev` | Start the dev server on **port 3000** (`next dev`). |
| `npm run dev:3001` | Start the dev server on **port 3001** (`next dev -p 3001`). Project/CI convention. |
| `npm run build` | Production build (`next build`). |
| `npm run start` | Serve the production build (`next start`). |
| `npm run lint` | ESLint (`eslint .`). |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`). |
| `npm run test:e2e` | Playwright E2E with default workers. |
| `npm run test:e2e:local` | Playwright E2E with a single worker (`--workers=1`) — recommended locally. |

## Local Supabase

Docker must be running. Commands use the pinned CLI version via `npx`.

```powershell
npx supabase@2.108.0 start              # boot the local stack
npx supabase@2.108.0 status             # print URLs + keys (JSON: add -o json)
npx supabase@2.108.0 migration up --local   # apply pending migrations
npx supabase@2.108.0 stop               # tear down
```

To reset the local database to a clean, fully-migrated state (destroys local data):

```powershell
npx supabase@2.108.0 db reset --local
```

Migrations live in `supabase/migrations/` (`0001` base schema + RLS, `0002` restrict
`ai_plan_runs` writes, `0003` restrict `revisions` writes). See
[database-and-rls.md](database-and-rls.md).

## Typical dev loop

```powershell
npm ci
npx supabase@2.108.0 start
npx supabase@2.108.0 migration up --local
# populate .env.local from `supabase status` (see getting-started.md)
npm run dev:3001
```

Before opening a PR, run the same gates CI runs:

```powershell
npm run typecheck
npm run build
npm run test:e2e:local   # requires Supabase running + app on 3001
```

## Windows caveats

These come from the v0.5/v0.6 runtime work on Windows and are the most common local snags.

### npm cache `ENOSPC`

If `npx` or `npm run` fails with `ENOSPC` (no space) in the global npm cache
(e.g. `C:\npm-cache`), point npm at a temporary cache on a drive with space:

```powershell
$env:npm_config_cache='C:\tmp\npm-cache-nexus'
```

Set it for the session before running install/test commands. A known-good full local E2E
invocation from the v0.6 baseline:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=2048'
$env:E2E_BASE_URL='http://localhost:3001'
$env:npm_config_cache='C:\tmp\npm-cache-nexus'
npm run test:e2e:local
```

### Port 3001

Use `npm run dev:3001` and point Playwright at `http://localhost:3001`. During v0.5 verification
port 3000 was frequently occupied, so 3001 became the standard for the app and CI. Keep
`E2E_BASE_URL` in sync with the port you actually run.

### `EPERM` / locked `next-swc`

On Windows, a stale dev server or antivirus lock can leave `.next` holding
`next-swc*.node`, producing `EPERM` on the next build/dev start. Stop any running Next process,
then remove the build cache and retry:

```powershell
# stop the dev server first
Remove-Item -Recurse -Force .next
npm run dev:3001
```

### Disk pressure

The v0.7 consolidated gate could not run the full E2E suite + `next build` locally because the
host disk hit 100%; hosted GitHub Actions was the authoritative gate. If local disk is tight,
free space (clear `.next`, old npm caches, `test-results/`, `playwright-report/`) or rely on CI
for the full run.

## Safe live testing without code changes

To exercise the running app manually without touching source:

1. Start Supabase + migrations, populate `.env.local`, run `npm run dev:3001`.
2. Keep `NEXUS_AI_PROVIDER=fixture` for deterministic output.
3. Drive the flow in the browser (sign up → project → generate → export → regenerate → snapshot).
4. To hit failure paths, either set `NEXUS_FIXTURE_SCENARIO=invalid_json` or include the literal
   text `invalid_json` in the concept. Restart the dev server after changing env vars.

None of the above modifies application code, tests, migrations, or dependencies.

## Worktree-based testing option

To test on an isolated checkout without disturbing your main working tree, use a git worktree:

```powershell
git worktree add ../nexus-test HEAD
cd ../nexus-test
npm ci
# run Supabase + app + tests here
```

Clean up when done:

```powershell
cd ../Nexus
git worktree remove ../nexus-test
```

This keeps your primary workspace and its `.next`/`node_modules` untouched.
