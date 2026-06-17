import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import TitleSlugFields from "@/components/TitleSlugFields";
import ArtifactMediaFields from "@/components/ArtifactMediaFields";
import DriftMoodCheckboxes from "@/components/DriftMoodCheckboxes";
import { cleanDriftMoods } from "@/lib/drift-moods";
import { spotifyUrl } from "@/lib/spotify";
import { artifactVisibility } from "@/lib/artifact-visibility";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  kind: string | null;
  artifact_type: string | null;
  parent_id: string | null;
  band_id: string | null;
  album_id: string | null;
  song_id: string | null;
  sort_order: number | null;
  description: string | null;
  fragment: string | null;
  atmosphere: string[] | null;
  motifs: string[] | null;
  rooms: string[] | null;
  nearby: string[] | null;
  image_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  private_notes: string | null;
  discovery_visibility: string | null;
  drift_moods: string[] | null;
  lyrics: string | null;
  album: string | null;
  year: string | null;
  era: string | null;
  is_public: boolean | null;
};

type ArtifactOption = {
  id: string;
  title: string;
  slug: string;
  artifact_type: string | null;
  kind: string | null;
};

const ARTIFACT_TYPES = [
  "Band",
  "Album",
  "Single",
  "Song",
  "Artwork",
  "Video",
  "Demo",
  "Design",
  "Photo",
  "Document",
  "Object",
  "Place",
  "Character",
  "Text",
  "Other",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueSlug(baseSlug: string) {
  const supabase = await createClient();

  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const { data } = await supabase
      .from("artifacts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function splitList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanId(value: FormDataEntryValue | null) {
  const stringValue = String(value || "").trim();
  return stringValue.length > 0 ? stringValue : null;
}

function getSelectedArtifactSlug(
  artifacts: ArtifactOption[],
  id: string | null
) {
  if (!id) return "";
  return artifacts.find((artifact) => artifact.id === id)?.slug || "";
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "file";
}

async function uploadArtifactFile({
  file,
  folder,
  slug,
}: {
  file: File;
  folder: "images" | "audio" | "video";
  slug: string;
}) {
  const supabase = await createClient();

  if (!file || file.size === 0) return "";

  const extension = getFileExtension(file.name);
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const path = `${slug}/${folder}/${uniqueId}.${extension}`;

  const { error } = await supabase.storage
    .from("artifact-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("artifact-media").getPublicUrl(path);

  return data.publicUrl;
}

async function createCopiedArtifact(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const baseSlug = slugify(String(formData.get("slug") || title));
  const slug = await createUniqueSlug(baseSlug);

  if (!title || !slug) {
    throw new Error("Missing required fields.");
  }

  const artifact_type = String(formData.get("artifact_type") || "Other").trim();

  const parent_id = cleanId(formData.get("parent_id"));
  const band_id = cleanId(formData.get("band_id"));
  const album_id = cleanId(formData.get("album_id"));
  const song_id = cleanId(formData.get("song_id"));
  const sort_order = Number(formData.get("sort_order") || 0);

  const { data: existingArtifacts } = await supabase
    .from("artifacts")
    .select("id, slug, title, artifact_type, kind");

  const artifacts = (existingArtifacts || []) as ArtifactOption[];

  const imageFile = formData.get("image_file");
  const audioFile = formData.get("audio_file");
  const videoFile = formData.get("video_file");

  const existingImageUrl = String(formData.get("existing_image_url") || "");
  const existingAudioUrl = String(formData.get("existing_audio_url") || "");
  const existingVideoUrl = String(formData.get("existing_video_url") || "");

  const image_url =
    imageFile instanceof File && imageFile.size > 0
      ? await uploadArtifactFile({
          file: imageFile,
          folder: "images",
          slug,
        })
      : existingImageUrl;

  const audio_url =
    artifact_type === "Album"
      ? ""
      : audioFile instanceof File && audioFile.size > 0
      ? await uploadArtifactFile({
          file: audioFile,
          folder: "audio",
          slug,
        })
      : existingAudioUrl;

  const video_url =
    artifact_type === "Album"
      ? ""
      : videoFile instanceof File && videoFile.size > 0
      ? await uploadArtifactFile({
          file: videoFile,
          folder: "video",
          slug,
        })
      : existingVideoUrl;

  const spotify_url = spotifyUrl(String(formData.get("spotify_url") || ""));
  const { error } = await supabase.from("artifacts").insert({
    title,
    slug,

    artifact_type,
    kind: artifact_type,

    parent_id,
    band_id,
    album_id,
    song_id,
    sort_order,

    parent_slug:
      String(formData.get("parent_slug") || "").trim() ||
      getSelectedArtifactSlug(artifacts, parent_id),

    description: String(formData.get("description") || "").trim(),
    fragment: String(formData.get("fragment") || "").trim(),
    atmosphere: splitList(formData.get("atmosphere")),
    motifs: splitList(formData.get("motifs")),
    rooms: splitList(formData.get("rooms")),
    nearby: splitList(formData.get("nearby")),
    drift_moods: cleanDriftMoods(formData.getAll("drift_moods")),

    image_url,
    audio_url,
    video_url,
    youtube_url: String(formData.get("youtube_url") || "").trim(),
    ...(spotify_url ? { spotify_url } : {}),
    private_notes: String(formData.get("private_notes") || "").trim(),
    lyrics: String(formData.get("lyrics") || "").trim(),
    album: String(formData.get("album") || "").trim(),
    year: String(formData.get("year") || "").trim(),
    era: String(formData.get("era") || "").trim(),
    is_public: formData.get("is_public") === "yes",
    discovery_visibility: artifactVisibility(
      formData.get("discovery_visibility")
    ),
  });

  if (error) throw new Error(error.message);

  redirect("/backroom");
}

async function deleteArtifact(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const id = String(formData.get("id") || "");

  if (!id) throw new Error("Missing artifact id.");

  const { error } = await supabase.from("artifacts").delete().eq("id", id);

  if (error) throw new Error(error.message);

  redirect("/backroom");
}

function ArtifactSelect({
  name,
  label,
  artifacts,
  currentValue,
  currentArtifactId,
  filterType,
  help,
}: {
  name: string;
  label: string;
  artifacts: ArtifactOption[];
  currentValue?: string | null;
  currentArtifactId?: string;
  filterType?: string;
  help?: string;
}) {
  const options = filterType
    ? artifacts.filter(
        (artifact) =>
          artifact.id !== currentArtifactId &&
          (artifact.artifact_type === filterType || artifact.kind === filterType)
      )
    : artifacts.filter((artifact) => artifact.id !== currentArtifactId);

  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
        {label}
      </label>

      <select
        name={name}
        defaultValue={currentValue || ""}
        className="w-full border border-stone-800 bg-neutral-950 px-4 py-3 text-stone-200 outline-none focus:border-stone-400"
      >
        <option value="">None</option>

        {options.map((artifact) => (
          <option key={artifact.id} value={artifact.id}>
            {artifact.title} / {artifact.slug}
          </option>
        ))}
      </select>

      {help && <p className="mt-2 text-xs text-stone-600">{help}</p>}
    </div>
  );
}

export default async function CopyArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artifact, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, parent_slug, kind, artifact_type, parent_id, band_id, album_id, song_id, sort_order, description, fragment, atmosphere, motifs, rooms, nearby, drift_moods, image_url, audio_url, video_url, youtube_url, private_notes, discovery_visibility, lyrics, album, year, era, is_public"
    )
    .eq("slug", slug)
    .single();

  if (error || !artifact) {
    notFound();
  }

  const { data: spotifyArtifact } = await supabase
    .from("artifacts")
    .select("spotify_url")
    .eq("id", artifact.id)
    .maybeSingle();
  const item = {
    ...artifact,
    spotify_url: (spotifyArtifact?.spotify_url as string | null) || null,
  } as Artifact;

  const { data: artifactOptionsData } = await supabase
    .from("artifacts")
    .select("id, title, slug, artifact_type, kind")
    .order("title", { ascending: true });

  const artifacts = (artifactOptionsData || []) as ArtifactOption[];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </Link>

        <header className="mb-12 mt-12">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Artifact Workshop
          </p>

          <h1 className="mt-4 font-serif text-4xl text-stone-100 md:text-6xl">
            Make another version.
          </h1>

          <p className="mt-6 max-w-xl leading-relaxed text-stone-400">
            Copy the thing, preserve its relationships, and alter whatever
            changed in transmission.
          </p>
        </header>

        <form action={createCopiedArtifact} className="space-y-10">
          <input type="hidden" name="existing_image_url" value={item.image_url || ""} />
          <input type="hidden" name="existing_audio_url" value={item.audio_url || ""} />
          <input type="hidden" name="existing_video_url" value={item.video_url || ""} />

          <section className="space-y-6 border border-stone-800 bg-stone-950/60 p-6">
            <TitleSlugFields />

            <ArtifactMediaFields
              artifactTypes={ARTIFACT_TYPES}
              defaultArtifactType={item.artifact_type || item.kind || "Other"}
              existingAudioUrl={item.audio_url}
              existingVideoUrl={item.video_url}
              mode="replace"
            />
          </section>

          <label className="flex items-center gap-3 border border-stone-800 bg-stone-950/60 p-6 text-sm text-stone-300">
            <input
              type="checkbox"
              name="is_public"
              value="yes"
              defaultChecked={Boolean(item.is_public)}
            />
            Publish this copied artifact
          </label>

          <section className="space-y-3 border border-stone-800 bg-stone-950/60 p-6">
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
              Discovery visibility
            </label>
            <select
              name="discovery_visibility"
              defaultValue={item.discovery_visibility || "public"}
              className="w-full border border-stone-800 bg-neutral-950 px-4 py-3 text-stone-200 outline-none focus:border-stone-400"
            >
              <option value="public">Public surfaces</option>
              <option value="hidden">Hidden / drift discoverable</option>
              <option value="backroom">Backroom only</option>
            </select>
          </section>

          <section className="space-y-6 border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
                Hierarchy
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                These values are copied from the original. Change them if this
                version belongs somewhere else.
              </p>
            </div>

            <ArtifactSelect
              name="band_id"
              label="Band"
              artifacts={artifacts}
              currentValue={item.band_id}
              currentArtifactId={item.id}
              filterType="Band"
            />

            <ArtifactSelect
              name="album_id"
              label="Album"
              artifacts={artifacts}
              currentValue={item.album_id}
              currentArtifactId={item.id}
              filterType="Album"
            />

            <ArtifactSelect
              name="song_id"
              label="Song"
              artifacts={artifacts}
              currentValue={item.song_id}
              currentArtifactId={item.id}
              filterType="Song"
            />

            <ArtifactSelect
              name="parent_id"
              label="Parent Artifact"
              artifacts={artifacts}
              currentValue={item.parent_id}
              currentArtifactId={item.id}
              help="The direct parent. For an album this is usually the band. For a song this is usually the album."
            />

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Sort Order
              </label>
              <input
                name="sort_order"
                type="number"
                defaultValue={item.sort_order || 0}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Legacy Belongs To Slug
              </label>
              <input
                name="parent_slug"
                defaultValue={item.parent_slug || ""}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="coco"
              />
            </div>
          </section>

          <section className="space-y-6 border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Album Name
              </label>
              <input
                name="album"
                defaultValue={item.album || ""}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="Coco"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Year
              </label>
              <input
                name="year"
                defaultValue={item.year || ""}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Era
              </label>
              <input
                name="era"
                defaultValue={item.era || ""}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="Coco / The Visitor"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Lyrics
              </label>
              <textarea
                name="lyrics"
                rows={12}
                defaultValue={item.lyrics || ""}
                className="w-full border border-stone-800 bg-transparent px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
                placeholder="Words that survived the room."
              />
            </div>
          </section>

          <section className="space-y-6 border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Fragment
              </label>
              <textarea
                name="fragment"
                rows={3}
                defaultValue={item.fragment || ""}
                className="w-full border border-stone-800 bg-transparent px-4 py-3 text-stone-100 outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Description
              </label>
              <textarea
                name="description"
                rows={5}
                defaultValue={item.description || ""}
                className="w-full border border-stone-800 bg-transparent px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
              />
            </div>
          </section>

          <section className="space-y-6 border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Atmosphere
              </label>
              <input
                name="atmosphere"
                defaultValue={(item.atmosphere || []).join(", ")}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <DriftMoodCheckboxes defaultValue={item.drift_moods} />

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Motifs
              </label>
              <input
                name="motifs"
                defaultValue={(item.motifs || []).join(", ")}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Rooms
              </label>
              <input
                name="rooms"
                defaultValue={(item.rooms || []).join(", ")}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Nearby Things
              </label>
              <input
                name="nearby"
                defaultValue={(item.nearby || []).join(", ")}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>
          </section>

          <section className="space-y-6 border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Replace Image File
              </label>

              {item.image_url && (
                <div className="mb-4 border border-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="max-h-64 w-full object-cover opacity-80"
                  />
                </div>
              )}

              <input
                name="image_file"
                type="file"
                accept="image/*"
                className="block w-full text-sm text-stone-400 file:mr-5 file:border file:border-stone-700 file:bg-transparent file:px-5 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300 hover:file:border-stone-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                YouTube or Vimeo Link
              </label>

              <input
                name="youtube_url"
                defaultValue={item.youtube_url || ""}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Spotify Link
              </label>
              <input
                name="spotify_url"
                defaultValue={item.spotify_url || ""}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="https://open.spotify.com/album/... or /track/..."
              />
            </div>
          </section>

          <section className="border border-stone-800 bg-stone-950/60 p-6">
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
              Private Notes
            </label>
            <textarea
              name="private_notes"
              rows={5}
              defaultValue={item.private_notes || ""}
              className="w-full border border-stone-800 bg-transparent px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
            />
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="border border-stone-600 px-8 py-4 text-sm uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950"
            >
              Create copy
            </button>

            <Link
              href={`/artifact/${item.slug}`}
              className="border border-stone-800 px-8 py-4 text-sm uppercase tracking-[0.25em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
            >
              Visit original
            </Link>
          </div>
        </form>

        <form
          action={deleteArtifact}
          className="mt-16 border-t border-stone-800 pt-8"
        >
          <input type="hidden" name="id" value={item.id} />

          <button
            type="submit"
            className="text-xs uppercase tracking-[0.25em] text-red-900 transition hover:text-red-500"
          >
            Remove original from Elsewhere
          </button>
        </form>
      </div>
    </main>
  );
}
