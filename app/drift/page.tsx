import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shuffle, type ArchiveArtifact } from "@/lib/archive-navigation";

export default async function DriftPage() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("id, slug, drift_weight, discovery_visibility")
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"])
    .not("slug", "is", null);

  if (error) throw new Error(error.message);

  const artifacts = (data || []) as ArchiveArtifact[];
  const publicArtifacts = artifacts.filter(
    (artifact) => artifact.discovery_visibility !== "hidden"
  );
  const hiddenArtifacts = artifacts.filter(
    (artifact) => artifact.discovery_visibility === "hidden"
  );
  const hiddenOpening =
    hiddenArtifacts.length > 0 &&
    shuffle([
      "public",
      "public",
      "public",
      "public",
      "public",
      "public",
      "hidden",
    ])[0] === "hidden";
  const shuffled = shuffle(
    hiddenOpening ? hiddenArtifacts : publicArtifacts.length ? publicArtifacts : artifacts
  );

  if (shuffled.length === 0) redirect("/");

  redirect(`/drift/${shuffled[0].slug}`);
}
