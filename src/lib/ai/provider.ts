import { generateFixturePlan } from "@/lib/ai/fixtureProvider";
import { generatePlanFromOpenAI } from "@/lib/ai/openaiProvider";

export type NexusAIProvider = "fixture" | "openai";

export function getAIProviderName(): NexusAIProvider {
  const provider = process.env.NEXUS_AI_PROVIDER ?? "fixture";

  if (provider === "fixture" || provider === "openai") {
    return provider;
  }

  throw new Error(`Unsupported NEXUS_AI_PROVIDER: ${provider}`);
}

export async function generatePlanWithProvider(prompt: string): Promise<string> {
  const provider = getAIProviderName();

  if (provider === "fixture") {
    return generateFixturePlan(prompt);
  }

  return generatePlanFromOpenAI(prompt);
}
