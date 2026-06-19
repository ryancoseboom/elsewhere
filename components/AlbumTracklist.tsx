"use client";

import { useState } from "react";
import Link from "next/link";
import { ArtifactImageButton } from "@/components/ArtifactImageExperience";
import ArtifactMediaTitle from "@/components/ArtifactMediaTitle";
import ExclusiveAudio from "@/components/ExclusiveAudio";
import SpotifyTrackEmbed from "@/components/SpotifyTrackEmbed";
import { getVideoEmbedUrl } from "@/lib/video";

type TrackMedia = {
  id: string;
  title: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
};

export type AlbumTrackPreview = {
  id: string;
  slug: string;
  title: string;
  audioUrl?: string;
  lyrics?: string;
  spotifyUrl?: string;
  demos: TrackMedia[];
  images: TrackMedia[];
  videos: TrackMedia[];
  otherCategories: string[];
};

function indicatorText(track: AlbumTrackPreview) {
  const indicators = [];

  if (track.audioUrl) indicators.push("listen");
  if (track.spotifyUrl) indicators.push("spotify");
  if (track.videos.length > 0) indicators.push("videos");
  if (track.lyrics) indicators.push("lyrics");
  if (track.demos.length > 0) indicators.push("demos");
  if (track.images.length > 0) indicators.push("images");
  indicators.push(...track.otherCategories);

  return indicators;
}

function TrackThumbnail({
  item,
  label,
  onOpenVideo,
}: {
  item: TrackMedia;
  label: string;
  onOpenVideo?: (video: TrackMedia) => void;
}) {
  if (!item.imageUrl) {
    if (onOpenVideo) {
      return (
        <button
          type="button"
          aria-label={`Play ${item.title}`}
          className="flex aspect-video items-center justify-center border border-stone-800 bg-stone-950 px-2 text-center text-[9px] uppercase tracking-[0.18em] text-stone-600 transition hover:text-stone-300"
          onClick={() => onOpenVideo(item)}
        >
          ▶ {label}
        </button>
      );
    }

    return (
      <div className="flex aspect-video items-center justify-center border border-stone-800 bg-stone-950 px-2 text-center text-[9px] uppercase tracking-[0.18em] text-stone-600">
        {label}
      </div>
    );
  }

  if (onOpenVideo) {
    return (
      <button
        type="button"
        aria-label={`Play ${item.title}`}
        className="group relative block aspect-video overflow-hidden border border-stone-800 bg-stone-950"
        onClick={() => onOpenVideo(item)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-full w-full object-cover opacity-70 transition group-hover:opacity-100"
        />
        <span className="absolute inset-0 flex items-center justify-center text-xl text-white/80">
          ▶
        </span>
      </button>
    );
  }

  return (
    <ArtifactImageButton
      src={item.imageUrl}
      alt={item.title}
      className="block aspect-video overflow-hidden border border-stone-800 bg-stone-950"
      imageClassName="h-full w-full object-cover opacity-80 hover:opacity-100"
    />
  );
}

export default function AlbumTracklist({
  tracks,
  currentArtifactId,
  canEdit = false,
}: {
  tracks: AlbumTrackPreview[];
  currentArtifactId: string;
  canEdit?: boolean;
}) {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [expandedImageTrackIds, setExpandedImageTrackIds] = useState<
    Set<string>
  >(new Set());
  const [openVideo, setOpenVideo] = useState<TrackMedia | null>(null);

  function toggleMoreImages(trackId: string) {
    setExpandedImageTrackIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(trackId)) {
        nextIds.delete(trackId);
      } else {
        nextIds.add(trackId);
      }

      return nextIds;
    });
  }

  return (
    <section className="mt-7 border-t border-stone-800 pt-5">
      <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-stone-600">
        Tracks
      </p>
      <ol className="space-y-3">
        {tracks.map((track, index) => {
          const indicators = indicatorText(track);
          const hasChildren = indicators.length > 0;
          const expanded = expandedTrackId === track.id;

          return (
            <li
              key={track.id}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 text-sm"
            >
              <span className="pt-0.5 text-stone-700">{index + 1}.</span>
              <div>
                <div className="flex items-start gap-2">
                  {hasChildren && (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${track.title}`}
                      className="mt-1 text-[10px] text-stone-600 transition hover:text-stone-300"
                      onClick={() =>
                        setExpandedTrackId(expanded ? null : track.id)
                      }
                    >
                      {expanded ? "▼" : "▶"}
                    </button>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/artifact/${track.slug}`}
                      className={`font-serif transition hover:text-white ${
                        track.id === currentArtifactId
                          ? "text-stone-100"
                          : "text-stone-400"
                      }`}
                    >
                      {track.title}
                    </Link>
                    {indicators.length > 0 && (
                      <p className="mt-1 text-[10px] leading-4 text-stone-600">
                        {indicators.join(" / ")}
                      </p>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 border-l border-stone-800 pl-3">
                    {track.audioUrl && (
                      <div className="pb-4">
                        <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-stone-600">
                          Listen
                        </p>
                        <ExclusiveAudio
                          controls
                          src={track.audioUrl}
                          className="h-8 w-full opacity-80"
                        />
                      </div>
                    )}

                    {track.spotifyUrl && (
                      <div className="border-t border-stone-800 py-4">
                        <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-stone-600">
                          Spotify
                        </p>
                        <SpotifyTrackEmbed title={track.title} url={track.spotifyUrl} />
                      </div>
                    )}

                    {track.videos.length > 0 && (
                      <div className="border-t border-stone-800 py-4">
                        <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-stone-600">
                          Videos
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {track.videos.map((video) => (
                            <div key={video.id} className="min-w-0">
                              <TrackThumbnail
                                item={video}
                                label="Video"
                                onOpenVideo={setOpenVideo}
                              />
                              <ArtifactMediaTitle
                                artifactId={video.id}
                                className="mt-1 block w-full break-words font-sans text-[9px] leading-3 text-stone-500"
                                editable={canEdit}
                                title={video.title}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {track.lyrics && (
                      <div className="border-t border-stone-800 py-4">
                        <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-stone-600">
                          Lyrics
                        </p>
                        <div className="max-h-72 overflow-y-auto whitespace-pre-line pr-2 font-serif text-sm leading-6 text-stone-500">
                          {track.lyrics}
                        </div>
                      </div>
                    )}

                    {track.demos.length > 0 && (
                      <div className="space-y-3 border-t border-stone-800 py-4">
                        <p className="text-[9px] uppercase tracking-[0.18em] text-stone-600">
                          Demo versions
                        </p>
                        {track.demos.map((demo) => (
                          <div key={demo.id}>
                            <ArtifactMediaTitle
                              artifactId={demo.id}
                              editable={canEdit}
                              title={demo.title}
                            />
                            {demo.audioUrl && (
                              <ExclusiveAudio
                                controls
                                src={demo.audioUrl}
                                className="h-8 w-full opacity-80"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {track.images.length > 0 && (
                      <div className="border-t border-stone-800 py-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[9px] uppercase tracking-[0.18em] text-stone-600">
                            Images
                          </p>
                          {track.images.length > 3 && (
                            <button
                              type="button"
                              className="text-[9px] uppercase tracking-[0.14em] text-stone-600 transition hover:text-stone-300"
                              onClick={() => toggleMoreImages(track.id)}
                            >
                              {expandedImageTrackIds.has(track.id)
                                ? "Show fewer"
                                : `Click for more +${track.images.length - 3}`}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(expandedImageTrackIds.has(track.id)
                            ? track.images
                            : track.images.slice(0, 3)
                          ).map((image) => (
                            <TrackThumbnail
                              key={image.id}
                              item={image}
                              label="Image"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {openVideo && (
        <div
          role="presentation"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-5 backdrop-blur-sm md:p-12"
          onClick={() => setOpenVideo(null)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 border border-stone-700 bg-black/70 px-3 py-2 text-xs uppercase tracking-[0.25em] text-stone-300 transition hover:border-stone-400 hover:text-white"
            onClick={() => setOpenVideo(null)}
          >
            Close
          </button>
          <div
            className="aspect-video w-full max-w-5xl overflow-hidden border border-stone-800 bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            {openVideo.youtubeUrl ? (
              <iframe
                src={getVideoEmbedUrl(openVideo.youtubeUrl)}
                title={openVideo.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                controls
                autoPlay
                src={openVideo.videoUrl}
                className="h-full w-full"
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
