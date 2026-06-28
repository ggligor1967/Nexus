import OpenAI from "openai";

function stripMarkdownFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId)
  );
}

export async function generatePlanFromOpenAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const completion = await withTimeout(
    openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You return JSON only. Do not include prose, markdown fences, or explanations outside the JSON object."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    }),
    45_000,
    "AI generation timed out."
  );

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned empty content.");
  }

  return stripMarkdownFence(content);
}
