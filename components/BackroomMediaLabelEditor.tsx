"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function BackroomMediaLabelEditor({
  artifactId,
  title,
}: {
  artifactId: string;
  title: string;
}) {
  const [value, setValue] = useState(title);
  const [savedValue, setSavedValue] = useState(title);
  const [errorMessage, setErrorMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const requestRef = useRef<AbortController | null>(null);
  const hasChanges = value.trim() !== savedValue;

  const save = useCallback(
    async () => {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        setErrorMessage("Add a label and try again.");
        setStatus("error");
        return;
      }

      if (normalizedValue === savedValue) return;

      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setStatus("saving");
      setErrorMessage("");

      try {
        const response = await fetch(`/api/artifacts/${artifactId}/title`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: normalizedValue }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(result?.error || "The label could not be saved.");
        }

        setValue(normalizedValue);
        setSavedValue(normalizedValue);
        setStatus("saved");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setErrorMessage((error as Error).message);
        setStatus("error");
      }
    },
    [artifactId, savedValue, value]
  );

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    []
  );

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          aria-label={`Edit label for ${savedValue}`}
          className="min-w-0 flex-1 border-b border-stone-800 bg-transparent px-1 py-2 font-serif text-base text-stone-200 outline-none transition hover:border-stone-600 focus:border-stone-300"
          onChange={(event) => {
            setValue(event.target.value);
            setErrorMessage("");
            setStatus("idle");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();

            if (event.key === "Escape") {
              setValue(savedValue);
              setErrorMessage("");
              setStatus("idle");
              event.currentTarget.blur();
            }
          }}
          value={value}
        />
        <button
          type="button"
          disabled={!hasChanges || status === "saving"}
          onClick={() => void save()}
          className="border border-stone-700 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-stone-400 transition hover:border-stone-400 hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {status === "saving" ? "Saving" : "Save"}
        </button>
      </div>
      <p
        aria-live="polite"
        className={`mt-2 text-[9px] uppercase tracking-[0.2em] ${
          status === "error" ? "text-red-500" : "text-stone-700"
        }`}
      >
        {status === "saving" && "Saving"}
        {status === "saved" && "Saved"}
        {status === "error" && errorMessage}
        {status === "idle" && (hasChanges ? "Unsaved changes" : "Ready")}
      </p>
    </div>
  );
}
