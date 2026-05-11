export type BackgroundPattern = "dots" | "grid" | "lines" | "iso" | "blank";
export type BackgroundTone = "paper" | "white" | "cream" | "slate" | "ink";

export type BackgroundStyle = {
  pattern: BackgroundPattern;
  tone: BackgroundTone;
  /** When set, overrides the tone's fill color (any hex). */
  customFill?: string;
};

export const DEFAULT_BACKGROUND: BackgroundStyle = {
  pattern: "dots",
  tone: "paper",
};

/** Pick a contrast pattern color for any hex fill. */
export function inkColorFor(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "rgba(0,0,0,0.10)";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.20)";
}

export function resolveBackgroundColors(style: BackgroundStyle): {
  fill: string;
  ink: string;
} {
  if (style.customFill) {
    return { fill: style.customFill, ink: inkColorFor(style.customFill) };
  }
  return TONE_COLORS[style.tone];
}

export const TONE_COLORS: Record<
  BackgroundTone,
  { fill: string; ink: string }
> = {
  paper: { fill: "#fafaf7", ink: "rgba(0,0,0,0.10)" },
  white: { fill: "#ffffff", ink: "rgba(0,0,0,0.10)" },
  cream: { fill: "#fdf6e3", ink: "rgba(0,0,0,0.12)" },
  slate: { fill: "#0f172a", ink: "rgba(255,255,255,0.18)" },
  ink: { fill: "#1f2328", ink: "rgba(255,255,255,0.16)" },
};

export const PATTERN_LABELS: Record<BackgroundPattern, string> = {
  dots: "Dots",
  grid: "Grid",
  lines: "Lines",
  iso: "Iso",
  blank: "Blank",
};

export const TONE_LABELS: Record<BackgroundTone, string> = {
  paper: "Paper",
  white: "White",
  cream: "Cream",
  slate: "Slate",
  ink: "Ink",
};

export function isDarkTone(tone: BackgroundTone) {
  return tone === "slate" || tone === "ink";
}

export function isDarkBackground(style: BackgroundStyle): boolean {
  if (style.customFill) {
    const ink = inkColorFor(style.customFill);
    return ink.startsWith("rgba(255");
  }
  return isDarkTone(style.tone);
}

/**
 * Renders the background into the canvas. Call BEFORE applying view transform.
 * `view` is needed so patterns scale/translate with pan + zoom.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: { panX: number; panY: number; zoom: number },
  style: BackgroundStyle,
) {
  const colors = resolveBackgroundColors(style);
  ctx.save();
  ctx.fillStyle = colors.fill;
  ctx.fillRect(0, 0, width, height);

  if (style.pattern === "blank") {
    ctx.restore();
    return;
  }

  const baseStep = 24;
  const step = baseStep * view.zoom;
  if (step < 6) {
    // too dense to be useful
    ctx.restore();
    return;
  }

  const offX = ((view.panX % step) + step) % step;
  const offY = ((view.panY % step) + step) % step;

  ctx.fillStyle = colors.ink;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1;

  if (style.pattern === "dots") {
    const r = Math.max(0.6, view.zoom * 0.6);
    for (let x = offX; x < width; x += step) {
      for (let y = offY; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style.pattern === "grid") {
    ctx.beginPath();
    for (let x = offX; x < width; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = offY; y < height; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
  } else if (style.pattern === "lines") {
    ctx.beginPath();
    for (let y = offY; y < height; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
  } else if (style.pattern === "iso") {
    // Isometric grid: vertical lines + two diagonals
    const dxStep = step;
    const tan30 = Math.tan(Math.PI / 6); // ~0.577
    ctx.beginPath();
    for (let x = offX - height * tan30; x < width + height * tan30; x += dxStep) {
      // diagonal up-right
      ctx.moveTo(x, height);
      ctx.lineTo(x + height * tan30, 0);
      // diagonal up-left
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * tan30, height);
    }
    ctx.stroke();
  }
  ctx.restore();
}
