"use server";

import { revalidatePath } from "next/cache";
import { cleanDriftMoods } from "@/lib/drift-moods";
import { createClient } from "@/lib/supabase/server";

type DriftMoodMode = "add" | "remove";

export type DriftMoodUpdate = {
  drift_moods: string[];
  id: string;
};

export type DriftMoodUpdateResult = {
  message: string;
  updated: DriftMoodUpdate[];
};

function addDriftMoods(current: string[] | null, additions: string[]) {
  const moods = [...(current || [])];
  const seen = new Set(moods);

  for (const mood of additions) {
    if (seen.has(mood)) continue;

    moods.push(mood);
    seen.add(mood);
  }

  return moods;
}

function removeDriftMoods(current: string[] | null, removals: string[]) {
  const removalSet = new Set(removals);
  return (current || []).filter((mood) => !removalSet.has(mood));
}

async function updateArtifacts(
  artifactIds: string[],
  moods: string[],
  mode: DriftMoodMode
) {
  const normalizedArtifactIds = [
    ...new Set(artifactIds.map((id) => id.trim()).filter(Boolean)),
  ];
  const normalizedMoods = cleanDriftMoods(moods);

  if (normalizedArtifactIds.length === 0) {
    throw new Error("Choose at least one artifact.");
  }

  if (normalizedMoods.length === 0) {
    throw new Error("Choose at least one time of day.");
  }

  const supabase = await createClient();
  const { data: artifacts, error: artifactsError } = await supabase
    .from("artifacts")
    .select("id, drift_moods")
    .in("id", normalizedArtifactIds);

  if (artifactsError) throw new Error(artifactsError.message);

  const updated: DriftMoodUpdate[] = [];

  for (const artifact of artifacts || []) {
    const currentMoods = (artifact.drift_moods || []) as string[];
    const nextMoods =
      mode === "add"
        ? addDriftMoods(currentMoods, normalizedMoods)
        : removeDriftMoods(currentMoods, normalizedMoods);

    const { error } = await supabase
      .from("artifacts")
      .update({ drift_moods: nextMoods })
      .eq("id", artifact.id);

    if (error) throw new Error(error.message);

    updated.push({ drift_moods: nextMoods, id: artifact.id });
  }

  revalidatePath("/backroom");
  revalidatePath("/backroom/drift-moods");
  revalidatePath("/drift");
  revalidatePath("/drift/[slug]", "page");
  revalidatePath("/artifact/[slug]", "page");

  return updated;
}

export async function bulkUpdateArtifactDriftMoodsAction({
  artifactIds,
  mode,
  moods,
}: {
  artifactIds: string[];
  mode: DriftMoodMode;
  moods: string[];
}): Promise<DriftMoodUpdateResult> {
  const updated = await updateArtifacts(artifactIds, moods, mode);
  const verb = mode === "add" ? "added to" : "removed from";

  return {
    message: `${moods.length} time mood${moods.length === 1 ? "" : "s"} ${verb} ${
      updated.length
    } artifact${updated.length === 1 ? "" : "s"}.`,
    updated,
  };
}
