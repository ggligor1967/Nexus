"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NexusPlan } from "@/types/nexus";

type Report = NexusPlan["ethicalRiskReport"];

function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function EthicalRiskPanel({
  projectId,
  report,
  initialAcknowledged
}: {
  projectId: string;
  report: Report;
  initialAcknowledged: boolean;
}) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(initialAcknowledged);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCritical = report.overallRiskLevel === "critical";

  async function persistAcknowledgement(value: boolean) {
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          buildReadyAcknowledged: value
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not persist acknowledgement.");
      }

      setAcknowledged(value);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown acknowledgement error.");
    } finally {
      setSaving(false);
    }
  }

  async function markBuildReady() {
    if (isCritical && !acknowledged) return;
    await persistAcknowledgement(true);
  }

  return (
    <article className={`card ${isCritical ? "warning" : ""}`} data-testid="ethical-risk-panel">
      <h2>Ethical Risk Report</h2>
      <p>
        <strong>Overall risk level:</strong> {report.overallRiskLevel}
      </p>

      {isCritical ? (
        <section className="card warning">
          <strong>Critical-risk plan.</strong> This cannot be treated as build-ready
          until safeguards and red lines are explicitly acknowledged and persisted.
        </section>
      ) : null}

      <h3>Misuse cases</h3>
      <List items={report.misuseCases} />

      <h3>Privacy risks</h3>
      <List items={report.privacyRisks} />

      <h3>Bias risks</h3>
      <List items={report.biasRisks} />

      <h3>Safety risks</h3>
      <List items={report.safetyRisks} />

      <h3>Manipulation risks</h3>
      <List items={report.manipulationRisks} />

      <h3>Safeguards</h3>
      <List items={report.safeguards} />

      <h3>Red lines</h3>
      <List items={report.redLines} />

      {isCritical ? (
        <label className="row">
          <input
            type="checkbox"
            data-testid="critical-ack-checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            style={{ width: "auto" }}
          />
          I acknowledge the safeguards and red lines.
        </label>
      ) : null}

      {error ? <p className="card error">{error}</p> : null}

      <div className="row">
        <button
          type="button"
          disabled={isSaving || (isCritical && !acknowledged)}
          onClick={markBuildReady}
          data-testid="mark-build-ready-button"
        >
          {isSaving ? "Saving..." : acknowledged ? "Build-ready acknowledged" : "Mark build-ready"}
        </button>

        {initialAcknowledged ? (
          <button
            type="button"
            className="secondary"
            disabled={isSaving}
            onClick={() => persistAcknowledgement(false)}
          >
            Clear acknowledgement
          </button>
        ) : null}
      </div>
    </article>
  );
}
