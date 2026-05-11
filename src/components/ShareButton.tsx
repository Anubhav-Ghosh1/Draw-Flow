"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SHARE_URL_MAX,
  SHARE_URL_WARN,
  buildShareUrl,
  type ShareKind,
} from "@/lib/share";

type Props = {
  kind: ShareKind;
  getPayload: () => unknown;
  className?: string;
  label?: string;
};

export default function ShareButton({
  kind,
  getPayload,
  className,
  label = "Share",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "px-3 h-9 rounded-md text-sm border border-black/10 bg-white hover:bg-black/5 inline-flex items-center gap-1.5"
        }
        title="Get a shareable link"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
      {open && (
        <ShareDialog
          kind={kind}
          getPayload={getPayload}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ShareDialog({
  kind,
  getPayload,
  onClose,
}: {
  kind: ShareKind;
  getPayload: () => unknown;
  onClose: () => void;
}) {
  const url = useMemo(() => buildShareUrl(kind, getPayload()), [kind, getPayload]);
  const [copied, setCopied] = useState(false);
  const len = url.length;
  const tooBig = len > SHARE_URL_MAX;
  const big = len > SHARE_URL_WARN;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const input = document.getElementById("share-url") as HTMLInputElement | null;
      input?.select();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-black/10 w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
          <div>
            <div className="font-semibold">Share this {kind}</div>
            <div className="text-xs text-ink/60 mt-0.5">
              Anyone with the link gets an editable local copy.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-black/5 text-ink/60"
          >
            ✕
          </button>
        </header>

        <div className="p-5 space-y-3">
          <label className="block text-xs font-medium text-ink/70">
            Shareable link
          </label>
          <div className="flex gap-2">
            <input
              id="share-url"
              readOnly
              value={tooBig ? "" : url}
              placeholder={tooBig ? "Link is too long to share — see below" : ""}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 h-10 rounded-md border border-black/10 px-3 text-xs font-mono outline-none focus:border-accent bg-slate-50"
            />
            <button
              onClick={copy}
              disabled={tooBig}
              className="h-10 px-3 rounded-md bg-ink text-white text-sm hover:opacity-90 disabled:opacity-40"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="text-xs">
            <span className="text-ink/60">Link size: </span>
            <span
              className={
                tooBig
                  ? "text-red-600 font-medium"
                  : big
                    ? "text-amber-600 font-medium"
                    : "text-ink/70"
              }
            >
              {(len / 1024).toFixed(1)} KB
            </span>
            {big && !tooBig && (
              <span className="text-amber-700 ml-2">
                · large links may not paste cleanly into chat apps
              </span>
            )}
            {tooBig && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-3 text-red-700">
                This {kind} is too big to fit in a URL. Export to PNG instead, or
                trim the content.
              </div>
            )}
          </div>

          <p className="text-xs text-ink/50 leading-relaxed pt-1">
            The link contains the full {kind} data — your browser sends nothing
            to a server. The recipient's edits stay on their device.
          </p>
        </div>
      </div>
    </div>
  );
}
