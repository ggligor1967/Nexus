import { expect, test } from "@playwright/test";

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
    await createProject(page, `Nexus E2E ${Date.now()}`);

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
  });

  test("PLAN-002: invalid concept under 50 chars is blocked before AI call", async ({ page }) => {
    await signUpOrLogin(page, userA);
    await createProject(page, `Invalid Concept ${Date.now()}`);

    await page.getByTestId("raw-concept-input").fill("Too short.");
    await page.getByTestId("generate-plan-button").click();

    await expect(page.getByText("Concept must be at least 50 characters.")).toBeVisible();
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
});
