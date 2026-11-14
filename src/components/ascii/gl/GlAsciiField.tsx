"use client";

/*
  GPU ASCII field. The same scenes as the CPU programs, but computed in
  fragment shaders: per frame the main thread only sets uniforms and issues
  three draw calls (cells → composite → glyphs), so input stays smooth.

    kind "hero"   the mark ray-traced + the chaotic field (home hero)
    kind "logo"   the mark only, fitted to the box (AsciiLogo)
    kind "video"  a <video> (found by id) as live ASCII (AsciiVideo)

  Lifecycle mirrors AsciiField: pauses off-screen / on hidden tabs, fps cap,
  one still frame under prefers-reduced-motion, rebuilds on resize and when
  web fonts land. Falls back to the CPU AsciiField when WebGL2 is missing
  (or with ?nogl in the URL), with a lower fps cap.
*/
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { AsciiField, type FieldProgram } from "../AsciiField";
import { RAMP, RN, h3 } from "../noise";
import { FULLSCREEN_VS, compile, supportsWebGL2, target, texture } from "./glUtils";
import { MH, MW, logoMask } from "./logoMask";
import { COMPOSITE_FS, DRAW_FS, LOGO_FS, VIDEO_FS } from "./shaders";
import "../ascii.css";

type Kind = "hero" | "logo" | "video";

type Props = {
  kind: Kind;
  /** CPU program used when WebGL2 is unavailable */
  fallback: () => FieldProgram;
  fontSize: (w: number, h: number) => number;
  maxCells?: number;
  fps?: number;
  fontWeight?: number;
  lineHeight?: number;
  control?: MutableRefObject<Record<string, number>>;
  interactive?: boolean;
  still?: boolean;
  stillTime?: number;
  /** kind "video": id of the <video> element */
  videoId?: string;
  className?: string;
};

const OBJ_H = (486 / 1079) * 2;
const ATLAS_COLS = 16;
const ALPHAS = new Float32Array(Array.from({ length: 12 }, (_, i) => 0.07 + Math.pow(i / 11, 1.35) * 0.93));

export function GlAsciiField(props: Props) {
  const [gpu, setGpu] = useState<boolean | null>(null);
  useEffect(() => {
    const ok = supportsWebGL2();
    const id = requestAnimationFrame(() => setGpu(ok));
    return () => cancelAnimationFrame(id);
  }, []);
  if (gpu === false) {
    return (
      <AsciiField
        program={props.fallback}
        fontSize={props.fontSize}
        maxCells={Math.min(props.maxCells ?? 16000, 14000)}
        fps={Math.min(props.fps ?? 45, 24)}
        fontWeight={props.fontWeight}
        lineHeight={props.lineHeight}
        control={props.control}
        interactive={props.interactive}
        still={props.still}
        stillTime={props.stillTime}
        className={props.className}
      />
    );
  }
  return <GlCanvas {...props} onFail={() => setGpu(false)} />;
}

function GlCanvas({
  kind,
  fontSize,
  maxCells = 26000,
  fps = 45,
  fontWeight = 400,
  lineHeight = 1.15,
  control,
  interactive = false,
  still = false,
  stillTime = 6,
  videoId,
  className = "",
  onFail,
}: Props & { onFail: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optsRef = useRef({ fontSize, maxCells, fps, fontWeight, lineHeight, control, interactive, still, stillTime, videoId, onFail });
  useEffect(() => {
    optsRef.current = { fontSize, maxCells, fps, fontWeight, lineHeight, control, interactive, still, stillTime, videoId, onFail };
  });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const gl = cv.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      optsRef.current.onFail();
      return;
    }
    const opts = () => optsRef.current;
    const isLogo = kind === "hero" || kind === "logo";

    // ---- programs + uniform lookup ----
    let progLogo: WebGLProgram | null = null;
    let progComp: WebGLProgram | null = null;
    let progVideo: WebGLProgram | null = null;
    let progDraw: WebGLProgram;
    try {
      progDraw = compile(gl, FULLSCREEN_VS, DRAW_FS);
      if (isLogo) {
        progLogo = compile(gl, FULLSCREEN_VS, LOGO_FS);
        progComp = compile(gl, FULLSCREEN_VS, COMPOSITE_FS);
      } else {
        progVideo = compile(gl, FULLSCREEN_VS, VIDEO_FS);
      }
    } catch (e) {
      console.warn("[ascii] WebGL2 path unavailable, using CPU fallback", e);
      optsRef.current.onFail();
      return;
    }
    const locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const U = (p: WebGLProgram, name: string) => {
      let m = locs.get(p);
      if (!m) locs.set(p, (m = new Map()));
      if (!m.has(name)) m.set(name, gl.getUniformLocation(p, name));
      return m.get(name) ?? null;
    };
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // ---- static textures ----
    let pieceTex: WebGLTexture | null = null;
    let normTex: WebGLTexture | null = null;
    if (isLogo) {
      const m = logoMask();
      pieceTex = texture(gl, MW, MH, gl.R8UI, gl.RED_INTEGER, gl.UNSIGNED_BYTE, m.piece);
      normTex = texture(gl, MW, MH, gl.RG8, gl.RG, gl.UNSIGNED_BYTE, m.normal);
    }
    let videoTex: WebGLTexture | null = null;
    if (kind === "video") {
      videoTex = texture(gl, 1, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    // ---- size-dependent state ----
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let W = 0;
    let H = 0;
    let dpr = 1;
    let cwPx = 8;
    let chhPx = 16;
    let cols = 1;
    let rows = 1;
    let narrow = false;
    let atlasTex: WebGLTexture | null = null;
    let dropsTex: WebGLTexture | null = null;
    let logoT: { tex: WebGLTexture; fbo: WebGLFramebuffer } | null = null;
    let cellT: { tex: WebGLTexture; fbo: WebGLFramebuffer } | null = null;
    const measure = document.createElement("canvas").getContext("2d");

    const size = () => {
      const o = opts();
      const r = wrap.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      narrow = W < 760 || window.matchMedia("(pointer: coarse)").matches;
      dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
      // cap the backing store (~4.5 MP) so 4K screens stay cheap
      const maxPx = 4.5e6;
      if (W * H * dpr * dpr > maxPx) dpr = Math.sqrt(maxPx / (W * H));
      let fs = o.fontSize(W, H);
      const est = (f: number) => (W / (f * 0.6)) * (H / (f * o.lineHeight));
      while (est(fs) > o.maxCells) fs += 0.5;
      const fontPx = Math.round(fs * dpr);
      const family = getComputedStyle(cv).fontFamily || "monospace";
      const font = `${o.fontWeight} ${fontPx}px ${family}`;
      if (measure) measure.font = font;
      cwPx = Math.max(1, Math.round(measure ? measure.measureText("M").width : fontPx * 0.6));
      chhPx = Math.max(1, Math.round(fontPx * o.lineHeight));
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cols = Math.ceil(cv.width / cwPx);
      rows = Math.ceil(cv.height / chhPx);

      // glyph atlas: the 70-step ramp in white, one slot per glyph
      const ac = document.createElement("canvas");
      ac.width = ATLAS_COLS * cwPx;
      ac.height = Math.ceil(RN / ATLAS_COLS) * chhPx;
      const a = ac.getContext("2d");
      if (a) {
        a.font = font;
        a.textAlign = "center";
        a.textBaseline = "middle";
        a.fillStyle = "#fff";
        for (let i = 1; i < RN; i++) {
          const sx = (i % ATLAS_COLS) * cwPx;
          const sy = Math.floor(i / ATLAS_COLS) * chhPx;
          a.fillText(RAMP[i], sx + cwPx / 2, sy + chhPx / 2 + fontPx * 0.04);
        }
      }
      if (atlasTex) gl.deleteTexture(atlasTex);
      atlasTex = texture(gl, ac.width, ac.height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, ac);

      for (const t of [logoT, cellT]) {
        if (t) {
          gl.deleteTexture(t.tex);
          gl.deleteFramebuffer(t.fbo);
        }
      }
      logoT = isLogo ? target(gl, cols, rows) : null;
      cellT = target(gl, cols, rows);

      if (isLogo) {
        // one rain drop per column at most (same hashes as the CPU program)
        const d = new Float32Array(cols * 4);
        if (kind === "hero") {
          const count = Math.round(cols * (narrow ? 0.24 : 0.36));
          for (let i = 0; i < count; i++) {
            const x = Math.floor(h3(i, 3, 91) * cols);
            if (d[x * 4 + 2] > 0) continue;
            d[x * 4] = 5 + h3(i, 5, 17) * 20;
            d[x * 4 + 1] = h3(i, 9, 33) * 400;
            d[x * 4 + 2] = 4 + Math.floor(h3(i, 11, 5) * 14);
            d[x * 4 + 3] = h3(i, 1, 77);
          }
        }
        if (dropsTex) gl.deleteTexture(dropsTex);
        dropsTex = texture(gl, cols, 1, gl.RGBA32F, gl.RGBA, gl.FLOAT, d);
      }
    };

    // ---- input ----
    const input = { x: -1, y: -1, inside: false, clicks: [] as { x: number; y: number; t: number }[] };
    const toCell = (cx: number, cy: number) => {
      const r = cv.getBoundingClientRect();
      const lx = cx - r.left;
      const ly = cy - r.top;
      return { x: (lx * dpr) / cwPx, y: (ly * dpr) / chhPx, inside: lx >= 0 && ly >= 0 && lx <= r.width && ly <= r.height };
    };
    const t0 = performance.now();
    const onMove = (e: PointerEvent) => {
      if (!opts().interactive) return;
      const p = toCell(e.clientX, e.clientY);
      input.x = p.x;
      input.y = p.y;
      input.inside = p.inside;
    };
    const onDown = (e: PointerEvent) => {
      if (!opts().interactive) return;
      const p = toCell(e.clientX, e.clientY);
      if (p.inside) {
        input.clicks.push({ x: p.x, y: p.y, t: (performance.now() - t0) / 1000 });
        if (input.clicks.length > 4) input.clicks.shift();
      }
    };
    const onLeave = () => {
      input.inside = false;
    };

    // ---- per-frame state for the mark (same smoothing as the CPU program) ----
    let yawS = 0;
    let pitchS = 0;
    let L = [-0.45, 0.5, 0.74];
    const R = new Float32Array(9);
    const clicksBuf = new Float32Array(12);

    const render = (t: number) => {
      if (!cellT || !atlasTex) return;
      const ext = opts().control?.current ?? {};
      const k = Math.min(1, Math.max(0, ext.k ?? 0));
      const tick = Math.floor(t * 10);
      const cellW = cwPx / dpr;
      const cellH = chhPx / dpr;

      if (isLogo && logoT && progLogo && progComp && pieceTex && normTex && dropsTex) {
        const fit = kind === "logo";
        const S = fit ? Math.min(W * 0.44, (H * 0.8) / OBJ_H) : (narrow ? W * 0.9 : Math.min(W * 0.66, 1250)) / 2;
        const cx = W / 2;
        const cy = fit ? H / 2 : narrow ? H * 0.3 : H * 0.4;
        const known = fit ? input.x !== -1 : input.inside;
        const lim = (v: number) => (v < -1.6 ? -1.6 : v > 1.6 ? 1.6 : v);
        const pxN = known ? lim((input.x * cellW - cx) / (fit ? Math.max(W, 600) : W / 2)) : 0;
        const pyN = known ? lim((input.y * cellH - cy) / (fit ? Math.max(H, 600) : H / 2)) : 0;
        yawS += (Math.sin(t * 0.33) * 0.42 + pxN * 0.35 - yawS) * 0.06;
        pitchS += (Math.sin(t * 0.27 + 1) * 0.16 + pyN * 0.22 - pitchS) * 0.06;
        const cyw = Math.cos(yawS);
        const syw = Math.sin(yawS);
        const cp = Math.cos(pitchS);
        const sp = Math.sin(pitchS);
        R[0] = cyw; R[1] = syw * sp; R[2] = syw * cp;
        R[3] = 0; R[4] = cp; R[5] = -sp;
        R[6] = -syw; R[7] = cyw * sp; R[8] = cyw * cp;
        let lt = [-0.45 + Math.sin(t * 0.2) * 0.2, 0.5, 0.74];
        if (known) lt = [pxN * 1.4, -pyN * 1.2, 0.8];
        const ll = Math.hypot(lt[0], lt[1], lt[2]);
        L = [L[0] + (lt[0] / ll - L[0]) * 0.08, L[1] + (lt[1] / ll - L[1]) * 0.08, L[2] + (lt[2] / ll - L[2]) * 0.08];
        const Ln = Math.hypot(L[0], L[1], L[2]);
        ext.yaw = (yawS * 180) / Math.PI;
        ext.sun = (Math.atan2(L[1] / Ln, L[0] / Ln) * 180) / Math.PI;

        // pass 1: the mark
        gl.bindFramebuffer(gl.FRAMEBUFFER, logoT.fbo);
        gl.viewport(0, 0, cols, rows);
        gl.useProgram(progLogo);
        gl.uniform2f(U(progLogo, "uCellPx"), cellW, cellH);
        gl.uniform1f(U(progLogo, "uS"), S);
        gl.uniform2f(U(progLogo, "uC"), cx, cy);
        gl.uniform1fv(U(progLogo, "uR"), R);
        gl.uniform3f(U(progLogo, "uL"), L[0] / Ln, L[1] / Ln, L[2] / Ln);
        gl.uniform1f(U(progLogo, "uT"), t);
        gl.uniform1i(U(progLogo, "uTick"), tick);
        gl.uniform1f(U(progLogo, "uIntro"), Math.min(1, Math.max(0, (t - 0.15) / 1.7)));
        gl.uniform1f(U(progLogo, "uGlint"), ((t / 4.2) % 1) * 2.6 - 0.8);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pieceTex);
        gl.uniform1i(U(progLogo, "uPiece"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normTex);
        gl.uniform1i(U(progLogo, "uNorm"), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // pass 2: field + halo + mark
        gl.bindFramebuffer(gl.FRAMEBUFFER, cellT.fbo);
        gl.useProgram(progComp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, logoT.tex);
        gl.uniform1i(U(progComp, "uLogo"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, dropsTex);
        gl.uniform1i(U(progComp, "uDrops"), 1);
        gl.uniform2f(U(progComp, "uGrid"), cols, rows);
        gl.uniform1f(U(progComp, "uField"), kind === "hero" ? 1 : 0);
        gl.uniform1f(U(progComp, "uK"), k);
        gl.uniform1f(U(progComp, "uAspect"), cellH / cellW);
        gl.uniform1f(U(progComp, "uT"), t);
        gl.uniform1i(U(progComp, "uTick"), tick);
        gl.uniform2f(U(progComp, "uPtr"), input.inside ? input.x : -999, input.inside ? input.y : -999);
        gl.uniform1f(U(progComp, "uLensR"), narrow ? 0 : 11);
        input.clicks = input.clicks.filter((c) => t - c.t < 3);
        clicksBuf.fill(0);
        input.clicks.forEach((c, i) => {
          clicksBuf[i * 3] = c.x;
          clicksBuf[i * 3 + 1] = c.y;
          clicksBuf[i * 3 + 2] = c.t;
        });
        gl.uniform3fv(U(progComp, "uClicks"), clicksBuf);
        gl.uniform1i(U(progComp, "uNClicks"), input.clicks.length);
        const gSeed = Math.floor(t / 1.8);
        if ((t / 1.8) % 1 < 0.08) {
          gl.uniform3i(
            U(progComp, "uGlitch"),
            Math.floor(h3(gSeed, 2, 4) * rows),
            1 + Math.floor(h3(gSeed, 3, 4) * 4),
            Math.floor((h3(gSeed, 4, 4) - 0.5) * cols * 0.25),
          );
        } else gl.uniform3i(U(progComp, "uGlitch"), 0, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (kind === "video" && progVideo && videoTex) {
        const v = document.getElementById(opts().videoId ?? "") as HTMLVideoElement | null;
        const ready = !!v && v.readyState >= 2 && v.videoWidth > 0;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        if (ready && v) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, v);
        gl.bindFramebuffer(gl.FRAMEBUFFER, cellT.fbo);
        gl.viewport(0, 0, cols, rows);
        gl.useProgram(progVideo);
        gl.uniform1i(U(progVideo, "uVideo"), 0);
        gl.uniform2f(U(progVideo, "uCellPx"), cellW, cellH);
        gl.uniform2f(U(progVideo, "uGrid"), cols, rows);
        if (ready && v) {
          const s = Math.max(W / v.videoWidth, H / v.videoHeight);
          const dw = v.videoWidth * s;
          const dh = v.videoHeight * s;
          gl.uniform4f(U(progVideo, "uFit"), (W - dw) / 2, (H - dh) / 2, dw, dh);
        }
        gl.uniform1f(U(progVideo, "uReady"), ready ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // pass 3: glyphs to the canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(progDraw);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cellT.tex);
      gl.uniform1i(U(progDraw, "uCells"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(U(progDraw, "uAtlas"), 1);
      gl.uniform2i(U(progDraw, "uCellDev"), cwPx, chhPx);
      gl.uniform2i(U(progDraw, "uGrid"), cols, rows);
      gl.uniform1f(U(progDraw, "uCanvasH"), cv.height);
      gl.uniform1i(U(progDraw, "uAtlasCols"), ATLAS_COLS);
      gl.uniform1fv(U(progDraw, "uAlpha"), ALPHAS);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // ---- loop ----
    let raf = 0;
    let running = false;
    let visible = true;
    let last = 0;
    let cap = opts().fps;
    // adaptive safety net: if frames come in well over budget, drop to 30 fps
    let slowFrames = 0;
    const step = (now: number) => {
      raf = 0;
      if (!running) return;
      raf = requestAnimationFrame(step);
      const c = narrow ? Math.min(30, cap) : cap;
      const dt = now - last;
      if (dt < 1000 / c - 2) return;
      if (last && dt > (1000 / c) * 1.8) {
        if (++slowFrames > 45 && cap > 30) cap = 30;
      } else slowFrames = Math.max(0, slowFrames - 1);
      last = now;
      render((now - t0) / 1000);
    };
    const stillFrame = () => render(opts().stillTime);
    const start = () => {
      if (mq.matches || opts().still) {
        running = false;
        stillFrame();
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
        const r = wrap.getBoundingClientRect();
        // ignore mobile toolbar jitter
        if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 120 && W) return;
        size();
        if (!running) stillFrame();
      });
    });
    const onVis = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      stop();
      start();
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };
    const onRestored = () => setEpoch((n) => n + 1);

    size();
    start();
    io.observe(wrap);
    ro.observe(wrap);
    document.addEventListener("visibilitychange", onVis);
    mq.addEventListener("change", onMotion);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    cv.addEventListener("webglcontextlost", onLost);
    cv.addEventListener("webglcontextrestored", onRestored);
    document.fonts?.ready.then(() => {
      size();
      if (!running) stillFrame();
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
      cv.removeEventListener("webglcontextlost", onLost);
      cv.removeEventListener("webglcontextrestored", onRestored);
      // free GPU objects (don't force-lose the context: React may re-run this
      // effect on the same canvas, e.g. in dev strict mode)
      for (const tx of [pieceTex, normTex, videoTex, atlasTex, dropsTex, logoT?.tex, cellT?.tex]) {
        if (tx) gl.deleteTexture(tx);
      }
      for (const f of [logoT?.fbo, cellT?.fbo]) if (f) gl.deleteFramebuffer(f);
      for (const p of [progLogo, progComp, progVideo, progDraw]) if (p) gl.deleteProgram(p);
      gl.deleteVertexArray(vao);
    };
  }, [kind, epoch]);

  return (
    <div ref={wrapRef} className={`ascii-field ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
