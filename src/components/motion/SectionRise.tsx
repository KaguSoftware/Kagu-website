"use client";

/*
  M07 — SectionRise. Section-level enter animation via whileInView.
  Single-fire (`once: true`). Uses --ease-out-quint. Reduced-motion: opacity only.
*/

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface SectionRiseProps {
  children: ReactNode;
  delay?: number;
  amount?: number;
  className?: string;
  as?: "div" | "section" | "article";
}

export function SectionRise({
  children,
  delay = 0,
  amount = 0.2,
  className,
  as = "div",
}: SectionRiseProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    return (
      <MotionTag
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}
