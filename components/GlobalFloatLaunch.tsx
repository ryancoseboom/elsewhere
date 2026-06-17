"use client";

import { useMemo, useSyncExternalStore } from "react";
import FloatExperiment, {
  type FloatExperimentArtifact,
  type FloatInterferenceSignal,
} from "@/components/FloatExperiment";
import type { FloatControlValues } from "@/lib/float-controls";

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
    (total, char, index) => total + char.charCodeAt(0) * (index + 17),
    0
  );
}

function seededUnit(seed: number) {
  const value = Math.sin(seed) * 10000;

  return value - Math.floor(value);
}

function shuffledArtifacts(artifacts: FloatExperimentArtifact[], seed: number) {
  return [...artifacts].sort((left, right) => {
    const leftRank = seededUnit(seed + hashValue(`${left.id}:${left.slug}`));
    const rightRank = seededUnit(seed + hashValue(`${right.id}:${right.slug}`));

    return leftRank - rightRank;
  });
}

export default function GlobalFloatLaunch({
  artifacts,
  controls,
  debugMode,
  sourceInterference,
}: {
  artifacts: FloatExperimentArtifact[];
  controls: FloatControlValues;
  debugMode: boolean;
  sourceInterference: FloatInterferenceSignal[];
}) {
  const launchSeed = useSyncExternalStore(
    subscribeLaunchSeed,
    getClientLaunchSeed,
    getServerLaunchSeed
  );
  const shuffled = useMemo(
    () => shuffledArtifacts(artifacts, launchSeed),
    [artifacts, launchSeed]
  );

  return (
    <FloatExperiment
      artifacts={shuffled}
      controls={controls}
      debugMode={debugMode}
      seed={launchSeed}
      sourceInterference={sourceInterference}
    />
  );
}
