import type { NexusPlan, RiskLevel } from "@/types/nexus";

export interface ExportMeta {
  exportedAt: string;
  modelName: string;
  riskLevel: RiskLevel;
}

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

// Emit a double-quoted YAML scalar; escape backslash and quote, flatten newlines.
function yamlString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
  return `"${escaped}"`;
}

export function planToMarkdown(
  projectName: string,
  plan: NexusPlan,
  meta: ExportMeta
): string {
  const heading = projectName.replace(/\r?\n/g, " ");
  const riskUpper = meta.riskLevel.toUpperCase();

  return `---
title: ${yamlString(projectName)}
exported_at: ${yamlString(meta.exportedAt)}
risk_level: ${yamlString(meta.riskLevel)}
model: ${yamlString(meta.modelName)}
format: ${yamlString("nexus-markdown-v1")}
source: ${yamlString("validated_plan_json")}
---

# ${heading}

> **Risk Level: ${riskUpper}**
> Review safeguards and red lines before marking this plan build-ready.

## 1. Product Thesis

${plan.productThesis}

## 2. Deconstruction

### 2.1 User Problems

${list(plan.deconstruction.userProblems)}

### 2.2 Target Audience

${list(plan.deconstruction.targetAudience)}

### 2.3 Jobs To Be Done

${list(plan.deconstruction.jobsToBeDone)}

### 2.4 Constraints

${list(plan.deconstruction.constraints)}

### 2.5 Assumptions

${list(plan.deconstruction.assumptions)}

### 2.6 Unknowns

${list(plan.deconstruction.unknowns)}

### 2.7 Success Metrics

${list(plan.deconstruction.successMetrics)}

## 3. Product Strategy

**Positioning:** ${plan.strategy.positioning}

**Differentiator:** ${plan.strategy.differentiator}

**Core Value Proposition:** ${plan.strategy.coreValueProposition}

### MVP Boundary

${list(plan.strategy.mvpBoundary)}

### Non-Goals

${list(plan.strategy.nonGoals)}

## 4. Prototype Options

${plan.prototypeOptions
  .map(
    (option, index) => `### Option ${index + 1} — ${option.title}

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

## 5. Ethical Risk Report

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

## 6. Roadmap

### Phase 1

${list(plan.roadmap.phase1)}

### Phase 2

${list(plan.roadmap.phase2)}

### Phase 3

${list(plan.roadmap.phase3)}

## 7. Build-Ready Checklist

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
