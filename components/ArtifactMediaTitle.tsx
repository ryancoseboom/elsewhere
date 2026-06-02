"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ArtifactMediaTitle({
  artifactId,
  editable,
  title,
}: {
  artifactId: string;
  editable: boolean;
  title: string;
}) {
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

    const response = await fetch(`/api/artifacts/${artifactId}/title`, {
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
    return <span>{title}</span>;
  }

  return (
    <input
      aria-label={`Rename ${title}`}
      className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 font-serif text-sm text-stone-300 outline-none transition hover:border-stone-800 focus:border-stone-600 focus:text-white disabled:opacity-50"
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
