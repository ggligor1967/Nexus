import { z } from "zod";

export const ConceptInputSchema = z.object({
  rawConcept: z.string().min(50, "Concept must be at least 50 characters."),
  targetUsers: z.string().optional(),
  platform: z.array(z.enum(["web", "mobile", "windows", "ai", "other"])).min(1),
  outputType: z.enum([
    "mvp_plan",
    "technical_plan",
    "ux_flow",
    "ethical_review",
    "full_prd"
  ]),
  language: z.enum(["en", "ro", "bilingual"]),
  riskDomain: z.enum([
    "general",
    "health",
    "finance",
    "children",
    "education",
    "surveillance",
    "legal",
    "ai_safety"
  ]),
  constraints: z
    .object({
      timeframe: z.string().optional(),
      budget: z.string().optional(),
      teamSize: z.string().optional(),
      technicalLevel: z.enum(["beginner", "intermediate", "advanced"]).optional()
    })
    .optional()
});

export type ValidatedConceptInput = z.infer<typeof ConceptInputSchema>;
