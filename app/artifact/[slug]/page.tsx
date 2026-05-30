import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  kind: string | null;
  description: string | null;
  fragment: string | null;
  atmosphere: string[] | null;
  motifs: string[] | null;
  nearby: string[] | null;
  image_url: string | null;
  audio_url: string | null;
  lyrics: string | null;
  parent_slug: string | null;
  video_url: string | null;
youtube_url: string | null;
album: string | null;
year: string | null;
era: string | null;
};

function normalizeList(items: string[] | null) {
  return (items || []).map((item) => item.toLowerCase().trim());
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

  if (current.kind && candidate.kind && current.kind === candidate.kind) {
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

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artifact, error } = await supabase
  .from("artifacts")
  .select(
    "id, slug, title, kind, description, fragment, atmosphere, motifs, nearby, image_url, audio_url, video_url, youtube_url, lyrics, album, year, era"
  )
  .eq("slug", slug)
  .single();

  if (error || !artifact) {
    notFound();
  }

  const { data: allArtifacts } = await supabase
  .from("artifacts")
  .select(
  "id, slug, title, kind, description, fragment, atmosphere, motifs, nearby, image_url, audio_url, video_url, youtube_url, parent_slug"
)
  .neq("slug", artifact.slug);

const nearbyArtifacts = ((allArtifacts || []) as Artifact[])
  .map((candidate) => ({
    ...candidate,
    score: scoreNearby(artifact as Artifact, candidate),
  }))
  .filter(
  (candidate) =>
    candidate.score > 0 && candidate.parent_slug !== artifact.slug
)
  .sort((a, b) => b.score - a.score)
  .slice(0, 4);

  const { data: childArtifacts } = await supabase
  .from("artifacts")
  .select("id, slug, title, kind, fragment, image_url, audio_url")
  .eq("parent_slug", artifact.slug)
  .order("created_at", { ascending: false });

  const { data: driftArtifact } = await supabase
    .from("artifacts")
    .select("slug")
    .neq("slug", artifact.slug)
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Elsewhere
        </Link>

        <article className="mt-14 grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <aside>
            {artifact.image_url ? (
              <div className="overflow-hidden border border-stone-800 border border-stone-800 bg-stone-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artifact.image_url}
                  alt={artifact.title}
                  className="h-auto w-full object-cover opacity-90"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-3xl border border-dashed border-stone-800 bg-stone-950/50 text-center">
                <p className="max-w-xs px-8 text-sm italic leading-relaxed text-stone-600">
                  Something is here, but it has not fully appeared.
                </p>
              </div>
            )}

            {artifact.audio_url && (
              <audio
                controls
                src={artifact.audio_url}
                className="mt-6 w-full opacity-80"
              />
            )}

            {artifact.youtube_url && (
  <div className="mt-6 aspect-video w-full border border-stone-800 bg-black">
    <iframe
      src={getYouTubeEmbedUrl(artifact.youtube_url)}
      title={artifact.title}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  </div>
)}

{!artifact.youtube_url && artifact.video_url && (
  <video
    controls
    src={artifact.video_url}
    className="mt-6 w-full border border-stone-800 opacity-90"
  />
)}

          </aside>

          <section>
            <div className="flex flex-wrap items-center gap-3">
  {artifact.kind && (
    <span className="rounded-full border border-stone-800 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-stone-500">
      {artifact.kind}
    </span>
  )}

  {artifact.atmosphere?.map((mood) => (
    <span
      key={mood}
      className="rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-500"
    >
      {mood}
    </span>
  ))}
</div>

            <h1 className="mt-6 text-5xl md:text-7xl font-serif text-stone-100">
              {artifact.title}
            </h1>

            {artifact.fragment && (
              <p className="mt-8 max-w-2xl text-2xl italic leading-relaxed text-stone-300">
                “{artifact.fragment}”
              </p>
            )}

            {artifact.description && (
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-400">
                {artifact.description}
              </p>
            )}

            {(artifact.album || artifact.year || artifact.era) && (
  <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-stone-600">
    {artifact.album && <span>{artifact.album}</span>}
    {artifact.year && <span>{artifact.year}</span>}
    {artifact.era && <span>{artifact.era}</span>}
  </div>
)}

{artifact.lyrics && (
  <section className="mt-14 border-t border-stone-800 pt-10">
    <p className="mb-6 text-xs uppercase tracking-[0.3em] text-stone-600">
      lyrics
    </p>

    <div className="whitespace-pre-line font-serif text-xl leading-loose text-stone-300">
      {artifact.lyrics}
    </div>
  </section>
)}

            {artifact.motifs && artifact.motifs.length > 0 && (
              <div className="mt-10">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-stone-600">
                  Motifs
                </p>

                <div className="flex flex-wrap gap-2">
                  {artifact.motifs.map((motif) => (
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

            {childArtifacts && childArtifacts.length > 0 && (
  <div className="mt-14 border-t border-stone-800 pt-8">
    <p className="mb-5 text-xs uppercase tracking-[0.3em] text-stone-600">
      Things left here
    </p>

    <div className="space-y-6">
      {childArtifacts
        .filter((child) => child.audio_url)
        .map((child) => (
          <div key={child.id} className="max-w-xl">
            <Link
              href={`/artifact/${child.slug}`}
              className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-stone-600 hover:text-stone-300"
            >
              {child.title}
            </Link>

            <audio
              controls
              src={child.audio_url || ""}
              className="w-full opacity-80"
            />
          </div>
        ))}

      <div className="flex flex-wrap gap-2">
        {childArtifacts
          .filter((child) => child.image_url && !child.audio_url)
          .map((child) => (
            <Link
              key={child.id}
              href={`/artifact/${child.slug}`}
              aria-label={child.title}
              className="group block transition opacity-80 hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={child.image_url || ""}
                alt={child.title}
                className="max-h-12 w-auto object-contain"
              />
            </Link>
          ))}
      </div>
    </div>
  </div>
)}

            {nearbyArtifacts.length > 0 && (
              <div className="mt-14 border-t border-stone-800 pt-8">
                <p className="mb-5 text-xs uppercase tracking-[0.3em] text-stone-600">
                  Things nearby
                </p>

                <div className="grid gap-3">
                  {nearbyArtifacts.map((nearby) => (
                    <Link
                      key={nearby.id}
                      href={`/artifact/${nearby.slug}`}
                      className="group rounded-2xl border border-stone-800 bg-stone-950/60 p-5 transition hover:border-stone-600"
                    >
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <p className="text-lg font-serif text-stone-200 group-hover:text-stone-100">
                            {nearby.title}
                          </p>

                          {nearby.fragment && (
                            <p className="mt-2 line-clamp-2 text-sm italic text-stone-500">
                              “{nearby.fragment}”
                            </p>
                          )}
                        </div>

                        <span className="text-stone-700 group-hover:text-stone-400">
                          →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-14 flex flex-wrap gap-4">
              {driftArtifact?.slug && (
                <Link
                  href={`/artifact/${driftArtifact.slug}`}
                  className="rounded-full border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950 transition"
                >
                  Continue drifting
                </Link>
              )}

              <Link
                href="/backroom"
                className="rounded-full border border-stone-800 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-500 hover:border-stone-500 hover:text-stone-200 transition"
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