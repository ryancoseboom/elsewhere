export const DRIFT_MOODS = [
  {
    label: "Dawn",
    value: "dawn",
    neighbors: ["morning", "late-night"],
    prompts: ["Move toward first light", "Let dawn enter"],
  },
  {
    label: "Morning",
    value: "morning",
    neighbors: ["dawn", "afternoon"],
    prompts: ["Stay in the morning", "Follow the day opening"],
  },
  {
    label: "Afternoon",
    value: "afternoon",
    neighbors: ["morning", "dusk"],
    prompts: ["Cross the afternoon", "Follow the exposed signal"],
  },
  {
    label: "Dusk",
    value: "dusk",
    neighbors: ["afternoon", "evening"],
    prompts: ["Let dusk gather", "Follow the light leaving"],
  },
  {
    label: "Evening",
    value: "evening",
    neighbors: ["dusk", "late-night"],
    prompts: ["Remain in the evening", "Follow the room darkening"],
  },
  {
    label: "Late Night",
    value: "late-night",
    neighbors: ["evening", "dawn"],
    prompts: ["Go deeper into late night", "Trust the after-hours signal"],
  },
] as const;

export type DriftMood = (typeof DRIFT_MOODS)[number]["value"];

const DRIFT_MOOD_VALUES = new Set<string>(
  DRIFT_MOODS.map((mood) => mood.value)
);

export function isDriftMood(value: string): value is DriftMood {
  return DRIFT_MOOD_VALUES.has(value);
}

export function cleanDriftMoods(values: FormDataEntryValue[] | string[] | null) {
  const seen = new Set<string>();
  const rawValues = values || [];

  return rawValues
    .map((value) => String(value).trim())
    .filter((value): value is DriftMood => isDriftMood(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

export function driftMoodLabel(value: string) {
  return DRIFT_MOODS.find((mood) => mood.value === value)?.label || value;
}

export function driftMoodPrompt(value: string, seed = 0) {
  const mood = DRIFT_MOODS.find((item) => item.value === value);
  if (!mood) return "";

  return mood.prompts[seed % mood.prompts.length];
}

export function driftMoodNeighbors(value: string) {
  return [
    ...(DRIFT_MOODS.find((mood) => mood.value === value)?.neighbors || []),
  ] as string[];
}
