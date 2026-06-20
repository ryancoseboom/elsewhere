import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { spotifyUrl } from "@/lib/spotify";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  parent_id: string | null;
  band_id: string | null;
  album_id: string | null;
  song_id: string | null;
  sort_order: number | null;
  kind: string | null;
  artifact_type: string | null;
  image_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  album: string | null;
  is_public: boolean | null;
  discovery_visibility: string | null;
};

type BackroomSearchParams = Promise<{
  access?: string | string[];
  saved?: string | string[];
  q?: string | string[];
}>;

const QUEUE_LIMIT = 30;
const ARTIFACT_PAGE_SIZE = 1000;
const BACKROOM_ARTIFACT_SELECT =
  "id, slug, title, parent_slug, parent_id, band_id, album_id, song_id, sort_order, kind, artifact_type, image_url, audio_url, video_url, youtube_url, spotify_url, album, is_public, discovery_visibility";

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function artifactType(artifact: Artifact) {
  return artifact.artifact_type || artifact.kind || "";
}

function filled(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function compareArtifacts(left: Artifact, right: Artifact) {
  const leftOrder = left.sort_order ?? 0;
  const rightOrder = right.sort_order ?? 0;

  if (leftOrder !== rightOrder) return leftOrder - rightOrder;

  return left.title.localeCompare(right.title);
}

function hasRelationship(artifact: Artifact) {
  return Boolean(
    artifact.parent_id ||
      artifact.parent_slug ||
      artifact.band_id ||
      artifact.album_id ||
      artifact.song_id
  );
}

function getAttachmentParentId(
  artifact: Artifact,
  artifactIds: Set<string>,
  artifactIdBySlug: Map<string, string>
) {
  if (artifact.parent_id || artifact.parent_slug) {
    if (artifact.parent_id && artifactIds.has(artifact.parent_id)) {
      return artifact.parent_id;
    }

    if (artifact.parent_slug) {
      return artifactIdBySlug.get(artifact.parent_slug) || "";
    }

    return "";
  }

  if (artifact.song_id && artifactIds.has(artifact.song_id)) {
    return artifact.song_id;
  }

  if (artifact.album_id && artifactIds.has(artifact.album_id)) {
    return artifact.album_id;
  }

  if (artifact.band_id && artifactIds.has(artifact.band_id)) {
    return artifact.band_id;
  }

  return "";
}

function relationshipLabel(artifact: Artifact) {
  return [
    artifact.parent_slug ? `parent slug ${artifact.parent_slug}` : "",
    artifact.parent_id ? `parent ${artifact.parent_id}` : "",
    artifact.song_id ? `song ${artifact.song_id}` : "",
    artifact.album_id ? `album ${artifact.album_id}` : "",
    artifact.band_id ? `band ${artifact.band_id}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function normalizeSearchText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchableArtifactText(artifact: Artifact) {
  return normalizeSearchText(
    [
      artifact.title,
      artifact.slug,
      artifact.album,
      artifact.parent_slug,
      artifactType(artifact),
      artifact.discovery_visibility,
      relationshipLabel(artifact),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function searchScore(artifact: Artifact, query: string) {
  if (!query) return 0;

  const title = normalizeSearchText(artifact.title);
  const slug = normalizeSearchText(artifact.slug);
  const album = normalizeSearchText(artifact.album);
  const type = normalizeSearchText(artifactType(artifact));
  const haystack = searchableArtifactText(artifact);

  if (title === query || slug === query) return 100;
  if (title.startsWith(query) || slug.startsWith(query)) return 80;
  if (album === query) return 70;
  if (album.startsWith(query)) return 60;
  if (haystack.includes(query)) return 40;

  const terms = query.split(" ").filter(Boolean);
  if (terms.length > 1 && terms.every((term) => haystack.includes(term))) {
    return type === "song" ? 35 : 30;
  }

  return 0;
}

function visibilityLabel(artifact: Artifact) {
  if (artifact.is_public === false) return "Not public";
  return artifact.discovery_visibility || "Public";
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
  artifact: Artifact
) {
  const reference = normalizedReference(value);

  return (
    reference.length > 0 &&
    (reference === normalizedReference(artifact.slug) ||
      reference === normalizedReference(artifact.title))
  );
}

function isRelease(artifact: Artifact) {
  return ["Album", "Single"].includes(artifactType(artifact));
}

function isBandRelease(band: Artifact, release: Artifact) {
  return (
    isRelease(release) &&
    (release.band_id === band.id ||
      release.parent_id === band.id ||
      referencesArtifact(release.parent_slug, band))
  );
}

function isReleaseTrack(release: Artifact, track: Artifact) {
  return (
    artifactType(track) === "Song" &&
    (track.album_id === release.id ||
      track.parent_id === release.id ||
      referencesArtifact(track.parent_slug, release) ||
      referencesArtifact(track.album, release))
  );
}

function isDirectBandSong(
  band: Artifact,
  artifact: Artifact,
  releases: Artifact[]
) {
  if (artifactType(artifact) !== "Song" || artifact.album_id) return false;
  if (releases.some((release) => isReleaseTrack(release, artifact))) return false;

  return (
    artifact.band_id === band.id ||
    artifact.parent_id === band.id ||
    referencesArtifact(artifact.parent_slug, band)
  );
}

function releaseTrackStrength(release: Artifact, track: Artifact) {
  if (track.album_id === release.id) return 5;
  if (track.parent_id === release.id) return 4;
  if (referencesArtifact(track.parent_slug, release)) return 3;
  if (referencesArtifact(track.album, release)) return 2;
  return 0;
}

function compareReleaseTrackCandidate(
  release: Artifact,
  left: Artifact,
  right: Artifact
) {
  const strengthDifference =
    releaseTrackStrength(release, right) - releaseTrackStrength(release, left);

  if (strengthDifference) return strengthDifference;

  return compareArtifacts(left, right);
}

function uniqueReleaseTracks(release: Artifact, tracks: Artifact[]) {
  const tracksByTitle = new Map<string, Artifact>();

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

  return [...tracksByTitle.values()].sort(compareArtifacts);
}

function directMaterialKinds(
  artifact: Artifact,
  artifactIdsWithLyrics: Set<string>
) {
  return [
    filled(artifact.image_url) ? "image" : "",
    artifactIdsWithLyrics.has(artifact.id) ? "lyrics" : "",
    filled(artifact.video_url) || filled(artifact.youtube_url) ? "video" : "",
    filled(artifact.audio_url) ? "audio" : "",
    filled(artifact.spotify_url) ? "spotify" : "",
  ].filter(Boolean);
}

function childMaterialKind(
  artifact: Artifact,
  artifactIdsWithLyrics: Set<string>
) {
  const type = artifactType(artifact);

  if (
    filled(artifact.image_url) ||
    ["Artwork", "Design", "Photo"].includes(type)
  ) {
    return "image";
  }

  if (
    filled(artifact.video_url) ||
    filled(artifact.youtube_url) ||
    type === "Video"
  ) {
    return "video";
  }

  if (filled(artifact.audio_url) || type === "Demo") {
    return "audio";
  }

  if (
    artifactIdsWithLyrics.has(artifact.id) ||
    type === "Text" ||
    type === "Document"
  ) {
    return "lyrics";
  }

  return "";
}

function hasAnyMaterial(
  artifact: Artifact,
  children: Artifact[],
  artifactIdsWithLyrics: Set<string>
) {
  if (directMaterialKinds(artifact, artifactIdsWithLyrics).length > 0) {
    return true;
  }

  return children.some((child) =>
    Boolean(childMaterialKind(child, artifactIdsWithLyrics))
  );
}

function StatusCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="border border-stone-800 bg-stone-950/60 p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-stone-600">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl text-stone-100">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-600">{detail}</p>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex border border-stone-700 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-stone-300 transition hover:border-stone-300 hover:text-stone-100"
    >
      {children}
    </Link>
  );
}

function materialBadgeClass(kind: string) {
  if (kind === "audio") return "border-sky-950 bg-sky-950/20 text-sky-500";
  if (kind === "lyrics") return "border-amber-950 bg-amber-950/20 text-amber-500";
  if (kind === "video") return "border-fuchsia-950 bg-fuchsia-950/20 text-fuchsia-500";
  if (kind === "image") return "border-emerald-950 bg-emerald-950/20 text-emerald-500";
  if (kind === "spotify") return "border-green-950 bg-green-950/20 text-green-500";
  return "border-stone-800 bg-neutral-950 text-stone-500";
}

function EditLinks({ artifact }: { artifact: Artifact }) {
  return (
    <div className="flex gap-3">
      <Link
        href={`/artifact/${artifact.slug}`}
        className="text-[10px] uppercase tracking-[0.2em] text-stone-600 hover:text-stone-200"
      >
        Visit
      </Link>
      <Link
        href={`/backroom/artifacts/${artifact.slug}/edit`}
        className="text-[10px] uppercase tracking-[0.2em] text-stone-600 hover:text-stone-200"
      >
        Edit
      </Link>
    </div>
  );
}

function CatalogRow({
  artifact,
  artifactIdsWithLyrics,
  depth = 0,
}: {
  artifact: Artifact;
  artifactIdsWithLyrics: Set<string>;
  depth?: number;
}) {
  const type = artifactType(artifact) || "Unclassified";
  const materialKinds = directMaterialKinds(artifact, artifactIdsWithLyrics);
  const isSong = type === "Song";

  return (
    <div
      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ paddingLeft: `${depth * 1.1}rem` }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-stone-200">{artifact.title}</p>
        <p className="mt-1 truncate text-xs text-stone-700">
          {artifact.album ||
            artifact.parent_slug ||
            relationshipLabel(artifact) ||
            artifact.slug}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="border border-stone-800 bg-neutral-950 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-stone-500">
            {type}
          </span>
          <span className="border border-stone-800 bg-neutral-950 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-stone-500">
            {visibilityLabel(artifact)}
          </span>
          {materialKinds.map((kind) => (
            <span
              key={kind}
              className={`border px-2 py-1 text-[9px] uppercase tracking-[0.18em] ${materialBadgeClass(kind)}`}
            >
              {kind}
            </span>
          ))}
          {isSong && !artifactIdsWithLyrics.has(artifact.id) && (
            <span className="border border-amber-950 bg-amber-950/20 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-amber-500">
              Lyrics missing
            </span>
          )}
          {isSong && !filled(artifact.spotify_url) && (
            <span className="border border-sky-950 bg-sky-950/20 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-sky-500">
              Spotify missing
            </span>
          )}
        </div>
      </div>
      <EditLinks artifact={artifact} />
    </div>
  );
}

function CatalogGroup({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count?: number;
  title: string;
}) {
  return (
    <section className="border-t border-stone-900 pt-5">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h3 className="font-serif text-xl text-stone-200">{title}</h3>
        {typeof count === "number" && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-700">
            {count}
          </span>
        )}
      </div>
      <div className="divide-y divide-stone-900">{children}</div>
    </section>
  );
}

async function saveBackroomSpotifyLink(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "song").trim();
  const url = spotifyUrl(String(formData.get("spotify_url") || ""));

  if (!id) throw new Error("Missing song id.");
  if (!url) throw new Error("Paste a valid open.spotify.com link.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("artifacts")
    .update({ spotify_url: url })
    .eq("id", id)
    .or("artifact_type.eq.Song,kind.eq.Song");

  if (error) throw new Error(error.message);

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(`/backroom?saved=${encodeURIComponent(`${title} Spotify`)}`);
}

async function saveBackroomLyrics(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "song").trim();
  const lyrics = String(formData.get("lyrics") || "").trim();

  if (!id) throw new Error("Missing song id.");
  if (!lyrics) throw new Error("Paste lyrics before saving.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("artifacts")
    .update({ lyrics })
    .eq("id", id)
    .or("artifact_type.eq.Song,kind.eq.Song");

  if (error) throw new Error(error.message);

  revalidatePath("/backroom");
  revalidatePath("/artifact/[slug]", "page");
  redirect(`/backroom?saved=${encodeURIComponent(`${title} lyrics`)}`);
}

export default async function BackroomPage({
  searchParams,
}: {
  searchParams: BackroomSearchParams;
}) {
  const params = await searchParams;
  const accessAccepted = one(params.access) === "accepted";
  const savedArtifact = one(params.saved);
  const searchQuery = normalizeSearchText(one(params.q));
  const supabase = await createClient();
  const artifactPages: Artifact[] = [];
  const lyricPages: { id: string }[] = [];
  let artifactPageStart = 0;

  while (true) {
    const { data: pageData, error } = await supabase
      .from("artifacts")
      .select(BACKROOM_ARTIFACT_SELECT)
      .order("title", { ascending: true })
      .range(artifactPageStart, artifactPageStart + ARTIFACT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    artifactPages.push(...((pageData || []) as Artifact[]));

    if (!pageData || pageData.length < ARTIFACT_PAGE_SIZE) break;

    artifactPageStart += ARTIFACT_PAGE_SIZE;
  }

  let lyricPageStart = 0;

  while (true) {
    const { data: pageData, error } = await supabase
      .from("artifacts")
      .select("id")
      .not("lyrics", "is", null)
      .neq("lyrics", "")
      .order("title", { ascending: true })
      .range(lyricPageStart, lyricPageStart + ARTIFACT_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    lyricPages.push(...((pageData || []) as { id: string }[]));

    if (!pageData || pageData.length < ARTIFACT_PAGE_SIZE) break;

    lyricPageStart += ARTIFACT_PAGE_SIZE;
  }

  const artifacts = artifactPages;
  const artifactIdsWithLyrics = new Set(
    lyricPages.map((artifact) => artifact.id)
  );
  const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
  const artifactIdBySlug = new Map(
    artifacts.map((artifact) => [artifact.slug, artifact.id])
  );

  const childrenByArtifactId = new Map<string, Artifact[]>();
  artifacts.forEach((artifact) => {
    const parentId = getAttachmentParentId(
      artifact,
      artifactIds,
      artifactIdBySlug
    );

    if (!parentId) return;

    const children = childrenByArtifactId.get(parentId) || [];
    children.push(artifact);
    childrenByArtifactId.set(parentId, children);
  });

  const songs = artifacts.filter((artifact) => artifactType(artifact) === "Song");
  const songsMissingEssentials = songs
    .filter(
      (song) => !artifactIdsWithLyrics.has(song.id) || !filled(song.spotify_url)
    )
    .sort(compareArtifacts);
  const songsMissingLyrics = songs.filter(
    (song) => !artifactIdsWithLyrics.has(song.id)
  );
  const songsMissingSpotify = songs.filter((song) => !filled(song.spotify_url));
  const artifactsWithoutMaterial = artifacts
    .filter((artifact) => {
      const children = childrenByArtifactId.get(artifact.id) || [];
      return !hasAnyMaterial(artifact, children, artifactIdsWithLyrics);
    })
    .sort(compareArtifacts);
  const orphanArtifacts = artifacts.filter(
    (artifact) =>
      hasRelationship(artifact) &&
      !getAttachmentParentId(artifact, artifactIds, artifactIdBySlug)
  );
  const rootArtifacts = artifacts.filter((artifact) => !hasRelationship(artifact));
  const searchResults = searchQuery
    ? artifacts
        .map((artifact) => ({
          artifact,
          score: searchScore(artifact, searchQuery),
        }))
        .filter((result) => result.score > 0)
        .sort((left, right) => {
          if (left.score !== right.score) return right.score - left.score;
          return compareArtifacts(left.artifact, right.artifact);
        })
        .map((result) => result.artifact)
    : [];

  const visibleSongsMissingEssentials = songsMissingEssentials.slice(
    0,
    QUEUE_LIMIT
  );
  const visibleArtifactsWithoutMaterial = artifactsWithoutMaterial.slice(
    0,
    QUEUE_LIMIT
  );
  const visibleOrphanArtifacts = orphanArtifacts.slice(0, QUEUE_LIMIT);
  const catalogArtifacts = searchQuery ? searchResults : artifacts;
  const visibleCatalogArtifacts = catalogArtifacts.slice(0, 250);
  const catalogArtifactIds = new Set(catalogArtifacts.map((artifact) => artifact.id));
  const bandCatalog = artifacts
    .filter((artifact) => artifactType(artifact) === "Band")
    .sort(compareArtifacts);
  const catalogDestinationIds = new Set<string>();
  const looseCatalogArtifacts: Artifact[] = [];
  const catalogHas = (artifact: Artifact) => catalogArtifactIds.has(artifact.id);

  bandCatalog.forEach((band) => {
    if (!searchQuery || catalogHas(band)) catalogDestinationIds.add(band.id);

    const releases = artifacts
      .filter((artifact) => isBandRelease(band, artifact))
      .sort(compareArtifacts);

    releases.forEach((release) => {
      if (!searchQuery || catalogHas(release)) catalogDestinationIds.add(release.id);

      uniqueReleaseTracks(release, songs).forEach((track) => {
        if (!searchQuery || catalogHas(track)) catalogDestinationIds.add(track.id);
      });
    });

    artifacts
      .filter((artifact) => isDirectBandSong(band, artifact, releases))
      .forEach((song) => {
        if (!searchQuery || catalogHas(song)) catalogDestinationIds.add(song.id);
      });
  });

  catalogArtifacts
    .filter((artifact) => !catalogDestinationIds.has(artifact.id))
    .sort(compareArtifacts)
    .forEach((artifact) => looseCatalogArtifacts.push(artifact));

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 border-b border-stone-800 pb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
          >
            ← Elsewhere
          </Link>

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
                Backroom
              </p>
              <h1 className="mt-4 font-serif text-4xl text-stone-100 md:text-6xl">
                Archive triage
              </h1>
              <p className="mt-5 max-w-2xl leading-relaxed text-stone-400">
                Fast maintenance queues for the things that need lyrics,
                Spotify links, attached material, or relationship repair.
              </p>
              {accessAccepted && (
                <p className="mt-6 w-fit border-l border-emerald-800 bg-emerald-950/15 px-4 py-3 text-sm leading-6 text-emerald-300">
                  Credentials accepted. Backroom access is open.
                </p>
              )}
            </div>

            <form action="/backroom/logout" method="post">
              <button
                type="submit"
                className="inline-flex w-fit border border-stone-800 px-5 py-3 text-xs uppercase tracking-[0.25em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        {savedArtifact && (
          <section className="mb-8 border border-emerald-900 bg-emerald-950/20 px-5 py-4 text-sm leading-6 text-emerald-300">
            Saved changes to {savedArtifact}. Backroom is up to date.
          </section>
        )}

        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Artifacts"
            value={artifacts.length}
            detail={`${rootArtifacts.length} top-level, ${orphanArtifacts.length} need relationship repair`}
          />
          <StatusCard
            label="Missing lyrics"
            value={songsMissingLyrics.length}
            detail="Song artifacts without lyrics text"
          />
          <StatusCard
            label="Missing Spotify"
            value={songsMissingSpotify.length}
            detail="Song artifacts without Spotify links"
          />
          <StatusCard
            label="No material"
            value={artifactsWithoutMaterial.length}
            detail="No image, lyrics, video, audio, or Spotify signal"
          />
        </section>

        <section className="mb-10 border border-stone-800 bg-stone-950/60 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <form action="/backroom" className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="backroom-search">
                Search artifacts
              </label>
              <input
                id="backroom-search"
                name="q"
                type="search"
                defaultValue={searchQuery}
                placeholder="Search tracks, albums, slugs..."
                className="min-h-12 flex-1 border border-stone-800 bg-neutral-950 px-4 text-sm text-stone-200 outline-none transition placeholder:text-stone-700 focus:border-stone-500"
              />
              <button
                type="submit"
                className="min-h-12 border border-stone-700 px-5 text-[10px] uppercase tracking-[0.22em] text-stone-300 transition hover:border-stone-300 hover:text-stone-100"
              >
                Search
              </button>
              {searchQuery && (
                <Link
                  href="/backroom"
                  className="inline-flex min-h-12 items-center justify-center border border-stone-900 px-5 text-[10px] uppercase tracking-[0.22em] text-stone-600 transition hover:border-stone-600 hover:text-stone-300"
                >
                  Clear
                </Link>
              )}
            </form>

            <div className="flex flex-wrap gap-3">
              <ActionLink href="/backroom/artifacts/new">New artifact</ActionLink>
              <ActionLink href="/backroom/songs/new">New song</ActionLink>
              <ActionLink href="/backroom/import">Catalog intake</ActionLink>
              <ActionLink href="/backroom/research-candidates">
                Source review
              </ActionLink>
              <ActionLink href="/backroom/media-labels">Media labels</ActionLink>
              <ActionLink href="/backroom/moods">Song moods</ActionLink>
              <ActionLink href="/backroom/drift-moods">Drift times</ActionLink>
            </div>
          </div>
        </section>

        <section className="mb-10 border border-stone-800 bg-stone-950/60 p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-stone-900 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                Archive catalog
              </p>
              <h2 className="mt-3 font-serif text-3xl text-stone-100">
                {searchQuery
                  ? `${catalogArtifacts.length} match${
                      catalogArtifacts.length === 1 ? "" : "es"
                    }`
                  : "Browse and edit"}
              </h2>
            </div>
            <span className="text-xs text-stone-600">
              {searchQuery
                ? visibleCatalogArtifacts.length < catalogArtifacts.length
                  ? `Showing ${visibleCatalogArtifacts.length}`
                  : searchQuery
                : `${songs.length} songs / ${artifacts.length} artifacts`}
            </span>
          </div>

          {searchQuery ? (
            catalogArtifacts.length > 0 ? (
              <div className="divide-y divide-stone-900">
                {visibleCatalogArtifacts.map((artifact) => (
                  <CatalogRow
                    key={artifact.id}
                    artifact={artifact}
                    artifactIdsWithLyrics={artifactIdsWithLyrics}
                  />
                ))}
                {catalogArtifacts.length > visibleCatalogArtifacts.length && (
                  <p className="py-4 text-xs text-stone-600">
                    Showing {visibleCatalogArtifacts.length} of{" "}
                    {catalogArtifacts.length}. Narrow the search to see fewer.
                  </p>
                )}
              </div>
            ) : (
              <p className="border border-stone-800 bg-neutral-950 p-4 text-sm text-stone-500">
                No artifacts matched that search.
              </p>
            )
          ) : (
            <div className="space-y-8">
              {bandCatalog.map((band) => {
                const releases = artifacts
                  .filter((artifact) => isBandRelease(band, artifact))
                  .sort(compareArtifacts);
                const directBandSongs = artifacts
                  .filter((artifact) => isDirectBandSong(band, artifact, releases))
                  .sort(compareArtifacts);
                const rowCount =
                  1 +
                  releases.length +
                  directBandSongs.length +
                  releases.reduce(
                    (count, release) =>
                      count + uniqueReleaseTracks(release, songs).length,
                    0
                  );

                return (
                  <CatalogGroup key={band.id} title={band.title} count={rowCount}>
                    <CatalogRow
                      artifact={band}
                      artifactIdsWithLyrics={artifactIdsWithLyrics}
                    />
                    {releases.map((release) => {
                      const tracks = uniqueReleaseTracks(release, songs);

                      return (
                        <div key={release.id}>
                          <CatalogRow
                            artifact={release}
                            artifactIdsWithLyrics={artifactIdsWithLyrics}
                            depth={1}
                          />
                          {tracks.map((track) => (
                            <CatalogRow
                              key={track.id}
                              artifact={track}
                              artifactIdsWithLyrics={artifactIdsWithLyrics}
                              depth={2}
                            />
                          ))}
                        </div>
                      );
                    })}
                    {directBandSongs.map((song) => (
                      <CatalogRow
                        key={song.id}
                        artifact={song}
                        artifactIdsWithLyrics={artifactIdsWithLyrics}
                        depth={1}
                      />
                    ))}
                  </CatalogGroup>
                );
              })}

              {looseCatalogArtifacts.length > 0 && (
                <CatalogGroup
                  title="Other artifacts"
                  count={looseCatalogArtifacts.length}
                >
                  {looseCatalogArtifacts.slice(0, 300).map((artifact) => (
                    <CatalogRow
                      key={artifact.id}
                      artifact={artifact}
                      artifactIdsWithLyrics={artifactIdsWithLyrics}
                    />
                  ))}
                  {looseCatalogArtifacts.length > 300 && (
                    <p className="py-4 text-xs text-stone-600">
                      Showing 300 of {looseCatalogArtifacts.length}. Use search
                      to narrow this section.
                    </p>
                  )}
                </CatalogGroup>
              )}
            </div>
          )}
        </section>

        {artifacts.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border border-stone-800 bg-stone-950/60 p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                    Songs to complete
                  </p>
                  <h2 className="mt-3 font-serif text-3xl text-stone-100">
                    Lyrics and Spotify
                  </h2>
                </div>
                <span className="text-xs text-stone-600">
                  {songsMissingEssentials.length}
                </span>
              </div>

              {songsMissingEssentials.length > 0 ? (
                <div className="divide-y divide-stone-900">
                  {visibleSongsMissingEssentials.map((song) => (
                    <div
                      key={song.id}
                      className="grid gap-4 py-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm text-stone-200">{song.title}</p>
                          <p className="mt-1 text-xs text-stone-700">
                            {song.album || song.parent_slug || "No album label"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {!artifactIdsWithLyrics.has(song.id) && (
                              <span className="border border-amber-950 bg-amber-950/20 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-amber-500">
                                Lyrics missing
                              </span>
                            )}
                            {!filled(song.spotify_url) && (
                              <span className="border border-sky-950 bg-sky-950/20 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-sky-500">
                                Spotify missing
                              </span>
                            )}
                          </div>
                        </div>
                        <EditLinks artifact={song} />
                      </div>

                      {!filled(song.spotify_url) && (
                        <form
                          action={saveBackroomSpotifyLink}
                          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <input type="hidden" name="id" value={song.id} />
                          <input
                            type="hidden"
                            name="title"
                            value={song.title}
                          />
                          <label className="sr-only" htmlFor={`spotify-${song.id}`}>
                            Spotify link for {song.title}
                          </label>
                          <input
                            id={`spotify-${song.id}`}
                            name="spotify_url"
                            type="url"
                            placeholder="Paste Spotify link"
                            className="min-h-11 border border-sky-950/70 bg-neutral-950 px-3 text-sm text-stone-200 outline-none transition placeholder:text-stone-700 focus:border-sky-700"
                          />
                          <button
                            type="submit"
                            className="min-h-11 border border-sky-900 px-4 text-[10px] uppercase tracking-[0.2em] text-sky-300 transition hover:border-sky-400 hover:text-sky-100"
                          >
                            Save Spotify
                          </button>
                        </form>
                      )}

                      {!artifactIdsWithLyrics.has(song.id) && (
                        <form
                          action={saveBackroomLyrics}
                          className="grid gap-2"
                        >
                          <input type="hidden" name="id" value={song.id} />
                          <input
                            type="hidden"
                            name="title"
                            value={song.title}
                          />
                          <label className="sr-only" htmlFor={`lyrics-${song.id}`}>
                            Lyrics for {song.title}
                          </label>
                          <textarea
                            id={`lyrics-${song.id}`}
                            name="lyrics"
                            rows={5}
                            placeholder="Paste lyrics"
                            className="w-full border border-amber-950/70 bg-neutral-950 px-3 py-3 text-sm leading-6 text-stone-200 outline-none transition placeholder:text-stone-700 focus:border-amber-700"
                          />
                          <button
                            type="submit"
                            className="w-fit border border-amber-900 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-amber-300 transition hover:border-amber-400 hover:text-amber-100"
                          >
                            Save lyrics
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                  {songsMissingEssentials.length > QUEUE_LIMIT && (
                    <p className="py-4 text-xs text-stone-600">
                      Showing {QUEUE_LIMIT} of {songsMissingEssentials.length}.
                    </p>
                  )}
                </div>
              ) : (
                <p className="border border-emerald-950 bg-emerald-950/10 p-4 text-sm text-emerald-300/80">
                  Every song has lyrics and a Spotify link.
                </p>
              )}
            </section>

            <section className="border border-stone-800 bg-stone-950/60 p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                    Empty artifacts
                  </p>
                  <h2 className="mt-3 font-serif text-3xl text-stone-100">
                    No material attached
                  </h2>
                </div>
                <span className="text-xs text-stone-600">
                  {artifactsWithoutMaterial.length}
                </span>
              </div>

              {artifactsWithoutMaterial.length > 0 ? (
                <div className="divide-y divide-stone-900">
                  {visibleArtifactsWithoutMaterial.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm text-stone-200">
                          {artifact.title}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-stone-700">
                          {artifactType(artifact) || "Unclassified"}
                        </p>
                      </div>
                      <EditLinks artifact={artifact} />
                    </div>
                  ))}
                  {artifactsWithoutMaterial.length > QUEUE_LIMIT && (
                    <p className="py-4 text-xs text-stone-600">
                      Showing {QUEUE_LIMIT} of {artifactsWithoutMaterial.length}.
                    </p>
                  )}
                </div>
              ) : (
                <p className="border border-emerald-950 bg-emerald-950/10 p-4 text-sm text-emerald-300/80">
                  Every artifact has at least one material signal.
                </p>
              )}
            </section>

            {orphanArtifacts.length > 0 && (
              <section className="border border-red-950/60 bg-red-950/10 p-6 lg:col-span-2">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-red-800">
                      Broken relationships
                    </p>
                    <h2 className="mt-3 font-serif text-3xl text-stone-100">
                      Repair these links
                    </h2>
                  </div>
                  <span className="text-xs text-red-800">
                    {orphanArtifacts.length}
                  </span>
                </div>

                <div className="divide-y divide-red-950/40">
                  {visibleOrphanArtifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm text-stone-300">
                          {artifact.title}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-red-800">
                          Belongs to: {relationshipLabel(artifact)}
                        </p>
                      </div>
                      <EditLinks artifact={artifact} />
                    </div>
                  ))}
                  {orphanArtifacts.length > QUEUE_LIMIT && (
                    <p className="py-4 text-xs text-red-800">
                      Showing {QUEUE_LIMIT} of {orphanArtifacts.length}.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          <section className="border border-dashed border-stone-800 bg-stone-950/40 p-10 text-center">
            <p className="text-stone-500">Nothing is waiting yet.</p>
            <Link
              href="/backroom/artifacts/new"
              className="mt-6 inline-flex border border-stone-700 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-300 transition hover:bg-stone-200 hover:text-neutral-950"
            >
              Bring the first thing in
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
