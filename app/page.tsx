import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/server";

type BackdropArtifact = {
  image_url: string | null;
  slug: string;
  title: string;
};

const routes = [
  {
    href: "/explore",
    label: "Explore",
    text: "Read the structure. Follow releases, recordings, and their attached signals.",
  },
  {
    href: "/drift",
    label: "Drift",
    text: "Enter without a map. Move through a changing path of related artifacts.",
  },
  {
    href: "/float",
    label: "Float",
    text: "Let the archive dissolve into a visual transmission.",
  },
];

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
            Recordings, images, and incomplete transmissions. There is no
            correct point of entry.
          </p>

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
          <span>Archive transmission / ongoing</span>
          <Link
            className="ml-4 text-stone-700 transition hover:text-stone-400"
            href="/float-studio"
          >
            Float Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
