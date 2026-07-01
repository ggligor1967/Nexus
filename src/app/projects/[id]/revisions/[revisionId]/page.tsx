import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import GeneratedPlanView from "@/components/GeneratedPlanView";
import type { NexusPlan } from "@/types/nexus";

export const dynamic = "force-dynamic";

export default async function RevisionSnapshotPage({
  params
}: {
  params: Promise<{ id: string; revisionId: string }>;
}) {
  const { id, revisionId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/projects/${id}/revisions/${revisionId}`);
  }

  // Explicit ownership check (defense in depth alongside RLS).
  const { data: project } = await supabase
    .from("projects")
    .select("title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: revision } = await supabase
    .from("revisions")
    .select("*")
    .eq("id", revisionId)
    .eq("project_id", id)
    .maybeSingle();

  if (!revision) {
    notFound();
  }

  const previous = revision.previous_snapshot as NexusPlan | null;
  const next = revision.new_snapshot as NexusPlan | null;

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{project.title} — Revision snapshot</h1>
        <Link className="button" href={`/projects/${id}`}>
          Back to project
        </Link>
      </div>

      {previous ? (
        <section data-testid="revision-previous-snapshot">
          <h2>Previous version</h2>
          <GeneratedPlanView
            projectId={id}
            plan={previous}
            buildReadyAcknowledged={false}
            readOnly
          />
        </section>
      ) : null}

      {next ? (
        <section data-testid="revision-new-snapshot">
          <h2>New version</h2>
          <GeneratedPlanView
            projectId={id}
            plan={next}
            buildReadyAcknowledged={false}
            readOnly
          />
        </section>
      ) : null}
    </main>
  );
}
