import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("slug")
    .eq("is_public", true)
    .eq("discovery_visibility", "public");

  if (error) throw new Error(error.message);

  return [
    "/",
    "/explore",
    "/drift",
    "/float",
    ...(data || []).map((artifact) => `/artifact/${artifact.slug}`),
  ].map((path) => ({
    url: new URL(path, baseUrl).toString(),
  }));
}
