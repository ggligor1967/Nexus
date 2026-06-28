import Link from "next/link";
import type { Project } from "@/types/nexus";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card" data-testid="project-card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>{project.title}</h2>
          <p>{project.description ?? "No description yet."}</p>
          <span className="badge">{project.status}</span>
        </div>
        <Link className="button" data-testid="open-project-link" href={`/projects/${project.id}`}>
          Open
        </Link>
      </div>
    </article>
  );
}
