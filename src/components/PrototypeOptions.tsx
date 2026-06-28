import type { NexusPlan } from "@/types/nexus";

type PrototypeOption = NexusPlan["prototypeOptions"][number];

export default function PrototypeOptions({ options }: { options: PrototypeOption[] }) {
  return (
    <article className="card">
      <h2>Prototype Options</h2>
      <div className="stack">
        {options.map((option, index) => (
          <section className="card" key={`${option.title}-${index}`}>
            <div className="row">
              <h3>{option.title}</h3>
              <span className="badge">{option.type}</span>
              <span className="badge">{option.complexity}</span>
            </div>
            <p>{option.summary}</p>
            <h4>Core features</h4>
            <ul>
              {option.coreFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <h4>Risks</h4>
            <ul>
              {option.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
            <p>
              <strong>Why:</strong> {option.whyThisOption}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
