import type { SchemaModel, TablePosition } from "./types";

const TABLE_WIDTH = 220;
const TABLE_X_GAP = 80;
const TABLE_Y_GAP = 40;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 26;

export function tableHeight(columnCount: number): number {
  return HEADER_HEIGHT + Math.max(1, columnCount) * ROW_HEIGHT + 8;
}

export const TABLE_DIMS = {
  width: TABLE_WIDTH,
  headerHeight: HEADER_HEIGHT,
  rowHeight: ROW_HEIGHT,
};

export function autoLayout(
  model: SchemaModel,
  existing: Record<string, TablePosition>,
): Record<string, TablePosition> {
  const result: Record<string, TablePosition> = { ...existing };
  const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(model.tables.length))));
  const colHeights = new Array(cols).fill(40);

  for (const t of model.tables) {
    if (result[t.name]) continue;
    // Pick the shortest column
    let bestCol = 0;
    for (let i = 1; i < cols; i++) {
      if (colHeights[i] < colHeights[bestCol]) bestCol = i;
    }
    const x = 40 + bestCol * (TABLE_WIDTH + TABLE_X_GAP);
    const y = colHeights[bestCol];
    result[t.name] = { x, y };
    colHeights[bestCol] += tableHeight(t.columns.length) + TABLE_Y_GAP;
  }
  // Drop positions for tables that no longer exist
  const valid = new Set(model.tables.map((t) => t.name));
  for (const k of Object.keys(result)) {
    if (!valid.has(k)) delete result[k];
  }
  return result;
}

const COLOR_MAP: Record<string, string> = {
  indigo: "#6366f1",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  emerald: "#10b981",
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#ef4444",
  rose: "#f43f5e",
  purple: "#a855f7",
  pink: "#ec4899",
  slate: "#64748b",
};

export function resolveColor(c: string | undefined): string {
  if (!c) return "#6366f1";
  if (c.startsWith("#")) return c;
  return COLOR_MAP[c.toLowerCase()] ?? "#6366f1";
}

export function getColumnY(tableY: number, columnIndex: number): number {
  return tableY + HEADER_HEIGHT + columnIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}
