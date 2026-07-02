# Getting Started

This guide takes you from a fresh clone to a running Nexus app and a full manual flow using the
deterministic **fixture** AI provider (no OpenAI key required).

## Prerequisites

- **Node.js** — the project has no `engines` pin; CI validates on **Node 22**, so use Node 22 LTS.
- **npm** — bundled with Node. `npm ci` is the canonical install (exact, lockfile-driven).
- **Docker Desktop** — required by the local Supabase stack. It must be running before
  `supabase start`.
- **Supabase CLI** — no global install needed; commands use `npx supabase@2.108.0`.

## 1. Clone and install

```powershell
git clone https://github.com/ggligor1967/Nexus.git
cd Nexus
npm ci
```

Use `npm ci` (not `npm install`) so the pinned `package-lock.json` is honored exactly. CI does the
same.

## 2. Start local Supabase and apply migrations

Docker must be running.

```powershell
npx supabase@2.108.0 start
npx supabase@2.108.0 migration up --local
```

`supabase start` prints local URLs and keys. Note the **API URL**, **anon key**, and
**service_role key** — you can re-print them any time with:

```powershell
npx supabase@2.108.0 status
```

Default local ports: API `54321`, database `54322`, Studio `54323`, email test UI `54324`.

## 3. Configure `.env.local`

```powershell
Copy-Item .env.example .env.local
```

Then edit `.env.local` and set the Supabase values from `supabase status`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>

# Deterministic AI, no OpenAI key needed:
NEXUS_AI_PROVIDER=fixture
NEXUS_FIXTURE_SCENARIO=auto
```

`.env.local` is git-ignored. Never commit real keys. The `SUPABASE_SERVICE_ROLE_KEY` is a
**server-only secret** — see [environment.md](environment.md).

## 4. Fixture provider (default)

With `NEXUS_AI_PROVIDER=fixture`, plan generation returns a deterministic in-repo plan and never
calls OpenAI. `NEXUS_FIXTURE_SCENARIO=auto` infers the scenario from the concept text
(`standard`, `critical` for surveillance-type concepts, or `invalid_json` to exercise the
fail-closed path). This is the recommended mode for local development and QA. See
[ai-provider.md](ai-provider.md).

## 5. Run the app on port 3001

```powershell
npm run dev:3001
```

Port 3001 is the project/CI convention (`npm run dev` uses 3000; see
[local-development.md](local-development.md) for why 3001 is preferred). Open
<http://localhost:3001>.

## 6. First manual flow

1. **Sign up** — go to `/sign-up`, enter an email + password (min 8 chars), submit. Local Supabase
   has email confirmation disabled (`enable_confirmations = false`), so you land on `/dashboard`
   immediately. (The form's status text mentions email confirmation only for setups where it is
   enabled.)
2. **Create a project** — on the dashboard, enter a title (3–120 chars) and create it. You are
   redirected to `/projects/<id>`.
3. **Generate a plan** — fill the concept intake (raw concept must be **≥ 50 characters**), pick a
   risk domain and platform(s), and click **Generate Product Plan**. The validated plan renders
   with a Product Thesis, Deconstruction, Strategy, Prototype Options, an Ethical Risk Report, and
   a Roadmap.
4. **Export Markdown** — click **Export Markdown** to download a `.md` file. The export is also
   persisted to `exported_plans`. See [export-and-revisions.md](export-and-revisions.md).
5. **Regenerate** — click **Regenerate plan** to re-open the (prefilled) intake and generate a new
   plan. Because a completed plan already existed, this records **one** revision.
6. **View revision history** — the Revision History panel lists revisions; click **View snapshot**
   to open the read-only `/projects/<id>/revisions/<revisionId>` route showing the previous and new
   snapshots side by side. There is no restore or diff view in v0.7.

To try the critical-risk path, choose the **Surveillance** risk domain with a workplace-monitoring
concept: the plan is marked `critical` and **Mark build-ready** stays disabled until you check the
acknowledgement box.

## Next steps

- [Local development](local-development.md) — all commands and Windows caveats.
- [Testing & QA](testing-and-qa.md) — run the E2E suite.
- [Architecture](architecture.md) — how the pieces fit together.
