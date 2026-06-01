"use client";

import { useState } from "react";
import { importArchiveMaterialsAction } from "./actions";

type ArtifactOption = {
  id: string;
  title: string;
  artifactType: string;
};

type MaterialDraft = {
  index: number;
  fileName: string;
  title: string;
  artifactType: "Artwork" | "Photo" | "Design" | "Demo" | "Video";
  selected: boolean;
};

function withoutExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function inferType(file: File): MaterialDraft["artifactType"] {
  if (file.type.startsWith("audio/")) return "Demo";
  if (file.type.startsWith("video/")) return "Video";
  return "Artwork";
}

export default function BulkArchiveMaterialsForm({
  artifacts,
}: {
  artifacts: ArtifactOption[];
}) {
  const [drafts, setDrafts] = useState<MaterialDraft[]>([]);
  const selected = drafts.filter((draft) => draft.selected);

  function inspectFiles(files: FileList | null) {
    if (!files) return;

    setDrafts(
      Array.from(files).map((file, index) => ({
        index,
        fileName: file.name,
        title: withoutExtension(file.name),
        artifactType: inferType(file),
        selected: true,
      }))
    );
  }

  function updateDraft(index: number, changes: Partial<MaterialDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.index === index ? { ...draft, ...changes } : draft
      )
    );
  }

  return (
    <form action={importArchiveMaterialsAction} className="space-y-6">
      <input
        type="hidden"
        name="metadata"
        value={JSON.stringify(
          selected.map(({ index, title, artifactType }) => ({
            index,
            title,
            artifactType,
          }))
        )}
      />

      <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
        Attach this batch to
        <select
          name="parent_id"
          required
          defaultValue=""
          className="mt-2 w-full border border-stone-700 bg-neutral-950 px-3 py-3 normal-case tracking-normal text-stone-300 outline-none focus:border-stone-400"
        >
          <option value="" disabled>
            Choose a song, album, or other parent artifact
          </option>
          {artifacts.map((artifact) => (
            <option key={artifact.id} value={artifact.id}>
              {artifact.title} / {artifact.artifactType}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
        Images, audio files, and videos
        <input
          name="archive_files"
          type="file"
          accept="image/*,audio/*,video/*"
          multiple
          onChange={(event) => inspectFiles(event.target.files)}
          className="mt-3 block w-full normal-case tracking-normal text-stone-400 file:mr-4 file:border file:border-stone-700 file:bg-transparent file:px-4 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300"
        />
      </label>

      {drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <article
              key={`${draft.index}-${draft.fileName}`}
              className="grid gap-3 border border-stone-800 p-4 md:grid-cols-[auto_1fr_11rem]"
            >
              <input
                type="checkbox"
                checked={draft.selected}
                onChange={(event) =>
                  updateDraft(draft.index, { selected: event.target.checked })
                }
                aria-label={`Import ${draft.title}`}
              />
              <div>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    updateDraft(draft.index, { title: event.target.value })
                  }
                  className="w-full border-b border-stone-800 bg-transparent py-1 text-stone-100 outline-none"
                />
                <p className="mt-2 truncate text-[10px] text-stone-700">
                  {draft.fileName}
                </p>
              </div>
              <select
                value={draft.artifactType}
                onChange={(event) =>
                  updateDraft(draft.index, {
                    artifactType: event.target
                      .value as MaterialDraft["artifactType"],
                  })
                }
                className="border border-stone-800 bg-neutral-950 px-3 py-2 text-sm text-stone-300"
              >
                <option>Artwork</option>
                <option>Photo</option>
                <option>Design</option>
                <option>Demo</option>
                <option>Video</option>
              </select>
            </article>
          ))}
        </div>
      )}

      <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
        Shared private note optional
        <textarea
          name="private_notes"
          rows={3}
          className="mt-2 w-full border border-stone-800 bg-transparent px-3 py-2 normal-case tracking-normal text-stone-300 outline-none focus:border-stone-500"
        />
      </label>

      <button
        disabled={selected.length === 0}
        className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Import selected archive materials
      </button>
    </form>
  );
}
