"use client";

/*
  AsciiField: a canvas character-grid engine.

  A *program* fills two typed arrays every frame (char code + palette index
  per cell); the engine paints them. Glyphs are pre-rendered into an atlas
  canvas, one slot per (char, colour), so each frame is just drawImage calls.

  - pauses when off-screen (IntersectionObserver) or the tab is hidden
  - fps cap (default 60, 30 on narrow screens)
  - prefers-reduced-motion → one static frame, redrawn on resize only
  - palette entries: "--ink" (CSS var on the canvas), "#fff", or either with
    "@alpha" ("#ffffff@0.35")
*/
import { useEffect, useRef, type MutableRefObject } from "react";
import "./ascii.css";

export type FieldGrid = {
  cols: number;
  rows: number;
  /** char code per cell (0 or 32 = empty) */
  ch: Uint16Array;
  /** palette index per cell */
  col: Uint8Array;
  /** cell size in CSS px */
  cellW: number;
  cellH: number;
  /** field size in CSS px */
  width: number;
  height: number;
  /** ask for a repaint (for still fields whose data arrives later, e.g. an image) */
  invalidate: () => void;
};

export type FieldInput = {
  /** pointer position in cells (−1 when unknown) */
  x: number;
  y: number;
  /** pointer is over the field */
  inside: boolean;
  /** recent taps/clicks in cells, with time (s) */
  clicks: { x: number; y: number; t: number }[];
  /** values written from outside (scroll progress etc.) */
  ext: Record<string, number>;
  /** true on narrow / touch screens */
  narrow: boolean;
};

export type FieldProgram = {
  palette: string[];
  /** called after every (re)size, before the next frame */
  resize?(g: FieldGrid, narrow: boolean): void;
  frame(g: FieldGrid, t: number, input: FieldInput): void;
};

type Props = {
  /** factory, called once per mount */
  program: () => FieldProgram;
  /** CSS px font size for the given field size */
  fontSize?: (w: number, h: number) => number;
  /** upper bound on cell count; font grows to stay under it */
  maxCells?: number;
  fps?: number;
  fontWeight?: number;
  /** line height as a multiple of font size */
  lineHeight?: number;
  control?: MutableRefObject<Record<string, number>>;
  /** listen to the pointer (window-level, so DOM on top stays clickable) */
  interactive?: boolean;
  /** draw once (and on resize / invalidate) instead of animating: near-zero cost */
  still?: boolean;
  /** time (s) passed to a still frame */
  stillTime?: number;
  className?: string;
};

const DEFAULT_SIZE = (w: number) => (w < 760 ? 10 : 13);

export function AsciiField({
  program,
  fontSize = DEFAULT_SIZE,
  maxCells = 16000,
  fps = 60,
  fontWeight = 500,
  lineHeight = 1.2,
  control,
  interactive = false,
  still: stillProp = false,
  stillTime = 6,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Latest props for the effect without re-running it.
  const optsRef = useRef({ fontSize, maxCells, fps, fontWeight, lineHeight, interactive, control, stillProp, stillTime });
  useEffect(() => {
    optsRef.current = { fontSize, maxCells, fps, fontWeight, lineHeight, interactive, control, stillProp, stillTime };
  });
  const programRef = useRef(program);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d", { alpha: true });
    if (!wrap || !cv || !ctx) return;

    const prog = programRef.current();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atlas = document.createElement("canvas");
    const actx = atlas.getContext("2d");
    if (!actx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let cw = 8;
    let chh = 16;
    let fontPx = 13;
    let family = "monospace";
    let colors: { c: string; a: number }[] = [];
    const SLOTS_X = 64;
    const SLOTS_Y = 64;
    let slots = new Map<number, number>();
    let nextSlot = 0;
    let narrow = false;
    const grid: FieldGrid = {
      cols: 0,
      rows: 0,
      ch: new Uint16Array(0),
      col: new Uint8Array(0),
      cellW: 8,
      cellH: 16,
      width: 0,
      height: 0,
      invalidate: () => {
        if (!running) still();
      },
    };
    const input: FieldInput = { x: -1, y: -1, inside: false, clicks: [], ext: {}, narrow: false };

    const resolvePalette = () => {
      const cs = getComputedStyle(cv);
      colors = prog.palette.map((p) => {
        const [raw, al] = p.split("@");
        const c = raw.startsWith("--") ? cs.getPropertyValue(raw).trim() || "#fff" : raw;
        return { c, a: al ? parseFloat(al) : 1 };
      });
      family = cs.fontFamily || "monospace";
    };

    const resetAtlas = () => {
      atlas.width = SLOTS_X * cw;
      atlas.height = SLOTS_Y * chh;
      actx.clearRect(0, 0, atlas.width, atlas.height);
      actx.font = `${optsRef.current.fontWeight} ${fontPx}px ${family}`;
      actx.textBaseline = "middle";
      actx.textAlign = "center";
      slots = new Map();
      nextSlot = 0;
    };

    const slotFor = (code: number, ci: number) => {
      const key = code * 256 + ci;
      let s = slots.get(key);
      if (s !== undefined) return s;
      if (nextSlot >= SLOTS_X * SLOTS_Y) resetAtlas();
      s = nextSlot++;
      const sx = (s % SLOTS_X) * cw;
      const sy = Math.floor(s / SLOTS_X) * chh;
      const col = colors[ci] ?? colors[0];
      actx.globalAlpha = col.a;
      actx.fillStyle = col.c;
      const chr = String.fromCharCode(code);
      // block elements fill the whole cell so they tile without seams
      if (code >= 0x2580 && code <= 0x2588) {
        if (code === 0x2588) actx.fillRect(sx, sy, cw, chh);
        else if (code === 0x2580) actx.fillRect(sx, sy, cw, Math.ceil(chh / 2));
        else if (code === 0x2584) actx.fillRect(sx, sy + Math.floor(chh / 2), cw, Math.ceil(chh / 2));
        else actx.fillText(chr, sx + cw / 2, sy + chh / 2);
      } else {
        actx.fillText(chr, sx + cw / 2, sy + chh / 2 + fontPx * 0.04);
      }
      slots.set(key, s);
      return s;
    };

    const size = () => {
      const r = wrap.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      narrow = W < 760 || window.matchMedia("(pointer: coarse)").matches;
      input.narrow = narrow;
      dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
      const o = optsRef.current;
      let fs = o.fontSize(W, H);
      // grow the font until the grid fits the cell budget
      const est = (f: number) => (W / (f * 0.6)) * (H / (f * o.lineHeight));
      while (est(fs) > o.maxCells) fs += 0.5;
      fontPx = Math.round(fs * dpr);
      resolvePalette();
      ctx.font = `${o.fontWeight} ${fontPx}px ${family}`;
      cw = Math.max(1, Math.round(ctx.measureText("M").width));
      chh = Math.max(1, Math.round(fontPx * o.lineHeight));
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      grid.cols = Math.ceil(cv.width / cw);
      grid.rows = Math.ceil(cv.height / chh);
      grid.ch = new Uint16Array(grid.cols * grid.rows);
      grid.col = new Uint8Array(grid.cols * grid.rows);
      grid.cellW = cw / dpr;
      grid.cellH = chh / dpr;
      grid.width = W;
      grid.height = H;
      resetAtlas();
      prog.resize?.(grid, narrow);
    };

    const paint = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const { cols, rows, ch, col } = grid;
      for (let y = 0; y < rows; y++) {
        const dy = y * chh;
        const base = y * cols;
        for (let x = 0; x < cols; x++) {
          const i = base + x;
          const code = ch[i];
          if (code === 0 || code === 32) continue;
          const s = slotFor(code, col[i]);
          ctx.drawImage(atlas, (s % SLOTS_X) * cw, Math.floor(s / SLOTS_X) * chh, cw, chh, x * cw, dy, cw, chh);
        }
      }
    };

    const t0 = performance.now();
    let raf = 0;
    let last = 0;
    let visible = true;
    let running = false;

    const step = (now: number) => {
      raf = 0;
      if (!running) return;
      raf = requestAnimationFrame(step);
      const cap = narrow ? Math.min(30, optsRef.current.fps) : optsRef.current.fps;
      if (now - last < 1000 / cap - 2) return;
      last = now;
      input.ext = optsRef.current.control?.current ?? {};
      const t = (now - t0) / 1000;
      input.clicks = input.clicks.filter((c) => t - c.t < 3);
      prog.frame(grid, t, input);
      paint();
    };

    const still = () => {
      input.ext = optsRef.current.control?.current ?? {};
      prog.frame(grid, optsRef.current.stillTime, input);
      paint();
    };

    const start = () => {
      if (mq.matches || optsRef.current.stillProp) {
        running = false;
        still();
        return;
      }
      if (running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const toCell = (cx: number, cy: number) => {
      const r = cv.getBoundingClientRect();
      const lx = cx - r.left;
      const ly = cy - r.top;
      return {
        x: (lx * dpr) / cw,
        y: (ly * dpr) / chh,
        inside: lx >= 0 && ly >= 0 && lx <= r.width && ly <= r.height,
      };
    };
    const onMove = (e: PointerEvent) => {
      if (!optsRef.current.interactive) return;
      const p = toCell(e.clientX, e.clientY);
      input.x = p.x;
      input.y = p.y;
      input.inside = p.inside;
    };
    const onDown = (e: PointerEvent) => {
      if (!optsRef.current.interactive) return;
      const p = toCell(e.clientX, e.clientY);
      if (p.inside) input.clicks.push({ x: p.x, y: p.y, t: (performance.now() - t0) / 1000 });
      input.x = p.x;
      input.y = p.y;
      input.inside = p.inside;
    };
    const onLeave = () => {
      input.inside = false;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) start();
        else stop();
      },
      { rootMargin: "100px" },
    );
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const prevW = W;
        const prevH = H;
        const r = wrap.getBoundingClientRect();
        // ignore mobile toolbar jitter
        if (Math.abs(r.width - prevW) < 1 && Math.abs(r.height - prevH) < 120 && prevW) return;
        size();
        if (!running) still();
      });
    });
    const onVis = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      stop();
      start();
    };

    size();
    start();
    io.observe(wrap);
    ro.observe(wrap);
    document.addEventListener("visibilitychange", onVis);
    mq.addEventListener("change", onMotion);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    // web fonts land after first paint: rebuild metrics + atlas once they do
    document.fonts?.ready.then(() => {
      size();
      if (!running) still();
    });

    return () => {
      stop();
      cancelAnimationFrame(resizeRaf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", onMotion);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`ascii-field ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ---------- small helpers for programs ---------- */

/** Deterministic hash → 0..1 */
export function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const RAMP = " .,:;-=+*#%@";
export const code = (s: string) => s.charCodeAt(0);
