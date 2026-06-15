import Link from "next/link";
import { notFound } from "next/navigation";
import SourceInterference from "@/components/SourceInterference";
import { createClient } from "@/lib/supabase/server";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  kind: string | null;
  fragment: string | null;
  description: string | null;
  motifs: string[] | null;
  atmosphere: string[] | null;
  image_url: string | null;
};

function unslugify(slug: string) {
  return slug.replace(/-/g, " ");
}

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function MotifPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artifacts")
    .select("id, slug, title, kind, fragment, description, motifs, atmosphere, image_url")
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .not("motifs", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const artifacts = (data || []).filter((artifact) =>
    ((artifact.motifs || []) as string[]).some(
  (motif: string) => normalize(motif) === slug
)
  ) as Artifact[];

  if (artifacts.length === 0) {
    notFound();
  }

  const title = unslugify(slug);

  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Elsewhere
        </Link>

        <header className="mt-14 mb-14">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Motif
          </p>

          <h1 className="mt-4 text-5xl md:text-8xl font-serif capitalize text-stone-100">
            {title}
          </h1>

          <p className="mt-6 max-w-2xl text-stone-400 leading-relaxed">
            A quiet recurrence. Things that do not explain each other, but seem
            to recognize each other in the dark.
          </p>
          <SourceInterference
            className="mt-7"
            context={{ motif: title }}
            limit={2}
          />
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          {artifacts.map((artifact) => (
            <Link
              key={artifact.id}
              href={`/artifact/${artifact.slug}`}
              className="group rounded-3xl border border-stone-800 bg-stone-950/60 p-6 transition hover:border-stone-600"
            >
              {artifact.image_url && (
                <div className="mb-6 overflow-hidden rounded-2xl border border-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artifact.image_url}
                    alt={artifact.title}
                    className="aspect-[16/10] w-full object-cover opacity-80 transition group-hover:opacity-100"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {artifact.kind && (
                  <span className="rounded-full border border-stone-800 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    {artifact.kind}
                  </span>
                )}

                {artifact.atmosphere?.slice(0, 3).map((mood) => (
                  <span
                    key={mood}
                    className="rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-500"
                  >
                    {mood}
                  </span>
                ))}
              </div>

              <h2 className="mt-5 text-3xl font-serif text-stone-100">
                {artifact.title}
              </h2>

              {artifact.fragment && (
                <p className="mt-4 text-lg italic leading-relaxed text-stone-400">
                  “{artifact.fragment}”
                </p>
              )}

              {artifact.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-500">
                  {artifact.description}
                </p>
              )}
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
