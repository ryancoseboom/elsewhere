import Link from "next/link";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import BulkSongForm from "@/components/BulkSongForm";

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

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "file";
}

async function uploadArtifactFile({
  file,
  folder,
  slug,
}: {
  file: File;
  folder: "images" | "audio";
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

async function createSong(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const baseSlug = slugify(String(formData.get("slug") || title));
const slug = await createUniqueSlug(baseSlug);

  if (!title || !slug) {
    throw new Error("Title and slug are required.");
  }

  const imageFile = formData.get("image_file");
  const audioFile = formData.get("audio_file");

  const image_url =
    imageFile instanceof File && imageFile.size > 0
      ? await uploadArtifactFile({
          file: imageFile,
          folder: "images",
          slug,
        })
      : "";

  const audio_url =
    audioFile instanceof File && audioFile.size > 0
      ? await uploadArtifactFile({
          file: audioFile,
          folder: "audio",
          slug,
        })
      : "";

  const { error } = await supabase.from("artifacts").insert({
    title,
    slug,
    kind: "Song",
    image_url,
    audio_url,
    is_public: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/backroom/songs/bulk");
}

export default function BulkSongsPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </Link>

        <header className="mt-12 mb-12">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Recordings waiting
          </p>

          <h1 className="mt-4 text-4xl md:text-6xl font-serif text-stone-100">
            Let the songs in.
          </h1>

          <p className="mt-6 max-w-xl text-stone-400 leading-relaxed">
            Choose a group of audio files. Their names become titles. The
            titles become slugs. You can correct them before they enter
            Elsewhere.
          </p>
        </header>

        <BulkSongForm action={createSong} />
      </div>
    </main>
  );
}
