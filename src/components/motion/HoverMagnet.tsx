"use client";

/*
  M09 — magnetic-pull. Spring-driven attraction toward cursor when within range.
  Max translation 8px (CTA) or 4px (work card via `strength={0.5}`).
  Disabled on touch + reduced-motion.
*/

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface HoverMagnetProps {
  children: ReactNode;
  strength?: number; // 1.0 = 8px max. 0.5 = 4px max.
  radius?: number; // px. Magnet engages within this distance.
  className?: string;
}

export function HoverMagnet({
  children,
  strength = 1,
  radius = 80,
  className,
}: HoverMagnetProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 25, mass: 1 });
  const sy = useSpring(y, { stiffness: 200, damping: 25, mass: 1 });

  useEffect(() => {
    if (reduced) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    const el = ref.current;
    if (!el) return;

    function move(e: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        x.set(0);
        y.set(0);
        return;
      }
      const pull = 1 - dist / radius;
      x.set(dx * 0.3 * strength * pull);
      y.set(dy * 0.3 * strength * pull);
    }

    function leave() {
      x.set(0);
      y.set(0);
    }

    window.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [radius, strength, reduced, x, y]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy, display: "inline-block" }} className={className}>
      {children}
    </motion.div>
  );
}
