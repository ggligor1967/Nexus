import type { NexusPlan } from "@/types/nexus";

/**
 * Pure, deterministic structured diff between two validated NexusPlan snapshots.
 *
 * Mirrors the pure style of `src/lib/export/markdown.ts`: identical inputs always
 * produce identical output. Read-only — it never mutates the plans, performs no I/O,
 * and is safe to run in a server component or a unit test.
 *
 * `exportablePlanMarkdown` is intentionally excluded from the diff (same exclusion the
 * Markdown export applies), so it is not a field of PlanDiff.
 */

export interface ScalarDiff {
  before: string;
  after: string;
  changed: boolean;
}

export interface StringArrayDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
  changed: boolean;
}

export interface PrototypeOptionDiff {
  index: number;
  status: "added" | "removed" | "present-in-both";
  title: ScalarDiff;
  type: ScalarDiff;
  summary: ScalarDiff;
  complexity: ScalarDiff;
  whyThisOption: ScalarDiff;
  coreFeatures: StringArrayDiff;
  risks: StringArrayDiff;
  recommendedPlatform: StringArrayDiff;
}

export interface PrototypeOptionsDiff {
  options: PrototypeOptionDiff[];
  countBefore: number;
  countAfter: number;
  countChanged: boolean;
}

export interface PlanDiff {
  productThesis: ScalarDiff;
  deconstruction: {
    userProblems: StringArrayDiff;
    targetAudience: StringArrayDiff;
    jobsToBeDone: StringArrayDiff;
    assumptions: StringArrayDiff;
    constraints: StringArrayDiff;
    unknowns: StringArrayDiff;
    successMetrics: StringArrayDiff;
  };
  strategy: {
    positioning: ScalarDiff;
    differentiator: ScalarDiff;
    coreValueProposition: ScalarDiff;
    mvpBoundary: StringArrayDiff;
    nonGoals: StringArrayDiff;
  };
  prototypeOptions: PrototypeOptionsDiff;
  ethicalRiskReport: {
    overallRiskLevel: ScalarDiff;
    misuseCases: StringArrayDiff;
    privacyRisks: StringArrayDiff;
    biasRisks: StringArrayDiff;
    safetyRisks: StringArrayDiff;
    manipulationRisks: StringArrayDiff;
    safeguards: StringArrayDiff;
    redLines: StringArrayDiff;
  };
  roadmap: {
    phase1: StringArrayDiff;
    phase2: StringArrayDiff;
    phase3: StringArrayDiff;
  };
  hasAnyChange: boolean;
}

function scalarDiff(before: string, after: string): ScalarDiff {
  return { before, after, changed: before !== after };
}

/**
 * Set-based array diff with a fixed, deterministic ordering:
 * - `added`     — items in `next` not in `previous`, ordered by first appearance in `next`.
 * - `removed`   — items in `previous` not in `next`, ordered by first appearance in `previous`.
 * - `unchanged` — items present in both, ordered by first appearance in `next`.
 * De-duplicated by value. Reordering unrelated items never changes `changed`.
 */
function stringArrayDiff(previous: string[], next: string[]): StringArrayDiff {
  const prev = previous ?? [];
  const nxt = next ?? [];
  const prevSet = new Set(prev);
  const nextSet = new Set(nxt);

  const added: string[] = [];
  const unchanged: string[] = [];
  const seenNext = new Set<string>();
  for (const item of nxt) {
    if (seenNext.has(item)) continue;
    seenNext.add(item);
    if (prevSet.has(item)) {
      unchanged.push(item);
    } else {
      added.push(item);
    }
  }

  const removed: string[] = [];
  const seenPrev = new Set<string>();
  for (const item of prev) {
    if (seenPrev.has(item)) continue;
    seenPrev.add(item);
    if (!nextSet.has(item)) {
      removed.push(item);
    }
  }

  return {
    added,
    removed,
    unchanged,
    changed: added.length > 0 || removed.length > 0
  };
}

type PlanPrototypeOption = NexusPlan["prototypeOptions"][number];

const EMPTY_OPTION: {
  title: string;
  type: string;
  summary: string;
  complexity: string;
  whyThisOption: string;
  coreFeatures: string[];
  risks: string[];
  recommendedPlatform: string[];
} = {
  title: "",
  type: "",
  summary: "",
  complexity: "",
  whyThisOption: "",
  coreFeatures: [],
  risks: [],
  recommendedPlatform: []
};

/**
 * Index-based positional pairing of prototype options (arrays are ordered, length 1..3).
 * Count changes surface as `added` / `removed` options at the tail.
 */
function diffPrototypeOptions(
  previous: PlanPrototypeOption[],
  next: PlanPrototypeOption[]
): PrototypeOptionsDiff {
  const prev = previous ?? [];
  const nxt = next ?? [];
  const max = Math.max(prev.length, nxt.length);

  const options: PrototypeOptionDiff[] = [];
  for (let i = 0; i < max; i++) {
    const p = prev[i];
    const n = nxt[i];

    let status: PrototypeOptionDiff["status"];
    if (p && n) {
      status = "present-in-both";
    } else if (n) {
      status = "added";
    } else {
      status = "removed";
    }

    const pv = p ?? EMPTY_OPTION;
    const nv = n ?? EMPTY_OPTION;

    options.push({
      index: i,
      status,
      title: scalarDiff(pv.title, nv.title),
      type: scalarDiff(pv.type, nv.type),
      summary: scalarDiff(pv.summary, nv.summary),
      complexity: scalarDiff(pv.complexity, nv.complexity),
      whyThisOption: scalarDiff(pv.whyThisOption, nv.whyThisOption),
      coreFeatures: stringArrayDiff(pv.coreFeatures, nv.coreFeatures),
      risks: stringArrayDiff(pv.risks, nv.risks),
      recommendedPlatform: stringArrayDiff(pv.recommendedPlatform, nv.recommendedPlatform)
    });
  }

  return {
    options,
    countBefore: prev.length,
    countAfter: nxt.length,
    countChanged: prev.length !== nxt.length
  };
}

/**
 * Recursively OR every `changed` / `countChanged` signal in the assembled diff.
 * Boolean OR is order-independent, so this stays deterministic.
 */
function collectChanged(node: unknown): boolean {
  if (node === null || typeof node !== "object") {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(collectChanged);
  }
  const obj = node as Record<string, unknown>;
  if (obj.changed === true || obj.countChanged === true) {
    return true;
  }
  return Object.values(obj).some(collectChanged);
}

export function diffPlans(previous: NexusPlan, next: NexusPlan): PlanDiff {
  const body: Omit<PlanDiff, "hasAnyChange"> = {
    productThesis: scalarDiff(previous.productThesis, next.productThesis),
    deconstruction: {
      userProblems: stringArrayDiff(
        previous.deconstruction.userProblems,
        next.deconstruction.userProblems
      ),
      targetAudience: stringArrayDiff(
        previous.deconstruction.targetAudience,
        next.deconstruction.targetAudience
      ),
      jobsToBeDone: stringArrayDiff(
        previous.deconstruction.jobsToBeDone,
        next.deconstruction.jobsToBeDone
      ),
      assumptions: stringArrayDiff(
        previous.deconstruction.assumptions,
        next.deconstruction.assumptions
      ),
      constraints: stringArrayDiff(
        previous.deconstruction.constraints,
        next.deconstruction.constraints
      ),
      unknowns: stringArrayDiff(
        previous.deconstruction.unknowns,
        next.deconstruction.unknowns
      ),
      successMetrics: stringArrayDiff(
        previous.deconstruction.successMetrics,
        next.deconstruction.successMetrics
      )
    },
    strategy: {
      positioning: scalarDiff(previous.strategy.positioning, next.strategy.positioning),
      differentiator: scalarDiff(previous.strategy.differentiator, next.strategy.differentiator),
      coreValueProposition: scalarDiff(
        previous.strategy.coreValueProposition,
        next.strategy.coreValueProposition
      ),
      mvpBoundary: stringArrayDiff(previous.strategy.mvpBoundary, next.strategy.mvpBoundary),
      nonGoals: stringArrayDiff(previous.strategy.nonGoals, next.strategy.nonGoals)
    },
    prototypeOptions: diffPrototypeOptions(previous.prototypeOptions, next.prototypeOptions),
    ethicalRiskReport: {
      overallRiskLevel: scalarDiff(
        previous.ethicalRiskReport.overallRiskLevel,
        next.ethicalRiskReport.overallRiskLevel
      ),
      misuseCases: stringArrayDiff(
        previous.ethicalRiskReport.misuseCases,
        next.ethicalRiskReport.misuseCases
      ),
      privacyRisks: stringArrayDiff(
        previous.ethicalRiskReport.privacyRisks,
        next.ethicalRiskReport.privacyRisks
      ),
      biasRisks: stringArrayDiff(
        previous.ethicalRiskReport.biasRisks,
        next.ethicalRiskReport.biasRisks
      ),
      safetyRisks: stringArrayDiff(
        previous.ethicalRiskReport.safetyRisks,
        next.ethicalRiskReport.safetyRisks
      ),
      manipulationRisks: stringArrayDiff(
        previous.ethicalRiskReport.manipulationRisks,
        next.ethicalRiskReport.manipulationRisks
      ),
      safeguards: stringArrayDiff(
        previous.ethicalRiskReport.safeguards,
        next.ethicalRiskReport.safeguards
      ),
      redLines: stringArrayDiff(
        previous.ethicalRiskReport.redLines,
        next.ethicalRiskReport.redLines
      )
    },
    roadmap: {
      phase1: stringArrayDiff(previous.roadmap.phase1, next.roadmap.phase1),
      phase2: stringArrayDiff(previous.roadmap.phase2, next.roadmap.phase2),
      phase3: stringArrayDiff(previous.roadmap.phase3, next.roadmap.phase3)
    }
  };

  return { ...body, hasAnyChange: collectChanged(body) };
}
