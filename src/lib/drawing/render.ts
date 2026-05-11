import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getFontFamily, type DrawElement } from "./types";
import {
  getBounds,
  getHandlePositions,
  HANDLE_NAMES,
  type Bounds,
} from "./geometry";

export function renderElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  el: DrawElement,
) {
  switch (el.type) {
    case "rectangle": {
      const b = getBounds(el);
      rc.rectangle(b.x, b.y, b.w || 1, b.h || 1, {
        seed: el.seed,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        fill: el.fill && el.fill !== "transparent" ? el.fill : undefined,
        fillStyle: "hachure",
        roughness: 1.4,
      });
      break;
    }
    case "ellipse": {
      const b = getBounds(el);
      rc.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w || 1, b.h || 1, {
        seed: el.seed,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        fill: el.fill && el.fill !== "transparent" ? el.fill : undefined,
        fillStyle: "hachure",
        roughness: 1.4,
      });
      break;
    }
    case "line":
      rc.line(el.x1, el.y1, el.x2, el.y2, {
        seed: el.seed,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        roughness: 1.2,
      });
      break;
    case "arrow": {
      rc.line(el.x1, el.y1, el.x2, el.y2, {
        seed: el.seed,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        roughness: 1.2,
      });
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const head = 14;
      const ax1 = el.x2 - head * Math.cos(angle - Math.PI / 7);
      const ay1 = el.y2 - head * Math.sin(angle - Math.PI / 7);
      const ax2 = el.x2 - head * Math.cos(angle + Math.PI / 7);
      const ay2 = el.y2 - head * Math.sin(angle + Math.PI / 7);
      rc.line(el.x2, el.y2, ax1, ay1, {
        seed: el.seed + 1,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        roughness: 1,
      });
      rc.line(el.x2, el.y2, ax2, ay2, {
        seed: el.seed + 2,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        roughness: 1,
      });
      break;
    }
    case "pen": {
      if (el.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(el.points[0][0], el.points[0][1]);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i][0], el.points[i][1]);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "image": {
      const img = getCachedImage(el.src);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, el.x, el.y, el.w, el.h);
      } else {
        ctx.save();
        ctx.fillStyle = "#f3f4f6";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.fillRect(el.x, el.y, el.w, el.h);
        ctx.strokeRect(el.x, el.y, el.w, el.h);
        ctx.restore();
      }
      break;
    }
    case "text": {
      ctx.save();
      ctx.fillStyle = el.color;
      ctx.font = `${el.fontSize}px ${getFontFamily(el.fontFamily)}`;
      ctx.textBaseline = "alphabetic";
      const lines = el.text.split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * el.fontSize * 1.2);
      });
      ctx.restore();
      break;
    }
  }
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  el: DrawElement,
) {
  const b = getBounds(el);
  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
  ctx.restore();
}

export function renderResizeHandles(
  ctx: CanvasRenderingContext2D,
  b: Bounds,
  zoom: number,
) {
  const size = 8 / zoom;
  const half = size / 2;
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5 / zoom;
  const positions = getHandlePositions(b);
  for (const name of HANDLE_NAMES) {
    const pos = positions[name];
    ctx.fillRect(pos.x - half, pos.y - half, size, size);
    ctx.strokeRect(pos.x - half, pos.y - half, size, size);
  }
  ctx.restore();
}

const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(
  src: string,
  onLoad?: () => void,
): HTMLImageElement {
  const existing = imageCache.get(src);
  if (existing) {
    if (onLoad && !(existing.complete && existing.naturalWidth > 0)) {
      existing.addEventListener("load", onLoad, { once: true });
    }
    return existing;
  }
  const img = new Image();
  if (onLoad) img.addEventListener("load", onLoad, { once: true });
  img.src = src;
  imageCache.set(src, img);
  return img;
}

export function getRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  return rough.canvas(canvas);
}
