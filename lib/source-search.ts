import {
  clipText,
  fragmentsFromText,
  type SourceType,
} from "@/lib/source-artifacts";

export type SourceSearchResult = {
  title: string;
  source_url: string;
  source_name: string;
  short_excerpt: string;
  paraphrased_summary: string;
  extracted_fragments: string[];
};

function sourceNameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(value: string) {
  const decoded = decodeHtml(value);

  try {
    const url = new URL(decoded, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");

    return uddg ? decodeURIComponent(uddg) : url.toString();
  } catch {
    return decoded;
  }
}

function resultSummary({
  query,
  snippet,
  sourceName,
  title,
}: {
  query: string;
  snippet: string;
  sourceName: string;
  title: string;
}) {
  return `Search result from ${sourceName || "the web"} for "${clipText(
    query,
    80
  )}", filed as a possible source trace for ${clipText(title, 80)}. ${
    snippet ? `Summary note: ${clipText(snippet, 140)}` : ""
  }`.trim();
}

async function searchBrave(query: string, limit: number) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
      query
    )}&count=${Math.min(limit, 20)}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Brave Search returned ${response.status}.`);
  }

  const json = (await response.json()) as {
    web?: {
      results?: {
        title?: string;
        url?: string;
        description?: string;
        profile?: { name?: string };
      }[];
    };
  };

  return (json.web?.results || []).flatMap((result) => {
    if (!result.url || !result.title) return [];

    const sourceName = result.profile?.name || sourceNameFromUrl(result.url);
    const snippet = clipText(result.description || "", 240);

    return {
      title: clipText(result.title, 180),
      source_url: result.url,
      source_name: sourceName,
      short_excerpt: snippet,
      paraphrased_summary: resultSummary({
        query,
        snippet,
        sourceName,
        title: result.title,
      }),
      extracted_fragments: fragmentsFromText(snippet).slice(0, 4),
    } satisfies SourceSearchResult;
  });
}

async function searchDuckDuckGo(query: string, limit: number) {
  const response = await fetch(
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "ElsewhereSourceArchive/0.1",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`DuckDuckGo returned ${response.status}.`);
  }

  const html = await response.text();
  const resultPattern =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  const results: SourceSearchResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = resultPattern.exec(html)) && results.length < limit) {
    const sourceUrl = cleanUrl(match[1] || "");
    const title = clipText(decodeHtml(match[2].replace(/<[^>]+>/g, " ")), 180);
    const snippet = clipText(
      decodeHtml((match[3] || "").replace(/<[^>]+>/g, " ")),
      240
    );
    const sourceName = sourceNameFromUrl(sourceUrl);

    if (!sourceUrl || !title) continue;

    results.push({
      title,
      source_url: sourceUrl,
      source_name: sourceName,
      short_excerpt: snippet,
      paraphrased_summary: resultSummary({
        query,
        snippet,
        sourceName,
        title,
      }),
      extracted_fragments: fragmentsFromText(snippet).slice(0, 4),
    });
  }

  return results;
}

export function buildSourceQueries({
  entities,
  sourceType,
}: {
  entities: string[];
  sourceType: SourceType;
}) {
  const modifiers: Record<SourceType, string[]> = {
    archive: ["archive", "Wayback", "old website"],
    article: ["article", "feature"],
    interview: ["interview"],
    listing: ["concert listing", "show flyer", "event"],
    lyric: ["lyrics", "meaning", "song"],
    other: ["archive", "source"],
    press: ["press release", "press"],
    review: ["review"],
    video_description: ["video", "description"],
  };

  return entities.flatMap((entity) =>
    (modifiers[sourceType] || modifiers.other).map((modifier) =>
      `${entity} ${modifier}`.trim()
    )
  );
}

export async function searchWebForSourceMaterial({
  limit,
  queries,
}: {
  limit: number;
  queries: string[];
}) {
  const seen = new Set<string>();
  const results: SourceSearchResult[] = [];
  const perQueryLimit = Math.max(2, Math.ceil(limit / Math.max(1, queries.length)));

  for (const query of queries) {
    const queryResults =
      process.env.BRAVE_SEARCH_API_KEY
        ? await searchBrave(query, perQueryLimit)
        : await searchDuckDuckGo(query, perQueryLimit);

    for (const result of queryResults) {
      const key = result.source_url.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      results.push(result);
      if (results.length >= limit) return results;
    }
  }

  return results;
}

