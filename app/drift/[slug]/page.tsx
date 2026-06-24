import Link from "next/link";
import { notFound } from "next/navigation";
import ArchiveBranch from "@/components/ArchiveBranch";
import SourceInterference from "@/components/SourceInterference";
import SpotifyTrackEmbed from "@/components/SpotifyTrackEmbed";
import { createPublicClient } from "@/lib/supabase/server";
import {
  artifactType,
  shuffle,
  type ArchiveArtifact,
} from "@/lib/archive-navigation";
import {
  ARCHIVE_MAP_COLORS,
  DRIFT_DIRECTION_COLORS,
} from "@/lib/archive-map-colors";
import {
  driftMoodLabel,
  driftMoodNeighbors,
  driftMoodPrompt,
  isDriftMood,
} from "@/lib/drift-moods";
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

function lyricFragments(lyrics?: string | null) {
  const lines = (lyrics || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8);

  if (lines.length === 0) return [];

  return lines
    .map((line, index) => {
      const words = line.split(/\s+/).filter(Boolean);
      const seed = Array.from(line).reduce(
        (total, char) => total + char.charCodeAt(0),
        index * 17
      );
      const start = words.length > 5 ? seed % Math.max(1, words.length - 4) : 0;
      const length = Math.min(words.length - start, 3 + (seed % 4));
      const fragment = words.slice(start, start + length).join(" ");

      return `${start > 0 ? "... " : ""}${fragment}${
        start + length < words.length ? " ..." : ""
      }`;
    })
    .filter(Boolean)
    .slice(0, 5);
}

function isImageOnlyArtifact(artifact: ArchiveArtifact) {
  return ["Artwork", "Design", "Photo"].includes(artifactType(artifact));
}

function isHiddenArtifact(artifact: ArchiveArtifact) {
  return artifact.discovery_visibility === "hidden";
}

function artifactOpenHref(artifact: ArchiveArtifact) {
  if (artifactType(artifact) === "Poster") {
    return `/posters?poster=${encodeURIComponent(artifact.slug)}`;
  }

  if (isImageOnlyArtifact(artifact) && artifact.parent_slug) {
    return `/artifact/${artifact.parent_slug}?image=${encodeURIComponent(
      artifact.slug
    )}`;
  }

  return `/artifact/${artifact.slug}`;
}

function driftHref(slug: string, trail: string[], mood = "") {
  const params = new URLSearchParams();
  const trailValue = trail.join(",");

  if (trailValue) params.set("trail", trailValue);
  if (isDriftMood(mood)) params.set("mood", mood);

  const query = params.toString();
  return `/drift/${slug}${query ? `?${query}` : ""}`;
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
    readings.push({ key: "deeper", prompt: "Move deeper into the record" });
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
      prompt: "Stay with this era",
    });
  }

  if (candidate.image_url?.trim()) {
    readings.push({ key: "image", prompt: "Let an image choose the way" });
  }

  if (artifactType(candidate) === "Poster") {
    readings.push({ key: "poster", prompt: "Follow a live flyer" });
  }

  if (candidate.video_url?.trim() || candidate.youtube_url?.trim()) {
    readings.push({ key: "video", prompt: "Enter the moving image" });
  }

  if (candidate.audio_url?.trim()) {
    readings.push({ key: "audio", prompt: "Follow the sound beneath it" });
  }

  if (candidate.lyrics?.trim()) {
    readings.push({ key: "lyrics", prompt: "Read the words underneath" });
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

function chooseReading(
  current: ArchiveArtifact,
  candidate: ArchiveArtifact,
  hidden = false,
  mood = ""
) {
  const readings = driftReadings(current, candidate);
  const posterReading = readings.find((reading) => reading.key === "poster");
  const moodReading =
    isDriftMood(mood) && (candidate.drift_moods || []).includes(mood)
      ? ({
          key: `drift-mood:${mood}`,
          prompt: driftMoodPrompt(mood, candidate.slug.length),
        } satisfies DriftReading)
      : null;
  const nonChanceReadings = readings.filter((reading) => reading.key !== "chance");
  const reading =
    posterReading ||
    moodReading ||
    shuffle(nonChanceReadings)[0] ||
    readings.find((item) => item.key === "chance") ||
    readings[0] ||
    ({ key: "chance", prompt: "Take an unmarked passage" } satisfies DriftReading);

  return {
    ...reading,
    prompt:
      hidden && reading.key === "chance"
        ? "Open a misfiled passage"
        : reading.prompt,
  };
}

function chooseDirections(
  current: ArchiveArtifact,
  artifacts: ArchiveArtifact[],
  trail: string[],
  activeMood = ""
) {
  const revealHidden = shouldRevealHiddenDirection(current, trail, activeMood);
  const publicCandidates = artifacts.filter(
    (artifact) => artifact.id !== current.id && !trail.includes(artifact.slug)
  );
  const candidates = publicCandidates.filter(
    (artifact) => artifact.discovery_visibility !== "hidden"
  );
  const hiddenCandidates = revealHidden
    ? publicCandidates.filter(
        (artifact) => artifact.discovery_visibility === "hidden"
      )
    : [];
  const possibilities = moodWeightedShuffle(candidates, activeMood)
    .slice(0, 3)
    .map((artifact) => ({
      artifact,
      mood: chooseDirectionMood(activeMood, artifact),
    }))
    .map(({ artifact, mood }) => ({
      artifact,
      mood,
      reading: chooseReading(current, artifact, false, mood),
    }));
  const chosen = possibilities;

  if (hiddenCandidates.length > 0 && chosen.length > 0) {
    const hiddenArtifact = shuffle(hiddenCandidates)[0];
    const hiddenPossibility = hiddenArtifact
      ? {
          artifact: hiddenArtifact,
          mood: chooseDirectionMood(activeMood, hiddenArtifact),
          reading: chooseReading(
            current,
            hiddenArtifact,
            true,
            chooseDirectionMood(activeMood, hiddenArtifact)
          ),
        }
      : null;

    if (hiddenPossibility) {
      chosen[chosen.length - 1] = hiddenPossibility;
    }
  }

  return chosen;
}

function shouldRevealHiddenDirection(
  current: ArchiveArtifact,
  trail: string[],
  activeMood = ""
) {
  if (current.discovery_visibility === "hidden") return true;

  const seed = [...current.slug, ...trail.join("")].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 5),
    0
  );

  if (activeMood === "late-night") return seed % 3 === 0;
  if (activeMood === "dusk" || activeMood === "evening") return seed % 4 === 0;

  return seed % 5 === 0;
}

function chooseDirectionMood(activeMood: string, candidate: ArchiveArtifact) {
  const candidateMoods = candidate.drift_moods || [];
  const neighbors = driftMoodNeighbors(activeMood);

  return (
    candidateMoods.find((mood) => mood === activeMood) ||
    candidateMoods.find((mood) => neighbors.includes(mood)) ||
    candidateMoods[0] ||
    activeMood
  );
}

function driftMoodInfluence(candidate: ArchiveArtifact, activeMood: string) {
  const candidateMoods = candidate.drift_moods || [];

  if (!activeMood || candidateMoods.length === 0) return 1;
  if (candidateMoods.includes(activeMood)) return 1.35;

  const neighbors = driftMoodNeighbors(activeMood);
  if (candidateMoods.some((mood) => neighbors.includes(mood))) return 1.18;

  return 1.04;
}

function moodWeightedShuffle(
  candidates: ArchiveArtifact[],
  activeMood: string
) {
  return shuffle(candidates)
    .map((artifact) => ({
      artifact,
      score: Math.random() * driftMoodInfluence(artifact, activeMood),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ artifact }) => artifact);
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
  searchParams: Promise<{
    mood?: string | string[];
    trail?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const rawTrail = query.trail;
  const rawMood = query.mood;
  const trailValue = Array.isArray(rawTrail) ? rawTrail[0] : rawTrail || "";
  const moodValue = Array.isArray(rawMood) ? rawMood[0] : rawMood || "";
  const trail = trailValue.split(",").filter(Boolean).slice(-7);
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, year, atmosphere, motifs, drift_moods, image_url, audio_url, video_url, youtube_url, spotify_url, fragment, description, drift_weight, discovery_visibility"
    )
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"]);

  if (error) throw new Error(error.message);

  const artifacts = (data || []).map((artifact) => ({
    ...artifact,
    kind: artifact.artifact_type || artifact.kind,
  })) as ArchiveArtifact[];
  const ordinaryArtifacts = artifacts.filter(
    (artifact) => artifact.discovery_visibility !== "hidden"
  );
  const current = artifacts.find((artifact) => artifact.slug === slug);

  if (!current) notFound();

  const currentHidden = isHiddenArtifact(current);
  const currentIsSong = artifactType(current) === "Song";
  const { data: currentLyricsData } = currentIsSong
    ? await supabase
        .from("artifacts")
        .select("lyrics")
        .eq("id", current.id)
        .maybeSingle()
    : { data: null };

  const activeMood =
    isDriftMood(moodValue) ? moodValue : (current.drift_moods || [])[0] || "";
  const candidates = chooseDirections(current, artifacts, trail, activeMood);
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
  const previewPool =
    current.discovery_visibility === "hidden" ? artifacts : ordinaryArtifacts;
  const attachedArtifacts = previewPool.filter((artifact) =>
    isAttachedTo(current, artifact)
  );
  const currentPreview = representativePreview(current, previewPool);
  const directionPreviews = candidates
    .map(({ artifact, mood, reading }, index) => ({
      artifact,
      mood,
      reading,
      color: DRIFT_DIRECTION_COLORS[index],
      number: index + 1,
      preview: representativePreview(
        artifact,
        artifact.discovery_visibility === "hidden" ? artifacts : ordinaryArtifacts
      ),
    }))
    .filter(
      (direction): direction is typeof direction & { preview: SignalPreview } =>
        Boolean(direction.preview)
    );
  const audioPreviews = shuffle([
    ...(currentIsSong ? [] : [current]),
    ...attachedArtifacts,
  ])
    .filter((artifact) => artifact.audio_url?.trim())
    .slice(0, 2);
  const currentLyricFragments = currentIsSong
    ? lyricFragments((currentLyricsData?.lyrics as string | null) || "")
    : [];
  const backdrop = uniqueBackdrop(residueArtifacts, ordinaryArtifacts);

  return (
    <main
      className={`relative min-h-screen overflow-hidden px-4 py-5 text-stone-200 sm:px-6 sm:py-8 ${
        currentHidden ? "bg-[#120304]" : "bg-[#090807]"
      }`}
    >
      <div className={`absolute inset-0 ${currentHidden ? "opacity-40 grayscale contrast-150" : "opacity-55"}`}>
        <div className="grid h-full grid-cols-4 grid-rows-3 gap-1 p-1 md:grid-cols-6">
          {backdrop.map(({ imageUrl, residue }) => (
            <div
              key={imageUrl}
              className={`relative overflow-hidden bg-stone-950 ${
                residue
                  ? `animate-pulse ring-1 ring-inset [animation-duration:7s] ${
                      currentHidden ? "ring-red-400/45" : "ring-stone-300/25"
                    }`
                  : ""
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
      <div
        className={`absolute inset-0 ${
          currentHidden
            ? "bg-[radial-gradient(circle_at_center,rgba(80,7,9,0.18),rgba(18,3,4,0.94)_70%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(9,8,7,0.22),rgba(9,8,7,0.91)_72%)]"
        }`}
      />
      <div className={`absolute inset-0 ${currentHidden ? "bg-red-950/20" : "bg-black/25"}`} />
      {currentHidden && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-red-500/45" />
          <div className="pointer-events-none absolute inset-x-0 bottom-20 h-px bg-red-500/25" />
        </>
      )}

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-4rem)]">
        <header className="flex flex-wrap items-center justify-between gap-4 sm:gap-5">
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

        <div className="grid flex-1 items-center gap-9 py-10 sm:gap-12 sm:py-12 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <section>
            <p
              className={`text-[10px] uppercase tracking-[0.44em] ${
                currentHidden ? "text-red-300" : "text-stone-400"
              }`}
            >
              Drift / {currentHidden ? "misfiled" : activeMood ? driftMoodLabel(activeMood) : artifactType(current) || "record"}
            </p>
            {currentHidden && (
              <p className="mt-3 w-fit border border-red-500/60 bg-red-950/30 px-3 py-2 text-[9px] uppercase tracking-[0.3em] text-red-200">
                Hidden artifact / recovered out of order
              </p>
            )}
            <h1
              className={`mt-5 max-w-4xl font-serif text-5xl leading-none sm:text-6xl md:text-8xl ${
                currentHidden ? "text-red-400 drop-shadow-[0_0_18px_rgba(248,113,113,0.28)]" : "text-stone-100"
              }`}
            >
              {current.title}
            </h1>
            {currentIsSong && (
              <div className="mt-7 max-w-xl space-y-4">
                {current.spotify_url && (
                  <>
                    <SpotifyTrackEmbed
                      title={current.title}
                      url={current.spotify_url}
                      className="border border-stone-800 bg-black/50"
                    />
                  </>
                )}
                <div className="flex flex-wrap gap-3">
                  {current.spotify_url && (
                    <a
                      href={current.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex border border-stone-700 bg-black/50 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-300 transition hover:border-stone-300 hover:text-white"
                    >
                      Open Spotify
                    </a>
                  )}
                  <Link
                    href={artifactOpenHref(current)}
                    className="inline-flex border border-stone-700 bg-black/50 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-300 transition hover:border-stone-300 hover:text-white"
                  >
                    Open artifact page
                  </Link>
                </div>
                {current.audio_url && (
                  <div className="max-w-md border border-stone-800 bg-black/45 p-3">
                    <p
                      className={`mb-2 text-[9px] uppercase tracking-[0.2em] ${
                        currentHidden ? "text-red-300" : "text-stone-500"
                      }`}
                    >
                      {current.title}
                    </p>
                    <audio
                      controls
                      preload="metadata"
                      src={current.audio_url}
                      className="h-8 w-full opacity-75"
                    />
                  </div>
                )}
              </div>
            )}
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
            {currentLyricFragments.length > 0 && (
              <div className="mt-7 grid max-w-2xl gap-2 border-l border-stone-700/70 pl-4">
                <p className="mb-1 text-[9px] uppercase tracking-[0.32em] text-stone-500">
                  lyric residue
                </p>
                {currentLyricFragments.map((fragment, index) => (
                  <p
                    key={`${fragment}-${index}`}
                    className="font-serif text-sm italic leading-6 text-stone-400"
                  >
                    {fragment}
                  </p>
                ))}
              </div>
            )}
            <SourceInterference
              className="mt-8 max-w-2xl"
              context={{
                artifactSlug: current.slug,
                atmosphere: current.atmosphere || [],
                motifs: current.motifs || [],
              }}
              limit={6}
            />
            {(currentPreview || directionPreviews.length > 0 || audioPreviews.length > 0) && (
              <div className="mt-9 max-w-2xl border-t border-stone-700/80 pt-5">
                <p className="text-[9px] uppercase tracking-[0.34em] text-stone-500">
                  Preview pieces
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
                          <span
                            className={`text-[8px] uppercase tracking-[0.2em] ${
                              currentHidden ? "text-red-300" : "text-stone-300"
                            }`}
                          >
                            Current piece / {currentHidden ? "misfiled / " : ""}{current.title}
                          </span>
                          <span className="shrink-0 border border-stone-500 bg-black/55 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-stone-200 transition group-hover:border-stone-200 group-hover:text-white">
                            Open artifact
                          </span>
                        </span>
                      </Link>
                    )}
                    {directionPreviews.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {directionPreviews.map(({ artifact, color, mood, number, preview }) => (
                          <Link
                            key={artifact.id}
                            href={driftHref(artifact.slug, nextTrail, mood)}
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
                            <span
                              className={`absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-[8px] uppercase tracking-[0.14em] opacity-0 transition group-hover:opacity-100 ${
                                isHiddenArtifact(artifact) ? "text-red-300" : "text-stone-300"
                              }`}
                            >
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
                        <p
                          className={`mb-1 text-[9px] uppercase tracking-[0.18em] ${
                            isHiddenArtifact(preview) ? "text-red-300" : "text-stone-500"
                          }`}
                        >
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

          <aside className="lg:pt-4">
            <p className="mx-auto mb-5 max-w-sm text-center text-xs leading-6 text-stone-500">
              Surrender to the pull and you may find unreleased demos, unseen
              photos, old posters, studio notes, and loose pieces.
            </p>
            <p className="text-center text-[10px] uppercase tracking-[0.34em] text-stone-300">
              Choose a direction
            </p>
            <div className="mx-auto mt-4 w-fit px-5 py-3 text-center">
              <p
                className={`font-serif text-xl ${
                  currentHidden ? "text-red-400" : "text-stone-100"
                }`}
              >
                {current.title}
              </p>
              <p
                className={`mt-1 text-[9px] uppercase tracking-[0.2em] ${
                  currentHidden ? "text-red-300/75" : "text-stone-500"
                }`}
              >
                {currentHidden ? "Misfiled piece" : "Current piece"}
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
              className="space-y-1 border-l pl-8 sm:pl-12"
              style={{ borderColor: ARCHIVE_MAP_COLORS.root }}
            >
              {candidates.map(({ artifact, mood, reading }, index) => (
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
                    href={driftHref(artifact.slug, nextTrail, mood)}
                    className="group block px-2 py-3 transition"
                  >
                    <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400 transition group-hover:text-white">
                      {reading.prompt}
                    </p>
                    <p
                      className={`mt-1 font-serif text-lg transition group-hover:text-white ${
                        isHiddenArtifact(artifact) ? "text-red-400" : "text-stone-200"
                      }`}
                    >
                      {artifact.title}
                    </p>
                    {isHiddenArtifact(artifact) && (
                      <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-red-300/75 transition group-hover:text-red-200">
                        hidden / misfiled
                      </p>
                    )}
                    {mood && (
                      <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-stone-600 transition group-hover:text-stone-400">
                        {driftMoodLabel(mood)}
                      </p>
                    )}
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
                <span className={isHiddenArtifact(artifact) ? "text-red-400" : ""}>
                  {artifact.title}
                </span>
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
