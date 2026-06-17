"use client";

import { useState } from "react";
import FloatLookControls from "@/components/FloatLookControls";
import {
  FLOAT_CONTROL_DEFAULTS,
  changedFloatControlQuery,
  writeFloatControlsToParams,
} from "@/lib/float-controls";

type FloatStudioArtifact = {
  slug: string;
  title: string;
};

type FloatFormat = "youtube" | "instagram";

const formats = {
  youtube: {
    command: "youtube",
    label: "YouTube",
    resolution: "1920 x 1080",
  },
  instagram: {
    command: "instagram",
    label: "Instagram",
    resolution: "1080 x 1920",
  },
} satisfies Record<FloatFormat, { command: string; label: string; resolution: string }>;

const projectPath = "/Users/ryancoseboom/elsewhere";

export default function FloatStudio({
  artifacts,
  defaultSlug,
}: {
  artifacts: FloatStudioArtifact[];
  defaultSlug: string;
}) {
  const [slug, setSlug] = useState(defaultSlug);
  const [format, setFormat] = useState<FloatFormat>("youtube");
  const [duration, setDuration] = useState(15);
  const [outputPath, setOutputPath] = useState("");
  const [controls, setControls] = useState(FLOAT_CONTROL_DEFAULTS);
  const selectedArtifact =
    artifacts.find((artifact) => artifact.slug === slug) || artifacts[0];
  const controlQuery = changedFloatControlQuery(controls);
  const renderPath = selectedArtifact
    ? (() => {
        const params = writeFloatControlsToParams(
          new URLSearchParams({ format }),
          controls
        );

        return `/float-render/${selectedArtifact.slug}?${params.toString()}`;
      })()
    : "";
  const command = selectedArtifact
    ? [
        `cd ${projectPath} &&`,
        "npm run float:video --",
        `--slug ${selectedArtifact.slug}`,
        `--format ${formats[format].command}`,
        `--duration ${duration}`,
        controlQuery ? `--controls "${controlQuery}"` : "",
        outputPath.trim() ? `--output "${outputPath.trim()}"` : "",
      ].filter(Boolean).join(" ")
    : "";

  return (
    <main className="min-h-screen bg-[#0b0a08] px-5 py-6 text-stone-200 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border border-stone-800 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.42em] text-stone-600">
            Elsewhere / Float Studio
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-none text-stone-100">
            Float videos
          </h1>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Artifact
              </span>
              <select
                className="mt-2 w-full border border-stone-800 bg-[#11100e] px-3 py-3 text-sm text-stone-200 outline-none"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              >
                {artifacts.map((artifact) => (
                  <option key={artifact.slug} value={artifact.slug}>
                    {artifact.title}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Output
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(formats) as FloatFormat[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`border px-3 py-3 text-left transition ${
                      format === key
                        ? "border-stone-300 bg-stone-200 text-stone-950"
                        : "border-stone-800 bg-[#11100e] text-stone-400 hover:border-stone-600 hover:text-stone-100"
                    }`}
                    onClick={() => setFormat(key)}
                  >
                    <span className="block text-[10px] uppercase tracking-[0.22em]">
                      {formats[key].label}
                    </span>
                    <span className="mt-1 block text-xs opacity-70">
                      {formats[key].resolution}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Duration
              </span>
              <input
                className="mt-2 w-full accent-stone-200"
                max={60}
                min={5}
                step={1}
                type="range"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
              <span className="mt-1 block text-sm text-stone-400">
                {duration} seconds
              </span>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Save as
              </span>
              <input
                className="mt-2 w-full border border-stone-800 bg-[#11100e] px-3 py-3 text-sm text-stone-200 outline-none placeholder:text-stone-700"
                placeholder="Defaults to Downloads, .mp4 added automatically"
                type="text"
                value={outputPath}
                onChange={(event) => setOutputPath(event.target.value)}
              />
            </label>

            <section className="border-t border-stone-800 pt-5">
              <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Look
              </p>
              <FloatLookControls controls={controls} onChange={setControls} />
            </section>

            <div className="border border-stone-800 bg-[#11100e] p-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Export command
              </p>
              <code className="mt-3 block select-all whitespace-pre-wrap break-words text-xs leading-6 text-stone-300">
                {command}
              </code>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                className="border border-stone-700 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-300 transition hover:border-stone-300 hover:text-white"
                href={renderPath}
                rel="noreferrer"
                target="_blank"
              >
                Open render
              </a>
              <button
                type="button"
                className="border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
                onClick={() => navigator.clipboard?.writeText(command)}
              >
                Copy command
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div
            className={`mx-auto overflow-hidden border border-stone-800 bg-black shadow-2xl ${
              format === "youtube"
                ? "aspect-video w-full"
                : "aspect-[9/16] h-[min(78vh,56rem)] max-w-full"
            }`}
          >
            {renderPath ? (
              <iframe
                className="h-full w-full"
                src={renderPath}
                title="Float video preview"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-600">
                No artifacts available.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
