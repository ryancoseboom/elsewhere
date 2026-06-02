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

  const save = useCallback(
    async (nextValue: string) => {
      const normalizedValue = nextValue.trim();

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
    [artifactId, savedValue]
  );

  useEffect(() => {
    if (value.trim() === savedValue) return;

    const timer = window.setTimeout(() => void save(value), 650);
    return () => window.clearTimeout(timer);
  }, [save, savedValue, value]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    []
  );

  return (
    <div className="min-w-0 flex-1">
      <input
        aria-label={`Edit label for ${savedValue}`}
        className="w-full border-b border-stone-800 bg-transparent px-1 py-2 font-serif text-base text-stone-200 outline-none transition hover:border-stone-600 focus:border-stone-300"
        onBlur={() => void save(value)}
        onChange={(event) => {
          setValue(event.target.value);
          setErrorMessage("");
          setStatus("idle");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();

          if (event.key === "Escape") {
            setValue(savedValue);
            setErrorMessage("");
            setStatus("idle");
            event.currentTarget.blur();
          }
        }}
        value={value}
      />
      <p
        aria-live="polite"
        className={`mt-2 text-[9px] uppercase tracking-[0.2em] ${
          status === "error" ? "text-red-500" : "text-stone-700"
        }`}
      >
        {status === "saving" && "Saving"}
        {status === "saved" && "Saved"}
        {status === "error" && errorMessage}
        {status === "idle" && "Saves automatically"}
      </p>
    </div>
  );
}
