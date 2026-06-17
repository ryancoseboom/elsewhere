import type { SourceInterferenceContext } from "@/lib/source-artifacts";

export type LaunchInterferenceSnippet = {
  sourceTitle: string;
  sourceUrl: string;
  text: string;
  tone: string;
};

const launchFragments: Array<
  LaunchInterferenceSnippet & {
    slugs?: string[];
    threads?: string[];
  }
> = [
  {
    slugs: ["coco"],
    sourceTitle: "Coco launch note",
    sourceUrl: "/artifact/coco",
    text: "Coco feels like evidence recovered from a room that is still humming.",
    tone: "album fragment / launch note",
  },
  {
    slugs: ["coco"],
    sourceTitle: "Coco launch note",
    sourceUrl: "/artifact/coco",
    text: "The record keeps returning to small objects because the large feeling is too bright to name.",
    tone: "album fragment / launch note",
  },
  {
    slugs: ["wiser"],
    sourceTitle: "Wiser launch note",
    sourceUrl: "/artifact/wiser",
    text: "Wiser should feel like a message that arrived after the room had already been emptied.",
    tone: "album fragment / launch note",
  },
  {
    slugs: ["oceanwide"],
    sourceTitle: "Oceanwide launch note",
    sourceUrl: "/artifact/oceanwide",
    text: "Oceanwide stands near water at night, but the water never fully appears.",
    tone: "song fragment / launch note",
  },
  {
    slugs: ["milkdrunk"],
    sourceTitle: "Milkdrunk launch note",
    sourceUrl: "/artifact/milkdrunk",
    text: "Milkdrunk turns tenderness into a blurred signal before it can be identified.",
    tone: "song fragment / launch note",
  },
  {
    slugs: ["we-only-love-you"],
    sourceTitle: "We Only Love You launch note",
    sourceUrl: "/artifact/we-only-love-you",
    text: "The title sounds like devotion until the transmission repeats it too many times.",
    tone: "song fragment / launch note",
  },
  {
    slugs: ["wholeness-and-separation"],
    sourceTitle: "Wholeness & Separation launch note",
    sourceUrl: "/artifact/wholeness-and-separation",
    text: "The archive should keep separating the same image and recombining it with a different memory.",
    tone: "album fragment / launch note",
  },
  {
    slugs: ["brutalism-for-lovers"],
    sourceTitle: "Brutalism for Lovers launch note",
    sourceUrl: "/artifact/brutalism-for-lovers",
    text: "Concrete, paper, breath, and voltage belong in the same weather system.",
    tone: "album fragment / launch note",
  },
  {
    slugs: ["stripmall-architecture"],
    sourceTitle: "Stripmall Architecture launch note",
    sourceUrl: "/artifact/stripmall-architecture",
    text: "Stripmall Architecture lives in fluorescent spaces that remember people after closing.",
    tone: "album fragment / launch note",
  },
  {
    slugs: ["closedown", "the-closedown"],
    sourceTitle: "The Closedown launch note",
    sourceUrl: "/artifact/closedown",
    text: "The Closedown should feel like a sign still glowing after power has been cut.",
    tone: "single fragment / launch note",
  },
  {
    threads: ["poster", "performance", "live", "paper"],
    sourceTitle: "Poster field note",
    sourceUrl: "/posters",
    text: "Live paper is not a souvenir here. It is a doorway with staple holes.",
    tone: "poster fragment / launch note",
  },
  {
    threads: ["dreamlike", "damaged", "memory", "signal"],
    sourceTitle: "Global interference note",
    sourceUrl: "/drift",
    text: "A fragment came forward with no proof except its insistence.",
    tone: "global fragment / launch note",
  },
  {
    sourceTitle: "Global interference note",
    sourceUrl: "/float",
    text: "The archive is not explaining itself. It is remembering in public.",
    tone: "global fragment / launch note",
  },
  {
    sourceTitle: "Global interference note",
    sourceUrl: "/drift",
    text: "Do not ask whether this belongs here. Ask why it found the path.",
    tone: "global fragment / launch note",
  },
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function getLaunchInterferenceSnippets(
  context: SourceInterferenceContext,
  limit = 6
): LaunchInterferenceSnippet[] {
  const slug = context.artifactSlug ? normalize(context.artifactSlug) : "";
  const threads = new Set(
    [
      context.motif,
      context.room,
      ...(context.motifs || []),
      ...(context.atmosphere || []),
    ]
      .filter((thread): thread is string => Boolean(thread))
      .map(normalize)
  );

  const ranked = launchFragments
    .map((fragment, index) => {
      const slugMatch = fragment.slugs?.some((item) => normalize(item) === slug)
        ? 6
        : 0;
      const threadMatch =
        fragment.threads?.filter((thread) => threads.has(normalize(thread)))
          .length || 0;
      const globalScore = fragment.slugs || fragment.threads ? 0 : 1;

      return {
        fragment,
        rank: slugMatch + threadMatch * 3 + globalScore - index * 0.001,
      };
    })
    .sort((left, right) => right.rank - left.rank);

  return ranked
    .slice(0, limit)
    .map(({ fragment }) => ({
      sourceTitle: fragment.sourceTitle,
      sourceUrl: fragment.sourceUrl,
      text: fragment.text,
      tone: fragment.tone,
    }));
}
