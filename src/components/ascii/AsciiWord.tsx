"use client";

/*
  AsciiWord: a word set in the Maname serif, rendered as dense ASCII.

  The word is rasterised on an offscreen canvas at several samples per glyph
  cell, then lit like a bevelled, extruded slab: a distance-to-edge height
  field gives each stroke a rounded shoulder, a top-left light shades it, and
  the extrusion falls away down-right in fine dim hatching. Edge cells pick
  glyphs by the direction of the contour ( / \ | - _ ) so the letterforms stay
  crisp; the core is near-solid. Drawn once (redrawn on resize only).

  Decorative: the wrapper is aria-hidden; the page's real heading carries the
  text. Until the canvas is ready, a faint serif fallback holds the space.
*/
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AsciiField, type FieldGrid, type FieldProgram } from "./AsciiField";
import { MONO_PALETTE, LEVELS, RAMP_CODES, RN, fbm2, h3, clamp01 } from "./noise";

/* layout of the slab inside its box, in units of the text's ink height */
const EXTRUDE = 0.075;
const MARGIN = 0.035;

const boxOf = (tw: number, th: number) => ({
  w: tw + th * (EXTRUDE + MARGIN * 2),
  h: th * (1 + EXTRUDE + MARGIN * 2),
});

const FALLBACK_FAMILY = '"Iowan Old Style", Georgia, serif';

function resolveFamily(el: Element): string {
  const v = getComputedStyle(el).getPropertyValue("--serif").trim();
  return v || FALLBACK_FAMILY;
}

function measure(word: string, family: string) {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return null;
  c.font = `400 100px ${family}`;
  const m = c.measureText(word);
  const tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (!(tw > 0 && th > 0)) return null;
  return { tw, th, left: m.actualBoundingBoxLeft, ascent: m.actualBoundingBoxAscent };
}

const C = (s: string) => s.charCodeAt(0);
const G = {
  pipe: C("|"),
  dash: C("-"),
  under: C("_"),
  slash: C("/"),
  back: C("\\"),
  dot: C("."),
  comma: C(","),
  tick: C("'"),
  colon: C(":"),
  quote: C('"'),
};

function wordProgram(word: string, family: string, gain: number): FieldProgram {
  let outCh = new Uint16Array(0);
  let outCol = new Uint8Array(0);

  const lv = (l: number) => Math.max(0, Math.min(LEVELS - 1, Math.round(clamp01(l * gain) * (LEVELS - 1))));
  const ramp = (l: number) => RAMP_CODES[Math.max(1, Math.min(RN - 1, Math.round(clamp01(l) * (RN - 1))))];

  const build = (g: FieldGrid) => {
    const { cols, rows } = g;
    outCh = new Uint16Array(cols * rows);
    outCol = new Uint8Array(cols * rows);
    const met = measure(word, family);
    if (!met || cols < 2 || rows < 2) return;

    // supersampled mask: SX x SY samples per cell, roughly square samples
    const SX = 4;
    const SY = Math.max(4, Math.round((SX * g.cellH) / g.cellW));
    const MW = cols * SX;
    const MH = rows * SY;
    const pa = g.cellH / SY / (g.cellW / SX); // sample aspect (h / w)
    const cv = document.createElement("canvas");
    cv.width = MW;
    cv.height = MH;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // fit the slab box into the field (field units = horizontal samples)
    const box = boxOf(met.tw, met.th);
    const fieldW = MW;
    const fieldH = MH * pa;
    const s = Math.min(fieldW / box.w, fieldH / box.h);
    const ox = (fieldW - box.w * s) / 2 + met.th * MARGIN * s;
    const oy = (fieldH - box.h * s) / 2 + met.th * MARGIN * s;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, MW, MH);
    ctx.save();
    ctx.scale(1, 1 / pa);
    ctx.font = `400 ${100 * s}px ${family}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    ctx.fillText(word, ox + met.left * s, oy + met.ascent * s);
    ctx.restore();

    const px = ctx.getImageData(0, 0, MW, MH).data;
    const N = MW * MH;
    const m = new Float32Array(N);
    for (let i = 0; i < N; i++) m[i] = px[i * 4] / 255;

    // chamfer distance to the outside (in samples), for the bevel
    const D = new Float32Array(N);
    const INF = 1e6;
    for (let i = 0; i < N; i++) D[i] = m[i] > 0.5 ? INF : 0;
    const R2 = Math.SQRT2;
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const i = y * MW + x;
        if (D[i] === 0) continue;
        let d = D[i];
        d = Math.min(d, x > 0 ? D[i - 1] + 1 : 1);
        d = Math.min(d, y > 0 ? D[i - MW] + pa : pa);
        if (y > 0) {
          d = Math.min(d, x > 0 ? D[i - MW - 1] + R2 : R2);
          d = Math.min(d, x < MW - 1 ? D[i - MW + 1] + R2 : R2);
        }
        D[i] = d;
      }
    }
    let maxD = 0;
    for (let y = MH - 1; y >= 0; y--) {
      for (let x = MW - 1; x >= 0; x--) {
        const i = y * MW + x;
        if (D[i] === 0) continue;
        let d = D[i];
        d = Math.min(d, x < MW - 1 ? D[i + 1] + 1 : 1);
        d = Math.min(d, y < MH - 1 ? D[i + MW] + pa : pa);
        if (y < MH - 1) {
          d = Math.min(d, x < MW - 1 ? D[i + MW + 1] + R2 : R2);
          d = Math.min(d, x > 0 ? D[i + MW - 1] + R2 : R2);
        }
        D[i] = d;
        if (d > maxD) maxD = d;
      }
    }

    // height field: a rounded shoulder of width B, flat on top
    const B = Math.max(1.5, maxD * 0.85);
    const Hf = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = Math.min(1, D[i] / B);
      Hf[i] = m[i] > 0.5 ? Math.sqrt(1 - (1 - t) * (1 - t)) : 0;
    }

    // extrusion: the face swept down-right, visible only outside the face
    const ext = Math.max(2, Math.round(met.th * EXTRUDE * s));
    const E = new Float32Array(N); // 0 = none, else 1 (near the face) .. 0+ (far)
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const i = y * MW + x;
        if (m[i] > 0.5) continue;
        for (let k = 1; k <= ext; k++) {
          const sx = x - k;
          const sy = y - Math.round(k / pa);
          if (sx < 0 || sy < 0) break;
          if (m[sy * MW + sx] > 0.5) {
            E[i] = 1 - (k - 1) / ext;
            break;
          }
        }
      }
    }

    // light from the top-left, slightly in front
    const Lx = -0.52;
    const Ly = -0.62;
    const Lz = 0.59;
    const k = B * 0.55; // bevel steepness (height is 0..1 over B samples)

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        let cov = 0;
        let lit = 0;
        let exc = 0;
        let exv = 0;
        let gx = 0;
        let gy = 0;
        let mx = 0;
        let my = 0;
        for (let sy = 0; sy < SY; sy++) {
          const y = cy * SY + sy;
          for (let sx = 0; sx < SX; sx++) {
            const x = cx * SX + sx;
            const i = y * MW + x;
            const a = m[i];
            if (a > 0.02) {
              cov += a;
              mx += a * (sx + 0.5 - SX / 2) / SX;
              my += a * (sy + 0.5 - SY / 2) / SY;
              // surface normal from the height field
              const hl = x > 0 ? Hf[i - 1] : 0;
              const hr = x < MW - 1 ? Hf[i + 1] : 0;
              const hu = y > 0 ? Hf[i - MW] : 0;
              const hd = y < MH - 1 ? Hf[i + MW] : 0;
              const nx = -(hr - hl) * k;
              const ny = -(hd - hu) * k / pa;
              const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
              const ndl = (nx * Lx + ny * Ly + Lz) * inv;
              // rim highlight on lit shoulders, darker on the far side
              const spec = Math.pow(Math.max(0, ndl), 18) * 0.5;
              lit += a * (0.1 + 1.25 * Math.pow(Math.max(0, ndl), 1.25) + spec);
            }
            if (E[i] > 0) {
              exc += 1;
              exv += E[i];
            }
            // contour direction (mask gradient)
            const ml = x > 0 ? m[i - 1] : 0;
            const mr = x < MW - 1 ? m[i + 1] : 0;
            const mu = y > 0 ? m[i - MW] : 0;
            const md = y < MH - 1 ? m[i + MW] : 0;
            gx += mr - ml;
            gy += (md - mu) / pa;
          }
        }
        const n = SX * SY;
        const c = cov / n;
        const o = cy * cols + cx;
        const grain = (h3(cx, cy, 7) - 0.5) * 0.12;
        const tex = 0.86 + 0.28 * fbm2(cx * 0.09, cy * 0.18, 3);

        if (c > 0.82) {
          // core: near-solid, lit
          const l = clamp01((lit / cov) * tex + grain);
          outCh[o] = ramp(0.42 + l * 0.58);
          outCol[o] = lv(0.12 + l * 0.95);
        } else if (c > 0.1) {
          // edge: a glyph that follows the contour
          const l = clamp01((lit / Math.max(cov, 1e-3)) * 0.9 + grain);
          const ux = mx / cov;
          const uy = my / cov;
          let code: number;
          if (c < 0.3) {
            // a sliver: a small mark on the side the ink sits
            code = Math.abs(uy) > Math.abs(ux) * 1.4 ? (uy > 0 ? G.dot : G.tick) : uy > 0.1 ? G.comma : G.colon;
          } else {
            // gradient points into the ink; the contour runs across it
            const ang = Math.atan2(gy, gx); // −π..π
            const a = ((ang % Math.PI) + Math.PI) % Math.PI; // 0..π
            const hz = Math.abs(a - Math.PI / 2) < Math.PI / 8; // gradient vertical → contour horizontal
            const vt = a < Math.PI / 8 || a > (Math.PI * 7) / 8;
            if (hz) code = uy > 0.12 ? G.under : uy < -0.12 ? G.quote : G.dash;
            else if (vt) code = G.pipe;
            else code = a < Math.PI / 2 ? G.slash : G.back;
            if (c > 0.66 && !hz) code = ramp(0.55 + l * 0.3);
          }
          outCh[o] = code;
          outCol[o] = lv(0.18 + l * 0.75 * (0.5 + c * 0.6));
        } else if (exc > n * 0.3) {
          // extrusion: dim, finely hatched, fading with depth
          const d = exv / exc;
          const hatch = (cx + cy * 2) % 3 === 0;
          const l = 0.12 + d * 0.22 + (hatch ? 0.08 : 0);
          outCh[o] = hatch ? G.slash : ramp(0.08 + d * 0.22 + grain * 0.3);
          outCol[o] = lv(l);
        } else {
          // ground: very sparse dust so the slab sits in a field, not a void
          const dust = h3(cx, cy, 3);
          if (dust < 0.018) {
            outCh[o] = G.dot;
            outCol[o] = 0;
          }
        }
      }
    }
  };

  return {
    palette: MONO_PALETTE,
    resize(g) {
      build(g);
    },
    frame(g) {
      if (outCh.length !== g.ch.length) {
        g.ch.fill(32);
        return;
      }
      g.ch.set(outCh);
      g.col.set(outCol);
    },
  };
}

type Ready = { family: string; ar: number };

export function AsciiWord({
  word,
  gain = 1,
  className = "",
  style,
}: {
  word: string;
  /** brightness multiplier (1 = full white core) */
  gain?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<Ready | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const family = resolveFamily(el);
    const go = () => {
      if (!alive) return;
      const met = measure(word, family);
      if (!met) return;
      const b = boxOf(met.tw, met.th);
      setReady({ family, ar: b.w / b.h });
    };
    const fonts = document.fonts;
    if (fonts?.load) fonts.load(`400 100px ${family}`, word).then(go, go);
    else go();
    return () => {
      alive = false;
    };
  }, [word]);

  const program = useMemo(
    () => (ready ? () => wordProgram(word, ready.family, gain) : null),
    [ready, word, gain],
  );

  // until measured, estimate: Maname capitals run ~0.78em wide per letter
  const ar = ready?.ar ?? Math.max(1, word.length * 0.82 + 0.15);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`ascii-word ${className}`.trim()}
      data-ready={ready ? "" : undefined}
      style={{ ...style, ["--ar" as string]: ar.toFixed(4) }}
    >
      {program ? (
        <AsciiField
          key={`${ready?.family}|${ar.toFixed(3)}`}
          program={program}
          fontSize={(_, h) => Math.min(9, Math.max(4.5, h / 30))}
          maxCells={26000}
          still
          fontWeight={500}
          lineHeight={1.12}
        />
      ) : (
        <span className="ascii-word__fallback">{word}</span>
      )}
    </div>
  );
}
