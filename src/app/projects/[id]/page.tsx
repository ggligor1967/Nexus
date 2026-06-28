import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ConceptIntakeForm from "@/components/ConceptIntakeForm";
import GeneratedPlanView from "@/components/GeneratedPlanView";
import ExportActions from "@/components/ExportActions";
import type { AIPlanRun, Project } from "@/types/nexus";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/projects/${id}`);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: latestRun } = await supabase
    .from("ai_plan_runs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const typedProject = project as Project;
  const run = latestRun as AIPlanRun | null;

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>{typedProject.title}</h1>
          <div className="row">
            <span className="badge">{typedProject.status}</span>
            {typedProject.build_ready_acknowledged ? (
              <span className="badge success-badge">build-ready acknowledged</span>
            ) : null}
          </div>
        </div>
        <Link className="button" href="/dashboard">
          Dashboard
        </Link>
      </div>

      {run?.status === "failed" ? (
        <section className="card error">
          <h2>Generation failed</h2>
          <p>{run.error_message ?? "The generated plan did not match the required structure."}</p>
        </section>
      ) : null}

      {run?.status === "completed" && run.plan_json ? (
        <>
          <GeneratedPlanView
            projectId={typedProject.id}
            plan={run.plan_json}
            buildReadyAcknowledged={typedProject.build_ready_acknowledged}
          />
          <ExportActions projectId={typedProject.id} />
        </>
      ) : (
        <ConceptIntakeForm projectId={typedProject.id} />
      )}
    </main>
  );
}
