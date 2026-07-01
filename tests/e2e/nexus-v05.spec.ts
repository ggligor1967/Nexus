import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const userA = {
  email: process.env.E2E_USER_A_EMAIL ?? "user-a@example.test",
  password: process.env.E2E_USER_A_PASSWORD ?? "Password123!"
};

const userB = {
  email: process.env.E2E_USER_B_EMAIL ?? "user-b@example.test",
  password: process.env.E2E_USER_B_PASSWORD ?? "Password123!"
};

async function signUpOrLogin(page: import("@playwright/test").Page, user: typeof userA) {
  await page.goto("/sign-up");
  await page.getByTestId("auth-email-input").fill(user.email);
  await page.getByTestId("auth-password-input").fill(user.password);
  await page.getByTestId("auth-submit-button").click();

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 }).catch(() => null);

  if (!page.url().includes("/dashboard")) {
    await expect(page.locator(".error").first()).toBeVisible();
    await page.goto("/login");
    await page.getByTestId("auth-email-input").fill(user.email);
    await page.getByTestId("auth-password-input").fill(user.password);
    await page.getByTestId("auth-submit-button").click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 }).catch(() => null);
  }

  await expect(page).toHaveURL(/\/dashboard/);
}

async function createProject(page: import("@playwright/test").Page, title: string) {
  await page.getByTestId("project-title-input").fill(title);
  await page.getByTestId("create-project-button").click();
  await expect(page).toHaveURL(/\/projects\//);
  return page.url().split("/projects/")[1].split(/[?#]/)[0];
}

function getEnv(name: string) {
  if (process.env[name]) {
    return process.env[name];
  }

  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);

    if (match?.[1] === name) {
      return match[2].replace(/^['"]|['"]$/g, "");
    }
  }

  return undefined;
}

function createAdminClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables for E2E DB assertions.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

async function createUserSupabaseClient(user: typeof userA) {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error("Missing Supabase browser environment variables for E2E DB assertions.");
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false
    }
  });

  const { error } = await supabase.auth.signInWithPassword(user);

  if (error) {
    throw error;
  }

  return supabase;
}

test.describe("Nexus v0.5 core flow", () => {
  test("AUTH-001/002/003: sign up or login, then logout protects dashboard", async ({ page }) => {
    await signUpOrLogin(page, userA);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard|\/login/);
  });

  test("PROJECT + PLAN + EXPORT: user creates project, generates fixture plan, exports Markdown", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Nexus E2E ${Date.now()}`);

    await page.getByTestId("raw-concept-input").fill(
      "A simple to-do app for students who forget deadlines and need a structured plan with reminders, ethical safeguards, and a clear MVP boundary."
    );

    await page.getByTestId("generate-plan-button").click();

    await expect(page.getByText("Product Thesis")).toBeVisible();
    await expect(page.getByTestId("ethical-risk-panel")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-markdown-button").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.md$/);

    const supabase = createAdminClient();
    await expect
      .poll(async () => {
        const { data, error } = await supabase
          .from("exported_plans")
          .select("id, project_id, ai_plan_run_id, format, content")
          .eq("project_id", projectId)
          .eq("format", "markdown")
          .limit(1);

        if (error) {
          throw error;
        }

        return data?.[0] ?? null;
      })
      .toMatchObject({
        project_id: projectId,
        ai_plan_run_id: expect.any(String),
        format: "markdown",
        content: expect.stringContaining("#")
      });
  });

  test("PLAN-002: invalid concept under 50 chars is blocked before AI call", async ({ page }) => {
    await signUpOrLogin(page, userA);
    await createProject(page, `Invalid Concept ${Date.now()}`);

    await page.getByTestId("raw-concept-input").fill("Too short.");
    await page.getByTestId("generate-plan-button").click();

    await expect(page.getByText("Concept must be at least 50 characters.")).toBeVisible();
  });

  test("PLAN-003/TEST-002: invalid AI JSON is rejected and logged fail-closed", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Invalid AI JSON ${Date.now()}`);

    const generateResponse = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A valid product planning concept that deliberately includes invalid_json to exercise deterministic fixture failure handling and schema rejection.",
        platform: ["web"],
        language: "en",
        riskDomain: "general",
        outputType: "full_prd",
        constraints: {}
      }
    });

    expect(generateResponse.status()).toBe(422);
    await expect(generateResponse.json()).resolves.toMatchObject({
      error: "AI generation failed validation."
    });

    const supabase = createAdminClient();
    await expect
      .poll(async () => {
        const { data, error } = await supabase
          .from("ai_plan_runs")
          .select("status, raw_output, error_message, plan_json")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        return data?.[0] ?? null;
      })
      .toMatchObject({
        status: "failed",
        raw_output: "{ invalid fixture json",
        error_message: "AI returned invalid JSON.",
        plan_json: null
      });

    const exportResponse = await page.request.post(`/api/projects/${projectId}/export/markdown`);
    expect(exportResponse.status()).toBe(404);
  });

  test("SEC-002: build-ready acknowledgement requires a completed validated plan", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Build Ready Guard ${Date.now()}`);

    const blockedResponse = await page.request.patch(`/api/projects/${projectId}`, {
      data: {
        buildReadyAcknowledged: true
      }
    });

    expect(blockedResponse.status()).toBe(409);
    await expect(blockedResponse.json()).resolves.toMatchObject({
      error: "Build-ready acknowledgement requires a completed validated plan."
    });

    const generateResponse = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A planning workspace that helps small teams turn rough product ideas into validated implementation plans with clear safeguards and exportable artifacts.",
        platform: ["web"],
        language: "en",
        riskDomain: "general",
        outputType: "full_prd",
        constraints: {}
      }
    });

    expect(generateResponse.status()).toBe(200);

    const allowedResponse = await page.request.patch(`/api/projects/${projectId}`, {
      data: {
        buildReadyAcknowledged: true
      }
    });

    expect(allowedResponse.status()).toBe(200);
    await expect(allowedResponse.json()).resolves.toMatchObject({
      project: {
        id: projectId,
        build_ready_acknowledged: true
      }
    });
  });

  test("REV-SEC-001: client cannot directly insert revisions", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Rev Insert Guard ${Date.now()}`);

    const userSupabase = await createUserSupabaseClient(userA);
    const { data: insertedRev, error: insertError } = await userSupabase
      .from("revisions")
      .insert({
        project_id: projectId,
        revision_note: "client-direct",
        new_snapshot: {}
      })
      .select("id");

    expect(insertError).not.toBeNull();
    expect(insertedRev).toBeNull();
  });

  test("SEC-003: client can read own AI runs but cannot write them directly", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `AI Run RLS ${Date.now()}`);

    const generateResponse = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A reliable planning assistant that creates validated product artifacts for teams while preserving a server-controlled audit trail for AI plan runs.",
        platform: ["web", "ai"],
        language: "en",
        riskDomain: "general",
        outputType: "full_prd",
        constraints: {}
      }
    });

    expect(generateResponse.status()).toBe(200);

    const userSupabase = await createUserSupabaseClient(userA);
    const { data: runs, error: selectError } = await userSupabase
      .from("ai_plan_runs")
      .select("id, project_id, concept_input_id, model_name")
      .eq("project_id", projectId)
      .limit(1);

    expect(selectError).toBeNull();
    expect(runs).toHaveLength(1);

    const run = runs?.[0];
    expect(run).toMatchObject({
      project_id: projectId,
      model_name: "fixture"
    });

    const { data: insertedRuns, error: insertError } = await userSupabase
      .from("ai_plan_runs")
      .insert({
        project_id: projectId,
        concept_input_id: run?.concept_input_id,
        model_name: "client-direct",
        status: "queued"
      })
      .select("id");

    expect(insertError).not.toBeNull();
    expect(insertedRuns).toBeNull();

    const { data: updatedRuns, error: updateError } = await userSupabase
      .from("ai_plan_runs")
      .update({ model_name: "client-tamper" })
      .eq("id", run?.id)
      .select("id, model_name");

    expect(Boolean(updateError) || updatedRuns?.length === 0).toBe(true);

    const adminSupabase = createAdminClient();
    const { data: persistedRun, error: persistedRunError } = await adminSupabase
      .from("ai_plan_runs")
      .select("model_name")
      .eq("id", run?.id)
      .single();

    expect(persistedRunError).toBeNull();
    expect(persistedRun?.model_name).toBe("fixture");
  });

  test("EXPORT-CONTENT: markdown has escaped frontmatter, constraints, risk callout, numbered option", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Export "Quote" ${Date.now()}`);

    await page.getByTestId("raw-concept-input").fill(
      "A simple to-do app for students who forget deadlines and need a structured plan with reminders, ethical safeguards, and a clear MVP boundary."
    );
    await page.getByTestId("generate-plan-button").click();
    await expect(page.getByText("Product Thesis")).toBeVisible();

    const res = await page.request.post(`/api/projects/${projectId}/export/markdown`);
    expect(res.status()).toBe(200);
    const md = await res.text();

    expect(md).toContain('format: "nexus-markdown-v1"');
    expect(md).toContain('source: "validated_plan_json"');
    expect(md).toContain('model: "fixture"');
    expect(md).toContain("### 2.4 Constraints");
    expect(md).toMatch(/> \*\*Risk Level: (LOW|MEDIUM|HIGH|CRITICAL)\*\*/);
    expect(md).toContain("### Option 1 —");
    // title with embedded double-quote is escaped in YAML frontmatter
    expect(md).toContain('title: "Export \\"Quote\\"');
  });

  test("REV-001: first generation creates no revision; second creates one with differing snapshots", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Rev Write ${Date.now()}`);

    const gen1 = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A focused planning workspace that turns a messy student to-do concept into a validated, ethical MVP plan with a clear boundary and safeguards.",
        platform: ["web"], language: "en", riskDomain: "general", outputType: "full_prd", constraints: {}
      }
    });
    expect(gen1.status()).toBe(200);

    const supabase = createAdminClient();
    const { data: afterFirst } = await supabase
      .from("revisions").select("id").eq("project_id", projectId);
    expect(afterFirst).toHaveLength(0);

    const gen2 = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A productivity tracker that monitors employee activity and reports suspicious behavior to managers using AI-driven alerts and risk scoring.",
        platform: ["web", "ai"], language: "en", riskDomain: "surveillance", outputType: "full_prd", constraints: {}
      }
    });
    expect(gen2.status()).toBe(200);

    await expect
      .poll(async () => {
        const { data } = await supabase
          .from("revisions")
          .select("ai_plan_run_id, revision_note")
          .eq("project_id", projectId)
          .limit(1);
        return data?.[0] ?? null;
      })
      .toMatchObject({
        revision_note: "Plan regenerated",
        ai_plan_run_id: expect.any(String)
      });

    const { data: revRows } = await supabase
      .from("revisions")
      .select("previous_snapshot, new_snapshot")
      .eq("project_id", projectId)
      .limit(1);
    const rev = revRows![0];
    expect(rev.previous_snapshot.ethicalRiskReport.overallRiskLevel)
      .not.toBe(rev.new_snapshot.ethicalRiskReport.overallRiskLevel);

    const { data: allRevRows } = await supabase
      .from("revisions")
      .select("id")
      .eq("project_id", projectId);
    expect(allRevRows).toHaveLength(1);
  });

  test("REV-002/TEST: invalid_json regeneration creates no revision", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Rev Invalid ${Date.now()}`);

    const gen1 = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A reliable planning assistant that creates validated product artifacts for teams while keeping a server-controlled audit trail of plan runs.",
        platform: ["web"], language: "en", riskDomain: "general", outputType: "full_prd", constraints: {}
      }
    });
    expect(gen1.status()).toBe(200);

    const genInvalid = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A valid product planning concept that deliberately includes invalid_json to exercise deterministic fixture failure handling and schema rejection.",
        platform: ["web"], language: "en", riskDomain: "general", outputType: "full_prd", constraints: {}
      }
    });
    expect(genInvalid.status()).toBe(422);

    const supabase = createAdminClient();
    const { data: revs } = await supabase
      .from("revisions").select("id").eq("project_id", projectId);
    expect(revs).toHaveLength(0);
  });

  test("REV-PAGE-001: completed plan and revision panel survive a failed regeneration", async ({ page }) => {
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Rev Page Survive ${Date.now()}`);

    await page.getByTestId("raw-concept-input").fill(
      "A focused planning workspace that turns a messy student to-do concept into a validated, ethical MVP plan with a clear boundary and safeguards."
    );
    await page.getByTestId("generate-plan-button").click();
    await expect(page.getByText("Product Thesis")).toBeVisible();
    await expect(page.getByTestId("revision-history-panel")).toBeVisible();

    // Force a failed regeneration via API, then reload.
    const genInvalid = await page.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A valid product planning concept that deliberately includes invalid_json to exercise deterministic fixture failure handling and schema rejection.",
        platform: ["web"], language: "en", riskDomain: "general", outputType: "full_prd", constraints: {}
      }
    });
    expect(genInvalid.status()).toBe(422);

    await page.reload();

    // The good completed plan is still shown, with a failure banner above it.
    await expect(page.getByText("Product Thesis")).toBeVisible();
    await expect(page.getByTestId("revision-history-panel")).toBeVisible();
    await expect(page.getByTestId("generation-failure-banner")).toBeVisible();
  });

  test("REV-UI-001: regenerate via UI creates a revision; snapshot route renders both versions read-only", async ({ page }) => {
    test.setTimeout(180_000); // two full UI generate cycles + snapshot cold-compile on disk-pressured box
    await signUpOrLogin(page, userA);
    const projectId = await createProject(page, `Rev UI ${Date.now()}`);

    // gen1 (standard) via UI
    await page.getByTestId("raw-concept-input").fill(
      "A focused planning workspace that turns a messy student to-do concept into a validated, ethical MVP plan with a clear boundary and safeguards."
    );
    await page.getByTestId("generate-plan-button").click();
    await expect(page.getByText("Product Thesis")).toBeVisible();
    await expect(page.getByTestId("revision-history-panel")).toBeVisible();
    await expect(page.getByTestId("revision-row")).toHaveCount(0);

    // gen2 (surveillance -> critical) via the UI regenerate path
    await page.getByTestId("regenerate-plan-button").click();
    await page.getByTestId("risk-domain-select").selectOption("surveillance");
    await page.getByTestId("raw-concept-input").fill(
      "A productivity tracker that monitors employee activity and reports suspicious behavior to managers using AI-driven alerts and risk scoring."
    );
    await page.getByTestId("generate-plan-button").click();

    await expect(page.getByText(/Overall risk level:\s*critical/i)).toBeVisible();
    await expect(page.getByTestId("revision-row")).toHaveCount(1);

    // Open the snapshot detail route
    await page.getByTestId("view-snapshot-link").first().click();
    await expect(page).toHaveURL(/\/projects\/.+\/revisions\/.+/);
    await expect(page.getByTestId("revision-previous-snapshot")).toBeVisible();
    await expect(page.getByTestId("revision-new-snapshot")).toBeVisible();
    // read-only: no acknowledgement control anywhere on the snapshot route
    await expect(page.getByTestId("mark-build-ready-button")).toHaveCount(0);
  });

  test("SAFETY-001/002: critical-risk acknowledgement persists after refresh", async ({ page }) => {
    await signUpOrLogin(page, userA);
    await createProject(page, `Critical Risk ${Date.now()}`);

    await page.getByTestId("risk-domain-select").selectOption("surveillance");
    await page.getByTestId("raw-concept-input").fill(
      "A productivity tracker that monitors employee activity and reports suspicious behavior to managers using AI-driven alerts and risk scoring."
    );

    await page.getByTestId("generate-plan-button").click();

    await expect(page.getByText(/Overall risk level:\s*critical/i)).toBeVisible();
    await expect(page.getByTestId("mark-build-ready-button")).toBeDisabled();

    await page.getByTestId("critical-ack-checkbox").check();
    await expect(page.getByTestId("mark-build-ready-button")).toBeEnabled();
    await page.getByTestId("mark-build-ready-button").click();
    await expect(page.getByTestId("mark-build-ready-button")).toHaveText("Build-ready acknowledged");

    await page.reload();
    await expect(page.getByTestId("mark-build-ready-button")).toHaveText("Build-ready acknowledged");
  });
});

test.describe("Nexus v0.5 RLS isolation proof", () => {
  test("RLS-002/003/004: user B cannot open, generate, or export user A project", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await signUpOrLogin(pageA, userA);
    const projectId = await createProject(pageA, `RLS Source ${Date.now()}`);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await signUpOrLogin(pageB, userB);

    await pageB.goto(`/projects/${projectId}`);
    await expect(pageB.getByText(/404|not found/i)).toBeVisible();

    const generateResponse = await pageB.request.post(`/api/projects/${projectId}/generate-plan`, {
      data: {
        rawConcept:
          "A valid concept that user B must not be allowed to generate under user A project because ownership is enforced.",
        platform: ["web"],
        language: "en",
        riskDomain: "general",
        outputType: "full_prd",
        constraints: {}
      }
    });

    expect(generateResponse.status()).toBe(404);

    const exportResponse = await pageB.request.post(`/api/projects/${projectId}/export/markdown`);
    expect(exportResponse.status()).toBe(404);

    await contextA.close();
    await contextB.close();
  });

  test("REV-RLS-001: user B cannot open user A revision snapshot route", async ({ browser }) => {
    test.setTimeout(180_000); // two signUpOrLogin contexts + API calls + snapshot cold-compile on disk-pressured box
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await signUpOrLogin(pageA, userA);
    const projectId = await createProject(pageA, `Rev RLS ${Date.now()}`);

    for (const concept of [
      "A planning workspace turning a rough idea into a validated ethical MVP plan with safeguards and a clear boundary for small teams.",
      "A second revised concept that adjusts the plan scope while preserving validated structure and ethical safeguards for the same workspace."
    ]) {
      const r = await pageA.request.post(`/api/projects/${projectId}/generate-plan`, {
        data: {
          rawConcept: concept,
          platform: ["web"], language: "en", riskDomain: "general", outputType: "full_prd", constraints: {}
        }
      });
      expect(r.status()).toBe(200);
    }

    const adminSupabase = createAdminClient();
    const { data: revs } = await adminSupabase
      .from("revisions").select("id").eq("project_id", projectId).limit(1);
    const revisionId = revs?.[0]?.id;
    expect(revisionId).toBeTruthy();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signUpOrLogin(pageB, userB);

    await pageB.goto(`/projects/${projectId}/revisions/${revisionId}`);
    await expect(pageB.getByText(/404|not found/i)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
