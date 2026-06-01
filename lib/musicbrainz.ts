const MUSICBRAINZ_BASE_URL = "https://musicbrainz.org/ws/2";

export type MusicBrainzArtist = {
  id: string;
  name: string;
  disambiguation?: string;
  country?: string;
  score?: number;
};

export type MusicBrainzReleaseSummary = {
  id: string;
  title: string;
  date?: string;
  status?: string;
  country?: string;
  "release-group"?: Omit<MusicBrainzReleaseGroup, "releases">;
};

export type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
  "primary-type"?: string;
  releases?: MusicBrainzReleaseSummary[];
};

export type MusicBrainzTrack = {
  id: string;
  number: string;
  position: number;
  title: string;
  recording: {
    id: string;
    title: string;
    length?: number;
  };
};

export type MusicBrainzRelease = {
  id: string;
  title: string;
  date?: string;
  status?: string;
  "release-group"?: {
    id: string;
    title: string;
    "primary-type"?: string;
  };
  "artist-credit"?: {
    name: string;
    joinphrase?: string;
  }[];
  "cover-art-archive"?: {
    artwork: boolean;
    front: boolean;
    back: boolean;
    count: number;
  };
  media?: {
    position: number;
    tracks?: MusicBrainzTrack[];
  }[];
};

function musicBrainzUserAgent() {
  const contact = process.env.MUSICBRAINZ_CONTACT || "local Backroom importer";
  return `ElsewhereArchive/0.1 (${contact})`;
}

async function musicBrainzFetch<T>(path: string) {
  const response = await fetch(`${MUSICBRAINZ_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": musicBrainzUserAgent(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz returned ${response.status}. Please try again shortly.`);
  }

  return (await response.json()) as T;
}

export async function searchMusicBrainzArtists(query: string) {
  const result = await musicBrainzFetch<{ artists?: MusicBrainzArtist[] }>(
    `/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=10`
  );

  return result.artists || [];
}

export async function getMusicBrainzArtistReleaseGroups(artistId: string) {
  const result = await musicBrainzFetch<{
    releases?: MusicBrainzReleaseSummary[];
  }>(
    `/release?artist=${encodeURIComponent(
      artistId
    )}&inc=release-groups&fmt=json&limit=100`
  );

  const releaseGroups = new Map<string, MusicBrainzReleaseGroup>();

  for (const release of result.releases || []) {
    const group = release["release-group"];

    if (!group) continue;

    const existing = releaseGroups.get(group.id);

    if (existing) {
      existing.releases?.push(release);
    } else {
      releaseGroups.set(group.id, {
        ...group,
        releases: [release],
      });
    }
  }

  return [...releaseGroups.values()].sort((a, b) =>
    (b["first-release-date"] || "").localeCompare(a["first-release-date"] || "")
  );
}

export async function getMusicBrainzRelease(releaseId: string) {
  return musicBrainzFetch<MusicBrainzRelease>(
    `/release/${encodeURIComponent(
      releaseId
    )}?inc=recordings+artist-credits+release-groups&fmt=json`
  );
}

export function getMusicBrainzArtistName(release: MusicBrainzRelease) {
  return (release["artist-credit"] || [])
    .map((credit) => `${credit.name}${credit.joinphrase || ""}`)
    .join("")
    .trim();
}

export function getMusicBrainzTracks(release: MusicBrainzRelease) {
  return (release.media || []).flatMap((medium) =>
    (medium.tracks || []).map((track) => ({
      ...track,
      discPosition: medium.position,
    }))
  );
}

export function getCoverArtUrl(releaseId: string) {
  return `https://coverartarchive.org/release/${releaseId}/front-500`;
}

export function choosePreferredRelease(releaseGroup: MusicBrainzReleaseGroup) {
  return [...(releaseGroup.releases || [])].sort((a, b) => {
    const officialDifference =
      Number(b.status === "Official") - Number(a.status === "Official");

    if (officialDifference !== 0) return officialDifference;

    return (a.date || "").localeCompare(b.date || "");
  })[0];
}
