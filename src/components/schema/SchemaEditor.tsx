"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseSchema, DEFAULT_SCHEMA } from "@/lib/schema/parser";
import type { SchemaDoc, TablePosition } from "@/lib/schema/types";
import { saveSchema, loadSchema } from "@/lib/schema/storage";
import SchemaCanvas from "./SchemaCanvas";
import VisualEditor from "./VisualEditor";
import { DEFAULT_BACKGROUND, type BackgroundStyle } from "@/lib/backgrounds";

const SIDEBAR_WIDTH_KEY = "drawflow:schema:sidebarWidth";
const SIDEBAR_MIN = 280;
const SIDEBAR_MAX = 720;
const SIDEBAR_DEFAULT = 420;

type Props = { docId: string };

function ModeTab({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 text-left border-b-2 transition ${
        active
          ? "border-accent text-ink bg-white"
          : "border-transparent text-ink/60 hover:text-ink bg-slate-50"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="ml-1.5 text-[10px] text-ink/40">{sub}</span>
    </button>
  );
}

export default function SchemaEditor({ docId }: Props) {
  const [source, setSource] = useState<string>(DEFAULT_SCHEMA);
  const [docName, setDocName] = useState("Untitled schema");
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  const [background, setBackground] = useState<BackgroundStyle>(DEFAULT_BACKGROUND);
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isDesktop, setIsDesktop] = useState(true);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, n)));
      }
    }
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const startResize = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    const next = Math.min(
      SIDEBAR_MAX,
      Math.max(SIDEBAR_MIN, s.startWidth + (e.clientX - s.startX)),
    );
    setSidebarWidth(next);
  };
  const endResize = () => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  };

  useEffect(() => {
    const existing = loadSchema(docId);
    if (existing) {
      setSource(existing.source);
      setDocName(existing.name);
      setPositions(existing.positions ?? {});
      if (existing.background) setBackground(existing.background);
    }
  }, [docId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const doc: SchemaDoc = {
        id: docId,
        name: docName,
        source,
        positions,
        background,
        updatedAt: Date.now(),
      };
      saveSchema(doc);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [docId, source, docName, positions, background]);

  const model = useMemo(() => parseSchema(source), [source]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)]">
      <aside
        style={isDesktop ? { width: sidebarWidth } : undefined}
        className="md:shrink-0 border-b md:border-b-0 md:border-r border-black/10 bg-white flex flex-col min-h-0 max-h-[55vh] md:max-h-none md:h-full"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-black/10">
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="text-sm bg-transparent border-b border-transparent hover:border-black/20 focus:border-accent focus:outline-none flex-1 px-1 py-0.5"
          />
          <span className="text-xs text-ink/50">
            {model.tables.length}t · {model.refs.length}r
          </span>
        </div>

        <div className="flex border-b border-black/10 text-xs">
          <ModeTab
            label="Visual"
            sub="no-code"
            active={mode === "visual"}
            onClick={() => setMode("visual")}
          />
          <ModeTab
            label="Code"
            sub="DSL"
            active={mode === "code"}
            onClick={() => setMode("code")}
          />
        </div>

        {mode === "visual" ? (
          <VisualEditor source={source} onChange={setSource} />
        ) : (
          <>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              className="schema-editor flex-1 resize-none p-3 outline-none bg-white"
            />
            <div className="px-3 py-2 text-xs text-ink/60 border-t border-black/10 bg-slate-50">
              <div className="font-medium text-ink mb-1">Syntax cheat-sheet</div>
              <pre className="whitespace-pre-wrap leading-relaxed">
{`table users [color: indigo] {
  id int pk
  email varchar
}

table posts {
  id int pk
  user_id int > users.id
}

ref: posts.user_id > users.id`}
              </pre>
            </div>
          </>
        )}
      </aside>
      <div
        onPointerDown={startResize}
        onPointerMove={onResizeMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onDoubleClick={() => {
          setSidebarWidth(SIDEBAR_DEFAULT);
          window.localStorage.setItem(
            SIDEBAR_WIDTH_KEY,
            String(SIDEBAR_DEFAULT),
          );
        }}
        className="hidden md:block w-1.5 cursor-col-resize bg-transparent hover:bg-accent/30 active:bg-accent/40 transition-colors relative group"
        title="Drag to resize · double-click to reset"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-black/10 group-hover:bg-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <SchemaCanvas
          model={model}
          positions={positions}
          setPositions={setPositions}
          fileName={docName || "drawflow-schema"}
          source={source}
          background={background}
          setBackground={setBackground}
        />
      </div>
    </div>
  );
}
