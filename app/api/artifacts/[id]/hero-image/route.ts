import crypto from "crypto";
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

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return Response.json({ error: "Choose an image file." }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: artifact, error: artifactError } = await supabase
    .from("artifacts")
    .select("id, slug, image_url")
    .eq("id", id)
    .single();

  if (artifactError || !artifact) {
    return Response.json({ error: "Artifact not found." }, { status: 404 });
  }

  const extension = image.name.split(".").pop()?.toLowerCase() || "file";
  const path = `${artifact.slug}/images/${crypto.randomBytes(8).toString("hex")}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("artifact-media")
    .upload(path, image, {
      cacheControl: "3600",
      upsert: false,
      contentType: image.type,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: imageData } = supabase.storage
    .from("artifact-media")
    .getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("artifacts")
    .update({ image_url: imageData.publicUrl })
    .eq("id", artifact.id);

  if (updateError) {
    await supabase.storage.from("artifact-media").remove([path]);
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const previousStoragePath = getArchiveStoragePath(artifact.image_url || "");

  if (previousStoragePath && previousStoragePath !== path) {
    await supabase.storage.from("artifact-media").remove([previousStoragePath]);
  }

  return Response.json({ imageUrl: imageData.publicUrl });
}
