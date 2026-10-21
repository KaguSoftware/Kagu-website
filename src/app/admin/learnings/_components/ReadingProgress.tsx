"use client";

import { motion, useScroll } from "motion/react";

/* Slim accent bar across the very top of the viewport that fills as you
   read the article — a quiet "how far along am I" cue. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className="lr-progress"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
