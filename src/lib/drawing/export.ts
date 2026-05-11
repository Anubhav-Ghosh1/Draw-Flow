import rough from "roughjs";
import type { DrawElement } from "./types";
import { getBounds } from "./geometry";
import { renderElement } from "./render";
import {
  DEFAULT_BACKGROUND,
  drawBackground,
  type BackgroundStyle,
} from "@/lib/backgrounds";

export function exportElementsToPng(
  elements: DrawElement[],
  fileName: string,
  background: BackgroundStyle = DEFAULT_BACKGROUND,
  padding = 32,
) {
  if (elements.length === 0) return;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of elements) {
    const b = getBounds(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  if (!isFinite(minX)) return;

  const width = Math.ceil(maxX - minX + padding * 2);
  const height = Math.ceil(maxY - minY + padding * 2);

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  drawBackground(
    ctx,
    width,
    height,
    { panX: -minX + padding, panY: -minY + padding, zoom: 1 },
    background,
  );
  ctx.translate(-minX + padding, -minY + padding);

  const rc = rough.canvas(canvas);
  for (const el of elements) renderElement(ctx, rc, el);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, "image/png");
}
