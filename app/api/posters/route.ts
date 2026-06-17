import crypto from "crypto";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasValidBackroomAuthorization(value: string | null) {
  if (!value?.startsWith("Basic ")) return false;

  try {
    const [user, password] = atob(value.slice(6)).split(":");

    return (
      user === process.env.BACKROOM_USER &&
      password === process.env.BACKROOM_PASSWORD
    );
  } catch {
    return false;
  }
}

async function createUniqueSlug(baseSlug: string) {
  const supabase = await createClient();
  let slug = baseSlug || "live-poster";
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

export async function POST(request: NextRequest) {
  const hasBackroomCookie =
    request.cookies.get("elsewhere_backroom")?.value === "yes";
  const hasAuthorization = hasValidBackroomAuthorization(
    request.headers.get("authorization")
  );

  if (!hasBackroomCookie && !hasAuthorization) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const poster = formData.get("poster");

  if (!(poster instanceof File) || !poster.type.startsWith("image/")) {
    return Response.json({ error: "Choose an image file." }, { status: 400 });
  }

  const supabase = await createClient();
  const titleBase = poster.name.replace(/\.[^/.]+$/, "").trim() || "Live poster";
  const title = titleBase;
  const slug = await createUniqueSlug(slugify(`poster-${title}`));
  const extension = poster.name.split(".").pop()?.toLowerCase() || "file";
  const path = `posters/${slug}/${crypto.randomBytes(8).toString("hex")}.${extension}`;
  const { data: siblingData, error: siblingsError } = await supabase
    .from("artifacts")
    .select("sort_order")
    .or("artifact_type.eq.Poster,kind.eq.Poster");

  if (siblingsError) {
    return Response.json({ error: siblingsError.message }, { status: 500 });
  }

  const sortOrder =
    Math.max(0, ...(siblingData || []).map((item) => item.sort_order || 0)) +
    10;
  const { error: uploadError } = await supabase.storage
    .from("artifact-media")
    .upload(path, poster, {
      cacheControl: "3600",
      upsert: false,
      contentType: poster.type,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: imageData } = supabase.storage
    .from("artifact-media")
    .getPublicUrl(path);
  const { error: insertError } = await supabase.from("artifacts").insert({
    title,
    slug,
    artifact_type: "Poster",
    kind: "Poster",
    parent_id: null,
    parent_slug: "",
    band_id: null,
    album_id: null,
    song_id: null,
    image_url: imageData.publicUrl,
    description: "Live performance poster.",
    fragment: "An event left on paper.",
    atmosphere: ["live", "paper", "signal"],
    motifs: ["poster", "performance"],
    rooms: ["posters", "live"],
    nearby: ["posters", "live performance"],
    sort_order: sortOrder,
    is_public: true,
    discovery_visibility: "public",
  });

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ title, slug, imageUrl: imageData.publicUrl });
}
