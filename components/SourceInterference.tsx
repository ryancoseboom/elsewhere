import type { CSSProperties } from "react";
import { getLaunchInterferenceSnippets } from "@/lib/launch-interference";
import { createClient } from "@/lib/supabase/server";
import {
  getSourceInterferenceSnippets,
  SOURCE_INTERFERENCE_ENABLED,
  type SourceInterferenceContext,
  type SourceInterferenceSnippet,
} from "@/lib/source-artifacts";

function seededUnit(seed: string) {
  const total = Array.from(seed).reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 11),
    97
  );

  return Math.abs(Math.sin(total * 12.9898) * 43758.5453) % 1;
}

function fallbackSnippets(
  context: SourceInterferenceContext,
  limit: number
): SourceInterferenceSnippet[] {
  const fragments = [
    context.artifactSlug && `file card / ${context.artifactSlug}`,
    context.room && `room note / ${context.room.replaceAll("-", " ")}`,
    context.motif && `motif recurrence / ${context.motif}`,
    ...(context.motifs || []).map((motif) => `motif recurrence / ${motif}`),
    ...(context.atmosphere || []).map((mood) => `mood tag / ${mood}`),
  ].filter((fragment): fragment is string => Boolean(fragment));

  return fragments.slice(0, limit).map((fragment, index) => ({
    sourceTitle: "Elsewhere note",
    sourceUrl: `/drift/${context.artifactSlug || "coco"}?note=${index}`,
    text: fragment,
    tone: "file note / undated",
  }));
}

export default async function SourceInterference({
  className = "",
  context,
  limit = 2,
}: {
  className?: string;
  context: SourceInterferenceContext;
  limit?: number;
}) {
  if (!SOURCE_INTERFERENCE_ENABLED) return null;

  const supabase = await createClient();
  const sourceSnippets = await getSourceInterferenceSnippets({
    context,
    limit: Math.max(limit, 6),
    supabase,
  });
  const launchSnippets = getLaunchInterferenceSnippets(
    context,
    Math.max(1, Math.ceil(limit / 2))
  );
  const snippets = [
    ...launchSnippets,
    ...sourceSnippets,
    ...fallbackSnippets(context, limit),
  ].slice(0, limit);

  if (snippets.length === 0) return null;

  const layoutVariant = Math.floor(
    seededUnit(snippets.map((snippet) => snippet.sourceUrl).join("|")) * 4
  );

  return (
    <aside
      aria-label="Found notes"
      className={`elsewhere-source-interference elsewhere-source-interference--${layoutVariant} ${className}`}
    >
      {snippets.map((snippet, index) => {
        const seed = `${snippet.sourceUrl}-${snippet.text}-${index}`;
        const size = 0.56 + seededUnit(`${seed}-size`) * 0.24;
        const offset = -1.8 + seededUnit(`${seed}-offset`) * 3.6;
        const opacity = 0.34 + seededUnit(`${seed}-opacity`) * 0.34;
        const delay = seededUnit(`${seed}-delay`) * 9;

        return (
          <a
            key={`${snippet.sourceUrl}-${index}`}
            href={snippet.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="elsewhere-source-interference__fragment"
            style={
              {
                "--source-interference-delay": delay.toFixed(2),
                "--source-interference-offset": `${offset.toFixed(2)}rem`,
                "--source-interference-opacity": opacity.toFixed(2),
                "--source-interference-size": `${size.toFixed(2)}rem`,
              } as CSSProperties
            }
          >
            <span>{snippet.tone}</span>
            <em>{snippet.text}</em>
          </a>
        );
      })}
    </aside>
  );
}
