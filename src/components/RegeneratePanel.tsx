"use client";

import { useState } from "react";
import ConceptIntakeForm, {
  type ConceptIntakeInitialValues
} from "@/components/ConceptIntakeForm";

export default function RegeneratePanel({
  projectId,
  initialValues
}: {
  projectId: string;
  initialValues?: ConceptIntakeInitialValues;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <ConceptIntakeForm projectId={projectId} initialValues={initialValues} />;
  }

  return (
    <section className="card">
      <h2>Regenerate</h2>
      <p>
        Generate a new plan from a revised concept. The current plan is preserved in
        revision history.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="regenerate-plan-button"
      >
        Regenerate plan
      </button>
    </section>
  );
}
