import LZString from "lz-string";

export type ShareKind = "board" | "schema";

type Envelope<T> = { k: ShareKind; v: 1; d: T };

/** Compress + URL-safe-base64 encode any JSON-serializable payload. */
export function encodeShare<T>(kind: ShareKind, payload: T): string {
  const env: Envelope<T> = { k: kind, v: 1, d: payload };
  return LZString.compressToEncodedURIComponent(JSON.stringify(env));
}

export function decodeShare<T = unknown>(
  token: string,
): { kind: ShareKind; payload: T } | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(token);
    if (!json) return null;
    const parsed = JSON.parse(json) as Envelope<T>;
    if (!parsed || (parsed.k !== "board" && parsed.k !== "schema")) return null;
    return { kind: parsed.k, payload: parsed.d };
  } catch {
    return null;
  }
}

export function buildShareUrl<T>(kind: ShareKind, payload: T): string {
  const token = encodeShare(kind, payload);
  if (typeof window === "undefined") return "#data=" + token;
  return `${window.location.origin}/${kind}#data=${token}`;
}

export function readShareFromHash(): {
  kind: ShareKind;
  payload: any;
} | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#data=(.+)$/);
  if (!m) return null;
  return decodeShare(m[1]);
}

export function clearShareHash() {
  if (typeof window === "undefined") return;
  if (window.location.hash) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }
}

/** ~30 KB is a reasonable practical URL ceiling across browsers. */
export const SHARE_URL_WARN = 16000;
export const SHARE_URL_MAX = 30000;
