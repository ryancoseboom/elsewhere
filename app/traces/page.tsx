import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Artifact = {
  motifs: string[] | null;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function ConstellationsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artifacts")
    .select("motifs")
    .not("motifs", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();

  (data as Artifact[]).forEach((artifact) => {
    (artifact.motifs || []).forEach((motif) => {
      const clean = motif.trim();
      if (!clean) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });
  });

  const motifs = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

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
            Traces
          </p>

          <h1 className="mt-4 text-5xl md:text-8xl font-serif text-stone-100">
            Recurring signals.
          </h1>

          <p className="mt-6 max-w-2xl text-stone-400 leading-relaxed">
            Motifs that keep appearing. Not categories exactly. More like
            lights seen from different rooms.
          </p>
        </header>

        {motifs.length > 0 ? (
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {motifs.map(([motif, count]) => (
              <Link
                key={motif}
                href={`/motif/${slugify(motif)}`}
                className="group rounded-3xl border border-stone-800 bg-stone-950/60 p-7 transition hover:border-stone-600"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-stone-600">
                  {count} {count === 1 ? "thing" : "things"}
                </p>

                <h2 className="mt-5 text-3xl font-serif capitalize text-stone-100">
                  {motif}
                </h2>

                <p className="mt-5 text-sm leading-relaxed text-stone-500">
                  A thread that keeps reappearing.
                </p>
              </Link>
            ))}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-stone-800 bg-stone-950/40 p-10 text-center">
            <p className="text-stone-500">
              No traces have formed yet.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}