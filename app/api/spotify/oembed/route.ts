import { NextResponse } from "next/server";
import { spotifyTrackUrl } from "@/lib/spotify";

export async function GET(request: Request) {
  const url = spotifyTrackUrl(new URL(request.url).searchParams.get("url") || "");

  if (!url) {
    return NextResponse.json({ error: "Use a Spotify track URL." }, { status: 400 });
  }

  const response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Spotify could not identify that track." },
      { status: response.status }
    );
  }

  const data = (await response.json()) as { title?: string };

  return NextResponse.json({ title: data.title || "", url });
}
