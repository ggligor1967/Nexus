import { generatePlanWithProvider } from "@/lib/ai/provider";

export async function generatePlanFromAI(prompt: string): Promise<string> {
  return generatePlanWithProvider(prompt);
}
