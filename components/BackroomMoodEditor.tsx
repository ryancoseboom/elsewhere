"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  bulkUpdateSongMoodsAction,
  updateSongMoodsAction,
  type MoodUpdateResult,
} from "@/app/backroom/moods/actions";

export type MoodSong = {
  album: string | null;
  atmosphere: string[];
  id: string;
  slug: string;
  title: string;
};

const starterMoods = [
  "dreamlike",
  "haunted",
  "domestic",
  "nocturnal",
  "cinematic",
  "intimate",
  "distant",
  "nostalgic",
  "uneasy",
  "tender",
  "damaged",
  "luminous",
  "submerged",
  "empty",
  "devotional",
  "romantic",
  "mechanical",
  "spectral",
  "warm",
  "cold",
];

function normalizeMood(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueMoods(values: string[]) {
  const moods: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const mood = normalizeMood(value);
    if (!mood || seen.has(mood)) continue;

    moods.push(mood);
    seen.add(mood);
  }

  return moods;
}

export default function BackroomMoodEditor({
  initialSongs,
}: {
  initialSongs: MoodSong[];
}) {
  const [songs, setSongs] = useState(initialSongs);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [customMood, setCustomMood] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const moodPalette = useMemo(
    () =>
      uniqueMoods([
        ...starterMoods,
        ...songs.flatMap((song) => song.atmosphere || []),
        customMood,
      ]),
    [customMood, songs]
  );

  const visibleSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return songs;

    return songs.filter((song) =>
      `${song.title} ${song.album || ""} ${(song.atmosphere || []).join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, songs]);

  const bulkMoods = useMemo(
    () => uniqueMoods([...selectedMoods, customMood]),
    [customMood, selectedMoods]
  );

  function applyResult(result: MoodUpdateResult) {
    const updates = new Map(
      result.updated.map((update) => [update.id, update.atmosphere])
    );

    setSongs((currentSongs) =>
      currentSongs.map((song) => ({
        ...song,
        atmosphere: updates.get(song.id) || song.atmosphere,
      }))
    );
    setMessage(result.message);
    setErrorMessage("");
  }

  function runAction(action: () => Promise<MoodUpdateResult>) {
    setMessage("");
    setErrorMessage("");
    startTransition(async () => {
      try {
        const result = await action();
        applyResult(result);
      } catch (error) {
        setErrorMessage((error as Error).message);
      }
    });
  }

  function toggleSong(songId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }

  function toggleMood(mood: string) {
    setSelectedMoods((current) => {
      const next = new Set(current);
      if (next.has(mood)) next.delete(mood);
      else next.add(mood);
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

  function updateSingleSong(song: MoodSong, mood: string, mode: "add" | "remove") {
    const normalizedMood = normalizeMood(mood);
    if (!normalizedMood) return;

    runAction(() =>
      updateSongMoodsAction({
        mode,
        moods: [normalizedMood],
        songId: song.id,
      })
    );
  }

  function applyBulk(mode: "add" | "remove") {
    runAction(() =>
      bulkUpdateSongMoodsAction({
        mode,
        moods: bulkMoods,
        songIds: [...selectedIds],
      })
    );
  }

  return (
    <div className="space-y-8">
      <section className="border border-stone-800 bg-stone-950/50 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1 text-[10px] uppercase tracking-[0.28em] text-stone-600">
            Find a song, album, or weather word
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="visitor, wholeness, nocturnal..."
              className="mt-3 w-full border-b border-stone-700 bg-transparent px-1 py-3 text-sm normal-case tracking-normal text-stone-100 outline-none transition placeholder:text-stone-700 focus:border-stone-300"
            />
          </label>

          <label className="block min-w-64 text-[10px] uppercase tracking-[0.28em] text-stone-600">
            New mood
            <input
              value={customMood}
              onChange={(event) => setCustomMood(event.target.value)}
              placeholder="silver, abandoned, feverish"
              className="mt-3 w-full border border-stone-800 bg-black/20 px-3 py-3 text-sm normal-case tracking-normal text-stone-200 outline-none transition placeholder:text-stone-700 focus:border-stone-500"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {moodPalette.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => toggleMood(mood)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                selectedMoods.has(mood)
                  ? "border-stone-200 bg-stone-200 text-neutral-950"
                  : "border-stone-800 text-stone-500 hover:border-stone-500 hover:text-stone-200"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </section>

      <section className="sticky top-0 z-20 border border-stone-800 bg-neutral-950/95 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-stone-600">
              Bulk weather
            </p>
            <p className="mt-2 text-sm text-stone-400">
              {selectedIds.size} selected / {visibleSongs.length} visible
              {bulkMoods.length > 0 && ` / ${bulkMoods.join(", ")}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={selectVisible}
              className="border border-stone-800 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
            >
              Select visible
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="border border-stone-800 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isPending || selectedIds.size === 0 || bulkMoods.length === 0}
              onClick={() => applyBulk("add")}
              className="border border-stone-600 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Apply moods
            </button>
            <button
              type="button"
              disabled={isPending || selectedIds.size === 0 || bulkMoods.length === 0}
              onClick={() => applyBulk("remove")}
              className="border border-stone-800 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-stone-500 transition hover:border-red-900 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Remove moods
            </button>
          </div>
        </div>

        <p
          aria-live="polite"
          className={`mt-3 text-xs ${
            errorMessage ? "text-red-400" : message ? "text-stone-400" : "text-stone-700"
          }`}
        >
          {isPending && "Saving the weather..."}
          {!isPending && errorMessage}
          {!isPending && !errorMessage && message}
          {!isPending && !errorMessage && !message && "Choose songs and moods, then apply."}
        </p>
      </section>

      {initialSongs.length === 0 ? (
        <section className="border border-stone-900 p-8 text-center">
          <p className="font-serif text-2xl text-stone-400">No songs yet.</p>
          <p className="mt-3 text-sm text-stone-600">
            Bring songs into the archive first, then return to assign weather.
          </p>
        </section>
      ) : visibleSongs.length === 0 ? (
        <section className="border border-stone-900 p-8 text-center">
          <p className="font-serif text-2xl text-stone-400">Nothing matches.</p>
          <p className="mt-3 text-sm text-stone-600">
            Try a title, album name, or an existing mood.
          </p>
        </section>
      ) : (
        <section className="grid gap-3">
          {visibleSongs.map((song) => {
            const missingPaletteMoods = moodPalette.filter(
              (mood) =>
                !song.atmosphere.some(
                  (currentMood) => currentMood.toLowerCase() === mood.toLowerCase()
                )
            );

            return (
              <article
                key={song.id}
                className={`border bg-stone-950/40 p-4 transition ${
                  selectedIds.has(song.id)
                    ? "border-stone-500"
                    : "border-stone-900 hover:border-stone-700"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <label className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(song.id)}
                      onChange={() => toggleSong(song.id)}
                      className="mt-2"
                    />
                    <span className="min-w-0">
                      <span className="block font-serif text-2xl text-stone-100">
                        {song.title}
                      </span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-stone-600">
                        {song.album || "No parent album"}
                      </span>
                    </span>
                  </label>

                  <Link
                    href={`/artifact/${song.slug}`}
                    className="w-fit border border-stone-800 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-600 transition hover:border-stone-500 hover:text-stone-200"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-700">
                    Current weather
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {song.atmosphere.length > 0 ? (
                      song.atmosphere.map((mood) => (
                        <button
                          key={mood}
                          type="button"
                          disabled={isPending}
                          onClick={() => updateSingleSong(song, mood, "remove")}
                          className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-stone-300 transition hover:border-red-900 hover:text-red-300 disabled:opacity-40"
                          title={`Remove ${mood}`}
                        >
                          {mood} ×
                        </button>
                      ))
                    ) : (
                      <span className="text-sm italic text-stone-700">
                        No weather assigned.
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-700">
                    Add quickly
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingPaletteMoods.slice(0, 24).map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        disabled={isPending}
                        onClick={() => updateSingleSong(song, mood, "add")}
                        className="rounded-full border border-stone-900 px-3 py-1.5 text-xs text-stone-600 transition hover:border-stone-500 hover:text-stone-200 disabled:opacity-40"
                      >
                        + {mood}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
