"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveTexture } from "@/lib/archive-textures";

export default function ArchiveVideoDrop({ artifactId }: { artifactId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const texture = archiveTexture(`${artifactId}:video`);

  async function addVideo(formData: FormData) {
    setDragging(false);
    setUploading(true);
    setError("");

    const response = await fetch(`/api/artifacts/${artifactId}/videos`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);

      setError(
        response.status === 401
          ? "Visit the Backroom and reload this page first."
          : result?.error || "The video could not be added."
      );
      return;
    }

    setVideoUrl("");
    router.refresh();
  }

  async function upload(file?: File) {
    if (!file || !file.type.startsWith("video/")) {
      setError("Choose a video file.");
      return;
    }

    const formData = new FormData();
    formData.set("video", file);
    await addVideo(formData);
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const formData = new FormData();
    formData.set("video_url", videoUrl);
    await addVideo(formData);
  }

  return (
    <div
      className={`relative flex min-h-36 cursor-pointer items-end overflow-hidden border bg-stone-900 p-4 transition ${
        dragging ? "border-stone-300" : "border-stone-800"
      }`}
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.42), rgba(12,10,9,0.9)), url(${texture})`,
        backgroundSize: "cover",
      }}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        void upload(event.dataTransfer.files[0]);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <span className="absolute right-3 top-2 font-serif text-4xl font-light text-stone-300">
        +
      </span>
      <div className="w-full">
        <p className="max-w-56 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          {uploading
            ? "Adding video..."
            : dragging
              ? "Drop video here"
              : "Moving image / drop video or click to add"}
        </p>
        <form
          className="mt-3 flex gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onSubmit={(event) => void addLink(event)}
        >
          <input
            type="url"
            value={videoUrl}
            disabled={uploading}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="YouTube or Vimeo link"
            aria-label="YouTube or Vimeo link"
            className="min-w-0 flex-1 border border-stone-700 bg-black/40 px-2 py-1.5 text-[10px] text-stone-300 outline-none placeholder:text-stone-600 focus:border-stone-400"
          />
          <button
            type="submit"
            disabled={uploading}
            className="border border-stone-700 px-2 py-1.5 text-[9px] uppercase tracking-[0.16em] text-stone-400 transition hover:border-stone-400 hover:text-stone-200 disabled:opacity-50"
          >
            Add link
          </button>
        </form>
        {error && (
          <p className="mt-2 text-[10px] leading-4 text-rose-300">{error}</p>
        )}
      </div>
    </div>
  );
}
