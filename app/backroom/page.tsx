import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  kind: string | null;
  fragment: string | null;
  atmosphere: string[] | null;
  motifs: string[] | null;
  created_at: string;
};

export default async function BackroomPage() {
  const supabase = await createClient();

  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select(
  "id, slug, title, parent_slug, kind, fragment, atmosphere, motifs, created_at"
)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items = (artifacts || []) as Artifact[];

const rootArtifacts = items.filter(
  (artifact) => !artifact.parent_slug
);

const childrenFor = (parentSlug: string) =>
  items.filter(
    (artifact) => artifact.parent_slug === parentSlug
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
            >
              ← Elsewhere
            </Link>

            <p className="mt-12 text-xs uppercase tracking-[0.4em] text-stone-500">
              Backroom
            </p>

            <h1 className="mt-4 text-4xl md:text-6xl font-serif text-stone-100">
              Things waiting.
            </h1>

            <p className="mt-6 max-w-xl text-stone-400 leading-relaxed">
              Objects, fragments, songs, photographs, and half-lit memories
              before they find their way into the rooms.
            </p>
          </div>

          <Link
            href="/backroom/artifacts/new"
            className="inline-flex w-fit rounded-full border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950 transition"
          >
            Bring something in
          </Link>

          <Link
  href="/backroom/songs/new"
  className="inline-flex w-fit rounded-full border border-stone-600 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950 transition"
>
  Bring in a song
</Link>
        </header>

        {artifacts && artifacts.length > 0 ? (
          <section className="grid gap-5">
            {rootArtifacts.map((artifact) => {
  const children = childrenFor(artifact.slug);

  return (
              <article
                key={artifact.id}
                className="group border border-stone-800 bg-stone-950/60 p-6"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      {artifact.kind && (
                        <span className="rounded-full border border-stone-800 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-stone-500">
                          {artifact.kind}
                        </span>
                      )}

                      <span className="text-xs text-stone-600">
                        {new Date(artifact.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-serif text-stone-100">
                      {artifact.title}
                    </h2>

                    {artifact.fragment && (
                      <p className="mt-4 max-w-2xl text-lg italic leading-relaxed text-stone-400">
                        “{artifact.fragment}”
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2">
                      {artifact.motifs?.map((motif) => (
                        <span
                          key={motif}
                          className="rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-500"
                        >
                          {motif}
                        </span>
                      ))}

                      {artifact.atmosphere?.map((mood) => (
                        <span
                          key={mood}
                          className="rounded-full border border-stone-800 px-3 py-1 text-xs text-stone-500"
                        >
                          {mood}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <Link
                      href={`/artifact/${artifact.slug}`}
                      className="rounded-full border border-stone-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-stone-400 hover:border-stone-300 hover:text-stone-100"
                    >
                      Visit
                    </Link>

                    <Link
                      href={`/backroom/artifacts/${artifact.slug}/edit`}
                      className="rounded-full border border-stone-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-stone-400 hover:border-stone-300 hover:text-stone-100"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              {children.length > 0 && (
  <div className="mt-6 border-l border-stone-900 pl-6 space-y-3">
    {children.map((child) => (
      <div
        key={child.id}
        className="flex items-center justify-between py-2"
      >
        <div>
          <p className="text-sm text-stone-300">
            {child.title}
          </p>

          {child.kind && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-stone-600">
              {child.kind}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/artifact/${child.slug}`}
            className="text-xs text-stone-500 hover:text-stone-200"
          >
            Visit
          </Link>

          <Link
            href={`/backroom/artifacts/${child.slug}/edit`}
            className="text-xs text-stone-500 hover:text-stone-200"
          >
            Edit
          </Link>
        </div>
      </div>
    ))}
  </div>
)}
</article>
  );
})}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-stone-800 bg-stone-950/40 p-10 text-center">
            <p className="text-stone-500">
              Nothing is waiting yet.
            </p>

            <Link
              href="/backroom/artifacts/new"
              className="mt-6 inline-flex rounded-full border border-stone-700 px-6 py-3 text-xs uppercase tracking-[0.25em] text-stone-300 hover:bg-stone-200 hover:text-neutral-950 transition"
            >
              Bring the first thing in
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}