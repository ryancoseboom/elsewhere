import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import AudioFrame from "@/components/AudioFrame";
import AlbumTracklist, {
  type AlbumTrackPreview,
} from "@/components/AlbumTracklist";
import ArchiveHeroImageDrop from "@/components/ArchiveHeroImageDrop";
import ArchiveImageDrop from "@/components/ArchiveImageDrop";
import ArchiveAudioDrop from "@/components/ArchiveAudioDrop";
import ArchiveVideoDrop from "@/components/ArchiveVideoDrop";
import ArtifactVideoLightboxButton from "@/components/ArtifactVideoLightboxButton";
import ArtifactBreadcrumbLink from "@/components/ArtifactBreadcrumbLink";
import { getVideoEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/video";
import ArtifactEphemeraPaneSelect from "@/components/ArtifactEphemeraPaneSelect";
import { EPHEMERA_PANES, type EphemeraPane } from "@/lib/ephemera";
import ArtifactImageCaption from "@/components/ArtifactImageCaption";
import ArtifactMediaTitle from "@/components/ArtifactMediaTitle";
import ArtifactImageExperience, {
  ArtifactImageButton,
} from "@/components/ArtifactImageExperience";
import FloatExperiment, {
  type FloatExperimentArtifact,
} from "@/components/FloatExperiment";
import { readFloatControls } from "@/lib/float-controls";
import ArtifactSectionOrder from "@/components/ArtifactSectionOrder";
import {
  ArtifactEphemeraBrowser,
  ArtifactEphemeraGroup,
} from "@/components/ArtifactEphemeraBrowser";
import ArtifactPageNav from "@/components/ArtifactPageNav";
import ExclusiveAudio from "@/components/ExclusiveAudio";
import SpotifyTrackEmbed from "@/components/SpotifyTrackEmbed";
import SourceInterference from "@/components/SourceInterference";
import { archiveTexture, archiveTextureSet } from "@/lib/archive-textures";

const ELSEWHERE_ATMOSPHERE_V2 = true;
const ARTIFACT_PAGE_SELECT =
  "id, slug, title, kind, artifact_type, parent_id, band_id, album_id, song_id, parent_slug, description, fragment, atmosphere, motifs, rooms, nearby, image_url, audio_url, video_url, youtube_url, spotify_url, lyrics, discovery_visibility, album, year, era, sort_order";
const ARTIFACT_INDEX_SELECT =
  "id, slug, title, kind, artifact_type, parent_id, band_id, album_id, song_id, parent_slug, description, fragment, atmosphere, motifs, rooms, nearby, image_url, audio_url, video_url, youtube_url, spotify_url, lyrics, discovery_visibility, album, year, era, sort_order";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  kind: string | null;
  artifact_type: string | null;
  parent_id: string | null;
  band_id: string | null;
  album_id: string | null;
  song_id: string | null;
  parent_slug: string | null;
  description: string | null;
  fragment: string | null;
  atmosphere: string[] | null;
  motifs: string[] | null;
  nearby: string[] | null;
  image_url: string | null;
  audio_url: string | null;
  lyrics: string | null;
  video_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  discovery_visibility: string | null;
  album: string | null;
  year: string | null;
  era: string | null;
  sort_order: number | null;
  rooms: string[] | null;
};

function normalizeList(items: string[] | null) {
  return (items || []).map((item) => item.toLowerCase().trim());
}

function getArtifactType(artifact: Artifact) {
  return artifact.artifact_type || artifact.kind || "";
}

function artifactFloatImage(artifact: Artifact) {
  return {
    atmosphere: artifact.atmosphere || undefined,
    category: getArtifactType(artifact) || undefined,
    era: artifact.era,
    fragment: artifact.fragment,
    lyrics: artifact.lyrics,
    motifs: artifact.motifs || undefined,
    slug: artifact.slug,
    src: artifact.image_url || "",
    alt: artifact.title,
    year: artifact.year,
  };
}

function artifactFloatExperimentArtifact(
  artifact: Artifact,
  fallbackImageUrl?: string | null
): FloatExperimentArtifact {
  return {
    album: artifact.album,
    album_id: artifact.album_id,
    artifact_type: artifact.artifact_type,
    atmosphere: artifact.atmosphere,
    band_id: artifact.band_id,
    description: artifact.description,
    discovery_visibility: artifact.discovery_visibility,
    era: artifact.era,
    fragment: artifact.fragment,
    id: artifact.id,
    image_url: artifact.image_url || fallbackImageUrl || null,
    kind: artifact.kind,
    lyrics: artifact.lyrics,
    motifs: artifact.motifs,
    nearby: artifact.nearby,
    parent_id: artifact.parent_id,
    parent_slug: artifact.parent_slug,
    rooms: artifact.rooms,
    slug: artifact.slug,
    song_id: artifact.song_id,
    title: artifact.title,
    year: artifact.year,
  };
}

function isImageOnlyArtifact(artifact: Artifact) {
  return ["Artwork", "Design", "Photo"].includes(getArtifactType(artifact));
}

function hasValidBackroomAuthorization(value: string | null) {
  if (!value?.startsWith("Basic ")) return false;

  try {
    const [user, password] = Buffer.from(value.slice(6), "base64")
      .toString("utf8")
      .split(":");

    return (
      user === process.env.BACKROOM_USER &&
      password === process.env.BACKROOM_PASSWORD
    );
  } catch {
    return false;
  }
}

function scoreNearby(current: Artifact, candidate: Artifact) {
  let score = 0;

  const currentMotifs = normalizeList(current.motifs);
  const candidateMotifs = normalizeList(candidate.motifs);

  const currentAtmosphere = normalizeList(current.atmosphere);
  const candidateAtmosphere = normalizeList(candidate.atmosphere);

  currentMotifs.forEach((motif) => {
    if (candidateMotifs.includes(motif)) score += 3;
  });

  currentAtmosphere.forEach((mood) => {
    if (candidateAtmosphere.includes(mood)) score += 2;
  });

  if (getArtifactType(current) && getArtifactType(current) === getArtifactType(candidate)) {
    score += 1;
  }

  return score;
}

function sharedThreads(current: Artifact, candidate: Artifact) {
  const candidateThreads = new Set([
    ...normalizeList(candidate.motifs),
    ...normalizeList(candidate.atmosphere),
  ]);

  return [...(current.motifs || []), ...(current.atmosphere || [])].filter(
    (thread) => candidateThreads.has(thread.toLowerCase().trim())
  );
}

function shouldRevealHiddenArtifact(slug: string) {
  const score = Array.from(slug).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 3),
    0
  );

  return score % 11 === 0;
}

function ChildLinkList({
  title,
  items,
}: {
  title: string;
  items: Artifact[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-14 border-t border-stone-800 pt-8">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-stone-600">
        {title}
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/artifact/${item.slug}`}
            className="block text-lg font-serif text-stone-400 transition hover:text-stone-100"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArtworkSection({ items }: { items: Artifact[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-14 border-t border-stone-800 pt-8">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-stone-600">
        Artwork
      </p>

      <div className="flex flex-wrap gap-3">
        {items
          .filter((item) => item.image_url)
          .map((item) => (
          <ArtifactImageButton
            key={item.id}
            src={item.image_url || ""}
            alt={item.title}
            className="group block opacity-80 transition hover:opacity-100"
            imageClassName="max-h-56 w-auto object-contain"
          />
          ))}
        {items
          .filter((item) => !item.image_url)
          .map((item) => (
            <div
              key={item.id}
              className="border border-stone-800 px-5 py-4 text-sm text-stone-500"
            >
              {item.title}
            </div>
          ))}
      </div>
    </div>
  );
}

function AudioChildrenSection({ items }: { items: Artifact[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-14 border-t border-stone-800 pt-8">
      <p className="mb-5 text-xs uppercase tracking-[0.3em] text-stone-600">
        Audio
      </p>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="max-w-xl">
            <Link
              href={`/artifact/${item.slug}`}
              className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-stone-700 transition hover:text-stone-500"
            >
              {item.title}
            </Link>

            <ExclusiveAudio
              controls
              src={item.audio_url || ""}
              className="w-full opacity-80"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Breadcrumbs({
  crumbs,
}: {
  crumbs: { title: string; slug: string }[];
}) {
  if (crumbs.length === 0) {
    return (
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
      >
        ← Elsewhere
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-stone-600">
      <Link href="/" className="hover:text-stone-300">
        Elsewhere
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.slug} className="flex items-center gap-2">
          <span>/</span>
          <ArtifactBreadcrumbLink
            href={`/artifact/${crumb.slug}`}
            className="hover:text-stone-300"
          >
            {crumb.title}
          </ArtifactBreadcrumbLink>
        </span>
      ))}
    </div>
  );
}

type ArtifactPageView = "archive" | "dossier" | "scrapbook";

function addChildHref(artifact: Artifact) {
  const type = getArtifactType(artifact);
  const params = new URLSearchParams({
    parent: artifact.id,
  });

  if (type === "Band") params.set("band", artifact.id);
  else if (artifact.band_id) params.set("band", artifact.band_id);

  if (type === "Album") params.set("album", artifact.id);
  else if (artifact.album_id) params.set("album", artifact.album_id);

  if (type === "Song") params.set("song", artifact.id);
  else if (artifact.song_id) params.set("song", artifact.song_id);

  return `/backroom/artifacts/new?${params.toString()}`;
}

function ArchiveTools({ artifact }: { artifact: Artifact }) {
  return (
    <details className="group relative z-[70]">
      <summary className="cursor-pointer list-none border border-stone-800 px-3 py-2 text-[9px] uppercase tracking-[0.24em] text-stone-600 transition hover:border-stone-600 hover:text-stone-300">
        Archive tools
      </summary>
      <div className="absolute right-0 top-full z-[90] mt-2 w-52 border border-stone-800 bg-[#11100e] p-2 shadow-2xl">
        <Link
          href={`/backroom/artifacts/${artifact.slug}/edit`}
          className="block px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
        >
          Edit this page
        </Link>
        <Link
          href={addChildHref(artifact)}
          className="block px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
        >
          Add attached material
        </Link>
        <Link
          href={`/backroom/artifacts/${artifact.slug}/copy`}
          className="block px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
        >
          Copy this page
        </Link>
      </div>
    </details>
  );
}

function PlaceholderVisual({
  label,
  className = "",
  index = 0,
}: {
  label: string;
  className?: string;
  index?: number;
}) {
  const textures = archiveTextureSet(`placeholder:${label}:${index}`);

  return (
    <div
      className={`relative flex min-h-44 items-end overflow-hidden border border-stone-800 bg-stone-900 p-4 ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.35), rgba(12,10,9,0.88)), ${textures
          .map((texture) => `url(${texture})`)
          .join(", ")}`,
        backgroundPosition: "center, center, center, center",
        backgroundSize: "cover, cover, cover, 150%",
      }}
    >
      <p className="max-w-44 text-[10px] uppercase tracking-[0.2em] text-stone-500">
        {label} / awaiting archive material
      </p>
    </div>
  );
}

function VisualCard({
  item,
  className = "",
  index = 0,
  dropTargetArtifactId,
  order,
  pane,
}: {
  item?: Artifact;
  className?: string;
  index?: number;
  dropTargetArtifactId?: string;
  order?: { canMoveUp: boolean; canMoveDown: boolean; canDelete?: boolean };
  pane?: EphemeraPane;
}) {
  if (!item) {
    if (dropTargetArtifactId) {
      return (
        <ArchiveImageDrop
          artifactId={dropTargetArtifactId}
          className={className}
          index={index}
        />
      );
    }

    return (
      <PlaceholderVisual
        label="Visual fragment"
        className={className}
        index={index}
      />
    );
  }

  return (
    <div className={className}>
      <div className="group relative min-h-44 overflow-hidden border border-stone-800 bg-stone-900">
        {item.image_url ? (
          <ArtifactImageButton
            src={item.image_url}
            alt={item.title}
            category={pane}
            className="absolute inset-0"
            imageClassName="absolute inset-0 h-full w-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-95"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.2), rgba(12,10,9,0.9)), ${archiveTextureSet(
                `visual:${item.id}`
              )
                .map((texture) => `url(${texture})`)
                .join(", ")}`,
              backgroundPosition: "center, center, center, center",
              backgroundSize: "cover, cover, cover, 150%",
            }}
          />
        )}
        {order && (
          <span className="absolute right-2 top-2 flex flex-col items-end gap-1">
            <ArtifactSectionOrder artifactId={item.id} {...order} />
            {pane && (
              <ArtifactEphemeraPaneSelect artifactId={item.id} pane={pane} />
            )}
          </span>
        )}
      </div>
      <ArtifactImageCaption
        artifactId={item.id}
        editable={Boolean(order?.canDelete)}
        title={item.title}
      />
    </div>
  );
}

function getEphemeraPane(item: Artifact): EphemeraPane {
  const marker = (item.rooms || []).find((room) => room.startsWith("ephemera:"));
  const pane = marker?.slice("ephemera:".length);

  return EPHEMERA_PANES.includes(pane as EphemeraPane)
    ? (pane as EphemeraPane)
    : "Etc.";
}

function ephemeraPaneId(pane: EphemeraPane) {
  return `ephemera-${pane.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function releaseYear(release: Artifact) {
  const match = release.year?.match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function BandReleaseCard({
  release,
  presentationType,
}: {
  release: Artifact;
  presentationType: "Album" | "Single";
}) {
  return (
    <Link
      href={`/artifact/${release.slug}`}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden border border-stone-800 bg-stone-900">
        {release.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={release.image_url}
            alt={`${release.title} cover`}
            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div
            className="h-full w-full opacity-60 transition group-hover:opacity-90"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.2), rgba(12,10,9,0.9)), url(${archiveTexture(`release:${release.id}`)})`,
              backgroundSize: "cover",
            }}
          />
        )}
      </div>
      <p className="mt-3 font-serif text-lg text-stone-300 transition group-hover:text-white">
        {release.title}
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-stone-600">
        {[presentationType, release.year].filter(Boolean).join(" / ")}
      </p>
    </Link>
  );
}

function BandReleaseSection({
  title,
  releases,
  presentationType,
}: {
  title: string;
  releases: Artifact[];
  presentationType: "Album" | "Single";
}) {
  if (releases.length === 0) return null;

  return (
    <section className="border-t border-stone-800 pt-7">
      <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-stone-600">
        {title}
      </p>
      <div className="grid gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
        {releases.map((release) => (
          <BandReleaseCard
            key={release.id}
            release={release}
            presentationType={presentationType}
          />
        ))}
      </div>
    </section>
  );
}

function EphemeraPaneSection({
  pane,
  items,
  allItems,
  artifactId,
  canEdit,
}: {
  pane: EphemeraPane;
  items: Artifact[];
  allItems: Artifact[];
  artifactId: string;
  canEdit: boolean;
}) {
  const showDropTarget = canEdit && pane === "Etc.";

  if (items.length === 0 && !showDropTarget) return null;

  return (
    <ArtifactEphemeraGroup
      id={ephemeraPaneId(pane)}
      label={pane}
      count={items.length}
      collapsible={!canEdit}
    >
      {items.map((item) => {
        const index = allItems.findIndex((candidate) => candidate.id === item.id);

        return (
          <VisualCard
            key={item.id}
            item={item}
            index={index}
            pane={getEphemeraPane(item)}
            order={
              canEdit
                ? {
                    canMoveUp: index > 0,
                    canMoveDown: index < allItems.length - 1,
                    canDelete: ["Artwork", "Design", "Photo"].includes(
                      getArtifactType(item)
                    ),
                  }
                : undefined
            }
          />
        );
      })}
      {showDropTarget && (
        <VisualCard
          dropTargetArtifactId={artifactId}
          index={allItems.length}
        />
      )}
    </ArtifactEphemeraGroup>
  );
}

function BandScrapbook({
  artifact,
  breadcrumbs,
  albums,
  singles,
  nearby,
  canEdit,
}: {
  artifact: Artifact;
  breadcrumbs: { title: string; slug: string }[];
  albums: Artifact[];
  singles: Artifact[];
  nearby: Artifact[];
  canEdit: boolean;
}) {
  const releaseImages = [...albums, ...singles]
    .filter((release) => release.image_url)
    .map((release) => ({ src: release.image_url || "", alt: release.title }));

  return (
    <main className="min-h-screen bg-[#11100e] px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <ArchiveTools artifact={artifact} />}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
          <aside>
            {(artifact.image_url || canEdit) && <div className="border border-stone-700 bg-black p-3">
              <ArchiveHeroImageDrop
                artifactId={artifact.id}
                alt={`${artifact.title} band image`}
                canEdit={canEdit}
                imageUrl={artifact.image_url}
                label="Band image"
              />
            </div>}

            <div className="mt-12">
              <RelatedGrid items={nearby} />
            </div>
          </aside>

          <section>
            <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
              elsewhere / band
            </p>
            <h1 className="mt-4 font-serif text-7xl leading-none text-stone-100 md:text-9xl">
              {artifact.title}
            </h1>
            {releaseImages.length > 0 && (
              <div className="mt-6">
                <ArtifactImageExperience
                  key={artifact.slug}
                  images={releaseImages}
                />
              </div>
            )}
            {artifact.fragment && (
              <p className="mt-5 max-w-2xl font-serif text-xl italic leading-8 text-stone-300">
                “{artifact.fragment}”
              </p>
            )}
            {artifact.description && (
              <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-500">
                {artifact.description}
              </p>
            )}

            <div className="mt-10 space-y-10">
              <BandReleaseSection
                title="Albums"
                releases={albums}
                presentationType="Album"
              />
              <BandReleaseSection
                title="Singles"
                releases={singles}
                presentationType="Single"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MediaList({
  title,
  items,
  placeholder,
  canEdit = false,
}: {
  title: string;
  items: Artifact[];
  placeholder: string;
  canEdit?: boolean;
}) {
  if (items.length === 0 && !canEdit) return null;

  return (
    <section className="border-t border-stone-800 pt-6">
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
        {title}
      </p>
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-center justify-between gap-3">
                {canEdit && item.parent_id ? (
                  <ArtifactMediaTitle
                    artifactId={item.id}
                    editable
                    title={item.title}
                  />
                ) : (
                  <Link
                    href={`/artifact/${item.slug}`}
                    className="min-w-0 flex-1 text-sm font-serif text-stone-300 hover:text-white"
                  >
                    {item.title}
                  </Link>
                )}
                {canEdit && (
                  <ArtifactSectionOrder
                    artifactId={item.id}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                  />
                )}
              </div>
              {item.audio_url && (
                <ExclusiveAudio
                  controls
                  src={item.audio_url}
                  className="mt-2 w-full opacity-80"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic leading-6 text-stone-700">{placeholder}</p>
      )}
    </section>
  );
}

function AudioGallery({
  items,
  dropTargetArtifactId,
  title = "Listen",
}: {
  items: Artifact[];
  dropTargetArtifactId?: string;
  title?: string;
}) {
  if (items.length === 0 && !dropTargetArtifactId) return null;

  return (
    <section className="border-t border-stone-800 pt-6">
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
        {title}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative flex min-h-36 flex-col justify-end overflow-hidden border border-stone-800 bg-stone-950 p-4"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.22), rgba(12,10,9,0.88)), url(${archiveTexture(
                `audio:${item.id}`
              )})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          >
            <div className="absolute inset-0 bg-black/20" />
            {dropTargetArtifactId && item.parent_id ? (
              <div className="relative z-10 mb-3 flex min-w-0">
                <ArtifactMediaTitle
                  artifactId={item.id}
                  className="block w-full whitespace-normal break-words font-sans text-xs leading-4 text-stone-200"
                  editable
                  title={item.title}
                />
              </div>
            ) : (
              <Link
                href={`/artifact/${item.slug}`}
                className="relative z-10 mb-3 block whitespace-normal break-words font-sans text-xs leading-4 text-stone-200 hover:text-white"
              >
                {item.title}
              </Link>
            )}
            <ExclusiveAudio
              controls
              src={item.audio_url || ""}
              className="relative z-10 h-8 w-full opacity-80"
            />
          </div>
        ))}
        {dropTargetArtifactId && (
          <ArchiveAudioDrop artifactId={dropTargetArtifactId} />
        )}
      </div>
    </section>
  );
}

function VideoGallery({
  items,
  placeholder,
  canEdit = false,
  dropTargetArtifactId,
}: {
  items: Artifact[];
  placeholder: string;
  canEdit?: boolean;
  dropTargetArtifactId?: string;
}) {
  if (items.length === 0 && !dropTargetArtifactId && !canEdit) return null;

  return (
    <section className="border-t border-stone-800 pt-6">
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
        Watch
      </p>
      {items.length > 0 || dropTargetArtifactId ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.id}>
              <div className="group relative aspect-video overflow-hidden border border-stone-800 bg-black">
                <ArtifactVideoLightboxButton
                  title={item.title}
                  videoUrl={item.video_url}
                  youtubeUrl={item.youtube_url}
                  thumbnailUrl={
                    item.image_url || getYouTubeThumbnailUrl(item.youtube_url)
                  }
                  className="absolute inset-0 h-full w-full disabled:cursor-default"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
                  {canEdit && item.parent_id ? (
                    <div className="pointer-events-auto min-w-0">
                      <ArtifactMediaTitle
                        artifactId={item.id}
                        className="block w-full whitespace-normal break-words font-sans text-xs leading-4 text-stone-100"
                        editable
                        title={item.title}
                      />
                    </div>
                  ) : (
                    <p className="whitespace-normal break-words font-sans text-xs leading-4 text-stone-100">
                      {item.title}
                    </p>
                  )}
                </div>
                {canEdit && item.parent_id && (
                  <div className="absolute right-2 top-2 z-10">
                    <ArtifactSectionOrder
                      artifactId={item.id}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                      canDelete
                      deleteKind="video"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {dropTargetArtifactId && (
            <ArchiveVideoDrop artifactId={dropTargetArtifactId} />
          )}
        </div>
      ) : (
        <p className="text-sm italic leading-6 text-stone-700">{placeholder}</p>
      )}
    </section>
  );
}

function RelatedGrid({
  items,
}: {
  items: (Artifact & { hiddenDiscovery?: boolean; shared?: string[] })[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
        Nearby
      </p>
      <div className="grid gap-px bg-stone-800 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/artifact/${item.slug}`}
            className="bg-neutral-950 p-4 transition hover:bg-stone-900"
          >
            {item.hiddenDiscovery && (
              <p className="mb-3 text-[9px] uppercase tracking-[0.24em] text-red-900">
                misfiled signal
              </p>
            )}
            <p className="font-sans text-base text-stone-300">{item.title}</p>
            {item.fragment && (
              <p className="mt-2 line-clamp-2 font-sans text-[11px] italic leading-5 text-stone-600">
                {item.fragment}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function artifactDossierCode(artifact: Artifact) {
  const titleSeed = artifact.title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const checksum = Array.from(artifact.slug).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );

  return `EL-${titleSeed}-${String(checksum % 997).padStart(3, "0")}`;
}

function ArtifactDossierLayer({
  artifact,
  presentationType,
  imageCount,
  trackCount,
  documentCount,
}: {
  artifact: Artifact;
  presentationType: string;
  imageCount: number;
  trackCount: number;
  documentCount: number;
}) {
  const code = artifactDossierCode(artifact);
  const dateLine = [artifact.year, artifact.era].filter(Boolean).join(" / ");
  const inventory = [
    imageCount ? `${imageCount} visual refs` : null,
    trackCount ? `${trackCount} tracks` : null,
    documentCount ? `${documentCount} paper traces` : null,
  ].filter(Boolean);

  return (
    <div className="elsewhere-artifact-dossier-layer" aria-hidden="true">
      <span className="elsewhere-artifact-dossier-mark elsewhere-artifact-dossier-mark--code">
        {code}
      </span>
      <span className="elsewhere-artifact-dossier-mark elsewhere-artifact-dossier-mark--status">
        public copy / indexed
      </span>
      <span className="elsewhere-artifact-dossier-mark elsewhere-artifact-dossier-mark--type">
        {presentationType}
      </span>
      {dateLine && (
        <span className="elsewhere-artifact-dossier-mark elsewhere-artifact-dossier-mark--date">
          {dateLine}
        </span>
      )}
      {inventory.length > 0 && (
        <span className="elsewhere-artifact-dossier-mark elsewhere-artifact-dossier-mark--inventory">
          {inventory.join(" / ")}
        </span>
      )}
    </div>
  );
}

function ArtifactDossierNote({
  artifact,
  imageCount,
  trackCount,
}: {
  artifact: Artifact;
  imageCount: number;
  trackCount: number;
}) {
  const code = artifactDossierCode(artifact);
  const year = artifact.year || artifact.era || "undated";
  const measures = [
    trackCount ? `${trackCount} track index` : null,
    imageCount ? `${imageCount} visual refs` : null,
  ].filter(Boolean);

  return (
    <div className="elsewhere-artifact-dossier-note" aria-hidden="true">
      <span>{code}</span>
      <span>{year}</span>
      {measures.length > 0 && <span>{measures.join(" / ")}</span>}
    </div>
  );
}

function EditorialDossier({
  artifact,
  breadcrumbs,
  artwork,
  videos,
  demos,
  documents,
  miscellaneous,
  nearby,
  canEdit,
}: {
  artifact: Artifact;
  breadcrumbs: { title: string; slug: string }[];
  artwork: Artifact[];
  videos: Artifact[];
  demos: Artifact[];
  documents: Artifact[];
  miscellaneous: Artifact[];
  nearby: Artifact[];
  canEdit: boolean;
}) {
  const visualItems = [...artwork, ...miscellaneous].slice(0, 4);
  const floatImages = visualItems
    .filter((item) => item.image_url)
    .map(artifactFloatImage);

  return (
    <main className="min-h-screen bg-[#0b0a09] px-6 py-10 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <ArchiveTools artifact={artifact} />}
        </div>

        <header className="mt-14 border-y border-stone-800 py-8">
          <p className="text-[10px] uppercase tracking-[0.45em] text-stone-600">
            Elsewhere archive / published dossier
          </p>
          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <h1 className="font-serif text-6xl text-stone-100 md:text-8xl">
              {artifact.title}
            </h1>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-600">
              {[artifact.album, artifact.year, artifact.era]
                .filter(Boolean)
                .join(" / ")}
            </p>
          </div>
          <div className="mt-6">
            <ArtifactImageExperience
              key={artifact.slug}
              images={floatImages}
              spotifyUrl={artifact.spotify_url}
            />
          </div>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <section>
            <ArchiveHeroImageDrop
              artifactId={artifact.id}
              alt={artifact.title}
              canEdit={canEdit}
              imageUrl={artifact.image_url}
              label="Primary cover"
              imageClassName="max-h-[42rem] w-full object-cover opacity-90"
            />

            {artifact.audio_url ? (
              <AudioFrame
                audioUrl={artifact.audio_url}
                imageUrl={artifact.image_url}
              />
            ) : canEdit ? (
              <p className="mt-4 border border-stone-800 p-4 text-xs uppercase tracking-[0.2em] text-stone-700">
                Primary recording awaiting audio file
              </p>
            ) : null}

            {artifact.spotify_url && (
              <SpotifyTrackEmbed
                title={artifact.title}
                url={artifact.spotify_url}
                className="mt-4"
              />
            )}

            {artifact.lyrics && (
              <section className="mt-12 border-t border-stone-800 pt-8">
                <p className="mb-6 text-[10px] uppercase tracking-[0.3em] text-stone-600">
                  Lyrics
                </p>
                <div className="columns-1 whitespace-pre-line font-serif text-lg leading-8 text-stone-300 md:columns-2 md:gap-12">
                  {artifact.lyrics}
                </div>
              </section>
            )}
          </section>

          <aside className="space-y-8">
            {artifact.fragment && (
              <p className="font-serif text-2xl italic leading-9 text-stone-300">
                “{artifact.fragment}”
              </p>
            )}
            {artifact.description && (
              <p className="text-sm leading-7 text-stone-500">
                {artifact.description}
              </p>
            )}

            <AudioGallery
              title="Demo versions"
              items={demos}
              dropTargetArtifactId={canEdit ? artifact.id : undefined}
            />
            <MediaList
              title="Promotional material"
              items={documents}
              placeholder="Press sheets, flyers, and promotional documents will collect here."
            />
          </aside>
        </div>

        {(visualItems.length > 0 || canEdit) && <section className="mt-14">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
            Alternate covers and visual miscellania
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from(
              { length: canEdit ? Math.max(4, visualItems.length) : visualItems.length },
              (_, index) => (
              <VisualCard
                key={visualItems[index]?.id || `placeholder-${index}`}
                item={visualItems[index]}
                index={index}
                dropTargetArtifactId={canEdit ? artifact.id : undefined}
              />
              )
            )}
          </div>
        </section>}

        <VideoGallery
          items={videos}
          placeholder="Official videos, live fragments, and visual companions will collect here."
          canEdit={canEdit}
          dropTargetArtifactId={canEdit ? artifact.id : undefined}
        />

        <div className="mt-14">
          <RelatedGrid items={nearby} />
        </div>
      </div>
    </main>
  );
}

function VisualScrapbook({
  artifact,
  presentationType,
  primaryAudioUrl,
  primarySpotifyUrl,
  primaryLyrics,
  isAlbumPage,
  isSingleRelease,
  coverImageUrl,
  albumTrackPreviews,
  breadcrumbs,
  artwork,
  videos,
  demos,
  audioChildren,
  documents,
  miscellaneous,
  nearby,
  canEdit,
  initialImageSlug,
}: {
  artifact: Artifact;
  presentationType: string;
  primaryAudioUrl: string | null;
  primarySpotifyUrl: string | null;
  primaryLyrics: string | null;
  isAlbumPage: boolean;
  isSingleRelease: boolean;
  coverImageUrl: string | null;
  albumTrackPreviews: AlbumTrackPreview[];
  breadcrumbs: { title: string; slug: string }[];
  artwork: Artifact[];
  videos: Artifact[];
  demos: Artifact[];
  audioChildren: Artifact[];
  documents: Artifact[];
  miscellaneous: Artifact[];
  nearby: Artifact[];
  canEdit: boolean;
  initialImageSlug?: string;
}) {
  const visualItems = [...artwork, ...miscellaneous, ...documents];
  const floatImages = visualItems
    .filter((item) => item.image_url)
    .map((item) => ({
      ...artifactFloatImage(item),
      category: getEphemeraPane(item),
    }));
  const visualSlotCount = canEdit
    ? Math.max(4, visualItems.length + 1)
    : visualItems.length;
  const documentCount = documents.length;
  const isSongPage = getArtifactType(artifact) === "Song";
  const ephemeraPanes = EPHEMERA_PANES.map((pane) => ({
    count: visualItems.filter((item) => getEphemeraPane(item) === pane).length,
    id: ephemeraPaneId(pane),
    label: pane,
  })).filter((pane) => pane.count > 0 || (canEdit && pane.label === "Etc."));
  const navItems = [
    { href: "#overview", label: "Overview" },
    ...(isAlbumPage && albumTrackPreviews.length > 0
      ? [{ href: "#tracks", label: "Tracks" }]
      : []),
    ...(isSongPage || isSingleRelease || videos.length > 0
      ? [{ href: "#listen-watch", label: "Listen / Watch" }]
      : []),
    ...(ephemeraPanes.length > 0
      ? [{ href: "#ephemera", label: "Ephemera" }]
      : []),
    ...(primaryLyrics ? [{ href: "#words", label: "Words" }] : []),
  ];
  const summary = [
    ...(albumTrackPreviews.length > 0
      ? [`${albumTrackPreviews.length} ${albumTrackPreviews.length === 1 ? "track" : "tracks"}`]
      : []),
    ...(floatImages.length > 0
      ? [`${floatImages.length} ${floatImages.length === 1 ? "image" : "images"}`]
      : []),
  ];

  return (
    <main
      id="artifact-top"
      className={`min-h-screen scroll-mt-24 bg-[#11100e] px-5 py-8 text-stone-200 ${
        ELSEWHERE_ATMOSPHERE_V2 ? "elsewhere-artifact-atmosphere-v2" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl">
        {ELSEWHERE_ATMOSPHERE_V2 && (
          <ArtifactDossierLayer
            artifact={artifact}
            presentationType={presentationType}
            imageCount={floatImages.length}
            trackCount={albumTrackPreviews.length}
            documentCount={documentCount}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <ArchiveTools artifact={artifact} />}
        </div>

        {ELSEWHERE_ATMOSPHERE_V2 ? (
          <div className="hidden md:block">
            <ArtifactPageNav items={navItems} summary={summary} title={artifact.title} />
          </div>
        ) : (
          <ArtifactPageNav items={navItems} summary={summary} title={artifact.title} />
        )}

        {ELSEWHERE_ATMOSPHERE_V2 && (
          <header className="elsewhere-artifact-mobile-dossier mt-10 lg:hidden">
            <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
              elsewhere / {presentationType}
            </p>
            <h1 className="mt-4 font-serif text-6xl leading-none text-stone-100 sm:text-7xl">
              {artifact.title}
            </h1>
            <ArtifactDossierNote
              artifact={artifact}
              imageCount={floatImages.length}
              trackCount={albumTrackPreviews.length}
            />
            <div className="mt-6">
              <ArtifactImageExperience
                key={`${artifact.slug}:${initialImageSlug || ""}:mobile`}
                images={floatImages}
                initialImageSlug={initialImageSlug}
                spotifyUrl={primarySpotifyUrl}
              />
            </div>
          </header>
        )}

        {ELSEWHERE_ATMOSPHERE_V2 && (coverImageUrl || canEdit) && (
          <div
            className="elsewhere-artifact-cover-plate mx-auto mt-8 max-w-72 border border-stone-700 bg-black p-3 lg:hidden"
            data-plate={artifactDossierCode(artifact)}
          >
            <ArchiveHeroImageDrop
              artifactId={artifact.id}
              alt={`${artifact.title} cover`}
              canEdit={canEdit}
              imageUrl={coverImageUrl}
              label="Cover image"
            />
          </div>
        )}

        {isSongPage && (primarySpotifyUrl || videos.length > 0 || primaryLyrics) && (
          <section
            id="listen-watch-mobile"
            className="mt-8 grid scroll-mt-24 gap-8 border-y border-stone-800 py-6 lg:hidden"
          >
            {primarySpotifyUrl && (
              <SpotifyTrackEmbed
                title={artifact.title}
                url={primarySpotifyUrl}
              />
            )}
            {videos.length > 0 && (
              <VideoGallery
                items={videos}
                placeholder="Moving-image fragments will appear here when attached."
                canEdit={canEdit}
                dropTargetArtifactId={canEdit ? artifact.id : undefined}
              />
            )}
            {primaryLyrics && (
              <section id="words-mobile" className="scroll-mt-24">
                <h2 className="mb-5 text-[10px] uppercase tracking-[0.32em] text-stone-600">
                  Words
                </h2>
                <div className="whitespace-pre-line font-serif text-xl leading-9 text-stone-300">
                  {primaryLyrics}
                </div>
              </section>
            )}
          </section>
        )}

        <div
          id="overview"
          className={`grid scroll-mt-24 gap-8 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)] ${
            ELSEWHERE_ATMOSPHERE_V2 ? "mt-8" : "mt-10"
          } ${ELSEWHERE_ATMOSPHERE_V2 ? "elsewhere-artifact-layout-v2" : ""}`}
        >
          <aside
            id="listen-watch"
            className={`scroll-mt-24 ${
              ELSEWHERE_ATMOSPHERE_V2
                ? "elsewhere-artifact-side-file order-2 lg:order-none"
                : ""
            }`}
          >
            {(coverImageUrl || canEdit) && <div
              className={`border border-stone-700 bg-black p-3 ${
                ELSEWHERE_ATMOSPHERE_V2
                  ? "elsewhere-artifact-cover-plate hidden lg:block"
                  : ""
              }`}
              data-plate={artifactDossierCode(artifact)}
            >
              <ArchiveHeroImageDrop
                artifactId={artifact.id}
                alt={`${artifact.title} cover`}
                canEdit={canEdit}
                imageUrl={coverImageUrl}
                label="Cover image"
              />
            </div>}

            {primarySpotifyUrl && (
              <div className={isSongPage ? "hidden lg:block" : ""}>
                <SpotifyTrackEmbed
                  title={artifact.title}
                  url={primarySpotifyUrl}
                  className="mt-4"
                />
              </div>
            )}

            {isAlbumPage && albumTrackPreviews.length > 0 && !isSingleRelease && (
              <div id="tracks" className="scroll-mt-24">
                <AlbumTracklist
                  tracks={albumTrackPreviews}
                  currentArtifactId={artifact.id}
                  canEdit={canEdit}
                />
              </div>
            )}

            {primaryAudioUrl && !isSongPage && !isSingleRelease && (
              <AudioFrame
                audioUrl={primaryAudioUrl}
                imageUrl={artifact.image_url}
              />
            )}

            <div className="mt-12 space-y-8">
              {(canEdit || isSongPage || isSingleRelease) && (
                <AudioGallery
                  items={[
                    ...(artifact.audio_url ? [artifact] : []),
                    ...demos,
                    ...audioChildren,
                  ]}
                  dropTargetArtifactId={canEdit ? artifact.id : undefined}
                />
              )}
              {!canEdit && !isAlbumPage && !isSongPage && !isSingleRelease && (
                <MediaList
                  title="Listen"
                  items={demos}
                  placeholder="Alternate recordings will appear here when attached."
                />
              )}
              <div className={isSongPage ? "hidden lg:block" : ""}>
                <VideoGallery
                  items={videos}
                  placeholder="Moving-image fragments will appear here when attached."
                  canEdit={canEdit}
                  dropTargetArtifactId={canEdit ? artifact.id : undefined}
                />
              </div>
              <MediaList
                title="Paper traces"
                items={documents}
                placeholder="Flyers, clippings, and press materials will appear here."
              />
              <RelatedGrid items={nearby} />
            </div>
          </aside>

          <section
            className={
              ELSEWHERE_ATMOSPHERE_V2
                ? "elsewhere-artifact-main-file order-1 lg:order-none"
                : ""
            }
          >
            <div className={ELSEWHERE_ATMOSPHERE_V2 ? "hidden lg:block" : ""}>
              <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
                elsewhere / {presentationType}
              </p>
              <h1 className="mt-4 font-serif text-7xl leading-none text-stone-100 md:text-9xl">
                {artifact.title}
              </h1>
              <ArtifactDossierNote
                artifact={artifact}
                imageCount={floatImages.length}
                trackCount={albumTrackPreviews.length}
              />
              <div className="mt-6">
                <ArtifactImageExperience
                  key={`${artifact.slug}:${initialImageSlug || ""}`}
                  images={floatImages}
                  initialImageSlug={initialImageSlug}
                  spotifyUrl={primarySpotifyUrl}
                />
              </div>
            </div>
            {artifact.fragment && (
              <p className="mt-5 max-w-2xl font-serif text-xl italic leading-8 text-stone-300">
                “{artifact.fragment}”
              </p>
            )}
            <SourceInterference
              className="mt-7"
              context={{
                artifactSlug: artifact.slug,
                atmosphere: artifact.atmosphere || [],
                motifs: artifact.motifs || [],
              }}
              limit={5}
            />

            {visualSlotCount > 0 && (isAlbumPage || isSingleRelease || isSongPage) && (
              <section
                id="ephemera"
                className={`mt-9 scroll-mt-24 ${
                  ELSEWHERE_ATMOSPHERE_V2
                    ? "elsewhere-artifact-evidence-section"
                    : ""
                }`}
              >
                <h2 className="mb-6 text-[10px] uppercase tracking-[0.36em] text-stone-500">
                  Ephemera
                </h2>
                <ArtifactEphemeraBrowser panes={ephemeraPanes}>
                  {EPHEMERA_PANES.map((pane) => (
                    <EphemeraPaneSection
                      key={pane}
                      pane={pane}
                      items={visualItems.filter(
                        (item) => getEphemeraPane(item) === pane
                      )}
                      allItems={visualItems}
                      artifactId={artifact.id}
                      canEdit={canEdit}
                    />
                  ))}
                </ArtifactEphemeraBrowser>
              </section>
            )}

            {visualSlotCount > 0 && !isAlbumPage && !isSingleRelease && !isSongPage && (
              <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: visualSlotCount }, (_, index) => (
                  <VisualCard
                    key={visualItems[index]?.id || `scrap-${index}`}
                    item={visualItems[index]}
                    index={index}
                    dropTargetArtifactId={canEdit ? artifact.id : undefined}
                    order={
                      canEdit && visualItems[index]
                        ? {
                            canMoveUp: index > 0,
                            canMoveDown: index < visualItems.length - 1,
                            canDelete: ["Artwork", "Design", "Photo"].includes(
                              getArtifactType(visualItems[index])
                            ),
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {primaryLyrics && (
              <section
                id="words"
                className={`mt-12 scroll-mt-24 border-t border-stone-800 pt-8 ${
                  isSongPage ? "hidden lg:block" : ""
                }`}
              >
                <h2 className="mb-5 text-[10px] uppercase tracking-[0.32em] text-stone-600">
                  Words
                </h2>
                <div className="whitespace-pre-line font-serif text-xl leading-9 text-stone-300">
                  {primaryLyrics}
                </div>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default async function ArtifactPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    debug?: string | string[];
    float?: string | string[];
    floatDebug?: string | string[];
    image?: string | string[];
    view?: string | string[];
  } & Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const floatControls = readFloatControls(resolvedSearchParams);
  const requestedView = resolvedSearchParams.view;
  const requestedImage = resolvedSearchParams.image;
  const requestedFloat = resolvedSearchParams.float;
  const requestedFloatDebug =
    resolvedSearchParams.floatDebug || resolvedSearchParams.debug;
  const initialImageSlug = Array.isArray(requestedImage)
    ? requestedImage[0]
    : requestedImage;
  const floatValue = Array.isArray(requestedFloat)
    ? requestedFloat[0]
    : requestedFloat;
  const floatDebugValue = Array.isArray(requestedFloatDebug)
    ? requestedFloatDebug[0]
    : requestedFloatDebug;
  const artifactFloatMode = ["1", "true", "intensity", "v2"].includes(
    floatValue || ""
  );
  const artifactFloatDebugMode = ["1", "true", "debug", "float"].includes(
    floatDebugValue || ""
  );
  const viewValue = Array.isArray(requestedView)
    ? requestedView[0]
    : requestedView;
  const view: ArtifactPageView =
    viewValue === "archive" || viewValue === "dossier"
      ? viewValue
      : "scrapbook";
  const canEdit =
    (await cookies()).get("elsewhere_backroom")?.value === "yes" ||
    hasValidBackroomAuthorization((await headers()).get("authorization"));
  const supabase = await createClient();

  let artifactQuery = supabase
    .from("artifacts")
    .select(ARTIFACT_PAGE_SELECT)
    .eq("slug", slug);
  if (!canEdit) {
    artifactQuery = artifactQuery
      .eq("is_public", true)
      .in("discovery_visibility", ["public", "hidden"]);
  }
  const { data: artifact, error } = await artifactQuery.single();

  if (error || !artifact) {
    notFound();
  }

  const currentArtifact = artifact as Artifact;
  const currentArtifactType = getArtifactType(currentArtifact);

  let allArtifactsQuery = supabase
    .from("artifacts")
    .select(ARTIFACT_INDEX_SELECT)
    .neq("slug", currentArtifact.slug);
  if (!canEdit) {
    allArtifactsQuery = allArtifactsQuery
      .eq("is_public", true)
      .eq("discovery_visibility", "public");
  }
  const { data: allArtifactsData } = await allArtifactsQuery;

  const relatedArtifactConditions = [
    `parent_id.eq.${currentArtifact.id}`,
    `parent_slug.eq.${currentArtifact.slug}`,
  ];

  if (currentArtifactType === "Band") {
    relatedArtifactConditions.push(`band_id.eq.${currentArtifact.id}`);
  }

  if (["Album", "Single"].includes(currentArtifactType)) {
    relatedArtifactConditions.push(`album_id.eq.${currentArtifact.id}`);
  }

  if (currentArtifactType === "Song") {
    relatedArtifactConditions.push(`song_id.eq.${currentArtifact.id}`);
  }

  if (currentArtifact.album_id) {
    relatedArtifactConditions.push(`album_id.eq.${currentArtifact.album_id}`);
  }

  let relatedArtifactsQuery = supabase
    .from("artifacts")
    .select(ARTIFACT_INDEX_SELECT)
    .neq("slug", currentArtifact.slug)
    .or(relatedArtifactConditions.join(","));
  if (!canEdit) {
    relatedArtifactsQuery = relatedArtifactsQuery
      .eq("is_public", true)
      .eq("discovery_visibility", "public");
  }
  const { data: relatedArtifactsData } = await relatedArtifactsQuery;

  let hiddenArtifactsQuery = supabase
    .from("artifacts")
    .select(ARTIFACT_INDEX_SELECT)
    .eq("is_public", true)
    .eq("discovery_visibility", "hidden")
    .neq("slug", currentArtifact.slug)
    .limit(12);
  if (canEdit) hiddenArtifactsQuery = hiddenArtifactsQuery.limit(0);
  const { data: hiddenArtifactsData } = await hiddenArtifactsQuery;

  const allArtifactsById = new Map<string, Artifact>();
  ((allArtifactsData || []) as Artifact[]).forEach((item) =>
    allArtifactsById.set(item.id, item)
  );
  ((relatedArtifactsData || []) as Artifact[]).forEach((item) =>
    allArtifactsById.set(item.id, item)
  );
  const allArtifacts = [...allArtifactsById.values()];
  const hiddenArtifacts = (hiddenArtifactsData || []) as Artifact[];

  const artifactMap = new Map<string, Artifact>();
  allArtifacts.forEach((item) => artifactMap.set(item.id, item));
  artifactMap.set(currentArtifact.id, currentArtifact);
  const artifactSlugMap = new Map<string, Artifact>();
  allArtifacts.forEach((item) => artifactSlugMap.set(item.slug, item));
  artifactSlugMap.set(currentArtifact.slug, currentArtifact);

  if (isImageOnlyArtifact(currentArtifact)) {
    const parentArtifact =
      (currentArtifact.parent_id
        ? artifactMap.get(currentArtifact.parent_id)
        : undefined) ||
      (currentArtifact.parent_slug
        ? artifactSlugMap.get(currentArtifact.parent_slug)
        : undefined);

    if (parentArtifact) {
      redirect(
        `/artifact/${parentArtifact.slug}?image=${encodeURIComponent(
          currentArtifact.slug
        )}`
      );
    }
  }

  const breadcrumbIds = [
    currentArtifact.band_id,
    currentArtifact.album_id,
    currentArtifact.song_id,
  ].filter(Boolean) as string[];

  const breadcrumbs = breadcrumbIds
    .map((id) => artifactMap.get(id))
    .filter((item): item is Artifact => Boolean(item))
    .filter((item) => item.id !== currentArtifact.id)
    .map((item) => ({
      title: item.title,
      slug: item.slug,
    }));

  const childArtifacts = allArtifacts
    .filter(
      (candidate) =>
        candidate.parent_id === currentArtifact.id ||
        candidate.parent_slug === currentArtifact.slug
    )
    .sort((a, b) => {
      const sortA = a.sort_order ?? 0;
      const sortB = b.sort_order ?? 0;

      if (sortA !== sortB) return sortA - sortB;

      return a.title.localeCompare(b.title);
    });

  const songs = childArtifacts.filter(
    (child) => getArtifactType(child) === "Song"
  );
  const isBandPage = currentArtifactType === "Band";
  const isAlbumPage = currentArtifactType === "Album";
  const isSingleRelease = currentArtifactType === "Single";
  const presentationChildArtifacts = childArtifacts;

  const albums = childArtifacts.filter(
    (child) => ["Album", "Single"].includes(getArtifactType(child))
  );
  const bandReleases = isBandPage
    ? [...artifactMap.values()]
        .filter(
          (candidate) =>
            candidate.id !== currentArtifact.id &&
            ["Album", "Single"].includes(getArtifactType(candidate)) &&
            (candidate.band_id === currentArtifact.id ||
              candidate.parent_id === currentArtifact.id ||
              candidate.parent_slug === currentArtifact.slug)
        )
        .sort((a, b) => {
          const yearDifference = releaseYear(b) - releaseYear(a);
          if (yearDifference) return yearDifference;

          const sortDifference = (b.sort_order ?? 0) - (a.sort_order ?? 0);
          return sortDifference || a.title.localeCompare(b.title);
        })
    : [];
  const isPresentedAsSingle = (release: Artifact) =>
    getArtifactType(release) === "Single";
  const bandAlbums = bandReleases.filter(
    (release) => !isPresentedAsSingle(release)
  );
  const bandSingles = bandReleases.filter(isPresentedAsSingle);

  const artwork = presentationChildArtifacts.filter((child) =>
    ["Artwork", "Design", "Photo"].includes(getArtifactType(child))
  );

  const videos = presentationChildArtifacts.filter(
    (child) =>
      getArtifactType(child) === "Video" || child.video_url || child.youtube_url
  );
  const publishedVideos =
    currentArtifact.video_url || currentArtifact.youtube_url
      ? [currentArtifact, ...videos]
      : videos;

  const demos = presentationChildArtifacts.filter(
    (child) => getArtifactType(child) === "Demo"
  );

  const documents = presentationChildArtifacts.filter((child) =>
    ["Document", "Text"].includes(getArtifactType(child))
  );

  const audioChildren = presentationChildArtifacts.filter(
    (child) =>
      child.audio_url &&
      getArtifactType(child) !== "Song" &&
      getArtifactType(child) !== "Demo"
  );

  const miscellaneousChildren = presentationChildArtifacts.filter((child) => {
    const type = getArtifactType(child);

    return (
      !["Album", "Single", "Song", "Artwork", "Design", "Photo", "Video", "Demo", "Document", "Text"].includes(type) &&
      !child.audio_url &&
      !child.video_url &&
      !child.youtube_url
    );
  });
  const albumArtifact =
    ["Album", "Single"].includes(getArtifactType(currentArtifact))
      ? currentArtifact
      : currentArtifact.album_id
        ? artifactMap.get(currentArtifact.album_id)
        : undefined;
  const albumTracks = albumArtifact
    ? [...artifactMap.values()]
        .filter(
          (candidate) =>
            getArtifactType(candidate) === "Song" &&
            (candidate.parent_id === albumArtifact.id ||
              candidate.album_id === albumArtifact.id)
        )
        .sort((a, b) => {
          const orderDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          return orderDifference || a.title.localeCompare(b.title);
        })
    : [];
  const albumTrackPreviews = albumTracks.map((track) => {
    const trackChildren = [...artifactMap.values()]
      .filter(
        (candidate) =>
          candidate.id !== track.id &&
          (candidate.parent_id === track.id ||
            candidate.parent_slug === track.slug ||
            candidate.song_id === track.id)
      )
      .sort((a, b) => {
        const orderDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        return orderDifference || a.title.localeCompare(b.title);
      });
    const trackDemos = trackChildren.filter(
      (child) => getArtifactType(child) === "Demo"
    );
    const trackImages = trackChildren.filter((child) =>
      ["Artwork", "Design", "Photo"].includes(getArtifactType(child))
    );
    const trackVideos = trackChildren.filter(
      (child) =>
        getArtifactType(child) === "Video" ||
        Boolean(child.video_url) ||
        Boolean(child.youtube_url)
    );
    const categorizedIds = new Set(
      [...trackDemos, ...trackImages, ...trackVideos].map((child) => child.id)
    );
    const otherCategories = [
      ...new Set(
        trackChildren
          .filter((child) => !categorizedIds.has(child.id))
          .map((child) => getArtifactType(child).toLowerCase() || "other")
      ),
    ];

    return {
      id: track.id,
      slug: track.slug,
      title: track.title,
      audioUrl: track.audio_url || undefined,
      spotifyUrl: track.spotify_url || undefined,
      lyrics: track.lyrics || undefined,
      demos: trackDemos.map((demo) => ({
        id: demo.id,
        title: demo.title,
        audioUrl: demo.audio_url || undefined,
      })),
      images: trackImages.map((image) => ({
        id: image.id,
        title: image.title,
        imageUrl: image.image_url || undefined,
      })),
      videos: trackVideos.map((video) => ({
        id: video.id,
        title: video.title,
        imageUrl:
          video.image_url ||
          getYouTubeThumbnailUrl(video.youtube_url) ||
          undefined,
        videoUrl: video.video_url || undefined,
        youtubeUrl: video.youtube_url || undefined,
      })),
      otherCategories,
    };
  });
  const coverImageUrl =
    currentArtifact.image_url || albumArtifact?.image_url || null;
  const primaryAudioUrl =
    isAlbumPage ? null : currentArtifact.audio_url || null;
  const primarySpotifyUrl =
    currentArtifact.spotify_url || null;
  const primaryLyrics =
    isAlbumPage ? null : currentArtifact.lyrics || null;
  const presentationType = isSingleRelease ? "Single" : currentArtifactType;
  const archiveFloatImages = artwork
    .filter((item) => item.image_url)
    .map(artifactFloatImage);

  const ordinaryNearbyArtifacts = allArtifacts
    .map((candidate) => ({
      ...candidate,
      score: scoreNearby(currentArtifact, candidate),
      shared: sharedThreads(currentArtifact, candidate),
    }))
    .filter(
      (candidate) =>
        candidate.score > 0 &&
        ["Band", "Album", "Single", "Song"].includes(getArtifactType(candidate)) &&
        candidate.parent_id !== currentArtifact.id &&
        candidate.parent_slug !== currentArtifact.slug
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const hiddenNearbyArtifact =
    !canEdit &&
    currentArtifact.discovery_visibility !== "hidden" &&
    shouldRevealHiddenArtifact(currentArtifact.slug)
      ? hiddenArtifacts
          .map((candidate) => ({
            ...candidate,
            hiddenDiscovery: true,
            score: Math.max(scoreNearby(currentArtifact, candidate), 1),
            shared: sharedThreads(currentArtifact, candidate),
          }))
          .sort((a, b) => b.score - a.score)[0]
      : null;
  const nearbyArtifacts = hiddenNearbyArtifact
    ? [...ordinaryNearbyArtifacts.slice(0, 3), hiddenNearbyArtifact]
    : ordinaryNearbyArtifacts;

  if (artifactFloatMode) {
    const floatArtifactMap = new Map<string, FloatExperimentArtifact>();

    [
      artifactFloatExperimentArtifact(currentArtifact),
      ...childArtifacts.map((item) => artifactFloatExperimentArtifact(item)),
    ].forEach((item) => {
      floatArtifactMap.set(item.id, item);
    });

    const floatArtifacts = [...floatArtifactMap.values()];
    const experimentSeed = [...currentArtifact.slug].reduce(
      (total, char, index) => total + char.charCodeAt(0) * (index + 17),
      1701
    );

    return (
      <FloatExperiment
        artifacts={floatArtifacts}
        debugMode={artifactFloatDebugMode}
        controls={floatControls}
        returnHref={`/artifact/${currentArtifact.slug}`}
        seed={experimentSeed}
      />
    );
  }

  const { data: driftArtifact } = await supabase
    .from("artifacts")
    .select("slug")
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .neq("slug", currentArtifact.slug)
    .limit(1)
    .maybeSingle();

  if (view === "dossier") {
    return (
      <EditorialDossier
        artifact={currentArtifact}
        breadcrumbs={breadcrumbs}
        artwork={artwork}
        videos={publishedVideos}
        demos={demos}
        documents={documents}
        miscellaneous={miscellaneousChildren}
        nearby={nearbyArtifacts}
        canEdit={canEdit}
      />
    );
  }

  if (view === "scrapbook") {
    if (isBandPage) {
      return (
        <BandScrapbook
          artifact={currentArtifact}
          breadcrumbs={breadcrumbs}
          albums={bandAlbums}
          singles={bandSingles}
          nearby={nearbyArtifacts}
          canEdit={canEdit}
        />
      );
    }

    return (
      <VisualScrapbook
        artifact={currentArtifact}
        presentationType={presentationType}
        primaryAudioUrl={primaryAudioUrl}
        primarySpotifyUrl={primarySpotifyUrl}
        primaryLyrics={primaryLyrics}
        isAlbumPage={isAlbumPage}
        isSingleRelease={isSingleRelease}
        coverImageUrl={coverImageUrl}
        albumTrackPreviews={albumTrackPreviews}
        breadcrumbs={breadcrumbs}
        artwork={artwork}
        videos={publishedVideos}
        demos={demos}
        audioChildren={audioChildren}
        documents={documents}
        miscellaneous={miscellaneousChildren}
        nearby={nearbyArtifacts}
        canEdit={canEdit}
        initialImageSlug={initialImageSlug}
      />
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200 bg-[radial-gradient(circle_at_30%_20%,rgba(120,113,108,0.08),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(68,64,60,0.08),transparent_40%)]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <ArchiveTools artifact={currentArtifact} />}
        </div>

        <article className="mt-14 grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <aside>
            {(currentArtifact.image_url || canEdit) && <div className="overflow-hidden border border-stone-800 bg-stone-950">
              <ArchiveHeroImageDrop
                artifactId={currentArtifact.id}
                alt={currentArtifact.title}
                canEdit={canEdit}
                imageUrl={currentArtifact.image_url}
                label="Primary image"
                imageClassName="h-auto w-full object-cover opacity-90"
              />
            </div>}

            {currentArtifact.youtube_url && (
              <div className="mt-6 aspect-video w-full border border-stone-800 bg-black">
                <iframe
                  src={getVideoEmbedUrl(currentArtifact.youtube_url)}
                  title={currentArtifact.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}

            {!currentArtifact.youtube_url && currentArtifact.video_url && (
              <video
                controls
                src={currentArtifact.video_url}
                className="mt-6 w-full border border-stone-800 opacity-90"
              />
            )}

            {currentArtifact.spotify_url && (
              <SpotifyTrackEmbed
                title={currentArtifact.title}
                url={currentArtifact.spotify_url}
                className="mt-6"
              />
            )}

            {videos.length > 0 && (
              <div className="mt-8 space-y-6">
                {videos.map((child) => (
                  <div key={child.id}>
                    <Link
                      href={`/artifact/${child.slug}`}
                      className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-stone-700 transition hover:text-stone-500"
                    >
                      {child.title}
                    </Link>

                    {child.youtube_url ? (
                      <div className="aspect-video w-full border border-stone-800 bg-black">
                        <iframe
                          src={getVideoEmbedUrl(child.youtube_url)}
                          title={child.title}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        controls
                        src={child.video_url || ""}
                        className="w-full border border-stone-800 opacity-90"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section>
            <div className="flex flex-wrap items-center gap-3">
              {getArtifactType(currentArtifact) && (
                <span className="rounded-full border border-stone-800 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  {getArtifactType(currentArtifact)}
                </span>
              )}
            </div>

            <h1 className="mt-6 font-serif text-5xl text-stone-100 md:text-7xl">
              {currentArtifact.title}
            </h1>
            <div className="mt-6">
              <ArtifactImageExperience
                key={`${currentArtifact.slug}:${initialImageSlug || ""}`}
                images={archiveFloatImages}
                initialImageSlug={initialImageSlug}
                spotifyUrl={currentArtifact.spotify_url}
              />
            </div>

            {currentArtifact.audio_url && (
              <AudioFrame
                audioUrl={currentArtifact.audio_url}
                imageUrl={currentArtifact.image_url}
              />
            )}

            {currentArtifact.fragment && (
              <p className="mt-8 max-w-2xl text-2xl italic leading-relaxed text-stone-300">
                “{currentArtifact.fragment}”
              </p>
            )}

            {currentArtifact.description && (
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-400">
                {currentArtifact.description}
              </p>
            )}

            {(currentArtifact.album || currentArtifact.year || currentArtifact.era) && (
              <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-stone-600">
                {currentArtifact.album && <span>{currentArtifact.album}</span>}
                {currentArtifact.year && <span>{currentArtifact.year}</span>}
                {currentArtifact.era && <span>{currentArtifact.era}</span>}
              </div>
            )}

            {currentArtifact.lyrics && (
              <section className="mt-14 border-t border-stone-800 pt-10">
                <p className="mb-6 text-xs uppercase tracking-[0.3em] text-stone-600">
                  lyrics
                </p>

                <div className="whitespace-pre-line font-serif text-xl leading-loose text-stone-300">
                  {currentArtifact.lyrics}
                </div>
              </section>
            )}

            <ChildLinkList title="Albums" items={albums} />
            <ChildLinkList title="Songs" items={songs} />
            <ArtworkSection items={artwork} />
            <ChildLinkList title="Demos" items={demos} />
            <AudioChildrenSection items={audioChildren} />
            <ChildLinkList title="Documents" items={documents} />
            <ChildLinkList title="Other traces" items={miscellaneousChildren} />

            {nearbyArtifacts.length > 0 && (
              <div className="mt-14 border-t border-stone-900 pt-8">
                <p className="mb-5 text-[10px] uppercase tracking-[0.35em] text-stone-700">
                  Things nearby
                </p>

                <div className="space-y-1">
                  {nearbyArtifacts.map((nearby) => (
                    <Link
                      key={nearby.id}
                      href={`/artifact/${nearby.slug}`}
                      className="group block border-l border-stone-900 py-2 pl-4 transition hover:border-stone-700"
                    >
                      <p className="text-sm font-serif italic text-stone-600 group-hover:text-stone-400">
                        {nearby.title}
                      </p>

                      {nearby.fragment && (
                        <p className="mt-1 line-clamp-1 text-xs text-stone-800 group-hover:text-stone-600">
                          {nearby.fragment}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-14 flex flex-wrap gap-4">
              {driftArtifact?.slug && (
                <Link
                  href="/drift"
                  className="rounded-full border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950"
                >
                  Continue drifting
                </Link>
              )}

            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
