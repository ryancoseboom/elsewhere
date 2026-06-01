"use client";

import { useState } from "react";
import { importLocalLyricsAction } from "./actions";

type SongOption = {
  id: string;
  slug: string;
  title: string;
  album: string | null;
  hasLyrics: boolean;
};

type LyricsFile = {
  id: number;
  fileName: string;
  songId: string;
  lyrics: string;
  selected: boolean;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripLrcTimestamps(value: string) {
  return value
    .replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, "")
    .replace(/^\[(?:ar|al|ti|by|offset):.*\]\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function guessSongId(fileName: string, songs: SongOption[]) {
  const fileSlug = normalize(fileName);
  const exact = songs.find(
    (song) => normalize(song.slug) === fileSlug || normalize(song.title) === fileSlug
  );

  return exact?.id || "";
}

function metadataJson(files: LyricsFile[]) {
  return JSON.stringify(
    files
      .filter((file) => file.selected && file.songId && file.lyrics.trim())
      .map(({ songId, lyrics }) => ({ songId, lyrics }))
  );
}

export default function LocalLyricsImportForm({
  songs,
}: {
  songs: SongOption[];
}) {
  const [files, setFiles] = useState<LyricsFile[]>([]);
  const [readingFiles, setReadingFiles] = useState(false);

  async function inspectFiles(fileList: FileList | null) {
    if (!fileList) return;

    setReadingFiles(true);
    const nextFiles = await Promise.all(
      Array.from(fileList).map(async (file, index) => ({
        id: index,
        fileName: file.name,
        songId: guessSongId(file.name, songs),
        lyrics: stripLrcTimestamps(await file.text()),
        selected: true,
      }))
    );
    setFiles(nextFiles);
    setReadingFiles(false);
  }

  function updateFile(id: number, changes: Partial<LyricsFile>) {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, ...changes } : file))
    );
  }

  return (
    <form action={importLocalLyricsAction} className="space-y-6">
      <input type="hidden" name="metadata" value={metadataJson(files)} />

      <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
        Lyrics files
        <input
          type="file"
          accept=".txt,.lrc,text/plain"
          multiple
          onChange={(event) => inspectFiles(event.target.files)}
          className="mt-3 block w-full normal-case tracking-normal text-stone-400 file:mr-4 file:border file:border-stone-700 file:bg-transparent file:px-4 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300"
        />
      </label>

      {readingFiles && <p className="text-sm text-stone-500">Reading lyric files...</p>}

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <article
              key={`${file.id}-${file.fileName}`}
              className="grid gap-3 border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-[auto_1fr_1.2fr]"
            >
              <input
                type="checkbox"
                checked={file.selected}
                onChange={(event) =>
                  updateFile(file.id, { selected: event.target.checked })
                }
                aria-label={`Import ${file.fileName}`}
              />

              <div>
                <p className="text-sm text-stone-200">{file.fileName}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-stone-700">
                  {file.lyrics.length} characters
                </p>
              </div>

              <label className="text-[10px] uppercase tracking-[0.18em] text-stone-600">
                Match to song
                <select
                  value={file.songId}
                  onChange={(event) =>
                    updateFile(file.id, { songId: event.target.value })
                  }
                  className="mt-2 w-full border border-stone-800 bg-neutral-950 px-3 py-2 normal-case tracking-normal text-stone-300 outline-none focus:border-stone-500"
                >
                  <option value="">Choose a song</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                      {song.album ? ` / ${song.album}` : ""}
                      {song.hasLyrics ? " / lyrics already present" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={files.every(
          (file) => !file.selected || !file.songId || !file.lyrics.trim()
        )}
        className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Add reviewed lyrics
      </button>
    </form>
  );
}
