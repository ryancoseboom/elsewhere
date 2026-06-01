import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import AudioFrame from "@/components/AudioFrame";
import AlbumTracklist, {
  type AlbumTrackPreview,
} from "@/components/AlbumTracklist";
import ArchiveImageDrop from "@/components/ArchiveImageDrop";
import ArtifactImageCaption from "@/components/ArtifactImageCaption";
import ArtifactImageExperience, {
  ArtifactImageButton,
} from "@/components/ArtifactImageExperience";
import ArtifactSectionOrder from "@/components/ArtifactSectionOrder";

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
  album: string | null;
  year: string | null;
  era: string | null;
  sort_order: number | null;
};

function normalizeList(items: string[] | null) {
  return (items || []).map((item) => item.toLowerCase().trim());
}

function getArtifactType(artifact: Artifact) {
  return artifact.artifact_type || artifact.kind || "";
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

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    return url;
  } catch {
    return "";
  }
}

function getYouTubeThumbnailUrl(url: string | null) {
  const embedUrl = getYouTubeEmbedUrl(url);
  const id = embedUrl.split("/embed/")[1]?.split("?")[0];

  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
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

            <audio
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
          <Link
            href={`/artifact/${crumb.slug}`}
            className="hover:text-stone-300"
          >
            {crumb.title}
          </Link>
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

function AddChildArtifactLink({ artifact }: { artifact: Artifact }) {
  return (
    <Link
      href={addChildHref(artifact)}
      className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:border-stone-400 hover:text-stone-100"
    >
      Add child artifact
    </Link>
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
  const textures = [
    "/textures/photocopy-noise.png",
    "/textures/fingerprint-smudge.png",
    "/textures/dust-scratches.png",
  ];

  return (
    <div
      className={`relative flex min-h-44 items-end overflow-hidden border border-stone-800 bg-stone-900 p-4 ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.35), rgba(12,10,9,0.88)), url(${textures[index % textures.length]})`,
        backgroundSize: "cover",
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
}: {
  item?: Artifact;
  className?: string;
  index?: number;
  dropTargetArtifactId?: string;
  order?: { canMoveUp: boolean; canMoveDown: boolean; canDelete?: boolean };
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
            className="absolute inset-0"
            imageClassName="absolute inset-0 h-full w-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-95"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(12,10,9,0.2), rgba(12,10,9,0.9)), url(/textures/photocopy-noise.png)",
              backgroundSize: "cover",
            }}
          />
        )}
        {order && (
          <span className="absolute right-2 top-2">
            <ArtifactSectionOrder artifactId={item.id} {...order} />
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
                <Link
                  href={`/artifact/${item.slug}`}
                  className="text-sm font-serif text-stone-300 hover:text-white"
                >
                  {item.title}
                </Link>
                {canEdit && (
                  <ArtifactSectionOrder
                    artifactId={item.id}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                    canDelete
                    deleteKind="video"
                  />
                )}
              </div>
              {item.audio_url && (
                <audio
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

function VideoGallery({
  items,
  placeholder,
  canEdit = false,
}: {
  items: Artifact[];
  placeholder: string;
  canEdit?: boolean;
}) {
  return (
    <section className="border-t border-stone-800 pt-6">
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
        Videos
      </p>
      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Link
                  href={`/artifact/${item.slug}`}
                  className="block text-sm font-serif text-stone-300 hover:text-white"
                >
                  {item.title}
                </Link>
                {canEdit && item.parent_id && (
                  <ArtifactSectionOrder
                    artifactId={item.id}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                  />
                )}
              </div>
              {item.youtube_url ? (
                <div className="aspect-video border border-stone-800 bg-black">
                  <iframe
                    src={getYouTubeEmbedUrl(item.youtube_url)}
                    title={item.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  controls
                  src={item.video_url || ""}
                  className="w-full border border-stone-800 opacity-90"
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

function RelatedGrid({ items }: { items: Artifact[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
        Related and similar artifacts
      </p>
      <div className="grid gap-px bg-stone-800 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/artifact/${item.slug}`}
            className="bg-neutral-950 p-4 transition hover:bg-stone-900"
          >
            <p className="font-serif text-lg text-stone-300">{item.title}</p>
            {item.fragment && (
              <p className="mt-2 line-clamp-2 text-xs italic leading-5 text-stone-600">
                {item.fragment}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
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
    .map((item) => ({ src: item.image_url || "", alt: item.title }));

  return (
    <main className="min-h-screen bg-[#0b0a09] px-6 py-10 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <AddChildArtifactLink artifact={artifact} />}
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
            <ArtifactImageExperience images={floatImages} />
          </div>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <section>
            {artifact.image_url ? (
              <ArtifactImageButton
                src={artifact.image_url}
                alt={artifact.title}
                alwaysColor
                className="block w-full"
                imageClassName="max-h-[42rem] w-full border border-stone-800 object-cover opacity-90"
              />
            ) : (
              <PlaceholderVisual
                label="Primary cover"
                className="min-h-[28rem]"
              />
            )}

            {artifact.audio_url ? (
              <AudioFrame
                audioUrl={artifact.audio_url}
                imageUrl={artifact.image_url}
              />
            ) : (
              <p className="mt-4 border border-stone-800 p-4 text-xs uppercase tracking-[0.2em] text-stone-700">
                Primary recording awaiting audio file
              </p>
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

            <MediaList
              title="Demo versions"
              items={demos}
              placeholder="Demo versions can be attached here as child artifacts."
            />
            <MediaList
              title="Promotional material"
              items={documents}
              placeholder="Press sheets, flyers, and promotional documents will collect here."
            />
          </aside>
        </div>

        <section className="mt-14">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-stone-600">
            Alternate covers and visual miscellania
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <VisualCard
                key={visualItems[index]?.id || `placeholder-${index}`}
                item={visualItems[index]}
                index={index}
              />
            ))}
          </div>
        </section>

        <VideoGallery
          items={videos}
          placeholder="Official videos, live fragments, and visual companions will collect here."
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
  coverImageUrl,
  albumTrackPreviews,
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
  coverImageUrl: string | null;
  albumTrackPreviews: AlbumTrackPreview[];
  breadcrumbs: { title: string; slug: string }[];
  artwork: Artifact[];
  videos: Artifact[];
  demos: Artifact[];
  documents: Artifact[];
  miscellaneous: Artifact[];
  nearby: Artifact[];
  canEdit: boolean;
}) {
  const visualItems = [...artwork, ...miscellaneous, ...documents];
  const floatImages = visualItems
    .filter((item) => item.image_url)
    .map((item) => ({ src: item.image_url || "", alt: item.title }));
  const visualSlotCount = Math.max(
    4,
    visualItems.length + (canEdit ? 1 : 0)
  );

  return (
    <main className="min-h-screen bg-[#11100e] px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <AddChildArtifactLink artifact={artifact} />}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
          <aside>
            {coverImageUrl ? (
              <div className="border border-stone-700 bg-black p-3">
                <ArtifactImageButton
                  src={coverImageUrl}
                  alt={`${artifact.title} cover`}
                  alwaysColor
                  className="block w-full"
                  imageClassName="h-auto w-full object-contain"
                />
              </div>
            ) : (
              <PlaceholderVisual
                label="Cover image"
                className="aspect-square min-h-0"
              />
            )}

            {albumTrackPreviews.length > 0 && (
              <AlbumTracklist
                tracks={albumTrackPreviews}
                currentArtifactId={artifact.id}
              />
            )}

            {artifact.audio_url && (
              <AudioFrame
                audioUrl={artifact.audio_url}
                imageUrl={artifact.image_url}
              />
            )}

            <div className="mt-12 space-y-8">
              <MediaList
                title="Demo versions and alternate takes"
                items={demos}
                placeholder="Alternate recordings will appear here when attached."
                canEdit={canEdit}
              />
              <VideoGallery
                items={videos}
                placeholder="Moving-image fragments will appear here when attached."
                canEdit={canEdit}
              />
              <MediaList
                title="Promotional traces"
                items={documents}
                placeholder="Flyers, clippings, and press materials will appear here."
              />
              <RelatedGrid items={nearby} />
            </div>
          </aside>

          <section>
            <p className="text-[10px] uppercase tracking-[0.42em] text-stone-500">
              recovered signal / {getArtifactType(artifact)}
            </p>
            <h1 className="mt-4 font-serif text-7xl leading-none text-stone-100 md:text-9xl">
              {artifact.title}
            </h1>
            <div className="mt-6">
              <ArtifactImageExperience images={floatImages} />
            </div>
            {artifact.fragment && (
              <p className="mt-5 max-w-2xl font-serif text-xl italic leading-8 text-stone-300">
                “{artifact.fragment}”
              </p>
            )}

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

            {artifact.lyrics && (
              <section className="mt-12 border-t border-stone-800 pt-8">
                <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-stone-600">
                  Lyrics / recovered text
                </p>
                <div className="whitespace-pre-line font-serif text-xl leading-9 text-stone-300">
                  {artifact.lyrics}
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
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { slug } = await params;
  const requestedView = (await searchParams).view;
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

  const { data: artifact, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, band_id, album_id, song_id, parent_slug, description, fragment, atmosphere, motifs, nearby, image_url, audio_url, video_url, youtube_url, lyrics, album, year, era, sort_order"
    )
    .eq("slug", slug)
    .single();

  if (error || !artifact) {
    notFound();
  }

  const currentArtifact = artifact as Artifact;

  const { data: allArtifactsData } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, band_id, album_id, song_id, parent_slug, description, fragment, atmosphere, motifs, nearby, image_url, audio_url, video_url, youtube_url, lyrics, album, year, era, sort_order"
    )
    .neq("slug", currentArtifact.slug);

  const allArtifacts = (allArtifactsData || []) as Artifact[];

  const artifactMap = new Map<string, Artifact>();
  allArtifacts.forEach((item) => artifactMap.set(item.id, item));
  artifactMap.set(currentArtifact.id, currentArtifact);

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

  const albums = childArtifacts.filter(
    (child) => getArtifactType(child) === "Album"
  );

  const artwork = childArtifacts.filter((child) =>
    ["Artwork", "Design", "Photo"].includes(getArtifactType(child))
  );

  const videos = childArtifacts.filter(
    (child) =>
      getArtifactType(child) === "Video" || child.video_url || child.youtube_url
  );
  const publishedVideos =
    currentArtifact.video_url || currentArtifact.youtube_url
      ? [currentArtifact, ...videos]
      : videos;

  const demos = childArtifacts.filter(
    (child) => getArtifactType(child) === "Demo"
  );

  const documents = childArtifacts.filter((child) =>
    ["Document", "Text"].includes(getArtifactType(child))
  );

  const audioChildren = childArtifacts.filter(
    (child) =>
      child.audio_url &&
      getArtifactType(child) !== "Song" &&
      getArtifactType(child) !== "Demo"
  );

  const miscellaneousChildren = childArtifacts.filter((child) => {
    const type = getArtifactType(child);

    return (
      !["Album", "Song", "Artwork", "Design", "Photo", "Video", "Demo", "Document", "Text"].includes(type) &&
      !child.audio_url &&
      !child.video_url &&
      !child.youtube_url
    );
  });
  const albumArtifact =
    getArtifactType(currentArtifact) === "Album"
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
  const archiveFloatImages = artwork
    .filter((item) => item.image_url)
    .map((item) => ({ src: item.image_url || "", alt: item.title }));

  const nearbyArtifacts = allArtifacts
    .map((candidate) => ({
      ...candidate,
      score: scoreNearby(currentArtifact, candidate),
    }))
    .filter(
      (candidate) =>
        candidate.score > 0 &&
        candidate.parent_id !== currentArtifact.id &&
        candidate.parent_slug !== currentArtifact.slug
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const { data: driftArtifact } = await supabase
    .from("artifacts")
    .select("slug")
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
    return (
      <VisualScrapbook
        artifact={currentArtifact}
        coverImageUrl={coverImageUrl}
        albumTrackPreviews={albumTrackPreviews}
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

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200 bg-[radial-gradient(circle_at_30%_20%,rgba(120,113,108,0.08),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(68,64,60,0.08),transparent_40%)]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs crumbs={breadcrumbs} />
          {canEdit && <AddChildArtifactLink artifact={currentArtifact} />}
        </div>

        <article className="mt-14 grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <aside>
            {currentArtifact.image_url ? (
              <div className="overflow-hidden border border-stone-800 bg-stone-950">
                <ArtifactImageButton
                  src={currentArtifact.image_url}
                  alt={currentArtifact.title}
                  alwaysColor
                  className="block w-full"
                  imageClassName="h-auto w-full object-cover opacity-90"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center border border-dashed border-stone-800 bg-stone-950/50 text-center">
                <p className="max-w-xs px-8 text-sm italic leading-relaxed text-stone-600">
                  Something is here, but it has not fully appeared.
                </p>
              </div>
            )}

            {currentArtifact.youtube_url && (
              <div className="mt-6 aspect-video w-full border border-stone-800 bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(currentArtifact.youtube_url)}
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
                          src={getYouTubeEmbedUrl(child.youtube_url)}
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

              {(currentArtifact.atmosphere || []).map((mood) => (
                <span
                  key={mood}
                  className="rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-500"
                >
                  {mood}
                </span>
              ))}
            </div>

            <h1 className="mt-6 font-serif text-5xl text-stone-100 md:text-7xl">
              {currentArtifact.title}
            </h1>
            <div className="mt-6">
              <ArtifactImageExperience images={archiveFloatImages} />
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

            {currentArtifact.motifs && currentArtifact.motifs.length > 0 && (
              <div className="mt-10">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-stone-600">
                  Motifs
                </p>

                <div className="flex flex-wrap gap-2">
                  {currentArtifact.motifs.map((motif) => (
                    <span
                      key={motif}
                      className="rounded-full border border-stone-800 px-4 py-2 text-xs text-stone-500"
                    >
                      {motif}
                    </span>
                  ))}
                </div>
              </div>
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

              <Link
                href="/backroom"
                className="rounded-full border border-stone-800 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
              >
                Backroom
              </Link>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
