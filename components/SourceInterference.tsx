import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  getSourceInterferenceSnippets,
  SOURCE_INTERFERENCE_ENABLED,
  type SourceInterferenceContext,
} from "@/lib/source-artifacts";

function seededUnit(seed: string) {
  const total = Array.from(seed).reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 11),
    97
  );

  return Math.abs(Math.sin(total * 12.9898) * 43758.5453) % 1;
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
  const snippets = await getSourceInterferenceSnippets({
    context,
    limit,
    supabase,
  });

  if (snippets.length === 0) return null;

  const layoutVariant = Math.floor(
    seededUnit(snippets.map((snippet) => snippet.sourceUrl).join("|")) * 4
  );

  return (
    <aside
      aria-label="Source interference"
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
