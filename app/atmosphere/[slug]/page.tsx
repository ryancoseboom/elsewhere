import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  artifact_type: string | null;
  kind: string | null;
  fragment: string | null;
  atmosphere: string[] | null;
  image_url: string | null;
};

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function AtmospherePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artifacts")
    .select("id, slug, title, artifact_type, kind, fragment, atmosphere, image_url")
    .eq("is_public", true)
    .not("atmosphere", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const artifacts = (data || []).filter((artifact) =>
    ((artifact.atmosphere || []) as string[]).some(
      (atmosphere) => normalize(atmosphere) === slug
    )
  ) as Artifact[];

  if (artifacts.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#11100e] px-5 py-8 text-stone-200">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-stone-600 transition hover:text-stone-300"
        >
          ← Elsewhere
        </Link>

        <header className="mt-16 border-b border-stone-800 pb-8">
          <p className="text-[10px] uppercase tracking-[0.42em] text-stone-600">
            Atmosphere
          </p>
          <h1 className="mt-4 font-serif text-6xl capitalize leading-none text-stone-100 md:text-9xl">
            {slug.replaceAll("-", " ")}
          </h1>
        </header>

        <section className="mt-8 grid gap-px bg-stone-800 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact) => (
            <Link
              key={artifact.id}
              href={`/artifact/${artifact.slug}`}
              className="group bg-neutral-950 transition hover:bg-stone-900"
            >
              {artifact.image_url && (
                <div className="aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artifact.image_url}
                    alt={artifact.title}
                    className="h-full w-full object-cover opacity-65 grayscale transition duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
              )}
              <div className="p-5">
                <p className="text-[9px] uppercase tracking-[0.24em] text-stone-700">
                  {artifact.artifact_type || artifact.kind || "Elsewhere"}
                </p>
                <h2 className="mt-3 font-serif text-2xl text-stone-300 transition group-hover:text-white">
                  {artifact.title}
                </h2>
                {artifact.fragment && (
                  <p className="mt-3 line-clamp-2 font-serif text-sm italic leading-6 text-stone-600">
                    “{artifact.fragment}”
                  </p>
                )}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
