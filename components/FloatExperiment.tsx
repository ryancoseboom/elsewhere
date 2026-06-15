"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { archiveTextureSet } from "@/lib/archive-textures";

export type FloatExperimentArtifact = {
  album: string | null;
  album_id: string | null;
  artifact_type: string | null;
  atmosphere: string[] | null;
  band_id: string | null;
  description: string | null;
  discovery_visibility?: string | null;
  era: string | null;
  fragment: string | null;
  id: string;
  image_url: string | null;
  kind: string | null;
  lyrics?: string | null;
  motifs: string[] | null;
  nearby: string[] | null;
  parent_id: string | null;
  parent_slug: string | null;
  rooms: string[] | null;
  slug: string;
  song_id: string | null;
  title: string;
  year: string | null;
};

type MemoryPiece = {
  artifact: FloatExperimentArtifact;
  height: number;
  isAnchor: boolean;
  label: string;
  left: number;
  opacity: number;
  principles: string[];
  reasons: string[];
  rotate: number;
  top: number;
  treatment: "alive" | "faded" | "ghost";
  width: number;
  zIndex: number;
};

type Relationship = {
  reasons: string[];
  score: number;
};

type TransmissionText = {
  blur: number;
  className: string;
  left: number;
  mutate: boolean;
  opacity: number;
  reason: string;
  rotate: number;
  source: string;
  text: string;
  top: number;
  zIndex: number;
};

const ELSEWHERE_FLOAT_INTENSITY_V2 = true;
const mutationGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/*-+<>[]{}?";

const designPrinciples = [
  "stillness over spectacle",
  "association instead of navigation",
  "labels as archive residue",
  "overlap as remembered order",
  "recurrence without explanation",
  "damage as evidence, not decoration",
];

const layoutSlots = [
  { height: 42, left: 36, top: 22, width: 25 },
  { height: 31, left: 12, top: 18, width: 20 },
  { height: 25, left: 63, top: 12, width: 18 },
  { height: 28, left: 23, top: 55, width: 19 },
  { height: 23, left: 56, top: 56, width: 17 },
  { height: 18, left: 75, top: 41, width: 14 },
  { height: 19, left: 7, top: 62, width: 15 },
  { height: 17, left: 43, top: 6, width: 13 },
  { height: 20, left: 70, top: 70, width: 16 },
  { height: 15, left: 31, top: 78, width: 14 },
  { height: 14, left: 82, top: 18, width: 11 },
  { height: 13, left: 4, top: 35, width: 12 },
  { height: 16, left: 48, top: 77, width: 12 },
  { height: 13, left: 17, top: 7, width: 11 },
  { height: 24, left: 87, top: 57, width: 12 },
  { height: 20, left: 39, top: 39, width: 15 },
  { height: 14, left: 61, top: 83, width: 13 },
  { height: 17, left: 2, top: 11, width: 12 },
];

function seededUnit(seed: number) {
  const value = Math.sin(seed * 9283.37) * 10000;
  return value - Math.floor(value);
}

function seededRange(seed: number, minimum: number, maximum: number) {
  return minimum + seededUnit(seed) * (maximum - minimum);
}

function uniqueList(items: (string | null | undefined)[]) {
  return [
    ...new Set(
      items
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean)
    ),
  ];
}

function overlap(left: string[] | null, right: string[] | null) {
  const rightSet = new Set((right || []).map((item) => item.toLowerCase()));
  return (left || []).filter((item) => rightSet.has(item.toLowerCase()));
}

function artifactType(artifact: FloatExperimentArtifact) {
  return artifact.artifact_type || artifact.kind || "Artifact";
}

function clip(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) return normalized;

  return `${normalized.slice(0, limit).replace(/\s+\S*$/, "")}`;
}

function textFragments(value?: string | null, limit = 8) {
  return (value || "")
    .split(/[\r\n]+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .slice(0, limit)
    .map((line) => clip(line, 96));
}

function sourceSignals(artifact: FloatExperimentArtifact) {
  const signals: { reason: string; source: string; text: string }[] = [];

  textFragments(artifact.lyrics, 6).forEach((text) =>
    signals.push({ reason: "lyric memory attached to this artifact", source: artifact.title, text })
  );
  if (artifact.fragment) {
    signals.push({
      reason: "artifact fragment interrupting the transmission",
      source: artifact.title,
      text: artifact.fragment,
    });
  }
  textFragments(artifact.description, 3).forEach((text) =>
    signals.push({ reason: "description text breaking into captions", source: artifact.title, text })
  );
  signals.push({
    reason: "artifact title converted into signal language",
    source: artifact.title,
    text: artifact.title,
  });
  uniqueList([
    ...(artifact.motifs || []),
    ...(artifact.atmosphere || []),
    artifact.album,
    artifact.era,
    artifact.year,
  ]).forEach((text) =>
    signals.push({ reason: "motif or metadata becoming emotional text", source: artifact.title, text })
  );

  return signals;
}

function titleWords(artifact: FloatExperimentArtifact) {
  return artifact.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
}

function relationship(
  anchor: FloatExperimentArtifact,
  candidate: FloatExperimentArtifact
): Relationship {
  const reasons: string[] = [];
  let score = 0;

  if (anchor.id === candidate.id) {
    return { reasons: ["the current remembered center"], score: 100 };
  }

  if (candidate.parent_id && candidate.parent_id === anchor.parent_id) {
    score += 18;
    reasons.push("shares the same parent artifact");
  }
  if (anchor.parent_slug && candidate.parent_slug === anchor.parent_slug) {
    score += 14;
    reasons.push(`filed under ${anchor.parent_slug}`);
  }
  if (anchor.band_id && candidate.band_id === anchor.band_id) {
    score += 12;
    reasons.push("belongs to the same band thread");
  }
  if (anchor.album_id && candidate.album_id === anchor.album_id) {
    score += 16;
    reasons.push("belongs to the same release");
  }
  if (anchor.song_id && candidate.song_id === anchor.song_id) {
    score += 18;
    reasons.push("attached to the same song");
  }

  const sharedMotifs = overlap(anchor.motifs, candidate.motifs);
  if (sharedMotifs.length) {
    score += sharedMotifs.length * 9;
    reasons.push(`motif overlap: ${sharedMotifs.slice(0, 3).join(", ")}`);
  }

  const sharedAtmosphere = overlap(anchor.atmosphere, candidate.atmosphere);
  if (sharedAtmosphere.length) {
    score += sharedAtmosphere.length * 7;
    reasons.push(`atmosphere overlap: ${sharedAtmosphere.slice(0, 3).join(", ")}`);
  }

  const sharedRooms = overlap(anchor.rooms, candidate.rooms);
  if (sharedRooms.length) {
    score += sharedRooms.length * 6;
    reasons.push(`same room memory: ${sharedRooms.slice(0, 2).join(", ")}`);
  }

  const sharedNearby = overlap(anchor.nearby, [
    candidate.slug,
    candidate.title,
    ...(candidate.nearby || []),
  ]);
  if (sharedNearby.length) {
    score += sharedNearby.length * 11;
    reasons.push(`nearby echo: ${sharedNearby.slice(0, 2).join(", ")}`);
  }

  const sharedWords = overlap(titleWords(anchor), titleWords(candidate));
  if (sharedWords.length) {
    score += sharedWords.length * 3;
    reasons.push(`title word echo: ${sharedWords.slice(0, 2).join(", ")}`);
  }

  if (anchor.era && candidate.era === anchor.era) {
    score += 5;
    reasons.push(`same era: ${anchor.era}`);
  }
  if (anchor.year && candidate.year === anchor.year) {
    score += 4;
    reasons.push(`same year: ${anchor.year}`);
  }
  if (artifactType(anchor) === artifactType(candidate)) {
    score += 2;
    reasons.push(`same artifact type: ${artifactType(anchor)}`);
  }

  return { reasons, score };
}

function richness(artifact: FloatExperimentArtifact) {
  return (
    uniqueList([
      ...(artifact.motifs || []),
      ...(artifact.atmosphere || []),
      ...(artifact.rooms || []),
      ...(artifact.nearby || []),
      artifact.fragment,
      artifact.description,
      artifact.parent_slug,
      artifact.era,
      artifact.year,
    ]).length + (artifact.image_url ? 4 : 0)
  );
}

function principlesFor(piece: MemoryPiece) {
  const principles = ["association instead of navigation", "labels as archive residue"];
  if (piece.isAnchor) principles.push("fragments drifting into awareness");
  if (piece.reasons.some((reason) => reason.includes("motif"))) {
    principles.push("recurrence without explanation");
  }
  if (piece.reasons.some((reason) => reason.includes("parent") || reason.includes("release"))) {
    principles.push("an archive organized imperfectly");
  }
  if (piece.width > 22) principles.push("place being remembered rather than viewed");
  return uniqueList(principles);
}

function buildScene(
  artifacts: FloatExperimentArtifact[],
  seed: number,
  cycle: number
): MemoryPiece[] {
  if (!artifacts.length) return [];

  const anchorPool = [...artifacts].sort((left, right) => {
    const leftScore = richness(left) + seededRange(seed + left.id.length, 0, 8);
    const rightScore = richness(right) + seededRange(seed + right.id.length, 0, 8);
    return rightScore - leftScore;
  });
  const anchor =
    anchorPool[Math.floor(seededUnit(seed + cycle * 97) * Math.min(anchorPool.length, 18))] ||
    anchorPool[0];

  const related = artifacts
    .filter((artifact) => artifact.id !== anchor.id)
    .map((artifact, index) => {
      const rel = relationship(anchor, artifact);
      const accident = seededRange(seed + cycle * 131 + index * 17, 0, 13);
      return { artifact, rel, score: rel.score + accident };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 13);

  const selected = [
    { artifact: anchor, rel: relationship(anchor, anchor) },
    ...related.map((item) => ({ artifact: item.artifact, rel: item.rel })),
  ];

  return selected.map((item, index) => {
    const slot = layoutSlots[index % layoutSlots.length];
    const itemSeed = seed + cycle * 211 + index * 43;
    const reasons = item.rel.reasons.length
      ? item.rel.reasons
      : ["accidental juxtaposition: no strong metadata tie, but the image surfaced nearby"];
    const piece: MemoryPiece = {
      artifact: item.artifact,
      height: Math.max(9, slot.height + seededRange(itemSeed + 1, -3.5, 4.5)),
      isAnchor: index === 0,
      label:
        index === 0
          ? "current remembered center"
          : item.rel.score > 20
            ? "related evidence"
            : "accidental echo",
      left: Math.max(1, Math.min(88, slot.left + seededRange(itemSeed + 2, -3.5, 3.5))),
      opacity: index === 0 ? 1 : seededRange(itemSeed + 3, 0.52, 0.88),
      principles: [],
      reasons,
      rotate: seededRange(itemSeed + 4, -5.2, 5.2),
      top: Math.max(2, Math.min(84, slot.top + seededRange(itemSeed + 5, -3.5, 3.5))),
      treatment:
        seededUnit(itemSeed + 9) < 0.58
          ? "alive"
          : seededUnit(itemSeed + 9) < 0.84
            ? "faded"
            : "ghost",
      width: Math.max(9, slot.width + seededRange(itemSeed + 6, -2.5, 3.5)),
      zIndex: index === 0 ? 30 : 10 + layoutSlots.length - index,
    };
    piece.principles = principlesFor(piece);
    return piece;
  });
}

function buildTransmissionText(
  scene: MemoryPiece[],
  artifacts: FloatExperimentArtifact[],
  seed: number,
  cycle: number
) {
  const prioritized = [
    ...scene.map((piece) => piece.artifact),
    ...artifacts.filter(
      (artifact) => !scene.some((piece) => piece.artifact.id === artifact.id)
    ),
  ];
  const pool = prioritized.flatMap(sourceSignals);
  const fallback = [
    { reason: "fallback corrupted caption", source: "system", text: "THE HOUSE REMEMBERS" },
    { reason: "fallback corrupted caption", source: "system", text: "SIGNAL LOSS / STILL LISTENING" },
    { reason: "fallback corrupted caption", source: "system", text: "ARRIVAL BOARD FOR A LOST SONG" },
    { reason: "fallback corrupted caption", source: "system", text: "DO NOT TRUST THE IMAGE" },
  ];
  const signals = pool.length ? pool : fallback;
  const count = ELSEWHERE_FLOAT_INTENSITY_V2 ? 26 : 8;
  const classes = [
    "elsewhere-memory-text--micro",
    "elsewhere-memory-text--small",
    "elsewhere-memory-text--caption",
    "elsewhere-memory-text--medium",
    "elsewhere-memory-text--large",
    "elsewhere-memory-text--huge",
  ];

  return Array.from({ length: count }, (_, index) => {
    const textSeed = seed + cycle * 509 + index * 73;
    const signal =
      signals[Math.floor(seededUnit(textSeed + 1) * signals.length)] || fallback[0];
    const sizeIndex = Math.min(
      classes.length - 1,
      Math.floor(Math.pow(seededUnit(textSeed + 2), 1.7) * classes.length)
    );

    return {
      blur: seededUnit(textSeed + 3) < 0.18 ? seededRange(textSeed + 4, 0.4, 2.8) : 0,
      className: classes[sizeIndex],
      left: seededRange(textSeed + 5, -7, 93),
      mutate: seededUnit(textSeed + 6) > 0.28,
      opacity: seededRange(textSeed + 7, 0.12, sizeIndex > 3 ? 0.42 : 0.68),
      reason: signal.reason,
      rotate: seededRange(textSeed + 8, -10, 9),
      source: signal.source,
      text: clip(signal.text.toUpperCase(), sizeIndex > 3 ? 54 : 92),
      top: seededRange(textSeed + 9, 5, 88),
      zIndex: seededUnit(textSeed + 10) > 0.48 ? 24 : 6,
    } satisfies TransmissionText;
  });
}

function centralSignal(scene: MemoryPiece[], seed: number, cycle: number) {
  const pool = scene.flatMap((piece) => sourceSignals(piece.artifact));
  const signal =
    pool[Math.floor(seededUnit(seed + cycle * 811) * Math.max(1, pool.length))] ||
    { reason: "fallback central interruption", source: "system", text: "STAY WITH THE SIGNAL" };

  return {
    ...signal,
    text: clip(signal.text.toUpperCase(), 42),
  };
}

function mutateText(text: string, seed: number, tick: number, intensity: number) {
  return Array.from(text)
    .map((char, index) => {
      if (char === " ") return " ";

      const unit = seededUnit(seed + tick * 41 + index * 19);
      if (unit > intensity) return char;

      return mutationGlyphs[Math.floor(seededUnit(seed + tick * 53 + index * 29) * mutationGlyphs.length)] || char;
    })
    .join("");
}

function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", callback);
      return () => query.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function MutatingText({
  className = "",
  intensity = 0.12,
  reducedMotion,
  seed,
  text,
}: {
  className?: string;
  intensity?: number;
  reducedMotion: boolean;
  seed: number;
  text: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 190 + Math.floor(seededUnit(seed) * 220));
    return () => window.clearInterval(timer);
  }, [reducedMotion, seed]);

  return (
    <span className={className}>
      {reducedMotion ? text : mutateText(text, seed, tick, intensity)}
    </span>
  );
}

function TransmissionTextLayer({
  reducedMotion,
  signal,
  seed,
}: {
  reducedMotion: boolean;
  signal: TransmissionText;
  seed: number;
}) {
  const style = {
    "--memory-text-blur": `${signal.blur}px`,
    "--memory-text-left": `${signal.left}%`,
    "--memory-text-opacity": signal.opacity,
    "--memory-text-rotate": `${signal.rotate}deg`,
    "--memory-text-top": `${signal.top}%`,
    "--memory-text-z": signal.zIndex,
  } as CSSProperties;

  return (
    <span
      className={`elsewhere-memory-text ${signal.className}`}
      style={style}
      title={`${signal.source}: ${signal.reason}`}
    >
      {signal.mutate ? (
        <MutatingText
          reducedMotion={reducedMotion}
          seed={seed}
          text={signal.text}
          intensity={0.2}
        />
      ) : (
        signal.text
      )}
    </span>
  );
}

function MemoryPieceCard({ piece, seed }: { piece: MemoryPiece; seed: number }) {
  const textures = archiveTextureSet(`${piece.artifact.slug}:${seed}`, 3);
  const treatment =
    piece.treatment === "alive"
      ? {
          grayscale: seededRange(seed + 1, 0, 14),
          saturate: seededRange(seed + 2, 96, 132),
          brightness: seededRange(seed + 3, 82, 104),
          contrast: seededRange(seed + 4, 102, 122),
        }
      : piece.treatment === "faded"
        ? {
            grayscale: seededRange(seed + 1, 24, 48),
            saturate: seededRange(seed + 2, 62, 86),
            brightness: seededRange(seed + 3, 74, 92),
            contrast: seededRange(seed + 4, 98, 118),
          }
        : {
            grayscale: seededRange(seed + 1, 78, 100),
            saturate: seededRange(seed + 2, 20, 54),
            brightness: seededRange(seed + 3, 58, 78),
            contrast: seededRange(seed + 4, 128, 168),
          };
  const style = {
    "--memory-height": `${piece.height}vh`,
    "--memory-left": `${piece.left}%`,
    "--memory-opacity": piece.opacity,
    "--memory-rotate": `${piece.rotate}deg`,
    "--memory-top": `${piece.top}%`,
    "--memory-width": `${piece.width}vw`,
    "--memory-z": piece.zIndex,
    "--memory-texture-a": `url(${textures[0]})`,
    "--memory-texture-b": `url(${textures[1]})`,
    "--memory-grayscale": `${treatment.grayscale}%`,
    "--memory-saturate": `${treatment.saturate}%`,
    "--memory-brightness": `${treatment.brightness}%`,
    "--memory-contrast": `${treatment.contrast}%`,
  } as CSSProperties;

  return (
    <a
      href={`/artifact/${piece.artifact.slug}`}
      className={`elsewhere-memory-piece group ${piece.isAnchor ? "is-anchor" : ""}`}
      style={style}
    >
      <span className="elsewhere-memory-tape" aria-hidden />
      <span className="elsewhere-memory-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={piece.artifact.image_url || ""} alt={piece.artifact.title} />
      </span>
      <span className="elsewhere-memory-label">
        <span>{piece.label}</span>
        <strong>{piece.artifact.title}</strong>
        <small>
          {uniqueList([artifactType(piece.artifact), piece.artifact.year, piece.artifact.era])
            .slice(0, 3)
            .join(" / ")}
        </small>
      </span>
    </a>
  );
}

export default function FloatExperiment({
  artifacts,
  debugMode,
  seed,
}: {
  artifacts: FloatExperimentArtifact[];
  debugMode: boolean;
  seed: number;
}) {
  const [cycle, setCycle] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const reducedMotion = useReducedMotion();
  const scene = useMemo(
    () => buildScene(artifacts, seed, cycle),
    [artifacts, cycle, seed]
  );
  const anchor = scene[0];
  const transmissionText = useMemo(
    () => buildTransmissionText(scene, artifacts, seed, cycle),
    [artifacts, cycle, scene, seed]
  );
  const central = useMemo(() => centralSignal(scene, seed, cycle), [cycle, scene, seed]);

  useEffect(() => {
    if (reducedMotion) return;
    if (quiet && !ELSEWHERE_FLOAT_INTENSITY_V2) return;
    const timer = window.setInterval(() => {
      setCycle((current) => current + 1);
    }, quiet ? 9_800 : ELSEWHERE_FLOAT_INTENSITY_V2 ? 7_400 : 18_000);
    return () => window.clearInterval(timer);
  }, [quiet, reducedMotion]);

  return (
    <main className={`elsewhere-memory-stage min-h-screen overflow-hidden bg-[#070604] text-stone-200 ${ELSEWHERE_FLOAT_INTENSITY_V2 ? "elsewhere-memory-stage--intensity-v2" : ""}`}>
      <div className="elsewhere-memory-ground" aria-hidden />
      {ELSEWHERE_FLOAT_INTENSITY_V2 && (
        <>
          <div className="elsewhere-memory-broadcast" aria-hidden />
          <div className="elsewhere-memory-text-field" aria-hidden>
            {transmissionText.map((signal, index) => (
              <TransmissionTextLayer
                key={`${signal.text}-${cycle}-${index}`}
                reducedMotion={reducedMotion}
                seed={seed + cycle * 1009 + index * 61}
                signal={signal}
              />
            ))}
          </div>
          <div className="elsewhere-memory-central" aria-hidden>
            <MutatingText
              className="elsewhere-memory-central__text"
              intensity={0.16}
              reducedMotion={reducedMotion}
              seed={seed + cycle * 701}
              text={central.text}
            />
          </div>
        </>
      )}
      <section className="relative z-20 flex min-h-screen flex-col px-5 py-5 md:px-8">
        <header className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.48em] text-stone-600">
              Elsewhere / float experiment
            </p>
            <h1 className="mt-3 font-serif text-4xl text-stone-100 md:text-6xl">
              The archive is thinking.
            </h1>
          </div>
          <Link
            href="/"
            className="border border-stone-800 bg-black/40 px-4 py-3 text-[10px] uppercase tracking-[0.34em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
          >
            Return
          </Link>
        </header>

        <div className="elsewhere-memory-table relative mt-6 flex-1">
          {scene.map((piece, index) => (
            <MemoryPieceCard
              key={`${piece.artifact.id}-${cycle}-${index}`}
              piece={piece}
              seed={seed + cycle * 37 + index * 11}
            />
          ))}
          {anchor && (
            <aside className="elsewhere-memory-caption">
              <p>current association</p>
              <h2>{anchor.artifact.title}</h2>
              <span>
                {anchor.artifact.fragment ||
                  anchor.artifact.description ||
                  "A fragment came forward and pulled related material with it."}
              </span>
            </aside>
          )}
        </div>

        <footer className="relative z-40 flex flex-wrap items-end justify-between gap-4 border-t border-stone-900/80 pt-4">
          <p className="max-w-xl text-xs leading-6 text-stone-600">
            This version lets artifacts overload the channel: images rotate,
            captions corrupt, lyrics surface, and meaning keeps breaking through
            the noise.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="border border-stone-800 bg-black/40 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
              onClick={() => setQuiet((current) => !current)}
            >
              {quiet ? "Resume Signal" : "Reduce Signal"}
            </button>
            <button
              type="button"
              className="border border-stone-800 bg-black/40 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
              onClick={() => setCycle((current) => current + 1)}
            >
              Remember Again
            </button>
          </div>
        </footer>
      </section>

      {debugMode && (
        <aside className="elsewhere-memory-debug">
          <p className="text-[10px] uppercase tracking-[0.38em] text-stone-500">
            Developer mode / why these surfaced
          </p>
          <div className="mt-4 space-y-4">
            {scene.map((piece) => (
              <article key={piece.artifact.id} className="border-t border-stone-800 pt-3">
                <h3 className="font-serif text-base text-stone-200">
                  {piece.artifact.title}
                </h3>
                <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-stone-600">
                  {piece.label}
                </p>
                <p className="mt-3 text-xs leading-5 text-stone-400">
                  <span className="text-stone-500">Relationships:</span>{" "}
                  {piece.reasons.join("; ")}
                </p>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  <span className="text-stone-600">Principles:</span>{" "}
                  {piece.principles.join("; ")}
                </p>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  <span className="text-stone-600">Image treatment:</span>{" "}
                  {piece.treatment}
                </p>
              </article>
            ))}
            {ELSEWHERE_FLOAT_INTENSITY_V2 && (
              <article className="border-t border-stone-800 pt-3">
                <h3 className="font-serif text-base text-stone-200">
                  Central interruption
                </h3>
                <p className="mt-2 text-xs leading-5 text-stone-400">
                  {central.text}
                </p>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  <span className="text-stone-600">Source:</span>{" "}
                  {central.source}; {central.reason}
                </p>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  <span className="text-stone-600">Text layers:</span>{" "}
                  {transmissionText.length}; mutation enabled selectively
                </p>
              </article>
            )}
          </div>
        </aside>
      )}

      {artifacts.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm leading-7 text-stone-500">
            The archive has not revealed any public images yet.
          </p>
        </div>
      )}
    </main>
  );
}
