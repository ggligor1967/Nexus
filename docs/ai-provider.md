# AI Provider

Nexus generates plans through a small provider layer in `src/lib/ai/`. The provider is selected by
`NEXUS_AI_PROVIDER` and all output — from any provider — must pass `NexusPlanSchema` before it is
persisted or rendered.

## Selection

`provider.ts` reads `NEXUS_AI_PROVIDER`:

- `fixture` (default) → deterministic in-repo generation.
- `openai` → OpenAI Chat Completions.
- any other value → throws `Unsupported NEXUS_AI_PROVIDER: <value>`.

`generatePlan.ts` (`generatePlanFromAI`) is the thin wrapper the API calls; it delegates to the
selected provider.

## Fixture provider (`fixtureProvider.ts`)

Returns a hand-authored, schema-valid `NexusPlan` serialized to JSON — no network, fully
deterministic. The scenario is chosen by `inferScenario(prompt)`:

1. If `NEXUS_FIXTURE_SCENARIO` is `standard`, `critical`, or `invalid_json`, that value wins.
2. Otherwise (`auto` or unset), infer from the prompt text:
   - contains `invalid_json` → `invalid_json`
   - mentions employee monitoring / suspicious behavior / a surveillance risk domain → `critical`
   - else → `standard`

Behavior per scenario:

| Scenario | Output | Effect |
|---|---|---|
| `standard` | Medium-risk valid plan | Renders normally; build-ready allowed after acknowledgement is optional (not critical). |
| `critical` | Critical-risk valid plan (surveillance framing, strict red lines/safeguards) | Build-ready stays disabled until the acknowledgement checkbox is checked. |
| `invalid_json` | The literal string `{ invalid fixture json` | `JSON.parse` fails → run marked `failed`, HTTP `422`. |

> Fixture output is intentionally free of external market claims and is safe for offline QA and CI.

## OpenAI provider (`openaiProvider.ts`)

- **Lazy initialization:** the `OpenAI` client is constructed **inside** `generatePlanFromOpenAI`,
  per request — not at module load. Importing the module has no side effects and requires no key.
- If `OPENAI_API_KEY` is missing, it throws `OPENAI_API_KEY is not configured.` (the run is then
  recorded as failed).
- Model: `OPENAI_MODEL` or default `gpt-4.1-mini`.
- Request: Chat Completions with a strict system message ("You return JSON only…"),
  `response_format: { type: "json_object" }`, `temperature: 0.2`, wrapped in a **45-second timeout**.
- Output is trimmed and any surrounding ```` ```json ```` / ```` ``` ```` fences are stripped before
  it is returned to the API for parsing.

## Prompt (`prompt.ts`)

`buildNexusPrompt(input)` embeds the validated `ConceptInput` and instructs the model to return
JSON only, include ethical risks, produce 1–3 prototype options, respect MVP boundaries/non-goals,
increase safety detail for sensitive risk domains, avoid inventing market facts or citations, and
honor the requested language (`en`/`ro`/`bilingual`). It includes the required JSON shape inline.

## Schema validation (`schema.ts`)

`NexusPlanSchema` (Zod) is the contract every plan must satisfy. It requires, among others:

- `productThesis` (≥ 20 chars),
- `deconstruction` (userProblems ≥ 3, assumptions ≥ 3, plus targetAudience/jobsToBeDone/
  constraints/unknowns/successMetrics),
- `strategy` (positioning, differentiator, coreValueProposition, mvpBoundary, nonGoals),
- `prototypeOptions` (1–3; each with `type ∈ {lean_mvp, ai_enhanced, antifragile}`,
  `complexity ∈ {low, medium, high}`, `recommendedPlatform`, etc.),
- `ethicalRiskReport` (`overallRiskLevel ∈ {low, medium, high, critical}`, misuseCases ≥ 3,
  safeguards ≥ 3, redLines ≥ 2, plus privacy/bias/safety/manipulation risks),
- `roadmap` (phase1/2/3),
- `exportablePlanMarkdown` (≥ 100 chars).

The inferred type `NexusPlan` (from this schema) matches the interface in `src/types/nexus.ts`.

## Fail-closed behavior

In `generate-plan`:

1. `rawOutput = await generatePlanFromAI(prompt)`
2. `JSON.parse(rawOutput)` → on failure throw `AI returned invalid JSON.`
3. `NexusPlanSchema.parse(parsed)` → throws on any schema violation.

Any throw is caught, the `ai_plan_runs` row is updated to `status: failed` with the
`error_message` (and `raw_output` when available), and the API returns **`422`**
`{ "error": "AI generation failed validation." }`. No partial or unvalidated plan is ever
persisted as `plan_json` or rendered.

## `raw_output` logging

`ai_plan_runs.raw_output` stores the raw provider output for auditing:

- on success, alongside the validated `plan_json`;
- on failure, the offending text when available (e.g. the E2E `invalid_json` case persists
  `raw_output = "{ invalid fixture json"`).

This audit column is only ever read for diagnostics — see the next point.

## No raw invalid output in the UI

The project page renders only the validated `plan_json` of the latest **completed** run. A failed
**latest** run shows a `generation-failure-banner` with the `error_message` — never the raw invalid
model output. Invalid AI text does not reach the browser.
