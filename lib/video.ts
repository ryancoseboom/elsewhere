function parseVideoUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());

    if (!["http:", "https:"].includes(url.protocol)) return null;

    return url;
  } catch {
    return null;
  }
}

function isHost(url: URL, hostname: string) {
  return url.hostname === hostname || url.hostname.endsWith(`.${hostname}`);
}

export function getVideoProvider(
  value: string | null | undefined
): "youtube" | "vimeo" | null {
  const url = parseVideoUrl(value);

  if (!url) return null;
  if (url.hostname === "youtu.be" || isHost(url, "youtube.com")) return "youtube";
  if (isHost(url, "vimeo.com")) return "vimeo";

  return null;
}

function getYouTubeVideoId(url: URL) {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || "";
  }

  const pathParts = url.pathname.split("/").filter(Boolean);

  if (["embed", "shorts", "live"].includes(pathParts[0])) {
    return pathParts[1] || "";
  }

  return url.searchParams.get("v") || "";
}

function getVimeoVideoId(url: URL) {
  return (
    url.pathname
      .split("/")
      .filter(Boolean)
      .reverse()
      .find((part) => /^\d+$/.test(part)) || ""
  );
}

export function getVideoEmbedUrl(value: string | null | undefined) {
  const url = parseVideoUrl(value);

  if (!url) return "";

  const provider = getVideoProvider(value);
  const id =
    provider === "youtube"
      ? getYouTubeVideoId(url)
      : provider === "vimeo"
        ? getVimeoVideoId(url)
        : "";

  if (!id) return "";

  return provider === "youtube"
    ? `https://www.youtube.com/embed/${id}`
    : `https://player.vimeo.com/video/${id}`;
}

export function getYouTubeThumbnailUrl(value: string | null | undefined) {
  const embedUrl = getVideoEmbedUrl(value);

  if (!embedUrl.startsWith("https://www.youtube.com/embed/")) return "";

  const id = embedUrl.split("/embed/")[1]?.split("?")[0];

  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

export function isSupportedVideoLink(value: string | null | undefined) {
  return Boolean(getVideoEmbedUrl(value));
}

export function getVideoLinkLabel(value: string) {
  const provider = getVideoProvider(value);

  return provider === "youtube" ? "YouTube video" : "Vimeo video";
}
