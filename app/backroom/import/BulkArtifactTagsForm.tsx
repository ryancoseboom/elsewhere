"use client";

import { useMemo, useState } from "react";
import { addBulkArtifactTagsAction } from "./actions";

type ArtifactOption = {
  id: string;
  title: string;
  artifactType: string;
};

export default function BulkArtifactTagsForm({
  artifacts,
}: {
  artifacts: ArtifactOption[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return artifacts;
    return artifacts.filter((artifact) =>
      `${artifact.title} ${artifact.artifactType}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [artifacts, query]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={addBulkArtifactTagsAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter artifacts by title or type"
          className="border-b border-stone-700 bg-transparent px-1 py-3 text-sm text-stone-100 outline-none focus:border-stone-300"
        />
        <select
          name="tag_field"
          className="border border-stone-700 bg-neutral-950 px-3 py-2 text-sm text-stone-300"
        >
          <option value="atmosphere">Atmosphere</option>
          <option value="motifs">Motifs</option>
          <option value="rooms">Rooms</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-stone-600">
        <span>{selectedIds.size} selected / {visible.length} visible</span>
        <span className="flex gap-4">
          <button
            type="button"
            onClick={() =>
              setSelectedIds((current) => {
                const next = new Set(current);
                visible.forEach((artifact) => next.add(artifact.id));
                return next;
              })
            }
            className="hover:text-stone-300"
          >
            Select visible
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="hover:text-stone-300"
          >
            Clear
          </button>
        </span>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto border-y border-stone-900 py-3">
        {visible.map((artifact) => (
          <label
            key={artifact.id}
            className="flex items-center gap-3 px-2 py-2 text-sm text-stone-300 hover:bg-stone-900/50"
          >
            <input
              type="checkbox"
              name="artifact_ids"
              value={artifact.id}
              checked={selectedIds.has(artifact.id)}
              onChange={() => toggle(artifact.id)}
            />
            <span>{artifact.title}</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-700">
              {artifact.artifactType}
            </span>
          </label>
        ))}
      </div>

      <textarea
        name="tags"
        rows={3}
        placeholder="Separate tags with commas or line breaks"
        className="w-full border border-stone-800 bg-transparent px-3 py-2 text-sm text-stone-300 outline-none focus:border-stone-500"
      />

      <button className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950">
        Add tags to selected artifacts
      </button>
    </form>
  );
}
