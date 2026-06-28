import type { NexusPlan } from "@/types/nexus";

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function planToMarkdown(projectName: string, plan: NexusPlan): string {
  return `# ${projectName}

## Product Thesis

${plan.productThesis}

## User Problems

${list(plan.deconstruction.userProblems)}

## Target Audience

${list(plan.deconstruction.targetAudience)}

## Jobs To Be Done

${list(plan.deconstruction.jobsToBeDone)}

## Assumptions

${list(plan.deconstruction.assumptions)}

## Unknowns

${list(plan.deconstruction.unknowns)}

## Success Metrics

${list(plan.deconstruction.successMetrics)}

## Product Strategy

**Positioning:** ${plan.strategy.positioning}

**Differentiator:** ${plan.strategy.differentiator}

**Core Value Proposition:** ${plan.strategy.coreValueProposition}

## MVP Boundary

${list(plan.strategy.mvpBoundary)}

## Non-Goals

${list(plan.strategy.nonGoals)}

## Prototype Options

${plan.prototypeOptions
  .map(
    (option, index) => `
### ${index + 1}. ${option.title}

**Type:** ${option.type}

**Complexity:** ${option.complexity}

${option.summary}

**Core Features:**
${list(option.coreFeatures)}

**Risks:**
${list(option.risks)}

**Recommended Platform:**
${list(option.recommendedPlatform)}

**Why this option:**
${option.whyThisOption}
`
  )
  .join("\n")}

## Ethical Risk Report

**Overall Risk Level:** ${plan.ethicalRiskReport.overallRiskLevel}

### Misuse Cases

${list(plan.ethicalRiskReport.misuseCases)}

### Privacy Risks

${list(plan.ethicalRiskReport.privacyRisks)}

### Bias Risks

${list(plan.ethicalRiskReport.biasRisks)}

### Safety Risks

${list(plan.ethicalRiskReport.safetyRisks)}

### Manipulation Risks

${list(plan.ethicalRiskReport.manipulationRisks)}

### Safeguards

${list(plan.ethicalRiskReport.safeguards)}

### Red Lines

${list(plan.ethicalRiskReport.redLines)}

## Roadmap

### Phase 1

${list(plan.roadmap.phase1)}

### Phase 2

${list(plan.roadmap.phase2)}

### Phase 3

${list(plan.roadmap.phase3)}

## Build-Ready Checklist

- [ ] Concept validated
- [ ] MVP boundary accepted
- [ ] Ethical risks reviewed
- [ ] Safeguards acknowledged
- [ ] First prototype option selected
- [ ] Developer tickets created
`;
}

export function sanitizeFilename(title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || "nexus-plan";
}
