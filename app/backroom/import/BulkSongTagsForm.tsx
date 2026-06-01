"use client";

import { useMemo, useState } from "react";
import { addBulkSongTagsAction } from "./actions";

type SongOption = {
  id: string;
  title: string;
  album: string | null;
  atmosphere: string[];
  motifs: string[];
};

export default function BulkSongTagsForm({ songs }: { songs: SongOption[] }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<"atmosphere" | "motifs">("atmosphere");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const visibleSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return songs;

    return songs.filter((song) =>
      `${song.title} ${song.album || ""}`.toLowerCase().includes(normalizedQuery)
    );
  }, [query, songs]);

  function toggleSong(songId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }

      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleSongs.forEach((song) => next.add(song.id));
      return next;
    });
  }

  return (
    <form action={addBulkSongTagsAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by song or album"
          className="border-b border-stone-700 bg-transparent px-1 py-3 text-sm text-stone-100 outline-none focus:border-stone-300"
        />

        <select
          name="tag_field"
          value={field}
          onChange={(event) =>
            setField(event.target.value as "atmosphere" | "motifs")
          }
          className="border border-stone-700 bg-neutral-950 px-3 py-2 text-sm text-stone-300 outline-none focus:border-stone-400"
        >
          <option value="atmosphere">Atmosphere</option>
          <option value="motifs">Motifs</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-stone-600">
        <span>
          {selectedIds.size} selected / {visibleSongs.length} visible
        </span>
        <span className="flex gap-4">
          <button
            type="button"
            onClick={selectVisible}
            className="hover:text-stone-300"
          >
            Select visible
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="hover:text-stone-300"
          >
            Clear selection
          </button>
        </span>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto border-y border-stone-900 py-3">
        {visibleSongs.map((song) => (
          <label
            key={song.id}
            className="flex items-start gap-3 px-2 py-2 text-sm text-stone-300 hover:bg-stone-900/50"
          >
            <input
              type="checkbox"
              name="song_ids"
              value={song.id}
              checked={selectedIds.has(song.id)}
              onChange={() => toggleSong(song.id)}
              className="mt-1"
            />
            <span>
              <span className="block">{song.title}</span>
              <span className="mt-1 block text-xs text-stone-700">
                {song.album || "No album"}
                {song[field].length > 0 && ` / ${song[field].join(", ")}`}
              </span>
            </span>
          </label>
        ))}
      </div>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-stone-600">
        Tags to merge
        <textarea
          name="tags"
          rows={3}
          placeholder="dreamlike, nocturnal, intimate"
          className="mt-2 w-full border border-stone-800 bg-transparent px-3 py-2 text-sm leading-6 text-stone-300 outline-none focus:border-stone-500"
        />
      </label>

      <button className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950">
        Add tags to selected songs
      </button>
    </form>
  );
}
