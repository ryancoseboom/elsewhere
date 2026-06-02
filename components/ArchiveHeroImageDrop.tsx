"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArtifactImageButton } from "@/components/ArtifactImageExperience";
import { archiveTexture } from "@/lib/archive-textures";

type ArchiveHeroImageDropProps = {
  artifactId: string;
  alt: string;
  canEdit: boolean;
  imageUrl: string | null;
  label: string;
  imageClassName?: string;
};

export default function ArchiveHeroImageDrop({
  artifactId,
  alt,
  canEdit,
  imageUrl,
  label,
  imageClassName = "h-auto w-full object-contain",
}: ArchiveHeroImageDropProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const texture = archiveTexture(`${artifactId}:hero:${label}`);

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

    const response = await fetch(`/api/artifacts/${artifactId}/hero-image`, {
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

  if (!canEdit) {
    return imageUrl ? (
      <ArtifactImageButton
        src={imageUrl}
        alt={alt}
        alwaysColor
        className="block w-full"
        imageClassName={imageClassName}
        loading="eager"
      />
    ) : null;
  }

  return (
    <div
      className={`group relative flex min-h-56 cursor-pointer items-end overflow-hidden border bg-stone-900 transition ${
        dragging ? "border-stone-300" : "border-stone-800"
      } ${imageUrl ? "" : "aspect-square"}`}
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
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt} className={imageClassName} />
      ) : (
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(12,10,9,0.2), rgba(12,10,9,0.9)), url(${texture})`,
            backgroundSize: "cover",
          }}
        />
      )}
      <span className="absolute right-3 top-2 font-serif text-4xl font-light text-stone-200 opacity-80 transition group-hover:opacity-100">
        +
      </span>
      <p className="absolute bottom-3 left-3 max-w-52 bg-black/60 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-stone-400">
        {uploading
          ? "Adding image..."
          : dragging
            ? "Drop image here"
            : error || `${label} / drop image or click to add`}
      </p>
    </div>
  );
}
