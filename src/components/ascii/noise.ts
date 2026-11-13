/*
  Shared helpers for ASCII programs: hashing, value noise, fBm, the 70-step
  density ramp and the monochrome palette. Pure functions, no DOM.
*/

/** Paul Bourke's 70-level density ramp, light → dark (plain ASCII only). */
export const RAMP =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tjfrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
export const RN = RAMP.length;
export const RAMP_CODES = Array.from(RAMP, (ch) => ch.charCodeAt(0));

/** 12 white alpha levels: index 0 faintest, 11 solid white. */
export const LEVELS = 12;
export const MONO_PALETTE = Array.from({ length: LEVELS }, (_, i) => {
  const a = 0.07 + Math.pow(i / (LEVELS - 1), 1.35) * 0.93;
  return `#ffffff@${a.toFixed(3)}`;
});

/** luminance 0..1 → { char code, palette level } (code 32 = empty) */
export function shade(lum: number, minLevel = 0): [number, number] {
  const l = lum < 0 ? 0 : lum > 1 ? 1 : lum;
  const idx = Math.floor(Math.pow(l, 0.92) * (RN - 1));
  if (idx <= 0) return [32, 0];
  return [RAMP_CODES[idx], Math.min(LEVELS - 1, minLevel + Math.floor(l * (LEVELS - minLevel)))];
}

export function h3(i: number, j: number, k: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const sm = (t: number) => t * t * (3 - 2 * t);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a: number, b: number, x: number) => sm(clamp01((x - a) / (b - a)));
export const fract = (v: number) => v - Math.floor(v);

export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = sm(x - xi);
  const v = sm(y - yi);
  const w = sm(z - zi);
  const a = h3(xi, yi, zi);
  const b = h3(xi + 1, yi, zi);
  const c = h3(xi, yi + 1, zi);
  const d = h3(xi + 1, yi + 1, zi);
  const e = h3(xi, yi, zi + 1);
  const f = h3(xi + 1, yi, zi + 1);
  const g = h3(xi, yi + 1, zi + 1);
  const h = h3(xi + 1, yi + 1, zi + 1);
  const x1 = a + (b - a) * u;
  const x2 = c + (d - c) * u;
  const x3 = e + (f - e) * u;
  const x4 = g + (h - g) * u;
  const y1 = x1 + (x2 - x1) * v;
  const y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}

export function fbm3(x: number, y: number, z: number, oct: number): number {
  let s = 0;
  let a = 0.5;
  let n = 0;
  for (let o = 0; o < oct; o++) {
    s += noise3(x, y, z) * a;
    n += a;
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    a *= 0.5;
  }
  return s / n;
}

export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = sm(x - xi);
  const v = sm(y - yi);
  const a = h3(xi, yi, 0);
  const b = h3(xi + 1, yi, 0);
  const c = h3(xi, yi + 1, 0);
  const d = h3(xi + 1, yi + 1, 0);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2(x: number, y: number, oct: number): number {
  let s = 0;
  let a = 0.5;
  let n = 0;
  for (let o = 0; o < oct; o++) {
    s += noise2(x, y) * a;
    n += a;
    x = x * 2.1 + 17.3;
    y = y * 2.1 - 9.1;
    a *= 0.5;
  }
  return s / n;
}
