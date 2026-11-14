/*
  Real images → ASCII. Monochrome: luminance picks the glyph (70-step ramp)
  and its white alpha.

  The ASCII never needs a big file: same-origin images go through our own
  /_next/image optimiser as a ~128px thumbnail (≈2–4 KB). Processing:
  auto-levels (3rd–97th percentile), local contrast (unsharp mask against a
  wide box blur), a mid-tone lift and an optional vignette (portraits).
*/
import type { FieldGrid, FieldProgram } from "./AsciiField";
import { MONO_PALETTE, clamp01, shade, smooth } from "./noise";

export type ImageOpts = {
  /** darken the frame edges so a centred subject carries it (portraits) */
  vignette?: boolean;
  fit?: "cover" | "contain";
  /** thumbnail width requested from the optimiser */
  thumb?: 64 | 96 | 128 | 256;
  /** "tone" photos · "lines" edge-traced · "auto" (default): lines when the image is mostly bright */
  mode?: "auto" | "tone" | "lines";
};

export function thumbUrl(src: string, w = 128): string {
  if (src.startsWith("/") && !src.startsWith("//") && !src.startsWith("/_next/")) {
    // q must be one of images.qualities (Next 16 default: [75])
    return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
  }
  return src;
}

const put = (g: FieldGrid, i: number, lum: number) => {
  const [c, l] = shade(lum, 1);
  g.ch[i] = c;
  g.col[i] = l;
};

/** Draw a source (image / video frame) into a cols×rows luminance array. */
export function sampleLuma(
  g: FieldGrid,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  fit: "cover" | "contain",
  ctx: CanvasRenderingContext2D,
): Float32Array {
  const { cols, rows } = g;
  if (ctx.canvas.width !== cols || ctx.canvas.height !== rows) {
    ctx.canvas.width = cols;
    ctx.canvas.height = rows;
  }
  ctx.clearRect(0, 0, cols, rows);
  // fit in CSS px, then convert to cells (cells are ~2:1, so x and y differ)
  const s = fit === "cover" ? Math.max(g.width / sw, g.height / sh) : Math.min(g.width / sw, g.height / sh);
  const dw = (sw * s) / g.cellW;
  const dh = (sh * s) / g.cellH;
  ctx.drawImage(src, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
  const d = ctx.getImageData(0, 0, cols, rows).data;
  const n = cols * rows;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // transparent pixels (contain letterbox) read as black
    raw[i] = ((d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255) * (d[i * 4 + 3] / 255);
  }
  return raw;
}

/** Auto-levels + local contrast (+ optional vignette). radius in cells. */
export function enhance(raw: Float32Array, cols: number, rows: number, vignette: boolean, rx = 6, ry = 3): Float32Array {
  const n = cols * rows;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.floor(raw[i] * 255))]++;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let b = 0; b < 256; b++) {
    acc += hist[b];
    if (acc < n * 0.03) lo = b;
    if (acc <= n * 0.97) hi = b;
  }
  const lo01 = lo / 255;
  const span = Math.max(0.08, (hi - lo) / 255);

  // box blur via a summed-area table: O(n) whatever the radius
  const W1 = cols + 1;
  const sat = new Float64Array(W1 * (rows + 1));
  for (let y = 0; y < rows; y++) {
    let rowSum = 0;
    for (let x = 0; x < cols; x++) {
      rowSum += raw[y * cols + x];
      sat[(y + 1) * W1 + x + 1] = sat[y * W1 + x + 1] + rowSum;
    }
  }
  const out = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    const y0 = Math.max(0, y - ry);
    const y1 = Math.min(rows, y + ry + 1);
    for (let x = 0; x < cols; x++) {
      const x0 = Math.max(0, x - rx);
      const x1 = Math.min(cols, x + rx + 1);
      const sum = sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const i = y * cols + x;
      let v = clamp01((raw[i] + (raw[i] - mean) * 1.1 - lo01) / span);
      v = Math.pow(v, 0.82); // lift mid-tones
      if (vignette) {
        const ux = (x / cols - 0.5) * 2;
        const uy = (y / rows - 0.42) * 2;
        v *= 1 - 0.6 * smooth(0.55, 1.15, Math.sqrt(ux * ux * 0.8 + uy * uy));
      }
      out[i] = v;
    }
  }
  return out;
}

/*
  Line art for bright images (light-mode UI screenshots). Tone mapping turns a
  mostly-white screenshot into a solid wall of dense glyphs; tracing its edges
  (Sobel on the cell grid) instead draws the boxes, text lines and buttons,
  over a faint tone so large shapes still read.
*/
function lineArt(raw: Float32Array, tone: Float32Array, cols: number, rows: number): Float32Array {
  const out = new Float32Array(cols * rows);
  const at = (x: number, y: number) =>
    raw[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      // cells are ~2:1 tall, so vertical neighbours are further apart: weight up
      const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * 1.4;
      const e = Math.sqrt(gx * gx + gy * gy);
      const i = y * cols + x;
      out[i] = clamp01(Math.pow(clamp01(e * 1.6), 0.75) + tone[i] * 0.12);
    }
  }
  return out;
}

/** Still image → ASCII (drawn once; repaints itself when the thumbnail lands). */
export function imageProgram(src: string, opts: ImageOpts = {}): () => FieldProgram {
  const { vignette = false, fit = "cover", thumb = 128 } = opts;
  // portraits (vignette) always keep full tone
  const mode = opts.mode ?? (vignette ? "tone" : "auto");
  return () => {
    let lum: Float32Array | null = null;
    let img: HTMLImageElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    const sample = (g: FieldGrid) => {
      if (!img || !img.complete || !img.naturalWidth) return;
      ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const raw = sampleLuma(g, img, img.naturalWidth, img.naturalHeight, fit, ctx);
      const tone = enhance(raw, g.cols, g.rows, vignette);
      // "auto": photos keep full tone; bright screenshots become line art
      let mean = 0;
      for (let i = 0; i < raw.length; i++) mean += raw[i];
      mean /= raw.length || 1;
      const lines = mode === "lines" || (mode === "auto" && mean > 0.5);
      lum = lines ? lineArt(raw, tone, g.cols, g.rows) : tone;
    };
    return {
      palette: MONO_PALETTE,
      resize(g) {
        if (!img) {
          img = new Image();
          img.decoding = "async";
          img.onload = () => {
            sample(g);
            g.invalidate();
          };
          img.src = thumbUrl(src, thumb);
        } else sample(g);
      },
      frame(g) {
        if (!lum || lum.length !== g.cols * g.rows) {
          g.ch.fill(32);
          return;
        }
        for (let i = 0; i < lum.length; i++) put(g, i, Math.pow(lum[i], 1.1));
      },
    };
  };
}
