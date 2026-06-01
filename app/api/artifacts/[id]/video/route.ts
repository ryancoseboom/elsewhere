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

function hasBackroomAccess(request: NextRequest) {
  return (
    request.cookies.get("elsewhere_backroom")?.value === "yes" ||
    hasValidBackroomAuthorization(request.headers.get("authorization"))
  );
}

function getArchiveStoragePath(videoUrl: string) {
  const marker = "/storage/v1/object/public/artifact-media/";

  try {
    const url = new URL(videoUrl);
    const index = url.pathname.indexOf(marker);

    return index >= 0
      ? decodeURIComponent(url.pathname.slice(index + marker.length))
      : "";
  } catch {
    return "";
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasBackroomAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: artifact, error: artifactError } = await supabase
    .from("artifacts")
    .select("id, parent_id, parent_slug, artifact_type, kind, video_url, youtube_url")
    .eq("id", id)
    .single();

  if (artifactError || !artifact) {
    return Response.json({ error: "Artifact not found." }, { status: 404 });
  }

  const type = artifact.artifact_type || artifact.kind;

  if (
    (!artifact.parent_id && !artifact.parent_slug) ||
    (type !== "Video" && !artifact.video_url && !artifact.youtube_url)
  ) {
    return Response.json(
      { error: "Only child video artifacts can be deleted here." },
      { status: 400 }
    );
  }

  const storagePath = getArchiveStoragePath(artifact.video_url || "");

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from("artifact-media")
      .remove([storagePath]);

    if (storageError) {
      return Response.json({ error: storageError.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", artifact.id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ deleted: true });
}
