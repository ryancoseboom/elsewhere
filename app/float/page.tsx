import Link from "next/link";
import { connection } from "next/server";
import ArtifactImageExperience from "@/components/ArtifactImageExperience";
import FloatExperiment, {
  type FloatExperimentArtifact,
} from "@/components/FloatExperiment";
import SourceInterference from "@/components/SourceInterference";
import { createClient } from "@/lib/supabase/server";
import { shuffle } from "@/lib/archive-navigation";

type FloatImage = {
  image_url: string | null;
  slug: string;
  title: string;
};

type FloatPageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function GlobalFloatPage({
  searchParams,
}: {
  searchParams: FloatPageSearchParams;
}) {
  await connection();
  const supabase = await createClient();
  const params = await searchParams;
  const debugParam = params.debug || params.dev;
  const debugValue = Array.isArray(debugParam) ? debugParam[0] : debugParam;
  const experimentEnabled = process.env.ENABLE_FLOAT_EXPERIMENT === "true";
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, description, fragment, lyrics, atmosphere, motifs, rooms, nearby, image_url, album, year, era, discovery_visibility"
    )
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"])
    .not("image_url", "is", null)
    .limit(240);

  if (error) throw new Error(error.message);

  const rawFloatArtifacts = ((data || []) as FloatExperimentArtifact[]).filter(
    (artifact) => artifact.image_url?.trim()
  );
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
    ? [...publicFloatArtifacts, ...shuffle(hiddenFloatArtifacts).slice(0, 3)]
    : publicFloatArtifacts;
  const experimentSeed = floatArtifacts.reduce(
    (seed, artifact, index) =>
      (seed + artifact.slug.length * 97 + artifact.title.length * 31 + index * 17) %
      1_000_000,
    713
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
  const debugMode =
    experimentEnabled && ["float", "1", "true"].includes(debugValue || "");

  if (experimentEnabled) {
    return (
      <>
        <FloatExperiment
          artifacts={floatArtifacts}
          debugMode={debugMode}
          seed={experimentSeed}
        />
        <div className="pointer-events-auto fixed inset-x-6 bottom-6 z-[70] max-w-4xl">
          <SourceInterference context={floatContext} limit={2} />
        </div>
      </>
    );
  }

  const images = shuffle(
    (floatArtifacts as FloatImage[]).filter((image) => image.image_url?.trim())
  )
    .slice(0, 30)
    .map((image) => ({
      src: image.image_url || "",
      alt: image.title,
      slug: image.slug,
    }));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090807] px-6 text-center text-stone-200">
      <section className="max-w-xl">
        <p className="text-[10px] uppercase tracking-[0.46em] text-stone-600">
          Elsewhere / global transmission
        </p>
        <h1 className="mt-6 font-serif text-7xl text-stone-100">Float</h1>
        <p className="mt-5 text-sm leading-7 text-stone-500">
          Thirty fragments are drawn from across the archive. Each transmission
          begins elsewhere.
        </p>
        <SourceInterference
          className="mx-auto mt-6 text-left"
          context={floatContext}
          limit={2}
        />
        <div className="mt-8">
          <ArtifactImageExperience
            autoLaunch
            images={images}
            returnHref="/"
            showTrigger={false}
          />
        </div>
        {images.length === 0 && (
          <p className="mt-8 text-sm text-stone-600">
            The archive has not revealed any images yet.
          </p>
        )}
        <Link
          href="/"
          className="mt-10 inline-block border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
        >
          Return
        </Link>
      </section>
    </main>
  );
}
