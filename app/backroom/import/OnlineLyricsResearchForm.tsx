"use client";

import { useMemo, useState } from "react";
import { importReviewedOnlineLyricsAction } from "./actions";

type MissingSong = {
  id: string;
  title: string;
  album: string | null;
};

type LyricsDraft = {
  lyrics: string;
  sourceUrl: string;
};

function searchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function lyricsKidUrl(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `https://www.lyricskid.com/lyrics/halou-lyrics/${slug}-lyrics.html`;
}

function completedDrafts(drafts: Record<string, LyricsDraft>) {
  return Object.entries(drafts)
    .filter(([, draft]) => draft.lyrics.trim())
    .map(([songId, draft]) => ({
      songId,
      lyrics: draft.lyrics.trim(),
      sourceUrl: draft.sourceUrl.trim(),
    }));
}

export default function OnlineLyricsResearchForm({
  songs,
}: {
  songs: MissingSong[];
}) {
  const [drafts, setDrafts] = useState<Record<string, LyricsDraft>>({});
  const [onlyUnfinished, setOnlyUnfinished] = useState(false);
  const [query, setQuery] = useState("");
  const completed = useMemo(() => completedDrafts(drafts), [drafts]);
  const visibleSongs = songs.filter((song) => {
    const draft = drafts[song.id];
    const searchText = `${song.title} ${song.album || ""}`.toLowerCase();

    if (query && !searchText.includes(query.toLowerCase())) return false;
    if (onlyUnfinished && draft?.lyrics.trim()) return false;

    return true;
  });

  function updateDraft(songId: string, changes: Partial<LyricsDraft>) {
    setDrafts((current) => ({
      ...current,
      [songId]: {
        lyrics: current[songId]?.lyrics || "",
        sourceUrl: current[songId]?.sourceUrl || "",
        ...changes,
      },
    }));
  }

  return (
    <form action={importReviewedOnlineLyricsAction} className="space-y-6">
      <input type="hidden" name="metadata" value={JSON.stringify(completed)} />

      <div className="flex flex-wrap items-center gap-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter missing songs"
          className="min-w-64 flex-1 border-b border-stone-700 bg-transparent px-1 py-3 text-sm text-stone-100 outline-none focus:border-stone-300"
        />

        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-500">
          <input
            type="checkbox"
            checked={onlyUnfinished}
            onChange={(event) => setOnlyUnfinished(event.target.checked)}
          />
          Hide completed rows
        </label>

        <span className="text-xs uppercase tracking-[0.18em] text-stone-600">
          {completed.length} ready / {songs.length} missing
        </span>
      </div>

      <div className="space-y-3">
        {visibleSongs.map((song) => {
          const draft = drafts[song.id] || { lyrics: "", sourceUrl: "" };
          const queryBase = `"${song.title}" Halou lyrics`;
          const lyricsKidSource = lyricsKidUrl(song.title);
          const isReady = Boolean(draft.lyrics.trim());

          return (
            <article
              key={song.id}
              className="border border-stone-800 bg-stone-950/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-stone-100">{song.title}</h3>
                  {song.album && (
                    <p className="mt-1 text-xs text-stone-600">{song.album}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.18em]">
                  <a
                    href={searchUrl(`${queryBase} site:halou.com`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-500 hover:text-stone-200"
                  >
                    Official site
                  </a>
                  <a
                    href={searchUrl(queryBase)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-500 hover:text-stone-200"
                  >
                    Web search
                  </a>
                  <a
                    href={lyricsKidSource}
                    target="_blank"
                    rel="noreferrer"
                    className="text-stone-500 hover:text-stone-200"
                  >
                    LyricsKid
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft(song.id, { sourceUrl: lyricsKidSource })
                    }
                    className="text-stone-500 hover:text-stone-200"
                  >
                    Use LyricsKid source
                  </button>
                </div>
              </div>

              <label className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-stone-600">
                Source URL optional
              <input
                value={draft.sourceUrl}
                onChange={(event) =>
                  updateDraft(song.id, { sourceUrl: event.target.value })
                }
                placeholder="Source URL"
                  className="mt-2 w-full border-b border-stone-800 bg-transparent px-1 py-2 text-xs text-stone-400 outline-none focus:border-stone-500"
              />
              </label>

              <label className="mt-3 block text-[10px] uppercase tracking-[0.18em] text-stone-600">
                Authorized lyrics required
              <textarea
                value={draft.lyrics}
                onChange={(event) =>
                  updateDraft(song.id, { lyrics: event.target.value })
                }
                rows={5}
                placeholder="Paste authorized lyrics here"
                  className="mt-2 w-full border border-stone-800 bg-transparent px-3 py-2 font-serif text-sm leading-6 text-stone-300 outline-none focus:border-stone-500"
              />
              </label>

              <p
                className={`mt-3 text-[10px] uppercase tracking-[0.18em] ${
                  isReady ? "text-emerald-700" : "text-stone-700"
                }`}
              >
                {isReady
                  ? "Ready to add"
                  : "Paste lyrics to make this row ready"}
              </p>
            </article>
          );
        })}
      </div>

      <label className="flex max-w-2xl items-start gap-3 text-xs leading-5 text-stone-500">
        <input name="rights_confirmed" type="checkbox" value="yes" required />
        I confirm that I own these lyrics or have permission to store and
        publish them in Elsewhere.
      </label>

      <button
        type="submit"
        disabled={completed.length === 0}
        className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Add reviewed online lyrics
      </button>

      {completed.length === 0 && (
        <p className="text-xs leading-5 text-stone-600">
          The button unlocks when at least one row has pasted lyrics.
        </p>
      )}
    </form>
  );
}
