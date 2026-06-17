import { connection } from "next/server";
import FadeExperiment from "@/components/FadeExperiment";
import type { FloatExperimentArtifact } from "@/components/FloatExperiment";
import { createPublicClient } from "@/lib/supabase/server";
import { shuffle } from "@/lib/archive-navigation";

export const dynamic = "force-dynamic";

export default async function FadePage() {
  await connection();
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, description, fragment, lyrics, atmosphere, motifs, rooms, nearby, image_url, album, year, era, discovery_visibility"
    )
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"])
    .limit(500);

  if (error) throw new Error(error.message);

  const artifacts = (data || []) as FloatExperimentArtifact[];
  const publicArtifacts = artifacts.filter(
    (artifact) => artifact.discovery_visibility !== "hidden"
  );
  const hiddenArtifacts = artifacts.filter(
    (artifact) => artifact.discovery_visibility === "hidden"
  );
  const revealHidden =
    hiddenArtifacts.length > 0 &&
    shuffle(["public", "public", "public", "public", "public", "hidden"])[0] ===
      "hidden";
  const fadeArtifacts = revealHidden
    ? shuffle([...publicArtifacts, ...shuffle(hiddenArtifacts).slice(0, 3)])
    : shuffle(publicArtifacts);
  const hasImages = fadeArtifacts.some((artifact) => artifact.image_url?.trim());

  if (!hasImages) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080706] px-6 text-center text-stone-200">
        <section className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.46em] text-stone-600">
            Elsewhere / Fade
          </p>
          <h1 className="mt-6 font-serif text-7xl text-stone-100">Fade</h1>
          <p className="mt-5 text-sm leading-7 text-stone-500">
            The archive has not revealed any images yet.
          </p>
        </section>
      </main>
    );
  }

  return <FadeExperiment artifacts={fadeArtifacts} />;
}
