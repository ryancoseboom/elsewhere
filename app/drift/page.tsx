import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shuffle, type ArchiveArtifact } from "@/lib/archive-navigation";

export default async function DriftPage() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("id, slug, drift_weight")
    .eq("is_public", true)
    .not("slug", "is", null);

  if (error) throw new Error(error.message);

  const artifacts = shuffle((data || []) as ArchiveArtifact[]);

  if (artifacts.length === 0) redirect("/");

  redirect(`/drift/${artifacts[0].slug}`);
}
