export const RESEARCH_CANDIDATE_STATUSES = [
  "needs_review",
  "approved_created",
  "approved_updated",
  "rejected",
  "needs_research",
] as const;

export type ResearchCandidateStatus =
  (typeof RESEARCH_CANDIDATE_STATUSES)[number];

export type ParsedResearchCandidate = {
  title: string;
  source_url: string;
  estimated_date: string;
  research_type: string;
  suggested_artifact_type: string;
  suggested_title: string;
  suggested_description: string;
  suggested_motifs: string[];
  suggested_rooms: string[];
  related_artifacts: string[];
  confidence: number | null;
  why_it_matters: string;
  suggested_parent_slug: string;
  suggested_existing_slug: string;
  status: ResearchCandidateStatus;
  private_notes: string;
};

export const RESEARCH_TYPE_TO_ARTIFACT_TYPE: Record<string, string> = {
  album: "Album",
  artwork: "Artwork",
  character: "Character",
  demo: "Demo",
  flyer: "Design",
  interview: "Document",
  journal: "Text",
  lyric: "Text",
  miscellaneous: "Other",
  object: "Object",
  performance: "Document",
  photograph: "Photo",
  place: "Place",
  poster: "Artwork",
  press: "Document",
  recording_session: "Other",
  review: "Document",
  song: "Song",
  video: "Video",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function field(block: string, label: string) {
  const match = block.match(new RegExp(`^${label}:\\s*(.*)$`, "im"));
  return match?.[1]?.trim() || "";
}

function confidenceValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function inferTargetSlugs(candidate: {
  title: string;
  suggestedTitle: string;
  sourceUrl: string;
  relatedArtifacts: string[];
  researchType: string;
  confidence: number | null;
}) {
  const haystack = [
    candidate.title,
    candidate.suggestedTitle,
    candidate.sourceUrl,
    ...candidate.relatedArtifacts,
  ]
    .join(" ")
    .toLowerCase();
  const titleSlug = slugify(candidate.suggestedTitle || candidate.title);
  let suggestedParentSlug = "";
  let suggestedExistingSlug = "";

  if (candidate.researchType === "album" || candidate.researchType === "song") {
    suggestedExistingSlug = titleSlug;
  }

  if (haystack.includes("coco")) {
    suggestedParentSlug = "coco";
    if (candidate.researchType === "album") suggestedExistingSlug = "coco";
  } else if (haystack.includes("butcher")) {
    suggestedParentSlug = "the-butchers-bill";
    if (candidate.researchType === "album") {
      suggestedExistingSlug = "the-butchers-bill";
    }
  } else if (
    haystack.includes("feathersongs") ||
    haystack.includes("stripmall architecture") ||
    haystack.includes("object03") ||
    haystack.includes("we were flying kites")
  ) {
    suggestedParentSlug = haystack.includes("feathersongs")
      ? "feathersongs-for-factory-girls"
      : "stripmall-architecture";
    if (candidate.researchType === "album") suggestedExistingSlug = titleSlug;
  } else if (
    haystack.includes("wiser") ||
    haystack.includes("wholeness") ||
    haystack.includes("halou")
  ) {
    suggestedParentSlug = haystack.includes("wiser")
      ? "wiser"
      : haystack.includes("wholeness")
        ? "wholeness-separation"
        : "halou";
    if (candidate.researchType === "album") suggestedExistingSlug = titleSlug;
  }

  return {
    suggestedParentSlug,
    suggestedExistingSlug,
    status:
      candidate.confidence !== null && candidate.confidence <= 6
        ? "needs_research"
        : "needs_review",
  } satisfies {
    suggestedParentSlug: string;
    suggestedExistingSlug: string;
    status: ResearchCandidateStatus;
  };
}

export function parseResearchCandidateMarkdown(markdown: string) {
  const blocks = markdown
    .split(/\n(?=### \d+\. )/g)
    .filter((block) => /^### \d+\. /m.test(block));

  return blocks.map((block) => {
    const heading = block.match(/^### \d+\. (.*)$/m)?.[1]?.trim() || "";
    const title = field(block, "Title") || heading;
    const sourceUrl = field(block, "Source URL");
    const researchType = field(block, "Artifact Type").toLowerCase();
    const suggestedTitle = field(block, "Suggested Elsewhere Title") || title;
    const relatedArtifacts = splitList(field(block, "Related Artifacts"));
    const confidence = confidenceValue(field(block, "Confidence \\(1-10\\)"));
    const targets = inferTargetSlugs({
      title,
      suggestedTitle,
      sourceUrl,
      relatedArtifacts,
      researchType,
      confidence,
    });

    return {
      title,
      source_url: sourceUrl,
      estimated_date: field(block, "Estimated Date"),
      research_type: researchType,
      suggested_artifact_type:
        RESEARCH_TYPE_TO_ARTIFACT_TYPE[researchType] || "Other",
      suggested_title: suggestedTitle,
      suggested_description: field(block, "Suggested Description"),
      suggested_motifs: splitList(field(block, "Suggested Motifs")),
      suggested_rooms: splitList(field(block, "Suggested Rooms")),
      related_artifacts: relatedArtifacts,
      confidence,
      why_it_matters: field(block, "Why It Matters"),
      suggested_parent_slug: targets.suggestedParentSlug,
      suggested_existing_slug: targets.suggestedExistingSlug,
      status: targets.status,
      private_notes: block.trim(),
    } satisfies ParsedResearchCandidate;
  });
}

export function mergeUnique(current: string[], incoming: string[]) {
  const seen = new Set<string>();

  return [...current, ...incoming].filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function splitFormList(value: FormDataEntryValue | null) {
  return splitList(String(value || ""));
}

export function artifactSlug(value: string) {
  return slugify(value);
}
