import type { SchemaModel, TablePosition } from "./types";
import { TABLE_DIMS, getColumnY, resolveColor, tableHeight } from "./layout";
import {
  DEFAULT_BACKGROUND,
  drawBackground,
  type BackgroundStyle,
} from "@/lib/backgrounds";

export function renderSchema(
  ctx: CanvasRenderingContext2D,
  model: SchemaModel,
  positions: Record<string, TablePosition>,
  hoveredTable?: string | null,
) {
  ctx.save();
  ctx.font = '13px ui-sans-serif, system-ui, -apple-system, "Segoe UI"';
  ctx.textBaseline = "middle";

  // refs first (under tables visually OK since they enter at edges)
  ctx.lineWidth = 1.5;
  for (const r of model.refs) {
    const a = positions[r.from.table];
    const b = positions[r.to.table];
    const tableA = model.tables.find((t) => t.name === r.from.table);
    const tableB = model.tables.find((t) => t.name === r.to.table);
    if (!a || !b || !tableA || !tableB) continue;
    const colAIdx = tableA.columns.findIndex((c) => c.name === r.from.column);
    const colBIdx = tableB.columns.findIndex((c) => c.name === r.to.column);
    if (colAIdx < 0 || colBIdx < 0) continue;

    const aMidX = a.x + TABLE_DIMS.width / 2;
    const bMidX = b.x + TABLE_DIMS.width / 2;
    const fromOnRight = aMidX < bMidX;
    const ax = fromOnRight ? a.x + TABLE_DIMS.width : a.x;
    const bx = fromOnRight ? b.x : b.x + TABLE_DIMS.width;
    const ay = getColumnY(a.y, colAIdx);
    const by = getColumnY(b.y, colBIdx);

    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath();
    const c1x = ax + (fromOnRight ? 60 : -60);
    const c2x = bx + (fromOnRight ? -60 : 60);
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(c1x, ay, c2x, by, bx, by);
    ctx.stroke();

    // Endpoint dots
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(ax, ay, 3, 0, Math.PI * 2);
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // tables
  for (const t of model.tables) {
    const pos = positions[t.name];
    if (!pos) continue;
    const h = tableHeight(t.columns.length);
    const w = TABLE_DIMS.width;
    const color = resolveColor(t.color);

    // shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#fff";
    roundRect(ctx, pos.x, pos.y, w, h, 8);
    ctx.fill();
    ctx.restore();

    // header
    ctx.fillStyle = color;
    roundRect(ctx, pos.x, pos.y, w, TABLE_DIMS.headerHeight, 8, true);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system';
    ctx.fillText(t.name, pos.x + 12, pos.y + TABLE_DIMS.headerHeight / 2);

    // columns
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    t.columns.forEach((c, idx) => {
      const y = pos.y + TABLE_DIMS.headerHeight + idx * TABLE_DIMS.rowHeight;
      // alternate row shade
      if (idx % 2 === 0) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(pos.x + 1, y, w - 2, TABLE_DIMS.rowHeight);
      }
      // PK/FK badge
      const badgeX = pos.x + 10;
      const midY = y + TABLE_DIMS.rowHeight / 2;
      if (c.pk) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillText("◆", badgeX, midY);
      } else if (c.fk) {
        ctx.fillStyle = "#64748b";
        ctx.fillText("◇", badgeX, midY);
      } else {
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText("·", badgeX, midY);
      }

      ctx.fillStyle = "#1f2328";
      ctx.fillText(c.name, badgeX + 14, midY);

      ctx.fillStyle = "#94a3b8";
      const typeText = c.type;
      const tw = ctx.measureText(typeText).width;
      ctx.fillText(typeText, pos.x + w - tw - 12, midY);
    });

    // outline
    ctx.strokeStyle =
      hoveredTable === t.name ? color : "rgba(15,23,42,0.08)";
    ctx.lineWidth = hoveredTable === t.name ? 2 : 1;
    roundRect(ctx, pos.x, pos.y, w, h, 8);
    ctx.stroke();
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  topOnly = false,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  if (topOnly) {
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function exportSchemaToPng(
  model: SchemaModel,
  positions: Record<string, TablePosition>,
  fileName: string,
  background: BackgroundStyle = DEFAULT_BACKGROUND,
) {
  if (model.tables.length === 0) return;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of model.tables) {
    const p = positions[t.name];
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    const r = p.x + TABLE_DIMS.width;
    const b = p.y + tableHeight(t.columns.length);
    if (r > maxX) maxX = r;
    if (b > maxY) maxY = b;
  }
  if (!isFinite(minX)) return;
  const padding = 40;
  const width = Math.ceil(maxX - minX + padding * 2);
  const height = Math.ceil(maxY - minY + padding * 2);

  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement("canvas");
  c.width = width * dpr;
  c.height = height * dpr;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  drawBackground(
    ctx,
    width,
    height,
    { panX: -minX + padding, panY: -minY + padding, zoom: 1 },
    background,
  );
  const shifted: Record<string, TablePosition> = {};
  for (const k of Object.keys(positions)) {
    shifted[k] = {
      x: positions[k].x - minX + padding,
      y: positions[k].y - minY + padding,
    };
  }
  renderSchema(ctx, model, shifted);

  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, "image/png");
}
