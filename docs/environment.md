# Environment

Nexus reads configuration from `.env.local` (git-ignored). Copy `.env.example` to `.env.local`
and fill in values. This page documents every variable, which are public vs secret, and the
provider/QA modes.

## Variable reference

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser + server) | Yes | Supabase API URL. Used by the browser, server, and proxy clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser + server) | Yes | Supabase anon key; RLS-scoped access under the signed-in session. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret (server only)** | Yes | Service-role key that **bypasses RLS**. Used only by the admin client for `ai_plan_runs` and `revisions` writes. |
| `NEXUS_AI_PROVIDER` | Server | No (default `fixture`) | `fixture` (deterministic) or `openai`. Unknown values throw. |
| `NEXUS_FIXTURE_SCENARIO` | Server | No (default `auto`) | `auto` \| `standard` \| `critical` \| `invalid_json` (fixture mode only). |
| `OPENAI_API_KEY` | **Secret (server only)** | Only if `NEXUS_AI_PROVIDER=openai` | OpenAI credential. The client is created lazily per request. |
| `OPENAI_MODEL` | Server | No (default `gpt-4.1-mini`) | OpenAI model name. |
| `E2E_BASE_URL` | Test only | For E2E | Base URL Playwright targets (e.g. `http://localhost:3001`). |
| `E2E_USER_A_EMAIL` / `E2E_USER_A_PASSWORD` | Test only | For E2E | Credentials for test user A. |
| `E2E_USER_B_EMAIL` / `E2E_USER_B_PASSWORD` | Test only | For E2E | Credentials for test user B (RLS isolation tests). |

> The `NEXT_PUBLIC_` prefix is a Next.js convention: only those variables are inlined into
> client-side bundles. Everything without the prefix stays server-side.

## Public vs secret

- **Public / browser-safe:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon
  key is designed to be exposed; it grants only what RLS policies allow for the current session.
- **Secret / server-only:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`. These must never appear
  in client bundles, logs, or the repository.

### Service-role warning

`SUPABASE_SERVICE_ROLE_KEY` **bypasses Row Level Security**. It is read only in
`createAdminSupabaseClient()` (`src/lib/supabase/server.ts`) and used exclusively server-side to
write `ai_plan_runs` and `revisions` (the audit tables). Do **not**:

- prefix it with `NEXT_PUBLIC_`,
- import the admin client into any `"use client"` component,
- return it in an API response, or
- commit it to git.

If it leaks, rotate it in Supabase immediately.

## Provider modes

### Fixture (default)

```env
NEXUS_AI_PROVIDER=fixture
NEXUS_FIXTURE_SCENARIO=auto
```

No OpenAI key required. Generation is deterministic and offline — this is what local dev, QA, and
CI use. Scenario behavior:

- `auto` — infer from the concept text: surveillance/employee-monitoring wording → `critical`;
  text containing `invalid_json` → the invalid-output path; otherwise `standard`.
- `standard` — a medium-risk sample plan.
- `critical` — a critical-risk plan (surveillance framing) that requires acknowledgement.
- `invalid_json` — returns malformed JSON to exercise fail-closed validation (run marked `failed`,
  HTTP 422). Useful for QA of the error path.

### OpenAI

```env
NEXUS_AI_PROVIDER=openai
OPENAI_API_KEY=sk-...            # server-only secret
OPENAI_MODEL=gpt-4.1-mini        # optional; this is the default
```

The OpenAI client is instantiated lazily inside the request; if `OPENAI_API_KEY` is missing,
generation throws and the run is recorded as failed. See [ai-provider.md](ai-provider.md).

## E2E variables

Playwright reads these from the environment or directly from `.env.local` (via a small `getEnv()`
helper in the test file) when process env vars are absent:

```env
E2E_BASE_URL=http://localhost:3001
E2E_USER_A_EMAIL=user-a@example.test
E2E_USER_A_PASSWORD=Password123!
E2E_USER_B_EMAIL=user-b@example.test
E2E_USER_B_PASSWORD=Password123!
```

CI generates its own `.env.local` from `supabase status` and pins `E2E_BASE_URL=http://localhost:3001`.
See [ci-cd.md](ci-cd.md).

## `.env.local` safety

- `.env.local` and `.env.*.local` are in `.gitignore` — keep it that way.
- Never paste real Supabase or OpenAI keys into documentation, issues, or commits.
- The values in `.env.example` are empty placeholders and safe to commit.

## Deterministic QA environment

For reproducible manual/automated QA without OpenAI:

```env
NEXUS_AI_PROVIDER=fixture
NEXUS_FIXTURE_SCENARIO=auto
```

To exercise the invalid-JSON failure path specifically:

```env
NEXUS_AI_PROVIDER=fixture
NEXUS_FIXTURE_SCENARIO=invalid_json
```
