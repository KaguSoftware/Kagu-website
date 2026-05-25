"use client";

/*
  M06 — marquee-velocity. Continuous horizontal scroll.
  Base velocity-coupled to Lenis scroll velocity (light coupling for Phase 2;
  full Lenis-velocity wiring lands in Phase 3 motion audit).
  Auto-pauses via IntersectionObserver when offscreen. Reduced-motion: static row.
*/

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  /** seconds for one full pass at base speed */
  duration?: number;
  /** "left" | "right" */
  direction?: "left" | "right";
  /** vertical padding utility class */
  className?: string;
}

export function Marquee({
  children,
  duration = 30,
  direction = "left",
  className,
}: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (!root || reduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          root.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
        });
      },
      { threshold: 0 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        position: "relative",
        maskImage:
          "linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)",
      }}
      className={className}
    >
      <div
        ref={rootRef}
        style={{
          display: "flex",
          width: "max-content",
          animation: `kagu-marquee-${direction} ${duration}s linear infinite`,
          willChange: "transform",
        }}
      >
        <div style={{ display: "flex", flexShrink: 0 }}>{children}</div>
        <div style={{ display: "flex", flexShrink: 0 }} aria-hidden>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes kagu-marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes kagu-marquee-right {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-marquee] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
