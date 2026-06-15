"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type MoodMode = "add" | "remove";

export type MoodUpdate = {
  atmosphere: string[];
  id: string;
};

export type MoodUpdateResult = {
  message: string;
  updated: MoodUpdate[];
};

function normalizeMood(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeMoods(values: string[]) {
  const moods: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const mood = normalizeMood(value);
    if (!mood || seen.has(mood)) continue;

    moods.push(mood);
    seen.add(mood);
  }

  return moods;
}

function addMoods(current: string[] | null, additions: string[]) {
  const moods = [...(current || [])];
  const seen = new Set(moods.map((mood) => mood.toLowerCase()));

  for (const mood of additions) {
    const key = mood.toLowerCase();
    if (seen.has(key)) continue;

    moods.push(mood);
    seen.add(key);
  }

  return moods;
}

function removeMoods(current: string[] | null, removals: string[]) {
  const removalSet = new Set(removals.map((mood) => mood.toLowerCase()));
  return (current || []).filter((mood) => !removalSet.has(mood.toLowerCase()));
}

async function updateSongs(songIds: string[], moods: string[], mode: MoodMode) {
  const normalizedSongIds = [...new Set(songIds.map((id) => id.trim()).filter(Boolean))];
  const normalizedMoods = normalizeMoods(moods);

  if (normalizedSongIds.length === 0) throw new Error("Choose at least one song.");
  if (normalizedMoods.length === 0) throw new Error("Choose at least one mood.");

  const supabase = await createClient();
  const { data: songs, error: songsError } = await supabase
    .from("artifacts")
    .select("id, atmosphere")
    .in("id", normalizedSongIds)
    .or("artifact_type.eq.Song,kind.eq.Song");

  if (songsError) throw new Error(songsError.message);

  const updated: MoodUpdate[] = [];

  for (const song of songs || []) {
    const currentAtmosphere = (song.atmosphere || []) as string[];
    const nextAtmosphere =
      mode === "add"
        ? addMoods(currentAtmosphere, normalizedMoods)
        : removeMoods(currentAtmosphere, normalizedMoods);

    const { error } = await supabase
      .from("artifacts")
      .update({ atmosphere: nextAtmosphere })
      .eq("id", song.id);

    if (error) throw new Error(error.message);

    updated.push({ atmosphere: nextAtmosphere, id: song.id });
  }

  revalidatePath("/backroom");
  revalidatePath("/backroom/moods");
  revalidatePath("/artifact/[slug]", "page");
  revalidatePath("/atmosphere/[slug]", "page");

  return updated;
}

export async function updateSongMoodsAction({
  mode,
  moods,
  songId,
}: {
  mode: MoodMode;
  moods: string[];
  songId: string;
}): Promise<MoodUpdateResult> {
  const updated = await updateSongs([songId], moods, mode);
  const verb = mode === "add" ? "added to" : "removed from";

  return {
    message: `${moods.length} mood${moods.length === 1 ? "" : "s"} ${verb} 1 song.`,
    updated,
  };
}

export async function bulkUpdateSongMoodsAction({
  mode,
  moods,
  songIds,
}: {
  mode: MoodMode;
  moods: string[];
  songIds: string[];
}): Promise<MoodUpdateResult> {
  const updated = await updateSongs(songIds, moods, mode);
  const verb = mode === "add" ? "added to" : "removed from";

  return {
    message: `${moods.length} mood${moods.length === 1 ? "" : "s"} ${verb} ${
      updated.length
    } song${updated.length === 1 ? "" : "s"}.`,
    updated,
  };
}
