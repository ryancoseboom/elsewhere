"use client";

import { useMemo, useState } from "react";
import { spotifyTrackUrl } from "@/lib/spotify";
import { importSpotifyLinksAction } from "./actions";

type SongOption = {
  album: string | null;
  id: string;
  spotifyUrl: string | null;
  title: string;
};

type SpotifyLink = {
  id: number;
  selected: boolean;
  songId: string;
  title: string;
  url: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^the\s+/, "")
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function guessSongId(title: string, songs: SongOption[]) {
  const matches = songs.filter((song) => normalize(song.title) === normalize(title));

  return matches.length === 1 ? matches[0].id : "";
}

function metadataJson(links: SpotifyLink[]) {
  return JSON.stringify(
    links
      .filter((link) => link.selected && link.songId && link.url)
      .map(({ songId, url }) => ({ songId, url }))
  );
}

export default function SpotifyLinksImportForm({
  songs,
}: {
  songs: SongOption[];
}) {
  const [rawLinks, setRawLinks] = useState("");
  const [links, setLinks] = useState<SpotifyLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const readyCount = useMemo(
    () => links.filter((link) => link.selected && link.songId).length,
    [links]
  );

  async function prepareLinks() {
    const urls = [
      ...new Set(
        rawLinks
          .split(/\s+/)
          .map(spotifyTrackUrl)
          .filter(Boolean)
      ),
    ];

    if (urls.length === 0) {
      setError("Paste at least one Spotify track link.");
      setLinks([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextLinks = await Promise.all(
        urls.map(async (url, id) => {
          const response = await fetch(
            `/api/spotify/oembed?url=${encodeURIComponent(url)}`
          );
          const data = (await response.json()) as {
            error?: string;
            title?: string;
          };

          if (!response.ok) throw new Error(data.error || "Spotify lookup failed.");

          const title = data.title || "Unknown Spotify track";

          return {
            id,
            selected: true,
            songId: guessSongId(title, songs),
            title,
            url,
          };
        })
      );

      setLinks(nextLinks);
    } catch (lookupError) {
      setLinks([]);
      setError(
        lookupError instanceof Error ? lookupError.message : "Spotify lookup failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateLink(id: number, changes: Partial<SpotifyLink>) {
    setLinks((current) =>
      current.map((link) => (link.id === id ? { ...link, ...changes } : link))
    );
  }

  return (
    <form action={importSpotifyLinksAction} className="space-y-6">
      <input type="hidden" name="metadata" value={metadataJson(links)} />

      <label className="block text-xs uppercase tracking-[0.22em] text-stone-500">
        Spotify track links
        <textarea
          value={rawLinks}
          onChange={(event) => setRawLinks(event.target.value)}
          rows={6}
          placeholder={"https://open.spotify.com/track/...\nhttps://open.spotify.com/track/..."}
          className="mt-3 w-full border border-stone-800 bg-transparent px-3 py-3 normal-case tracking-normal text-stone-300 outline-none focus:border-stone-500"
        />
      </label>

      <button
        type="button"
        onClick={prepareLinks}
        disabled={loading}
        className="border border-stone-700 px-5 py-3 text-xs uppercase tracking-[0.22em] text-stone-300 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Reading Spotify links..." : "Prepare links"}
      </button>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {links.length > 0 && (
        <div className="space-y-3">
          {links.map((link) => (
            <article
              key={link.url}
              className="grid gap-3 border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-[auto_1fr_1.2fr]"
            >
              <input
                type="checkbox"
                checked={link.selected}
                onChange={(event) =>
                  updateLink(link.id, { selected: event.target.checked })
                }
                aria-label={`Import ${link.title}`}
              />

              <div>
                <p className="text-sm text-stone-200">{link.title}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-[10px] text-stone-600 hover:text-stone-300"
                >
                  {link.url}
                </a>
              </div>

              <label className="text-[10px] uppercase tracking-[0.18em] text-stone-600">
                Match to song
                <select
                  value={link.songId}
                  onChange={(event) =>
                    updateLink(link.id, { songId: event.target.value })
                  }
                  className="mt-2 w-full border border-stone-800 bg-neutral-950 px-3 py-2 normal-case tracking-normal text-stone-300 outline-none focus:border-stone-500"
                >
                  <option value="">Choose a song</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                      {song.album ? ` / ${song.album}` : ""}
                      {song.spotifyUrl ? " / Spotify link already present" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <p className="text-xs uppercase tracking-[0.18em] text-stone-600">
          {readyCount} ready / {links.length} links
        </p>
      )}

      <button
        type="submit"
        disabled={readyCount === 0}
        className="border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Add Spotify links
      </button>
    </form>
  );
}
