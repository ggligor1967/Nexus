"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CreateProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          language: "en",
          platform: []
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not create project.");
      }

      router.push(`/projects/${payload.project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} data-testid="create-project-form">
      <h2>Create Project</h2>
      <label>
        Project title
        <input
          data-testid="project-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={3}
          maxLength={120}
          required
          placeholder="Stress Companion AI"
        />
      </label>
      {error ? <p className="error card">{error}</p> : null}
      <button type="submit" disabled={isSubmitting} data-testid="create-project-button">
        {isSubmitting ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}
