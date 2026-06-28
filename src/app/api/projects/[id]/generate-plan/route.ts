import { NextResponse } from "next/server";
import { ConceptInputSchema } from "@/lib/validation/concept";
import { NexusPlanSchema } from "@/lib/ai/schema";
import { buildNexusPrompt } from "@/lib/ai/prompt";
import { generatePlanFromAI } from "@/lib/ai/generatePlan";
import { getAIProviderName } from "@/lib/ai/provider";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { getOwnedProject, requireApiUser } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const auth = await requireApiUser(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: project } = await getOwnedProject(supabase, projectId, auth.user.id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await req.json();
  const parsedInput = ConceptInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: "Invalid concept input.",
        details: parsedInput.error.flatten()
      },
      { status: 400 }
    );
  }

  const { data: conceptInput, error: conceptError } = await supabase
    .from("concept_inputs")
    .insert({
      project_id: projectId,
      raw_concept: parsedInput.data.rawConcept,
      target_users: parsedInput.data.targetUsers,
      platform: parsedInput.data.platform,
      output_type: parsedInput.data.outputType,
      risk_domain: parsedInput.data.riskDomain,
      constraints: parsedInput.data.constraints ?? {}
    })
    .select()
    .single();

  if (conceptError) {
    return NextResponse.json(
      { error: "Could not save concept input.", details: conceptError.message },
      { status: 500 }
    );
  }

  const providerName = getAIProviderName();
  const modelName =
    providerName === "fixture"
      ? "fixture"
      : process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const adminSupabase = createAdminSupabaseClient();

  const { data: run, error: runError } = await adminSupabase
    .from("ai_plan_runs")
    .insert({
      project_id: projectId,
      concept_input_id: conceptInput.id,
      model_name: modelName,
      status: "running"
    })
    .select()
    .single();

  if (runError) {
    return NextResponse.json(
      { error: "Could not create AI run.", details: runError.message },
      { status: 500 }
    );
  }

  let rawOutput: string | null = null;

  try {
    const prompt = buildNexusPrompt(parsedInput.data);
    rawOutput = await generatePlanFromAI(prompt);

    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      throw new Error("AI returned invalid JSON.");
    }

    const validatedPlan = NexusPlanSchema.parse(parsedJson);

    await adminSupabase
      .from("ai_plan_runs")
      .update({
        status: "completed",
        raw_output: rawOutput,
        plan_json: validatedPlan,
        completed_at: new Date().toISOString()
      })
      .eq("id", run.id)
      .eq("project_id", projectId);

    await supabase
      .from("projects")
      .update({
        status: "generated",
        build_ready_acknowledged: false
      })
      .eq("id", projectId)
      .eq("user_id", auth.user.id);

    return NextResponse.json({
      runId: run.id,
      status: "completed",
      plan: validatedPlan
    });
  } catch (error) {
    await adminSupabase
      .from("ai_plan_runs")
      .update({
        status: "failed",
        raw_output: rawOutput,
        error_message:
          error instanceof Error ? error.message : "Unknown generation error",
        completed_at: new Date().toISOString()
      })
      .eq("id", run.id)
      .eq("project_id", projectId);

    return NextResponse.json(
      {
        error: "AI generation failed validation."
      },
      { status: 422 }
    );
  }
}
