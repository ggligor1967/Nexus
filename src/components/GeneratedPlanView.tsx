import type { NexusPlan } from "@/types/nexus";
import EthicalRiskPanel from "@/components/EthicalRiskPanel";
import PrototypeOptions from "@/components/PrototypeOptions";

function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function GeneratedPlanView({
  projectId,
  plan,
  buildReadyAcknowledged,
  readOnly = false
}: {
  projectId: string;
  plan: NexusPlan;
  buildReadyAcknowledged: boolean;
  readOnly?: boolean;
}) {
  return (
    <section className="stack">
      <article className="card success">
        <h2>Product Thesis</h2>
        <p>{plan.productThesis}</p>
      </article>

      <article className="card">
        <h2>Deconstruction</h2>
        <h3>User Problems</h3>
        <List items={plan.deconstruction.userProblems} />
        <h3>Target Audience</h3>
        <List items={plan.deconstruction.targetAudience} />
        <h3>Jobs To Be Done</h3>
        <List items={plan.deconstruction.jobsToBeDone} />
        <h3>Assumptions</h3>
        <List items={plan.deconstruction.assumptions} />
      </article>

      <article className="card">
        <h2>Strategy</h2>
        <p>
          <strong>Positioning:</strong> {plan.strategy.positioning}
        </p>
        <p>
          <strong>Differentiator:</strong> {plan.strategy.differentiator}
        </p>
        <p>
          <strong>Core value proposition:</strong>{" "}
          {plan.strategy.coreValueProposition}
        </p>
        <h3>MVP Boundary</h3>
        <List items={plan.strategy.mvpBoundary} />
        <h3>Non-goals</h3>
        <List items={plan.strategy.nonGoals} />
      </article>

      <PrototypeOptions options={plan.prototypeOptions} />

      <EthicalRiskPanel
        projectId={projectId}
        report={plan.ethicalRiskReport}
        initialAcknowledged={buildReadyAcknowledged}
        readOnly={readOnly}
      />

      <article className="card">
        <h2>Roadmap</h2>
        <h3>Phase 1</h3>
        <List items={plan.roadmap.phase1} />
        <h3>Phase 2</h3>
        <List items={plan.roadmap.phase2} />
        <h3>Phase 3</h3>
        <List items={plan.roadmap.phase3} />
      </article>
    </section>
  );
}
