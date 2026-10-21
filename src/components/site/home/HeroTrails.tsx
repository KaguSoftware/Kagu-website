"use client";

/*
  Ink trails behind the hero. Two fixed canvases (near + far) share one rAF loop.
  HomeScrollScene's paint() writes the scroll progress (k) and the logo/headline
  box into `control`; this loop reads it, so there are no listeners or re-renders
  per frame. Trails steer around the box, and the keep-out opens up as k -> 1.
*/
import { useEffect, useRef, type MutableRefObject } from "react";

export type TrailsBox = { x: number; y: number; w: number; h: number };
export type TrailsControl = { k: number; box: TrailsBox | null };

type Trail = {
  i: number;
  side: number;
  far: boolean;
  h0: number;
  h1: number;
  u: number;
  N: number;
  blue: boolean;
  v: number;
  lw: number;
  al: number;
  k0: number;
  ph: number;
  s: number;
  acc: number;
  p: number[];
  age: number;
  life: number;
  x: number;
  y: number;
  th: number;
};

const PI = Math.PI;
const B = 20;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const smooth = (f: number) => f * f * (3 - 2 * f);
const angd = (a: number, b: number) => {
  let d = a - b;
  while (d > PI) d -= 2 * PI;
  while (d < -PI) d += 2 * PI;
  return d;
};

export function HeroTrails({
  control,
}: {
  control: MutableRefObject<TrailsControl>;
}) {
  const nearRef = useRef<HTMLCanvasElement>(null);
  const farRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = nearRef.current;
    const cvf = farRef.current;
    const ctx = cv?.getContext("2d");
    const ctxf = cvf?.getContext("2d");
    if (!cv || !cvf || !ctx || !ctxf) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let W = 0;
    let H = 0;
    let dpr = 1;
    let narrow = false;
    let K = 0;
    let trails: Trail[] = [];
    let box: TrailsBox | null = null;
    let introT = 0;
    let energy = 0;
    let lastY = window.scrollY;
    let lastTs = 0;
    let raf = 0;
    let last = 0;
    let hidden = document.hidden;
    let alive = true;

    const span = () => (narrow ? H : W);

    const laneOf = (side: number): [number, number] => {
      if (!box) {
        if (narrow) return side ? [0.75 * H, 0.98 * H] : [0.02 * H, 0.25 * H];
        return side ? [0.69 * W, 0.97 * W] : [0.03 * W, 0.31 * W];
      }
      let lo: number;
      let hi: number;
      if (narrow) {
        if (side) {
          lo = box.y + box.h + 16;
          hi = H;
        } else {
          lo = 0;
          hi = box.y - 16;
        }
        if (hi - lo < 60) {
          if (side) {
            lo = 0.88 * H;
            hi = 0.99 * H;
          } else {
            lo = 0.01 * H;
            hi = 0.12 * H;
          }
        }
      } else {
        if (side) {
          lo = box.x + box.w + 24;
          hi = 0.98 * W;
        } else {
          lo = 0.02 * W;
          hi = box.x - 24;
        }
        if (hi - lo < 60) {
          if (side) {
            lo = 0.88 * W;
            hi = 0.99 * W;
          } else {
            lo = 0.01 * W;
            hi = 0.12 * W;
          }
        }
      }
      return [lo, hi];
    };

    const rangeOf = (t: Trail): [number, number] => {
      const L = span();
      return [lerp(t.h0, 0.03 * L, K), lerp(t.h1, 0.97 * L, K)];
    };
    const baseSpeed = (t: Trail) =>
      (narrow ? 85 : 120) * t.u * t.v * (1 - 0.4 * K) * (1 + energy);

    const advance = (t: Trail, ds: number) => {
      if (ds <= 0) return;
      const n = Math.max(1, Math.ceil(ds / 4));
      const d = ds / n;
      const r = rangeOf(t);
      for (let j = 0; j < n; j++) {
        t.s += d;
        t.th += t.k0 * Math.sin(t.ph + t.s * 0.0034) * d;
        const v = narrow ? t.y : t.x;
        const out = v < r[0] ? r[0] - v : v > r[1] ? v - r[1] : 0;
        if (out > 0) {
          const w = Math.min(1, out / 30);
          const target = narrow
            ? Math.atan2((t.y < r[0] ? 1 : -1) * 0.7, Math.cos(t.th) * 0.9)
            : Math.atan2(Math.sin(t.th) * 0.9, (t.x < r[0] ? 1 : -1) * 0.7);
          t.th += angd(target, t.th) * w * d * 0.02;
        }
        t.x += Math.cos(t.th) * d;
        t.y += Math.sin(t.th) * d;
        t.acc += d;
        if (t.acc >= 4) {
          t.acc -= 4;
          t.p.push(t.x, t.y);
          if (t.p.length > t.N * 2) t.p.splice(0, 2);
        }
      }
    };

    const isOff = (t: Trail) => {
      const m = 80;
      return t.x < -m || t.x > W + m || t.y < -m || t.y > H + m;
    };

    const spawn = (i: number, warm: boolean, tries: number): Trail => {
      const side = i % 2;
      const L = span();
      const u = narrow ? 0.8 : Math.min(1.1, Math.max(0.7, W / 1180));
      const [h0, h1] = laneOf(side);
      const t: Trail = {
        i,
        side,
        far: Math.random() < 0.4,
        h0,
        h1,
        u,
        N: Math.round(Math.pow(Math.random(), 1.5) * 190 * u + 25),
        blue: Math.random() < 0.18,
        v: Math.pow(rand(0.6, 1.5), 2),
        lw: Math.pow(Math.random(), 1.6) * 5 + 1.6,
        al: rand(0.5, 1),
        k0: sign() * Math.pow(Math.random(), 1.6) * 0.011,
        ph: rand(0, 6.28),
        s: 0,
        acc: 0,
        p: [],
        age: 0,
        life: rand(6, 22),
        x: 0,
        y: 0,
        th: 0,
      };
      const a0 = lerp(h0, 0.03 * L, K);
      const a1 = lerp(h1, 0.97 * L, K);
      if (narrow) {
        t.y = rand(a0, a1);
        t.x = rand(-0.05 * W, 1.05 * W);
        t.th = (Math.random() < 0.5 ? 0 : PI) + sign() * rand(0.1, 0.45);
      } else {
        t.x = rand(a0, a1);
        t.y = rand(0, H);
        t.th =
          (Math.random() < 0.5 ? PI / 2 : -PI / 2) + sign() * rand(0.3, 0.8);
      }
      if (warm) {
        const dist = rand(0.2, 0.65) * t.life * baseSpeed(t);
        t.age = dist / Math.max(1, baseSpeed(t));
        advance(t, dist);
        if (isOff(t) && tries > 0) return spawn(i, warm, tries - 1);
      }
      return t;
    };

    const initTrails = () => {
      const n = narrow ? 9 : 18;
      trails = [];
      introT = mq.matches ? 99 : 0;
      for (let i = 0; i < n; i++) trails.push(spawn(i, true, 6));
    };

    const syncControl = () => {
      const c = control.current;
      K = c.k;
      box = c.box && c.box.w > 40 && c.box.h > 40 ? c.box : null;
      for (const t of trails) {
        const l = laneOf(t.side);
        t.h0 = l[0];
        t.h1 = l[1];
      }
    };

    const update = (dt: number) => {
      introT += dt;
      energy *= Math.exp(-dt * 5);
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i];
        advance(t, baseSpeed(t) * dt);
        t.age += dt;
        if (t.age < t.life - 2.2 && isOff(t)) t.age = t.life - 2.2;
        if (t.age >= t.life) trails[i] = spawn(t.i, false, 0);
      }
    };

    const drawTrail = (t: Trail) => {
      const p = t.p;
      const n = p.length / 2;
      if (n < 3) return;
      const fade = Math.min(1, t.age / 1.4) * clamp01((t.life - t.age) / 2.2);
      if (fade <= 0.01) return;
      const m = n + 1;
      const c = t.far ? ctxf : ctx;
      const headA =
        t.al *
        (t.blue ? 0.8 : 1) *
        smooth(fade) *
        smooth(clamp01(introT / 1.6));
      const rgb = t.blue ? "31,143,224" : "27,34,43";
      for (let b = 0; b < B; b++) {
        const i0 = Math.floor((b * (m - 1)) / B);
        const i1 = Math.floor(((b + 1) * (m - 1)) / B);
        const al = headA * smooth(clamp01((b + 0.5) / B / 0.4));
        if (al < 0.01 || i1 <= i0) continue;
        c.beginPath();
        c.moveTo(i0 < n ? p[2 * i0] : t.x, i0 < n ? p[2 * i0 + 1] : t.y);
        for (let i = i0 + 1; i <= i1; i++)
          c.lineTo(i < n ? p[2 * i] : t.x, i < n ? p[2 * i + 1] : t.y);
        c.lineWidth = t.lw * lerp(0.35, 1, (b + 0.5) / B);
        c.strokeStyle = `rgba(${rgb},${al.toFixed(3)})`;
        c.stroke();
      }
    };

    const applyMask = (c: CanvasRenderingContext2D) => {
      const cx = box ? box.x + box.w / 2 : W / 2;
      const cy = box ? box.y + box.h / 2 : H / 2;
      if (!box) {
        c.save();
        c.globalCompositeOperation = "destination-in";
        const g = narrow
          ? c.createLinearGradient(0, 0, 0, H)
          : c.createLinearGradient(0, 0, W, 0);
        const mid = narrow ? cy / H : cx / W;
        // no measured box yet: keep a fixed clear band down the middle
        const hwBase = narrow ? 0.2 : 0.17;
        const hw = lerp(hwBase, 0, K);
        const soft = narrow ? 0.07 : 0.06;
        const m = K.toFixed(3);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(clamp01(mid - hw - soft), "rgba(0,0,0,1)");
        g.addColorStop(clamp01(mid - hw), `rgba(0,0,0,${m})`);
        g.addColorStop(clamp01(mid + hw), `rgba(0,0,0,${m})`);
        g.addColorStop(clamp01(mid + hw + soft), "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,1)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        c.restore();
      }
      // soft ellipse around the logo and headline; opens up as the headline fades
      const a = 1 - K;
      if (box && a > 0.01) {
        c.save();
        c.globalCompositeOperation = "destination-out";
        c.translate(cx, cy);
        c.scale((box.w / 2) * 1.02, (box.h / 2) * 1.1);
        const r = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        r.addColorStop(0, `rgba(0,0,0,${a.toFixed(3)})`);
        r.addColorStop(0.7, `rgba(0,0,0,${a.toFixed(3)})`);
        r.addColorStop(0.88, `rgba(0,0,0,${(a * 0.3).toFixed(3)})`);
        r.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = r;
        c.fillRect(-1, -1, 2, 2);
        c.restore();
      }
    };

    const draw = () => {
      if (!W) return;
      for (const c of [ctx, ctxf]) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, W, H);
        c.lineCap = "butt";
        c.lineJoin = "round";
      }
      for (const t of trails) drawTrail(t);
      applyMask(ctx);
      applyMask(ctxf);
      cv.style.filter = K > 0.001 ? `blur(${K * 6}px)` : "none";
      cv.style.opacity = String(1 - 0.5 * K);
      cvf.style.filter = `blur(${1.5 + K * 6}px)`;
      cvf.style.opacity = String(0.7 * (1 - 0.5 * K));
    };

    const loop = (ts: number) => {
      raf = 0;
      if (!alive || mq.matches || hidden) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0);
      last = ts;
      syncControl();
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const sync = () => {
      if (!mq.matches && !hidden) {
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      } else {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        // reduced motion: one still frame, drawn after the scene has written its first paint()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!alive) return;
            syncControl();
            draw();
          }),
        );
      }
    };

    const size = (init: boolean) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!w || !h) return;
      const flip = w < 640 !== narrow;
      const widthChanged = w !== W;
      W = w;
      H = h;
      narrow = w < 640;
      dpr = Math.min(narrow ? 1.5 : 2, window.devicePixelRatio || 1);
      for (const c of [cv, cvf]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      syncControl();
      // height-only changes (mobile address bar) keep the trails going
      if (init || flip || widthChanged) initTrails();
      draw();
    };

    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      if (lastTs && now > lastTs) {
        const v = (Math.abs(y - lastY) / (now - lastTs)) * 1000;
        energy = Math.max(energy, clamp01(v / 2000) * 0.8);
      }
      lastY = y;
      lastTs = now;
    };
    const onResize = () => size(false);
    const onVis = () => {
      hidden = document.hidden;
      sync();
    };

    // defer the first layout so the scene's first paint() has already filled `control`
    const boot = requestAnimationFrame(() => {
      size(true);
      sync();
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    mq.addEventListener("change", sync);
    return () => {
      alive = false;
      cancelAnimationFrame(boot);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", sync);
    };
  }, [control]);

  return (
    <div className="trails" aria-hidden="true">
      <canvas ref={farRef} />
      <canvas ref={nearRef} />
    </div>
  );
}
