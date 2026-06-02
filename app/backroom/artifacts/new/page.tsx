import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import crypto from "crypto";
import TitleSlugFields from "@/components/TitleSlugFields";
import ArtifactMediaFields from "@/components/ArtifactMediaFields";
import { spotifyUrl } from "@/lib/spotify";

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

function splitList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "file";
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

async function createArtifact(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const baseSlug = slugify(String(formData.get("slug") || title));
  const slug = await createUniqueSlug(baseSlug);

  if (!title || !slug) {
    throw new Error("Title and slug are required.");
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

  const image_url =
    imageFile instanceof File && imageFile.size > 0
      ? await uploadArtifactFile({ file: imageFile, folder: "images", slug })
      : "";

  const audio_url =
    artifact_type !== "Album" && audioFile instanceof File && audioFile.size > 0
      ? await uploadArtifactFile({ file: audioFile, folder: "audio", slug })
      : "";

  const video_url =
    artifact_type !== "Album" && videoFile instanceof File && videoFile.size > 0
      ? await uploadArtifactFile({ file: videoFile, folder: "video", slug })
      : "";

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

    album: String(formData.get("album") || "").trim(),

    description: String(formData.get("description") || "").trim(),
    fragment: String(formData.get("fragment") || "").trim(),
    lyrics: String(formData.get("lyrics") || "").trim(),
    year: String(formData.get("year") || "").trim(),
    era: String(formData.get("era") || "").trim(),

    atmosphere: splitList(formData.get("atmosphere")),
    motifs: splitList(formData.get("motifs")),
    rooms: splitList(formData.get("rooms")),
    nearby: splitList(formData.get("nearby")),

    image_url,
    audio_url,
    video_url,
    youtube_url: String(formData.get("youtube_url") || "").trim(),
    ...(spotify_url ? { spotify_url } : {}),
    private_notes: String(formData.get("private_notes") || "").trim(),
    is_public: formData.get("is_public") === "yes",
  });

  if (error) throw new Error(error.message);

  redirect(`/artifact/${slug}`);
}

function ArtifactSelect({
  name,
  label,
  artifacts,
  filterType,
  help,
  currentValue,
}: {
  name: string;
  label: string;
  artifacts: ArtifactOption[];
  filterType?: string;
  help?: string;
  currentValue?: string;
}) {
  const options = filterType
    ? artifacts.filter(
        (artifact) =>
          artifact.artifact_type === filterType || artifact.kind === filterType
      )
    : artifacts;

  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
        {label}
      </label>

      <select
        name={name}
        className="w-full rounded-xl border border-stone-800 bg-neutral-950 px-4 py-3 text-stone-200 outline-none focus:border-stone-400"
        defaultValue={currentValue || ""}
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

export default async function NewArtifactPage({
  searchParams,
}: {
  searchParams: Promise<{
    parent?: string | string[];
    band?: string | string[];
    album?: string | string[];
    song?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const one = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const parentId = one(params.parent);
  const bandId = one(params.band);
  const albumId = one(params.album);
  const songId = one(params.song);
  const supabase = await createClient();

  const { data } = await supabase
    .from("artifacts")
    .select("id, title, slug, artifact_type, kind")
    .order("title", { ascending: true });

  const artifacts = (data || []) as ArtifactOption[];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-stone-200">
      <div className="mx-auto max-w-3xl">
        <a
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </a>

        <header className="mb-12 mt-12">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Bring something in
          </p>
          <h1 className="mt-4 font-serif text-4xl text-stone-100 md:text-6xl">
            A thing has arrived.
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-stone-400">
            Not everything belongs to a room at first. Some things arrive as
            fragments, objects, songs, photographs, or weather.
          </p>
        </header>

        <form action={createArtifact} className="space-y-10">
          <section className="space-y-6 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <TitleSlugFields />

            <ArtifactMediaFields artifactTypes={ARTIFACT_TYPES} />
          </section>

          <section className="space-y-6 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
                Hierarchy
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Bands contain albums and singles. Albums contain songs. Songs,
                singles, and albums can also have child artifacts like artwork,
                videos, demos, designs, and documents.
              </p>
            </div>

            <ArtifactSelect
              name="band_id"
              label="Band"
              artifacts={artifacts}
              filterType="Band"
              help="Use for albums, songs, and related artifacts."
              currentValue={bandId}
            />

            <ArtifactSelect
              name="album_id"
              label="Album"
              artifacts={artifacts}
              filterType="Album"
              help="Use for songs and album-related artifacts."
              currentValue={albumId}
            />

            <ArtifactSelect
              name="song_id"
              label="Song"
              artifacts={artifacts}
              filterType="Song"
              help="Use for artwork, videos, demos, or documents tied to a specific song."
              currentValue={songId}
            />

            <ArtifactSelect
              name="parent_id"
              label="Parent Artifact"
              artifacts={artifacts}
              help="The direct parent. For an album or single this is usually the band. For a song this is usually the album. For artwork/video/demo this is usually the song, single, or album."
              currentValue={parentId}
            />

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Sort Order
              </label>
              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Legacy Belongs To Slug
              </label>
              <input
                name="parent_slug"
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="coco"
              />
              <p className="mt-2 text-xs text-stone-600">
                Optional fallback. The new Parent Artifact dropdown is preferred.
              </p>
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Album Name
              </label>
              <input
                name="album"
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="Coco"
              />
              <p className="mt-2 text-xs text-stone-600">
                Legacy display field. We’ll eventually replace this with the
                Album dropdown above.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Year
              </label>
              <input
                name="year"
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
                className="w-full rounded-xl border border-stone-800 bg-transparent px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
                placeholder="Words that survived the room."
              />
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Fragment
              </label>
              <textarea
                name="fragment"
                rows={3}
                className="w-full rounded-xl border border-stone-800 bg-transparent px-4 py-3 text-stone-100 outline-none focus:border-stone-400"
                placeholder="Repair is sometimes another form of possession."
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Description
              </label>
              <textarea
                name="description"
                rows={5}
                className="w-full rounded-xl border border-stone-800 bg-transparent px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
                placeholder="A short visible description, if the thing wants one."
              />
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Atmosphere
              </label>
              <input
                name="atmosphere"
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="lonely, warm, unsettling, nocturnal"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Motifs
              </label>
              <input
                name="motifs"
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="visitors, repair, red things, bedrooms"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Rooms
              </label>
              <input
                name="rooms"
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="visitor, house, road"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Nearby Things
              </label>
              <input
                name="nearby"
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="a-visitors-view, teddy-bear, bedroom-photograph"
              />
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                Image File
              </label>
              <input
                name="image_file"
                type="file"
                accept="image/*"
                className="block w-full text-sm text-stone-400 file:mr-5 file:rounded-full file:border file:border-stone-700 file:bg-transparent file:px-5 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300 hover:file:border-stone-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
                YouTube or Vimeo Link
              </label>
              <input
                name="youtube_url"
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
                className="w-full border-b border-stone-700 bg-transparent px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="https://open.spotify.com/album/... or /track/..."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
              Private Notes
            </label>
            <textarea
              name="private_notes"
              rows={5}
              className="w-full rounded-xl border border-stone-800 bg-transparent px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
              placeholder="Only visible in the Backroom."
            />
          </section>

          <label className="flex items-center gap-3 border border-stone-800 bg-stone-950/60 p-6 text-sm text-stone-300">
            <input type="checkbox" name="is_public" value="yes" />
            Publish this artifact immediately
          </label>

          <button
            type="submit"
            className="rounded-full border border-stone-600 px-8 py-4 text-sm uppercase tracking-[0.25em] text-stone-200 transition hover:bg-stone-200 hover:text-neutral-950"
          >
            Let it in
          </button>
        </form>
      </div>
    </main>
  );
}
