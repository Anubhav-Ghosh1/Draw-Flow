"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SchemaModel, TablePosition } from "@/lib/schema/types";
import { TABLE_DIMS, autoLayout, tableHeight } from "@/lib/schema/layout";
import { renderSchema, exportSchemaToPng } from "@/lib/schema/render";
import BackgroundPicker from "@/components/BackgroundPicker";
import ShareButton from "@/components/ShareButton";
import {
  DEFAULT_BACKGROUND,
  drawBackground,
  type BackgroundStyle,
} from "@/lib/backgrounds";

type Props = {
  model: SchemaModel;
  positions: Record<string, TablePosition>;
  setPositions: (
    next:
      | Record<string, TablePosition>
      | ((prev: Record<string, TablePosition>) => Record<string, TablePosition>),
  ) => void;
  fileName: string;
  source?: string;
  background?: BackgroundStyle;
  setBackground?: (b: BackgroundStyle) => void;
};

export default function SchemaCanvas({
  model,
  positions,
  setPositions,
  fileName,
  source,
  background = DEFAULT_BACKGROUND,
  setBackground,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ panX: 40, panY: 40, zoom: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const dragRef = useRef<{
    mode: "table" | "pan" | null;
    table?: string;
    offsetX: number;
    offsetY: number;
  }>({ mode: null, offsetX: 0, offsetY: 0 });

  // Autolayout for new tables
  useEffect(() => {
    setPositions((prev) => autoLayout(model, prev));
  }, [model, setPositions]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [resize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(ctx, w, h, view, background);

    ctx.translate(view.panX, view.panY);
    ctx.scale(view.zoom, view.zoom);
    renderSchema(ctx, model, positions, hovered);
    ctx.restore();
  }, [model, positions, view, hovered, background]);

  useEffect(() => {
    draw();
  }, [draw]);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.panX) / view.zoom,
      y: (clientY - rect.top - view.panY) / view.zoom,
    };
  };

  const tableAt = (x: number, y: number): string | null => {
    for (let i = model.tables.length - 1; i >= 0; i--) {
      const t = model.tables[i];
      const p = positions[t.name];
      if (!p) continue;
      const h = tableHeight(t.columns.length);
      if (
        x >= p.x &&
        x <= p.x + TABLE_DIMS.width &&
        y >= p.y &&
        y <= p.y + h
      ) {
        return t.name;
      }
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    const name = tableAt(w.x, w.y);
    if (name) {
      const p = positions[name];
      dragRef.current = {
        mode: "table",
        table: name,
        offsetX: w.x - p.x,
        offsetY: w.y - p.y,
      };
    } else {
      dragRef.current = {
        mode: "pan",
        offsetX: e.clientX - view.panX,
        offsetY: e.clientY - view.panY,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.mode === "table" && d.table) {
      const w = toWorld(e.clientX, e.clientY);
      setPositions((prev) => ({
        ...prev,
        [d.table!]: { x: w.x - d.offsetX, y: w.y - d.offsetY },
      }));
    } else if (d.mode === "pan") {
      setView((v) => ({
        ...v,
        panX: e.clientX - d.offsetX,
        panY: e.clientY - d.offsetY,
      }));
    } else {
      const w = toWorld(e.clientX, e.clientY);
      const name = tableAt(w.x, w.y);
      if (name !== hovered) setHovered(name);
    }
  };

  const onPointerUp = () => {
    dragRef.current = { mode: null, offsetX: 0, offsetY: 0 };
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const next = Math.max(
        0.3,
        Math.min(3, view.zoom * (e.deltaY < 0 ? 1.1 : 0.9)),
      );
      const k = next / view.zoom;
      setView({
        zoom: next,
        panX: cx - (cx - view.panX) * k,
        panY: cy - (cy - view.panY) * k,
      });
    } else {
      setView((v) => ({ ...v, panX: v.panX - e.deltaX, panY: v.panY - e.deltaY }));
    }
  };

  const handleExport = () =>
    exportSchemaToPng(model, positions, fileName, background);

  return (
    <div ref={wrapRef} className="relative w-full h-full canvas-host overflow-hidden bg-canvas">
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setPositions(autoLayout(model, {}))}
          className="px-3 h-9 rounded-md text-sm border border-black/10 bg-white hover:bg-black/5"
          title="Re-run auto layout"
        >
          Auto-layout
        </button>
        {setBackground && (
          <BackgroundPicker value={background} onChange={setBackground} />
        )}
        <ShareButton
          kind="schema"
          getPayload={() => ({
            name: fileName,
            source: source ?? "",
            positions,
            background,
          })}
        />
        <button
          onClick={handleExport}
          className="px-3 h-9 rounded-md text-sm bg-accent text-white hover:opacity-90"
        >
          Export PNG
        </button>
      </div>
      <div className="absolute bottom-3 right-3 z-20 text-xs text-ink/60 bg-white/70 rounded px-2 py-1">
        zoom {(view.zoom * 100).toFixed(0)}% · drag table to move · ⌘scroll to zoom
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: hovered ? "grab" : "default" }}
      />
    </div>
  );
}
