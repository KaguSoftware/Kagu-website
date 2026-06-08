"use client";

/*
  AdminLoader — premium boot animation, ADMIN PANEL ONLY.

  The flat 2D Kagu mark draws itself on: each path's stroke sweeps in
  (pathLength 0→1), then the solid fill blooms, a mint scan-line sweeps across,
  and the whole curtain lifts. A thin progress hairline tracks the sequence.

  Mounted from src/app/admin/layout.tsx so it NEVER renders on the public site.
  Shows once per full page load (session-flagged), respects reduced-motion.
*/

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Same flat-2D paths as KaguMark (kept inline so we can stroke-draw them).
const VIEWBOX = "0 0 1079 483";
const WING =
  "M 1078 5 L 776 0 L 733 9 L 669 47 L 418 267 L 300 169 L 62 167 L 0 231 L 146 236 L 300 374 L 550 374 L 638 457 L 684 481 L 895 482 L 722 325 Z";
const BODY = "M 1078 6 L 770 1 L 724 13 L 666 50 L 300 373 L 666 372 Z";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AdminLoader() {
  const reduced = useReducedMotion() ?? false;
  // Start hidden to avoid SSR/first-paint mismatch; decide on mount.
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only once per browser session (per tab) — not on client-side route hops.
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kagu-admin-booted")) return;
    sessionStorage.setItem("kagu-admin-booted", "1");
    setShow(true);

    const total = reduced ? 600 : 2300;
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="kagu-adminloader"
          aria-hidden
          initial={{ opacity: 1 }}
          exit={
            reduced
              ? { opacity: 0 }
              : { clipPath: "inset(0 0 100% 0)", opacity: 1 }
          }
          transition={{ duration: reduced ? 0.3 : 0.7, ease: EASE }}
        >
          <div className="kagu-adminloader__mark">
            <svg viewBox={VIEWBOX} className="kagu-adminloader__svg" aria-hidden>
              {/* Stroke draw-on layer */}
              {[WING, BODY].map((d, i) => (
                <motion.path
                  key={`stroke-${i}`}
                  d={d}
                  fill="none"
                  stroke="var(--mint-deep)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={reduced ? { pathLength: 1 } : { pathLength: 0, opacity: 0.9 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{
                    duration: reduced ? 0 : 1.1,
                    ease: EASE,
                    delay: reduced ? 0 : i * 0.18,
                  }}
                />
              ))}
              {/* Solid fill blooms in after the stroke has drawn */}
              <motion.path
                d={WING}
                fill="var(--ink)"
                initial={reduced ? { opacity: 0.17 } : { opacity: 0 }}
                animate={{ opacity: 0.17 }}
                transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 1.15 }}
              />
              <motion.path
                d={BODY}
                fill="var(--ink)"
                initial={reduced ? { opacity: 0.85 } : { opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 1.25 }}
              />
            </svg>

            {/* Mint scan-line sweep across the mark */}
            {!reduced && (
              <motion.span
                className="kagu-adminloader__scan"
                aria-hidden
                initial={{ x: "-130%" }}
                animate={{ x: "130%" }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
              />
            )}
          </div>

          {/* Wordmark + progress hairline */}
          <motion.div
            className="kagu-adminloader__meta"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0 : 1.3 }}
          >
            <span className="kagu-adminloader__word">kagu</span>
            <span className="kagu-adminloader__tag">Admin</span>
          </motion.div>

          <span className="kagu-adminloader__bar" aria-hidden>
            <motion.span
              className="kagu-adminloader__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: reduced ? 0.3 : 2.1, ease: [0.4, 0, 0.2, 1] }}
            />
          </span>

          {/* Styles inline (not in globals.css) so they ONLY ship with the
              admin panel and never touch the public site. */}
          <style>{`
            .kagu-adminloader {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: clamp(1.25rem, 4vh, 2rem);
              background:
                radial-gradient(circle at 50% 42%,
                  color-mix(in oklab, var(--mint-deep) 12%, var(--paper)) 0%,
                  var(--paper) 60%);
            }
            .kagu-adminloader__mark {
              position: relative;
              width: min(62vw, 340px);
              overflow: hidden;
            }
            .kagu-adminloader__svg {
              display: block;
              width: 100%;
              height: auto;
              overflow: visible;
            }
            .kagu-adminloader__scan {
              position: absolute;
              top: -10%;
              left: 0;
              width: 42%;
              height: 120%;
              pointer-events: none;
              background: linear-gradient(
                100deg,
                transparent 0%,
                color-mix(in oklab, var(--mint-deep) 55%, transparent) 50%,
                transparent 100%
              );
              mix-blend-mode: screen;
              filter: blur(6px);
            }
            .kagu-adminloader__meta {
              display: flex;
              align-items: baseline;
              gap: 0.75rem;
            }
            .kagu-adminloader__word {
              font-family: var(--font-display, ui-monospace, monospace);
              font-weight: 500;
              letter-spacing: -0.02em;
              font-size: var(--type-xl);
              color: var(--ink);
            }
            .kagu-adminloader__tag {
              font-family: var(--font-mono, ui-monospace, monospace);
              font-size: var(--type-xs);
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: var(--mint-deep);
            }
            .kagu-adminloader__bar {
              display: block;
              width: min(46vw, 200px);
              height: 2px;
              border-radius: 2px;
              overflow: hidden;
              background: color-mix(in oklab, var(--ink) 14%, transparent);
            }
            .kagu-adminloader__fill {
              display: block;
              width: 100%;
              height: 100%;
              transform-origin: left;
              background: var(--mint-deep);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
