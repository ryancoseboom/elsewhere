import { createClient } from "@/lib/supabase/server";

type AttachedArtifact = {
  id: string;
  slug: string;
  parent_id: string | null;
  parent_slug: string | null;
  album_id: string | null;
  song_id: string | null;
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

function isReleaseTrack(parent: AttachedArtifact, child: AttachedArtifact) {
  return (
    ["Album", "Single"].includes(parent.artifact_type || parent.kind || "") &&
    (child.artifact_type || child.kind) === "Song"
  );
}

function isAttachedTo(parent: AttachedArtifact, child: AttachedArtifact) {
  const parentType = parent.artifact_type || parent.kind || "";

  return (
    child.parent_id === parent.id ||
    child.parent_slug === parent.slug ||
    (["Album", "Single"].includes(parentType) && child.album_id === parent.id) ||
    (parentType === "Song" && child.song_id === parent.id)
  );
}

export async function syncArtifactDescendantPublication({
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
    .select(
      "id, slug, parent_id, parent_slug, album_id, song_id, artifact_type, kind, image_url, audio_url, video_url, youtube_url"
    );

  if (error) throw new Error(error.message);

  const artifacts = (data || []) as AttachedArtifact[];
  const root = artifacts.find((artifact) => artifact.id === artifactId) || {
    id: artifactId,
    slug: artifactSlug,
    parent_id: null,
    parent_slug: null,
    album_id: null,
    song_id: null,
    artifact_type: null,
    kind: null,
    image_url: null,
    audio_url: null,
    video_url: null,
    youtube_url: null,
  };
  const descendants: AttachedArtifact[] = [];
  const queue = [root];
  const visited = new Set([artifactId]);

  while (queue.length > 0) {
    const parent = queue.shift()!;
    const children = artifacts.filter(
      (artifact) =>
        !visited.has(artifact.id) &&
        isAttachedTo(parent, artifact)
    );

    children.forEach((child) => {
      if (!isAttachedMedia(child) && !isReleaseTrack(parent, child)) return;

      visited.add(child.id);
      descendants.push(child);
      queue.push(child);
    });
  }

  if (descendants.length === 0) return;

  const { error: updateError } = await supabase
    .from("artifacts")
    .update({ is_public: isPublic })
    .in("id", descendants.map((artifact) => artifact.id));

  if (updateError) throw new Error(updateError.message);
}
