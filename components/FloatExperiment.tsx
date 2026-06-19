"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  ARCHIVE_TEXTURES,
  archiveTextureIndices,
} from "@/lib/archive-textures";
import {
  FLOAT_CONTROL_DEFAULTS,
  type FloatControlValues,
} from "@/lib/float-controls";

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

export type FloatVideoFormat = "youtube" | "instagram";

export type FloatInterferenceSignal = {
  reason: string;
  source: string;
  text: string;
};

type MemoryPiece = {
  align: string;
  artifact: FloatExperimentArtifact;
  gridColumn: string;
  gridRow: string;
  height: number;
  heightCss: string;
  imageRotate: number;
  isAnchor: boolean;
  isTiny: boolean;
  label: string;
  left: number;
  opacity: number;
  principles: string[];
  reasons: string[];
  rotate: number;
  textureIndices: number[];
  tapeTextureIndex: number;
  top: number;
  treatment: "alive" | "faded" | "ghost";
  width: number;
  widthCss: string;
  justify: string;
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

type CatalogSignal = {
  text: string;
  seed: number;
};

type FloatPhase = "image" | "text" | "lyric" | "catalog";

type RegisterFrame = {
  color: "black" | "gray" | "red" | "white";
  height: number;
  left: number;
  opacity: number;
  top: number;
  width: number;
};

const ELSEWHERE_FLOAT_INTENSITY_V2 = true;
const mutationGlyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/*-+<>[]{}?";

const floatPhases: FloatPhase[] = ["image", "text", "lyric", "catalog"];

const paragraphSlots = [
  { left: 6, top: 26 },
  { left: 67, top: 30 },
  { left: 13, top: 69 },
  { left: 58, top: 76 },
  { left: 35, top: 12 },
  { left: 78, top: 58 },
];

const frameColors: RegisterFrame["color"][] = ["black", "gray", "white", "red"];

const layoutSlots = [
  {
    align: "stretch",
    gridColumn: "5 / span 4",
    gridRow: "2 / span 5",
    height: 48,
    heightCss: "100%",
    justify: "stretch",
    left: 33,
    top: 14,
    width: 34,
    widthCss: "100%",
  },
  {
    align: "stretch",
    gridColumn: "1 / span 2",
    gridRow: "2 / span 3",
    height: 29,
    heightCss: "100%",
    justify: "stretch",
    left: 6,
    top: 12,
    width: 18,
    widthCss: "100%",
  },
  {
    align: "stretch",
    gridColumn: "10 / span 2",
    gridRow: "1 / span 3",
    height: 22,
    heightCss: "100%",
    justify: "stretch",
    left: 72,
    top: 9,
    width: 18,
    widthCss: "100%",
  },
  {
    align: "stretch",
    gridColumn: "2 / span 2",
    gridRow: "6 / span 2",
    height: 19,
    heightCss: "100%",
    justify: "stretch",
    left: 10,
    top: 55,
    width: 15,
    widthCss: "100%",
  },
  {
    align: "stretch",
    gridColumn: "9 / span 3",
    gridRow: "5 / span 3",
    height: 25,
    heightCss: "100%",
    justify: "stretch",
    left: 62,
    top: 52,
    width: 20,
    widthCss: "100%",
  },
  {
    align: "stretch",
    gridColumn: "12 / span 1",
    gridRow: "3 / span 2",
    height: 14,
    heightCss: "100%",
    justify: "stretch",
    left: 84,
    top: 40,
    width: 10,
    widthCss: "100%",
  },
  { align: "center", gridColumn: "4", gridRow: "1", height: 7, heightCss: "56px", justify: "center", left: 29, top: 72, width: 9, widthCss: "92px" },
  { align: "end", gridColumn: "8", gridRow: "8", height: 8, heightCss: "82px", justify: "center", left: 79, top: 76, width: 5, widthCss: "54px" },
  { align: "center", gridColumn: "12", gridRow: "8", height: 5, heightCss: "44px", justify: "center", left: 50, top: 6, width: 8, widthCss: "78px" },
  { align: "center", gridColumn: "1", gridRow: "5", height: 7, heightCss: "62px", justify: "center", left: 91, top: 62, width: 11, widthCss: "112px" },
  { align: "center", gridColumn: "7", gridRow: "1", height: 10, heightCss: "96px", justify: "center", left: 18, top: 81, width: 6, widthCss: "62px" },
  { align: "center", gridColumn: "4", gridRow: "8", height: 5, heightCss: "46px", justify: "center", left: 3, top: 38, width: 9, widthCss: "84px" },
];

function fixed(value: number, digits = 2) {
  return value.toFixed(digits);
}

function cssPercent(value: number) {
  return `${fixed(value)}%`;
}

function cssDegrees(value: number) {
  return `${fixed(value)}deg`;
}

function cssNumber(value: number) {
  return fixed(value);
}

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

function chunkFragment(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > limit) {
    const next = remaining.slice(0, limit).replace(/\s+\S*$/, "").trim();
    const chunk = next || remaining.slice(0, limit).trim();

    if (!chunk) break;

    chunks.push(chunk);
    remaining = remaining.slice(chunk.length).trim();
  }

  if (remaining) chunks.push(remaining);

  return chunks;
}

function textFragments(value?: string | null, limit = 8, fragmentLength = 96) {
  return (value || "")
    .split(/[\r\n]+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .flatMap((line) => chunkFragment(line, fragmentLength))
    .slice(0, limit)
    .map((line) => clip(line, fragmentLength));
}

function sourceSignals(artifact: FloatExperimentArtifact) {
  const signals: FloatInterferenceSignal[] = [];

  textFragments(artifact.lyrics, 96).forEach((text) =>
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

function lyricSignals(artifact: FloatExperimentArtifact) {
  return textFragments(artifact.lyrics, Number.POSITIVE_INFINITY).map((text) => ({
    reason: "lyric memory interrupting the center signal",
    source: artifact.title,
    text,
  }));
}

function isSongLyricSource(artifact: FloatExperimentArtifact) {
  const type = artifact.artifact_type || artifact.kind || "";

  return (
    ["single", "song"].includes(type.toLowerCase()) &&
    Boolean(artifact.lyrics?.trim())
  );
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

function stringSeed(value: string) {
  return [...value].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 11),
    0
  );
}

function normalizedImageUrl(artifact: FloatExperimentArtifact) {
  return (artifact.image_url || "").trim();
}

function uniqueImageArtifacts(artifacts: FloatExperimentArtifact[]) {
  const seen = new Set<string>();

  return artifacts.filter((artifact) => {
    const imageUrl = normalizedImageUrl(artifact);

    if (!imageUrl || seen.has(imageUrl)) return false;

    seen.add(imageUrl);
    return true;
  });
}

function visualClusterKey(artifact: FloatExperimentArtifact) {
  return (
    artifact.parent_id ||
    artifact.parent_slug ||
    artifact.album_id ||
    artifact.song_id ||
    artifact.band_id ||
    artifact.id
  );
}

function diversifiedSceneItems(
  candidates: {
    artifact: FloatExperimentArtifact;
    rel: Relationship;
    score: number;
  }[],
  limit: number
) {
  const selected: typeof candidates = [];
  const selectedIds = new Set<string>();
  const selectedClusters = new Set<string>();

  candidates.forEach((candidate) => {
    const cluster = visualClusterKey(candidate.artifact);

    if (
      selected.length < limit &&
      !selectedIds.has(candidate.artifact.id) &&
      !selectedClusters.has(cluster)
    ) {
      selected.push(candidate);
      selectedIds.add(candidate.artifact.id);
      selectedClusters.add(cluster);
    }
  });

  candidates.forEach((candidate) => {
    if (selected.length < limit && !selectedIds.has(candidate.artifact.id)) {
      selected.push(candidate);
      selectedIds.add(candidate.artifact.id);
    }
  });

  return selected;
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
  const imageArtifacts = uniqueImageArtifacts(artifacts);

  if (!imageArtifacts.length) return [];

  const anchorPool = [...imageArtifacts].sort((left, right) => {
    const leftSeed = stringSeed(`${left.id}:${left.slug}:${left.image_url || ""}`);
    const rightSeed = stringSeed(`${right.id}:${right.slug}:${right.image_url || ""}`);
    const leftScore =
      richness(left) + seededRange(seed + cycle * 191 + leftSeed, 0, 72);
    const rightScore =
      richness(right) + seededRange(seed + cycle * 191 + rightSeed, 0, 72);

    return rightScore - leftScore;
  });
  const anchor =
    anchorPool[Math.floor(seededUnit(seed + cycle * 97) * Math.min(anchorPool.length, 48))] ||
    anchorPool[0];

  const relatedCandidates = imageArtifacts
    .filter((artifact) => artifact.id !== anchor.id)
    .map((artifact, index) => {
      const rel = relationship(anchor, artifact);
      const artifactNoise = stringSeed(`${artifact.id}:${artifact.slug}`);
      const accident = seededRange(seed + cycle * 131 + index * 17 + artifactNoise, 0, 72);
      return { artifact, rel, score: rel.score + accident };
    })
    .sort((left, right) => right.score - left.score);
  const related = diversifiedSceneItems(
    relatedCandidates,
    layoutSlots.length - 1
  );

  const selected = [
    { artifact: anchor, rel: relationship(anchor, anchor) },
    ...related.map((item) => ({ artifact: item.artifact, rel: item.rel })),
  ];

  for (let index = selected.length; index < layoutSlots.length; index += 1) {
    const fallbackPool = imageArtifacts.filter(
      (artifact) => !selected.some((item) => item.artifact.id === artifact.id)
    );
    const artifact =
      fallbackPool[index % Math.max(1, fallbackPool.length)] ||
      imageArtifacts[index % imageArtifacts.length];

    selected.push({
      artifact,
      rel: {
        reasons: [`wide archive image from ${artifact.title}`],
        score: 1,
      },
    });
  }

  return selected.map((item, index) => {
    const slot = layoutSlots[index % layoutSlots.length];
    const itemSeed = seed + cycle * 211 + index * 43;
    const reasons = item.rel.reasons.length
      ? item.rel.reasons
      : ["accidental juxtaposition: no strong metadata tie, but the image surfaced nearby"];
    const piece: MemoryPiece = {
      align: slot.align,
      artifact: item.artifact,
      gridColumn: slot.gridColumn,
      gridRow: slot.gridRow,
      height: slot.height,
      heightCss: slot.heightCss,
      imageRotate: seededUnit(itemSeed + 11) > 0.84 ? 180 : 0,
      isAnchor: index === 0,
      isTiny: slot.width <= 7 || slot.height <= 8,
      label:
        index === 0
          ? "current remembered center"
          : item.rel.score > 20
            ? "related evidence"
            : "accidental echo",
      left: slot.left,
      opacity: index === 0 ? 1 : seededRange(itemSeed + 3, 0.52, 0.88),
      principles: [],
      reasons,
      rotate: 0,
      tapeTextureIndex: archiveTextureIndices(`${item.artifact.slug}:tape:${seed}:${cycle}:${index}`, 1)[0] || 0,
      textureIndices: archiveTextureIndices(`${item.artifact.slug}:${seed}:${cycle}:${index}`, 3),
      top: slot.top,
      treatment:
        seededUnit(itemSeed + 9) < 0.76
          ? "alive"
          : seededUnit(itemSeed + 9) < 0.94
            ? "faded"
            : "ghost",
      width: slot.width,
      widthCss: slot.widthCss,
      justify: slot.justify,
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
  cycle: number,
  phase: FloatPhase,
  signalIntensity = 100,
  sourceInterference: FloatInterferenceSignal[] = []
) {
  const prioritized = [
    ...scene.map((piece) => piece.artifact),
    ...artifacts.filter(
      (artifact) => !scene.some((piece) => piece.artifact.id === artifact.id)
    ),
  ];
  const pool = [
    ...sourceInterference,
    ...prioritized.flatMap(sourceSignals),
  ];
  const fallback = [
    { reason: "fallback corrupted caption", source: "system", text: "THE HOUSE REMEMBERS" },
    { reason: "fallback corrupted caption", source: "system", text: "SIGNAL LOSS / STILL LISTENING" },
    { reason: "fallback corrupted caption", source: "system", text: "ARRIVAL BOARD FOR A LOST SONG" },
    { reason: "fallback corrupted caption", source: "system", text: "DO NOT TRUST THE IMAGE" },
  ];
  const signals = pool.length ? pool : fallback;
  const baseCount = ELSEWHERE_FLOAT_INTENSITY_V2
    ? phase === "text"
      ? 124
      : phase === "catalog"
        ? 108
        : phase === "lyric"
          ? 88
          : 72
    : 8;
  const count = Math.max(0, Math.round(baseCount * (signalIntensity / 100)));
  const classes = [
    "elsewhere-memory-text--micro",
    "elsewhere-memory-text--small",
    "elsewhere-memory-text--caption",
    "elsewhere-memory-text--small",
    "elsewhere-memory-text--micro",
    "elsewhere-memory-text--caption",
  ];

  return Array.from({ length: count }, (_, index) => {
    const textSeed = seed + cycle * 509 + index * 73;
    const signal =
      signals[Math.floor(seededUnit(textSeed + 1) * signals.length)] || fallback[0];
    const paragraphCadence = phase === "text" ? 9 : phase === "catalog" ? 13 : 19;
    const isParagraph =
      index > 2 && (index % paragraphCadence === 4 || index % (paragraphCadence + 7) === 9);
    const sizeIndex = Math.min(
      classes.length - 1,
      Math.floor(Math.pow(seededUnit(textSeed + 2), 2.4) * classes.length)
    );
    const paragraphLines = Array.from({ length: phase === "text" ? 4 : 3 }, (_, lineIndex) => {
      const lineSignal =
        signals[Math.floor(seededUnit(textSeed + 19 + lineIndex * 11) * signals.length)] ||
        fallback[0];

      return clip(lineSignal.text.toUpperCase(), 62);
    });

    return {
      blur: seededUnit(textSeed + 3) < 0.18 ? seededRange(textSeed + 4, 0.4, 2.8) : 0,
      className: isParagraph ? "elsewhere-memory-text--paragraph" : classes[sizeIndex],
      left: isParagraph
        ? paragraphSlots[index % paragraphSlots.length].left
        : seededRange(textSeed + 5, -7, 93),
      mutate: seededUnit(textSeed + 6) > 0.28,
      opacity: isParagraph
        ? seededRange(textSeed + 7, 0.18, 0.42)
        : seededRange(textSeed + 7, 0.14, 0.56),
      reason: signal.reason,
      rotate: 0,
      source: signal.source,
      text: isParagraph
        ? paragraphLines.join("\n")
        : clip(signal.text.toUpperCase(), sizeIndex > 3 ? 54 : 92),
      top: isParagraph
        ? paragraphSlots[index % paragraphSlots.length].top
        : seededRange(textSeed + 9, 5, 88),
      zIndex: seededUnit(textSeed + 10) > 0.48 ? 24 : 6,
    } satisfies TransmissionText;
  });
}

function buildCatalogSignals(
  artifacts: FloatExperimentArtifact[],
  seed: number,
  cycle: number
): CatalogSignal[] {
  const sourceWords = uniqueList(
    artifacts.flatMap((artifact) => [
      artifact.title,
      artifact.album,
      artifact.era,
      artifact.year,
      artifact.parent_slug,
      artifact.artifact_type,
      artifact.kind,
      ...(artifact.motifs || []),
      ...(artifact.atmosphere || []),
      ...(artifact.rooms || []),
    ])
  );
  const words = sourceWords.length
    ? sourceWords
    : ["catalog", "signal", "room", "artifact", "index", "layer"];

  return Array.from({ length: 4 }, (_, rowIndex) => {
    const rowSeed = seed + cycle * 331 + rowIndex * 89;
    const parts = Array.from({ length: 8 }, (_, partIndex) => {
      const word =
        words[Math.floor(seededUnit(rowSeed + partIndex * 13) * words.length)] ||
        words[0];
      const separator = seededUnit(rowSeed + partIndex * 17) > 0.5 ? " / " : " -- ";

      return `${clip(word.toUpperCase(), 22)}${partIndex < 7 ? separator : ""}`;
    });

    return {
      seed: rowSeed,
      text: parts.join(""),
    };
  });
}

function buildRegisterFrames(seed: number, cycle: number, phase: FloatPhase) {
  const frameCount = phase === "image" ? 7 : phase === "catalog" ? 5 : 4;

  return Array.from({ length: frameCount }, (_, index) => {
    const frameSeed = seed + cycle * 421 + index * 67;
    const slot = layoutSlots[Math.floor(seededUnit(frameSeed + 1) * layoutSlots.length)];

    return {
      color: frameColors[Math.floor(seededUnit(frameSeed + 2) * frameColors.length)] || "gray",
      height: Math.max(7, slot.height + seededRange(frameSeed + 3, -5, 8)),
      left: Math.max(0, Math.min(94, slot.left + seededRange(frameSeed + 4, -4.5, 5.5))),
      opacity: seededRange(frameSeed + 5, 0.2, 0.74),
      top: Math.max(1, Math.min(90, slot.top + seededRange(frameSeed + 6, -4.5, 5.5))),
      width: Math.max(5, slot.width + seededRange(frameSeed + 7, -4, 7)),
    } satisfies RegisterFrame;
  });
}

function lyricStrength(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const length = normalized.length;
  let score = 0;

  if (length >= 14 && length <= 46) score += 16;
  else if (length >= 8 && length <= 62) score += 8;
  else score -= 8;

  if (/[?!]/.test(normalized)) score += 5;
  if (/[,;:]/.test(normalized)) score += 2;
  if (/\b(i|you|we|me|my|your|our|this|there|never|always|down|out|inside|open|dark|light)\b/i.test(normalized)) {
    score += 7;
  }
  if (normalized.split(/\s+/).length <= 7) score += 5;
  if (/[()[\]{}/*<>]/.test(normalized)) score += 3;

  return score;
}

function centralSignal(
  artifacts: FloatExperimentArtifact[],
  seed: number,
  cycle: number,
  fragmentLength = 34,
  lyricWeight = 100
) {
  const pool = artifacts
    .filter(isSongLyricSource)
    .flatMap(lyricSignals)
    .filter((signal) => signal.text.trim().length >= 3)
    .map((signal, index) => ({
      ...signal,
      index,
      score: lyricStrength(signal.text) + seededRange(seed + index * 31, 0, 7),
    }))
    .sort((left, right) => right.score - left.score);

  if (pool.length === 0) return null;

  const weightedCount = Math.round(pool.length * (lyricWeight / 100));
  const candidateCount = Math.min(
    pool.length,
    Math.max(Math.min(4, pool.length), weightedCount)
  );
  let signalIndex = Math.floor(seededUnit(seed + cycle * 811 + 811) * candidateCount);

  if (cycle > 0 && candidateCount > 1) {
    const previousIndex = Math.floor(
      seededUnit(seed + (cycle - 1) * 811 + 811) * candidateCount
    );

    if (signalIndex === previousIndex) {
      signalIndex = (signalIndex + 1) % candidateCount;
    }
  }

  const signal = pool[signalIndex] || pool[0];

  return {
    ...signal,
    text: clip(signal.text.toUpperCase(), fragmentLength),
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
  mutationIntensity = 1,
  reducedMotion,
  signal,
  seed,
}: {
  mutationIntensity?: number;
  reducedMotion: boolean;
  signal: TransmissionText;
  seed: number;
}) {
  const style = {
    "--memory-text-blur": `${fixed(signal.blur)}px`,
    "--memory-text-left": cssPercent(signal.left),
    "--memory-text-opacity": cssNumber(signal.opacity),
    "--memory-text-rotate": cssDegrees(signal.rotate),
    "--memory-text-top": cssPercent(signal.top),
    "--memory-text-z": String(signal.zIndex),
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
          intensity={0.2 * mutationIntensity}
        />
      ) : (
        signal.text
      )}
    </span>
  );
}

function CatalogSignalStrip({
  reducedMotion,
  signals,
}: {
  reducedMotion: boolean;
  signals: CatalogSignal[];
}) {
  return (
    <div className="elsewhere-memory-catalog-strip" aria-hidden>
      {signals.map((signal, index) => (
        <MutatingText
          className="elsewhere-memory-catalog-strip__line"
          intensity={0.12}
          key={`${signal.text}-${index}`}
          reducedMotion={reducedMotion}
          seed={signal.seed}
          text={signal.text}
        />
      ))}
    </div>
  );
}

function RegisterFrameLayer({ frames }: { frames: RegisterFrame[] }) {
  return (
    <div className="elsewhere-memory-register-frames" aria-hidden>
      {frames.map((frame, index) => {
        const style = {
          "--memory-frame-height": `${fixed(frame.height)}%`,
          "--memory-frame-left": cssPercent(frame.left),
          "--memory-frame-opacity": cssNumber(frame.opacity),
          "--memory-frame-top": cssPercent(frame.top),
          "--memory-frame-width": `${fixed(frame.width)}%`,
        } as CSSProperties;

        return (
          <span
            className={`elsewhere-memory-register-frame elsewhere-memory-register-frame--${frame.color}`}
            key={`${frame.left}-${frame.top}-${index}`}
            style={style}
          />
        );
      })}
    </div>
  );
}

function CentralSignalLayer({
  central,
  centralCycle,
  mutationIntensity,
  reducedMotion,
  seed,
  showInterference,
  transmissionText,
}: {
  central: NonNullable<ReturnType<typeof centralSignal>>;
  centralCycle: number;
  mutationIntensity: number;
  reducedMotion: boolean;
  seed: number;
  showInterference: boolean;
  transmissionText: TransmissionText[];
}) {
  const corruptionSeed = seed + centralCycle * 137;
  const overlays = showInterference ? transmissionText.slice(0, 5) : [];
  const lineCount = showInterference
    ? seededUnit(corruptionSeed + 3) > 0.42
      ? 7
      : 4
    : 0;
  const centerTextSize = Math.max(
    1.7,
    Math.min(9.6, 138 / Math.max(central.text.length, 12))
  );
  const stackStyle = {
    "--central-text-size": `${centerTextSize.toFixed(2)}vw`,
  } as CSSProperties;

  return (
    <div className="elsewhere-memory-central" aria-hidden>
      <div className="elsewhere-memory-central__stack" style={stackStyle}>
        <MutatingText
          className="elsewhere-memory-central__text elsewhere-memory-central__text--machine elsewhere-memory-central__text--contained"
          intensity={0.16 * mutationIntensity}
          reducedMotion={reducedMotion}
          seed={seed + centralCycle * 701}
          text={central.text}
        />
        <div className="elsewhere-memory-central__corruption">
          {Array.from({ length: lineCount }, (_, index) => {
            const lineSeed = corruptionSeed + index * 43;
            const vertical = seededUnit(lineSeed + 1) > 0.56;
            const style = {
              "--central-line-delay": `${seededRange(lineSeed + 2, -9, -0.5).toFixed(2)}s`,
              "--central-line-left": `${seededRange(lineSeed + 3, 4, 94).toFixed(2)}%`,
              "--central-line-opacity": seededRange(lineSeed + 4, 0.22, 0.62).toFixed(2),
              "--central-line-rotate": `${seededRange(lineSeed + 5, -1.8, 1.8).toFixed(2)}deg`,
              "--central-line-top": `${seededRange(lineSeed + 6, 8, 88).toFixed(2)}%`,
              "--central-line-width": `${seededRange(lineSeed + 7, 18, 92).toFixed(2)}%`,
            } as CSSProperties;

            return (
              <span
                className={`elsewhere-memory-central__strike ${vertical ? "is-vertical" : "is-horizontal"}`}
                key={`line-${index}`}
                style={style}
              />
            );
          })}
          {overlays.map((signal, index) => {
            const overlaySeed = corruptionSeed + index * 79;
            const style = {
              "--central-overlay-delay": `${seededRange(overlaySeed + 1, -11, -0.5).toFixed(2)}s`,
              "--central-overlay-left": `${seededRange(overlaySeed + 2, 12, 74).toFixed(2)}%`,
              "--central-overlay-opacity": seededRange(overlaySeed + 3, 0.24, 0.52).toFixed(2),
              "--central-overlay-scale": seededRange(overlaySeed + 4, 0.3, 0.5).toFixed(2),
              "--central-overlay-top": `${seededRange(overlaySeed + 5, 18, 78).toFixed(2)}%`,
            } as CSSProperties;

            return (
              <span
                className="elsewhere-memory-central__interference"
                key={`${signal.text}-${index}`}
                style={style}
              >
                {clip(signal.text.toUpperCase(), 48)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MemoryPieceCard({ piece, seed }: { piece: MemoryPiece; seed: number }) {
  const treatment =
    piece.treatment === "alive"
      ? {
          grayscale: seededRange(seed + 1, 0, 4),
          saturate: seededRange(seed + 2, 132, 190),
          brightness: seededRange(seed + 3, 96, 118),
          contrast: seededRange(seed + 4, 104, 128),
        }
      : piece.treatment === "faded"
        ? {
            grayscale: seededRange(seed + 1, 8, 24),
            saturate: seededRange(seed + 2, 92, 126),
            brightness: seededRange(seed + 3, 86, 106),
            contrast: seededRange(seed + 4, 100, 120),
          }
        : {
            grayscale: seededRange(seed + 1, 78, 100),
            saturate: seededRange(seed + 2, 34, 70),
            brightness: seededRange(seed + 3, 62, 84),
            contrast: seededRange(seed + 4, 128, 168),
          };
  const style = {
    "--memory-height": piece.heightCss,
    "--memory-grid-align": piece.align,
    "--memory-grid-column": piece.gridColumn,
    "--memory-grid-justify": piece.justify,
    "--memory-grid-row": piece.gridRow,
    "--memory-left": cssPercent(piece.left),
    "--memory-opacity": cssNumber(piece.opacity),
    "--memory-rotate": cssDegrees(piece.rotate),
    "--memory-top": cssPercent(piece.top),
    "--memory-width": piece.widthCss,
    "--memory-z": String(piece.zIndex),
    "--memory-grayscale": `${fixed(treatment.grayscale)}%`,
    "--memory-saturate": `${fixed(treatment.saturate)}%`,
    "--memory-brightness": `${fixed(treatment.brightness)}%`,
    "--memory-contrast": `${fixed(treatment.contrast)}%`,
    "--memory-image-rotate": cssDegrees(piece.imageRotate),
    "--memory-texture-opacity-a": cssNumber(seededRange(seed + 21, 0.025, 0.11)),
    "--memory-texture-opacity-b": cssNumber(seededRange(seed + 22, 0.03, 0.14)),
    "--memory-texture-opacity-c": cssNumber(seededRange(seed + 23, 0.02, 0.09)),
    "--memory-texture-rotate-a": cssDegrees([0, 90, 180, 270][Math.floor(seededUnit(seed + 24) * 4)] || 0),
    "--memory-texture-rotate-b": cssDegrees([0, 90, 180, 270][Math.floor(seededUnit(seed + 25) * 4)] || 0),
    "--memory-texture-rotate-c": cssDegrees([0, 90, 180, 270][Math.floor(seededUnit(seed + 26) * 4)] || 0),
    "--memory-texture-scale-a": cssNumber(seededRange(seed + 27, 1.2, 2.8)),
    "--memory-texture-scale-b": cssNumber(seededRange(seed + 28, 1.35, 3.2)),
    "--memory-texture-scale-c": cssNumber(seededRange(seed + 29, 1.6, 3.6)),
    "--memory-texture-x-a": cssPercent(seededRange(seed + 30, -40, 40)),
    "--memory-texture-x-b": cssPercent(seededRange(seed + 31, -45, 45)),
    "--memory-texture-x-c": cssPercent(seededRange(seed + 32, -50, 50)),
    "--memory-texture-y-a": cssPercent(seededRange(seed + 33, -40, 40)),
    "--memory-texture-y-b": cssPercent(seededRange(seed + 34, -45, 45)),
    "--memory-texture-y-c": cssPercent(seededRange(seed + 35, -50, 50)),
    "--memory-tape-brightness": `${fixed(seededRange(seed + 36, 72, 135))}%`,
    "--memory-tape-contrast": `${fixed(seededRange(seed + 37, 90, 190))}%`,
    "--memory-tape-opacity": cssNumber(seededRange(seed + 38, 0.24, 0.62)),
    "--memory-tape-position-x": cssPercent(seededRange(seed + 39, 0, 100)),
    "--memory-tape-position-y": cssPercent(seededRange(seed + 40, 0, 100)),
    "--memory-tape-rotate": cssDegrees(seededRange(seed + 41, -7, 7)),
    "--memory-tape-scale": cssNumber(seededRange(seed + 42, 1.1, 3.8)),
  } as CSSProperties;

  return (
    <a
      href={`/artifact/${piece.artifact.slug}`}
      className={`elsewhere-memory-piece group ${piece.isAnchor ? "is-anchor" : ""} ${piece.isTiny ? "is-tiny" : ""}`}
      style={style}
    >
      <span
        className={`elsewhere-memory-tape elsewhere-memory-tape--varied elsewhere-memory-texture--${piece.tapeTextureIndex}`}
        aria-hidden
      />
      <span className="elsewhere-memory-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={piece.artifact.image_url || ""} alt={piece.artifact.title} />
        {piece.textureIndices.map((textureIndex, index) => (
          <span
            aria-hidden
            className={`elsewhere-memory-image-texture elsewhere-memory-texture--${textureIndex}`}
            key={`${textureIndex}-${index}`}
          />
        ))}
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

function AtmosphericTextureLayers() {
  return (
    <div className="elsewhere-memory-textures" aria-hidden>
      {ARCHIVE_TEXTURES.map((texture, index) => (
        <span
          className={`elsewhere-memory-atmosphere-texture elsewhere-memory-texture--${index}`}
          key={texture}
        />
      ))}
    </div>
  );
}

export default function FloatExperiment({
  artifacts,
  centralTextArtifacts,
  controls = FLOAT_CONTROL_DEFAULTS,
  debugMode,
  returnHref = "/",
  showControls = true,
  sourceInterference = [],
  videoFormat,
  seed,
}: {
  artifacts: FloatExperimentArtifact[];
  centralTextArtifacts?: FloatExperimentArtifact[];
  controls?: FloatControlValues;
  debugMode: boolean;
  returnHref?: string;
  showControls?: boolean;
  sourceInterference?: FloatInterferenceSignal[];
  videoFormat?: FloatVideoFormat;
  seed: number;
}) {
  const [imageCycle, setImageCycle] = useState(0);
  const [textCycle, setTextCycle] = useState(0);
  const [centralCycle, setCentralCycle] = useState(0);
  const [phaseCycle, setPhaseCycle] = useState(0);
  const [textureCycle, setTextureCycle] = useState(0);
  const [rareEvent, setRareEvent] = useState(false);
  const [associationTargetTime, setAssociationTargetTime] = useState(0);
  const [clockNow, setClockNow] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [quiet, setQuiet] = useState(false);
  const reducedMotion = useReducedMotion();
  const phase = floatPhases[phaseCycle % floatPhases.length];
  const scene = useMemo(
    () => buildScene(artifacts, seed, imageCycle),
    [artifacts, imageCycle, seed]
  );
  const visibleScene = useMemo(() => {
    const count = Math.min(
      scene.length,
      Math.round(scene.length * (controls.iden / 100))
    );

    return scene.slice(0, count);
  }, [controls.iden, scene]);
  const anchor = visibleScene[0];
  const transmissionText = useMemo(
    () =>
      buildTransmissionText(
        visibleScene,
        artifacts,
        seed,
        textCycle,
        phase,
        controls.sig,
        sourceInterference
      ),
    [
      artifacts,
      controls.sig,
      phase,
      seed,
      sourceInterference,
      textCycle,
      visibleScene,
    ]
  );
  const catalogSignals = useMemo(
    () => buildCatalogSignals(artifacts, seed, textCycle),
    [artifacts, seed, textCycle]
  );
  const registerFrames = useMemo(
    () => buildRegisterFrames(seed, textureCycle, phase),
    [phase, seed, textureCycle]
  );
  const central = useMemo(
    () =>
      centralSignal(
        centralTextArtifacts || artifacts,
        seed,
        centralCycle,
        controls.frag,
        controls.lyric
      ),
    [
      artifacts,
      centralTextArtifacts,
      centralCycle,
      controls.frag,
      controls.lyric,
      seed,
    ]
  );
  const imageRate = controls.irate / 100;
  const centerRate = controls.crate / 100;
  const showCenter = controls.cscale > 0;
  const showSignal = controls.sig > 0;
  const style = {
    "--float-caption-opacity": String(controls.capvis / 100),
    "--float-caption-scale": String(controls.capsize / 100),
    "--float-center-scale": String(controls.cscale / 100),
    "--float-color-drift": String(controls.color / 100),
    "--float-darkness": String(controls.dark / 100),
    "--float-frame-opacity": String(controls.frames / 100),
    "--float-image-scale": String(controls.iscale / 100),
    "--float-layout-spread": String(controls.spread / 100),
    "--float-motion-smoothness": String(controls.smooth / 100),
    "--float-texture-strength": String(controls.tex / 100),
    "--float-vertical-bias": String(controls.vbias / 100),
    "--float-vividness": `${controls.vivid - 100}%`,
  } as CSSProperties;
  const associationCountdownMs = associationTargetTime && clockNow
    ? Math.max(0, Math.floor(associationTargetTime - clockNow))
    : 0;
  const associationCountdown = `${String(Math.floor(associationCountdownMs / 1000)).padStart(
    2,
    "0"
  )}.${String(associationCountdownMs % 1000).padStart(3, "0")}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 3_800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer = 0;
    let step = 0;

    const schedule = () => {
      const delay = seededRange(seed + step * 71 + 41, 20_000, 40_000);

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setPhaseCycle((current) => current + 1);
        step += 1;
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reducedMotion, seed]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer = 0;
    let releaseTimer = 0;
    let step = 0;

    const schedule = () => {
      const delay = seededRange(seed + step * 83 + 53, 18_000, 36_000);

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setRareEvent(true);
        releaseTimer = window.setTimeout(() => setRareEvent(false), 1650);
        step += 1;
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(releaseTimer);
    };
  }, [reducedMotion, seed]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer = 0;
    let step = 0;

    const schedule = () => {
      const delay = quiet
        ? seededRange(seed + step * 31 + 5, 9_000, 15_000)
        : seededRange(seed + step * 31 + 5, 5_800, 12_400) / imageRate;
      setAssociationTargetTime(Date.now() + delay);

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setImageCycle((current) => current + 1);
        step += 1;
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [imageRate, quiet, reducedMotion, seed]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer = 0;
    let step = 0;

    const schedule = () => {
      const delay = quiet
        ? seededRange(seed + step * 47 + 23, 2_400, 5_200)
        : seededRange(seed + step * 47 + 23, 850, 2_900);

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setTextureCycle((current) => current + 1);
        step += 1;
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [quiet, reducedMotion, seed]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer = 0;
    let step = 0;

    const schedule = () => {
      const delay = quiet
        ? seededRange(seed + step * 43 + 17, 4_400, 8_800)
        : seededRange(seed + step * 43 + 17, 1_700, 5_600) / imageRate;

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setTextCycle((current) => current + 1);
        step += 1;
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [imageRate, quiet, reducedMotion, seed]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let timer = 0;
    let step = 0;

    const schedule = () => {
      const delay = videoFormat
        ? seededRange(seed + step * 59 + 29, 2_800, 5_200) / centerRate
        : seededRange(seed + step * 59 + 29, 6_000, 15_000) / centerRate;

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setCentralCycle((current) => current + 1);
        step += 1;
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [centerRate, quiet, reducedMotion, seed, videoFormat]);

  return (
    <main
      className={`elsewhere-memory-stage min-h-screen overflow-hidden bg-[#070604] text-stone-200 ${ELSEWHERE_FLOAT_INTENSITY_V2 ? "elsewhere-memory-stage--intensity-v2" : ""} elsewhere-memory-stage--phase-${phase} ${rareEvent ? "elsewhere-memory-stage--rare-event" : ""} ${videoFormat ? "elsewhere-memory-stage--video" : ""} ${videoFormat ? `elsewhere-memory-stage--video-${videoFormat}` : ""}`}
      style={style}
    >
      <div className="elsewhere-memory-ground" aria-hidden />
      <AtmosphericTextureLayers />
      {ELSEWHERE_FLOAT_INTENSITY_V2 && (
        <>
          {showSignal && (
            <>
              <div className="elsewhere-memory-broadcast" aria-hidden />
              <CatalogSignalStrip
                reducedMotion={reducedMotion}
                signals={catalogSignals}
              />
              <div className="elsewhere-memory-text-field" aria-hidden>
                {transmissionText.map((signal, index) => (
                  <TransmissionTextLayer
                    key={`${signal.text}-${textCycle}-${index}`}
                    mutationIntensity={controls.mut / 100}
                    reducedMotion={reducedMotion}
                    seed={seed + textCycle * 1009 + index * 61}
                    signal={signal}
                  />
                ))}
              </div>
            </>
          )}
          {controls.frames > 0 && <RegisterFrameLayer frames={registerFrames} />}
          {central && showCenter && (
            <CentralSignalLayer
              central={central}
              centralCycle={centralCycle}
              mutationIntensity={controls.mut / 100}
              reducedMotion={reducedMotion}
              seed={seed}
              showInterference={showSignal}
              transmissionText={transmissionText}
            />
          )}
        </>
      )}
      <section className="relative z-20 flex min-h-screen flex-col px-5 py-5 md:px-8">
        {showControls && (
          <header className="flex items-start justify-between gap-5">
            {showIntro && controls.intro > 0 ? (
              <div className="elsewhere-memory-intro">
                <p className="text-[10px] uppercase tracking-[0.48em] text-stone-600">
                  Elsewhere / float experiment
                </p>
                <h1 className="mt-3 font-serif text-4xl text-stone-100 md:text-6xl">
                  The archive is thinking.
                </h1>
              </div>
            ) : (
              <div aria-hidden />
            )}
            <Link
              href={returnHref}
              className="border border-stone-800 bg-black/40 px-4 py-3 text-[10px] uppercase tracking-[0.34em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
            >
              Return
            </Link>
          </header>
        )}

        <div className="elsewhere-memory-table relative mt-6 flex-1">
          {visibleScene.map((piece, index) => (
            <MemoryPieceCard
              key={`${piece.artifact.id}-${imageCycle}-${index}`}
              piece={piece}
              seed={seed + imageCycle * 37 + textureCycle * 101 + index * 11}
            />
          ))}
          {anchor && (
            <aside className="elsewhere-memory-caption elsewhere-memory-caption--bare">
              <p>current association</p>
              <h2>{anchor.artifact.title}</h2>
              <p className="elsewhere-memory-caption__countdown elsewhere-memory-caption__countdown--stopwatch">
                {associationCountdown}
              </p>
              <span>
                {anchor.artifact.fragment ||
                  anchor.artifact.description ||
                  "A fragment came forward and pulled related material with it."}
              </span>
            </aside>
          )}
        </div>

        {showControls && (
          <footer className="relative z-40 flex flex-wrap items-end justify-between gap-4 border-t border-stone-900/80 pt-4">
            <span aria-hidden />
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
                onClick={() => {
                  setImageCycle((current) => current + 1);
                  setAssociationTargetTime(Date.now());
                  setTextCycle((current) => current + 1);
                  setCentralCycle((current) => current + 1);
                  setPhaseCycle((current) => current + 1);
                  setTextureCycle((current) => current + 1);
                }}
              >
                Remember Again
              </button>
            </div>
          </footer>
        )}
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
                  {piece.treatment}; image rotation {piece.imageRotate}deg
                </p>
              </article>
            ))}
            {ELSEWHERE_FLOAT_INTENSITY_V2 && central && (
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
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  <span className="text-stone-600">Chapter:</span>{" "}
                  {phase}; rare event {rareEvent ? "active" : "idle"}
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
