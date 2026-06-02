import { spotifyEmbedUrl } from "@/lib/spotify";

export default function SpotifyTrackEmbed({
  title,
  url,
  className = "",
}: {
  title: string;
  url: string;
  className?: string;
}) {
  const embedUrl = spotifyEmbedUrl(url);

  if (!embedUrl) return null;

  return (
    <iframe
      src={embedUrl}
      title={`Listen to ${title} on Spotify`}
      className={`h-[152px] w-full ${className}`}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
