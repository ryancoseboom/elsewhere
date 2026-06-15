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
  rooms: string[] | null;
  motifs: string[] | null;
  atmosphere: string[] | null;
  image_url: string | null;
};

const roomCopy: Record<string, { title: string; line: string }> = {
  visitor: {
    title: "The Visitor",
    line: "A place for things that arrive without belonging.",
  },
  house: {
    title: "The House",
    line: "Some rooms are still lit.",
  },
  road: {
    title: "The Road",
    line: "A route through distance, memory, and night.",
  },
};

function roomTitle(slug: string) {
  return roomCopy[slug]?.title || slug.replace(/-/g, " ");
}

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, fragment, description, rooms, motifs, atmosphere, image_url"
    )
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .not("rooms", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const artifacts = (data || []).filter((artifact) =>
    ((artifact.rooms || []) as string[]).some(
  (room: string) => normalize(room) === slug
)
  ) as Artifact[];

  const copy = roomCopy[slug];

  if (artifacts.length === 0) {
    notFound();
  }

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
            Room
          </p>

          <h1 className="mt-4 text-5xl md:text-8xl font-serif capitalize text-stone-100">
            {roomTitle(slug)}
          </h1>

          <p className="mt-6 max-w-2xl text-stone-400 leading-relaxed">
            {copy?.line || "A room that has begun to gather things."}
          </p>
          <SourceInterference
            className="mt-7"
            context={{ room: slug }}
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
              </Link>
            ))}
        </section>
      </div>
    </main>
  );
}
