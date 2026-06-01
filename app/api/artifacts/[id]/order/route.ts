import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function isSameSection(
  item: {
    artifact_type: string | null;
    kind: string | null;
    image_url: string | null;
    audio_url: string | null;
    video_url: string | null;
    youtube_url: string | null;
  },
  sibling: {
    artifact_type: string | null;
    kind: string | null;
    image_url: string | null;
    audio_url: string | null;
    video_url: string | null;
    youtube_url: string | null;
  }
) {
  const type = item.artifact_type || item.kind || "";
  const siblingType = sibling.artifact_type || sibling.kind || "";

  if (["Artwork", "Design", "Photo"].includes(type)) {
    return ["Artwork", "Design", "Photo"].includes(siblingType);
  }

  if (type === "Video" || item.video_url || item.youtube_url) {
    return siblingType === "Video" || sibling.video_url || sibling.youtube_url;
  }

  if (type === "Demo" || item.audio_url) {
    return siblingType === "Demo" || Boolean(sibling.audio_url);
  }

  return false;
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

  const { direction } = (await request.json()) as {
    direction?: "up" | "down";
  };

  if (direction !== "up" && direction !== "down") {
    return Response.json({ error: "Invalid direction." }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const fields =
    "id, parent_id, parent_slug, artifact_type, kind, image_url, audio_url, video_url, youtube_url, sort_order, title";
  const { data: item, error: itemError } = await supabase
    .from("artifacts")
    .select(fields)
    .eq("id", id)
    .single();

  if (itemError || !item) {
    return Response.json({ error: "Artifact not found." }, { status: 404 });
  }

  let siblingsQuery = supabase.from("artifacts").select(fields);
  siblingsQuery = item.parent_id
    ? siblingsQuery.eq("parent_id", item.parent_id)
    : siblingsQuery.eq("parent_slug", item.parent_slug || "");

  const { data: siblingData, error: siblingsError } = await siblingsQuery;

  if (siblingsError) {
    return Response.json({ error: siblingsError.message }, { status: 500 });
  }

  const siblings = (siblingData || [])
    .filter((sibling) => isSameSection(item, sibling))
    .sort((a, b) => {
      const orderDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      return orderDifference || a.title.localeCompare(b.title);
    });
  const index = siblings.findIndex((sibling) => sibling.id === item.id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || !siblings[swapIndex]) {
    return Response.json({ changed: false });
  }

  const reordered = [...siblings];
  [reordered[index], reordered[swapIndex]] = [
    reordered[swapIndex],
    reordered[index],
  ];

  for (let orderIndex = 0; orderIndex < reordered.length; orderIndex++) {
    const { error } = await supabase
      .from("artifacts")
      .update({ sort_order: (orderIndex + 1) * 10 })
      .eq("id", reordered[orderIndex].id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ changed: true });
}
