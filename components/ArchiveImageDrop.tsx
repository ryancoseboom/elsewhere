"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ArchiveImageDropProps = {
  artifactId: string;
  className?: string;
  index?: number;
};

export default function ArchiveImageDrop({
  artifactId,
  className = "",
  index = 0,
}: ArchiveImageDropProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const textures = [
    "/textures/photocopy-noise.png",
    "/textures/fingerprint-smudge.png",
    "/textures/dust-scratches.png",
  ];

  async function upload(file?: File) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    setDragging(false);
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.set("image", file);

    const response = await fetch(`/api/artifacts/${artifactId}/images`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!response.ok) {
      setError(
        response.status === 401
          ? "Visit the Backroom and reload this page first."
          : "The image could not be added."
      );
      return;
    }

    router.refresh();
  }

  return (
    <div
      className={`relative flex min-h-44 cursor-pointer items-end overflow-hidden border bg-stone-900 p-4 transition ${
        dragging ? "border-stone-300" : "border-stone-800"
      } ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.35), rgba(12,10,9,0.88)), url(${textures[index % textures.length]})`,
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
        accept="image/*"
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <span className="absolute right-3 top-2 font-serif text-4xl font-light text-stone-300">
        +
      </span>
      <p className="max-w-44 text-[10px] uppercase tracking-[0.2em] text-stone-500">
        {uploading
          ? "Adding image..."
          : dragging
            ? "Drop image here"
            : error || "Visual fragment / drop image or click to add"}
      </p>
    </div>
  );
}
