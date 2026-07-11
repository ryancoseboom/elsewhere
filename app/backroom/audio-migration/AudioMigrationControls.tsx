"use client";

import { useMemo, useState } from "react";
import { normalizeDropboxAudioUrl } from "@/lib/audio-migration";

type AudioMigrationControlsProps = {
  currentUrl: string;
  inputId: string;
  defaultReplacementUrl?: string;
};

export function AudioMigrationControls({
  currentUrl,
  inputId,
  defaultReplacementUrl = "",
}: AudioMigrationControlsProps) {
  const [replacementUrl, setReplacementUrl] = useState(defaultReplacementUrl);
  const [testUrl, setTestUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const normalizedUrl = useMemo(
    () => normalizeDropboxAudioUrl(replacementUrl),
    [replacementUrl]
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor={inputId}>
          Dropbox audio URL
        </label>
        <input
          id={inputId}
          name="dropbox_url"
          value={replacementUrl}
          onChange={(event) => {
            setReplacementUrl(event.target.value);
            setTestUrl("");
          }}
          placeholder="Paste Dropbox share link..."
          className="min-h-11 border border-stone-800 bg-neutral-950 px-3 text-sm text-stone-200 outline-none transition placeholder:text-stone-700 focus:border-stone-500"
        />
        <button
          type="button"
          onClick={() => setTestUrl(normalizedUrl)}
          className="min-h-11 border border-stone-800 px-4 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
        >
          Test
        </button>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(currentUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
          className="min-h-11 border border-stone-800 px-4 text-[10px] uppercase tracking-[0.2em] text-stone-400 transition hover:border-stone-500 hover:text-stone-100"
        >
          {copied ? "Copied" : "Copy current"}
        </button>
      </div>

      {replacementUrl.trim() && normalizedUrl !== replacementUrl.trim() && (
        <p className="break-all text-xs leading-5 text-stone-500">
          Normalized for playback: {normalizedUrl}
        </p>
      )}

      {testUrl && (
        <audio
          controls
          preload="none"
          src={testUrl}
          className="h-10 w-full"
        />
      )}
    </div>
  );
}
