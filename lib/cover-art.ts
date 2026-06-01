const MUSICBRAINZ_BASE_URL = "https://musicbrainz.org/ws/2";
const COVER_ART_BASE_URL = "https://coverartarchive.org/release";

type MusicBrainzRelease = {
  id: string;
  title: string;
  date?: string;
  status?: string;
};

export type CoverArtSuggestion = {
  albumId: string;
  albumTitle: string;
  albumYear: string;
  artistName: string;
  releaseId: string;
  releaseTitle: string;
  releaseDate: string;
  imageUrl: string;
};

function musicBrainzHeaders() {
  const contact = process.env.MUSICBRAINZ_CONTACT || "local Backroom importer";

  return {
    Accept: "application/json",
    "User-Agent": `ElsewhereArchive/0.1 (${contact})`,
  };
}

async function hasFrontCover(releaseId: string) {
  const response = await fetch(`${COVER_ART_BASE_URL}/${releaseId}/front-500`, {
    method: "HEAD",
    redirect: "manual",
    cache: "no-store",
  });

  return response.ok || (response.status >= 300 && response.status < 400);
}

async function searchMusicBrainzReleases(title: string, artistName: string) {
  const query = `release:"${title}" AND artist:"${artistName}"`;
  const response = await fetch(
    `${MUSICBRAINZ_BASE_URL}/release/?query=${encodeURIComponent(
      query
    )}&fmt=json&limit=10`,
    {
      headers: musicBrainzHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as { releases?: MusicBrainzRelease[] };
  return data.releases || [];
}

export async function getCoverArtSuggestion(album: {
  id: string;
  title: string;
  year: string | null;
  artistName: string;
}) {
  const releases = await searchMusicBrainzReleases(
    album.title,
    album.artistName
  );
  const sortedReleases = [...releases].sort((a, b) => {
    const titleDifference =
      Number(b.title.toLowerCase() === album.title.toLowerCase()) -
      Number(a.title.toLowerCase() === album.title.toLowerCase());

    if (titleDifference !== 0) return titleDifference;

    const officialDifference =
      Number(b.status === "Official") - Number(a.status === "Official");

    if (officialDifference !== 0) return officialDifference;

    const yearDifference =
      Number(b.date?.startsWith(album.year || "")) -
      Number(a.date?.startsWith(album.year || ""));

    if (yearDifference !== 0) return yearDifference;

    return (a.date || "").localeCompare(b.date || "");
  });

  for (const release of sortedReleases) {
    if (!(await hasFrontCover(release.id))) continue;

    return {
      albumId: album.id,
      albumTitle: album.title,
      albumYear: album.year || "",
      artistName: album.artistName,
      releaseId: release.id,
      releaseTitle: release.title,
      releaseDate: release.date || "",
      imageUrl: `${COVER_ART_BASE_URL}/${release.id}/front-500`,
    } satisfies CoverArtSuggestion;
  }

  return null;
}

export async function getCoverArtSuggestions(
  albums: {
    id: string;
    title: string;
    year: string | null;
    artistName: string;
  }[]
) {
  const suggestions: CoverArtSuggestion[] = [];

  for (let index = 0; index < albums.length; index++) {
    const suggestion = await getCoverArtSuggestion(albums[index]);

    if (suggestion) suggestions.push(suggestion);

    if (index < albums.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return suggestions;
}
