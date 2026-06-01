"use client";

import { useState } from "react";
import { importLocalAudioAction } from "./actions";

type LocalSong = {
  index: number;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  trackNumber: number;
  hasEmbeddedArtwork: boolean;
  selected: boolean;
};

function readSynchsafeInteger(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function readInteger(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

function decodeTextFrame(bytes: Uint8Array) {
  if (bytes.length < 2) return "";

  const encoding = bytes[0];
  const content = bytes.slice(1);

  if (encoding === 1 || encoding === 2) {
    return new TextDecoder("utf-16").decode(content).replace(/\0/g, "").trim();
  }

  return new TextDecoder("utf-8").decode(content).replace(/\0/g, "").trim();
}

async function inspectId3(file: File, index: number): Promise<LocalSong> {
  const fallbackTitle = file.name.replace(/\.[^/.]+$/, "");
  const bytes = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
  const song: LocalSong = {
    index,
    fileName: file.name,
    title: fallbackTitle,
    artist: "",
    album: "",
    year: "",
    trackNumber: index + 1,
    hasEmbeddedArtwork: false,
    selected: true,
  };

  if (
    bytes.length < 10 ||
    String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== "ID3"
  ) {
    return song;
  }

  const version = bytes[3];
  const tagSize = readSynchsafeInteger(bytes, 6);
  let offset = 10;

  while (offset + 10 <= Math.min(bytes.length, tagSize + 10)) {
    const id = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );
    const size =
      version === 4
        ? readSynchsafeInteger(bytes, offset + 4)
        : readInteger(bytes, offset + 4);

    if (!id.trim() || size <= 0 || offset + 10 + size > bytes.length) break;

    const content = bytes.slice(offset + 10, offset + 10 + size);

    if (id === "TIT2") song.title = decodeTextFrame(content) || song.title;
    if (id === "TPE1") song.artist = decodeTextFrame(content);
    if (id === "TALB") song.album = decodeTextFrame(content);
    if (id === "TYER" || id === "TDRC") song.year = decodeTextFrame(content).slice(0, 4);
    if (id === "TRCK") {
      song.trackNumber =
        Number.parseInt(decodeTextFrame(content).split("/")[0], 10) ||
        song.trackNumber;
    }
    if (id === "APIC") song.hasEmbeddedArtwork = true;

    offset += size + 10;
  }

  return song;
}

function metadataJson(songs: LocalSong[]) {
  return JSON.stringify(
    songs
      .filter((song) => song.selected)
      .map(({ index, title, artist, album, year, trackNumber }) => ({
        index,
        title,
        artist,
        album,
        year,
        trackNumber,
      }))
  );
}

export default function LocalAudioImportForm() {
  const [songs, setSongs] = useState<LocalSong[]>([]);
  const [readingFiles, setReadingFiles] = useState(false);

  async function inspectFiles(files: FileList | null) {
    if (!files) return;

    setReadingFiles(true);
    setSongs(await Promise.all(Array.from(files).map(inspectId3)));
    setReadingFiles(false);
  }

  function updateSong(index: number, changes: Partial<LocalSong>) {
    setSongs((current) =>
      current.map((song) => (song.index === index ? { ...song, ...changes } : song))
    );
  }

  return (
    <form action={importLocalAudioAction} className="space-y-6">
      <input type="hidden" name="metadata" value={metadataJson(songs)} />

      <div className="grid gap-5 md:grid-cols-3">
        <label className="text-xs uppercase tracking-[0.22em] text-stone-500">
          Default artist
          <input
            name="artist"
            defaultValue="Halou"
            className="mt-2 w-full border-b border-stone-700 bg-transparent px-1 py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-300"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.22em] text-stone-500">
          Default album
          <input
            name="album"
            placeholder="Loose recordings"
            className="mt-2 w-full border-b border-stone-700 bg-transparent px-1 py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-300"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.22em] text-stone-500">
          Default year
          <input
            name="year"
            placeholder="2026"
            className="mt-2 w-full border-b border-stone-700 bg-transparent px-1 py-3 normal-case tracking-normal text-stone-100 outline-none focus:border-stone-300"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.22em] text-stone-500">
          Audio files
          <input
            name="audio_files"
            type="file"
            accept="audio/*"
            multiple
            onChange={(event) => inspectFiles(event.target.files)}
            className="mt-3 block w-full normal-case tracking-normal text-stone-400 file:mr-4 file:border file:border-stone-700 file:bg-transparent file:px-4 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300"
          />
        </label>

        <label className="text-xs uppercase tracking-[0.22em] text-stone-500">
          Shared cover image
          <input
            name="shared_cover"
            type="file"
            accept="image/*"
            className="mt-3 block w-full normal-case tracking-normal text-stone-400 file:mr-4 file:border file:border-stone-700 file:bg-transparent file:px-4 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300"
          />
        </label>
      </div>

      {readingFiles && <p className="text-sm text-stone-500">Reading audio tags...</p>}

      {songs.length > 0 && (
        <div className="space-y-3">
          {songs.map((song) => (
            <article
              key={`${song.index}-${song.fileName}`}
              className="grid gap-3 border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-[auto_1.3fr_1fr_1fr_5rem]"
            >
              <input
                type="checkbox"
                checked={song.selected}
                onChange={(event) =>
                  updateSong(song.index, { selected: event.target.checked })
                }
                aria-label={`Import ${song.title}`}
              />

              <div>
                <input
                  value={song.title}
                  onChange={(event) =>
                    updateSong(song.index, { title: event.target.value })
                  }
                  className="w-full border-b border-stone-800 bg-transparent py-1 text-stone-100 outline-none"
                />
                <p className="mt-2 truncate text-[10px] text-stone-700">
                  {song.fileName}
                </p>
              </div>

              <input
                value={song.album}
                onChange={(event) =>
                  updateSong(song.index, { album: event.target.value })
                }
                placeholder="Album"
                className="border-b border-stone-800 bg-transparent py-1 text-sm text-stone-300 outline-none"
              />

              <input
                value={song.artist}
                onChange={(event) =>
                  updateSong(song.index, { artist: event.target.value })
                }
                placeholder="Artist"
                className="border-b border-stone-800 bg-transparent py-1 text-sm text-stone-300 outline-none"
              />

              <input
                value={song.trackNumber}
                type="number"
                min={0}
                onChange={(event) =>
                  updateSong(song.index, {
                    trackNumber: Number(event.target.value),
                  })
                }
                aria-label={`Track number for ${song.title}`}
                className="border-b border-stone-800 bg-transparent py-1 text-sm text-stone-300 outline-none"
              />

              {song.hasEmbeddedArtwork && (
                <p className="md:col-start-2 md:col-span-4 text-[10px] uppercase tracking-[0.2em] text-stone-600">
                  Embedded artwork detected. Choose a shared cover above if you
                  want to upload it to Elsewhere.
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={songs.every((song) => !song.selected)}
        className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Import selected audio as drafts
      </button>

      <p className="max-w-2xl text-xs leading-5 text-stone-600">
        This reads common ID3 tags for the preview and falls back to filenames.
        Keep each upload batch below the current 25 MB Backroom limit.
      </p>
    </form>
  );
}
