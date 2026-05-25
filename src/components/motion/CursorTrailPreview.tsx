"use client";

/*
  M14 — cursor-trail-preview.
  On hover of a work link, a small project thumbnail appears near the cursor
  and trails with ~80ms spring lag. Disabled on touch and reduced-motion.

  Selector contract: any element with [data-trail-preview="slug"] inside this
  component's subtree triggers the preview when hovered. The component reads
  the slug + cover bg + label from `previews` (passed in by parent).
*/

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "motion/react";

type Preview = { slug: string; bg: string; label: string };

interface CursorTrailPreviewProps {
  previews: readonly Preview[];
  children: React.ReactNode;
}

const COVER_BG: Record<string, string> = {
  "mint-pale": "var(--mint-pale)",
  "mint-soft": "var(--mint-soft)",
  "mint-deep": "var(--mint-deep)",
  "slate-ink": "var(--slate-ink)",
  paper: "var(--paper)",
};
const LABEL_FG: Record<string, string> = {
  "slate-ink": "var(--paper)",
};

export function CursorTrailPreview({ previews, children }: CursorTrailPreviewProps) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<Preview | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 30, mass: 1 });
  const sy = useSpring(y, { stiffness: 180, damping: 30, mass: 1 });

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(coarse || "ontouchstart" in window);
  }, []);

  useEffect(() => {
    if (isTouch || reduced) return;
    const root = rootRef.current;
    if (!root) return;

    function move(e: PointerEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
    }
    function over(e: PointerEvent) {
      let el = e.target as HTMLElement | null;
      while (el && el !== root) {
        const slug = el.dataset?.trailPreview;
        if (slug) {
          const p = previews.find((pv) => pv.slug === slug);
          if (p) setActive(p);
          return;
        }
        el = el.parentElement;
      }
      setActive(null);
    }
    window.addEventListener("pointermove", move);
    root.addEventListener("pointerover", over);
    root.addEventListener("pointerleave", () => setActive(null));
    return () => {
      window.removeEventListener("pointermove", move);
      root.removeEventListener("pointerover", over);
    };
  }, [isTouch, reduced, previews, x, y]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      {children}
      {!isTouch && !reduced && (
        <AnimatePresence>
          {active && (
            <motion.div
              key={active.slug}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                x: sx,
                y: sy,
                translateX: 24,
                translateY: 24,
                pointerEvents: "none",
                zIndex: 80,
                width: 180,
                height: 120,
                background: COVER_BG[active.bg] ?? "var(--paper)",
                border: "1px solid var(--neutral)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="display"
                style={{
                  fontSize: "var(--type-4xl)",
                  color: LABEL_FG[active.bg] ?? "var(--slate-ink)",
                  letterSpacing: "var(--tracking-tight)",
                  lineHeight: 1,
                }}
              >
                {active.label}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
