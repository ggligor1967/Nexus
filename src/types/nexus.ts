export type NexusLanguage = "en" | "ro" | "bilingual";

export type NexusPlatform = "web" | "mobile" | "windows" | "ai" | "other";

export type RiskDomain =
  | "general"
  | "health"
  | "finance"
  | "children"
  | "education"
  | "surveillance"
  | "legal"
  | "ai_safety";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ConceptInput {
  rawConcept: string;
  targetUsers?: string;
  platform: NexusPlatform[];
  outputType:
    | "mvp_plan"
    | "technical_plan"
    | "ux_flow"
    | "ethical_review"
    | "full_prd";
  language: NexusLanguage;
  riskDomain: RiskDomain;
  constraints?: {
    timeframe?: string;
    budget?: string;
    teamSize?: string;
    technicalLevel?: "beginner" | "intermediate" | "advanced";
  };
}

export interface NexusPlan {
  productThesis: string;
  deconstruction: {
    userProblems: string[];
    targetAudience: string[];
    jobsToBeDone: string[];
    assumptions: string[];
    constraints: string[];
    unknowns: string[];
    successMetrics: string[];
  };
  strategy: {
    positioning: string;
    differentiator: string;
    coreValueProposition: string;
    mvpBoundary: string[];
    nonGoals: string[];
  };
  prototypeOptions: {
    title: string;
    type: "lean_mvp" | "ai_enhanced" | "antifragile";
    summary: string;
    coreFeatures: string[];
    complexity: "low" | "medium" | "high";
    risks: string[];
    recommendedPlatform: NexusPlatform[];
    whyThisOption: string;
  }[];
  ethicalRiskReport: {
    overallRiskLevel: RiskLevel;
    misuseCases: string[];
    privacyRisks: string[];
    biasRisks: string[];
    safetyRisks: string[];
    manipulationRisks: string[];
    safeguards: string[];
    redLines: string[];
  };
  roadmap: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
  };
  exportablePlanMarkdown: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "draft" | "generated" | "revised" | "exported";
  language: NexusLanguage;
  platform: NexusPlatform[];
  build_ready_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIPlanRun {
  id: string;
  project_id: string;
  concept_input_id: string;
  model_name: string;
  status: "queued" | "running" | "completed" | "failed";
  raw_output: string | null;
  plan_json: NexusPlan | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}
