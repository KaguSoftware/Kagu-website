"use client";

import { motion, useScroll } from "motion/react";

/* Thin mint hairline across the very top of the viewport that fills as you
   read the article — a quiet "how far along am I" cue. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-mint-deep"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
