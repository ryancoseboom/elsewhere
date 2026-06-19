"use client";

import { useState } from "react";
import FloatLookControls from "@/components/FloatLookControls";
import {
  FLOAT_CONTROL_DEFAULTS,
  writeFloatControlsToParams,
} from "@/lib/float-controls";

type FloatStudioArtifact = {
  slug: string;
  title: string;
};

type FloatFormat = "youtube" | "instagram";

type RenderResult = {
  filename: string;
  url: string;
};

const GLOBAL_FLOAT_SLUG = "__global";

const formats = {
  youtube: {
    label: "YouTube",
    resolution: "1920 x 1080",
  },
  instagram: {
    label: "Instagram",
    resolution: "1080 x 1920",
  },
} satisfies Record<FloatFormat, { label: string; resolution: string }>;

function cleanDownloadFilename(value: string) {
  const withoutExtension = value
    .replace(/\.mp4$/i, "")
    .trim()
    .replace(/[/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  return `${withoutExtension || "elsewhere-float-render"}.mp4`;
}

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
  const [controls, setControls] = useState(FLOAT_CONTROL_DEFAULTS);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("");
  const isGlobalFloat = slug === GLOBAL_FLOAT_SLUG;
  const selectedArtifact =
    isGlobalFloat
      ? { slug: GLOBAL_FLOAT_SLUG, title: "Global Elsewhere Float" }
      : artifacts.find((artifact) => artifact.slug === slug) || artifacts[0];
  const renderPath = selectedArtifact
    ? (() => {
        const params = writeFloatControlsToParams(
          new URLSearchParams({ format }),
          controls
        );

        return `/float-render/${selectedArtifact.slug}?${params.toString()}`;
      })()
    : "";

  async function renderVideo() {
    if (!selectedArtifact || isRendering) return;

    setIsRendering(true);
    setRenderError("");
    setRenderResult(null);
    setDownloadFilename("");

    try {
      const response = await fetch("/api/float-renders", {
        body: JSON.stringify({
          controls,
          duration,
          format,
          slug: selectedArtifact.slug,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "The render could not be completed.");
      }

      setRenderResult({
        filename: data.filename,
        url: data.url,
      });
      setDownloadFilename(data.filename || "");
    } catch (error) {
      setRenderError(
        error instanceof Error
          ? error.message
          : "The render could not be completed."
      );
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="min-h-screen overflow-auto bg-[#0b0a08] p-4 text-stone-200 md:p-5 lg:h-screen lg:overflow-hidden">
      <div className="grid gap-5 lg:h-full lg:grid-cols-[25rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border border-stone-800 bg-black/30 p-4">
          <div className="shrink-0">
            <p className="text-[10px] uppercase tracking-[0.42em] text-stone-600">
              Elsewhere / Float Studio
            </p>
            <h1 className="mt-3 font-serif text-3xl leading-none text-stone-100">
              Float videos
            </h1>
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Artifact
              </span>
              <select
                className="mt-2 w-full border border-stone-800 bg-[#11100e] px-3 py-3 text-sm text-stone-200 outline-none"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              >
                <option value={GLOBAL_FLOAT_SLUG}>
                  Global Elsewhere Float
                </option>
                <option disabled value="">
                  ────────────────
                </option>
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

            <section className="border-t border-stone-800 pt-5">
              <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-stone-500">
                Look
              </p>
              <FloatLookControls
                controls={controls}
                onChange={setControls}
                variant="tabs"
              />
            </section>

            <section className="mt-auto border-t border-stone-800 pt-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="border border-stone-300 bg-stone-200 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-950 transition hover:bg-white disabled:cursor-wait disabled:border-stone-700 disabled:bg-stone-900 disabled:text-stone-500"
                  disabled={!selectedArtifact || isRendering}
                  onClick={renderVideo}
                >
                  {isRendering ? "Rendering..." : "Render Video"}
                </button>
                <a
                  className="border border-stone-700 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-300 transition hover:border-stone-300 hover:text-white"
                  href={renderPath}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open render
                </a>
              </div>

              {isRendering && (
                <p className="mt-3 text-xs leading-6 text-stone-500">
                  Capturing and encoding the MP4. Longer durations can take a minute or two.
                </p>
              )}

              {renderError && (
                <div className="mt-3 border border-red-900/70 bg-red-950/20 p-3 text-xs leading-6 text-red-200">
                  {renderError}
                </div>
              )}

              {renderResult && (
                <div className="mt-3 border border-stone-700 bg-[#11100e] p-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                    Render complete
                  </p>
                  <p className="mt-2 break-words text-xs text-stone-400">
                    {renderResult.filename}
                  </p>
                  <label className="mt-4 block">
                    <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
                      Save as
                    </span>
                    <input
                      className="mt-2 w-full border border-stone-800 bg-black/30 px-3 py-3 text-sm text-stone-200 outline-none placeholder:text-stone-700"
                      type="text"
                      value={downloadFilename}
                      onChange={(event) => setDownloadFilename(event.target.value)}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      className="border border-stone-700 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-300 transition hover:border-stone-300 hover:text-white"
                      download={cleanDownloadFilename(downloadFilename)}
                      href={renderResult.url}
                    >
                      Download MP4
                    </a>
                    <a
                      className="border border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-stone-500 transition hover:border-stone-500 hover:text-stone-200"
                      href={renderResult.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open video
                    </a>
                  </div>
                </div>
              )}
            </section>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden">
          <div
            className={`overflow-hidden border border-stone-800 bg-black shadow-2xl ${
              format === "youtube"
                ? "aspect-video w-full max-h-full"
                : "aspect-[9/16] h-full max-w-full"
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
