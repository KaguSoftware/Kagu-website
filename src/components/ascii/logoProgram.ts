/*
  Home hero artwork: the Kagu mark as a solid white 3D slab, ray-traced into
  ASCII every frame, over a crowded, chaotic monochrome field.

  The mark
    - RIBBON / FOLD / WING (KaguMark) are rasterised once into a mask; the
      mask is extruded into a slab of thickness 2·D.
    - Each frame the slab turns (slow yaw/pitch drift + pointer tilt). Every
      cell in its screen bbox casts an orthographic ray into object space:
      front/back faces hit directly, side walls are found by marching through
      the slab and refining with bisection; wall normals come from the
      gradient of a blurred copy of the mask.
    - Shading: Lambert + specular from a light that follows the cursor, a
      glint that sweeps across the face, per-piece tone (wing brightest).
      Glyphs come from the dense end of a 70-step ramp, in near-solid white.
    - Assembles out of noise on load; shatters into falling dust on scroll.
  The field (dim, so the mark always reads; a dark halo keeps its edge clean)
    two interfering contour fields · glyph rain · flicker · glitch rows ·
    pointer lens · click ripples
  ext.k (0..1 scroll) in; ext.yaw / ext.sun (degrees) out for the readout.
*/
import { FOLD, RIBBON, WING } from "@/components/KaguMark";
import type { FieldProgram } from "@/components/ascii/AsciiField";
import { MONO_PALETTE, RAMP_CODES, RN, clamp01, fbm2, fract, h3, smooth } from "@/components/ascii/noise";

const MW = 720;
const MH = 324;
const OBJ_H = (486 / 1079) * 2; // object-space height when width = 2
const D = 0.075; // half thickness
const FIELD = ".,:;-=+*#";
const RAIN = "|!:;+*=#%&$@?/";
const FLICK = ".:+*/\\|-=";

type V3 = [number, number, number];

export type LogoOpts = {
  /** the chaotic background field + halo (hero only) */
  field?: boolean;
  /** "hero": big, upper-centre; "fit": centred, fitted to the box */
  place?: "hero" | "fit";
};

/** The hero: full scene. */
export const logoProgram = () => createLogoProgram({ field: true, place: "hero" });

export function createLogoProgram(opts: LogoOpts = {}): FieldProgram {
  const withField = opts.field ?? true;
  const fit = opts.place === "fit";
  // ---- mask (built once) ----
  let piece: Uint8Array | null = null; // 0 none, 1 ribbon, 2 fold, 3 wing
  let field: Float32Array | null = null; // blurred coverage, for wall normals

  const buildMask = () => {
    const cv = document.createElement("canvas");
    cv.width = MW;
    cv.height = MH;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const s = MW / 1079;
    const read = (path: string) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, MW, MH);
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.fillStyle = "#fff";
      ctx.fill(new Path2D(path));
      return ctx.getImageData(0, 0, MW, MH).data;
    };
    const rib = read(RIBBON);
    const fol = read(FOLD);
    const win = read(WING);
    piece = new Uint8Array(MW * MH);
    const cov = new Float32Array(MW * MH);
    for (let i = 0; i < MW * MH; i++) {
      const r = rib[i * 4 + 3];
      const f = fol[i * 4 + 3];
      const w = win[i * 4 + 3];
      const m = Math.max(r, f, w);
      cov[i] = m / 255;
      if (m >= 128) piece[i] = w >= 128 ? 3 : f >= 128 ? 2 : 1;
    }
    // two box-blur passes (radius 3) → smooth gradients for side-wall normals
    const blur = (src: Float32Array) => {
      const tmp = new Float32Array(src.length);
      const out = new Float32Array(src.length);
      const R = 3;
      for (let y = 0; y < MH; y++) {
        let acc = 0;
        for (let x = -R; x <= R; x++) acc += src[y * MW + Math.min(MW - 1, Math.max(0, x))];
        for (let x = 0; x < MW; x++) {
          tmp[y * MW + x] = acc / (2 * R + 1);
          acc += src[y * MW + Math.min(MW - 1, x + R + 1)] - src[y * MW + Math.max(0, x - R)];
        }
      }
      for (let x = 0; x < MW; x++) {
        let acc = 0;
        for (let y = -R; y <= R; y++) acc += tmp[Math.min(MH - 1, Math.max(0, y)) * MW + x];
        for (let y = 0; y < MH; y++) {
          out[y * MW + x] = acc / (2 * R + 1);
          acc += tmp[Math.min(MH - 1, y + R + 1) * MW + x] - tmp[Math.max(0, y - R) * MW + x];
        }
      }
      return out;
    };
    field = blur(blur(cov));
  };

  // object-space point → mask lookups
  const mi = (x: number, y: number) => {
    const mx = Math.floor(((x + 1) / 2) * MW);
    const my = Math.floor(((OBJ_H / 2 - y) / OBJ_H) * MH);
    if (mx < 0 || my < 0 || mx >= MW || my >= MH) return -1;
    return my * MW + mx;
  };

  let W = 1;
  let H = 1;
  let cw = 6;
  let chh = 12;
  let aspect = 2;
  let narrow = false;
  let hit = new Uint8Array(0); // per cell: logo drawn here this frame
  let halo = new Uint8Array(0);
  let lch = new Uint16Array(0);
  let lcol = new Uint8Array(0);
  let rowBuf = new Uint16Array(0);
  let rowCol = new Uint8Array(0);
  let drops: { x: number; speed: number; off: number; len: number }[] = [];
  let L: V3 = [-0.45, 0.5, 0.74];
  let yawS = 0;
  let pitchS = 0;

  return {
    palette: MONO_PALETTE,

    resize(g, isNarrow) {
      if (!piece) buildMask();
      W = g.width;
      H = g.height;
      cw = g.cellW;
      chh = g.cellH;
      aspect = chh / cw;
      narrow = isNarrow;
      const n = g.cols * g.rows;
      hit = new Uint8Array(n);
      halo = new Uint8Array(n);
      lch = new Uint16Array(n);
      lcol = new Uint8Array(n);
      rowBuf = new Uint16Array(g.cols);
      rowCol = new Uint8Array(g.cols);
      const count = Math.round(g.cols * (narrow ? 0.24 : 0.36));
      drops = Array.from({ length: count }, (_, i) => ({
        x: Math.floor(h3(i, 3, 91) * g.cols),
        speed: 5 + h3(i, 5, 17) * 20,
        off: h3(i, 9, 33) * 400,
        len: 4 + Math.floor(h3(i, 11, 5) * 14),
      }));
    },

    frame(g, t, input) {
      const { cols, rows, ch, col } = g;
      const ext = input.ext;
      const k = clamp01(ext.k ?? 0);
      const tick = Math.floor(t * 10);
      ch.fill(32);
      hit.fill(0);

      // ---- placement: the mark is the hero ----
      // px per object unit
      const S = fit
        ? Math.min(W * 0.44, (H * 0.8) / OBJ_H)
        : (narrow ? W * 0.9 : Math.min(W * 0.66, 1250)) / 2;
      const cx = W / 2;
      const cy = fit ? H / 2 : narrow ? H * 0.3 : H * 0.4;

      // ---- pose: drift + pointer tilt, smoothed ----
      // hero: pointer over the field; fit: anywhere on the page (window-level),
      // clamped, so a small logo still looks toward the cursor
      const known = fit ? input.x !== -1 : input.inside;
      const lim = (v: number) => (v < -1.6 ? -1.6 : v > 1.6 ? 1.6 : v);
      const pxN = known ? lim((input.x * cw - cx) / (fit ? Math.max(W, 600) : W / 2)) : 0;
      const pyN = known ? lim((input.y * chh - cy) / (fit ? Math.max(H, 600) : H / 2)) : 0;
      const yawT = Math.sin(t * 0.33) * 0.42 + pxN * 0.35;
      const pitchT = Math.sin(t * 0.27 + 1) * 0.16 + pyN * 0.22;
      yawS += (yawT - yawS) * 0.06;
      pitchS += (pitchT - pitchS) * 0.06;
      const cy_ = Math.cos(yawS);
      const sy_ = Math.sin(yawS);
      const cp = Math.cos(pitchS);
      const sp = Math.sin(pitchS);
      // R = Ry(yaw) · Rx(pitch); view = R·obj ; obj = Rᵀ·view
      const R00 = cy_, R01 = sy_ * sp, R02 = sy_ * cp;
      const R10 = 0, R11 = cp, R12 = -sp;
      const R20 = -sy_, R21 = cy_ * sp, R22 = cy_ * cp;

      // light follows the pointer
      let lt: V3 = [-0.45 + Math.sin(t * 0.2) * 0.2, 0.5, 0.74];
      if (known) lt = [pxN * 1.4, -pyN * 1.2, 0.8];
      const ll = Math.hypot(lt[0], lt[1], lt[2]);
      L = [L[0] + (lt[0] / ll - L[0]) * 0.08, L[1] + (lt[1] / ll - L[1]) * 0.08, L[2] + (lt[2] / ll - L[2]) * 0.08];
      const Ln = Math.hypot(L[0], L[1], L[2]);
      const Lx = L[0] / Ln;
      const Ly = L[1] / Ln;
      const Lz = L[2] / Ln;
      ext.yaw = (yawS * 180) / Math.PI;
      ext.sun = (Math.atan2(Ly, Lx) * 180) / Math.PI;

      // ray dir in object space (view dir is -z): d' = Rᵀ·(0,0,-1)
      const dx = -R20;
      const dy = -R21;
      const dz = -R22;

      // ---- screen bbox of the slab ----
      let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      for (const ox of [-1, 1]) for (const oy of [-OBJ_H / 2, OBJ_H / 2]) for (const oz of [-D, D]) {
        const vx = R00 * ox + R01 * oy + R02 * oz;
        const vy = R10 * ox + R11 * oy + R12 * oz;
        bx0 = Math.min(bx0, vx); bx1 = Math.max(bx1, vx);
        by0 = Math.min(by0, vy); by1 = Math.max(by1, vy);
      }
      const c0 = Math.max(0, Math.floor((cx + bx0 * S) / cw) - 1);
      const c1 = Math.min(cols - 1, Math.ceil((cx + bx1 * S) / cw) + 1);
      const r0 = Math.max(0, Math.floor((cy - by1 * S) / chh) - 1);
      const r1 = Math.min(rows - 1, Math.ceil((cy - by0 * S) / chh) + 1);

      const intro = clamp01((t - 0.15) / 1.7);
      const glint = fract(t / 4.2) * 2.6 - 0.8; // sweeps across x+y every ~4s

      // ---- 1. ray-trace the mark ----
      if (piece && field) {
        const pc = piece;
        const fl = field;
        for (let y = r0; y <= r1; y++) {
          const v = -(((y + 0.5) * chh) - cy) / S;
          for (let x = c0; x <= c1; x++) {
            const u = (((x + 0.5) * cw) - cx) / S;
            // ray origin in object space: o' = Rᵀ·(u, v, 3)
            const oz0 = 3;
            const ox = R00 * u + R10 * v + R20 * oz0;
            const oy = R01 * u + R11 * v + R21 * oz0;
            const oz = R02 * u + R12 * v + R22 * oz0;
            if (Math.abs(dz) < 1e-4) continue;
            const ta = (D - oz) / dz;
            const tb = (-D - oz) / dz;
            const t0 = Math.min(ta, tb);
            const t1 = Math.max(ta, tb);
            const STEPS = 10;
            const st = (t1 - t0) / STEPS;
            let found = -1;
            let tf = 0;
            for (let s = 0; s <= STEPS; s++) {
              const tt = t0 + st * s;
              const m = mi(ox + dx * tt, oy + dy * tt);
              if (m >= 0 && pc[m]) {
                found = s;
                tf = tt;
                break;
              }
            }
            if (found < 0) continue;
            let nx: number, ny: number, nz: number;
            let pid: number;
            let wall = false;
            let fx = 0;
            let fy = 0;
            if (found === 0) {
              // entry face: normal faces the incoming ray
              nx = 0;
              ny = 0;
              nz = dz < 0 ? 1 : -1;
              fx = ox + dx * tf;
              fy = oy + dy * tf;
              pid = pc[mi(fx, fy)];
            } else {
              // side wall: bisect between the last miss and this hit
              let a = tf - st;
              let b = tf;
              for (let it = 0; it < 4; it++) {
                const m2 = (a + b) / 2;
                const q = mi(ox + dx * m2, oy + dy * m2);
                if (q >= 0 && pc[q]) b = m2;
                else a = m2;
              }
              const px = ox + dx * b;
              const py = oy + dy * b;
              const mx = Math.floor(((px + 1) / 2) * MW);
              const my = Math.floor(((OBJ_H / 2 - py) / OBJ_H) * MH);
              const gx = fl[my * MW + Math.min(MW - 1, mx + 1)] - fl[my * MW + Math.max(0, mx - 1)];
              const gy = fl[Math.max(0, my - 1) * MW + mx] - fl[Math.min(MH - 1, my + 1) * MW + mx];
              const gl = Math.hypot(gx, gy) || 1;
              nx = -gx / gl;
              ny = -gy / gl;
              nz = 0;
              pid = pc[mi(px, py)] || 1;
              wall = true;
            }
            // normal → view space
            const vnx = R00 * nx + R01 * ny + R02 * nz;
            const vny = R10 * nx + R11 * ny + R12 * nz;
            const vnz = R20 * nx + R21 * ny + R22 * nz;
            const ndl = vnx * Lx + vny * Ly + vnz * Lz;
            const diff = smooth(-0.2, 1, ndl);
            // specular (Blinn, view = +z)
            const hx = Lx;
            const hy = Ly;
            const hz = Lz + 1;
            const hl = Math.hypot(hx, hy, hz);
            const spec = Math.pow(Math.max(0, (vnx * hx + vny * hy + vnz * hz) / hl), 28);
            const albedo = wall ? 0.5 : pid === 3 ? 1 : pid === 1 ? 0.84 : 0.66;
            let lum = 0.3 + 0.7 * albedo * (0.3 + 0.7 * diff) + spec * 0.55;
            if (!wall) {
              // engraving: fine diagonal hatching + grain + a slow marbled swirl,
              // so the face never collapses into one repeated glyph
              const hatch = Math.sin((fx * 1.3 + fy) * 95) * 0.09;
              const grain = (fbm2(fx * 9 + 3, fy * 9 + t * 0.15, 3) - 0.5) * 0.42;
              const marble = Math.sin(fx * 5 + fbm2(fx * 3, fy * 3 - t * 0.05, 3) * 6) * 0.1;
              lum += hatch + grain + marble;
              const gb = Math.abs(u * 0.6 + v * 0.9 - glint);
              if (gb < 0.1) lum += (1 - gb / 0.1) * 0.4;
            } else {
              lum += Math.sin(fy * 140) * 0.06;
            }
            lum = clamp01(lum);
            const i = y * cols + x;
            // intro: noise resolves into the mark
            if (h3(x, y, 5) > intro) {
              if (h3(x, y, tick) < 0.4) {
                lch[i] = RAMP_CODES[20 + Math.floor(h3(x, y, tick + 3) * 40)];
                lcol[i] = 5;
                hit[i] = 1;
              }
              continue;
            }
            // breathing: a few cells shimmer each frame
            const idx = h3(x, y, tick) > 0.985
              ? 30 + Math.floor(h3(x, y, tick + 1) * 30)
              : Math.floor((0.28 + lum * 0.72) * (RN - 1));
            lch[i] = RAMP_CODES[Math.min(RN - 1, idx)];
            lcol[i] = Math.min(11, 6 + Math.floor(lum * 6));
            hit[i] = 1;
          }
        }
      }

      // ---- halo: keep the field off the mark's silhouette ----
      halo.fill(0);
      if (withField && k < 0.2) {
        const HX = 3;
        const HY = 1;
        for (let y = Math.max(0, r0 - HY); y <= Math.min(rows - 1, r1 + HY); y++) {
          for (let x = Math.max(0, c0 - HX); x <= Math.min(cols - 1, c1 + HX); x++) {
            if (!hit[y * cols + x]) continue;
            for (let yy = Math.max(0, y - HY); yy <= Math.min(rows - 1, y + HY); yy++) {
              const b = yy * cols;
              for (let xx = Math.max(0, x - HX); xx <= Math.min(cols - 1, x + HX); xx++) halo[b + xx] = 1;
            }
          }
        }
      }

      // ---- 2. chaotic field ----
      if (withField) {
      const keep = 1 - k * 0.8;
      const ts = t * 0.22;
      const px = input.inside ? input.x : -999;
      const py = input.inside ? input.y : -999;
      const lensR = narrow ? 0 : 11;
      const clicks = input.clicks;
      for (let y = 0; y < rows; y++) {
        const fy = y * aspect;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (halo[i]) continue;
          const hr = h3(x, y, 1);
          if (hr > keep) continue;
          const wx = x * 0.024 + Math.sin(fy * 0.02 + ts * 1.4) * 1.1;
          const wy = fy * 0.024 + Math.sin(x * 0.017 - ts * 1.1) * 1.1;
          const n1 = Math.sin(wx * 2.1 + ts) * 0.5 + Math.sin(wy * 2.7 - ts * 0.9) * 0.38 + Math.sin((wx + wy) * 1.4 + ts * 0.7) * 0.45;
          const n2 = Math.sin(x * 0.05 - fy * 0.035 + ts * 1.8) * 0.6 + Math.sin(fy * 0.06 + ts * 1.3 + Math.sin(x * 0.02 + ts)) * 0.5;
          const c1 = 1 - Math.abs(fract((n1 + 1.35) * 4.2) - 0.5) * 2;
          const c2 = 1 - Math.abs(fract((n2 + 1.1) * 3) - 0.5) * 2;
          let dens = Math.max(c1 > 0.38 ? (c1 - 0.38) / 0.62 : 0, c2 > 0.66 ? ((c2 - 0.66) / 0.34) * 0.85 : 0);
          let lens = 0;
          if (lensR) {
            const ddx = x - px;
            const ddy = (y - py) * aspect;
            const d2 = ddx * ddx + ddy * ddy;
            const Rr = lensR * aspect;
            if (d2 < Rr * Rr) {
              lens = 1 - Math.sqrt(d2) / Rr;
              dens = Math.max(dens, Math.max(c1, c2) * lens * 1.3);
            }
          }
          for (let c = 0; c < clicks.length; c++) {
            const ck = clicks[c];
            const age = t - ck.t;
            const ring = 1 - Math.abs(Math.hypot(x - ck.x, (y - ck.y) * aspect) - age * 46) / 3;
            if (ring > 0) {
              const f = ring * (1 - age / 3);
              dens = Math.max(dens, f);
              lens = Math.max(lens, f);
            }
          }
          if (dens > 0.04) {
            ch[i] = FIELD.charCodeAt(Math.min(FIELD.length - 1, Math.floor(dens * FIELD.length)));
            col[i] = lens > 0.4 ? 9 : lens > 0.12 ? 7 : dens > 0.7 ? 5 : dens > 0.4 ? 4 : 3;
          } else if (h3(x, y, tick) > 0.88) {
            ch[i] = FLICK.charCodeAt(Math.floor(h3(x, y, tick + 1) * FLICK.length));
            col[i] = h3(x, y, tick + 2) > 0.6 ? 4 : 2;
          }
        }
      }

      // glyph rain
      for (let d = 0; d < drops.length; d++) {
        const dr = drops[d];
        if (h3(d, 1, 77) > keep) continue;
        const head = Math.floor(((t * dr.speed + dr.off) % (rows + dr.len + 10)) - 5);
        for (let s = 0; s < dr.len; s++) {
          const y = head - s;
          if (y < 0 || y >= rows) continue;
          const i = y * cols + dr.x;
          if (halo[i]) continue;
          ch[i] = RAIN.charCodeAt(Math.floor(h3(dr.x, y, Math.floor(t * 12) + s) * RAIN.length));
          col[i] = s === 0 ? 9 : s < 3 ? 6 : s < dr.len * 0.6 ? 4 : 2;
        }
      }

      // glitch rows: a short sideways slide every ~1.8s
      const gSeed = Math.floor(t / 1.8);
      if (fract(t / 1.8) < 0.08) {
        const gy = Math.floor(h3(gSeed, 2, 4) * rows);
        const gh = 1 + Math.floor(h3(gSeed, 3, 4) * 4);
        const shift = Math.floor((h3(gSeed, 4, 4) - 0.5) * cols * 0.25);
        for (let y = gy; y < Math.min(rows, gy + gh); y++) {
          const b = y * cols;
          for (let x = 0; x < cols; x++) {
            rowBuf[x] = ch[b + x];
            rowCol[x] = col[b + x];
          }
          for (let x = 0; x < cols; x++) {
            const sx = (((x - shift) % cols) + cols) % cols;
            if (halo[b + x]) continue;
            ch[b + x] = rowBuf[sx];
            col[b + x] = rowCol[sx];
          }
        }
      }

      }

      // ---- 3. composite the mark (scattering into dust on scroll) ----
      const scatter = k * k;
      for (let y = r0; y <= r1; y++) {
        for (let x = c0; x <= c1; x++) {
          const i = y * cols + x;
          if (!hit[i]) continue;
          let tx = x;
          let ty = y;
          if (scatter > 0.001) {
            const h1 = h3(x, y, 7);
            const h2 = h3(x, y, 13);
            if (h1 < scatter * 1.1 - 0.1) continue;
            tx = Math.round(x + (h1 - 0.5) * scatter * cols * 0.6);
            ty = Math.round(y + h2 * scatter * rows * 0.8 - scatter * 4);
            if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
          }
          const j = ty * cols + tx;
          ch[j] = lch[i];
          col[j] = lcol[i];
        }
      }
    },
  };
}
