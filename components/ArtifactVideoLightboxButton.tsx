"use client";

import { useState } from "react";
import { getVideoEmbedUrl } from "@/lib/video";

type ArtifactVideoLightboxButtonProps = {
  className?: string;
  thumbnailUrl?: string | null;
  title: string;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
};

export default function ArtifactVideoLightboxButton({
  className = "",
  thumbnailUrl,
  title,
  videoUrl,
  youtubeUrl,
}: ArtifactVideoLightboxButtonProps) {
  const [open, setOpen] = useState(false);
  const canOpen = Boolean(videoUrl || youtubeUrl);

  return (
    <>
      <button
        type="button"
        aria-label={`Play ${title}`}
        className={className}
        disabled={!canOpen}
        onClick={() => setOpen(true)}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-75 transition group-hover:scale-[1.02] group-hover:opacity-95"
          />
        ) : videoUrl ? (
          <video
            muted
            playsInline
            preload="metadata"
            src={videoUrl}
            className="h-full w-full object-cover opacity-70 transition group-hover:scale-[1.02] group-hover:opacity-90"
          />
        ) : (
          <span className="absolute inset-0 bg-stone-950" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />
        <span className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.25em] text-white/80">
          Play
        </span>
      </button>

      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-5 backdrop-blur-sm md:p-12"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 border border-stone-700 bg-black/70 px-3 py-2 text-xs uppercase tracking-[0.25em] text-stone-300 transition hover:border-stone-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          <div
            className="aspect-video w-full max-w-5xl overflow-hidden border border-stone-800 bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            {youtubeUrl ? (
              <iframe
                src={getVideoEmbedUrl(youtubeUrl)}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                controls
                autoPlay
                src={videoUrl || ""}
                className="h-full w-full"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
