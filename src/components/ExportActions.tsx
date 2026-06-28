"use client";

import { useState } from "react";

export default function ExportActions({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setExporting] = useState(false);

  async function exportMarkdown() {
    setError(null);
    setExporting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/export/markdown`, {
        method: "POST"
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Could not export Markdown.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "nexus-plan.md";

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown export error.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card">
      <h2>Export</h2>
      {error ? <p className="card error">{error}</p> : null}
      <button type="button" onClick={exportMarkdown} disabled={isExporting} data-testid="export-markdown-button">
        {isExporting ? "Exporting..." : "Export Markdown"}
      </button>
    </section>
  );
}
