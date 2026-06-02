import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EPHEMERA_PANES, type EphemeraPane } from "@/lib/ephemera";

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

function isImageArtifact(type: string | null | undefined) {
  return ["Artwork", "Design", "Photo"].includes(type || "");
}

const ephemeraPrefix = "ephemera:";

function getArchiveStoragePath(imageUrl: string) {
  const marker = "/storage/v1/object/public/artifact-media/";

  try {
    const url = new URL(imageUrl);
    const index = url.pathname.indexOf(marker);

    return index >= 0
      ? decodeURIComponent(url.pathname.slice(index + marker.length))
      : "";
  } catch {
    return "";
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasBackroomAccess(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, ephemeraPane } = (await request.json()) as {
    title?: string;
    ephemeraPane?: string;
  };
  const nextTitle = title?.trim();

  if (!nextTitle && !ephemeraPane) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  if (
    ephemeraPane &&
    !EPHEMERA_PANES.includes(ephemeraPane as EphemeraPane)
  ) {
    return Response.json({ error: "Unknown Ephemera pane." }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: artifact, error: artifactError } = await supabase
    .from("artifacts")
    .select("id, artifact_type, kind, rooms")
    .eq("id", id)
    .single();

  if (artifactError || !artifact) {
    return Response.json({ error: "Artifact not found." }, { status: 404 });
  }

  if (!isImageArtifact(artifact.artifact_type || artifact.kind)) {
    return Response.json(
      { error: "Only child image artifacts can be renamed here." },
      { status: 400 }
    );
  }

  const rooms = ephemeraPane
    ? [
        ...(artifact.rooms || []).filter(
          (room: string) => !room.startsWith(ephemeraPrefix)
        ),
        `${ephemeraPrefix}${ephemeraPane}`,
      ]
    : artifact.rooms;
  const { error: updateError } = await supabase
    .from("artifacts")
    .update({
      ...(nextTitle ? { title: nextTitle } : {}),
      ...(ephemeraPane ? { rooms } : {}),
    })
    .eq("id", artifact.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ title: nextTitle, ephemeraPane });
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
    .select("id, artifact_type, kind, image_url")
    .eq("id", id)
    .single();

  if (artifactError || !artifact) {
    return Response.json({ error: "Artifact not found." }, { status: 404 });
  }

  const type = artifact.artifact_type || artifact.kind;

  if (!isImageArtifact(type)) {
    return Response.json(
      { error: "Only child image artifacts can be deleted here." },
      { status: 400 }
    );
  }

  const storagePath = getArchiveStoragePath(artifact.image_url || "");

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
