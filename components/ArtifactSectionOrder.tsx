"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ArtifactSectionOrderProps = {
  artifactId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete?: boolean;
  deleteKind?: "image" | "video";
};

export default function ArtifactSectionOrder({
  artifactId,
  canMoveUp,
  canMoveDown,
  canDelete = false,
  deleteKind = "image",
}: ArtifactSectionOrderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function move(direction: "up" | "down") {
    setSaving(true);

    const response = await fetch(`/api/artifacts/${artifactId}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });

    setSaving(false);

    if (response.ok) router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Permanently remove this archival ${deleteKind}?`)) return;

    setSaving(true);

    const response = await fetch(`/api/artifacts/${artifactId}/${deleteKind}`, {
      method: "DELETE",
    });

    setSaving(false);

    if (response.ok) router.refresh();
  }

  return (
    <span className="flex gap-1">
      <button
        type="button"
        disabled={!canMoveUp || saving}
        onClick={() => void move("up")}
        className="border border-stone-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-stone-300 disabled:cursor-not-allowed disabled:opacity-25"
        aria-label="Move earlier"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={!canMoveDown || saving}
        onClick={() => void move("down")}
        className="border border-stone-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-stone-300 disabled:cursor-not-allowed disabled:opacity-25"
        aria-label="Move later"
      >
        ↓
      </button>
      {canDelete && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void remove()}
          className="border border-red-950 bg-neutral-950/80 px-2 py-1 text-[10px] text-red-500 disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={`Delete archival ${deleteKind}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
