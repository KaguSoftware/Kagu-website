"use client";

/*
  M04 — word-mask-reveal. Each word wrapped in overflow-hidden;
  words rise via mask, not Y-translate of the text itself.
  Use sparingly (≤ 3 per page per DESIGN_BASELINE).
*/

import { motion, useReducedMotion } from "motion/react";
import { createElement, useMemo } from "react";

interface WordMaskRevealProps {
  text: string;
  delay?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
}

export function WordMaskReveal({
  text,
  delay = 0,
  className,
  as: Tag = "h1",
}: WordMaskRevealProps) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);

  if (reduced) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay }}
      >
        {(() => {
          const Component = Tag;
          return <Component className={className}>{text}</Component>;
        })()}
      </motion.span>
    );
  }

  // `createElement` (vs `<Component>`) sidesteps a JSX quirk: @react-three/fiber
  // adds ~200 entries to JSX.IntrinsicElements, so a polymorphic `ElementType`
  // tag resolves `children` to `never`. Same runtime, clean types.
  const Component = Tag as React.ElementType;
  return createElement(
    Component,
    { className, "aria-label": text },
    words.map((word, i) => (
      <span
        key={`${word}-${i}`}
        aria-hidden
        style={{
          display: "inline-block",
          overflow: "hidden",
          verticalAlign: "top",
          paddingBottom: "0.12em",
          marginRight: i === words.length - 1 ? 0 : "0.28em",
        }}
      >
        <motion.span
          style={{ display: "inline-block" }}
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          transition={{
            duration: 1,
            delay: delay + i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
        </motion.span>
      </span>
    )),
  );
}
