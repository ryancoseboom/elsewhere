import Link from "next/link";
import type { CSSProperties } from "react";
import ArchiveBranch from "@/components/ArchiveBranch";
import { createPublicClient } from "@/lib/supabase/server";
import {
  artifactType,
  type ArchiveArtifact,
} from "@/lib/archive-navigation";
import { ARCHIVE_MAP_COLORS } from "@/lib/archive-map-colors";

const BAND_ORDER = ["halou", "stripmall architecture", "r/r coseboom"];
const ARTIFACT_PAGE_SIZE = 1000;
const EXPLORE_ARTIFACT_SELECT =
  "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, sort_order, year, album, atmosphere, motifs, image_url, fragment, description";
const LOOSE_SIGNAL_TYPE_ORDER = ["Album", "EP", "Single", "Song", "Band"];

function releaseDateNumber(artifact: ArchiveArtifact) {
  const match = artifact.year?.match(
    /(\d{4})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?/
  );

  if (!match) return 0;

  const year = Number(match[1]);
  const month = Number(match[2] || 12);
  const day = Number(match[3] || 31);

  return year * 10000 + month * 100 + day;
}

function isRelease(artifact: ArchiveArtifact) {
  return ["Album", "Single"].includes(artifactType(artifact));
}

function compareReleaseOrder(a: ArchiveArtifact, b: ArchiveArtifact) {
  const dateDifference = releaseDateNumber(b) - releaseDateNumber(a);

  if (dateDifference) return dateDifference;

  const sortDifference = (b.sort_order ?? 0) - (a.sort_order ?? 0);

  return sortDifference || a.title.localeCompare(b.title);
}

function compareTrackOrder(a: ArchiveArtifact, b: ArchiveArtifact) {
  const orderDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);

  return orderDifference || a.title.localeCompare(b.title);
}

function normalizedReference(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function referencesArtifact(
  value: string | null | undefined,
  artifact: ArchiveArtifact
) {
  const reference = normalizedReference(value);

  return (
    reference.length > 0 &&
    (reference === normalizedReference(artifact.slug) ||
      reference === normalizedReference(artifact.title))
  );
}

function isBandRelease(band: ArchiveArtifact, release: ArchiveArtifact) {
  return (
    release.band_id === band.id ||
    release.parent_id === band.id ||
    referencesArtifact(release.parent_slug, band)
  );
}

function isReleaseTrack(release: ArchiveArtifact, track: ArchiveArtifact) {
  return (
    track.album_id === release.id ||
    track.parent_id === release.id ||
    referencesArtifact(track.parent_slug, release) ||
    referencesArtifact(track.album, release)
  );
}

function releaseTrackStrength(release: ArchiveArtifact, track: ArchiveArtifact) {
  if (track.album_id === release.id) return 5;
  if (track.parent_id === release.id) return 4;
  if (referencesArtifact(track.parent_slug, release)) return 3;
  if (referencesArtifact(track.album, release)) return 2;
  return 0;
}

function compareReleaseTrackCandidate(
  release: ArchiveArtifact,
  left: ArchiveArtifact,
  right: ArchiveArtifact
) {
  const strengthDifference =
    releaseTrackStrength(release, right) - releaseTrackStrength(release, left);

  if (strengthDifference) return strengthDifference;

  return compareTrackOrder(left, right);
}

function uniqueReleaseTracks(
  release: ArchiveArtifact,
  tracks: ArchiveArtifact[]
) {
  const tracksByTitle = new Map<string, ArchiveArtifact>();

  tracks.forEach((track) => {
    const key = normalizedReference(track.title);
    const current = tracksByTitle.get(key);

    if (
      !current ||
      compareReleaseTrackCandidate(release, track, current) < 0
    ) {
      tracksByTitle.set(key, track);
    }
  });

  return [...tracksByTitle.values()].sort(compareTrackOrder);
}

function isDirectBandSong(
  band: ArchiveArtifact,
  artifact: ArchiveArtifact,
  releases: ArchiveArtifact[]
) {
  if (artifactType(artifact) !== "Song" || artifact.album_id) return false;
  if (releases.some((release) => isReleaseTrack(release, artifact))) return false;

  return (
    artifact.band_id === band.id ||
    artifact.parent_id === band.id ||
    referencesArtifact(artifact.parent_slug, band)
  );
}

function releaseType(release: ArchiveArtifact, trackCount: number) {
  if (trackCount >= 3 && trackCount <= 6) return "EP";
  return artifactType(release) === "Single" ? "Single" : "Album";
}

function releaseColor(type: "Album" | "Single" | "EP") {
  if (type === "Single") return ARCHIVE_MAP_COLORS.single;
  if (type === "EP") return ARCHIVE_MAP_COLORS.ep;
  return ARCHIVE_MAP_COLORS.album;
}

function releaseMeta(release: ArchiveArtifact, type: "Album" | "Single" | "EP") {
  const titleIncludesType = new RegExp(`\\b${type}$`, "i").test(
    release.title.trim()
  );

  return [titleIncludesType ? null : type, release.year]
    .filter(Boolean)
    .join(" / ");
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function looseSignalType(artifact: ArchiveArtifact) {
  if (isRelease(artifact)) return releaseType(artifact, 0);
  return artifactType(artifact);
}

function compareLooseSignalOrder(a: ArchiveArtifact, b: ArchiveArtifact) {
  const typeDifference =
    LOOSE_SIGNAL_TYPE_ORDER.indexOf(looseSignalType(a)) -
    LOOSE_SIGNAL_TYPE_ORDER.indexOf(looseSignalType(b));

  if (typeDifference) return typeDifference;

  return compareReleaseOrder(a, b);
}

function MapNode({
  artifact,
  accentColor = ARCHIVE_MAP_COLORS.root,
  meta,
  tone = "signal",
}: {
  artifact: ArchiveArtifact;
  accentColor?: string;
  meta?: string;
  tone?: "band" | "release" | "signal";
}) {
  const showThumbnail = tone === "release" && Boolean(artifact.image_url);

  return (
    <Link
      href={`/artifact/${artifact.slug}`}
      style={{ "--map-node-accent": accentColor } as CSSProperties}
      className={`group/node relative z-10 flex items-center gap-3 px-1 py-2 transition outline-none focus-visible:text-white ${
        tone === "band"
          ? "px-2 py-3"
          : tone === "release"
            ? "px-1"
            : "px-1"
      }`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-8 w-px -translate-y-1/2 bg-[var(--map-node-accent)] opacity-0 transition group-hover/node:opacity-70 group-focus-visible/node:opacity-90"
      />
      {showThumbnail && (
        <span className="hidden h-12 w-12 shrink-0 overflow-hidden border border-stone-800 bg-stone-950 opacity-65 transition group-hover/node:border-stone-600 group-hover/node:opacity-95 group-focus-visible/node:border-stone-600 group-focus-visible/node:opacity-95 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artifact.image_url || ""}
            alt=""
            className="h-full w-full object-cover grayscale transition duration-500 group-hover/node:grayscale-0 group-focus-visible/node:grayscale-0"
          />
        </span>
      )}
      <span className="min-w-0">
        <p
          className={`font-serif text-stone-300 transition group-hover/node:text-white group-focus-visible/node:text-white ${
            tone === "band" ? "text-2xl" : tone === "release" ? "text-lg" : "text-sm"
          }`}
        >
          {artifact.title}
        </p>
        {meta && (
          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-stone-600 transition group-hover/node:text-stone-400 group-focus-visible/node:text-stone-400">
            {meta}
          </p>
        )}
      </span>
    </Link>
  );
}

export default async function ExplorePage() {
  const supabase = createPublicClient();
  const data = [];
  let from = 0;

  while (true) {
    const { data: pageData, error } = await supabase
      .from("artifacts")
      .select(EXPLORE_ARTIFACT_SELECT)
      .eq("is_public", true)
      .eq("discovery_visibility", "public")
      .order("title", { ascending: true })
      .range(from, from + ARTIFACT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    data.push(...(pageData || []));

    if (!pageData || pageData.length < ARTIFACT_PAGE_SIZE) break;

    from += ARTIFACT_PAGE_SIZE;
  }

  const artifacts = (data || []).map((artifact) => ({
    ...artifact,
    kind: artifact.artifact_type || artifact.kind,
  })) as ArchiveArtifact[];
  const bands = artifacts
    .filter((artifact) => artifactType(artifact) === "Band")
    .sort((a, b) => {
      const indexA = BAND_ORDER.indexOf(a.title.toLowerCase());
      const indexB = BAND_ORDER.indexOf(b.title.toLowerCase());

      if (indexA === -1 && indexB === -1) return a.title.localeCompare(b.title);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  const destinationIds = new Set<string>();

  bands.forEach((band) => destinationIds.add(band.id));

  return (
    <main className="min-h-screen bg-[#090807] px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-[100rem]">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Link
              href="/"
              className="text-[10px] uppercase tracking-[0.34em] text-stone-600 transition hover:text-stone-300"
            >
              ← Elsewhere
            </Link>
            <p className="mt-12 text-[10px] uppercase tracking-[0.48em] text-stone-600">
              Release map / live catalog
            </p>
            <h1 className="mt-4 font-serif text-7xl text-stone-100 md:text-9xl">
              Explore
            </h1>
          </div>
          <div className="max-w-sm">
            <p className="text-xs leading-6 text-stone-600">
              Start with a band, then follow releases, songs, demos, photos,
              and loose pieces outward. The lines show what belongs together,
              not when it happened. If something is missing, did it even really
              happen at all?
            </p>
            <div
              aria-label="Explore map legend"
              className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.18em] text-stone-600"
            >
              {[
                ["Album", ARCHIVE_MAP_COLORS.album],
                ["EP", ARCHIVE_MAP_COLORS.ep],
                ["Single", ARCHIVE_MAP_COLORS.single],
                ["Song", ARCHIVE_MAP_COLORS.song],
              ].map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-14">
          <div className="mx-auto w-fit px-8 py-4 text-center">
            <p className="font-serif text-3xl text-stone-100">Elsewhere</p>
            <p className="mt-2 text-[9px] uppercase tracking-[0.28em] text-stone-500">
              All paths begin here
            </p>
          </div>
          <div
            className="mx-auto h-12 w-px opacity-80"
            style={{ backgroundColor: ARCHIVE_MAP_COLORS.root }}
          />
          <div
            className="mx-auto h-px w-[min(92%,72rem)] opacity-70"
            style={{ backgroundColor: ARCHIVE_MAP_COLORS.root }}
          />

          <div className="grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
          {bands.map((band) => {
            const releases = artifacts
              .filter(
                (artifact) =>
                  isRelease(artifact) && isBandRelease(band, artifact)
              )
              .sort(compareReleaseOrder);
            const directBandSongs = artifacts
              .filter((artifact) => isDirectBandSong(band, artifact, releases))
              .sort(compareReleaseOrder);
            const branchSongCount =
              directBandSongs.length +
              releases.reduce((count, release) => {
                const tracks = uniqueReleaseTracks(
                  release,
                  artifacts.filter(
                    (artifact) =>
                      artifactType(artifact) === "Song" &&
                      isReleaseTrack(release, artifact)
                  )
                );

                return count + tracks.length;
              }, 0);

            releases.forEach((release) => destinationIds.add(release.id));
            directBandSongs.forEach((song) => destinationIds.add(song.id));

            return (
              <section
                key={band.id}
                className="relative pt-8"
              >
                <div
                  className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 opacity-80"
                  style={{ backgroundColor: ARCHIVE_MAP_COLORS.root }}
                />
                <div className="mx-auto max-w-xs">
                  <MapNode
                    artifact={band}
                    accentColor={ARCHIVE_MAP_COLORS.purple}
                    meta={[
                      "Band",
                      countLabel(releases.length, "release"),
                      countLabel(branchSongCount, "song"),
                    ].join(" / ")}
                    tone="band"
                  />
                </div>
                <div
                  className="mx-auto h-8 w-px opacity-80"
                  style={{ backgroundColor: ARCHIVE_MAP_COLORS.purple }}
                />
                <div
                  className="space-y-5 border-l pl-6 sm:pl-12"
                  style={{ borderColor: ARCHIVE_MAP_COLORS.purple }}
                >
                  {releases.map((release) => {
                    const tracks = uniqueReleaseTracks(
                      release,
                      artifacts.filter(
                        (artifact) =>
                          artifactType(artifact) === "Song" &&
                          isReleaseTrack(release, artifact)
                      )
                    );
                    const type = releaseType(release, tracks.length);

                    tracks.forEach((track) => destinationIds.add(track.id));

                    return (
                      <div
                        key={release.id}
                        className="group/branch relative"
                      >
                        <ArchiveBranch
                          className="-left-6 top-0 h-12 w-6 opacity-65 transition-opacity group-focus-within/branch:opacity-100 group-hover/branch:opacity-100 sm:-left-12 sm:w-12"
                          color={releaseColor(type)}
                        />
                        <MapNode
                          artifact={release}
                          accentColor={releaseColor(type)}
                          meta={[
                            releaseMeta(release, type),
                            tracks.length > 0
                              ? countLabel(tracks.length, "song")
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                          tone="release"
                        />
                        {tracks.length > 0 && (
                          <div
                            className="relative ml-4 mt-2 grid gap-0.5 border-l pl-6 sm:ml-7 sm:pl-10"
                            style={{ borderColor: ARCHIVE_MAP_COLORS.song }}
                          >
                            {tracks.map((track) => (
                              <div key={track.id} className="group/branch relative">
                                <ArchiveBranch
                                  className="-left-6 top-0 h-10 w-6 opacity-45 transition-opacity group-focus-within/branch:opacity-90 group-hover/branch:opacity-90 sm:-left-10 sm:w-10"
                                  color={ARCHIVE_MAP_COLORS.song}
                                />
                                <MapNode
                                  artifact={track}
                                  accentColor={ARCHIVE_MAP_COLORS.song}
                                  meta="Song"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {directBandSongs.map((song) => (
                    <div key={song.id} className="group/branch relative">
                      <ArchiveBranch
                        className="-left-6 top-0 h-12 w-6 opacity-55 transition-opacity group-focus-within/branch:opacity-95 group-hover/branch:opacity-95 sm:-left-12 sm:w-12"
                        color={ARCHIVE_MAP_COLORS.single}
                      />
                      <MapNode
                        artifact={song}
                        accentColor={ARCHIVE_MAP_COLORS.single}
                        meta={[song.year, "Song"].filter(Boolean).join(" / ")}
                        tone="signal"
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          </div>
        </div>

        {(() => {
          const looseSignals = artifacts.filter(
            (artifact) =>
              ["Band", "Album", "Single", "Song"].includes(
                artifactType(artifact)
              ) && !destinationIds.has(artifact.id)
          ).sort(compareLooseSignalOrder);

          if (looseSignals.length === 0) return null;

          return (
            <section className="mt-16 border-t border-stone-800 pt-7">
              <p className="mb-5 text-[10px] uppercase tracking-[0.34em] text-stone-600">
                Loose records
              </p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {looseSignals.map((artifact) => (
                  <MapNode
                    key={artifact.id}
                    artifact={artifact}
                    meta={artifactType(artifact)}
                  />
                ))}
              </div>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
