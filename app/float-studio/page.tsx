import FloatStudio from "@/components/FloatStudio";
import { createClient } from "@/lib/supabase/server";

type StudioArtifact = {
  id: string;
  slug: string;
  title: string;
};

export default async function FloatStudioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("id, slug, title")
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .or(
      "artifact_type.in.(Album,EP,Single,Song),kind.in.(Album,EP,Single,Song)"
    )
    .order("title", { ascending: true })
    .limit(300);

  if (error) throw new Error(error.message);

  const candidateArtifacts = ((data || []) as StudioArtifact[]).filter(
    (artifact) => artifact.slug && artifact.title
  );
  const candidateIds = candidateArtifacts.map((artifact) => artifact.id);
  const candidateSlugs = candidateArtifacts.map((artifact) => artifact.slug);
  const childParentKeys = new Set<string>();

  if (candidateIds.length) {
    const { data: childrenById, error: childrenByIdError } = await supabase
      .from("artifacts")
      .select("parent_id")
      .eq("is_public", true)
      .eq("discovery_visibility", "public")
      .not("image_url", "is", null)
      .in("parent_id", candidateIds);

    if (childrenByIdError) throw new Error(childrenByIdError.message);

    (childrenById || []).forEach((child) => {
      if (child.parent_id) childParentKeys.add(child.parent_id);
    });
  }

  if (candidateSlugs.length) {
    const { data: childrenBySlug, error: childrenBySlugError } = await supabase
      .from("artifacts")
      .select("parent_slug")
      .eq("is_public", true)
      .eq("discovery_visibility", "public")
      .not("image_url", "is", null)
      .in("parent_slug", candidateSlugs);

    if (childrenBySlugError) throw new Error(childrenBySlugError.message);

    (childrenBySlug || []).forEach((child) => {
      if (child.parent_slug) childParentKeys.add(child.parent_slug);
    });
  }

  const artifacts = candidateArtifacts.filter(
    (artifact) =>
      childParentKeys.has(artifact.id) || childParentKeys.has(artifact.slug)
  );

  return (
    <FloatStudio
      artifacts={artifacts}
      defaultSlug="__global"
    />
  );
}
