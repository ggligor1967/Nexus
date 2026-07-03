import type {
  PlanDiff,
  ScalarDiff,
  StringArrayDiff
} from "@/lib/diff/plan";

function anyChanged(...diffs: Array<{ changed: boolean }>): boolean {
  return diffs.some((d) => d.changed);
}

function ScalarRow({
  field,
  label,
  diff
}: {
  field: string;
  label: string;
  diff: ScalarDiff;
}) {
  if (!diff.changed) {
    return null;
  }
  return (
    <p data-testid={`diff-scalar-${field}`}>
      <strong>{label}:</strong>{" "}
      <span className="diff-before">{diff.before}</span>
      {" → "}
      <span className="diff-after">{diff.after}</span>
    </p>
  );
}

function ArrayRow({
  field,
  label,
  diff
}: {
  field: string;
  label: string;
  diff: StringArrayDiff;
}) {
  if (!diff.changed) {
    return null;
  }
  return (
    <div data-testid={`diff-array-${field}`}>
      <h4>{label}</h4>
      {diff.added.length > 0 ? (
        <ul data-testid={`diff-added-${field}`}>
          {diff.added.map((item, index) => (
            <li key={`add-${index}`}>+ {item}</li>
          ))}
        </ul>
      ) : null}
      {diff.removed.length > 0 ? (
        <ul data-testid={`diff-removed-${field}`}>
          {diff.removed.map((item, index) => (
            <li key={`rem-${index}`}>− {item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Read-only, presentational view of a structured PlanDiff. No state, no data
 * fetching, no mutation controls. Unchanged sections are omitted for signal.
 */
export default function DiffView({ diff }: { diff: PlanDiff }) {
  if (!diff.hasAnyChange) {
    return (
      <section className="card" data-testid="revision-diff-panel">
        <h2>What changed</h2>
        <p data-testid="revision-diff-empty">
          No differences between these two versions.
        </p>
      </section>
    );
  }

  const dec = diff.deconstruction;
  const st = diff.strategy;
  const proto = diff.prototypeOptions;
  const er = diff.ethicalRiskReport;
  const rm = diff.roadmap;

  const decChanged = anyChanged(
    dec.userProblems,
    dec.targetAudience,
    dec.jobsToBeDone,
    dec.assumptions,
    dec.constraints,
    dec.unknowns,
    dec.successMetrics
  );
  const stChanged = anyChanged(
    st.positioning,
    st.differentiator,
    st.coreValueProposition,
    st.mvpBoundary,
    st.nonGoals
  );
  const optionChanged = (index: number): boolean => {
    const o = proto.options[index];
    return (
      o.status !== "present-in-both" ||
      anyChanged(
        o.title,
        o.type,
        o.summary,
        o.complexity,
        o.whyThisOption,
        o.coreFeatures,
        o.risks,
        o.recommendedPlatform
      )
    );
  };
  const protoChanged =
    proto.countChanged || proto.options.some((_, index) => optionChanged(index));
  const erArraysChanged = anyChanged(
    er.misuseCases,
    er.privacyRisks,
    er.biasRisks,
    er.safetyRisks,
    er.manipulationRisks,
    er.safeguards,
    er.redLines
  );
  const rmChanged = anyChanged(rm.phase1, rm.phase2, rm.phase3);

  return (
    <section className="card" data-testid="revision-diff-panel">
      <h2>What changed</h2>

      {er.overallRiskLevel.changed ? (
        <p className="callout" data-testid="diff-risk-level">
          <strong>Overall risk level:</strong> {er.overallRiskLevel.before} →{" "}
          {er.overallRiskLevel.after}
        </p>
      ) : null}

      {diff.productThesis.changed ? (
        <div className="stack" data-testid="diff-section-product-thesis">
          <h3>Product thesis</h3>
          <ScalarRow
            field="productThesis"
            label="Product thesis"
            diff={diff.productThesis}
          />
        </div>
      ) : null}

      {decChanged ? (
        <div className="stack" data-testid="diff-section-deconstruction">
          <h3>Deconstruction</h3>
          <ArrayRow field="userProblems" label="User problems" diff={dec.userProblems} />
          <ArrayRow field="targetAudience" label="Target audience" diff={dec.targetAudience} />
          <ArrayRow field="jobsToBeDone" label="Jobs to be done" diff={dec.jobsToBeDone} />
          <ArrayRow field="assumptions" label="Assumptions" diff={dec.assumptions} />
          <ArrayRow field="constraints" label="Constraints" diff={dec.constraints} />
          <ArrayRow field="unknowns" label="Unknowns" diff={dec.unknowns} />
          <ArrayRow field="successMetrics" label="Success metrics" diff={dec.successMetrics} />
        </div>
      ) : null}

      {stChanged ? (
        <div className="stack" data-testid="diff-section-strategy">
          <h3>Strategy</h3>
          <ScalarRow field="positioning" label="Positioning" diff={st.positioning} />
          <ScalarRow field="differentiator" label="Differentiator" diff={st.differentiator} />
          <ScalarRow
            field="coreValueProposition"
            label="Core value proposition"
            diff={st.coreValueProposition}
          />
          <ArrayRow field="mvpBoundary" label="MVP boundary" diff={st.mvpBoundary} />
          <ArrayRow field="nonGoals" label="Non-goals" diff={st.nonGoals} />
        </div>
      ) : null}

      {protoChanged ? (
        <div className="stack" data-testid="diff-section-prototype-options">
          <h3>Prototype options</h3>
          {proto.countChanged ? (
            <p data-testid="diff-prototype-count">
              Options: {proto.countBefore} → {proto.countAfter}
            </p>
          ) : null}
          {proto.options.map((option) =>
            optionChanged(option.index) ? (
              <div key={option.index} data-testid={`diff-option-${option.index}`}>
                <h4>
                  Option {option.index + 1}
                  {option.status !== "present-in-both" ? ` (${option.status})` : ""}
                </h4>
                <ScalarRow
                  field={`option-${option.index}-title`}
                  label="Title"
                  diff={option.title}
                />
                <ScalarRow
                  field={`option-${option.index}-type`}
                  label="Type"
                  diff={option.type}
                />
                <ScalarRow
                  field={`option-${option.index}-summary`}
                  label="Summary"
                  diff={option.summary}
                />
                <ScalarRow
                  field={`option-${option.index}-complexity`}
                  label="Complexity"
                  diff={option.complexity}
                />
                <ScalarRow
                  field={`option-${option.index}-whyThisOption`}
                  label="Why this option"
                  diff={option.whyThisOption}
                />
                <ArrayRow
                  field={`option-${option.index}-coreFeatures`}
                  label="Core features"
                  diff={option.coreFeatures}
                />
                <ArrayRow
                  field={`option-${option.index}-risks`}
                  label="Risks"
                  diff={option.risks}
                />
                <ArrayRow
                  field={`option-${option.index}-recommendedPlatform`}
                  label="Recommended platform"
                  diff={option.recommendedPlatform}
                />
              </div>
            ) : null
          )}
        </div>
      ) : null}

      {erArraysChanged ? (
        <div className="stack" data-testid="diff-section-ethical-risk">
          <h3>Ethical risk</h3>
          <ArrayRow field="misuseCases" label="Misuse cases" diff={er.misuseCases} />
          <ArrayRow field="privacyRisks" label="Privacy risks" diff={er.privacyRisks} />
          <ArrayRow field="biasRisks" label="Bias risks" diff={er.biasRisks} />
          <ArrayRow field="safetyRisks" label="Safety risks" diff={er.safetyRisks} />
          <ArrayRow
            field="manipulationRisks"
            label="Manipulation risks"
            diff={er.manipulationRisks}
          />
          <ArrayRow field="safeguards" label="Safeguards" diff={er.safeguards} />
          <ArrayRow field="redLines" label="Red lines" diff={er.redLines} />
        </div>
      ) : null}

      {rmChanged ? (
        <div className="stack" data-testid="diff-section-roadmap">
          <h3>Roadmap</h3>
          <ArrayRow field="phase1" label="Phase 1" diff={rm.phase1} />
          <ArrayRow field="phase2" label="Phase 2" diff={rm.phase2} />
          <ArrayRow field="phase3" label="Phase 3" diff={rm.phase3} />
        </div>
      ) : null}
    </section>
  );
}
