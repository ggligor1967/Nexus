import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOwnedProject, requireApiUser } from "@/lib/auth/guards";
import { NexusPlanSchema } from "@/lib/ai/schema";
import { z } from "zod";

const UpdateProjectSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().nullable().optional(),
  buildReadyAcknowledged: z.boolean().optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const auth = await requireApiUser(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await getOwnedProject(supabase, id, auth.user.id);

  if (error || !data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project: data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const auth = await requireApiUser(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: project } = await getOwnedProject(supabase, id, auth.user.id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const parsed = UpdateProjectSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid project update.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.buildReadyAcknowledged !== undefined) {
    if (parsed.data.buildReadyAcknowledged) {
      const { data: latestRun, error: latestRunError } = await supabase
        .from("ai_plan_runs")
        .select("plan_json")
        .eq("project_id", id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRunError) {
        return NextResponse.json(
          { error: "Could not verify completed plan.", details: latestRunError.message },
          { status: 500 }
        );
      }

      const validPlan = latestRun?.plan_json
        ? NexusPlanSchema.safeParse(latestRun.plan_json)
        : null;

      if (!validPlan?.success) {
        return NextResponse.json(
          { error: "Build-ready acknowledgement requires a completed validated plan." },
          { status: 409 }
        );
      }
    }

    update.build_ready_acknowledged = parsed.data.buildReadyAcknowledged;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update project.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ project: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const auth = await requireApiUser(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: project } = await getOwnedProject(supabase, id, auth.user.id);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Could not delete project.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
