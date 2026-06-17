"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { FloatExperimentArtifact } from "@/components/FloatExperiment";

type FadeImageSlot = {
  artifact: FloatExperimentArtifact;
  column: number;
  delay: number;
  duration: number;
  index: number;
  opacity: number;
  row: number;
  scale: number;
  shiftX: number;
  shiftY: number;
  width: number;
};

type FadeInterferenceLine = {
  delay: number;
  duration: number;
  drift: number;
  index: number;
  left: number;
  opacity: number;
  text: string;
  top: number;
};

type FadeColorWash = {
  color: string;
  delay: number;
  duration: number;
  index: number;
  left: number;
  opacity: number;
  scale: number;
  top: number;
};

const FALLBACK_LAUNCH_SEED = 1701;
const CLIENT_LAUNCH_SEED =
  typeof window === "undefined"
    ? FALLBACK_LAUNCH_SEED
    : Math.floor(Math.random() * 1_000_000_000);

function subscribeLaunchSeed() {
  return () => {};
}

function getClientLaunchSeed() {
  return CLIENT_LAUNCH_SEED;
}

function getServerLaunchSeed() {
  return FALLBACK_LAUNCH_SEED;
}

function hashValue(value: string) {
  return [...value].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 13),
    0
  );
}

function seededUnit(seed: number) {
  const value = Math.sin(seed) * 10000;

  return value - Math.floor(value);
}

function seededRange(seed: number, minimum: number, maximum: number) {
  return minimum + (maximum - minimum) * seededUnit(seed);
}

function clip(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) return normalized;

  return normalized.slice(0, limit).replace(/\s+\S*$/, "");
}

function textFragments(value?: string | null) {
  return (value || "")
    .split(/[\r\n]+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .map((line) => clip(line, 58));
}

function artifactTextPool(artifacts: FloatExperimentArtifact[]) {
  const signals = artifacts.flatMap((artifact) => [
    ...textFragments(artifact.lyrics),
    ...textFragments(artifact.fragment),
    ...textFragments(artifact.description),
    artifact.title,
    ...(artifact.motifs || []),
    ...(artifact.atmosphere || []),
  ]);
  const unique = new Set<string>();

  return signals
    .map((signal) => signal?.trim())
    .filter((signal): signal is string => Boolean(signal && signal.length >= 3))
    .filter((signal) => {
      const key = signal.toLowerCase();

      if (unique.has(key)) return false;

      unique.add(key);
      return true;
    });
}

function uniqueImageArtifacts(artifacts: FloatExperimentArtifact[]) {
  const seen = new Set<string>();

  return artifacts.filter((artifact) => {
    const imageUrl = artifact.image_url?.trim();

    if (!imageUrl || seen.has(imageUrl)) return false;

    seen.add(imageUrl);
    return true;
  });
}

function pick<T>(items: T[], seed: number) {
  return items[Math.floor(seededUnit(seed) * items.length)] || items[0];
}

function rankedIndexes(count: number, seed: number) {
  return Array.from({ length: count }, (_, index) => index).sort(
    (left, right) => {
      const leftRank = seededUnit(seed + left * 193);
      const rightRank = seededUnit(seed + right * 193);

      return leftRank - rightRank;
    }
  );
}

function fadeSlots(
  artifacts: FloatExperimentArtifact[],
  seed: number,
  cycle: number
): FadeImageSlot[] {
  const imageArtifacts = uniqueImageArtifacts(artifacts);

  if (imageArtifacts.length === 0) return [];

  const columns = 5;
  const rows = 3;
  const cells = rankedIndexes(columns * rows, seed + cycle * 431);
  const slotCount = Math.min(10, Math.max(6, imageArtifacts.length));

  return Array.from({ length: slotCount }, (_, index) => {
    const slotSeed = seed + cycle * 997 + index * 149;
    const cell = cells[index % cells.length];
    const column = (cell % columns) + 1;
    const row = Math.floor(cell / columns) + 1;
    const artifact =
      imageArtifacts[
        Math.floor(
          seededUnit(slotSeed + hashValue(imageArtifacts[index % imageArtifacts.length].slug)) *
            imageArtifacts.length
        )
      ] || imageArtifacts[index % imageArtifacts.length];

    return {
      artifact,
      column,
      delay: seededRange(slotSeed + 1, -38, -1),
      duration: seededRange(slotSeed + 2, 22, 42),
      index,
      opacity: seededRange(slotSeed + 4, 0.26, 0.72),
      row,
      scale: seededRange(slotSeed + 5, 0.92, 1.18),
      shiftX: seededRange(slotSeed + 6, -7, 7),
      shiftY: seededRange(slotSeed + 7, -6, 6),
      width:
        index === 0
          ? seededRange(slotSeed + 8, 76, 88)
          : seededRange(slotSeed + 8, 48, 74),
    };
  });
}

function fadeInterferenceLines(
  textPool: string[],
  seed: number,
  cycle: number
): FadeInterferenceLine[] {
  if (textPool.length === 0) return [];

  return Array.from({ length: 18 }, (_, index) => {
    const lineSeed = seed + cycle * 613 + index * 257;

    return {
      delay: seededRange(lineSeed + 1, 0, 11),
      duration: seededRange(lineSeed + 2, 11, 24),
      drift: seededRange(lineSeed + 3, -4.5, 4.5),
      index,
      left: seededRange(lineSeed + 4, 4, 88),
      opacity: seededRange(lineSeed + 5, 0.12, 0.34),
      text: clip(pick(textPool, lineSeed + 6) || "elsewhere", 72),
      top: seededRange(lineSeed + 7, 8, 90),
    };
  });
}

function fadeColorWashes(seed: number, cycle: number): FadeColorWash[] {
  const colors = [
    "rgba(124, 102, 111, 0.62)",
    "rgba(105, 119, 106, 0.56)",
    "rgba(126, 111, 88, 0.52)",
    "rgba(74, 103, 111, 0.46)",
    "rgba(101, 91, 126, 0.42)",
  ];

  return colors.map((color, index) => {
    const washSeed = seed + cycle * 389 + index * 211;

    return {
      color,
      delay: seededRange(washSeed + 1, -34, -2),
      duration: seededRange(washSeed + 2, 22, 40),
      index,
      left: seededRange(washSeed + 3, 2, 84),
      opacity: seededRange(washSeed + 4, 0.2, 0.38),
      scale: seededRange(washSeed + 5, 0.86, 1.28),
      top: seededRange(washSeed + 6, 5, 82),
    };
  });
}

function FadeImage({ slot }: { slot: FadeImageSlot }) {
  const style = {
    "--fade-image-column": String(slot.column),
    "--fade-image-delay": `${slot.delay.toFixed(2)}s`,
    "--fade-image-duration": `${slot.duration.toFixed(2)}s`,
    "--fade-image-opacity": slot.opacity.toFixed(2),
    "--fade-image-row": String(slot.row),
    "--fade-image-scale": slot.scale.toFixed(3),
    "--fade-image-shift-x": `${slot.shiftX.toFixed(2)}%`,
    "--fade-image-shift-y": `${slot.shiftY.toFixed(2)}%`,
    "--fade-image-width": `${slot.width.toFixed(2)}%`,
    "--fade-image-z": String(20 - slot.index),
  } as CSSProperties;

  return (
    <figure className="elsewhere-fade-image" style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slot.artifact.image_url || ""} alt="" />
    </figure>
  );
}

function FadeInterference({ line }: { line: FadeInterferenceLine }) {
  const style = {
    "--fade-interference-delay": `${line.delay.toFixed(2)}s`,
    "--fade-interference-duration": `${line.duration.toFixed(2)}s`,
    "--fade-interference-drift": `${line.drift.toFixed(2)}vw`,
    "--fade-interference-left": `${line.left.toFixed(2)}%`,
    "--fade-interference-opacity": line.opacity.toFixed(2),
    "--fade-interference-top": `${line.top.toFixed(2)}%`,
  } as CSSProperties;

  return (
    <p className="elsewhere-fade-interference-line" style={style}>
      {line.text}
    </p>
  );
}

function FadeColorWash({ wash }: { wash: FadeColorWash }) {
  const style = {
    "--fade-wash-color": wash.color,
    "--fade-wash-delay": `${wash.delay.toFixed(2)}s`,
    "--fade-wash-duration": `${wash.duration.toFixed(2)}s`,
    "--fade-wash-left": `${wash.left.toFixed(2)}%`,
    "--fade-wash-opacity": wash.opacity.toFixed(2),
    "--fade-wash-scale": wash.scale.toFixed(3),
    "--fade-wash-top": `${wash.top.toFixed(2)}%`,
  } as CSSProperties;

  return <div className="elsewhere-fade-color-wash" style={style} />;
}

function FadeText({ text, seed }: { text: string; seed: number }) {
  const style = {
    "--fade-text-size": `${Math.max(
      2.35,
      Math.min(7.2, 86 / Math.max(text.length, 12))
    ).toFixed(2)}vw`,
  } as CSSProperties;

  return (
    <h1 className="elsewhere-fade-center-text" aria-label={text} style={style}>
      {text.split("").map((char, index) => {
        const style = {
          "--fade-char-delay": `${seededRange(seed + index * 17, 0, 1.15).toFixed(2)}s`,
          "--fade-char-duration": `${seededRange(seed + index * 23, 8.5, 14).toFixed(2)}s`,
        } as CSSProperties;

        return (
          <span
            aria-hidden="true"
            className="elsewhere-fade-char"
            key={`${char}-${index}`}
            style={style}
          >
            {char === " " ? "\u00a0" : char}
          </span>
        );
      })}
    </h1>
  );
}

export default function FadeExperiment({
  artifacts,
  seed,
}: {
  artifacts: FloatExperimentArtifact[];
  seed?: number;
}) {
  const generatedLaunchSeed = useSyncExternalStore(
    subscribeLaunchSeed,
    getClientLaunchSeed,
    getServerLaunchSeed
  );
  const launchSeed = seed ?? generatedLaunchSeed;
  const [imageCycle, setImageCycle] = useState(0);
  const [textCycle, setTextCycle] = useState(0);
  const slots = useMemo(
    () => fadeSlots(artifacts, launchSeed, imageCycle),
    [artifacts, imageCycle, launchSeed]
  );
  const textPool = useMemo(() => artifactTextPool(artifacts), [artifacts]);
  const interferenceLines = useMemo(
    () => fadeInterferenceLines(textPool, launchSeed, textCycle),
    [launchSeed, textCycle, textPool]
  );
  const colorWashes = useMemo(
    () => fadeColorWashes(launchSeed, imageCycle),
    [imageCycle, launchSeed]
  );
  const centerText =
    pick(textPool, launchSeed + textCycle * 811)?.toUpperCase() || "ELSEWHERE";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setImageCycle((current) => current + 1);
    }, 36000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTextCycle((current) => current + 1);
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="elsewhere-fade-stage min-h-screen overflow-hidden bg-[#080706] text-stone-100">
      <div className="elsewhere-fade-ground" aria-hidden />
      <div className="elsewhere-fade-haze" aria-hidden />
      <div className="elsewhere-fade-color-field" aria-hidden>
        {colorWashes.map((wash) => (
          <FadeColorWash key={`${wash.index}-${imageCycle}`} wash={wash} />
        ))}
      </div>
      <div className="elsewhere-fade-images" aria-hidden>
        {slots.map((slot) => (
          <FadeImage
            key={`${slot.artifact.id}-${imageCycle}-${slot.index}`}
            slot={slot}
          />
        ))}
      </div>
      <div className="elsewhere-fade-interference" aria-hidden>
        {interferenceLines.map((line) => (
          <FadeInterference
            key={`${line.index}-${textCycle}-${line.text}`}
            line={line}
          />
        ))}
      </div>
      <div className="elsewhere-fade-text-field">
        <FadeText
          key={`${centerText}-${textCycle}`}
          seed={launchSeed + textCycle * 97}
          text={centerText}
        />
      </div>
      <Link
        href="/"
        className="absolute right-5 top-5 z-30 border border-stone-800/80 bg-black/20 px-4 py-3 text-[10px] uppercase tracking-[0.34em] text-stone-500 backdrop-blur-sm transition hover:border-stone-500 hover:text-stone-200"
      >
        Return
      </Link>
    </main>
  );
}
