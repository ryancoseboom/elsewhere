"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function splitList(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createArtifact(formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const fragment = String(formData.get("fragment") || "").trim();

  const rooms = splitList(formData.get("rooms"));
  const nearby = splitList(formData.get("nearby"));

  if (!title || !slug) {
    throw new Error("Title and slug are required.");
  }

  const { error } = await supabase.from("artifacts").insert({
    title,
    slug,
    description,
    fragment,
    rooms,
    nearby,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/artifact/${slug}`);
}