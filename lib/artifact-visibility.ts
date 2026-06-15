export const ARTIFACT_VISIBILITY = ["public", "hidden", "backroom"] as const;

export type ArtifactVisibility = (typeof ARTIFACT_VISIBILITY)[number];

export function artifactVisibility(value: FormDataEntryValue | string | null) {
  const visibility = String(value || "public");

  return ARTIFACT_VISIBILITY.includes(visibility as ArtifactVisibility)
    ? (visibility as ArtifactVisibility)
    : "public";
}

export function isOrdinaryPublicArtifact(visibility?: string | null) {
  return !visibility || visibility === "public";
}

export function isDriftDiscoverableArtifact(visibility?: string | null) {
  return visibility === "public" || visibility === "hidden";
}

