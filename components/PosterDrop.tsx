"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PosterDrop() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(files?: FileList | File[]) {
    const images = Array.from(files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (images.length === 0) {
      setMessage("Choose one or more poster image files.");
      return;
    }

    setDragging(false);
    setUploading(true);
    setMessage("");

    for (const image of images) {
      const formData = new FormData();
      formData.set("poster", image);

      const response = await fetch("/api/posters", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setUploading(false);
        setMessage(
          response.status === 401
            ? "Visit the Backroom and reload this page first."
            : result?.error || "One of the posters could not be added."
        );
        return;
      }
    }

    setUploading(false);
    setMessage(`${images.length} poster${images.length === 1 ? "" : "s"} added.`);
    router.refresh();
  }

  return (
    <div
      className={`group relative flex min-h-64 cursor-pointer items-end overflow-hidden border p-5 transition ${
        dragging
          ? "border-stone-200 bg-stone-900"
          : "border-dashed border-stone-700 bg-[#0f0d0a]"
      }`}
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
        void upload(event.dataTransfer.files);
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
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void upload(event.target.files || undefined)}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <span className="absolute right-5 top-3 font-serif text-6xl font-light text-stone-500 transition group-hover:text-stone-200">
        +
      </span>
      <div className="relative max-w-sm">
        <p className="text-[10px] uppercase tracking-[0.34em] text-stone-500">
          {uploading
            ? "Adding posters..."
            : dragging
              ? "Drop posters here"
              : "Drop live posters or click to add"}
        </p>
        {message && (
          <p className="mt-4 text-xs leading-6 text-stone-500">{message}</p>
        )}
      </div>
    </div>
  );
}
