import Link from "next/link";
import BackroomMoodEditor, { type MoodSong } from "@/components/BackroomMoodEditor";
import { createClient } from "@/lib/supabase/server";

type ArtifactRow = {
  album: string | null;
  album_id: string | null;
  artifact_type: string | null;
  atmosphere: string[] | null;
  id: string;
  kind: string | null;
  parent_id: string | null;
  parent_slug: string | null;
  slug: string;
  title: string;
};

function artifactType(artifact: ArtifactRow) {
  return artifact.artifact_type || artifact.kind || "";
}

function parentAlbumLabel(
  song: ArtifactRow,
  artifactsById: Map<string, ArtifactRow>
) {
  const parent =
    (song.album_id && artifactsById.get(song.album_id)) ||
    (song.parent_id && artifactsById.get(song.parent_id));

  if (parent && ["Album", "Single"].includes(artifactType(parent))) {
    return parent.title;
  }

  return song.album || song.parent_slug || null;
}

export default async function BackroomMoodsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, album_id, album, atmosphere"
    )
    .order("title", { ascending: true });

  const loadError = error?.message || "";
  const artifacts = (data || []) as ArtifactRow[];
  const artifactsById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const songs: MoodSong[] = artifacts
    .filter((artifact) => artifactType(artifact) === "Song")
    .map((song) => ({
      album: parentAlbumLabel(song, artifactsById),
      atmosphere: song.atmosphere || [],
      id: song.id,
      slug: song.slug,
      title: song.title,
    }));

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-stone-200">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-stone-800 pb-8">
          <Link
            href="/backroom"
            className="text-[10px] uppercase tracking-[0.3em] text-stone-600 transition hover:text-stone-300"
          >
            ← Backroom
          </Link>
          <p className="mt-10 text-[10px] uppercase tracking-[0.42em] text-stone-600">
            Emotional weather
          </p>
          <h1 className="mt-4 font-serif text-5xl text-stone-100 md:text-7xl">
            Song moods
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-500">
            Assign atmosphere tags to songs quickly: dreamlike, damaged,
            luminous, uneasy, tender. Less spreadsheet, more weather report from
            the archive.
          </p>
        </header>

        {loadError ? (
          <section className="mt-10 border border-red-950 bg-red-950/10 p-6">
            <p className="font-serif text-2xl text-red-200">
              The weather could not be read.
            </p>
            <p className="mt-3 text-sm text-red-300/70">{loadError}</p>
          </section>
        ) : (
          <div className="mt-10">
            <BackroomMoodEditor initialSongs={songs} />
          </div>
        )}
      </div>
    </main>
  );
}
