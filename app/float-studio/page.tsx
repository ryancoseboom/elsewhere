import FloatStudio from "@/components/FloatStudio";
import { createClient } from "@/lib/supabase/server";

type StudioArtifact = {
  slug: string;
  title: string;
};

export default async function FloatStudioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("slug, title")
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .not("image_url", "is", null)
    .order("title", { ascending: true })
    .limit(300);

  if (error) throw new Error(error.message);

  const artifacts = ((data || []) as StudioArtifact[]).filter(
    (artifact) => artifact.slug && artifact.title
  );

  return (
    <FloatStudio
      artifacts={artifacts}
      defaultSlug={artifacts.find((artifact) => artifact.slug === "coco")?.slug || artifacts[0]?.slug || ""}
    />
  );
}
