"use client";

import { useMemo, useState, useTransition } from "react";
import {
  bulkUpdateArtifactDriftMoodsAction,
  type DriftMoodUpdate,
} from "@/app/backroom/drift-moods/actions";
import { DRIFT_MOODS, driftMoodLabel } from "@/lib/drift-moods";

export type DriftMoodArtifact = {
  album: string | null;
  drift_moods: string[];
  id: string;
  slug: string;
  title: string;
  type: string;
};

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function applyUpdates(
  artifacts: DriftMoodArtifact[],
  updates: DriftMoodUpdate[]
) {
  const moodsByArtifactId = new Map(
    updates.map((update) => [update.id, update.drift_moods])
  );

  return artifacts.map((artifact) => ({
    ...artifact,
    drift_moods: moodsByArtifactId.get(artifact.id) || artifact.drift_moods,
  }));
}

export default function BackroomDriftMoodEditor({
  initialArtifacts,
}: {
  initialArtifacts: DriftMoodArtifact[];
}) {
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMood, setSelectedMood] = useState<string>(DRIFT_MOODS[0].value);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const normalizedQuery = normalizeSearch(query);
  const visibleArtifacts = useMemo(() => {
    if (!normalizedQuery) return artifacts;

    return artifacts.filter((artifact) =>
      normalizeSearch(
        [
          artifact.title,
          artifact.slug,
          artifact.album,
          artifact.type,
          artifact.drift_moods.map(driftMoodLabel).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(normalizedQuery)
    );
  }, [artifacts, normalizedQuery]);

  const visibleIds = visibleArtifacts.map((artifact) => artifact.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleArtifact(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleArtifacts() {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  function updateSelected(mode: "add" | "remove") {
    const artifactIds = [...selectedIds];
    setMessage("");
    setErrorMessage("");

    startTransition(async () => {
      try {
        const result = await bulkUpdateArtifactDriftMoodsAction({
          artifactIds,
          mode,
          moods: [selectedMood],
        });

        setArtifacts((current) => applyUpdates(current, result.updated));
        setMessage(result.message);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "The time mood did not save."
        );
      }
    });
  }

  return (
    <section className="border border-stone-800 bg-stone-950/60">
      <div className="grid gap-4 border-b border-stone-800 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-stone-600">
            Find artifacts
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full border border-stone-800 bg-neutral-950 px-4 py-3 text-sm text-stone-200 outline-none focus:border-stone-500"
            placeholder="Title, album, type, or mood"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {DRIFT_MOODS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => setSelectedMood(mood.value)}
              className={`border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition ${
                selectedMood === mood.value
                  ? "border-stone-200 bg-stone-200 text-neutral-950"
                  : "border-stone-700 text-stone-400 hover:border-stone-400 hover:text-stone-100"
              }`}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 px-5 py-4">
        <button
          type="button"
          onClick={toggleVisibleArtifacts}
          className="border border-stone-700 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-300 transition hover:border-stone-300 hover:text-stone-100"
        >
          {allVisibleSelected ? "Clear visible" : "Select visible"}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-stone-600">
            {selectedIds.size} selected / {visibleArtifacts.length} shown
          </p>
          <button
            type="button"
            disabled={isPending || selectedIds.size === 0}
            onClick={() => updateSelected("add")}
            className="border border-stone-600 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            disabled={isPending || selectedIds.size === 0}
            onClick={() => updateSelected("remove")}
            className="border border-stone-800 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      {(message || errorMessage) && (
        <p
          className={`border-b border-stone-800 px-5 py-3 text-sm ${
            errorMessage ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {errorMessage || message}
        </p>
      )}

      <div className="max-h-[70vh] overflow-auto">
        {visibleArtifacts.map((artifact) => (
          <label
            key={artifact.id}
            className="grid cursor-pointer gap-3 border-b border-stone-900 px-5 py-4 transition hover:bg-stone-900/40 sm:grid-cols-[auto_minmax(0,1fr)_minmax(12rem,auto)] sm:items-center"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(artifact.id)}
              onChange={() => toggleArtifact(artifact.id)}
            />
            <span>
              <span className="block font-serif text-xl text-stone-200">
                {artifact.title}
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-stone-600">
                {[artifact.type, artifact.album, artifact.slug]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              {artifact.drift_moods.length > 0 ? (
                artifact.drift_moods.map((mood) => (
                  <span
                    key={mood}
                    className="border border-stone-800 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-stone-400"
                  >
                    {driftMoodLabel(mood)}
                  </span>
                ))
              ) : (
                <span className="text-[9px] uppercase tracking-[0.18em] text-stone-700">
                  No time set
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
