"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveTexture } from "@/lib/archive-textures";

export default function ArchiveAudioDrop({ artifactId }: { artifactId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const texture = archiveTexture(`${artifactId}:audio`);

  async function upload(file?: File) {
    if (!file || !file.type.startsWith("audio/")) {
      setError("Choose an audio file.");
      return;
    }

    setDragging(false);
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.set("audio", file);

    const response = await fetch(`/api/artifacts/${artifactId}/audios`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!response.ok) {
      setError(
        response.status === 401
          ? "Visit the Backroom and reload this page first."
          : "The audio could not be added."
      );
      return;
    }

    router.refresh();
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
        accept="audio/*"
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <span className="absolute right-3 top-2 font-serif text-4xl font-light text-stone-300">
        +
      </span>
      <p className="max-w-44 text-[10px] uppercase tracking-[0.2em] text-stone-500">
        {uploading
          ? "Adding audio..."
          : dragging
            ? "Drop audio here"
            : error || "Recording / drop audio or click to add"}
      </p>
    </div>
  );
}
