"use client";

/*
  M15 — ambient-drift, v2.
  Three stacked layers for visual depth without color noise:
    1. Radial color washes (the original drift)
    2. SVG plus-pattern that breathes (the brief's "plus-bg motif")
    3. SVG noise grain — subtle texture, masks pixel-flat fields

  Light variant for paper backgrounds; dark for slate-ink.
  All layers respect prefers-reduced-motion (CSS query in globals.css).
  IntersectionObserver pauses the animation when offscreen.
*/

import { useEffect, useRef } from "react";

interface AmbientDriftProps {
  variant?: "light" | "dark";
  className?: string;
}

const NOISE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/>
      </filter>
      <rect width='200' height='200' filter='url(#n)'/>
    </svg>`,
  );

function plusPatternSvg(stroke: string) {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
        <g stroke='${stroke}' stroke-width='1' stroke-linecap='square' fill='none' opacity='0.55'>
          <path d='M32 24v16M24 32h16'/>
          <path d='M0 56v8M0 60h8' opacity='0.6'/>
          <path d='M56 0v8M60 0h8' opacity='0.6'/>
        </g>
      </svg>`,
    )
  );
}

export function AmbientDrift({ variant = "light", className }: AmbientDriftProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          el.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
        });
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const washes =
    variant === "dark"
      ? "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--mint-deep) 28%, transparent) 0%, transparent 38%), radial-gradient(circle at 8% 88%, color-mix(in oklab, var(--mint-soft) 22%, transparent) 0%, transparent 50%)"
      : "radial-gradient(circle at 12% 18%, color-mix(in oklab, var(--mint-deep) 32%, transparent) 0%, transparent 36%), radial-gradient(circle at 88% 82%, color-mix(in oklab, var(--mint-soft) 38%, transparent) 0%, transparent 42%)";

  const plusStroke = variant === "dark" ? "%23BFEDDF" : "%237B7689"; // mint-pale or slate-ink

  return (
    <div
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {/* Layer 1: drifting color washes — use transform (GPU) not background-position */}
      <div
        ref={ref}
        className="kagu-ambient-washes"
        style={{
          position: "absolute",
          inset: "-15%",
          opacity: variant === "dark" ? 0.55 : 0.6,
          background: washes,
          willChange: "transform",
        }}
      />
      {/* Layer 2: plus pattern that breathes */}
      <div
        className="kagu-ambient-plus"
        style={{
          position: "absolute",
          inset: "-15%",
          opacity: variant === "dark" ? 0.18 : 0.22,
          backgroundImage: `url("${plusPatternSvg(plusStroke)}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "64px 64px",
          willChange: "opacity, transform",
        }}
      />
      {/* Layer 3: grain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: variant === "dark" ? 0.32 : 0.22,
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundSize: "200px 200px",
          mixBlendMode: variant === "dark" ? "overlay" : "multiply",
        }}
      />
      <style>{`
        .kagu-ambient-washes {
          animation: kagu-drift 36s linear infinite alternate;
        }
        .kagu-ambient-plus {
          animation: kagu-plus-breathe 14s ease-in-out infinite alternate;
        }
        @keyframes kagu-drift {
          from { transform: translate3d(0%, 0%, 0); }
          to   { transform: translate3d(8%, 6%, 0); }
        }
        @keyframes kagu-plus-breathe {
          from { opacity: 0.14; transform: translate3d(0,0,0); }
          to   { opacity: 0.28; transform: translate3d(-12px,-8px,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-ambient-washes,
          .kagu-ambient-plus { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
