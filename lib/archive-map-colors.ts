export const ARCHIVE_MAP_COLORS = {
  album: "#9b1b30",
  blood: "#9b1b30",
  ep: "#b08a35",
  purple: "#7750a1",
  root: "#315f68",
  single: "#596b45",
  song: "#37667a",
} as const;

export const DRIFT_DIRECTION_COLORS = [
  ARCHIVE_MAP_COLORS.purple,
  ARCHIVE_MAP_COLORS.blood,
  ARCHIVE_MAP_COLORS.root,
] as const;
