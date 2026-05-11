import type { BoardDoc } from "./types";

const KEY_PREFIX = "drawflow:board:";
const INDEX_KEY = "drawflow:board:index";

export type BoardIndexEntry = { id: string; name: string; updatedAt: number };

function readIndex(): BoardIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as BoardIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(idx: BoardIndexEntry[]) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
}

export function saveBoard(doc: BoardDoc) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_PREFIX + doc.id, JSON.stringify(doc));
  const idx = readIndex().filter((e) => e.id !== doc.id);
  idx.unshift({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt });
  writeIndex(idx);
}

export function loadBoard(id: string): BoardDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as BoardDoc) : null;
  } catch {
    return null;
  }
}

export function deleteBoard(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_PREFIX + id);
  writeIndex(readIndex().filter((e) => e.id !== id));
}

export function listBoards(): BoardIndexEntry[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}
