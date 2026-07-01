import { test, expect } from "@playwright/test";
import { planToMarkdown, type ExportMeta } from "../../src/lib/export/markdown";
import { generateFixturePlan } from "../../src/lib/ai/fixtureProvider";
import type { NexusPlan } from "../../src/types/nexus";

const plan = JSON.parse(
  generateFixturePlan("a standard student planning concept")
) as NexusPlan;

const meta: ExportMeta = {
  exportedAt: "2026-06-29T00:00:00.000Z",
  modelName: "fixture",
  riskLevel: "medium"
};

test.describe("planToMarkdown", () => {
  test("is pure: identical inputs produce identical output", () => {
    const a = planToMarkdown("Sample Project", plan, meta);
    const b = planToMarkdown("Sample Project", plan, meta);
    expect(a).toBe(b);
  });

  test("emits constant frontmatter markers", () => {
    const md = planToMarkdown("Sample Project", plan, meta);
    expect(md).toContain('format: "nexus-markdown-v1"');
    expect(md).toContain('source: "validated_plan_json"');
    expect(md).toContain('model: "fixture"');
    expect(md).toContain('exported_at: "2026-06-29T00:00:00.000Z"');
  });

  test("escapes frontmatter title with quotes and newlines", () => {
    const md = planToMarkdown('A "Risky"\nApp', plan, meta);
    expect(md).toContain('title: "A \\"Risky\\" App"');
    // newline flattened, no raw line break injected into frontmatter
    expect(md).not.toContain('title: "A \\"Risky\\"\nApp"');
  });

  test("includes Constraints section, risk callout, and numbered option", () => {
    const md = planToMarkdown("Sample Project", plan, meta);
    expect(md).toContain("### 2.4 Constraints");
    expect(md).toMatch(/> \*\*Risk Level: (LOW|MEDIUM|HIGH|CRITICAL)\*\*/);
    expect(md).toContain("### Option 1 —");
  });

  test("does not embed exportablePlanMarkdown in the output", () => {
    const md = planToMarkdown("Sample Project", plan, meta);
    expect(md).not.toContain(plan.exportablePlanMarkdown);
  });
});
