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

function textureIndex(seed: string) {
  return [...seed].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0
  );
}

export function archiveTexture(seed: string) {
  const index = textureIndex(seed);

  return ARCHIVE_TEXTURES[index % ARCHIVE_TEXTURES.length];
}

export function archiveTextureSet(seed: string, count = 3) {
  const baseIndex = textureIndex(seed);
  const textureCount = Math.min(count, ARCHIVE_TEXTURES.length);
  const textures: string[] = [];

  for (let offset = 0; textures.length < textureCount; offset += 1) {
    const texture = ARCHIVE_TEXTURES[(baseIndex + offset * 5) % ARCHIVE_TEXTURES.length];
    if (!textures.includes(texture)) textures.push(texture);
  }

  return textures;
}
