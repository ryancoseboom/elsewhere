import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

type Artifact = {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  kind: string | null;
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
  private_notes: string | null;
  lyrics: string | null;
  album: string | null;
  year: string | null;
  era: string | null;
};

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

async function updateArtifact(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const slug = slugify(String(formData.get("slug") || title));

  if (!id || !title || !slug) {
    throw new Error("Missing required fields.");
  }

  const existingImageUrl = String(formData.get("existing_image_url") || "");
  const existingAudioUrl = String(formData.get("existing_audio_url") || "");
  const existingVideoUrl = String(formData.get("existing_video_url") || "");

  const imageFile = formData.get("image_file");
  const audioFile = formData.get("audio_file");
  const videoFile = formData.get("video_file");

  const image_url =
    imageFile instanceof File && imageFile.size > 0
      ? await uploadArtifactFile({
          file: imageFile,
          folder: "images",
          slug,
        })
      : existingImageUrl;

  const audio_url =
    audioFile instanceof File && audioFile.size > 0
      ? await uploadArtifactFile({
          file: audioFile,
          folder: "audio",
          slug,
        })
      : existingAudioUrl;

  const video_url =
    videoFile instanceof File && videoFile.size > 0
      ? await uploadArtifactFile({
          file: videoFile,
          folder: "video",
          slug,
        })
      : existingVideoUrl;

  const { error } = await supabase
    .from("artifacts")
    .update({
      title,
      slug,
      parent_slug: String(formData.get("parent_slug") || "").trim(),
      kind: String(formData.get("kind") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      fragment: String(formData.get("fragment") || "").trim(),
      atmosphere: splitList(formData.get("atmosphere")),
      motifs: splitList(formData.get("motifs")),
      rooms: splitList(formData.get("rooms")),
      nearby: splitList(formData.get("nearby")),
      image_url,
      audio_url,
      video_url,
      youtube_url: String(formData.get("youtube_url") || "").trim(),
      private_notes: String(formData.get("private_notes") || "").trim(),
      lyrics: String(formData.get("lyrics") || "").trim(),
      album: String(formData.get("album") || "").trim(),
      year: String(formData.get("year") || "").trim(),
      era: String(formData.get("era") || "").trim(),
    })
    .eq("id", id);

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

export default async function EditArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: artifact, error } = await supabase
    .from("artifacts")
    .select(
      "id, slug, title, parent_slug, kind, description, fragment, atmosphere, motifs, rooms, nearby, image_url, audio_url, video_url, youtube_url, private_notes, lyrics, album, year, era"
    )
    .eq("slug", slug)
    .single();

  if (error || !artifact) {
    notFound();
  }

  const item = artifact as Artifact;

  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </Link>

        <header className="mt-12 mb-12">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Artifact Workshop
          </p>

          <h1 className="mt-4 text-4xl md:text-6xl font-serif text-stone-100">
            Adjust the signal.
          </h1>

          <p className="mt-6 max-w-xl text-stone-400 leading-relaxed">
            Some things arrive nearly whole. Others need their edges softened,
            renamed, hidden, or brought closer to something else.
          </p>
        </header>

        <form action={updateArtifact} className="space-y-10">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="existing_image_url" value={item.image_url || ""} />
          <input type="hidden" name="existing_audio_url" value={item.audio_url || ""} />
          <input type="hidden" name="existing_video_url" value={item.video_url || ""} />

          <section className="border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Title
              </label>
              <input
                name="title"
                required
                defaultValue={item.title}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-xl text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Slug
              </label>
              <input
                name="slug"
                required
                defaultValue={item.slug}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                What is it?
              </label>
              <select
                name="kind"
                defaultValue={item.kind || "Other"}
                className="w-full bg-neutral-950 border border-stone-800 px-4 py-3 text-stone-200 outline-none focus:border-stone-400"
              >
                <option>Song</option>
                <option>Photograph</option>
                <option>Design</option>
                <option>Object</option>
                <option>Memory</option>
                <option>Video</option>
                <option>Fragment</option>
                <option>Other</option>
              </select>
            </div>
          </section>

          <section className="border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Album
              </label>
              <input
                name="album"
                defaultValue={item.album || ""}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="Coco"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Year
              </label>
              <input
                name="year"
                defaultValue={item.year || ""}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Era
              </label>
              <input
                name="era"
                defaultValue={item.era || ""}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="Coco / The Visitor"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Lyrics
              </label>
              <textarea
                name="lyrics"
                rows={12}
                defaultValue={item.lyrics || ""}
                className="w-full bg-transparent border border-stone-800 px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
                placeholder="Words that survived the room."
              />
            </div>
          </section>

          <section className="border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Fragment
              </label>
              <textarea
                name="fragment"
                rows={3}
                defaultValue={item.fragment || ""}
                className="w-full bg-transparent border border-stone-800 px-4 py-3 text-stone-100 outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={5}
                defaultValue={item.description || ""}
                className="w-full bg-transparent border border-stone-800 px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
              />
            </div>
          </section>

          <section className="border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Atmosphere
              </label>
              <input
                name="atmosphere"
                defaultValue={(item.atmosphere || []).join(", ")}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Motifs
              </label>
              <input
                name="motifs"
                defaultValue={(item.motifs || []).join(", ")}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Rooms
              </label>
              <input
                name="rooms"
                defaultValue={(item.rooms || []).join(", ")}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Nearby Things
              </label>
              <input
                name="nearby"
                defaultValue={(item.nearby || []).join(", ")}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Belongs To
              </label>
              <input
                name="parent_slug"
                defaultValue={item.parent_slug || ""}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="coco"
              />
              <p className="mt-2 text-xs text-stone-600">
                Optional. Enter the slug of the song or artifact this belongs near.
              </p>
            </div>
          </section>

          <section className="border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
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
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Replace Audio File
              </label>

              {item.audio_url && (
                <audio controls src={item.audio_url} className="mb-4 w-full opacity-80" />
              )}

              <input
                name="audio_file"
                type="file"
                accept="audio/*"
                className="block w-full text-sm text-stone-400 file:mr-5 file:border file:border-stone-700 file:bg-transparent file:px-5 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300 hover:file:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Replace Video File
              </label>

              {item.video_url && (
                <video
                  controls
                  src={item.video_url}
                  className="mb-4 w-full border border-stone-800 opacity-90"
                />
              )}

              <input
                name="video_file"
                type="file"
                accept="video/*"
                className="block w-full text-sm text-stone-400 file:mr-5 file:border file:border-stone-700 file:bg-transparent file:px-5 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300 hover:file:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                YouTube Link
              </label>

              <input
                name="youtube_url"
                defaultValue={item.youtube_url || ""}
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="https://www.youtube.com/watch?v=..."
              />

              {item.youtube_url && (
                <p className="mt-2 text-xs text-stone-600">
                  Current YouTube source saved.
                </p>
              )}
            </div>
          </section>

          <section className="border border-stone-800 bg-stone-950/60 p-6">
            <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
              Private Notes
            </label>
            <textarea
              name="private_notes"
              rows={5}
              defaultValue={item.private_notes || ""}
              className="w-full bg-transparent border border-stone-800 px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
            />
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="border border-stone-600 px-8 py-4 text-sm uppercase tracking-[0.25em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950 transition"
            >
              Save changes
            </button>

            <Link
              href={`/artifact/${item.slug}`}
              className="border border-stone-800 px-8 py-4 text-sm uppercase tracking-[0.25em] text-stone-500 hover:border-stone-500 hover:text-stone-200 transition"
            >
              Visit
            </Link>
          </div>
        </form>

        <form action={deleteArtifact} className="mt-16 border-t border-stone-800 pt-8">
          <input type="hidden" name="id" value={item.id} />

          <button
            type="submit"
            className="text-xs uppercase tracking-[0.25em] text-red-900 hover:text-red-500 transition"
          >
            Remove this thing from Elsewhere
          </button>
        </form>
      </div>
    </main>
  );
}