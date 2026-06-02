import Link from "next/link";
import { notFound } from "next/navigation";
import ArchiveBranch from "@/components/ArchiveBranch";
import { createClient } from "@/lib/supabase/server";
import {
  artifactType,
  sharedThreads,
  shuffle,
  type ArchiveArtifact,
} from "@/lib/archive-navigation";
import { getYouTubeThumbnailUrl } from "@/lib/video";

type DriftReading = {
  key: string;
  prompt: string;
};

type SignalPreview = {
  artifact: ArchiveArtifact;
  imageUrl: string;
  videoUrl: string;
};

function driftReadings(
  current: ArchiveArtifact,
  candidate: ArchiveArtifact
): DriftReading[] {
  const readings: DriftReading[] = [];

  if (
    candidate.parent_id === current.id ||
    candidate.album_id === current.id ||
    candidate.song_id === current.id
  ) {
    readings.push({ key: "deeper", prompt: "Move deeper into the signal" });
  }

  if (
    current.parent_id === candidate.id ||
    current.album_id === candidate.id ||
    current.song_id === candidate.id
  ) {
    readings.push({
      key: "larger-shape",
      prompt: "Return to the larger shape",
    });
  }

  if (
    current.album_id &&
    (current.album_id === candidate.album_id ||
      current.album_id === candidate.id ||
      candidate.album_id === current.id)
  ) {
    readings.push({ key: "release", prompt: "Hear another room in the release" });
  }

  if (
    current.song_id &&
    (current.song_id === candidate.song_id ||
      current.song_id === candidate.id ||
      candidate.song_id === current.id)
  ) {
    readings.push({ key: "song", prompt: "Follow this song into another form" });
  }

  const candidateAtmosphere = new Set(
    (candidate.atmosphere || []).map((thread) => thread.toLowerCase().trim())
  );
  const candidateMotifs = new Set(
    (candidate.motifs || []).map((thread) => thread.toLowerCase().trim())
  );

  (current.atmosphere || []).forEach((thread) => {
    if (candidateAtmosphere.has(thread.toLowerCase().trim())) {
      readings.push({
        key: `atmosphere:${thread.toLowerCase().trim()}`,
        prompt: `Stay inside ${thread.toLowerCase()}`,
      });
    }
  });

  (current.motifs || []).forEach((thread) => {
    if (candidateMotifs.has(thread.toLowerCase().trim())) {
      readings.push({
        key: `motif:${thread.toLowerCase().trim()}`,
        prompt: `Follow the ${thread.toLowerCase()} motif`,
      });
    }
  });

  if (current.band_id && current.band_id === candidate.band_id) {
    readings.push({
      key: "transmission",
      prompt: "Remain with this transmission",
    });
  }

  if (candidate.image_url?.trim()) {
    readings.push({ key: "image", prompt: "Let an image choose the way" });
  }

  if (candidate.video_url?.trim() || candidate.youtube_url?.trim()) {
    readings.push({ key: "video", prompt: "Enter the moving image" });
  }

  if (candidate.audio_url?.trim()) {
    readings.push({ key: "audio", prompt: "Follow the sound beneath it" });
  }

  if (candidate.lyrics?.trim()) {
    readings.push({ key: "lyrics", prompt: "Read the words under the signal" });
  }

  if (candidate.fragment?.trim()) {
    readings.push({ key: "fragment", prompt: "Trust a recovered phrase" });
  }

  if (artifactType(candidate) === "Album") {
    readings.push({ key: "album", prompt: "Open a larger constellation" });
  }

  if (artifactType(candidate) === "Song") {
    readings.push({ key: "song-instinct", prompt: "Follow a song by instinct" });
  }

  readings.push({ key: "chance", prompt: "Take an unmarked passage" });

  return readings;
}

function chooseDirections(
  current: ArchiveArtifact,
  artifacts: ArchiveArtifact[],
  trail: string[]
) {
  const candidates = artifacts.filter(
    (artifact) => artifact.id !== current.id && !trail.includes(artifact.slug)
  );
  const possibilities = shuffle(
    candidates.flatMap((artifact) =>
      driftReadings(current, artifact).map((reading) => ({ artifact, reading }))
    )
  );
  const chosen: (typeof possibilities)[number][] = [];
  const artifactIds = new Set<string>();
  const readingKeys = new Set<string>();

  possibilities.forEach((possibility) => {
    if (
      chosen.length < 3 &&
      !artifactIds.has(possibility.artifact.id) &&
      !readingKeys.has(possibility.reading.key)
    ) {
      chosen.push(possibility);
      artifactIds.add(possibility.artifact.id);
      readingKeys.add(possibility.reading.key);
    }
  });

  possibilities.forEach((possibility) => {
    if (chosen.length < 3 && !artifactIds.has(possibility.artifact.id)) {
      chosen.push(possibility);
      artifactIds.add(possibility.artifact.id);
    }
  });

  return chosen;
}

function signalPreview(artifact: ArchiveArtifact): SignalPreview | null {
  const imageUrl =
    artifact.image_url?.trim() ||
    getYouTubeThumbnailUrl(artifact.youtube_url) ||
    "";
  const videoUrl = artifact.video_url?.trim() || "";

  if (!imageUrl && !videoUrl) return null;

  return { artifact, imageUrl, videoUrl };
}

function chooseSignalPreviews(groups: ArchiveArtifact[][]) {
  const previews: SignalPreview[] = [];
  const seenMedia = new Set<string>();

  groups.forEach((group) => {
    shuffle(group).forEach((artifact) => {
      const preview = signalPreview(artifact);
      const identity = preview?.imageUrl || preview?.videoUrl;

      if (preview && identity && !seenMedia.has(identity)) {
        previews.push(preview);
        seenMedia.add(identity);
      }
    });
  });

  return previews.slice(0, 4);
}

function isAttachedTo(
  current: ArchiveArtifact,
  candidate: ArchiveArtifact
) {
  return (
    candidate.id !== current.id &&
    (candidate.parent_id === current.id ||
      candidate.parent_slug === current.slug ||
      candidate.song_id === current.id ||
      candidate.album_id === current.id ||
      (candidate.band_id === current.id &&
        ["Album", "Single"].includes(artifactType(candidate))))
  );
}

export default async function DriftArtifactPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trail?: string | string[] }>;
}) {
  const { slug } = await params;
  const rawTrail = (await searchParams).trail;
  const trailValue = Array.isArray(rawTrail) ? rawTrail[0] : rawTrail || "";
  const trail = trailValue.split(",").filter(Boolean).slice(-7);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, year, atmosphere, motifs, image_url, audio_url, video_url, youtube_url, lyrics, fragment, description, drift_weight"
    )
    .eq("is_public", true);

  if (error) throw new Error(error.message);

  const artifacts = (data || []).map((artifact) => ({
    ...artifact,
    kind: artifact.artifact_type || artifact.kind,
  })) as ArchiveArtifact[];
  const current = artifacts.find((artifact) => artifact.slug === slug);

  if (!current) notFound();

  const candidates = chooseDirections(current, artifacts, trail);
  const nextTrail = [...trail, current.slug].slice(-7);
  const trailArtifacts = nextTrail
    .map((trailSlug) => artifacts.find((artifact) => artifact.slug === trailSlug))
    .filter((artifact): artifact is ArchiveArtifact => Boolean(artifact));
  const attachedArtifacts = artifacts.filter((artifact) =>
    isAttachedTo(current, artifact)
  );
  const previewNeighbors = artifacts.filter(
    (artifact) =>
      artifact.id !== current.id && sharedThreads(current, artifact).length > 0
  );
  const visualPreviews = chooseSignalPreviews([
    [current, ...attachedArtifacts],
    candidates.map(({ artifact }) => artifact),
    previewNeighbors,
    artifacts,
  ]);
  const audioPreviews = shuffle([current, ...attachedArtifacts])
    .filter((artifact) => artifact.audio_url?.trim())
    .slice(0, 2);
  const backdrop = shuffle(
    artifacts.filter((artifact) => artifact.image_url?.trim())
  ).slice(0, 12);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090807] px-6 py-8 text-stone-200">
      <div className="absolute inset-0 opacity-55">
        <div className="grid h-full grid-cols-4 grid-rows-3 gap-1 p-1 md:grid-cols-6">
          {backdrop.map((artifact, index) => (
            <div
              key={`${artifact.slug}-${index}`}
              className="relative overflow-hidden bg-stone-950"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artifact.image_url || ""}
                alt=""
                className="h-full w-full object-cover opacity-55"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(9,8,7,0.22),rgba(9,8,7,0.91)_72%)]" />
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-5">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.34em] text-stone-400 transition hover:text-white"
          >
            ← Elsewhere
          </Link>
          <Link
            href="/drift"
            className="border border-stone-700 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-stone-300 transition hover:border-stone-300 hover:text-white"
          >
            Lose the thread
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <section>
            <p className="text-[10px] uppercase tracking-[0.44em] text-stone-400">
              Drift / {artifactType(current) || "signal"}
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-6xl leading-none text-stone-100 md:text-8xl">
              {current.title}
            </h1>
            {current.fragment && (
              <p className="mt-7 max-w-2xl font-serif text-2xl italic leading-9 text-stone-300">
                “{current.fragment}”
              </p>
            )}
            {current.description && (
              <p className="mt-6 max-w-xl text-sm leading-7 text-stone-300">
                {current.description}
              </p>
            )}
            {(visualPreviews.length > 0 || audioPreviews.length > 0) && (
              <div className="mt-9 max-w-2xl border-t border-stone-700/80 pt-5">
                <p className="text-[9px] uppercase tracking-[0.34em] text-stone-500">
                  Signal previews
                </p>
                {visualPreviews.length > 0 && (
                  <div className="mt-4 grid max-w-3xl grid-cols-2 gap-2">
                    {visualPreviews.map((preview) => (
                      <Link
                        key={preview.artifact.id}
                        href={`/artifact/${preview.artifact.slug}`}
                        className="group relative aspect-[4/3] overflow-hidden bg-black/70"
                      >
                        {preview.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview.imageUrl}
                            alt={preview.artifact.title}
                            className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:opacity-100"
                          />
                        ) : (
                          <video
                            muted
                            playsInline
                            preload="metadata"
                            src={preview.videoUrl}
                            className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:opacity-100"
                          />
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-stone-400 opacity-0 transition group-hover:opacity-100">
                          {artifactType(preview.artifact) || "signal"} /{" "}
                          {preview.artifact.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {audioPreviews.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {audioPreviews.map((preview) => (
                      <div key={preview.id}>
                        <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-stone-500">
                          {preview.title}
                        </p>
                        <audio
                          controls
                          preload="metadata"
                          src={preview.audio_url || ""}
                          className="h-8 w-full max-w-md opacity-70"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link
              href={`/artifact/${current.slug}`}
              className="mt-8 inline-block border border-stone-600 bg-black/50 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-stone-300 transition hover:border-stone-300 hover:text-white"
            >
              Open artifact
            </Link>
          </section>

          <aside>
            <p className="text-center text-[10px] uppercase tracking-[0.34em] text-stone-300">
              Choose a direction
            </p>
            <div className="mx-auto mt-4 w-fit px-5 py-3 text-center">
              <p className="font-serif text-xl text-stone-100">{current.title}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-stone-500">
                Current signal
              </p>
            </div>
            <div className="mx-auto h-8 w-px bg-cyan-700/80" />
            <div className="mx-auto h-px w-4/5 bg-cyan-800/80" />
            <div className="space-y-1 border-l border-cyan-900/80 pl-12">
              {candidates.map(({ artifact, reading }, index) => (
                <div key={artifact.id} className="relative">
                  <ArchiveBranch
                    className="-left-12 top-0 h-14 w-12"
                    color={["#7c8f72", "#a15c74", "#527c91"][index % 3]}
                  />
                  <Link
                    href={`/drift/${artifact.slug}?trail=${encodeURIComponent(nextTrail.join(","))}`}
                    className="group block px-2 py-3 transition"
                  >
                    <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400 transition group-hover:text-white">
                      {reading.prompt}
                    </p>
                    <p className="mt-1 font-serif text-lg text-stone-200 transition group-hover:text-white">
                      {artifact.title}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <footer className="border-t border-stone-700 pt-4">
          <p className="text-[9px] uppercase tracking-[0.28em] text-stone-500">
            Path so far
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            {trailArtifacts.map((artifact, index) => (
              <span
                key={`${artifact.slug}-${index}`}
                className="text-[10px] uppercase tracking-[0.18em] text-stone-400"
              >
                {index > 0 && <span className="mr-3 text-stone-800">→</span>}
                {artifact.title}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
