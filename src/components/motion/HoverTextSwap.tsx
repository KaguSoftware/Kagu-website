"use client";

/*
  M08 — hover-text-swap. The "Let's Talk Let's Talk" CTA pattern:
  visible copy translates up out of frame while a duplicate slides in
  from below. Both copies blur 1px mid-flight to mask glyph interpolation.
  Reduced-motion: instant swap or no swap (we choose no swap for clarity).
*/

import { useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

interface HoverTextSwapProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function HoverTextSwap({ children, className = "", style }: HoverTextSwapProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  return (
    <span
      className={`kagu-text-swap ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom",
        lineHeight: "inherit",
        // line-height:1 + overflow:hidden clips Space Mono's descenders (the
        // "g" tail). Pad the clip box so descenders show; the swap copies still
        // clear frame since they translate 110% of their own height.
        paddingBottom: "0.22em",
        ...style,
      }}
    >
      <span className="kagu-text-swap__top" style={{ display: "inline-block", willChange: "transform, filter" }}>
        {children}
      </span>
      <span
        aria-hidden
        className="kagu-text-swap__bottom"
        style={{
          position: "absolute",
          inset: 0,
          display: "inline-block",
          willChange: "transform, filter",
        }}
      >
        {children}
      </span>
      <style>{`
        .kagu-text-swap__top {
          transition: transform 280ms cubic-bezier(0.6, 0.01, 0.05, 0.95),
                      filter 80ms ease-out 100ms;
        }
        .kagu-text-swap__bottom {
          /* Initial offset lives here, not inline — an inline transform would
             beat the :hover rule on specificity and the copy would never rise. */
          transform: translateY(110%);
          transition: transform 280ms cubic-bezier(0.6, 0.01, 0.05, 0.95),
                      filter 80ms ease-out 100ms;
        }
        :where(a, button, .kagu-text-swap-trigger):hover .kagu-text-swap__top,
        .kagu-text-swap:hover .kagu-text-swap__top {
          transform: translateY(-110%);
          filter: blur(0.4px);
        }
        :where(a, button, .kagu-text-swap-trigger):hover .kagu-text-swap__bottom,
        .kagu-text-swap:hover .kagu-text-swap__bottom {
          transform: translateY(0);
          filter: blur(0.4px);
        }
      `}</style>
    </span>
  );
}
