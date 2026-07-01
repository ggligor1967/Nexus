import Link from "next/link";
import type { Revision } from "@/types/nexus";

export default function RevisionHistoryPanel({
  projectId,
  revisions
}: {
  projectId: string;
  revisions: Revision[];
}) {
  if (revisions.length === 0) {
    return (
      <section className="card" data-testid="revision-history-panel">
        <h2>Revision History</h2>
        <p>No revisions yet. Regenerate the plan to create one.</p>
      </section>
    );
  }

  return (
    <section className="card" data-testid="revision-history-panel">
      <h2>Revision History</h2>
      <ul>
        {revisions.map((revision, index) => {
          const number = revisions.length - index;
          const risk =
            revision.new_snapshot?.ethicalRiskReport.overallRiskLevel ?? "unknown";

          return (
            <li key={revision.id} data-testid="revision-row">
              <strong>Revision {number}</strong>
              {" — "}
              {new Date(revision.created_at).toISOString()}
              {" — risk: "}
              {risk}
              {revision.revision_note ? ` — ${revision.revision_note}` : ""}{" "}
              <Link
                href={`/projects/${projectId}/revisions/${revision.id}`}
                data-testid="view-snapshot-link"
              >
                View snapshot
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
