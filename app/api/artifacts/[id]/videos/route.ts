import crypto from "crypto";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getVideoLinkLabel,
  isSupportedVideoLink,
} from "@/lib/video";

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
  let slug = baseSlug || "archival-video";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const hasBackroomCookie =
    request.cookies.get("elsewhere_backroom")?.value === "yes";
  const hasAuthorization = hasValidBackroomAuthorization(
    request.headers.get("authorization")
  );

  if (!hasBackroomCookie && !hasAuthorization) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const video = formData.get("video");
  const videoLink = String(formData.get("video_url") || "").trim();
  const supportedVideoLink = isSupportedVideoLink(videoLink) ? videoLink : "";
  const videoFile =
    video instanceof File && video.type.startsWith("video/") ? video : null;

  if (!videoFile && !supportedVideoLink) {
    return Response.json(
      { error: "Choose a video file or paste a YouTube or Vimeo link." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: parent, error: parentError } = await supabase
    .from("artifacts")
    .select("id, slug, title, artifact_type, kind, band_id, album_id, song_id, is_public")
    .eq("id", id)
    .single();

  if (parentError || !parent) {
    return Response.json({ error: "Parent artifact not found." }, { status: 404 });
  }

  const parentType = parent.artifact_type || parent.kind;
  const titleBase = videoFile
    ? videoFile.name.replace(/\.[^/.]+$/, "").trim() || "Archival video"
    : getVideoLinkLabel(supportedVideoLink);
  const title = `${parent.title} / ${titleBase}`;
  const slug = await createUniqueSlug(slugify(title));
  const { data: siblingData, error: siblingsError } = await supabase
    .from("artifacts")
    .select("sort_order")
    .eq("parent_id", parent.id);

  if (siblingsError) {
    return Response.json({ error: siblingsError.message }, { status: 500 });
  }

  const sortOrder =
    Math.max(0, ...(siblingData || []).map((item) => item.sort_order || 0)) +
    10;
  let videoUrl = "";

  if (videoFile) {
    const extension = videoFile.name.split(".").pop()?.toLowerCase() || "file";
    const path = `${slug}/video/${crypto.randomBytes(8).toString("hex")}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("artifact-media")
      .upload(path, videoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: videoFile.type,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: videoData } = supabase.storage
      .from("artifact-media")
      .getPublicUrl(path);
    videoUrl = videoData.publicUrl;
  }

  const { error: insertError } = await supabase.from("artifacts").insert({
    title,
    slug,
    artifact_type: "Video",
    kind: "Video",
    parent_id: parent.id,
    parent_slug: parent.slug,
    band_id: parentType === "Band" ? parent.id : parent.band_id,
    album_id: parentType === "Album" ? parent.id : parent.album_id,
    song_id: parentType === "Song" ? parent.id : parent.song_id,
    video_url: videoUrl,
    youtube_url: supportedVideoLink,
    atmosphere: [],
    motifs: [],
    rooms: [],
    nearby: [],
    sort_order: sortOrder,
    is_public: Boolean(parent.is_public),
  });

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ title, slug, videoUrl, videoLink: supportedVideoLink });
}
