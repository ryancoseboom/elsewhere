import Link from "next/link";
import {
  choosePreferredRelease,
  getCoverArtUrl,
  getMusicBrainzArtistReleaseGroups,
  getMusicBrainzRelease,
  getMusicBrainzTracks,
  searchMusicBrainzArtists,
} from "@/lib/musicbrainz";
import { getOfficialHalouLyrics } from "@/lib/halou-lyrics";
import { getAcousticBrainzMoodSuggestions } from "@/lib/acousticbrainz";
import { getCoverArtSuggestions } from "@/lib/cover-art";
import { createClient } from "@/lib/supabase/server";
import LocalAudioImportForm from "./LocalAudioImportForm";
import LocalLyricsImportForm from "./LocalLyricsImportForm";
import OnlineLyricsResearchForm from "./OnlineLyricsResearchForm";
import BulkSongTagsForm from "./BulkSongTagsForm";
import BulkArchiveMaterialsForm from "./BulkArchiveMaterialsForm";
import BulkArtifactTagsForm from "./BulkArtifactTagsForm";
import {
  importMusicBrainzCatalogAction,
  importMusicBrainzReleaseAction,
  importOfficialHalouLyricsAction,
  importReviewedAtmosphereAction,
  importReviewedCoverArtAction,
} from "./actions";

type SearchParams = Promise<{
  q?: string | string[];
  artist?: string | string[];
  release?: string | string[];
  imported?: string | string[];
  lyrics?: string | string[];
  moods?: string | string[];
  moodOffset?: string | string[];
  covers?: string | string[];
  coverOffset?: string | string[];
}>;

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatReleaseType(value?: string) {
  return value || "Release";
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = one(params.q) || "";
  const artistId = one(params.artist);
  const releaseId = one(params.release);
  const imported = one(params.imported);
  const lyricsMode = one(params.lyrics);
  const moodsMode = one(params.moods);
  const moodOffset = Math.max(Number(one(params.moodOffset) || 0), 0);
  const coversMode = one(params.covers);
  const coverOffset = Math.max(Number(one(params.coverOffset) || 0), 0);

  const artists = query && !artistId ? await searchMusicBrainzArtists(query) : [];
  const releaseGroups = artistId && !releaseId
    ? await getMusicBrainzArtistReleaseGroups(artistId)
    : [];
  const release = releaseId ? await getMusicBrainzRelease(releaseId) : null;
  const tracks = release ? getMusicBrainzTracks(release) : [];
  const supabase = await createClient();
  const { data: artifactData } = await supabase
    .from("artifacts")
    .select("id, title, artifact_type, kind")
    .order("title", { ascending: true });
  const artifactOptions = (artifactData || []).map((artifact) => ({
    id: artifact.id as string,
    title: artifact.title as string,
    artifactType: String(artifact.artifact_type || artifact.kind || "Other"),
  }));
  const { data: songData } = await supabase
    .from("artifacts")
    .select("id, slug, title, album, lyrics, atmosphere, motifs")
    .or("artifact_type.eq.Song,kind.eq.Song")
    .order("title", { ascending: true });
  const songs = (songData || []).map((song) => ({
    id: song.id as string,
    slug: song.slug as string,
    title: song.title as string,
    album: song.album as string | null,
    hasLyrics: Boolean(song.lyrics),
    atmosphere: (song.atmosphere || []) as string[],
    motifs: (song.motifs || []) as string[],
  }));
  const missingLyricsSongs = songs.filter((song) => !song.hasLyrics);
  const moodBatchSize = 8;
  const moodSongs = songs.slice(moodOffset, moodOffset + moodBatchSize);
  const moodSuggestions =
    moodsMode === "acousticbrainz"
      ? await getAcousticBrainzMoodSuggestions(moodSongs)
      : [];
  const { data: bandData } = await supabase
    .from("artifacts")
    .select("id, title")
    .or("artifact_type.eq.Band,kind.eq.Band");
  const bandTitles = new Map(
    (bandData || []).map((band) => [band.id as string, band.title as string])
  );
  const { data: missingAlbumData } = await supabase
    .from("artifacts")
    .select("id, title, year, band_id, parent_id")
    .or("artifact_type.eq.Album,kind.eq.Album")
    .or("image_url.is.null,image_url.eq.")
    .order("title", { ascending: true });
  const missingAlbums = (missingAlbumData || []).map((album) => ({
    id: album.id as string,
    title: album.title as string,
    year: album.year as string | null,
    artistName:
      bandTitles.get((album.band_id || album.parent_id) as string) || "Halou",
  }));
  const coverBatchSize = 6;
  const coverAlbums = missingAlbums.slice(
    coverOffset,
    coverOffset + coverBatchSize
  );
  const coverSuggestions =
    coversMode === "musicbrainz"
      ? await getCoverArtSuggestions(coverAlbums)
      : [];
  const officialLyrics =
    lyricsMode === "official" ? await getOfficialHalouLyrics() : [];
  const officialLyricsByTitle = new Map(
    officialLyrics.map((entry) => [
      entry.title
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/^the\s+/, "")
        .replace(/['"]/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      entry,
    ])
  );
  const officialMatches = songs
    .map((song) => ({
      ...song,
      entry: officialLyricsByTitle.get(
        song.title
          .toLowerCase()
          .replace(/[’‘]/g, "'")
          .replace(/^the\s+/, "")
          .replace(/['"]/g, "")
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      ),
    }))
    .filter((song) => song.entry);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </Link>

        <header className="mb-12 mt-12">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Catalog intake
          </p>
          <h1 className="mt-4 font-serif text-4xl text-stone-100 md:text-6xl">
            Bring in the known things.
          </h1>
          <p className="mt-6 max-w-2xl leading-relaxed text-stone-400">
            Start with factual catalog data, review what arrives, then add the
            fragments and atmosphere that belong only to Elsewhere.
          </p>
        </header>

        {imported && (
          <p className="mb-8 border border-emerald-950 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-300">
            {imported}
          </p>
        )}

        <section className="border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            MusicBrainz catalog
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Search for a band, select the matching artist, then import a whole
            catalog or inspect one release before bringing it in.
          </p>

          <form className="mt-6 flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={query || "Halou"}
              className="min-w-64 flex-1 border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              placeholder="Halou"
            />
            <button className="border border-stone-700 px-5 py-3 text-xs uppercase tracking-[0.22em] text-stone-300 hover:border-stone-400">
              Search catalog
            </button>
          </form>

          {artists.length > 0 && (
            <div className="mt-8 space-y-2">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/backroom/import?q=${encodeURIComponent(
                    query
                  )}&artist=${artist.id}`}
                  className="block border border-stone-900 px-4 py-3 text-stone-300 transition hover:border-stone-600"
                >
                  <span>{artist.name}</span>
                  {(artist.disambiguation || artist.country) && (
                    <span className="ml-3 text-xs text-stone-600">
                      {[artist.disambiguation, artist.country]
                        .filter(Boolean)
                        .join(" / ")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {artistId && releaseGroups.length > 0 && (
            <form action={importMusicBrainzCatalogAction} className="mt-8">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                    Release groups
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    One preferred edition is selected for each album, EP, or single.
                  </p>
                </div>
                <button className="border border-stone-600 px-5 py-3 text-xs uppercase tracking-[0.22em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950">
                  Import selected catalog
                </button>
              </div>

              <label className="mb-5 flex items-center gap-3 text-sm text-stone-400">
                <input
                  type="checkbox"
                  name="include_cover"
                  value="yes"
                  defaultChecked
                />
                Add available Cover Art Archive images and artwork artifacts
              </label>

              <div className="space-y-2">
                {releaseGroups.map((group) => {
                  const preferred = choosePreferredRelease(group);

                  if (!preferred) return null;

                  return (
                    <article
                      key={group.id}
                      className="flex flex-col gap-3 border border-stone-900 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="release_ids"
                          value={preferred.id}
                          defaultChecked
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-stone-200">{group.title}</span>
                          <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-stone-600">
                            {formatReleaseType(group["primary-type"])} /{" "}
                            {group["first-release-date"] || preferred.date || "date unknown"}
                          </span>
                        </span>
                      </label>

                      <Link
                        href={`/backroom/import?q=${encodeURIComponent(
                          query
                        )}&artist=${artistId}&release=${preferred.id}`}
                        className="text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-200"
                      >
                        Review tracks
                      </Link>
                    </article>
                  );
                })}
              </div>
            </form>
          )}

          {artistId && !releaseId && releaseGroups.length === 0 && (
            <p className="mt-8 text-sm text-stone-600">
              MusicBrainz did not return any release groups for this artist.
            </p>
          )}
        </section>

        {release && (
          <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
              Release review
            </p>
            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-serif text-3xl text-stone-100">
                  {release.title}
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  {release.date || "Date unknown"} / {tracks.length} tracks
                </p>
              </div>

              {release["cover-art-archive"]?.front && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getCoverArtUrl(release.id)}
                  alt={`${release.title} cover`}
                  className="h-36 w-36 border border-stone-800 object-cover"
                />
              )}
            </div>

            <form action={importMusicBrainzReleaseAction} className="mt-6">
              <input type="hidden" name="release_id" value={release.id} />

              {release["cover-art-archive"]?.front && (
                <label className="mb-5 flex items-center gap-3 text-sm text-stone-400">
                  <input
                    type="checkbox"
                    name="include_cover"
                    value="yes"
                    defaultChecked
                  />
                  Add the Cover Art Archive image and artwork artifact
                </label>
              )}

              <div className="space-y-2">
                {tracks.map((track) => (
                  <label
                    key={track.id}
                    className="flex items-center gap-3 border border-stone-900 px-4 py-3 text-sm text-stone-300"
                  >
                    <input
                      type="checkbox"
                      name="track_ids"
                      value={track.id}
                      defaultChecked
                    />
                    <span className="w-10 text-stone-700">{track.number}</span>
                    <span>{track.recording.title || track.title}</span>
                  </label>
                ))}
              </div>

              <button className="mt-6 border border-stone-600 px-5 py-3 text-xs uppercase tracking-[0.22em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950">
                Import reviewed release
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Missing cover art
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Find missing album covers through MusicBrainz and the Cover Art
            Archive. Review each image before adding it to the album, with an
            option to reuse that cover for songs that still have no image. The
            lookup includes Halou, Stripmall Architecture, and R/R Coseboom
            releases.
          </p>

          {coversMode !== "musicbrainz" ? (
            <Link
              href="/backroom/import?covers=musicbrainz"
              className="mt-6 inline-flex border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950"
            >
              Review missing album covers
            </Link>
          ) : (
            <form action={importReviewedCoverArtAction} className="mt-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-stone-600">
                <span>
                  Albums {coverOffset + 1}-
                  {Math.min(coverOffset + coverBatchSize, missingAlbums.length)}{" "}
                  of {missingAlbums.length}
                </span>

                <div className="flex gap-4">
                  {coverOffset > 0 && (
                    <Link
                      href={`/backroom/import?covers=musicbrainz&coverOffset=${Math.max(
                        coverOffset - coverBatchSize,
                        0
                      )}`}
                      className="hover:text-stone-300"
                    >
                      Previous batch
                    </Link>
                  )}
                  {coverOffset + coverBatchSize < missingAlbums.length && (
                    <Link
                      href={`/backroom/import?covers=musicbrainz&coverOffset=${
                        coverOffset + coverBatchSize
                      }`}
                      className="hover:text-stone-300"
                    >
                      Next batch
                    </Link>
                  )}
                </div>
              </div>

              <label className="mb-5 flex items-center gap-3 text-sm text-stone-400">
                <input
                  type="checkbox"
                  name="copy_to_songs"
                  value="yes"
                  defaultChecked
                />
                Use approved album covers for child songs that still have no image
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                {coverSuggestions.map((suggestion) => (
                  <article
                    key={suggestion.albumId}
                    className="border border-stone-900 p-4"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="album_ids"
                        value={suggestion.albumId}
                        defaultChecked
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-stone-200">
                          {suggestion.albumTitle}
                        </span>
                        <span className="mt-1 block text-xs text-stone-600">
                          {suggestion.artistName} / {suggestion.releaseTitle} /{" "}
                          {suggestion.releaseDate}
                        </span>
                      </span>
                    </label>

                    <input
                      type="hidden"
                      name={`image_url_${suggestion.albumId}`}
                      value={suggestion.imageUrl}
                    />
                    <input
                      type="hidden"
                      name={`release_id_${suggestion.albumId}`}
                      value={suggestion.releaseId}
                    />

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={suggestion.imageUrl}
                      alt={`${suggestion.albumTitle} suggested cover`}
                      className="mt-4 aspect-square w-full border border-stone-800 object-cover"
                    />
                  </article>
                ))}
              </div>

              {coverSuggestions.length > 0 ? (
                <button className="mt-6 border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950">
                  Add selected cover art
                </button>
              ) : (
                <p className="mt-6 text-sm text-stone-600">
                  Cover Art Archive did not return suggestions for this batch.
                </p>
              )}
            </form>
          )}
        </section>

        <section
          id="archive-materials"
          className="mt-8 border border-stone-800 bg-stone-950/60 p-6"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Bulk archive materials
          </p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-6 text-stone-500">
            Attach a batch of images, demos, and videos to one song, album, or
            other parent artifact. Review the inferred titles and types before
            creating linked draft records for the scrapbook pages.
          </p>
          <BulkArchiveMaterialsForm artifacts={artifactOptions} />
        </section>

        <section
          id="artifact-tags"
          className="mt-8 border border-stone-800 bg-stone-950/60 p-6"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Bulk artifact tags
          </p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-6 text-stone-500">
            Add shared atmosphere, motif, or room tags across any filtered
            group of artifacts. Existing tags are preserved.
          </p>
          <BulkArtifactTagsForm artifacts={artifactOptions} />
        </section>

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Bulk song tags
          </p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-6 text-stone-500">
            Filter and select songs, then merge a shared set of atmosphere or
            motif tags into their existing records. Separate tags with commas
            or line breaks.
          </p>
          <BulkSongTagsForm songs={songs} />
        </section>

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Atmosphere suggestions
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Pull machine-classified mood suggestions from AcousticBrainz in
            small batches. Review each tag before merging it into the existing
            atmosphere field.
          </p>

          {moodsMode !== "acousticbrainz" ? (
            <Link
              href="/backroom/import?moods=acousticbrainz"
              className="mt-6 inline-flex border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950"
            >
              Review atmosphere suggestions
            </Link>
          ) : (
            <form action={importReviewedAtmosphereAction} className="mt-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-stone-600">
                <span>
                  Songs {moodOffset + 1}-
                  {Math.min(moodOffset + moodBatchSize, songs.length)} of{" "}
                  {songs.length}
                </span>

                <div className="flex gap-4">
                  {moodOffset > 0 && (
                    <Link
                      href={`/backroom/import?moods=acousticbrainz&moodOffset=${Math.max(
                        moodOffset - moodBatchSize,
                        0
                      )}`}
                      className="hover:text-stone-300"
                    >
                      Previous batch
                    </Link>
                  )}
                  {moodOffset + moodBatchSize < songs.length && (
                    <Link
                      href={`/backroom/import?moods=acousticbrainz&moodOffset=${
                        moodOffset + moodBatchSize
                      }`}
                      className="hover:text-stone-300"
                    >
                      Next batch
                    </Link>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {moodSuggestions.map((suggestion) => (
                  <article
                    key={suggestion.songId}
                    className="border border-stone-900 p-4"
                  >
                    <label className="flex items-center gap-3 text-sm text-stone-200">
                      <input
                        type="checkbox"
                        name="song_ids"
                        value={suggestion.songId}
                        defaultChecked
                      />
                      {suggestion.songTitle}
                    </label>

                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-stone-700">
                      Matched recording: {suggestion.recordingTitle}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {suggestion.tags.map((tag) => (
                        <label
                          key={tag.name}
                          className="flex items-center gap-2 border border-stone-800 px-3 py-2 text-xs text-stone-400"
                        >
                          <input
                            type="checkbox"
                            name={`atmosphere_${suggestion.songId}`}
                            value={tag.name}
                            defaultChecked
                          />
                          {tag.name} / {Math.round(tag.probability * 100)}%
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              {moodSuggestions.length > 0 ? (
                <button className="mt-6 border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950">
                  Add selected atmosphere tags
                </button>
              ) : (
                <p className="mt-6 text-sm text-stone-600">
                  AcousticBrainz did not return mood suggestions for this batch.
                </p>
              )}
            </form>
          )}
        </section>

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Official Halou lyrics
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Pull lyric text from the official Halou discography pages, match it
            to existing songs, and review the proposed updates before writing
            anything to the archive.
          </p>

          {lyricsMode !== "official" ? (
            <Link
              href="/backroom/import?lyrics=official"
              className="mt-6 inline-flex border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950"
            >
              Review official lyrics
            </Link>
          ) : (
            <form action={importOfficialHalouLyricsAction} className="mt-6">
              <div className="space-y-2">
                {officialMatches.map((song) => (
                  <label
                    key={song.id}
                    className="flex items-center justify-between gap-4 border border-stone-900 px-4 py-3 text-sm text-stone-300"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="song_ids"
                        value={song.id}
                        defaultChecked={!song.hasLyrics}
                      />
                      <span>{song.title}</span>
                    </span>
                    <span className="text-xs text-stone-700">
                      {song.hasLyrics ? "lyrics already present" : "ready to import"}
                    </span>
                  </label>
                ))}
              </div>

              {officialMatches.length > 0 ? (
                <button className="mt-6 border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950">
                  Import selected official lyrics
                </button>
              ) : (
                <p className="mt-6 text-sm text-stone-600">
                  No official lyric pages matched the current song artifacts.
                  Import the catalog first, then review this section again.
                </p>
              )}
            </form>
          )}
        </section>

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Local recordings
          </p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-6 text-stone-500">
            Use audio files for unreleased songs, demos, and catalog gaps. The
            preview reads common ID3 title, artist, album, year, and track tags
            before anything is uploaded.
          </p>
          <LocalAudioImportForm />
        </section>

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Lyrics files
          </p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-6 text-stone-500">
            Add lyric text that you own or have permission to use. Choose a
            batch of .txt or .lrc files, review the filename matches, then write
            them into the existing song artifacts.
          </p>
          <LocalLyricsImportForm songs={songs} />
        </section>

        <section className="mt-8 border border-stone-800 bg-stone-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Missing lyrics research
          </p>
          <p className="mt-3 mb-6 max-w-2xl text-sm leading-6 text-stone-500">
            Work through songs that still need lyrics. Each row opens useful
            search pages in a new tab, keeps the source URL with the artifact,
            and lets you submit many authorized additions together.
          </p>
          <OnlineLyricsResearchForm songs={missingLyricsSongs} />
        </section>
      </div>
    </main>
  );
}
