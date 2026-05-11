"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tool, COLORS, FILLS, FONTS, getFontFamily, type FontId } from "@/lib/drawing/types";
import BackgroundPicker from "@/components/BackgroundPicker";
import type { BackgroundStyle } from "@/lib/backgrounds";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "↖" },
  { id: "pen", label: "Pen", icon: "✎" },
  { id: "rectangle", label: "Rectangle", icon: "▭" },
  { id: "ellipse", label: "Ellipse", icon: "◯" },
  { id: "line", label: "Line", icon: "／" },
  { id: "arrow", label: "Arrow", icon: "→" },
  { id: "text", label: "Text", icon: "T" },
  { id: "eraser", label: "Eraser", icon: "⌫" },
  { id: "pan", label: "Pan", icon: "✋" },
];

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  fill: string;
  setFill: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  background: BackgroundStyle;
  setBackground: (b: BackgroundStyle) => void;
  shareSlot?: ReactNode;
  fontFamily: FontId;
  setFontFamily: (id: FontId) => void;
  showFontPicker: boolean;
};

export default function BoardToolbar(p: Props) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur rounded-lg shadow-md border border-black/10 p-1">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => p.setTool(t.id)}
          className={`w-9 h-9 rounded-md flex items-center justify-center text-base hover:bg-black/5 ${
            p.tool === t.id ? "bg-ink text-white hover:bg-ink" : ""
          }`}
        >
          {t.icon}
        </button>
      ))}
      <div className="w-px h-6 bg-black/10 mx-1" />
      <ColorPopover
        label="Stroke"
        value={p.color}
        swatches={COLORS}
        onChange={p.setColor}
        shape="circle"
      />
      <ColorPopover
        label="Fill"
        value={p.fill}
        swatches={FILLS}
        onChange={p.setFill}
        shape="square"
      />
      <div className="w-px h-6 bg-black/10 mx-1" />
      <StrokeWidthPicker value={p.strokeWidth} onChange={p.setStrokeWidth} color={p.color} />
      {p.showFontPicker && (
        <>
          <div className="w-px h-6 bg-black/10 mx-1" />
          <FontPicker value={p.fontFamily} onChange={p.setFontFamily} />
        </>
      )}
      <div className="w-px h-6 bg-black/10 mx-1" />
      <button
        title="Undo"
        onClick={p.onUndo}
        disabled={!p.canUndo}
        className="w-9 h-9 rounded-md hover:bg-black/5 disabled:opacity-30"
      >
        ↶
      </button>
      <button
        title="Redo"
        onClick={p.onRedo}
        disabled={!p.canRedo}
        className="w-9 h-9 rounded-md hover:bg-black/5 disabled:opacity-30"
      >
        ↷
      </button>
      <button
        title="Clear"
        onClick={p.onClear}
        className="w-9 h-9 rounded-md hover:bg-black/5"
      >
        🗑
      </button>
      <BackgroundPicker value={p.background} onChange={p.setBackground} />
      {p.shareSlot}
      <button
        title="Export PNG"
        onClick={p.onExport}
        className="px-3 h-9 rounded-md bg-accent text-white text-sm hover:opacity-90"
      >
        PNG
      </button>
    </div>
  );
}

function ColorPopover({
  label,
  value,
  swatches,
  onChange,
  shape,
}: {
  label: string;
  value: string;
  swatches: readonly string[];
  onChange: (v: string) => void;
  shape: "circle" | "square";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const swatchShape = shape === "circle" ? "rounded-full" : "rounded-md";
  const swatchBg = (v: string) =>
    v === "transparent"
      ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px"
      : v;

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={`h-9 w-9 rounded-md flex items-center justify-center ${
          open ? "bg-ink/10" : "hover:bg-black/5"
        }`}
        title={label}
      >
        <span
          className={`w-5 h-5 ${swatchShape} border border-black/15`}
          style={{ background: swatchBg(value) }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-md border border-black/10 p-2 z-30 w-[176px]">
          <div className="text-[10px] uppercase tracking-wider text-ink/40 mb-1.5">
            {label}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {swatches.map((v) => (
              <button
                key={v}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(v);
                  setOpen(false);
                }}
                className={`w-6 h-6 ${swatchShape} border ${
                  value === v ? "ring-2 ring-accent" : "border-black/10"
                }`}
                style={{ background: swatchBg(v) }}
                title={v}
              />
            ))}
            <CustomColor
              value={value === "transparent" ? "#ffffff" : value}
              onChange={(v) => onChange(v)}
              title={`Custom ${label.toLowerCase()}`}
              circular={shape === "circle"}
            />
          </div>
        </div>
      )}
    </div>
  );
}


function CustomColor({
  value,
  onChange,
  title,
  circular = false,
}: {
  value: string;
  onChange: (v: string) => void;
  title: string;
  circular?: boolean;
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  const shape = circular ? "rounded-full" : "rounded-md";
  return (
    <label
      className={`w-6 h-6 ${shape} border border-black/10 overflow-hidden relative cursor-pointer ml-0.5`}
      title={title}
      style={{
        background:
          "conic-gradient(from 180deg, #ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #8b5cf6, #ef4444)",
      }}
    >
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        className="opacity-0 absolute inset-0 cursor-pointer"
      />
    </label>
  );
}

function FontPicker({
  value,
  onChange,
}: {
  value: FontId;
  onChange: (id: FontId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const active = FONTS.find((f) => f.id === value) ?? FONTS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-2 rounded-md flex items-center gap-1 text-sm ${
          open ? "bg-ink/10" : "hover:bg-black/5"
        }`}
        title="Font"
      >
        <span style={{ fontFamily: getFontFamily(value) }} className="text-base">
          Aa
        </span>
        <span className="text-[10px] text-ink/50">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-md border border-black/10 p-1 flex flex-col gap-0.5 z-30 min-w-[140px]">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(f.id);
                setOpen(false);
              }}
              className={`px-2 h-8 rounded flex items-center gap-2 text-sm text-left ${
                value === f.id ? "bg-ink/10" : "hover:bg-black/5"
              }`}
            >
              <span
                style={{ fontFamily: getFontFamily(f.id) }}
                className="text-base w-6"
              >
                Aa
              </span>
              <span className="text-xs text-ink/70">{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StrokeWidthPicker({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (n: number) => void;
  color: string;
}) {
  const widths = [1, 2, 4];
  return (
    <div className="flex items-center gap-0.5">
      {widths.map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className={`h-9 px-2 rounded-md flex items-center justify-center ${
            value === w ? "bg-ink/10 ring-1 ring-ink/20" : "hover:bg-black/5"
          }`}
          title={`${w}px stroke`}
        >
          <svg width="22" height="14" viewBox="0 0 22 14">
            <line
              x1="2"
              y1="7"
              x2="20"
              y2="7"
              stroke={color}
              strokeWidth={w}
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
