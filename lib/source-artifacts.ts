import type { SupabaseClient } from "@supabase/supabase-js";

export const SOURCE_INTERFERENCE_ENABLED =
  process.env.ENABLE_SOURCE_INTERFERENCE !== "false";

export const SOURCE_TYPES = [
  "article",
  "review",
  "interview",
  "lyric",
  "listing",
  "archive",
  "press",
  "video_description",
  "other",
] as const;

export const SOURCE_STATUSES = ["draft", "approved", "rejected"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export type SourceArtifact = {
  id: string;
  title: string;
  source_type: SourceType;
  related_entity: string | null;
  related_artifact_slug: string | null;
  room_tags: string[] | null;
  source_url: string;
  source_name: string | null;
  author: string | null;
  publication_date: string | null;
  captured_at: string;
  short_excerpt: string | null;
  paraphrased_summary: string | null;
  keywords: string[] | null;
  atmosphere_tags: string[] | null;
  motif_tags: string[] | null;
  extracted_fragments: string[] | null;
  status: SourceStatus;
  hidden: boolean;
  intensity: number;
  updated_at: string;
};

export type SourceInterferenceContext = {
  artifactSlug?: string;
  atmosphere?: string[];
  motif?: string;
  motifs?: string[];
  room?: string;
};

export type SourceInterferenceSnippet = {
  text: string;
  tone: string;
  sourceTitle: string;
  sourceUrl: string;
};

export function splitSourceList(value: FormDataEntryValue | string | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sourceType(value: FormDataEntryValue | string | null) {
  const type = String(value || "other");

  return SOURCE_TYPES.includes(type as SourceType) ? (type as SourceType) : "other";
}

export function sourceStatus(value: FormDataEntryValue | string | null) {
  const status = String(value || "draft");

  return SOURCE_STATUSES.includes(status as SourceStatus)
    ? (status as SourceStatus)
    : "draft";
}

export function clipText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) return normalized;

  return `${normalized.slice(0, limit).replace(/\s+\S*$/, "")}...`;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
  );

  return match?.[1]?.trim() || "";
}

function titleFromHtml(html: string) {
  const ogTitle = metaContent(html, "og:title");
  if (ogTitle) return ogTitle;

  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
}

function sourceNameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function fragmentsFromText(text: string) {
  const normalized = stripHtml(text);
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24 && sentence.length <= 180);

  return sentences
    .slice(0, 8)
    .map((sentence) => clipText(sentence, 96))
    .filter(Boolean);
}

export async function extractSourceDraftFromUrl(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "ElsewhereSourceArchive/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Source returned ${response.status}.`);
  }

  const html = await response.text();
  const title = titleFromHtml(html) || sourceUrl;
  const description =
    metaContent(html, "description") || metaContent(html, "og:description");
  const author =
    metaContent(html, "author") || metaContent(html, "article:author");
  const publicationDate =
    metaContent(html, "article:published_time") ||
    metaContent(html, "date") ||
    metaContent(html, "pubdate");
  const plainText = stripHtml(html);
  const fragments = fragmentsFromText(description || plainText);
  const excerpt = clipText(description || fragments[0] || plainText, 240);
  const sourceName = sourceNameFromUrl(sourceUrl);

  return {
    title: clipText(title, 180),
    source_url: sourceUrl,
    source_name: sourceName,
    author,
    publication_date: publicationDate,
    short_excerpt: excerpt,
    paraphrased_summary: `A recovered source from ${sourceName || "the web"} mentioning ${clipText(title, 96)}.`,
    extracted_fragments: fragments.slice(0, 5),
  };
}

function contextScore(source: SourceArtifact, context: SourceInterferenceContext) {
  let score = Math.max(1, source.intensity || 1);
  const atmospheres = new Set(
    [...(context.atmosphere || []), ...(source.atmosphere_tags || [])].map((item) =>
      item.toLowerCase()
    )
  );
  const motifs = new Set(
    [context.motif, ...(context.motifs || [])]
      .filter(Boolean)
      .map((item) => String(item).toLowerCase())
  );

  if (context.artifactSlug && source.related_artifact_slug === context.artifactSlug) {
    score += 8;
  }
  if (context.room && (source.room_tags || []).includes(context.room)) score += 5;
  (source.motif_tags || []).forEach((tag) => {
    if (motifs.has(tag.toLowerCase())) score += 4;
  });
  (source.atmosphere_tags || []).forEach((tag) => {
    if (atmospheres.has(tag.toLowerCase())) score += 2;
  });

  return score;
}

function weightedSample<T>(items: T[], weight: (item: T) => number, limit: number) {
  return [...items]
    .map((item, index) => ({
      item,
      rank: Math.sin((index + 1) * 999) * 0.001 + weight(item) * Math.random(),
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ item }) => item);
}

export async function getSourceInterferenceSnippets({
  context,
  limit = 3,
  supabase,
}: {
  context: SourceInterferenceContext;
  limit?: number;
  supabase: SupabaseClient;
}) {
  if (!SOURCE_INTERFERENCE_ENABLED) return [];

  const { data, error } = await supabase
    .from("source_artifacts")
    .select("*")
    .eq("status", "approved")
    .eq("hidden", true)
    .limit(80);

  if (error?.code === "42P01") return [];
  if (error) throw new Error(error.message);

  const sources = (data || []) as SourceArtifact[];
  const selected = weightedSample(
    sources,
    (source) => contextScore(source, context),
    limit
  );

  return selected.flatMap((source) => {
    const fragment =
      weightedSample(source.extracted_fragments || [], () => source.intensity || 1, 1)[0] ||
      source.short_excerpt ||
      source.paraphrased_summary ||
      "";

    if (!fragment) return [];

    return {
      text: clipText(fragment, 110),
      tone: `${source.source_type} fragment / ${
        source.publication_date || "date unresolved"
      }`,
      sourceTitle: source.title,
      sourceUrl: source.source_url,
    } satisfies SourceInterferenceSnippet;
  });
}

