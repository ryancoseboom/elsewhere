import { notFound } from "next/navigation";
import FloatExperiment, {
  type FloatExperimentArtifact,
  type FloatInterferenceSignal,
  type FloatVideoFormat,
} from "@/components/FloatExperiment";
import { createClient } from "@/lib/supabase/server";
import { readFloatControls } from "@/lib/float-controls";
import { getSourceInterferenceSnippets } from "@/lib/source-artifacts";
import { getLaunchInterferenceSnippets } from "@/lib/launch-interference";

type Artifact = {
  album: string | null;
  album_id: string | null;
  artifact_type: string | null;
  atmosphere: string[] | null;
  band_id: string | null;
  description: string | null;
  discovery_visibility: string | null;
  era: string | null;
  fragment: string | null;
  id: string;
  image_url: string | null;
  kind: string | null;
  lyrics: string | null;
  motifs: string[] | null;
  nearby: string[] | null;
  parent_id: string | null;
  parent_slug: string | null;
  rooms: string[] | null;
  slug: string;
  song_id: string | null;
  title: string;
  year: string | null;
};

type FloatRenderSearchParams = Promise<{
  debug?: string | string[];
  format?: string | string[];
} & Record<string, string | string[] | undefined>>;

const GLOBAL_FLOAT_SLUG = "__global";

function toFloatArtifact(artifact: Artifact): FloatExperimentArtifact {
  return {
    album: artifact.album,
    album_id: artifact.album_id,
    artifact_type: artifact.artifact_type,
    atmosphere: artifact.atmosphere,
    band_id: artifact.band_id,
    description: artifact.description,
    discovery_visibility: artifact.discovery_visibility,
    era: artifact.era,
    fragment: artifact.fragment,
    id: artifact.id,
    image_url: artifact.image_url,
    kind: artifact.kind,
    lyrics: artifact.lyrics,
    motifs: artifact.motifs,
    nearby: artifact.nearby,
    parent_id: artifact.parent_id,
    parent_slug: artifact.parent_slug,
    rooms: artifact.rooms,
    slug: artifact.slug,
    song_id: artifact.song_id,
    title: artifact.title,
    year: artifact.year,
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function videoFormat(value: string | undefined): FloatVideoFormat {
  return value === "instagram" || value === "vertical" ? "instagram" : "youtube";
}

function artifactType(artifact: Artifact) {
  return artifact.artifact_type || artifact.kind || "";
}

export default async function FloatRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: FloatRenderSearchParams;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const format = videoFormat(firstParam(resolvedSearchParams.format));
  const controls = readFloatControls(resolvedSearchParams);
  const debugMode = ["1", "true", "debug"].includes(
    firstParam(resolvedSearchParams.debug) || ""
  );
  const supabase = await createClient();
  const fields =
    "id, slug, title, kind, artifact_type, parent_id, parent_slug, band_id, album_id, song_id, description, fragment, lyrics, atmosphere, motifs, rooms, nearby, image_url, album, year, era, discovery_visibility";

  if (slug === GLOBAL_FLOAT_SLUG) {
    const { data, error } = await supabase
      .from("artifacts")
      .select(fields)
      .eq("is_public", true)
      .in("discovery_visibility", ["public", "hidden"])
      .limit(500);

    if (error) throw new Error(error.message);

    const allFloatArtifacts = ((data || []) as Artifact[]).map(toFloatArtifact);
    const publicFloatArtifacts = allFloatArtifacts.filter(
      (artifact) => artifact.discovery_visibility !== "hidden"
    );
    const publicImageArtifacts = publicFloatArtifacts.filter((artifact) =>
      artifact.image_url?.trim()
    );
    const floatContext = {
      atmosphere: [
        ...new Set(publicImageArtifacts.flatMap((artifact) => artifact.atmosphere || [])),
      ].slice(0, 10),
      motifs: [
        ...new Set(publicImageArtifacts.flatMap((artifact) => artifact.motifs || [])),
      ].slice(0, 10),
    };
    const sourceInterferenceSnippets = await getSourceInterferenceSnippets({
      context: floatContext,
      limit: 14,
      supabase,
    });
    const sourceInterference: FloatInterferenceSignal[] = [
      ...sourceInterferenceSnippets,
      ...getLaunchInterferenceSnippets(floatContext, 10),
    ].map((snippet) => ({
      reason: snippet.tone,
      source: snippet.sourceTitle,
      text: snippet.text,
    }));
    const seed = [...GLOBAL_FLOAT_SLUG, format].reduce(
      (total, char, index) => total + char.charCodeAt(0) * (index + 17),
      format === "instagram" ? 9701 : 8701
    );

    return (
      <FloatExperiment
        artifacts={publicImageArtifacts}
        centralTextArtifacts={publicFloatArtifacts}
        debugMode={debugMode}
        seed={seed}
        showControls={false}
        controls={controls}
        sourceInterference={sourceInterference}
        videoFormat={format}
      />
    );
  }

  const { data: current, error } = await supabase
    .from("artifacts")
    .select(fields)
    .eq("slug", slug)
    .eq("is_public", true)
    .in("discovery_visibility", ["public", "hidden"])
    .single();

  if (error || !current) notFound();

  const artifact = current as Artifact;
  const childConditions = [
    `parent_id.eq.${artifact.id}`,
    `parent_slug.eq.${artifact.slug}`,
  ];

  if (["Album", "EP", "Single"].includes(artifactType(artifact))) {
    childConditions.push(`album_id.eq.${artifact.id}`);
  }

  const { data: childData } = await supabase
    .from("artifacts")
    .select(fields)
    .eq("is_public", true)
    .eq("discovery_visibility", "public")
    .or(childConditions.join(","))
    .limit(80);
  const children = ((childData || []) as Artifact[]).filter(
    (item) => item.id !== artifact.id
  );
  const centralTextArtifacts = [artifact, ...children].map(toFloatArtifact);
  const floatArtifactMap = new Map<string, FloatExperimentArtifact>();

  [artifact, ...children]
    .filter((item) => item.image_url?.trim())
    .map(toFloatArtifact)
    .forEach((item) => floatArtifactMap.set(item.id, item));

  if (floatArtifactMap.size === 0 && artifact.image_url) {
    floatArtifactMap.set(artifact.id, toFloatArtifact(artifact));
  }

  const seed = [...artifact.slug, format].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 17),
    format === "instagram" ? 2701 : 1701
  );
  const sourceInterferenceContext = {
    artifactSlug: artifact.slug,
    atmosphere: artifact.atmosphere || [],
    motifs: artifact.motifs || [],
  };
  const sourceInterferenceSnippets = await getSourceInterferenceSnippets({
      context: sourceInterferenceContext,
      limit: 12,
      supabase,
    });
  const sourceInterference: FloatInterferenceSignal[] = [
    ...sourceInterferenceSnippets,
    ...getLaunchInterferenceSnippets(sourceInterferenceContext, 8),
  ].map((snippet) => ({
    reason: snippet.tone,
    source: snippet.sourceTitle,
    text: snippet.text,
  }));

  return (
    <FloatExperiment
      artifacts={[...floatArtifactMap.values()]}
      centralTextArtifacts={centralTextArtifacts}
      debugMode={debugMode}
      seed={seed}
      showControls={false}
      controls={controls}
      sourceInterference={sourceInterference}
      videoFormat={format}
    />
  );
}
