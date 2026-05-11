"use client";

import { useEffect, useRef, useState } from "react";
import {
  BackgroundStyle,
  PATTERN_LABELS,
  TONE_LABELS,
  TONE_COLORS,
  resolveBackgroundColors,
  type BackgroundPattern,
  type BackgroundTone,
} from "@/lib/backgrounds";

const PATTERNS: BackgroundPattern[] = ["dots", "grid", "lines", "iso", "blank"];
const TONES: BackgroundTone[] = ["paper", "white", "cream", "slate", "ink"];

type Props = {
  value: BackgroundStyle;
  onChange: (next: BackgroundStyle) => void;
};

export default function BackgroundPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/5 text-sm flex items-center gap-2"
        title="Background"
      >
        <PreviewSwatch value={value} />
        <span className="hidden sm:inline">{PATTERN_LABELS[value.pattern]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-black/10 bg-white shadow-lg p-3 z-30">
          <div className="text-xs font-medium text-ink/60 mb-2">Pattern</div>
          <div className="grid grid-cols-5 gap-1.5">
            {PATTERNS.map((p) => (
              <button
                key={p}
                onClick={() => onChange({ ...value, pattern: p })}
                className={`aspect-square rounded-md border overflow-hidden ${
                  value.pattern === p
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-black/10 hover:border-black/30"
                }`}
                title={PATTERN_LABELS[p]}
              >
                <PreviewSwatch value={{ ...value, pattern: p }} fill />
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-ink/60 mt-3 mb-2">Tone</div>
          <div className="grid grid-cols-5 gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => onChange({ ...value, tone: t, customFill: undefined })}
                className={`aspect-square rounded-md border ${
                  value.tone === t && !value.customFill
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-black/10 hover:border-black/30"
                }`}
                style={{ background: TONE_COLORS[t].fill }}
                title={TONE_LABELS[t]}
              />
            ))}
          </div>

          <div className="text-xs font-medium text-ink/60 mt-3 mb-2 flex items-center justify-between">
            <span>Custom color</span>
            {value.customFill && (
              <button
                onClick={() => onChange({ ...value, customFill: undefined })}
                className="text-[10px] text-accent hover:underline"
              >
                clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.customFill ?? TONE_COLORS[value.tone].fill}
              onChange={(e) =>
                onChange({ ...value, customFill: e.target.value })
              }
              className="w-9 h-9 rounded-md border border-black/10 cursor-pointer bg-white p-0"
              title="Pick any background color"
            />
            <input
              type="text"
              value={value.customFill ?? ""}
              placeholder={TONE_COLORS[value.tone].fill}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) onChange({ ...value, customFill: undefined });
                else if (/^#[0-9a-fA-F]{6}$/.test(v))
                  onChange({ ...value, customFill: v });
                else onChange({ ...value, customFill: v });
              }}
              className="flex-1 h-9 rounded-md border border-black/10 px-2 text-xs font-mono outline-none focus:border-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewSwatch({
  value,
  fill = false,
}: {
  value: BackgroundStyle;
  fill?: boolean;
}) {
  const colors = resolveBackgroundColors(value);
  const dot = colors.ink;
  const baseClass = fill ? "w-full h-full" : "w-5 h-5 rounded-sm border border-black/10";
  let bgImage = "";
  const size = "8px 8px";
  switch (value.pattern) {
    case "dots":
      bgImage = `radial-gradient(${dot} 1px, transparent 1px)`;
      break;
    case "grid":
      bgImage = `linear-gradient(${dot} 1px, transparent 1px), linear-gradient(90deg, ${dot} 1px, transparent 1px)`;
      break;
    case "lines":
      bgImage = `linear-gradient(${dot} 1px, transparent 1px)`;
      break;
    case "iso":
      bgImage = `repeating-linear-gradient(60deg, ${dot} 0 1px, transparent 1px 8px), repeating-linear-gradient(120deg, ${dot} 0 1px, transparent 1px 8px)`;
      break;
    case "blank":
      bgImage = "";
      break;
  }
  return (
    <div
      className={baseClass}
      style={{
        background: colors.fill,
        backgroundImage: bgImage || undefined,
        backgroundSize: size,
      }}
    />
  );
}
