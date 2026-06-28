import { z } from "zod";

export const NexusPlanSchema = z.object({
  productThesis: z.string().min(20),

  deconstruction: z.object({
    userProblems: z.array(z.string()).min(3),
    targetAudience: z.array(z.string()).min(1),
    jobsToBeDone: z.array(z.string()).min(1),
    assumptions: z.array(z.string()).min(3),
    constraints: z.array(z.string()).min(1),
    unknowns: z.array(z.string()).min(1),
    successMetrics: z.array(z.string()).min(1)
  }),

  strategy: z.object({
    positioning: z.string().min(10),
    differentiator: z.string().min(10),
    coreValueProposition: z.string().min(10),
    mvpBoundary: z.array(z.string()).min(1),
    nonGoals: z.array(z.string()).min(1)
  }),

  prototypeOptions: z
    .array(
      z.object({
        title: z.string().min(3),
        type: z.enum(["lean_mvp", "ai_enhanced", "antifragile"]),
        summary: z.string().min(20),
        coreFeatures: z.array(z.string()).min(1),
        complexity: z.enum(["low", "medium", "high"]),
        risks: z.array(z.string()).min(1),
        recommendedPlatform: z.array(
          z.enum(["web", "mobile", "windows", "ai", "other"])
        ),
        whyThisOption: z.string().min(10)
      })
    )
    .min(1)
    .max(3),

  ethicalRiskReport: z.object({
    overallRiskLevel: z.enum(["low", "medium", "high", "critical"]),
    misuseCases: z.array(z.string()).min(3),
    privacyRisks: z.array(z.string()).min(1),
    biasRisks: z.array(z.string()).min(1),
    safetyRisks: z.array(z.string()).min(1),
    manipulationRisks: z.array(z.string()).min(1),
    safeguards: z.array(z.string()).min(3),
    redLines: z.array(z.string()).min(2)
  }),

  roadmap: z.object({
    phase1: z.array(z.string()).min(1),
    phase2: z.array(z.string()).min(1),
    phase3: z.array(z.string()).min(1)
  }),

  exportablePlanMarkdown: z.string().min(100)
});

export type NexusPlan = z.infer<typeof NexusPlanSchema>;
