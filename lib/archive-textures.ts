export const ARCHIVE_TEXTURES = [
  "/textures/float/327f441e6660d823d1c4a1c02d13f421.jpg",
  "/textures/float/5cb2fad072a5e73efa48051829a91f99-1.jpg",
  "/textures/float/5cb2fad072a5e73efa48051829a91f99.jpg",
  "/textures/float/8fd4016d739440f3c1b6548123584ddd-1.jpg",
  "/textures/float/8fd4016d739440f3c1b6548123584ddd.jpg",
  "/textures/float/Texturelabs_Atmosphere_129S.jpg",
  "/textures/float/Texturelabs_Concrete_129S.jpg",
  "/textures/float/Texturelabs_Concrete_146S.jpg",
  "/textures/float/Texturelabs_Concrete_176S.jpg",
  "/textures/float/Texturelabs_Details_129S.jpg",
  "/textures/float/Texturelabs_Film_138S.jpg",
  "/textures/float/Texturelabs_Grunge_195S.jpg",
  "/textures/float/Texturelabs_Grunge_300S.jpg",
  "/textures/float/Texturelabs_InkPaint_217S.jpg",
  "/textures/float/Texturelabs_Metal_122S-1.jpg",
  "/textures/float/Texturelabs_Metal_122S.jpg",
  "/textures/float/ab251eb803c68091699755e1929c0d6f.jpg",
  "/textures/float/black-scratches.jpg",
  "/textures/float/blur-grunge.jpg",
  "/textures/float/dust-scratches.jpg",
  "/textures/float/ece9d3bc6b95d3a43b0654073c057fd2.jpg",
  "/textures/float/ed31ef77bdfc4df37daa07abb929ae49.jpg",
  "/textures/float/fingerprint-smudge.jpg",
  "/textures/float/flare-noise.jpg",
  "/textures/float/folded-paper.jpg",
  "/textures/float/halftone-noise.jpg",
  "/textures/float/masking-tape.jpg",
  "/textures/float/photocopy-noise.jpg",
  "/textures/float/rip-noise.jpg",
  "/textures/float/scrape.jpg",
  "/textures/float/text-noise.jpg",
  "/textures/float/texture-background-1100x733.jpg",
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

export function archiveTextureIndices(seed: string, count = 3) {
  const baseIndex = textureIndex(seed);
  const textureCount = Math.min(count, ARCHIVE_TEXTURES.length);
  const indices: number[] = [];

  for (let offset = 0; indices.length < textureCount; offset += 1) {
    const index = (baseIndex + offset * 5) % ARCHIVE_TEXTURES.length;
    if (!indices.includes(index)) indices.push(index);
  }

  return indices;
}
