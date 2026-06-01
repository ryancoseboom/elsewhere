"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ArtifactImageCaptionProps = {
  artifactId: string;
  title: string;
  editable: boolean;
};

export default function ArtifactImageCaption({
  artifactId,
  title,
  editable,
}: ArtifactImageCaptionProps) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [savedValue, setSavedValue] = useState(title);
  const [saving, setSaving] = useState(false);

  async function save() {
    const nextValue = value.trim();

    if (!nextValue || nextValue === savedValue) {
      setValue(savedValue);
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/artifacts/${artifactId}/image`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextValue }),
    });

    setSaving(false);

    if (!response.ok) {
      setValue(savedValue);
      return;
    }

    setSavedValue(nextValue);
    router.refresh();
  }

  if (!editable) {
    return <p className="mt-2 px-1 text-xs leading-5 text-stone-500">{title}</p>;
  }

  return (
    <input
      aria-label={`Rename ${title}`}
      className="mt-2 w-full border-b border-transparent bg-transparent px-1 py-1 text-xs text-stone-500 outline-none transition hover:border-stone-800 focus:border-stone-600 focus:text-stone-300 disabled:opacity-50"
      disabled={saving}
      onBlur={() => void save()}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }

        if (event.key === "Escape") {
          setValue(savedValue);
          event.currentTarget.blur();
        }
      }}
      value={value}
    />
  );
}
