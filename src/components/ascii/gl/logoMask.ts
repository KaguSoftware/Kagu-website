/*
  The Kagu mark rasterised once (shared by every GPU logo on the page):
  - piece: R8UI, 0 none · 1 ribbon · 2 fold · 3 wing
  - normal: RG8, the outward 2D normal of the slab's side walls, from the
    gradient of a twice box-blurred coverage map (same math as logoProgram).
*/
import { FOLD, RIBBON, WING } from "@/components/KaguMark";

export const MW = 720;
export const MH = 324;

let cache: { piece: Uint8Array; normal: Uint8Array } | null = null;

export function logoMask() {
  if (cache) return cache;
  const cv = document.createElement("canvas");
  cv.width = MW;
  cv.height = MH;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const piece = new Uint8Array(MW * MH);
  const normal = new Uint8Array(MW * MH * 2).fill(128);
  if (!ctx) return (cache = { piece, normal });
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
  const cov = new Float32Array(MW * MH);
  for (let i = 0; i < MW * MH; i++) {
    const r = rib[i * 4 + 3];
    const f = fol[i * 4 + 3];
    const w = win[i * 4 + 3];
    const m = Math.max(r, f, w);
    cov[i] = m / 255;
    if (m >= 128) piece[i] = w >= 128 ? 3 : f >= 128 ? 2 : 1;
  }
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
  const fl = blur(blur(cov));
  for (let my = 0; my < MH; my++) {
    for (let mx = 0; mx < MW; mx++) {
      const gx = fl[my * MW + Math.min(MW - 1, mx + 1)] - fl[my * MW + Math.max(0, mx - 1)];
      const gy = fl[Math.max(0, my - 1) * MW + mx] - fl[Math.min(MH - 1, my + 1) * MW + mx];
      const gl = Math.hypot(gx, gy);
      const i = (my * MW + mx) * 2;
      if (gl > 0) {
        normal[i] = Math.round(((-gx / gl) * 0.5 + 0.5) * 255);
        normal[i + 1] = Math.round(((-gy / gl) * 0.5 + 0.5) * 255);
      }
    }
  }
  return (cache = { piece, normal });
}
