"use client";

/*
  BootLoader — premium boot animation shared by the public site and the admin
  panel (the admin passes tag="Admin").

  The flat 2D Kagu mark draws itself on: each path's stroke sweeps in
  (pathLength 0→1), then the solid fill blooms, a mint scan-line sweeps across,
  and the whole curtain lifts. A thin progress hairline tracks the sequence.

  Shows once per full page load (session-flagged per sessionKey), respects
  reduced-motion.
*/

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Same flat-2D paths as KaguMark (kept inline so we can stroke-draw them).
const VIEWBOX = "0 0 1079 483";
const WING =
  "M 1078 5 L 776 0 L 733 9 L 669 47 L 418 267 L 300 169 L 62 167 L 0 231 L 146 236 L 300 374 L 550 374 L 638 457 L 684 481 L 895 482 L 722 325 Z";
const BODY = "M 1078 6 L 770 1 L 724 13 L 666 50 L 300 373 L 666 372 Z";

const EASE = [0.16, 1, 0.3, 1] as const;

export function BootLoader({
  tag,
  sessionKey,
}: {
  tag?: string;
  sessionKey: string;
}) {
  const reduced = useReducedMotion() ?? false;
  // Start hidden to avoid SSR/first-paint mismatch; decide on mount.
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only once per browser session (per tab) — not on client-side route hops.
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    // Client-only first-visit decision after mount — can't cause a hydration
    // mismatch (server renders nothing), so the cascading-render lint rule
    // doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);

    const total = reduced ? 600 : 2300;
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [reduced, sessionKey]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="kagu-bootloader"
          aria-hidden
          initial={{ opacity: 1 }}
          exit={
            reduced
              ? { opacity: 0 }
              : { clipPath: "inset(0 0 100% 0)", opacity: 1 }
          }
          transition={{ duration: reduced ? 0.3 : 0.7, ease: EASE }}
        >
          <div className="kagu-bootloader__mark">
            <svg viewBox={VIEWBOX} className="kagu-bootloader__svg" aria-hidden>
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
                className="kagu-bootloader__scan"
                aria-hidden
                initial={{ x: "-130%" }}
                animate={{ x: "130%" }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
              />
            )}
          </div>

          {/* Wordmark + progress hairline */}
          <motion.div
            className="kagu-bootloader__meta"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0 : 1.3 }}
          >
            <span className="kagu-bootloader__word">kagu</span>
            {tag ? <span className="kagu-bootloader__tag">{tag}</span> : null}
          </motion.div>

          <span className="kagu-bootloader__bar" aria-hidden>
            <motion.span
              className="kagu-bootloader__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: reduced ? 0.3 : 2.1, ease: [0.4, 0, 0.2, 1] }}
            />
          </span>

          {/* Styles inline so they only ship when the loader mounts. */}
          <style>{`
            .kagu-bootloader {
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
            .kagu-bootloader__mark {
              position: relative;
              width: min(62vw, 340px);
              overflow: hidden;
            }
            .kagu-bootloader__svg {
              display: block;
              width: 100%;
              height: auto;
              overflow: visible;
            }
            .kagu-bootloader__scan {
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
            .kagu-bootloader__meta {
              display: flex;
              align-items: baseline;
              gap: 0.75rem;
            }
            .kagu-bootloader__word {
              font-family: var(--font-display, ui-monospace, monospace);
              font-weight: 500;
              letter-spacing: -0.02em;
              font-size: var(--type-xl);
              color: var(--ink);
            }
            .kagu-bootloader__tag {
              font-family: var(--font-mono, ui-monospace, monospace);
              font-size: var(--type-xs);
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: var(--mint-deep);
            }
            .kagu-bootloader__bar {
              display: block;
              width: min(46vw, 200px);
              height: 2px;
              border-radius: 2px;
              overflow: hidden;
              background: color-mix(in oklab, var(--ink) 14%, transparent);
            }
            .kagu-bootloader__fill {
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
