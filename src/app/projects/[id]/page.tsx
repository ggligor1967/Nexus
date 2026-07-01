import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ConceptIntakeForm, {
  type ConceptIntakeInitialValues
} from "@/components/ConceptIntakeForm";
import GeneratedPlanView from "@/components/GeneratedPlanView";
import ExportActions from "@/components/ExportActions";
import RevisionHistoryPanel from "@/components/RevisionHistoryPanel";
import RegeneratePanel from "@/components/RegeneratePanel";
import type { AIPlanRun, Project, Revision } from "@/types/nexus";

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

  // latestRun (any status) drives ONLY the failure banner.
  const { data: latestRunData } = await supabase
    .from("ai_plan_runs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // latestCompletedRun drives the visible plan/export/revision panel.
  const { data: latestCompletedRunData } = await supabase
    .from("ai_plan_runs")
    .select("*")
    .eq("project_id", id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: revisionsData } = await supabase
    .from("revisions")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: latestConceptData } = await supabase
    .from("concept_inputs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const typedProject = project as Project;
  const latestRun = latestRunData as AIPlanRun | null;
  const latestCompletedRun = latestCompletedRunData as AIPlanRun | null;
  const revisions = (revisionsData ?? []) as Revision[];

  const initialValues: ConceptIntakeInitialValues | undefined = latestConceptData
    ? {
        rawConcept: latestConceptData.raw_concept ?? "",
        targetUsers: latestConceptData.target_users ?? "",
        platform: latestConceptData.platform ?? ["web"],
        language: typedProject.language,
        riskDomain: latestConceptData.risk_domain ?? "general",
        outputType: latestConceptData.output_type ?? "full_prd"
      }
    : undefined;

  const showFailureBanner = latestRun?.status === "failed";

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

      {showFailureBanner ? (
        <section className="card error" data-testid="generation-failure-banner">
          <h2>Last generation failed</h2>
          <p>
            {latestRun?.error_message ??
              "The latest generated plan did not match the required structure."}
          </p>
        </section>
      ) : null}

      {latestCompletedRun?.plan_json ? (
        <>
          <GeneratedPlanView
            projectId={typedProject.id}
            plan={latestCompletedRun.plan_json}
            buildReadyAcknowledged={typedProject.build_ready_acknowledged}
          />
          <ExportActions projectId={typedProject.id} />
          <RevisionHistoryPanel projectId={typedProject.id} revisions={revisions} />
          <RegeneratePanel projectId={typedProject.id} initialValues={initialValues} />
        </>
      ) : (
        <ConceptIntakeForm projectId={typedProject.id} initialValues={initialValues} />
      )}
    </main>
  );
}
