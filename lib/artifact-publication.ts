import { createClient } from "@/lib/supabase/server";

type AttachedArtifact = {
  id: string;
  artifact_type: string | null;
  kind: string | null;
  image_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
};

function isAttachedMedia(artifact: AttachedArtifact) {
  return (
    ["Artwork", "Design", "Photo", "Demo", "Video"].includes(
      artifact.artifact_type || artifact.kind || ""
    ) ||
    Boolean(
      artifact.image_url ||
        artifact.audio_url ||
        artifact.video_url ||
        artifact.youtube_url
    )
  );
}

export async function syncAttachedMediaPublication({
  artifactId,
  artifactSlug,
  isPublic,
}: {
  artifactId: string;
  artifactSlug: string;
  isPublic: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("id, artifact_type, kind, image_url, audio_url, video_url, youtube_url")
    .or(`parent_id.eq.${artifactId},parent_slug.eq.${artifactSlug}`);

  if (error) throw new Error(error.message);

  const mediaIds = ((data || []) as AttachedArtifact[])
    .filter(isAttachedMedia)
    .map((artifact) => artifact.id);

  if (mediaIds.length === 0) return;

  const { error: updateError } = await supabase
    .from("artifacts")
    .update({ is_public: isPublic })
    .in("id", mediaIds);

  if (updateError) throw new Error(updateError.message);
}
