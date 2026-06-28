import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Project } from "@/types/nexus";
import ProjectCard from "@/components/ProjectCard";
import CreateProjectForm from "@/components/CreateProjectForm";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Project Workspace</h1>
        <div className="row">
          <Link className="button secondary" href="/">
            Home
          </Link>
          <LogoutButton />
        </div>
      </div>

      <CreateProjectForm />

      {error ? (
        <section className="card error">Could not load projects: {error.message}</section>
      ) : null}

      <section className="stack">
        {(projects as Project[] | null)?.length ? (
          (projects as Project[]).map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <div className="card">No projects yet. Create your first app concept.</div>
        )}
      </section>
    </main>
  );
}
