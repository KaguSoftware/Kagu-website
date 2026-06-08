"use client";

/*
  M05 — image-mask-sweep. Directional clip-path reveal driven by Framer Motion's
  whileInView. Single-fire (`viewport.once`). Reduced-motion: instant reveal.

  Direction semantics (be intentional — don't randomize):
  - "top"    → starts hidden from top; reveals top→bottom. Use for "arrival" feel.
  - "right"  → reveals left→right. Use for "moving forward" / forward-rhythm cards.
  - "bottom" → reveals bottom→top. Use for "lift" feel.
  - "left"   → reveals right→left. Use for "looking back" / return cards.
*/

import { motion, useReducedMotion } from "motion/react";
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

// GSAP "expo.inOut" ≈ this cubic-bezier (replaces the former ease: "expo.inOut").
const EXPO_IN_OUT = [0.87, 0, 0.13, 1] as const;

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
  const reduced = useReducedMotion();
  const clip = CLIPS[direction];

  if (reduced) {
    return (
      <div className={className} style={{ clipPath: "inset(0)", ...style }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      // Keep `from` inline so SSR/first paint shows the masked state (no flash
      // of fully-revealed content before the reveal runs).
      style={{ clipPath: clip.from, ...style }}
      initial={{ clipPath: clip.from }}
      whileInView={{ clipPath: clip.to }}
      // margin shrinks the viewport's bottom by 120px ≈ the old "top bottom-=120".
      viewport={{ once: true, margin: "0px 0px -120px 0px" }}
      transition={{ duration, delay, ease: EXPO_IN_OUT }}
    >
      {children}
    </motion.div>
  );
}
