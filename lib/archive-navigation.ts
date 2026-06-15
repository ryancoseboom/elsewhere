export type ArchiveArtifact = {
  album_id: string | null;
  atmosphere: string[] | null;
  audio_url?: string | null;
  discovery_visibility?: string | null;
  band_id: string | null;
  description: string | null;
  drift_weight?: number | null;
  fragment: string | null;
  id: string;
  image_url: string | null;
  kind: string | null;
  lyrics?: string | null;
  motifs: string[] | null;
  parent_id: string | null;
  parent_slug: string | null;
  slug: string;
  song_id: string | null;
  spotify_url?: string | null;
  title: string;
  video_url?: string | null;
  year: string | null;
  youtube_url?: string | null;
};

export function artifactType(artifact: ArchiveArtifact) {
  return artifact.kind || "";
}

export function normalizedThreads(artifact: ArchiveArtifact) {
  return [...(artifact.atmosphere || []), ...(artifact.motifs || [])].map(
    (thread) => thread.toLowerCase().trim()
  );
}

export function sharedThreads(
  current: ArchiveArtifact,
  candidate: ArchiveArtifact
) {
  const candidateThreads = new Set(normalizedThreads(candidate));

  return [...(current.atmosphere || []), ...(current.motifs || [])].filter(
    (thread) => candidateThreads.has(thread.toLowerCase().trim())
  );
}

export function relatedScore(
  current: ArchiveArtifact,
  candidate: ArchiveArtifact
) {
  if (current.id === candidate.id) return -1;

  let score = sharedThreads(current, candidate).length * 4;

  if (
    current.parent_id === candidate.id ||
    candidate.parent_id === current.id ||
    current.album_id === candidate.id ||
    candidate.album_id === current.id ||
    current.song_id === candidate.id ||
    candidate.song_id === current.id
  ) {
    score += 12;
  }

  if (current.band_id && current.band_id === candidate.band_id) score += 3;
  if (artifactType(current) === artifactType(candidate)) score += 1;

  return score;
}

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}
