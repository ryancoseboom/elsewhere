import Link from "next/link";
import { notFound } from "next/navigation";
import ArchiveBranch from "@/components/ArchiveBranch";
import { createClient } from "@/lib/supabase/server";
import {
  artifactType,
  shuffle,
  type ArchiveArtifact,
} from "@/lib/archive-navigation";
import {
  ARCHIVE_MAP_COLORS,
  DRIFT_DIRECTION_COLORS,
} from "@/lib/archive-map-colors";
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

type BackdropTile = {
  imageUrl: string;
  residue: boolean;
};

function isImageOnlyArtifact(artifact: ArchiveArtifact) {
  return ["Artwork", "Design", "Photo"].includes(artifactType(artifact));
}

function artifactOpenHref(artifact: ArchiveArtifact) {
  if (isImageOnlyArtifact(artifact) && artifact.parent_slug) {
    return `/artifact/${artifact.parent_slug}?image=${encodeURIComponent(
      artifact.slug
    )}`;
  }

  return `/artifact/${artifact.slug}`;
}

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

function representativePreview(
  artifact: ArchiveArtifact,
  artifacts: ArchiveArtifact[]
) {
  return (
    signalPreview(artifact) ||
    shuffle(artifacts.filter((candidate) => isAttachedTo(artifact, candidate)))
      .map(signalPreview)
      .find((preview): preview is SignalPreview => Boolean(preview)) ||
    null
  );
}

function uniqueBackdrop(
  residueArtifacts: ArchiveArtifact[],
  artifacts: ArchiveArtifact[]
) {
  const backdrop: BackdropTile[] = [];
  const imageUrls = new Set<string>();

  function add(imageUrl: string, residue: boolean) {
    const normalizedUrl = imageUrl.trim();

    if (!normalizedUrl || imageUrls.has(normalizedUrl)) return;

    backdrop.push({ imageUrl: normalizedUrl, residue });
    imageUrls.add(normalizedUrl);
  }

  shuffle(residueArtifacts).forEach((artifact) => {
    const preview = representativePreview(artifact, artifacts);

    if (preview?.imageUrl) add(preview.imageUrl, true);
  });

  shuffle(artifacts).forEach((artifact) => {
    if (backdrop.length < 12 && artifact.image_url) {
      add(artifact.image_url, false);
    }
  });

  return backdrop.slice(0, 12);
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
  const residueArtifacts = trailArtifacts.slice(0, -1);
  const residueMotifs = [
    ...new Set(
      residueArtifacts.flatMap((artifact) =>
        (artifact.motifs || []).map((motif) => motif.trim()).filter(Boolean)
      )
    ),
  ];
  const residueFragments = [
    ...new Set(
      residueArtifacts
        .map((artifact) => artifact.fragment?.trim())
        .filter((fragment): fragment is string => Boolean(fragment))
    ),
  ].slice(-2);
  const attachedArtifacts = artifacts.filter((artifact) =>
    isAttachedTo(current, artifact)
  );
  const currentPreview = representativePreview(current, artifacts);
  const directionPreviews = candidates
    .map(({ artifact, reading }, index) => ({
      artifact,
      reading,
      color: DRIFT_DIRECTION_COLORS[index],
      number: index + 1,
      preview: representativePreview(artifact, artifacts),
    }))
    .filter(
      (direction): direction is typeof direction & { preview: SignalPreview } =>
        Boolean(direction.preview)
    );
  const audioPreviews = shuffle([current, ...attachedArtifacts])
    .filter((artifact) => artifact.audio_url?.trim())
    .slice(0, 2);
  const backdrop = uniqueBackdrop(residueArtifacts, artifacts);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090807] px-6 py-8 text-stone-200">
      <div className="absolute inset-0 opacity-55">
        <div className="grid h-full grid-cols-4 grid-rows-3 gap-1 p-1 md:grid-cols-6">
          {backdrop.map(({ imageUrl, residue }) => (
            <div
              key={imageUrl}
              className={`relative overflow-hidden bg-stone-950 ${
                residue ? "animate-pulse ring-1 ring-inset ring-stone-300/25 [animation-duration:7s]" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className={`h-full w-full object-cover ${
                  residue ? "opacity-75" : "opacity-55"
                }`}
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
            {(currentPreview || directionPreviews.length > 0 || audioPreviews.length > 0) && (
              <div className="mt-9 max-w-2xl border-t border-stone-700/80 pt-5">
                <p className="text-[9px] uppercase tracking-[0.34em] text-stone-500">
                  Signal previews
                </p>
                {(currentPreview || directionPreviews.length > 0) && (
                  <div className="mt-4 max-w-3xl">
                    {currentPreview && (
                      <Link
                        href={artifactOpenHref(current)}
                        className="group relative block aspect-[16/9] overflow-hidden border border-stone-500/70 bg-black/70"
                      >
                        {currentPreview.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={currentPreview.imageUrl}
                            alt={currentPreview.artifact.title}
                            className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:opacity-100"
                          />
                        ) : (
                          <video
                            muted
                            playsInline
                            preload="metadata"
                            src={currentPreview.videoUrl}
                            className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:opacity-100"
                          />
                        )}
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/70 px-3 py-2">
                          <span className="text-[8px] uppercase tracking-[0.2em] text-stone-300">
                            Current signal / {current.title}
                          </span>
                          <span className="shrink-0 border border-stone-500 bg-black/55 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-stone-200 transition group-hover:border-stone-200 group-hover:text-white">
                            Open artifact
                          </span>
                        </span>
                      </Link>
                    )}
                    {directionPreviews.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {directionPreviews.map(({ artifact, color, number, preview }) => (
                          <Link
                            key={artifact.id}
                            href={`/drift/${artifact.slug}?trail=${encodeURIComponent(nextTrail.join(","))}`}
                            className="group relative aspect-[4/3] overflow-hidden border bg-black/70"
                            style={{
                              borderColor: color,
                              boxShadow: `inset 0 0 0 1px ${color}55`,
                            }}
                          >
                            {preview.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={preview.imageUrl}
                                alt={artifact.title}
                                className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:opacity-100"
                              />
                            ) : (
                              <video
                                muted
                                playsInline
                                preload="metadata"
                                src={preview.videoUrl}
                                className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:opacity-100"
                              />
                            )}
                            <span
                              className="absolute left-2 top-2 border bg-black/75 px-1.5 py-1 text-[8px] tracking-[0.18em]"
                              style={{ borderColor: color, color }}
                            >
                              0{number}
                            </span>
                            <span className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-stone-300 opacity-0 transition group-hover:opacity-100">
                              {artifact.title}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
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
            <div
              className="mx-auto h-8 w-px opacity-80"
              style={{ backgroundColor: ARCHIVE_MAP_COLORS.root }}
            />
            <div
              className="mx-auto h-px w-4/5 opacity-80"
              style={{ backgroundColor: ARCHIVE_MAP_COLORS.root }}
            />
            <div
              className="space-y-1 border-l pl-12"
              style={{ borderColor: ARCHIVE_MAP_COLORS.root }}
            >
              {candidates.map(({ artifact, reading }, index) => (
                <div key={artifact.id} className="relative">
                  <ArchiveBranch
                    className="-left-12 top-0 h-14 w-12"
                    color={
                      DRIFT_DIRECTION_COLORS[
                        index % DRIFT_DIRECTION_COLORS.length
                      ]
                    }
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
            {(residueMotifs.length > 0 || residueFragments.length > 0) && (
              <section className="mt-10 border-t border-stone-700/70 pt-4">
                <p className="text-[9px] uppercase tracking-[0.32em] text-stone-500">
                  Things following you
                </p>
                {residueMotifs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                    {residueMotifs.map((motif) => (
                      <span
                        key={motif}
                        className="text-[9px] uppercase tracking-[0.2em] text-stone-400"
                      >
                        {motif}
                      </span>
                    ))}
                  </div>
                )}
                {residueFragments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {residueFragments.map((fragment) => (
                      <p
                        key={fragment}
                        className="font-serif text-sm italic leading-5 text-stone-500"
                      >
                        “{fragment}”
                      </p>
                    ))}
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>

        <footer className="border-t border-stone-700 pt-4">
          <p className="text-[9px] uppercase tracking-[0.28em] text-stone-500">
            Path so far
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            {trailArtifacts.map((artifact, index) => (
              <Link
                key={`${artifact.slug}-${index}`}
                href={`/drift/${artifact.slug}?trail=${encodeURIComponent(
                  trailArtifacts
                    .slice(0, index)
                    .map((trailArtifact) => trailArtifact.slug)
                    .join(",")
                )}`}
                className="text-[10px] uppercase tracking-[0.18em] text-stone-400 transition hover:text-stone-100"
              >
                {index > 0 && <span className="mr-3 text-stone-800">→</span>}
                {artifact.title}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
