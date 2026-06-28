import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NexusPlanSchema } from "@/lib/ai/schema";
import { planToMarkdown, sanitizeFilename, type ExportMeta } from "@/lib/export/markdown";
import { getOwnedProject, requireApiUser } from "@/lib/auth/guards";

export async function POST(
  _req: Request,
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

  const { data: latestRun } = await supabase
    .from("ai_plan_runs")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRun?.plan_json) {
    return NextResponse.json(
      { error: "No completed validated plan found." },
      { status: 404 }
    );
  }

  const validatedPlan = NexusPlanSchema.parse(latestRun.plan_json);

  const meta: ExportMeta = {
    exportedAt: latestRun.completed_at, // persisted; a completed run always has completed_at
    modelName: latestRun.model_name,    // persisted
    riskLevel: validatedPlan.ethicalRiskReport.overallRiskLevel
  };

  const markdown = planToMarkdown(project.title, validatedPlan, meta);
  const filename = `${sanitizeFilename(project.title)}.md`;

  const { error: exportError } = await supabase.from("exported_plans").insert({
    project_id: projectId,
    ai_plan_run_id: latestRun.id,
    format: "markdown",
    content: markdown
  });

  if (exportError) {
    return NextResponse.json(
      { error: "Could not save export record.", details: exportError.message },
      { status: 500 }
    );
  }

  await supabase
    .from("projects")
    .update({ status: "exported" })
    .eq("id", projectId)
    .eq("user_id", auth.user.id);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
