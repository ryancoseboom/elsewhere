export type TraceType =
  | "song"
  | "album"
  | "character"
  | "place"
  | "design"
  | "lyric"
  | "object"
  | "journal";

export type Trace = {
  id: string;
  title: string;
  type: TraceType;
  note?: string;
  code?: string;
  accent?: "red" | "gold" | "green" | "blue";
  x: number;
  y: number;
  rotate: number;
  damage?: "light" | "medium" | "heavy";
};

export type TraceLink = {
  from: string;
  to: string;
  strength: "confirmed" | "suspected" | "rumored";
};

export const traces: Trace[] = [
  {
    id: "coco",
    title: "COCO",
    type: "album",
    note: "central transmission",
    code: "HALOU / 032",
    accent: "red",
    x: 43,
    y: 39,
    rotate: -2,
    damage: "heavy",
  },
  {
    id: "song-coco",
    title: "COCO",
    type: "song",
    note: "single source",
    code: "TAPE A-01",
    accent: "gold",
    x: 17,
    y: 21,
    rotate: 4,
    damage: "medium",
  },
  {
    id: "visitor",
    title: "A VISITOR’S VIEW",
    type: "song",
    note: "adjacent weather",
    code: "FIELD NOTE",
    accent: "blue",
    x: 69,
    y: 18,
    rotate: -4,
    damage: "light",
  },
  {
    id: "red-heart",
    title: "RED CRYSTAL HEART",
    type: "object",
    note: "placed inside the repaired bear",
    code: "OBJECT 17",
    accent: "red",
    x: 24,
    y: 66,
    rotate: -6,
    damage: "heavy",
  },
  {
    id: "teddy",
    title: "THE BEAR",
    type: "character",
    note: "found / cleaned / repaired",
    code: "FIGURE B",
    accent: "green",
    x: 58,
    y: 67,
    rotate: 3,
    damage: "medium",
  },
  {
    id: "woods",
    title: "THE WOODS",
    type: "place",
    note: "initial discovery site",
    code: "MAP REF. 04",
    accent: "blue",
    x: 82,
    y: 53,
    rotate: 5,
    damage: "medium",
  },
];

export const links: TraceLink[] = [
  { from: "coco", to: "song-coco", strength: "confirmed" },
  { from: "coco", to: "visitor", strength: "suspected" },
  { from: "coco", to: "red-heart", strength: "confirmed" },
  { from: "red-heart", to: "teddy", strength: "confirmed" },
  { from: "teddy", to: "woods", strength: "rumored" },
];