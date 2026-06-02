import Link from "next/link";
import ArchiveBranch from "@/components/ArchiveBranch";
import { createClient } from "@/lib/supabase/server";
import {
  artifactType,
  type ArchiveArtifact,
} from "@/lib/archive-navigation";
import { ARCHIVE_MAP_COLORS } from "@/lib/archive-map-colors";

const BAND_ORDER = ["halou", "stripmall architecture", "r/r coseboom"];

function yearNumber(artifact: ArchiveArtifact) {
  return Number(artifact.year?.match(/\d{4}/)?.[0] || 0);
}

function isRelease(artifact: ArchiveArtifact) {
  return ["Album", "Single"].includes(artifactType(artifact));
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

function MapNode({
  artifact,
  meta,
  tone = "signal",
}: {
  artifact: ArchiveArtifact;
  meta?: string;
  tone?: "band" | "release" | "signal";
}) {
  return (
    <Link
      href={`/artifact/${artifact.slug}`}
      className={`group relative z-10 block px-1 py-2 transition ${
        tone === "band"
          ? "px-2 py-3"
          : tone === "release"
            ? "px-1"
            : "px-1"
      }`}
    >
      <p
        className={`font-serif text-stone-300 transition group-hover:text-white ${
          tone === "band" ? "text-2xl" : tone === "release" ? "text-lg" : "text-sm"
        }`}
      >
        {artifact.title}
      </p>
      {meta && (
        <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-stone-600 transition group-hover:text-stone-400">
          {meta}
        </p>
      )}
    </Link>
  );
}

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, year, atmosphere, motifs, image_url, fragment, description"
    )
    .eq("is_public", true);

  if (error) throw new Error(error.message);

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
              Archive topology / live map
            </p>
            <h1 className="mt-4 font-serif text-7xl text-stone-100 md:text-9xl">
              Explore
            </h1>
          </div>
          <div className="max-w-sm">
            <p className="text-xs leading-6 text-stone-600">
              Follow the visible structure. Every labeled junction is a
              destination. Lines indicate containment, not chronology.
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
              Archive root
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
                  isRelease(artifact) &&
                  (artifact.band_id === band.id ||
                    artifact.parent_id === band.id ||
                    artifact.parent_slug === band.slug)
              )
              .sort((a, b) => yearNumber(b) - yearNumber(a));

            releases.forEach((release) => destinationIds.add(release.id));

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
                  <MapNode artifact={band} meta="Band / origin" tone="band" />
                </div>
                <div
                  className="mx-auto h-8 w-px opacity-80"
                  style={{ backgroundColor: ARCHIVE_MAP_COLORS.purple }}
                />
                <div
                  className="space-y-4 border-l pl-12"
                  style={{ borderColor: ARCHIVE_MAP_COLORS.purple }}
                >
                  {releases.map((release) => {
                    const tracks = artifacts
                      .filter(
                        (artifact) =>
                          artifactType(artifact) === "Song" &&
                          (artifact.album_id === release.id ||
                            artifact.parent_id === release.id)
                      )
                      .sort((a, b) => a.title.localeCompare(b.title));
                    const type = releaseType(release, tracks.length);

                    tracks.forEach((track) => destinationIds.add(track.id));

                    return (
                      <div
                        key={release.id}
                        className="relative"
                      >
                        <ArchiveBranch
                          className="-left-12 top-0 h-12 w-12"
                          color={releaseColor(type)}
                        />
                        <MapNode
                          artifact={release}
                          meta={releaseMeta(release, type)}
                          tone="release"
                        />
                        {tracks.length > 0 && (
                          <div
                            className="relative ml-7 mt-1 grid gap-1 border-l pl-10"
                            style={{ borderColor: ARCHIVE_MAP_COLORS.song }}
                          >
                            {tracks.map((track) => (
                              <div key={track.id} className="relative">
                                <ArchiveBranch
                                  className="-left-10 top-0 h-10 w-10"
                                  color={ARCHIVE_MAP_COLORS.song}
                                />
                                <MapNode artifact={track} meta="Song" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
          );

          if (looseSignals.length === 0) return null;

          return (
            <section className="mt-16 border-t border-stone-800 pt-7">
              <p className="mb-5 text-[10px] uppercase tracking-[0.34em] text-stone-600">
                Signals without a fixed branch
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
