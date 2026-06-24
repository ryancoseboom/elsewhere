import { connection } from "next/server";
import type { FloatExperimentArtifact } from "@/components/FloatExperiment";
import GlobalFloatLaunch from "@/components/GlobalFloatLaunch";
import SourceInterference from "@/components/SourceInterference";
import { createPublicClient } from "@/lib/supabase/server";
import { shuffle } from "@/lib/archive-navigation";
import { readFloatControls } from "@/lib/float-controls";
import { getSourceInterferenceSnippets } from "@/lib/source-artifacts";
import { getLaunchInterferenceSnippets } from "@/lib/launch-interference";

export const dynamic = "force-dynamic";

type FloatPageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function GlobalFloatPage({
  searchParams,
}: {
  searchParams: FloatPageSearchParams;
}) {
  await connection();
  const supabase = createPublicClient();
  const params = await searchParams;
  const debugParam = params.debug || params.dev;
  const debugValue = Array.isArray(debugParam) ? debugParam[0] : debugParam;
  const floatControls = readFloatControls(params);
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, description, fragment, lyrics, atmosphere, motifs, rooms, nearby, image_url, album, year, era, discovery_visibility"
    )
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"])
    .limit(500);

  if (error) throw new Error(error.message);

  const rawFloatArtifacts = (data || []) as FloatExperimentArtifact[];
  const publicFloatArtifacts = rawFloatArtifacts.filter(
    (artifact) => artifact.discovery_visibility !== "hidden"
  );
  const hiddenFloatArtifacts = rawFloatArtifacts.filter(
    (artifact) => artifact.discovery_visibility === "hidden"
  );
  const revealHidden =
    hiddenFloatArtifacts.length > 0 &&
    shuffle(["public", "public", "public", "public", "public", "hidden"])[0] ===
      "hidden";
  const floatArtifacts = revealHidden
    ? shuffle([...publicFloatArtifacts, ...shuffle(hiddenFloatArtifacts).slice(0, 3)])
    : shuffle(publicFloatArtifacts);
  const imageArtifacts = floatArtifacts.filter((artifact) =>
    artifact.image_url?.trim()
  );
  const floatContext = {
    atmosphere: [
      ...new Set(floatArtifacts.flatMap((artifact) => artifact.atmosphere || [])),
    ].slice(0, 10),
    motifs: [...new Set(floatArtifacts.flatMap((artifact) => artifact.motifs || []))].slice(
      0,
      10
    ),
  };
  const sourceInterferenceSnippets = await getSourceInterferenceSnippets({
      context: floatContext,
      limit: 14,
      supabase,
    });
  const sourceInterference = [
    ...getLaunchInterferenceSnippets(floatContext, 10),
    ...sourceInterferenceSnippets,
  ].map((snippet) => ({
    reason: snippet.tone,
    source: snippet.sourceTitle,
    text: snippet.text,
  }));
  const debugMode = ["float", "1", "true"].includes(debugValue || "");

  if (imageArtifacts.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090807] px-6 text-center text-stone-200">
        <section className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.46em] text-stone-600">
            Elsewhere / global transmission
          </p>
          <h1 className="mt-6 font-serif text-7xl text-stone-100">Float</h1>
          <p className="mt-5 text-sm leading-7 text-stone-500">
            The archive has not revealed any images yet.
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      <GlobalFloatLaunch
        artifacts={floatArtifacts}
        controls={floatControls}
        debugMode={debugMode}
        sourceInterference={sourceInterference}
      />
      <div className="pointer-events-none fixed inset-x-6 bottom-24 z-[70] max-w-4xl">
        <SourceInterference context={floatContext} limit={7} />
      </div>
    </>
  );
}
