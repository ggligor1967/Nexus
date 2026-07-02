# Troubleshooting

Common local issues and fixes. Examples use Windows PowerShell. See also
[local-development.md](local-development.md) and [environment.md](environment.md).

## `.env.local` missing

**Symptom:** `Missing Supabase server environment variables.` (thrown by
`createServerSupabaseClient`), or the proxy silently passing everything through.
**Fix:** `Copy-Item .env.example .env.local`, then fill in `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from `supabase status`.

## Supabase not running

**Symptom:** auth/DB calls hang or fail; E2E stalls on sign-up.
**Fix:**

```powershell
npx supabase@2.108.0 status   # check
npx supabase@2.108.0 start    # start if down
```

## Docker not running

**Symptom:** `supabase start` errors about the Docker daemon / cannot connect.
**Fix:** start Docker Desktop and wait until it is ready, then re-run `supabase start`.

## Migration not applied

**Symptom:** queries fail with missing tables/policies; RLS behaves unexpectedly; new columns
absent.
**Fix:**

```powershell
npx supabase@2.108.0 migration up --local
# or, to rebuild a clean migrated DB (destroys local data):
npx supabase@2.108.0 db reset --local
```

## Connection refused on port 3001

**Symptom:** `connect ECONNREFUSED 127.0.0.1:3001` during E2E, or the browser cannot reach the app.
**Fix:** start the app with `npm run dev:3001` and ensure `E2E_BASE_URL=http://localhost:3001`
matches the port. Keep the dev server running in its own shell.

## npm cache `ENOSPC`

**Symptom:** `npm ci`/`npx`/`npm run` fails with `ENOSPC` in the global npm cache (e.g.
`C:\npm-cache`).
**Fix:** redirect the cache for the session:

```powershell
$env:npm_config_cache='C:\tmp\npm-cache-nexus'
```

Also free disk space (see below).

## `EPERM` / locked `next-swc`

**Symptom:** `EPERM: operation not permitted` touching `next-swc*.node` in `.next` on Windows.
**Fix:** stop any running Next dev/build process, then clear the build cache:

```powershell
Remove-Item -Recurse -Force .next
npm run dev:3001
```

Antivirus locking the `.next` directory can also cause this; retry after it releases the file.

## Port 3000 / 3001 conflict

**Symptom:** "port already in use" on start.
**Fix:** use `npm run dev:3001` (or `npm run dev` for 3000) on the free port, and set
`E2E_BASE_URL` accordingly. Find and stop the process holding the port:

```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
Stop-Process -Id <pid>
```

## Git remote missing

**Symptom:** `git push` fails with no configured remote (a fresh/local-only clone).
**Fix:** add the remote before pushing:

```powershell
git remote add origin https://github.com/ggligor1967/Nexus.git
git push -u origin main
```

(The v0.5 record notes the original `.git` metadata was recreated in-place during OPS-001; a local
checkout may lack `origin`.)

## Git worktree cleanup

**Symptom:** leftover worktrees after isolated testing.
**Fix:**

```powershell
git worktree list
git worktree remove ../nexus-test
git worktree prune
```

## Playwright browser / system deps

**Symptom:** Playwright cannot launch Chromium, or complains about missing browsers/deps.
**Fix:**

```powershell
npx playwright install --with-deps chromium
```

(CI runs exactly this before the E2E job.)

## Expected 404 for unauthorized access

**Not a bug:** accessing another user's project, generate/export endpoint, or revision snapshot
returns a **404** page or `404` response by design (ownership + RLS). Tests assert this. If you see
"404 — Not found" for a resource you do not own, that is correct behavior — see
[security-model.md](security-model.md).

## Logout `ERR_ABORTED` (QA-001)

**Not a bug (minor, non-blocking):** logging out can leave a benign `ERR_ABORTED` in the browser
console because the in-flight `signOut()` request is aborted by the immediate navigation to
`/login`. Logout still works and protected routes still redirect. Tracked as
[issue #2](https://github.com/ggligor1967/Nexus/issues/2); see
[maintenance-backlog.md](maintenance-backlog.md).

## Disk full during build/E2E

**Symptom:** build or the full E2E suite fails when the host disk is near 100% (seen during v0.7
local gating).
**Fix:** free space — clear `.next`, `test-results/`, `playwright-report/`, and stale npm caches —
or rely on hosted CI (clean runner) for the full run.
