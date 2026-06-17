import Link from "next/link";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import FloatExperiment, {
  type FloatExperimentArtifact,
} from "@/components/FloatExperiment";
import PosterDrop from "@/components/PosterDrop";
import { createClient } from "@/lib/supabase/server";
import { readFloatControls } from "@/lib/float-controls";

type Poster = {
  id: string;
  slug: string;
  title: string;
  kind: string | null;
  artifact_type: string | null;
  parent_id: string | null;
  parent_slug: string | null;
  band_id: string | null;
  album_id: string | null;
  song_id: string | null;
  description: string | null;
  fragment: string | null;
  atmosphere: string[] | null;
  motifs: string[] | null;
  rooms: string[] | null;
  nearby: string[] | null;
  image_url: string | null;
  lyrics: string | null;
  discovery_visibility: string | null;
  album: string | null;
  year: string | null;
  era: string | null;
  sort_order: number | null;
};

type PosterSearchParams = Promise<
  {
    float?: string | string[];
    floatDebug?: string | string[];
    debug?: string | string[];
    poster?: string | string[];
  } & Record<string, string | string[] | undefined>
>;

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function hasValidBackroomAuthorization(value: string | null) {
  if (!value?.startsWith("Basic ")) return false;

  try {
    const [user, password] = Buffer.from(value.slice(6), "base64")
      .toString("utf8")
      .split(":");

    return (
      user === process.env.BACKROOM_USER &&
      password === process.env.BACKROOM_PASSWORD
    );
  } catch {
    return false;
  }
}

function posterFloatArtifact(poster: Poster): FloatExperimentArtifact {
  return {
    album: poster.album,
    album_id: poster.album_id,
    artifact_type: poster.artifact_type,
    atmosphere: poster.atmosphere,
    band_id: poster.band_id,
    description: poster.description,
    discovery_visibility: poster.discovery_visibility,
    era: poster.era,
    fragment: poster.fragment,
    id: poster.id,
    image_url: poster.image_url,
    kind: poster.kind,
    lyrics: poster.lyrics,
    motifs: poster.motifs,
    nearby: poster.nearby,
    parent_id: poster.parent_id,
    parent_slug: poster.parent_slug,
    rooms: poster.rooms,
    slug: poster.slug,
    song_id: poster.song_id,
    title: poster.title,
    year: poster.year,
  };
}

function seededPosterScore(poster: Poster, salt: number) {
  return [...poster.slug].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + salt),
    salt * 101
  );
}

function shuffledPosters(posters: Poster[]) {
  const salt = Date.now() % 9973;

  return [...posters].sort(
    (left, right) =>
      seededPosterScore(left, salt) - seededPosterScore(right, salt)
  );
}

export default async function PostersPage({
  searchParams,
}: {
  searchParams: PosterSearchParams;
}) {
  await connection();
  const resolvedSearchParams = await searchParams;
  const selectedPosterSlug = one(resolvedSearchParams.poster) || "";
  const floatMode = ["1", "true", "float"].includes(
    one(resolvedSearchParams.float) || ""
  );
  const floatDebugMode = ["1", "true", "debug", "float"].includes(
    one(resolvedSearchParams.floatDebug || resolvedSearchParams.debug) || ""
  );
  const floatControls = readFloatControls(resolvedSearchParams);
  const canEdit =
    (await cookies()).get("elsewhere_backroom")?.value === "yes" ||
    hasValidBackroomAuthorization((await headers()).get("authorization"));
  const supabase = await createClient();
  let posterQuery = supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, description, fragment, atmosphere, motifs, rooms, nearby, image_url, lyrics, discovery_visibility, album, year, era, sort_order"
    )
    .or("artifact_type.eq.Poster,kind.eq.Poster")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!canEdit) {
    posterQuery = posterQuery
      .eq("is_public", true)
      .eq("discovery_visibility", "public");
  }

  const { data, error } = await posterQuery;

  if (error) throw new Error(error.message);

  const posters = (data || []) as Poster[];
  const selectedPoster = posters.find(
    (poster) => poster.slug === selectedPosterSlug
  );
  const displayPosters = selectedPoster
    ? [
        selectedPoster,
        ...shuffledPosters(
          posters.filter((poster) => poster.id !== selectedPoster.id)
        ),
      ]
    : shuffledPosters(posters);

  if (floatMode) {
    const floatPosters = posters
      .filter((poster) => poster.image_url?.trim())
      .map(posterFloatArtifact);

    return (
      <FloatExperiment
        artifacts={floatPosters}
        controls={floatControls}
        debugMode={floatDebugMode}
        seed={9127}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#090807] px-5 py-7 text-stone-200 md:px-8">
      <div className="mx-auto max-w-[110rem]">
        <header className="grid gap-8 border-b border-stone-800 pb-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
          <div>
            <Link
              href="/"
              className="text-[10px] uppercase tracking-[0.34em] text-stone-600 transition hover:text-stone-300"
            >
              ← Elsewhere
            </Link>
            <p className="mt-12 text-[10px] uppercase tracking-[0.54em] text-stone-600">
              Live archive / paper signals
            </p>
            <h1 className="mt-4 font-serif text-6xl leading-none text-stone-100 md:text-9xl">
              Posters
            </h1>
          </div>
          <div className="text-sm leading-7 text-stone-500">
            <p>
              Live evidence without a release shelf. Venue residue, tour paper,
              unknown rooms, and graphic weather from performances.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/posters?float=1"
                className="border border-stone-700 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-stone-300 transition hover:border-stone-300 hover:text-white"
              >
                Float posters
              </Link>
              <Link
                href="/drift"
                className="border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
              >
                Drift
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
          {canEdit && <PosterDrop />}
          {displayPosters.map((poster, index) => {
            const isSelected = poster.id === selectedPoster?.id;
            const isLarge = isSelected || index % 9 === 0 || index % 13 === 4;

            return (
              <Link
                key={poster.id}
                href={`/posters?poster=${encodeURIComponent(poster.slug)}`}
                className={`group relative overflow-hidden border border-stone-900 bg-stone-950 ${
                  isLarge ? "sm:col-span-2 sm:row-span-2" : ""
                } ${
                  isSelected
                    ? "ring-1 ring-inset ring-stone-200/60"
                    : "hover:border-stone-700"
                }`}
              >
                <div className="aspect-[11/17]">
                  {poster.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster.image_url}
                      alt={poster.title}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-85 saturate-[0.9] transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100 group-hover:saturate-100"
                    />
                  ) : (
                    <div className="flex h-full items-end p-4 text-[10px] uppercase tracking-[0.24em] text-stone-700">
                      Missing poster image
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                  <p className="font-serif text-lg leading-tight text-stone-100">
                    {poster.title}
                  </p>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.24em] text-stone-500">
                    {[poster.year, poster.era, "Poster"]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                  {isSelected && (
                    <p className="mt-3 text-[9px] uppercase tracking-[0.24em] text-stone-400">
                      Found through Drift
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </section>

        {posters.length === 0 && !canEdit && (
          <section className="mt-14 border border-dashed border-stone-800 p-12 text-center">
            <p className="text-sm italic text-stone-600">
              No live posters have surfaced yet.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
