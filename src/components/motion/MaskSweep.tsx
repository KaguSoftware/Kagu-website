"use client";

/*
  M05 — image-mask-sweep. Directional clip-path reveal driven by ScrollTrigger.
  Single-fire (`once: true`). Reduced-motion: instant reveal.

  Direction semantics (be intentional — don't randomize):
  - "top"    → starts hidden from top; reveals top→bottom. Use for "arrival" feel.
  - "right"  → reveals left→right. Use for "moving forward" / forward-rhythm cards.
  - "bottom" → reveals bottom→top. Use for "lift" feel.
  - "left"   → reveals right→left. Use for "looking back" / return cards.
*/

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export type SweepDirection = "top" | "right" | "bottom" | "left";

const CLIPS: Record<SweepDirection, { from: string; to: string }> = {
  top: {
    from: "inset(100% 0 0 0)",
    to: "inset(0% 0 0 0)",
  },
  right: {
    from: "inset(0 100% 0 0)",
    to: "inset(0 0% 0 0)",
  },
  bottom: {
    from: "inset(0 0 100% 0)",
    to: "inset(0 0 0% 0)",
  },
  left: {
    from: "inset(0 0 0 100%)",
    to: "inset(0 0 0 0%)",
  },
};

interface MaskSweepProps {
  children: ReactNode;
  direction?: SweepDirection;
  duration?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function MaskSweep({
  children,
  direction = "right",
  duration = 1.3,
  delay = 0,
  className,
  style,
}: MaskSweepProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.clipPath = "inset(0)";
      return;
    }
    const clip = CLIPS[direction];
    gsap.set(el, { clipPath: clip.from, opacity: 1 });
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top bottom-=120",
      once: true,
      onEnter() {
        gsap.to(el, {
          clipPath: clip.to,
          duration,
          delay,
          ease: "expo.inOut",
        });
      },
    });
    return () => trigger.kill();
  }, [direction, duration, delay, reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        clipPath: reduced ? "inset(0)" : CLIPS[direction].from,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
