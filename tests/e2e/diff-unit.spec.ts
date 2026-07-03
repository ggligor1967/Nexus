import { test, expect } from "@playwright/test";
import { diffPlans } from "../../src/lib/diff/plan";
import { generateFixturePlan } from "../../src/lib/ai/fixtureProvider";
import type { NexusPlan } from "../../src/types/nexus";

const standard = JSON.parse(
  generateFixturePlan("a standard student planning concept")
) as NexusPlan;

// The fixture infers the critical scenario from these phrases (see fixtureProvider).
const critical = JSON.parse(
  generateFixturePlan(
    "a productivity tracker that monitors employee activity and reports suspicious behavior"
  )
) as NexusPlan;

function clone(plan: NexusPlan): NexusPlan {
  return JSON.parse(JSON.stringify(plan)) as NexusPlan;
}

test.describe("diffPlans", () => {
  test("is pure: identical inputs produce identical output", () => {
    expect(diffPlans(standard, critical)).toEqual(diffPlans(standard, critical));
  });

  test("identical snapshots produce no changes", () => {
    const diff = diffPlans(standard, standard);
    expect(diff.hasAnyChange).toBe(false);
    expect(diff.ethicalRiskReport.overallRiskLevel.changed).toBe(false);
    expect(diff.productThesis.changed).toBe(false);
  });

  test("scalar change reports before -> after (verified from fixture: medium -> critical)", () => {
    const diff = diffPlans(standard, critical);
    expect(diff.ethicalRiskReport.overallRiskLevel).toEqual({
      before: "medium",
      after: "critical",
      changed: true
    });
    expect(diff.hasAnyChange).toBe(true);
    expect(diff.productThesis.changed).toBe(true);
    expect(diff.strategy.positioning.changed).toBe(true);
  });

  test("string arrays classify added / removed / unchanged with deterministic ordering", () => {
    const modified = clone(standard);
    const original = standard.deconstruction.assumptions;
    // Drop the first item (removed) and append a new one (added); keep the rest.
    modified.deconstruction.assumptions = [
      ...original.slice(1),
      "A brand new assumption added for the diff test."
    ];

    const d = diffPlans(standard, modified).deconstruction.assumptions;
    expect(d.removed).toEqual([original[0]]);
    expect(d.added).toEqual(["A brand new assumption added for the diff test."]);
    // unchanged is ordered by appearance in `next`.
    expect(d.unchanged).toEqual(original.slice(1));
    expect(d.changed).toBe(true);
  });

  test("reordering the same items is not a change (set-based, order-insensitive)", () => {
    const reordered = clone(standard);
    reordered.deconstruction.targetAudience = [
      ...standard.deconstruction.targetAudience
    ].reverse();

    const d = diffPlans(standard, reordered).deconstruction.targetAudience;
    expect(d.changed).toBe(false);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  test("prototype options are unchanged between standard and critical fixtures", () => {
    const proto = diffPlans(standard, critical).prototypeOptions;
    expect(proto.countChanged).toBe(false);
    expect(proto.countBefore).toBe(proto.countAfter);
    for (const option of proto.options) {
      expect(option.status).toBe("present-in-both");
      expect(option.title.changed).toBe(false);
      expect(option.type.changed).toBe(false);
      expect(option.complexity.changed).toBe(false);
      expect(option.coreFeatures.changed).toBe(false);
    }
  });

  test("a removed prototype option is surfaced via count change", () => {
    const fewer = clone(standard);
    fewer.prototypeOptions = fewer.prototypeOptions.slice(0, 1);

    const proto = diffPlans(standard, fewer).prototypeOptions;
    expect(proto.countChanged).toBe(true);
    expect(proto.countBefore).toBe(standard.prototypeOptions.length);
    expect(proto.countAfter).toBe(1);
    const removedOption = proto.options[proto.options.length - 1];
    expect(removedOption.status).toBe("removed");
  });

  test("exportablePlanMarkdown is excluded from the diff", () => {
    const diff = diffPlans(standard, critical);
    expect(
      (diff as unknown as Record<string, unknown>).exportablePlanMarkdown
    ).toBeUndefined();
    expect(JSON.stringify(diff)).not.toContain(standard.exportablePlanMarkdown);
    expect(JSON.stringify(diff)).not.toContain(critical.exportablePlanMarkdown);
  });
});
