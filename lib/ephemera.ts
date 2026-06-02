export const EPHEMERA_PANES = [
  "Release Artwork",
  "Tangents",
  "Promotional Material",
  "Elements",
  "Conceptual/Unused",
  "Etc.",
] as const;

export type EphemeraPane = (typeof EPHEMERA_PANES)[number];
