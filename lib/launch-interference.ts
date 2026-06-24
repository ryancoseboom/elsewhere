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
    tone: "album note / 2026",
  },
  {
    slugs: ["coco"],
    sourceTitle: "Coco launch note",
    sourceUrl: "/artifact/coco",
    text: "The record keeps returning to small objects because the large feeling is too bright to name.",
    tone: "studio note / 2026",
  },
  {
    slugs: ["wiser"],
    sourceTitle: "Wiser launch note",
    sourceUrl: "/artifact/wiser",
    text: "Wiser should feel like a message that arrived after the room had already been emptied.",
    tone: "album note / old room",
  },
  {
    slugs: ["oceanwide"],
    sourceTitle: "Oceanwide launch note",
    sourceUrl: "/artifact/oceanwide",
    text: "Oceanwide stands near water at night, but the water never fully appears.",
    tone: "song note / night water",
  },
  {
    slugs: ["milkdrunk"],
    sourceTitle: "Milkdrunk launch note",
    sourceUrl: "/artifact/milkdrunk",
    text: "Milkdrunk turns tenderness into a blurred photograph before it can be identified.",
    tone: "song note / soft focus",
  },
  {
    slugs: ["we-only-love-you"],
    sourceTitle: "We Only Love You launch note",
    sourceUrl: "/artifact/we-only-love-you",
    text: "The title sounds like devotion until the tape repeats it too many times.",
    tone: "song note / repeated tape",
  },
  {
    slugs: ["wholeness-and-separation"],
    sourceTitle: "Wholeness & Separation launch note",
    sourceUrl: "/artifact/wholeness-and-separation",
    text: "The page should keep separating the same image and recombining it with a different memory.",
    tone: "album note / image study",
  },
  {
    slugs: ["brutalism-for-lovers"],
    sourceTitle: "Brutalism for Lovers launch note",
    sourceUrl: "/artifact/brutalism-for-lovers",
    text: "Concrete, paper, breath, and voltage belong in the same weather system.",
    tone: "album note / concrete paper",
  },
  {
    slugs: ["stripmall-architecture"],
    sourceTitle: "Stripmall Architecture launch note",
    sourceUrl: "/artifact/stripmall-architecture",
    text: "Stripmall Architecture lives in fluorescent spaces that remember people after closing.",
    tone: "album note / after closing",
  },
  {
    slugs: ["closedown", "the-closedown"],
    sourceTitle: "The Closedown launch note",
    sourceUrl: "/artifact/closedown",
    text: "The Closedown should feel like a sign still glowing after power has been cut.",
    tone: "single note / sign light",
  },
  {
    threads: ["poster", "performance", "live", "paper"],
    sourceTitle: "Poster field note",
    sourceUrl: "/posters",
    text: "Live paper is not a souvenir here. It is a doorway with staple holes.",
    tone: "flyer note / staple holes",
  },
  {
    threads: ["dreamlike", "damaged", "memory", "signal"],
    sourceTitle: "Global interference note",
    sourceUrl: "/drift",
    text: "A photo came forward with no proof except its insistence.",
    tone: "photo note / no proof",
  },
  {
    sourceTitle: "Global interference note",
    sourceUrl: "/float",
    text: "The site is not explaining itself. It is remembering in public.",
    tone: "field note / public memory",
  },
  {
    sourceTitle: "Global interference note",
    sourceUrl: "/drift",
    text: "Do not ask whether this belongs here. Ask why it found the path.",
    tone: "field note / loose page",
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
