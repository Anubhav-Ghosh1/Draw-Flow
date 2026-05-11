import type { SchemaDoc } from "./types";

const KEY_PREFIX = "drawflow:schema:";
const INDEX_KEY = "drawflow:schema:index";

export type SchemaIndexEntry = { id: string; name: string; updatedAt: number };

function readIndex(): SchemaIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as SchemaIndexEntry[]) : [];
  } catch {
    return [];
  }
}
function writeIndex(idx: SchemaIndexEntry[]) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
}

export function saveSchema(doc: SchemaDoc) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_PREFIX + doc.id, JSON.stringify(doc));
  const idx = readIndex().filter((e) => e.id !== doc.id);
  idx.unshift({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt });
  writeIndex(idx);
}

export function loadSchema(id: string): SchemaDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as SchemaDoc) : null;
  } catch {
    return null;
  }
}

export function deleteSchema(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_PREFIX + id);
  writeIndex(readIndex().filter((e) => e.id !== id));
}

export function listSchemas(): SchemaIndexEntry[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}
