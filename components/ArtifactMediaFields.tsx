"use client";

import { useState } from "react";

type ArtifactMediaFieldsProps = {
  artifactTypes: string[];
  defaultArtifactType?: string;
  existingAudioUrl?: string | null;
  existingVideoUrl?: string | null;
  mode?: "create" | "replace";
};

const fileInputClass =
  "block w-full text-sm text-stone-400 file:mr-5 file:border file:border-stone-700 file:bg-transparent file:px-5 file:py-3 file:text-xs file:uppercase file:tracking-[0.2em] file:text-stone-300 hover:file:border-stone-400";

export default function ArtifactMediaFields({
  artifactTypes,
  defaultArtifactType = "Song",
  existingAudioUrl,
  existingVideoUrl,
  mode = "create",
}: ArtifactMediaFieldsProps) {
  const [artifactType, setArtifactType] = useState(defaultArtifactType);
  const isAlbum = artifactType === "Album";
  const action = mode === "replace" ? "Replace" : "";

  return (
    <>
      <div>
        <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
          What is it?
        </label>
        <select
          name="artifact_type"
          value={artifactType}
          onChange={(event) => setArtifactType(event.target.value)}
          className="w-full border border-stone-800 bg-neutral-950 px-4 py-3 text-stone-200 outline-none focus:border-stone-400"
        >
          {artifactTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </div>

      {!isAlbum && (
        <>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
              {action} Audio File
            </label>
            {existingAudioUrl && (
              <audio
                controls
                src={existingAudioUrl}
                className="mb-4 w-full opacity-80"
              />
            )}
            <input
              name="audio_file"
              type="file"
              accept="audio/*"
              className={fileInputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-stone-500">
              {action} Video File
            </label>
            {existingVideoUrl && (
              <video
                controls
                src={existingVideoUrl}
                className="mb-4 w-full border border-stone-800 opacity-90"
              />
            )}
            <input
              name="video_file"
              type="file"
              accept="video/*"
              className={fileInputClass}
            />
          </div>
        </>
      )}
    </>
  );
}
