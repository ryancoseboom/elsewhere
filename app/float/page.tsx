import Link from "next/link";
import ArtifactImageExperience from "@/components/ArtifactImageExperience";
import { createClient } from "@/lib/supabase/server";
import { shuffle } from "@/lib/archive-navigation";

type FloatImage = {
  image_url: string | null;
  title: string;
};

export default async function GlobalFloatPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("title, image_url")
    .eq("is_public", true)
    .not("image_url", "is", null)
    .limit(240);

  if (error) throw new Error(error.message);

  const images = shuffle(
    ((data || []) as FloatImage[]).filter((image) => image.image_url?.trim())
  )
    .slice(0, 30)
    .map((image) => ({ src: image.image_url || "", alt: image.title }));

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
