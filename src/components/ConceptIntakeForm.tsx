"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const platformOptions = ["web", "mobile", "windows", "ai", "other"] as const;

export default function ConceptIntakeForm({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [rawConcept, setRawConcept] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [platform, setPlatform] = useState<string[]>(["web"]);
  const [language, setLanguage] = useState("en");
  const [riskDomain, setRiskDomain] = useState("general");
  const [outputType, setOutputType] = useState("full_prd");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setGenerating] = useState(false);

  function togglePlatform(value: string) {
    setPlatform((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (rawConcept.trim().length < 50) {
      setError("Concept must be at least 50 characters.");
      return;
    }

    if (platform.length < 1) {
      setError("Select at least one platform.");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rawConcept,
          targetUsers: targetUsers || undefined,
          platform,
          language,
          riskDomain,
          outputType,
          constraints: {}
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown generation error.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} data-testid="concept-intake-form">
      <h2>Concept Intake</h2>

      <label>
        Raw concept
        <textarea
          data-testid="raw-concept-input"
          value={rawConcept}
          onChange={(event) => setRawConcept(event.target.value)}
          placeholder="Describe your messy app idea..."
          required
        />
      </label>

      <label>
        Target users
        <input
          value={targetUsers}
          onChange={(event) => setTargetUsers(event.target.value)}
          placeholder="Indie creators, founders, designers..."
        />
      </label>

      <fieldset className="card">
        <legend>Platform</legend>
        <div className="row">
          {platformOptions.map((option) => (
            <label key={option} className="row">
              <input
                type="checkbox"
                checked={platform.includes(option)}
                onChange={() => togglePlatform(option)}
                style={{ width: "auto" }}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        Language
        <select data-testid="language-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="en">English</option>
          <option value="ro">Română</option>
          <option value="bilingual">Bilingual</option>
        </select>
      </label>

      <label>
        Risk domain
        <select
          data-testid="risk-domain-select"
          value={riskDomain}
          onChange={(event) => setRiskDomain(event.target.value)}
        >
          <option value="general">General</option>
          <option value="health">Health</option>
          <option value="finance">Finance</option>
          <option value="children">Children</option>
          <option value="education">Education</option>
          <option value="surveillance">Surveillance</option>
          <option value="legal">Legal</option>
          <option value="ai_safety">AI safety</option>
        </select>
      </label>

      <label>
        Output type
        <select
          value={outputType}
          onChange={(event) => setOutputType(event.target.value)}
        >
          <option value="full_prd">Full PRD</option>
          <option value="mvp_plan">MVP plan</option>
          <option value="technical_plan">Technical plan</option>
          <option value="ux_flow">UX flow</option>
          <option value="ethical_review">Ethical review</option>
        </select>
      </label>

      {error ? <section className="card error">{error}</section> : null}

      <button type="submit" disabled={isGenerating} data-testid="generate-plan-button">
        {isGenerating ? "Generating..." : "Generate Product Plan"}
      </button>
    </form>
  );
}
