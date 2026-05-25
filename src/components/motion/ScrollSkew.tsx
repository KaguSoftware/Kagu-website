"use client";

/*
  M13 — scroll-skew. Subtle skewY tied to scroll velocity, capped at 1.5°
  (down from brief's 2.5° per design-motion-principles audit — at 2.5° this
  reads "cliché 2018 agency"; 1.5° is barely perceptible and lands as polish).
  Eases back to 0 over 600ms after scroll stops.
  Reduced-motion: disabled.
*/

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface ScrollSkewProps {
  children: ReactNode;
  /** Multiplier on velocity → degrees. Capped at maxDeg. */
  factor?: number;
  /** Maximum skew in degrees. */
  maxDeg?: number;
  className?: string;
}

export function ScrollSkew({
  children,
  factor = 0.04,
  maxDeg = 1.5,
  className,
}: ScrollSkewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    let target = 0;
    let current = 0;
    let raf = 0;
    let lastScroll = window.scrollY;
    let lastTime = performance.now();

    function loop(t: number) {
      const dt = Math.max(t - lastTime, 1);
      const now = window.scrollY;
      const v = (now - lastScroll) / dt; // px/ms
      lastScroll = now;
      lastTime = t;
      target = Math.max(Math.min(v * factor * 30, maxDeg), -maxDeg);
      current += (target - current) * 0.12;
      // Decay toward zero when target is small (i.e. user stopped scrolling)
      if (Math.abs(target) < 0.05) current += (0 - current) * 0.06;
      if (el) el.style.transform = `skewY(${current.toFixed(3)}deg)`;
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [factor, maxDeg, reduced]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
