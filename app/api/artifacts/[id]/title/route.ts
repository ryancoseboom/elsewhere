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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasBackroomAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title } = (await request.json()) as { title?: string };
  const nextTitle = title?.trim();

  if (!nextTitle) {
    return Response.json({ error: "Add a title." }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: artifact, error: artifactError } = await supabase
    .from("artifacts")
    .select("id, parent_id, parent_slug, artifact_type, kind, audio_url, video_url, youtube_url")
    .eq("id", id)
    .single();

  if (artifactError || !artifact) {
    return Response.json({ error: "Artifact not found." }, { status: 404 });
  }

  const type = artifact.artifact_type || artifact.kind;
  const isChildArtifact = Boolean(artifact.parent_id || artifact.parent_slug);
  const isDemo = type === "Demo" || Boolean(artifact.audio_url);
  const isVideo =
    type === "Video" || Boolean(artifact.video_url || artifact.youtube_url);

  if (!isChildArtifact || (!isDemo && !isVideo)) {
    return Response.json(
      { error: "Only child demos and videos can be renamed here." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("artifacts")
    .update({ title: nextTitle })
    .eq("id", artifact.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ title: nextTitle });
}
