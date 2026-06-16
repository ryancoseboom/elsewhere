import Link from "next/link";
import BackroomMediaLabelEditor from "@/components/BackroomMediaLabelEditor";
import { createClient } from "@/lib/supabase/server";
import { getYouTubeThumbnailUrl } from "@/lib/video";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  artifact_type: string | null;
  kind: string | null;
  parent_id: string | null;
  parent_slug: string | null;
  image_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
};

type MediaKind = "image" | "video" | "demo";

function artifactType(artifact: Artifact) {
  return artifact.artifact_type || artifact.kind || "";
}

function parentLabel(artifact: Artifact, artifactsById: Map<string, Artifact>) {
  return (
    (artifact.parent_id && artifactsById.get(artifact.parent_id)?.title) ||
    artifact.parent_slug ||
    "Unattached"
  );
}

function MediaPreview({
  artifact,
  kind,
  parentImageUrl,
}: {
  artifact: Artifact;
  kind: MediaKind;
  parentImageUrl?: string | null;
}) {
  const imageUrl =
    artifact.image_url ||
    (kind === "video" ? getYouTubeThumbnailUrl(artifact.youtube_url) : "") ||
    parentImageUrl ||
    "";

  return (
    <div className="relative flex aspect-[4/3] w-32 shrink-0 items-center justify-center overflow-hidden border border-stone-800 bg-stone-950 sm:w-40">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-85"
        />
      ) : artifact.video_url ? (
        <video
          muted
          playsInline
          preload="metadata"
          src={artifact.video_url}
          className="h-full w-full object-cover opacity-80"
        />
      ) : (
        <span className="px-3 text-center text-[9px] uppercase tracking-[0.22em] text-stone-700">
          {kind}
        </span>
      )}
      <span className="absolute bottom-2 left-2 bg-black/75 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-stone-400">
        {kind}
      </span>
    </div>
  );
}

function MediaSection({
  artifacts,
  artifactsById,
  kind,
  title,
}: {
  artifacts: Artifact[];
  artifactsById: Map<string, Artifact>;
  kind: MediaKind;
  title: string;
}) {
  return (
    <section className="border-t border-stone-800 pt-7">
      <div className="mb-5 flex items-end justify-between gap-5">
        <h2 className="font-serif text-3xl text-stone-100">{title}</h2>
        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-600">
          {artifacts.length} {artifacts.length === 1 ? "label" : "labels"}
        </p>
      </div>

      {artifacts.length > 0 ? (
        <div className="grid gap-4">
          {artifacts.map((artifact) => {
            const parent = artifact.parent_id
              ? artifactsById.get(artifact.parent_id)
              : undefined;

            return (
              <article
                key={artifact.id}
                className="flex gap-4 border border-stone-800 bg-stone-950/55 p-3 sm:items-center"
              >
                <MediaPreview
                  artifact={artifact}
                  kind={kind}
                  parentImageUrl={parent?.image_url}
                />
                <div className="min-w-0 flex-1">
                  <BackroomMediaLabelEditor
                    artifactId={artifact.id}
                    title={artifact.title}
                  />
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.18em] text-stone-700">
                    <span>{parentLabel(artifact, artifactsById)}</span>
                    {artifact.parent_slug && (
                      <Link
                        href={`/artifact/${artifact.parent_slug}`}
                        className="transition hover:text-stone-300"
                      >
                        Visit parent
                      </Link>
                    )}
                    <Link
                      href={`/backroom/artifacts/${artifact.slug}/edit`}
                      className="transition hover:text-stone-300"
                    >
                      Full edit
                    </Link>
                  </div>
                  {kind === "demo" && artifact.audio_url && (
                    <audio
                      controls
                      preload="none"
                      src={artifact.audio_url}
                      className="mt-4 h-8 w-full max-w-xl opacity-75"
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-sm italic text-stone-700">No {title.toLowerCase()} yet.</p>
      )}
    </section>
  );
}

export default async function BackroomMediaLabelsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, artifact_type, kind, parent_id, parent_slug, image_url, audio_url, video_url, youtube_url"
    )
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);

  const artifacts = (data || []) as Artifact[];
  const artifactsById = new Map(
    artifacts.map((artifact) => [artifact.id, artifact])
  );
  const images = artifacts.filter((artifact) =>
    ["Artwork", "Design", "Photo"].includes(artifactType(artifact))
  );
  const videos = artifacts.filter(
    (artifact) => artifactType(artifact) === "Video"
  );
  const demos = artifacts.filter(
    (artifact) => artifactType(artifact) === "Demo"
  );

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-stone-200">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-stone-800 pb-8">
          <Link
            href="/backroom"
            className="text-[10px] uppercase tracking-[0.3em] text-stone-600 transition hover:text-stone-300"
          >
            ← Backroom
          </Link>
          <p className="mt-10 text-[10px] uppercase tracking-[0.42em] text-stone-600">
            Archive maintenance
          </p>
          <h1 className="mt-4 font-serif text-5xl text-stone-100 md:text-7xl">
            Media labels
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-500">
            Rewrite image captions, video labels, and demo names in one place.
            Edit a label, then save the item when it feels right.
          </p>
        </header>

        <div className="mt-10 space-y-14">
          <MediaSection
            artifacts={images}
            artifactsById={artifactsById}
            kind="image"
            title="Images"
          />
          <MediaSection
            artifacts={videos}
            artifactsById={artifactsById}
            kind="video"
            title="Videos"
          />
          <MediaSection
            artifacts={demos}
            artifactsById={artifactsById}
            kind="demo"
            title="Demos"
          />
        </div>
      </div>
    </main>
  );
}
