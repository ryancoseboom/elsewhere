const spotifyResourceTypes = ["album", "artist", "playlist", "track"] as const;

export function spotifyUrl(value: string) {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname !== "open.spotify.com") return "";

    const segments = parsed.pathname.split("/").filter(Boolean);
    const resourceIndex = segments.findIndex((segment) =>
      spotifyResourceTypes.includes(
        segment as (typeof spotifyResourceTypes)[number]
      )
    );
    const resourceType = resourceIndex >= 0 ? segments[resourceIndex] : "";
    const resourceId = resourceIndex >= 0 ? segments[resourceIndex + 1] : "";

    return resourceType && resourceId
      ? `https://open.spotify.com/${resourceType}/${resourceId}`
      : "";
  } catch {
    return "";
  }
}

export function spotifyEmbedUrl(value: string) {
  const url = spotifyUrl(value);
  const path = url.replace("https://open.spotify.com/", "");

  return path ? `https://open.spotify.com/embed/${path}` : "";
}

export function spotifyTrackUrl(value: string) {
  const url = spotifyUrl(value);
  const trackId = url.split("/track/")[1];

  return trackId ? `https://open.spotify.com/track/${trackId}` : "";
}

export function spotifyTrackEmbedUrl(value: string) {
  return spotifyEmbedUrl(spotifyTrackUrl(value));
}
