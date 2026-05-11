"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nanoid } from "nanoid";
import BoardToolbar from "./BoardToolbar";
import {
  DrawElement,
  Tool,
  ViewTransform,
  BoardDoc,
  type FontId,
  getFontFamily,
} from "@/lib/drawing/types";
import {
  getCachedImage,
  getRoughCanvas,
  renderElement,
  renderResizeHandles,
  renderSelectionBox,
} from "@/lib/drawing/render";
import {
  expandSelectionToGroups,
  getBounds,
  getBoundsOfMany,
  getHandleAnchor,
  getHandlePositions,
  hitHandle,
  hitTest,
  HANDLE_CURSORS,
  rectsIntersect,
  scaleElement,
  translateElement,
  type Bounds,
  type HandleName,
} from "@/lib/drawing/geometry";
import { exportElementsToPng } from "@/lib/drawing/export";
import { saveBoard, loadBoard } from "@/lib/drawing/storage";
import {
  DEFAULT_BACKGROUND,
  drawBackground,
  type BackgroundStyle,
} from "@/lib/backgrounds";
import ShareButton from "@/components/ShareButton";

type Props = { docId: string };

type Marquee = { x1: number; y1: number; x2: number; y2: number };

export default function DrawingCanvas({ docId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#1f2328");
  const [fill, setFill] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontFamily, setFontFamily] = useState<FontId>("hand");
  const [view, setView] = useState<ViewTransform>({ panX: 0, panY: 0, zoom: 1 });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [docName, setDocName] = useState("Untitled");
  const [background, setBackground] = useState<BackgroundStyle>(DEFAULT_BACKGROUND);
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  const draftRef = useRef<DrawElement | null>(null);
  const dragRef = useRef<{
    mode: "draw" | "move" | "pan" | "marquee" | "resize" | null;
    startX: number;
    startY: number;
    moveStarts?: Map<string, DrawElement>;
    marqueeBaseSelection?: Set<string>;
    resizeHandle?: HandleName;
    resizeAnchor?: { x: number; y: number };
    resizeOriginHandle?: { x: number; y: number };
    resizeStarts?: Map<string, DrawElement>;
  }>({ mode: null, startX: 0, startY: 0 });
  const [hoverHandle, setHoverHandle] = useState<HandleName | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const clipboardRef = useRef<DrawElement[]>([]);
  const pointerWorldRef = useRef<{ x: number; y: number } | null>(null);

  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [textEditor, setTextEditor] = useState<{
    x: number;
    y: number;
    value: string;
    color: string;
    fontSize: number;
    fontFamily: FontId;
    editingId?: string;
  } | null>(null);

  // Load on mount
  useEffect(() => {
    const existing = loadBoard(docId);
    if (existing) {
      setElements(existing.elements);
      setHistory([existing.elements]);
      setHistoryIdx(0);
      setDocName(existing.name);
      if (existing.background) setBackground(existing.background);
    }
  }, [docId]);

  // Persist
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const doc: BoardDoc = {
        id: docId,
        name: docName,
        elements,
        background,
        updatedAt: Date.now(),
      };
      saveBoard(doc);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [docId, elements, docName, background]);

  // Resize canvas to wrapper
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

  // Render
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
    ctx.clearRect(0, 0, w, h);
    drawBackground(ctx, w, h, view, background);

    ctx.translate(view.panX, view.panY);
    ctx.scale(view.zoom, view.zoom);

    const rc = getRoughCanvas(canvas);
    const editingId = textEditor?.editingId;
    for (const el of elements) {
      if (editingId && el.id === editingId) continue;
      renderElement(ctx, rc, el);
    }
    if (draftRef.current) renderElement(ctx, rc, draftRef.current);
    for (const id of selectedIds) {
      const sel = elements.find((e) => e.id === id);
      if (sel) renderSelectionBox(ctx, sel);
    }
    const bounds = getBoundsOfMany(elements, selectedIds);
    if (bounds && bounds.w >= 0 && bounds.h >= 0) {
      renderResizeHandles(ctx, bounds, view.zoom);
    }

    // Marquee in world space
    if (marquee) {
      ctx.save();
      ctx.strokeStyle = "#6366f1";
      ctx.fillStyle = "rgba(99,102,241,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      const x = Math.min(marquee.x1, marquee.x2);
      const y = Math.min(marquee.y1, marquee.y2);
      const w2 = Math.abs(marquee.x2 - marquee.x1);
      const h2 = Math.abs(marquee.y2 - marquee.y1);
      ctx.fillRect(x, y, w2, h2);
      ctx.strokeRect(x, y, w2, h2);
      ctx.restore();
    }

    ctx.restore();
  }, [elements, selectedIds, view, background, marquee, textEditor?.editingId, imageVersion]);

  useEffect(() => {
    for (const el of elements) {
      if (el.type !== "image") continue;
      getCachedImage(el.src, () => setImageVersion((v) => v + 1));
    }
  }, [elements]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Coords conversion
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return {
        x: (x - view.panX) / view.zoom,
        y: (y - view.panY) / view.zoom,
      };
    },
    [view],
  );

  const pushHistory = (next: DrawElement[]) => {
    const trimmed = history.slice(0, historyIdx + 1);
    trimmed.push(next);
    setHistory(trimmed);
    setHistoryIdx(trimmed.length - 1);
    setElements(next);
  };

  const undo = () => {
    if (historyIdx <= 0) return;
    const next = historyIdx - 1;
    setHistoryIdx(next);
    setElements(history[next]);
    setSelectedIds(new Set());
  };
  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const next = historyIdx + 1;
    setHistoryIdx(next);
    setElements(history[next]);
    setSelectedIds(new Set());
  };

  const findHit = (p: { x: number; y: number }) =>
    [...elements].reverse().find((el) => hitTest(el, p));

  const selectionBounds: Bounds | null = useMemo(
    () => getBoundsOfMany(elements, selectedIds),
    [elements, selectedIds],
  );

  // Pointer handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (textEditor) return commitText();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toWorld(e.clientX, e.clientY);

    if (tool === "pan" || e.button === 1) {
      dragRef.current = { mode: "pan", startX: e.clientX, startY: e.clientY };
      return;
    }

    if (tool === "select") {
      if (selectionBounds) {
        const handle = hitHandle(p, selectionBounds, view.zoom);
        if (handle) {
          const anchor = getHandleAnchor(handle, selectionBounds);
          const originHandle = getHandlePositions(selectionBounds)[handle];
          const resizeStarts = new Map<string, DrawElement>();
          for (const el of elements) {
            if (selectedIds.has(el.id)) resizeStarts.set(el.id, el);
          }
          dragRef.current = {
            mode: "resize",
            startX: p.x,
            startY: p.y,
            resizeHandle: handle,
            resizeAnchor: anchor,
            resizeOriginHandle: originHandle,
            resizeStarts,
          };
          return;
        }
      }
      const hit = findHit(p);
      if (hit) {
        // Determine new selection: group-aware
        let nextSelection: Set<string>;
        const hitGroup = expandSelectionToGroups(new Set([hit.id]), elements);
        if (e.shiftKey) {
          // Toggle the hit (and its group) in current selection
          const next = new Set(selectedIds);
          const allInSel = [...hitGroup].every((id) => next.has(id));
          if (allInSel) {
            for (const id of hitGroup) next.delete(id);
          } else {
            for (const id of hitGroup) next.add(id);
          }
          nextSelection = next;
        } else if (selectedIds.has(hit.id)) {
          // Already in selection — keep current (so we drag the group)
          nextSelection = selectedIds;
        } else {
          nextSelection = hitGroup;
        }
        setSelectedIds(nextSelection);

        // Begin move drag with snapshots of all selected
        const moveStarts = new Map<string, DrawElement>();
        for (const el of elements) {
          if (nextSelection.has(el.id)) moveStarts.set(el.id, el);
        }
        dragRef.current = {
          mode: "move",
          startX: p.x,
          startY: p.y,
          moveStarts,
        };
      } else {
        // Start marquee (additive if shift held)
        dragRef.current = {
          mode: "marquee",
          startX: p.x,
          startY: p.y,
          marqueeBaseSelection: e.shiftKey ? new Set(selectedIds) : new Set(),
        };
        if (!e.shiftKey) setSelectedIds(new Set());
        setMarquee({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      }
      return;
    }

    if (tool === "eraser") {
      const hit = findHit(p);
      if (hit) pushHistory(elements.filter((el) => el.id !== hit.id));
      dragRef.current = { mode: "draw", startX: p.x, startY: p.y };
      return;
    }

    if (tool === "text") {
      const hit = findHit(p);
      if (hit && hit.type === "text") {
        startEditingText(hit);
        return;
      }
      setTextEditor({ x: p.x, y: p.y, value: "", color, fontSize: 24, fontFamily });
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }

    // Drawing tools
    const id = nanoid(6);
    const seed = Math.floor(Math.random() * 100000);
    let draft: DrawElement | null = null;
    if (tool === "rectangle") {
      draft = { id, type: "rectangle", x: p.x, y: p.y, w: 0, h: 0, stroke: color, fill, strokeWidth, seed };
    } else if (tool === "ellipse") {
      draft = { id, type: "ellipse", x: p.x, y: p.y, w: 0, h: 0, stroke: color, fill, strokeWidth, seed };
    } else if (tool === "line") {
      draft = { id, type: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y, stroke: color, strokeWidth, seed };
    } else if (tool === "arrow") {
      draft = { id, type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y, stroke: color, strokeWidth, seed };
    } else if (tool === "pen") {
      draft = { id, type: "pen", points: [[p.x, p.y]], stroke: color, strokeWidth };
    }
    draftRef.current = draft;
    dragRef.current = { mode: "draw", startX: p.x, startY: p.y };
    draw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toWorld(e.clientX, e.clientY);
    pointerWorldRef.current = p;
    const drag = dragRef.current;

    if (drag.mode === null && tool === "select" && selectionBounds) {
      const h = hitHandle(p, selectionBounds, view.zoom);
      if (h !== hoverHandle) setHoverHandle(h);
    } else if (hoverHandle && drag.mode !== "resize") {
      setHoverHandle(null);
    }

    if (drag.mode === "resize" && drag.resizeStarts && drag.resizeAnchor && drag.resizeOriginHandle && drag.resizeHandle) {
      const anchor = drag.resizeAnchor;
      const orig = drag.resizeOriginHandle;
      const handle = drag.resizeHandle;
      const dx = orig.x - anchor.x;
      const dy = orig.y - anchor.y;
      let sx = Math.abs(dx) > 1e-3 ? (p.x - anchor.x) / dx : 1;
      let sy = Math.abs(dy) > 1e-3 ? (p.y - anchor.y) / dy : 1;
      if (handle === "n" || handle === "s") sx = 1;
      if (handle === "e" || handle === "w") sy = 1;
      if (
        e.shiftKey &&
        (handle === "nw" || handle === "ne" || handle === "se" || handle === "sw")
      ) {
        const m = Math.max(Math.abs(sx), Math.abs(sy));
        sx = (Math.sign(sx) || 1) * m;
        sy = (Math.sign(sy) || 1) * m;
      }
      const eps = 1e-3;
      if (Math.abs(sx) < eps) sx = sx < 0 ? -eps : eps;
      if (Math.abs(sy) < eps) sy = sy < 0 ? -eps : eps;
      setElements((els) =>
        els.map((el) => {
          const start = drag.resizeStarts!.get(el.id);
          return start ? scaleElement(start, anchor.x, anchor.y, sx, sy) : el;
        }),
      );
      return;
    }

    if (drag.mode === "pan") {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      dragRef.current = { ...drag, startX: e.clientX, startY: e.clientY };
      setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
      return;
    }

    if (drag.mode === "move" && drag.moveStarts) {
      const dx = p.x - drag.startX;
      const dy = p.y - drag.startY;
      setElements((els) =>
        els.map((el) => {
          const start = drag.moveStarts!.get(el.id);
          return start ? translateElement(start, dx, dy) : el;
        }),
      );
      return;
    }

    if (drag.mode === "marquee") {
      setMarquee({
        x1: drag.startX,
        y1: drag.startY,
        x2: p.x,
        y2: p.y,
      });
      return;
    }

    if (drag.mode === "draw") {
      if (tool === "eraser") {
        const hit = findHit(p);
        if (hit) pushHistory(elements.filter((el) => el.id !== hit.id));
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      if (draft.type === "rectangle" || draft.type === "ellipse") {
        draftRef.current = { ...draft, w: p.x - drag.startX, h: p.y - drag.startY };
      } else if (draft.type === "line" || draft.type === "arrow") {
        draftRef.current = { ...draft, x2: p.x, y2: p.y };
      } else if (draft.type === "pen") {
        draftRef.current = { ...draft, points: [...draft.points, [p.x, p.y]] };
      }
      draw();
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag.mode === "draw" && draftRef.current) {
      const draft = draftRef.current;
      const meaningful =
        draft.type === "pen" ||
        draft.type === "text" ||
        ((draft.type === "rectangle" || draft.type === "ellipse") &&
          (Math.abs(draft.w) > 2 || Math.abs(draft.h) > 2)) ||
        ((draft.type === "line" || draft.type === "arrow") &&
          Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 2);
      if (meaningful) {
        pushHistory([...elements, draft]);
        if (
          draft.type === "rectangle" ||
          draft.type === "ellipse" ||
          draft.type === "line" ||
          draft.type === "arrow"
        ) {
          setTool("select");
          setSelectedIds(new Set([draft.id]));
        }
      }
      draftRef.current = null;
    }
    if (drag.mode === "move") {
      pushHistory(elements);
    }
    if (drag.mode === "resize") {
      pushHistory(elements);
    }
    if (drag.mode === "marquee" && marquee) {
      const mx = Math.min(marquee.x1, marquee.x2);
      const my = Math.min(marquee.y1, marquee.y2);
      const mw = Math.abs(marquee.x2 - marquee.x1);
      const mh = Math.abs(marquee.y2 - marquee.y1);
      if (mw < 2 && mh < 2) {
        // Clicked empty space — already cleared on down
      } else {
        const rect = { x: mx, y: my, w: mw, h: mh };
        const hits = new Set<string>(drag.marqueeBaseSelection ?? []);
        for (const el of elements) {
          const b = getBounds(el);
          if (rectsIntersect(rect, b)) hits.add(el.id);
        }
        setSelectedIds(expandSelectionToGroups(hits, elements));
      }
      setMarquee(null);
    }
    dragRef.current = { mode: null, startX: 0, startY: 0 };
    draw();
  };

  const zoomBy = (factor: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cx = wrap.clientWidth / 2;
    const cy = wrap.clientHeight / 2;
    const next = Math.max(0.2, Math.min(4, view.zoom * factor));
    const k = next / view.zoom;
    setView({
      zoom: next,
      panX: cx - (cx - view.panX) * k,
      panY: cy - (cy - view.panY) * k,
    });
  };

  const resetZoom = () => {
    const wrap = wrapRef.current;
    if (!wrap) return setView({ panX: 0, panY: 0, zoom: 1 });
    const cx = wrap.clientWidth / 2;
    const cy = wrap.clientHeight / 2;
    const k = 1 / view.zoom;
    setView({
      zoom: 1,
      panX: cx - (cx - view.panX) * k,
      panY: cy - (cy - view.panY) * k,
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const next = Math.max(0.2, Math.min(4, view.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
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

  // Group / ungroup
  const groupSelected = () => {
    if (selectedIds.size < 2) return;
    const gid = nanoid(6);
    const next = elements.map((el) =>
      selectedIds.has(el.id) ? ({ ...el, groupId: gid } as DrawElement) : el,
    );
    pushHistory(next);
  };
  const ungroupSelected = () => {
    if (selectedIds.size === 0) return;
    let changed = false;
    const next = elements.map((el) => {
      if (selectedIds.has(el.id) && el.groupId) {
        changed = true;
        const copy = { ...el } as DrawElement & { groupId?: string };
        delete copy.groupId;
        return copy as DrawElement;
      }
      return el;
    });
    if (changed) pushHistory(next);
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textEditor) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        setSelectedIds(new Set(elements.map((el) => el.id)));
        return;
      }
      if (mod && key === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
        return;
      }
      if (mod && key === "c" && selectedIds.size > 0) {
        clipboardRef.current = elements.filter((el) => selectedIds.has(el.id));
        return;
      }
      if (mod && key === "x" && selectedIds.size > 0) {
        e.preventDefault();
        clipboardRef.current = elements.filter((el) => selectedIds.has(el.id));
        pushHistory(elements.filter((el) => !selectedIds.has(el.id)));
        setSelectedIds(new Set());
        return;
      }
      if (mod && key === "d" && selectedIds.size > 0) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.size > 0) {
        e.preventDefault();
        pushHistory(elements.filter((el) => !selectedIds.has(el.id)));
        setSelectedIds(new Set());
        return;
      }
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        return;
      }

      if (mod || e.altKey) return;
      if (key === "v") setTool("select");
      else if (key === "p") setTool("pen");
      else if (key === "r") setTool("rectangle");
      else if (key === "o") setTool("ellipse");
      else if (key === "l") setTool("line");
      else if (key === "a") setTool("arrow");
      else if (key === "t") setTool("text");
      else if (key === "e") setTool("eraser");
      else if (key === "h") setTool("pan");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selectedIds, history, historyIdx, textEditor]);

  const cloneWithRemap = (
    items: DrawElement[],
    dx: number,
    dy: number,
  ): DrawElement[] => {
    // Preserve group relationships: each old groupId maps to a new groupId
    const groupRemap = new Map<string, string>();
    return items.map((el) => {
      const moved = translateElement(el, dx, dy);
      let groupId = (moved as { groupId?: string }).groupId;
      if (groupId) {
        let next = groupRemap.get(groupId);
        if (!next) {
          next = nanoid(6);
          groupRemap.set(groupId, next);
        }
        groupId = next;
      }
      return { ...moved, id: nanoid(6), ...(groupId ? { groupId } : {}) } as DrawElement;
    });
  };

  const pasteClipboard = () => {
    const items = clipboardRef.current;
    if (items.length === 0) return;
    const cursor = pointerWorldRef.current;
    let dx = 16;
    let dy = 16;
    if (cursor) {
      // Anchor the bounding-box top-left of the clipboard to the cursor
      let minX = Infinity, minY = Infinity;
      for (const el of items) {
        const b = getBounds(el);
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
      }
      if (isFinite(minX)) {
        dx = cursor.x - minX;
        dy = cursor.y - minY;
      }
    }
    const pasted = cloneWithRemap(items, dx, dy);
    pushHistory([...elements, ...pasted]);
    setSelectedIds(new Set(pasted.map((p) => p.id)));
  };

  const insertImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const probe = new Image();
      probe.onload = () => {
        const maxDim = 600;
        let w = probe.naturalWidth;
        let h = probe.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const k = maxDim / Math.max(w, h);
          w = Math.round(w * k);
          h = Math.round(h * k);
        }
        const cursor = pointerWorldRef.current;
        const wrap = wrapRef.current;
        const cx = cursor
          ? cursor.x
          : wrap
            ? (wrap.clientWidth / 2 - view.panX) / view.zoom
            : 0;
        const cy = cursor
          ? cursor.y
          : wrap
            ? (wrap.clientHeight / 2 - view.panY) / view.zoom
            : 0;
        const el: DrawElement = {
          id: nanoid(6),
          type: "image",
          x: cx - w / 2,
          y: cy - h / 2,
          w,
          h,
          src: dataUrl,
          naturalWidth: probe.naturalWidth,
          naturalHeight: probe.naturalHeight,
        };
        pushHistory([...elements, el]);
        setTool("select");
        setSelectedIds(new Set([el.id]));
      };
      probe.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (textEditor) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      const items = e.clipboardData?.items;
      if (items) {
        for (const it of items) {
          if (it.type.startsWith("image/")) {
            const file = it.getAsFile();
            if (file) {
              e.preventDefault();
              insertImageFromFile(file);
              return;
            }
          }
        }
      }
      if (clipboardRef.current.length > 0) {
        e.preventDefault();
        pasteClipboard();
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, textEditor, view]);

  const duplicateSelected = () => {
    const items = elements.filter((el) => selectedIds.has(el.id));
    if (items.length === 0) return;
    const dups = cloneWithRemap(items, 16, 16);
    pushHistory([...elements, ...dups]);
    setSelectedIds(new Set(dups.map((d) => d.id)));
  };

  const applyFont = (id: FontId) => {
    setFontFamily(id);
    if (textEditor) {
      setTextEditor({ ...textEditor, fontFamily: id });
      return;
    }
    const hasSelectedText = elements.some(
      (el) => selectedIds.has(el.id) && el.type === "text",
    );
    if (hasSelectedText) {
      pushHistory(
        elements.map((el) =>
          selectedIds.has(el.id) && el.type === "text"
            ? { ...el, fontFamily: id }
            : el,
        ),
      );
    }
  };

  const showFontPicker = useMemo(() => {
    if (tool === "text" || textEditor) return true;
    return elements.some(
      (el) => selectedIds.has(el.id) && el.type === "text",
    );
  }, [tool, textEditor, elements, selectedIds]);

  function startEditingText(el: DrawElement) {
    if (el.type !== "text") return;
    const fid = (el.fontFamily ?? "hand") as FontId;
    setFontFamily(fid);
    setTextEditor({
      x: el.x,
      y: el.y,
      value: el.text,
      color: el.color,
      fontSize: el.fontSize,
      fontFamily: fid,
      editingId: el.id,
    });
    setSelectedIds(new Set());
    setTimeout(() => {
      const ta = textInputRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 0);
  }

  function commitText() {
    if (!textEditor) return;
    const text = textEditor.value.trim();
    if (textEditor.editingId) {
      if (!text) {
        pushHistory(elements.filter((el) => el.id !== textEditor.editingId));
      } else {
        pushHistory(
          elements.map((el) =>
            el.id === textEditor.editingId && el.type === "text"
              ? { ...el, text: textEditor.value, fontFamily: textEditor.fontFamily }
              : el,
          ),
        );
      }
    } else if (text) {
      const el: DrawElement = {
        id: nanoid(6),
        type: "text",
        x: textEditor.x,
        y: textEditor.y,
        text: textEditor.value,
        color: textEditor.color,
        fontSize: textEditor.fontSize,
        fontFamily: textEditor.fontFamily,
      };
      pushHistory([...elements, el]);
    }
    setTextEditor(null);
  }

  const handleExport = () =>
    exportElementsToPng(elements, docName || "drawflow-board", background);

  const textEditorScreen = useMemo(() => {
    if (!textEditor) return null;
    return {
      left: textEditor.x * view.zoom + view.panX,
      top: textEditor.y * view.zoom + view.panY - textEditor.fontSize * view.zoom,
    };
  }, [textEditor, view]);

  // Selection summary for status display
  const selectionInfo = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const groups = new Set<string>();
    for (const el of elements) {
      if (selectedIds.has(el.id) && el.groupId) groups.add(el.groupId);
    }
    return { count: selectedIds.size, groupCount: groups.size };
  }, [selectedIds, elements]);

  return (
    <div ref={wrapRef} className="relative w-full h-[calc(100vh-56px)] canvas-host overflow-hidden">
      <BoardToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        fill={fill}
        setFill={setFill}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        onClear={() => pushHistory([])}
        onExport={handleExport}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        background={background}
        setBackground={setBackground}
        fontFamily={fontFamily}
        setFontFamily={applyFont}
        showFontPicker={showFontPicker}
        shareSlot={
          <ShareButton
            kind="board"
            getPayload={() => ({
              name: docName,
              elements,
              background,
            })}
            className="h-9 px-3 rounded-md text-sm border border-black/10 bg-white hover:bg-black/5 inline-flex items-center gap-1.5"
          />
        }
      />

      {selectionInfo && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 backdrop-blur rounded-md shadow-sm border border-black/10 px-2 py-1 text-xs">
          <span className="text-ink/60">
            {selectionInfo.count} selected
            {selectionInfo.groupCount > 0
              ? ` · ${selectionInfo.groupCount} group${selectionInfo.groupCount > 1 ? "s" : ""}`
              : ""}
          </span>
          {selectedIds.size >= 2 && (
            <button
              onClick={groupSelected}
              className="px-2 h-6 rounded text-xs bg-ink text-white hover:opacity-90"
              title="Group (⌘G)"
            >
              Group
            </button>
          )}
          {selectionInfo.groupCount > 0 && (
            <button
              onClick={ungroupSelected}
              className="px-2 h-6 rounded text-xs border border-black/10 hover:bg-black/5"
              title="Ungroup (⌘⇧G)"
            >
              Ungroup
            </button>
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-white/95 backdrop-blur rounded-md shadow-sm border border-black/10 px-2 py-1">
        <span className="text-[10px] uppercase tracking-wider text-ink/40">file</span>
        <input
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
          className="text-sm bg-transparent outline-none w-44 text-ink"
          placeholder="Untitled"
        />
        <span className="text-xs text-ink/40">·</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => zoomBy(0.9)}
            className="w-6 h-6 rounded hover:bg-black/5 text-ink/70 hover:text-ink flex items-center justify-center"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="text-xs text-ink/60 hover:text-ink px-1 min-w-[40px] text-center tabular-nums"
            title="Reset zoom"
          >
            {(view.zoom * 100).toFixed(0)}%
          </button>
          <button
            onClick={() => zoomBy(1.1)}
            className="w-6 h-6 rounded hover:bg-black/5 text-ink/70 hover:text-ink flex items-center justify-center"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <ShortcutsHint />

      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          if (tool !== "select") return;
          const p = toWorld(e.clientX, e.clientY);
          const hit = findHit(p);
          if (hit && hit.type === "text") startEditingText(hit);
        }}
        onWheel={onWheel}
        style={{
          cursor: hoverHandle
            ? HANDLE_CURSORS[hoverHandle]
            : tool === "pan"
              ? "grab"
              : tool === "text"
                ? "text"
                : tool === "eraser"
                  ? "crosshair"
                  : tool === "select"
                    ? "default"
                    : "crosshair",
        }}
      />

      {textEditor && textEditorScreen && (
        <textarea
          ref={textInputRef}
          value={textEditor.value}
          onChange={(e) =>
            setTextEditor({ ...textEditor, value: e.target.value })
          }
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setTextEditor(null);
            } else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
          }}
          style={{
            position: "absolute",
            left: textEditorScreen.left,
            top: textEditorScreen.top,
            color: textEditor.color,
            fontFamily: getFontFamily(textEditor.fontFamily),
            fontSize: textEditor.fontSize * view.zoom,
            lineHeight: 1.2,
          }}
          className="z-30 bg-transparent border border-accent/60 rounded px-1 outline-none min-w-[80px]"
          rows={1}
          placeholder="type..."
        />
      )}
    </div>
  );
}

function ShortcutsHint() {
  const [expanded, setExpanded] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    hideTimerRef.current = window.setTimeout(() => setExpanded(false), 5000);
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const cancelTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  return (
    <div
      className="absolute bottom-3 right-3 z-20"
      onMouseEnter={() => {
        cancelTimer();
        setExpanded(true);
      }}
      onMouseLeave={() => setExpanded(false)}
    >
      {expanded ? (
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-md border border-black/10 p-3 w-[320px] hidden md:block">
          <div className="font-medium text-ink mb-2 flex items-center gap-1.5 text-xs">
            <InfoIcon />
            <span>Shortcuts</span>
          </div>

          <Section title="Tools">
            <Kbd k="V" label="Select" />
            <Kbd k="P" label="Pen" />
            <Kbd k="R" label="Rectangle" />
            <Kbd k="O" label="Ellipse" />
            <Kbd k="L" label="Line" />
            <Kbd k="A" label="Arrow" />
            <Kbd k="T" label="Text" />
            <Kbd k="E" label="Eraser" />
            <Kbd k="H" label="Pan" />
          </Section>

          <Section title="Edit">
            <Kbd k="⌘Z" label="Undo" />
            <Kbd k="⌘⇧Z" label="Redo" />
            <Kbd k="⌘C" label="Copy" />
            <Kbd k="⌘V" label="Paste" />
            <Kbd k="⌘X" label="Cut" />
            <Kbd k="⌘D" label="Duplicate" />
            <Kbd k="Del" label="Delete" />
          </Section>

          <Section title="Selection">
            <Kbd k="⌘A" label="Select all" />
            <Kbd k="⌘G" label="Group" />
            <Kbd k="⌘⇧G" label="Ungroup" />
            <Kbd k="Esc" label="Clear" />
          </Section>

          <div className="mt-2 pt-2 border-t border-black/5 text-[10px] text-ink/50 leading-relaxed">
            <div>Shift+click — add to selection</div>
            <div>Drag empty area — marquee select</div>
            <div>⌘+scroll — zoom</div>
          </div>
        </div>
      ) : (
        <button
          aria-label="Show shortcuts"
          className="w-8 h-8 rounded-full bg-white/95 border border-black/10 shadow-sm flex items-center justify-center text-ink/60 hover:text-ink hover:border-ink/30"
        >
          <InfoIcon />
        </button>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="text-[10px] uppercase tracking-wider text-ink/40 mb-1">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">{children}</div>
    </div>
  );
}

function Kbd({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink/70">
      <kbd className="font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-ink min-w-[28px] text-center shrink-0">
        {k}
      </kbd>
      <span className="truncate">{label}</span>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
