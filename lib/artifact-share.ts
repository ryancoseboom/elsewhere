import { createPublicClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { getYouTubeThumbnailUrl } from "@/lib/video";

export const artifactShareImageSize = {
  width: 1200,
  height: 630,
};

const ARTIFACT_SHARE_SELECT =
  "slug, title, kind, artifact_type, description, fragment, image_url, youtube_url, discovery_visibility";

export type ArtifactShareData = {
  slug: string;
  title: string;
  kind: string | null;
  artifact_type: string | null;
  description: string | null;
  fragment: string | null;
  image_url: string | null;
  youtube_url: string | null;
  discovery_visibility: string | null;
};

export async function getArtifactShareData(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("artifacts")
    .select(ARTIFACT_SHARE_SELECT)
    .eq("slug", slug)
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"])
    .maybeSingle();

  return (data || null) as ArtifactShareData | null;
}

export function artifactShareDescription(artifact: ArtifactShareData) {
  return (
    artifact.description?.trim() ||
    artifact.fragment?.trim() ||
    "Halou recordings, photos, notes, and things we thought were gone."
  );
}

export function artifactShareType(artifact: ArtifactShareData) {
  return artifact.artifact_type || artifact.kind || "Record";
}

export function artifactShareVisualUrl(artifact: ArtifactShareData) {
  return (
    artifact.image_url?.trim() ||
    getYouTubeThumbnailUrl(artifact.youtube_url) ||
    ""
  );
}

export function artifactShareImageUrl(slug: string) {
  return new URL(`/artifact/${slug}/opengraph-image`, siteUrl());
}
