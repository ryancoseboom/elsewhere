const HALOU_BASE_URL = "https://www.halou.com";

export type OfficialHalouLyrics = {
  title: string;
  lyrics: string;
  sourceUrl: string;
};

const RELEASE_PATHS = [
  "/the-butchers-bill-bhz55-1-1",
  "/the-butchers-bill-bhz55",
  "/the-butchers-bill-bhz55-1",
  "/the-butchers-bill",
  "/the-butchers-bill-3",
  "/the-butchers-bill-2",
  "/the-butchers-bill-1",
  "/the-butchers-bill-5",
  "/the-butchers-bill-4",
  "/the-butchers-bill-5-1",
];

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&hellip;/gi, "...")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function htmlToText(value: string) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLyrics(value: string) {
  return htmlToText(value)
    .replace(/^(?:single|album|ep)\s*\|[^\n]*\n*/i, "")
    .replace(/^[-*_=\s]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLyricsFromPage(html: string, sourceUrl: string) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  const headingPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings = [...main.matchAll(headingPattern)];
  const entries: OfficialHalouLyrics[] = [];

  const firstHeading = htmlToText(headings[0]?.[1] || "");
  const firstHeadingBody = cleanLyrics(
    main.slice(
      (headings[0]?.index || 0) + (headings[0]?.[0].length || 0),
      headings[1]?.index ?? main.length
    )
  );

  if (
    (headings.length === 1 ||
      (headings.length === 2 &&
        headings[1] &&
        htmlToText(headings[1][1]) === "Halou Updates")) &&
    firstHeading &&
    firstHeadingBody.length >= 8
  ) {
    entries.push({
      title: firstHeading,
      lyrics: firstHeadingBody,
      sourceUrl,
    });
  }

  for (let index = 1; index < headings.length; index++) {
    const heading = headings[index];
    const nextHeading = headings[index + 1];
    const title = htmlToText(heading[1]);

    if (!title || title === "Halou Updates") continue;

    const lyrics = cleanLyrics(
      main.slice(
        (heading.index || 0) + heading[0].length,
        nextHeading?.index ?? main.length
      )
    );

    if (lyrics.length < 8) continue;

    entries.push({ title, lyrics, sourceUrl });
  }

  return entries;
}

async function fetchOfficialPage(path: string) {
  const sourceUrl = `${HALOU_BASE_URL}${path}`;
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "ElsewhereArchive/0.1 (official Halou lyrics import)",
    },
    cache: "no-store",
  });

  if (!response.ok) return [];

  return extractLyricsFromPage(await response.text(), sourceUrl);
}

export async function getOfficialHalouLyrics() {
  const entries: OfficialHalouLyrics[] = [];

  for (const path of RELEASE_PATHS) {
    entries.push(...(await fetchOfficialPage(path)));
  }

  return entries;
}
