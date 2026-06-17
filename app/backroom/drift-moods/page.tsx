import Link from "next/link";
import BackroomDriftMoodEditor, {
  type DriftMoodArtifact,
} from "@/components/BackroomDriftMoodEditor";
import { createClient } from "@/lib/supabase/server";

type ArtifactRow = {
  album: string | null;
  album_id: string | null;
  artifact_type: string | null;
  drift_moods: string[] | null;
  id: string;
  kind: string | null;
  parent_id: string | null;
  parent_slug: string | null;
  slug: string;
  title: string;
};

function artifactType(artifact: ArtifactRow) {
  return artifact.artifact_type || artifact.kind || "Other";
}

function parentAlbumLabel(
  artifact: ArtifactRow,
  artifactsById: Map<string, ArtifactRow>
) {
  const parent =
    (artifact.album_id && artifactsById.get(artifact.album_id)) ||
    (artifact.parent_id && artifactsById.get(artifact.parent_id));

  if (parent && ["Album", "Single"].includes(artifactType(parent))) {
    return parent.title;
  }

  return artifact.album || artifact.parent_slug || null;
}

export default async function BackroomDriftMoodsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, kind, artifact_type, parent_id, parent_slug, album_id, album, drift_moods"
    )
    .order("title", { ascending: true });

  const loadError = error?.message || "";
  const rows = (data || []) as ArtifactRow[];
  const artifactsById = new Map(rows.map((artifact) => [artifact.id, artifact]));
  const artifacts: DriftMoodArtifact[] = rows.map((artifact) => ({
    album: parentAlbumLabel(artifact, artifactsById),
    drift_moods: artifact.drift_moods || [],
    id: artifact.id,
    slug: artifact.slug,
    title: artifact.title,
    type: artifactType(artifact),
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
            Drift instrument
          </p>
          <h1 className="mt-4 font-serif text-5xl text-stone-100 md:text-7xl">
            Time of day
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-500">
            Assign the master Drift moods quickly: Dawn, Morning, Afternoon,
            Dusk, Evening, and Late Night. These moods steer Drift without
            replacing atmosphere or motif tags.
          </p>
        </header>

        {loadError ? (
          <section className="mt-10 border border-red-950 bg-red-950/10 p-6">
            <p className="font-serif text-2xl text-red-200">
              The time map could not be read.
            </p>
            <p className="mt-3 text-sm text-red-300/70">{loadError}</p>
          </section>
        ) : (
          <div className="mt-10">
            <BackroomDriftMoodEditor initialArtifacts={artifacts} />
          </div>
        )}
      </div>
    </main>
  );
}
