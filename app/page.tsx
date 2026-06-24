import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/server";

type BackdropArtifact = {
  image_url: string | null;
  slug: string;
  title: string;
};

type FeaturedArtifact = {
  artifact_type: string | null;
  description: string | null;
  fragment: string | null;
  id: string;
  image_url: string | null;
  kind: string | null;
  slug: string;
  title: string;
  year: string | null;
};

const routes = [
  {
    href: "/explore",
    label: "Explore",
    text: "Follow the releases, recordings, demos, photos, and paper trails.",
  },
  {
    href: "/drift",
    label: "Drift",
    text: "Enter without a map. Move through a changing path of related artifacts.",
  },
  {
    href: "/float",
    label: "Float",
    text: "Let the images, notes, and old pages dissolve into motion.",
  },
];

function artifactType(artifact: FeaturedArtifact) {
  return artifact.artifact_type || artifact.kind || "Record";
}

function artifactDossierCode(artifact: FeaturedArtifact) {
  const titleSeed = artifact.title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const checksum = Array.from(artifact.slug).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );

  return `EL-${titleSeed}-${String(checksum % 997).padStart(3, "0")}`;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function Home() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("artifacts")
    .select("slug, title, image_url")
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .not("image_url", "is", null)
    .limit(120);
  const backdrop = ((data || []) as BackdropArtifact[])
    .filter((artifact) => artifact.image_url?.trim())
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .slice(0, 12);
  const { data: featuredData } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, description, fragment, image_url, year"
    )
    .eq("slug", "coco")
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .maybeSingle();
  const featured = (featuredData || null) as FeaturedArtifact | null;
  const [
    { count: featuredTrackCount = 0 },
    { count: featuredImageCount = 0 },
  ] = featured
    ? await Promise.all([
        supabase
          .from("artifacts")
          .select("id", { count: "exact", head: true })
          .eq("is_public", true)
          .eq("discovery_visibility", "public")
          .eq("album_id", featured.id)
          .or("artifact_type.eq.Song,kind.eq.Song"),
        supabase
          .from("artifacts")
          .select("id", { count: "exact", head: true })
          .eq("is_public", true)
          .eq("discovery_visibility", "public")
          .not("image_url", "is", null)
          .or(`parent_id.eq.${featured.id},album_id.eq.${featured.id}`),
      ])
    : [{ count: 0 }, { count: 0 }];
  const featuredInventory = featured
    ? [
        featured.year,
        countLabel(featuredTrackCount || 0, "track"),
        countLabel(featuredImageCount || 0, "visual ref", "visual refs"),
      ].filter(Boolean)
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090807] px-4 py-5 text-stone-200 sm:px-6 sm:py-8">
      <div className="absolute inset-0 opacity-55">
        <div className="grid h-full grid-cols-4 grid-rows-3 gap-1 p-1 md:grid-cols-6">
          {backdrop.map((artifact, index) => (
            <div
              key={`${artifact.slug}-${index}`}
              className="relative overflow-hidden bg-stone-950"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artifact.image_url || ""}
                alt=""
                className="h-full w-full object-cover opacity-55 transition duration-[4000ms] hover:opacity-80"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(9,8,7,0.22),rgba(9,8,7,0.91)_72%)]" />
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col justify-between sm:min-h-[calc(100vh-4rem)]">
        <p className="text-[10px] uppercase tracking-[0.48em] text-stone-600">
          Elsewhere / Halou
        </p>

        <section className="max-w-3xl py-12 sm:py-16">
          <p className="text-[10px] uppercase tracking-[0.58em] text-stone-600">
            An unstable archive
          </p>
          <h1 className="mt-6 font-serif text-6xl leading-none text-stone-100 sm:text-7xl md:text-[10rem]">
            Elsewhere
          </h1>
          <p className="mt-7 max-w-xl text-sm leading-7 text-stone-500 md:text-base">
            Over 25 years of Halou recordings, photos, fragments, false starts,
            and things we thought were gone.
          </p>

          {featured && (
            <Link
              href={`/artifact/${featured.slug}`}
              className="group mt-8 grid max-w-2xl grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-y border-stone-800/80 bg-black/20 py-4 pr-4 transition hover:border-stone-600/80 hover:bg-black/35 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <div className="relative aspect-square overflow-hidden border border-stone-800 bg-stone-950">
                {featured.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.image_url}
                    alt=""
                    className="h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
                  />
                ) : (
                  <div className="h-full w-full bg-stone-900" />
                )}
              </div>
              <div className="min-w-0 self-center">
                <p className="text-[9px] uppercase tracking-[0.32em] text-stone-700">
                  {artifactDossierCode(featured)} / {artifactType(featured)}
                </p>
                <p className="mt-2 font-serif text-2xl leading-none text-stone-300 transition group-hover:text-white sm:text-3xl">
                  {featured.title}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.22em] text-stone-600">
                  {featuredInventory.join(" / ")}
                </p>
                {(featured.fragment || featured.description) && (
                  <p className="mt-3 line-clamp-2 text-xs italic leading-5 text-stone-500 transition group-hover:text-stone-400">
                    {featured.fragment || featured.description}
                  </p>
                )}
              </div>
            </Link>
          )}

          <nav className="mt-10 grid gap-px bg-stone-800/70 sm:mt-14 md:grid-cols-3">
            {routes.map((route, index) => (
              <Link
                key={route.href}
                href={route.href}
                className="group bg-[#0e0d0b]/95 p-5 transition hover:bg-stone-900/95 sm:p-6 md:min-h-52"
              >
                <p className="text-[9px] uppercase tracking-[0.32em] text-stone-700">
                  0{index + 1}
                </p>
                <p className="mt-8 font-serif text-3xl text-stone-300 transition group-hover:text-white">
                  {route.label}
                </p>
                <p className="mt-4 text-xs leading-6 text-stone-600 transition group-hover:text-stone-400">
                  {route.text}
                </p>
              </Link>
            ))}
          </nav>
        </section>

        <div className="text-[9px] uppercase tracking-[0.3em] text-stone-700">
          <span>Old tapes / new rooms</span>
          <Link
            className="ml-4 text-stone-500 transition hover:text-stone-200"
            href="/float-studio"
          >
            Float Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
