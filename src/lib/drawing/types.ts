export type Point = { x: number; y: number };

export type ElementBase = {
  id: string;
  groupId?: string;
  stroke: string;
  strokeWidth: number;
};

export type RectElement = ElementBase & {
  type: "rectangle";
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  seed: number;
};

export type EllipseElement = ElementBase & {
  type: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  seed: number;
};

export type LineElement = ElementBase & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: number;
};

export type ArrowElement = ElementBase & {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: number;
};

export type PenElement = ElementBase & {
  type: "pen";
  points: [number, number][];
};

export type TextElement = {
  id: string;
  groupId?: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily?: FontId;
};

export const FONTS = [
  { id: "hand", label: "Hand", family: '"Caveat", "Comic Sans MS", cursive' },
  {
    id: "marker",
    label: "Marker",
    family: '"Architects Daughter", "Comic Sans MS", cursive',
  },
  {
    id: "sans",
    label: "Sans",
    family:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "serif",
    label: "Serif",
    family: 'Georgia, "Times New Roman", serif',
  },
  {
    id: "mono",
    label: "Mono",
    family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

export function getFontFamily(id: FontId | undefined): string {
  return FONTS.find((f) => f.id === id)?.family ?? FONTS[0].family;
}

export type ImageElement = {
  id: string;
  groupId?: string;
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
};

export type DrawElement =
  | RectElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | PenElement
  | TextElement
  | ImageElement;

export type Tool =
  | "select"
  | "pen"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "eraser"
  | "pan";

export type ViewTransform = {
  panX: number;
  panY: number;
  zoom: number;
};

import type { BackgroundStyle } from "@/lib/backgrounds";

export type BoardDoc = {
  id: string;
  name: string;
  elements: DrawElement[];
  background?: BackgroundStyle;
  updatedAt: number;
};

export const COLORS = [
  "#1f2328",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
];

export const FILLS = [
  "transparent",
  "#fde68a",
  "#fecaca",
  "#bbf7d0",
  "#bae6fd",
  "#ddd6fe",
];
