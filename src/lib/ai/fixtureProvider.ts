import type { NexusPlan } from "@/types/nexus";

function inferScenario(prompt: string): "standard" | "critical" | "invalid_json" {
  const forced = process.env.NEXUS_FIXTURE_SCENARIO;

  if (forced === "standard" || forced === "critical" || forced === "invalid_json") {
    return forced;
  }

  const value = prompt.toLowerCase();

  if (
    value.includes("surveillance") ||
    value.includes("employee activity") ||
    value.includes("suspicious behavior") ||
    value.includes('"riskdomain": "surveillance"') ||
    value.includes('"riskdomain":"surveillance"')
  ) {
    return "critical";
  }

  return "standard";
}

export function generateFixturePlan(prompt: string): string {
  const scenario = inferScenario(prompt);
  if (scenario === "invalid_json") {
    return "{ invalid fixture json";
  }

  const isCritical = scenario === "critical";

  const plan: NexusPlan = {
    productThesis: isCritical
      ? "A privacy-preserving workplace accountability planner that rejects surveillance-first design and reframes monitoring into transparent, consent-based operational signals."
      : "A focused product planning workspace that converts messy app ideas into structured, ethical, build-ready MVP plans for creators and small teams.",
    deconstruction: {
      userProblems: [
        "Creators often begin with vague ideas that lack clear product boundaries.",
        "Teams need practical requirements that can be converted into build tasks.",
        "Risky assumptions and ethical issues are often discovered too late."
      ],
      targetAudience: [
        "Indie founders",
        "UX designers",
        "Software developers",
        "AI product builders"
      ],
      jobsToBeDone: [
        "Turn an unstructured concept into a validated product plan.",
        "Compare realistic MVP options before committing to implementation.",
        "Identify safeguards and red lines before writing code."
      ],
      assumptions: [
        "The user has at least one software concept to refine.",
        "The user wants execution-oriented output instead of generic brainstorming.",
        "The first product version should minimize scope and implementation risk."
      ],
      constraints: [
        "No external market claims are made in fixture mode.",
        "Markdown export is the only blocking export format.",
        "The plan must remain readable and build-oriented."
      ],
      unknowns: [
        "The user's real budget and team capacity may vary.",
        "The final technical stack may change after prototype validation."
      ],
      successMetrics: [
        "A user can produce a complete plan in one core flow.",
        "Generated output passes schema validation.",
        "The plan includes concrete safeguards and MVP boundaries."
      ]
    },
    strategy: {
      positioning: isCritical
        ? "Position the product as a transparent workplace trust tool, not as a hidden surveillance system."
        : "Position the app as a practical AI product strategist for creators who want structured, ethical MVP plans.",
      differentiator:
        "The system combines product deconstruction, prototype options, and ethical stress testing in one validated workflow.",
      coreValueProposition:
        "Users receive a build-ready plan that is structured enough for UI rendering, export, and implementation planning.",
      mvpBoundary: [
        "Create project workspace.",
        "Submit concept intake.",
        "Generate validated JSON plan.",
        "Render plan_json only.",
        "Export Markdown."
      ],
      nonGoals: [
        "Do not perform market scans in v0.5.",
        "Do not generate PDF or DOCX in v0.5.",
        "Do not support collaboration in v0.5."
      ]
    },
    prototypeOptions: [
      {
        title: "Lean Core Loop",
        type: "lean_mvp",
        summary:
          "A narrow MVP focused on one repeatable workflow from raw concept to validated plan and Markdown export.",
        coreFeatures: [
          "Project creation",
          "Concept intake form",
          "Validated AI plan generation",
          "Generated plan rendering",
          "Markdown export"
        ],
        complexity: "low",
        risks: [
          "The output could feel too templated if prompts are not tuned.",
          "Users may expect PDF or collaboration too early."
        ],
        recommendedPlatform: ["web", "ai"],
        whyThisOption:
          "This option proves the product's core value with the smallest implementation surface."
      },
      {
        title: "Safety-Gated Planner",
        type: "antifragile",
        summary:
          "A version that emphasizes ethical stress testing and prevents critical-risk plans from being treated as build-ready without acknowledgement.",
        coreFeatures: [
          "Risk severity display",
          "Safeguard checklist",
          "Persistent acknowledgement",
          "Critical-risk warning state"
        ],
        complexity: "medium",
        risks: [
          "Users may misunderstand acknowledgement as legal approval.",
          "Risk labels require careful wording."
        ],
        recommendedPlatform: ["web", "ai"],
        whyThisOption:
          "This option strengthens trust by making safety constraints visible and auditable."
      }
    ],
    ethicalRiskReport: {
      overallRiskLevel: isCritical ? "critical" : "medium",
      misuseCases: isCritical
        ? [
            "Employers could use the system to justify intrusive monitoring without employee consent.",
            "Activity data could be used to punish workers for context-free behavior patterns.",
            "The tool could normalize surveillance as a productivity default."
          ]
        : [
            "Users could treat generated plans as validated market truth.",
            "A team could skip human review and over-trust AI recommendations.",
            "Sensitive concepts could be stored without clear retention expectations."
          ],
      privacyRisks: [
        "Raw concepts may contain sensitive business or personal information.",
        "Exported plans may be shared outside the intended team."
      ],
      biasRisks: [
        "Generated recommendations may overfit to common startup assumptions.",
        "Risk framing may miss affected groups unless target users are explicit."
      ],
      safetyRisks: isCritical
        ? [
            "The product direction could cause workplace harm if surveillance is implemented without consent or proportionality."
          ]
        : [
            "Users may misclassify high-risk product ideas as general tools."
          ],
      manipulationRisks: isCritical
        ? [
            "Productivity scoring could pressure users into unhealthy behavior or self-censorship."
          ]
        : [
            "A polished plan could create false confidence in an unvalidated concept."
          ],
      safeguards: isCritical
        ? [
            "Require explicit consent and employee-visible controls before any monitoring feature.",
            "Prohibit hidden monitoring, keystroke logging, and individual suspicion scoring.",
            "Aggregate data by default and avoid punitive individual reports.",
            "Add independent review before any deployment in a workplace."
          ]
        : [
            "Label outputs as planning support, not validated truth.",
            "Add data deletion and export controls.",
            "Require human review before implementation decisions."
          ],
      redLines: isCritical
        ? [
            "Do not build hidden surveillance or covert employee tracking.",
            "Do not generate punitive suspicion scores for individual workers.",
            "Do not deploy without employee notice, consent, and appeal mechanisms."
          ]
        : [
            "Do not present AI output as guaranteed product-market fit.",
            "Do not store sensitive raw concepts without clear user controls."
          ]
    },
    roadmap: {
      phase1: [
        "Implement authenticated project workspace.",
        "Generate validated plan_json from concept intake.",
        "Render generated plan and export Markdown."
      ],
      phase2: [
        "Add revision history.",
        "Improve risk taxonomy and prompt coverage.",
        "Add PDF export after Markdown is stable."
      ],
      phase3: [
        "Add collaboration.",
        "Add source-backed market scan.",
        "Add pitch and design-system exports."
      ]
    },
    exportablePlanMarkdown:
      "# Nexus Fixture Plan\n\nThis deterministic fixture proves the complete v0.5 flow without OpenAI dependency. It includes product thesis, strategy, prototype options, ethical risks, safeguards, red lines, roadmap, and build-ready checklist."
  };

  return JSON.stringify(plan);
}
