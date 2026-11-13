/*
  GLSL for the GPU ASCII renderer. Every formula is a 1:1 port of the JS
  programs (logoProgram.ts, videoProgram.ts / imageProgram.ts), including the
  integer hash h3, so the GPU output matches the CPU one glyph for glyph.

  Cell passes render into a cols×rows RGBA8 texture, one texel per cell:
    r = glyph index into RAMP (0 = empty) / 255
    g = alpha level 0..11 / 255
    b = 1 when the logo covers this cell (logo pass only)
  Rows are counted from the top (texel y = row).
*/
import { RAMP } from "../noise";
import { MH, MW } from "./logoMask";

const idx = (chars: string) => Array.from(chars, (c) => RAMP.indexOf(c));
const arr = (name: string, chars: string) => {
  const v = idx(chars);
  return `const int ${name}[${v.length}] = int[](${v.join(",")});\nconst int ${name}_N = ${v.length};`;
};

const OBJ_H = ((486 / 1079) * 2).toFixed(6);

const COMMON = `#version 300 es
precision highp float;
precision highp int;
const int RN = ${RAMP.length};

float h3(int i, int j, int k) {
  uint h = (uint(i) * 374761393u) ^ (uint(j) * 668265263u) ^ (uint(k) * 1440662683u);
  h = (h ^ (h >> 13u)) * 1274126177u;
  h = h ^ (h >> 16u);
  return float(h) / 4294967295.0;
}
float sm(float t) { return t * t * (3.0 - 2.0 * t); }
float noise2(float x, float y) {
  float xf = floor(x), yf = floor(y);
  int xi = int(xf), yi = int(yf);
  float u = sm(x - xf), v = sm(y - yf);
  float a = h3(xi, yi, 0), b = h3(xi + 1, yi, 0), c = h3(xi, yi + 1, 0), d = h3(xi + 1, yi + 1, 0);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
float fbm2(float x, float y, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int o = 0; o < 8; o++) {
    if (o >= oct) break;
    s += noise2(x, y) * a; n += a;
    x = x * 2.1 + 17.3; y = y * 2.1 - 9.1; a *= 0.5;
  }
  return s / n;
}
float smoothJ(float a, float b, float x) { return sm(clamp((x - a) / (b - a), 0.0, 1.0)); }
out vec4 o;
`;

/* ---------------- pass 1: the mark, ray-traced per cell ---------------- */
export const LOGO_FS = `${COMMON}
uniform vec2 uCellPx;      // cell size, CSS px
uniform float uS;          // CSS px per object unit
uniform vec2 uC;           // mark centre, CSS px
uniform float uR[9];       // R = Ry(yaw)·Rx(pitch), row-major
uniform vec3 uL;           // light (view space, normalised)
uniform float uT;
uniform int uTick;
uniform float uIntro;
uniform float uGlint;
uniform highp usampler2D uPiece;
uniform sampler2D uNorm;
const float OBJ_H = ${OBJ_H};
const float D = 0.075;
const int MW = ${MW};
const int MH = ${MH};

ivec2 mtex(vec2 p) {
  return ivec2(int(floor((p.x + 1.0) / 2.0 * float(MW))), int(floor((OBJ_H / 2.0 - p.y) / OBJ_H * float(MH))));
}
int pieceAt(vec2 p) {
  ivec2 m = mtex(p);
  if (m.x < 0 || m.y < 0 || m.x >= MW || m.y >= MH) return 0;
  return int(texelFetch(uPiece, m, 0).r);
}

void main() {
  int x = int(gl_FragCoord.x);
  int y = int(gl_FragCoord.y);
  o = vec4(0.0);
  float u = ((float(x) + 0.5) * uCellPx.x - uC.x) / uS;
  float v = -((float(y) + 0.5) * uCellPx.y - uC.y) / uS;
  float R00 = uR[0], R01 = uR[1], R02 = uR[2], R10 = uR[3], R11 = uR[4], R12 = uR[5], R20 = uR[6], R21 = uR[7], R22 = uR[8];
  float oz0 = 3.0;
  vec3 ro = vec3(R00 * u + R10 * v + R20 * oz0, R01 * u + R11 * v + R21 * oz0, R02 * u + R12 * v + R22 * oz0);
  vec3 rd = vec3(-R20, -R21, -R22);
  if (abs(rd.z) < 1e-4) return;
  float ta = (D - ro.z) / rd.z;
  float tb = (-D - ro.z) / rd.z;
  float t0 = min(ta, tb), t1 = max(ta, tb);
  float st = (t1 - t0) / 10.0;
  int found = -1;
  float tf = 0.0;
  for (int s = 0; s <= 10; s++) {
    float tt = t0 + st * float(s);
    if (pieceAt(ro.xy + rd.xy * tt) > 0) { found = s; tf = tt; break; }
  }
  if (found < 0) return;
  vec3 n;
  int pid;
  bool wall = false;
  vec2 f = vec2(0.0);
  if (found == 0) {
    n = vec3(0.0, 0.0, rd.z < 0.0 ? 1.0 : -1.0);
    f = ro.xy + rd.xy * tf;
    pid = pieceAt(f);
  } else {
    float a = tf - st, b = tf;
    for (int it = 0; it < 4; it++) {
      float m2 = (a + b) * 0.5;
      if (pieceAt(ro.xy + rd.xy * m2) > 0) b = m2; else a = m2;
    }
    vec2 p = ro.xy + rd.xy * b;
    ivec2 m = clamp(mtex(p), ivec2(0), ivec2(MW - 1, MH - 1));
    vec2 nn = texelFetch(uNorm, m, 0).rg * 2.0 - 1.0;
    n = vec3(nn, 0.0);
    pid = pieceAt(p);
    if (pid == 0) pid = 1;
    wall = true;
    f = p;
  }
  vec3 vn = vec3(R00 * n.x + R01 * n.y + R02 * n.z, R10 * n.x + R11 * n.y + R12 * n.z, R20 * n.x + R21 * n.y + R22 * n.z);
  float ndl = dot(vn, uL);
  float diff = smoothJ(-0.2, 1.0, ndl);
  vec3 hv = vec3(uL.xy, uL.z + 1.0);
  float spec = pow(max(0.0, dot(vn, hv) / length(hv)), 28.0);
  float albedo = wall ? 0.5 : pid == 3 ? 1.0 : pid == 1 ? 0.84 : 0.66;
  float lum = 0.3 + 0.7 * albedo * (0.3 + 0.7 * diff) + spec * 0.55;
  if (!wall) {
    float hatch = sin((f.x * 1.3 + f.y) * 95.0) * 0.09;
    float grain = (fbm2(f.x * 9.0 + 3.0, f.y * 9.0 + uT * 0.15, 3) - 0.5) * 0.42;
    float marble = sin(f.x * 5.0 + fbm2(f.x * 3.0, f.y * 3.0 - uT * 0.05, 3) * 6.0) * 0.1;
    lum += hatch + grain + marble;
    float gb = abs(u * 0.6 + v * 0.9 - uGlint);
    if (gb < 0.1) lum += (1.0 - gb / 0.1) * 0.4;
  } else {
    lum += sin(f.y * 140.0) * 0.06;
  }
  lum = clamp(lum, 0.0, 1.0);
  int gi;
  int lv;
  if (h3(x, y, 5) > uIntro) {
    if (h3(x, y, uTick) >= 0.4) return;
    gi = 20 + int(floor(h3(x, y, uTick + 3) * 40.0));
    lv = 5;
  } else {
    gi = h3(x, y, uTick) > 0.985
      ? 30 + int(floor(h3(x, y, uTick + 1) * 30.0))
      : int(floor((0.28 + lum * 0.72) * float(RN - 1)));
    gi = min(RN - 1, gi);
    lv = min(11, 6 + int(floor(lum * 6.0)));
  }
  o = vec4(float(gi) / 255.0, float(lv) / 255.0, 1.0, 1.0);
}`;

/* ---------- pass 2: chaotic field + halo + logo (with scroll shatter) ---------- */
export const COMPOSITE_FS = `${COMMON}
${arr("FIELD", ".,:;-=+*#")}
${arr("RAIN", "|!:;+*=#%&$@?/")}
${arr("FLICK", ".:+*/\\|-=")}
uniform sampler2D uLogo;
uniform sampler2D uDrops;   // cols×1: speed, offset, length, keep-hash (len 0 = none)
uniform vec2 uGrid;         // cols, rows
uniform float uField;       // 1 = draw the background field
uniform float uK;           // scroll 0..1
uniform float uAspect;      // cellH / cellW
uniform float uT;
uniform int uTick;
uniform vec2 uPtr;          // pointer in cells (-999 = none)
uniform float uLensR;
uniform vec3 uClicks[4];    // x, y (cells), t
uniform int uNClicks;
uniform ivec3 uGlitch;      // y, height, shift (height 0 = off)

bool logoHit(int x, int y) {
  if (x < 0 || y < 0 || x >= int(uGrid.x) || y >= int(uGrid.y)) return false;
  return texelFetch(uLogo, ivec2(x, y), 0).b > 0.5;
}
bool haloAt(int x, int y) {
  if (uField < 0.5 || uK >= 0.2) return false;
  for (int dy = -1; dy <= 1; dy++)
    for (int dx = -3; dx <= 3; dx++)
      if (logoHit(x + dx, y + dy)) return true;
  return false;
}

// background glyph for cell (x, y); returns (index, level), index 0 = empty
ivec2 field(int x, int y) {
  if (haloAt(x, y)) return ivec2(0);
  float keep = 1.0 - uK * 0.8;
  int cols = int(uGrid.x), rows = int(uGrid.y);
  ivec2 r = ivec2(0);
  if (h3(x, y, 1) <= keep) {
    float fx = float(x), fy = float(y) * uAspect, ts = uT * 0.22;
    float wx = fx * 0.024 + sin(fy * 0.02 + ts * 1.4) * 1.1;
    float wy = fy * 0.024 + sin(fx * 0.017 - ts * 1.1) * 1.1;
    float n1 = sin(wx * 2.1 + ts) * 0.5 + sin(wy * 2.7 - ts * 0.9) * 0.38 + sin((wx + wy) * 1.4 + ts * 0.7) * 0.45;
    float n2 = sin(fx * 0.05 - fy * 0.035 + ts * 1.8) * 0.6 + sin(fy * 0.06 + ts * 1.3 + sin(fx * 0.02 + ts)) * 0.5;
    float c1 = 1.0 - abs(fract((n1 + 1.35) * 4.2) - 0.5) * 2.0;
    float c2 = 1.0 - abs(fract((n2 + 1.1) * 3.0) - 0.5) * 2.0;
    float dens = max(c1 > 0.38 ? (c1 - 0.38) / 0.62 : 0.0, c2 > 0.66 ? ((c2 - 0.66) / 0.34) * 0.85 : 0.0);
    float lens = 0.0;
    if (uLensR > 0.0) {
      float ddx = fx - uPtr.x, ddy = (float(y) - uPtr.y) * uAspect;
      float Rr = uLensR * uAspect;
      float d2 = ddx * ddx + ddy * ddy;
      if (d2 < Rr * Rr) {
        lens = 1.0 - sqrt(d2) / Rr;
        dens = max(dens, max(c1, c2) * lens * 1.3);
      }
    }
    for (int c = 0; c < 4; c++) {
      if (c >= uNClicks) break;
      vec3 ck = uClicks[c];
      float age = uT - ck.z;
      float ring = 1.0 - abs(length(vec2(fx - ck.x, (float(y) - ck.y) * uAspect)) - age * 46.0) / 3.0;
      if (ring > 0.0) {
        float f = ring * (1.0 - age / 3.0);
        dens = max(dens, f);
        lens = max(lens, f);
      }
    }
    if (dens > 0.04) {
      r.x = FIELD[min(FIELD_N - 1, int(floor(dens * float(FIELD_N))))];
      r.y = lens > 0.4 ? 9 : lens > 0.12 ? 7 : dens > 0.7 ? 5 : dens > 0.4 ? 4 : 3;
    } else if (h3(x, y, uTick) > 0.88) {
      r.x = FLICK[int(floor(h3(x, y, uTick + 1) * float(FLICK_N)))];
      r.y = h3(x, y, uTick + 2) > 0.6 ? 4 : 2;
    }
  }
  // glyph rain (one drop per column at most)
  vec4 dr = texelFetch(uDrops, ivec2(x, 0), 0);
  if (dr.z > 0.0 && dr.w <= keep) {
    int len = int(dr.z);
    int head = int(floor(mod(uT * dr.x + dr.y, float(rows + len + 10)))) - 5;
    int s = head - y;
    if (s >= 0 && s < len) {
      r.x = RAIN[int(floor(h3(x, y, int(floor(uT * 12.0)) + s) * float(RAIN_N)))];
      r.y = s == 0 ? 9 : s < 3 ? 6 : float(s) < float(len) * 0.6 ? 4 : 2;
    }
  }
  return r;
}

void main() {
  int x = int(gl_FragCoord.x);
  int y = int(gl_FragCoord.y);
  int cols = int(uGrid.x), rows = int(uGrid.y);
  ivec2 g = ivec2(0);
  if (uField > 0.5) {
    int sx = x;
    if (uGlitch.y > 0 && y >= uGlitch.x && y < uGlitch.x + uGlitch.y && !haloAt(x, y)) {
      sx = ((x - uGlitch.z) % cols + cols) % cols;
    }
    g = field(sx, y);
  }
  // the mark, shattering into dust on scroll (gather form of the CPU scatter)
  float sc = uK * uK;
  int lx = x, ly = y;
  bool drop = false;
  if (sc > 0.001) {
    float h1 = h3(x, y, 7), h2 = h3(x, y, 13);
    if (h1 < sc * 1.1 - 0.1) drop = true;
    lx = x - int(floor((h1 - 0.5) * sc * float(cols) * 0.6 + 0.5));
    ly = y - int(floor(h2 * sc * float(rows) * 0.8 - sc * 4.0 + 0.5));
  }
  if (!drop && logoHit(lx, ly)) {
    vec4 l = texelFetch(uLogo, ivec2(lx, ly), 0);
    g = ivec2(int(l.r * 255.0 + 0.5), int(l.g * 255.0 + 0.5));
  }
  o = vec4(float(g.x) / 255.0, float(g.y) / 255.0, 0.0, 1.0);
}`;

/* ---------------- video → cells (luma, local contrast, levels) ---------------- */
export const VIDEO_FS = `${COMMON}
uniform sampler2D uVideo;
uniform vec2 uCellPx;   // CSS px
uniform vec2 uGrid;
uniform vec4 uFit;      // offset x, y, drawn w, h (CSS px), cover-fit
uniform float uReady;
float luma(int x, int y) {
  vec2 p = (vec2(float(x), float(y)) + 0.5) * uCellPx;
  vec2 uv = (p - uFit.xy) / uFit.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  vec3 c = texture(uVideo, uv).rgb;
  return dot(c, vec3(0.299, 0.587, 0.114));
}
void main() {
  o = vec4(0.0);
  if (uReady < 0.5) return;
  int x = int(gl_FragCoord.x), y = int(gl_FragCoord.y);
  float l = luma(x, y);
  float m = 0.0;
  for (int dy = -1; dy <= 1; dy++) for (int dx = -3; dx <= 3; dx++) m += luma(x + dx, y + dy);
  m /= 21.0;
  float v = clamp((l + (l - m) * 1.1 - 0.06) / 0.88, 0.0, 1.0);
  v = pow(pow(v, 0.82), 1.1);
  int gi = int(floor(pow(v, 0.92) * float(RN - 1)));
  if (gi <= 0) return;
  int lv = min(11, 1 + int(floor(v * 11.0)));
  o = vec4(float(gi) / 255.0, float(lv) / 255.0, 0.0, 1.0);
}`;

/* ---------------- pass 3: glyphs to screen ---------------- */
export const DRAW_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform ivec2 uCellDev;    // cell size in device px
uniform ivec2 uGrid;
uniform float uCanvasH;
uniform int uAtlasCols;
uniform float uAlpha[12];
out vec4 o;
void main() {
  ivec2 p = ivec2(int(gl_FragCoord.x), int(uCanvasH - gl_FragCoord.y));
  ivec2 c = p / uCellDev;
  o = vec4(0.0);
  if (c.x >= uGrid.x || c.y >= uGrid.y) return;
  vec4 cell = texelFetch(uCells, c, 0);
  int gi = int(cell.r * 255.0 + 0.5);
  if (gi == 0) return;
  int lv = int(cell.g * 255.0 + 0.5);
  ivec2 slot = ivec2(gi % uAtlasCols, gi / uAtlasCols) * uCellDev;
  float a = texelFetch(uAtlas, slot + (p - c * uCellDev), 0).a * uAlpha[min(lv, 11)];
  o = vec4(a, a, a, a);
}`;
