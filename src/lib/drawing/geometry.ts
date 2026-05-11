import type { DrawElement, Point } from "./types";

export type Bounds = { x: number; y: number; w: number; h: number };

export const HANDLE_NAMES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const;
export type HandleName = (typeof HANDLE_NAMES)[number];

export const HANDLE_CURSORS: Record<HandleName, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

export function distToSegment(
  p: Point,
  a: Point,
  b: Point,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function getBounds(el: DrawElement) {
  switch (el.type) {
    case "rectangle":
    case "ellipse":
      return {
        x: Math.min(el.x, el.x + el.w),
        y: Math.min(el.y, el.y + el.h),
        w: Math.abs(el.w),
        h: Math.abs(el.h),
      };
    case "line":
    case "arrow":
      return {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        w: Math.abs(el.x2 - el.x1),
        h: Math.abs(el.y2 - el.y1),
      };
    case "pen": {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const [px, py] of el.points) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "text":
      return {
        x: el.x,
        y: el.y - el.fontSize,
        w: Math.max(40, el.text.length * el.fontSize * 0.6),
        h: el.fontSize * 1.4,
      };
    case "image":
      return {
        x: Math.min(el.x, el.x + el.w),
        y: Math.min(el.y, el.y + el.h),
        w: Math.abs(el.w),
        h: Math.abs(el.h),
      };
  }
}

export function hitTest(el: DrawElement, p: Point, tolerance = 8): boolean {
  switch (el.type) {
    case "rectangle":
    case "ellipse": {
      const b = getBounds(el);
      return (
        p.x >= b.x - tolerance &&
        p.x <= b.x + b.w + tolerance &&
        p.y >= b.y - tolerance &&
        p.y <= b.y + b.h + tolerance
      );
    }
    case "line":
    case "arrow":
      return (
        distToSegment(
          p,
          { x: el.x1, y: el.y1 },
          { x: el.x2, y: el.y2 },
        ) <= tolerance
      );
    case "pen": {
      for (let i = 0; i < el.points.length - 1; i++) {
        if (
          distToSegment(
            p,
            { x: el.points[i][0], y: el.points[i][1] },
            { x: el.points[i + 1][0], y: el.points[i + 1][1] },
          ) <= tolerance
        )
          return true;
      }
      return false;
    }
    case "text":
    case "image": {
      const b = getBounds(el);
      return (
        p.x >= b.x &&
        p.x <= b.x + b.w &&
        p.y >= b.y &&
        p.y <= b.y + b.h
      );
    }
  }
}

export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function expandSelectionToGroups(
  ids: Set<string>,
  elements: DrawElement[],
): Set<string> {
  const groupIds = new Set<string>();
  for (const el of elements) {
    if (ids.has(el.id) && el.groupId) groupIds.add(el.groupId);
  }
  if (groupIds.size === 0) return ids;
  const result = new Set(ids);
  for (const el of elements) {
    if (el.groupId && groupIds.has(el.groupId)) result.add(el.id);
  }
  return result;
}

export function getBoundsOfMany(
  elements: DrawElement[],
  ids: Set<string>,
): Bounds | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let any = false;
  for (const el of elements) {
    if (!ids.has(el.id)) continue;
    const b = getBounds(el);
    any = true;
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  if (!any) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function getHandlePositions(b: Bounds): Record<HandleName, Point> {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return {
    nw: { x: b.x, y: b.y },
    n: { x: cx, y: b.y },
    ne: { x: b.x + b.w, y: b.y },
    e: { x: b.x + b.w, y: cy },
    se: { x: b.x + b.w, y: b.y + b.h },
    s: { x: cx, y: b.y + b.h },
    sw: { x: b.x, y: b.y + b.h },
    w: { x: b.x, y: cy },
  };
}

export function getHandleAnchor(handle: HandleName, b: Bounds): Point {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  switch (handle) {
    case "nw":
      return { x: b.x + b.w, y: b.y + b.h };
    case "ne":
      return { x: b.x, y: b.y + b.h };
    case "se":
      return { x: b.x, y: b.y };
    case "sw":
      return { x: b.x + b.w, y: b.y };
    case "n":
      return { x: cx, y: b.y + b.h };
    case "s":
      return { x: cx, y: b.y };
    case "e":
      return { x: b.x, y: cy };
    case "w":
      return { x: b.x + b.w, y: cy };
  }
}

export function hitHandle(
  p: Point,
  b: Bounds,
  zoom: number,
): HandleName | null {
  const tol = 8 / zoom;
  const positions = getHandlePositions(b);
  for (const name of HANDLE_NAMES) {
    const pos = positions[name];
    if (Math.abs(p.x - pos.x) <= tol && Math.abs(p.y - pos.y) <= tol) {
      return name;
    }
  }
  return null;
}

export function scaleElement(
  el: DrawElement,
  ox: number,
  oy: number,
  sx: number,
  sy: number,
): DrawElement {
  const fx = (v: number) => ox + (v - ox) * sx;
  const fy = (v: number) => oy + (v - oy) * sy;
  switch (el.type) {
    case "rectangle":
    case "ellipse":
      return { ...el, x: fx(el.x), y: fy(el.y), w: el.w * sx, h: el.h * sy };
    case "line":
    case "arrow":
      return {
        ...el,
        x1: fx(el.x1),
        y1: fy(el.y1),
        x2: fx(el.x2),
        y2: fy(el.y2),
      };
    case "pen":
      return {
        ...el,
        points: el.points.map(
          ([x, y]) => [fx(x), fy(y)] as [number, number],
        ),
      };
    case "text": {
      const factor = Math.max(0.05, Math.abs(sy));
      return {
        ...el,
        x: fx(el.x),
        y: fy(el.y),
        fontSize: Math.max(6, el.fontSize * factor),
      };
    }
    case "image":
      return { ...el, x: fx(el.x), y: fy(el.y), w: el.w * sx, h: el.h * sy };
  }
}

export function translateElement(el: DrawElement, dx: number, dy: number): DrawElement {
  switch (el.type) {
    case "rectangle":
    case "ellipse":
      return { ...el, x: el.x + dx, y: el.y + dy };
    case "line":
    case "arrow":
      return {
        ...el,
        x1: el.x1 + dx,
        y1: el.y1 + dy,
        x2: el.x2 + dx,
        y2: el.y2 + dy,
      };
    case "pen":
      return {
        ...el,
        points: el.points.map(([x, y]) => [x + dx, y + dy] as [number, number]),
      };
    case "text":
      return { ...el, x: el.x + dx, y: el.y + dy };
    case "image":
      return { ...el, x: el.x + dx, y: el.y + dy };
  }
}
