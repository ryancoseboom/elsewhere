import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import crypto from "crypto";
import TitleSlugFields from "@/components/TitleSlugFields";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
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
  folder: "images" | "audio";
  slug: string;
}) {
  const supabase = await createClient();

  if (!file || file.size === 0) {
    return "";
  }

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

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from("artifact-media")
    .getPublicUrl(path);

  return data.publicUrl;
}

async function createArtifact(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  const slug = slugify(String(formData.get("slug") || title));

  if (!title || !slug) {
    throw new Error("Title and slug are required.");
  }

  const imageFile = formData.get("image_file");
  const audioFile = formData.get("audio_file");

  const image_url =
    imageFile instanceof File
      ? await uploadArtifactFile({
          file: imageFile,
          folder: "images",
          slug,
        })
      : "";

  const audio_url =
    audioFile instanceof File
      ? await uploadArtifactFile({
          file: audioFile,
          folder: "audio",
          slug,
        })
      : "";

  const { error } = await supabase.from("artifacts").insert({
    title,
    slug,
    kind: String(formData.get("kind") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    fragment: String(formData.get("fragment") || "").trim(),
    atmosphere: splitList(formData.get("atmosphere")),
    motifs: splitList(formData.get("motifs")),
    rooms: splitList(formData.get("rooms")),
    nearby: splitList(formData.get("nearby")),
    image_url,
    audio_url,
    private_notes: String(formData.get("private_notes") || "").trim(),
    lyrics: String(formData.get("lyrics") || "").trim(),
album: String(formData.get("album") || "").trim(),
year: String(formData.get("year") || "").trim(),
era: String(formData.get("era") || "").trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/artifact/${slug}`);
}

export default function NewArtifactPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <a
          href="/backroom"
          className="text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300"
        >
          ← Backroom
        </a>

        <header className="mt-12 mb-12">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
            Bring something in
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-serif text-stone-100">
            A song has surfaced.
          </h1>
          <p className="mt-6 max-w-xl text-stone-400 leading-relaxed">
            Some songs arrive with rooms already attached. Others only leave a trace.
          </p>
        </header>

        <form
          action={createArtifact}
          className="space-y-10"
        >
          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6 space-y-6">
           <TitleSlugFields />

            <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6 space-y-6">
  <div>
    <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
      Album
    </label>
    <input
      name="album"
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
      className="w-full bg-transparent border border-stone-800 rounded-xl px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
      placeholder="Words that survived the room."
    />
  </div>
</section>

            <input type="hidden" name="kind" value="Song" />
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Fragment
              </label>
              <textarea
                name="fragment"
                rows={3}
                className="w-full bg-transparent border border-stone-800 rounded-xl px-4 py-3 text-stone-100 outline-none focus:border-stone-400"
                placeholder="Repair is sometimes another form of possession."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={5}
                className="w-full bg-transparent border border-stone-800 rounded-xl px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
                placeholder="A short visible description, if the thing wants one."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Atmosphere
              </label>
              <input
                name="atmosphere"
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="lonely, warm, unsettling, nocturnal"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Motifs
              </label>
              <input
                name="motifs"
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="visitors, repair, red things, bedrooms"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Rooms
              </label>
              <input
                name="rooms"
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="visitor, house, road"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Nearby Things
              </label>
              <input
                name="nearby"
                className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
                placeholder="a-visitors-view, teddy-bear, bedroom-photograph"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6 space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
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
              <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
                Audio File
              </label>
              <input
                name="audio_file"
                type="file"
                accept="audio/*"
                className="block w-full text-sm text-stone-400 file:mr-5 file:rounded-full file:border file:border-stone-700 file:bg-transparent file:px-5 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300 hover:file:border-stone-400"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
            <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
              Private Notes
            </label>
            <textarea
              name="private_notes"
              rows={5}
              className="w-full bg-transparent border border-stone-800 rounded-xl px-4 py-3 text-stone-300 outline-none focus:border-stone-400"
              placeholder="Only visible in the Backroom."
            />
          </section>

          <button
            type="submit"
            className="rounded-full border border-stone-600 px-8 py-4 text-sm uppercase tracking-[0.25em] text-stone-200 hover:bg-stone-200 hover:text-neutral-950 transition"
          >
            Let it in
          </button>
        </form>
      </div>
    </main>
  );
}