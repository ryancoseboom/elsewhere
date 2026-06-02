"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EPHEMERA_PANES, type EphemeraPane } from "@/lib/ephemera";

export default function ArtifactEphemeraPaneSelect({
  artifactId,
  pane,
}: {
  artifactId: string;
  pane: EphemeraPane;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function updatePane(nextPane: string) {
    setSaving(true);

    const response = await fetch(`/api/artifacts/${artifactId}/image`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ephemeraPane: nextPane }),
    });

    setSaving(false);

    if (response.ok) router.refresh();
  }

  return (
    <select
      aria-label="Ephemera pane"
      className="border border-stone-800 bg-neutral-950/90 px-1 py-1 text-[9px] uppercase tracking-[0.12em] text-stone-400"
      disabled={saving}
      value={pane}
      onChange={(event) => void updatePane(event.target.value)}
    >
      {EPHEMERA_PANES.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
