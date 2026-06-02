export const ARCHIVE_TEXTURES = [
  "/textures/float/black-scratches.jpg",
  "/textures/float/blur-grunge.jpg",
  "/textures/float/dust-scratches.jpg",
  "/textures/float/fingerprint-smudge.jpg",
  "/textures/float/flare-noise.jpg",
  "/textures/float/folded-paper.jpg",
  "/textures/float/halftone-noise.jpg",
  "/textures/float/masking-tape.jpg",
  "/textures/float/photocopy-noise.jpg",
  "/textures/float/rip-noise.jpg",
  "/textures/float/scrape.jpg",
  "/textures/float/text-noise.jpg",
  "/textures/float/torn-paper-edge.jpg",
  "/textures/float/vhs-noise.jpg",
];

export function archiveTexture(seed: string) {
  const index = [...seed].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0
  );

  return ARCHIVE_TEXTURES[index % ARCHIVE_TEXTURES.length];
}
