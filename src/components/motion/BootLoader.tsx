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
// Full silhouette (with the head-fold detour) for the stroke draw-on; the
// fills split into ribbon (fold cut out) / fold / wing for the 3-tone read.
const VIEWBOX = "0 0 1079 486";
const SILHOUETTE =
  "M 1078 0 L 778 0 Q 741 0 719 19 L 459 262 L 340 146 L 104 146 L 0 256 L 218 256 L 345 368 L 564 369 L 663 463 L 911 486 L 733 317 Z";
const RIBBON =
  "M 1078 0 L 778 0 Q 741 0 719 19 L 459 262 L 340 146 L 104 146 L 218 256 L 345 368 L 564 369 L 663 463 L 911 486 L 733 317 Z";
const FOLD = "M 104 146 L 0 256 L 218 256 Z";
const WING = "M 1078 0 L 778 0 Q 741 0 719 19 L 345 368 L 677 368 Z";

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

    // Kept short on purpose: the loader is a fixed overlay — the page renders
    // and hydrates behind it — but it still hides content, so it must never
    // outstay the draw-on.
    const total = reduced ? 300 : 950;
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [reduced, sessionKey]);

  return (
    <AnimatePresence>{show && <BootLoaderView tag={tag} />}</AnimatePresence>
  );
}

/* The boot animation itself — always visible while mounted. Rendered directly
   as the route-level loading fallback (src/app/loading.tsx) so navigation shows
   the same curtain as the first load, and wrapped by <BootLoader> for the
   session-gated first-visit curtain. */
export function BootLoaderView({ tag }: { tag?: string }) {
  const reduced = useReducedMotion() ?? false;

  return (
        <motion.div
          className="kagu-bootloader"
          aria-hidden
          initial={{ opacity: 1 }}
          exit={
            reduced
              ? { opacity: 0 }
              : { clipPath: "inset(0 0 100% 0)", opacity: 1 }
          }
          transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE }}
        >
          <div className="kagu-bootloader__mark">
            <svg viewBox={VIEWBOX} className="kagu-bootloader__svg" aria-hidden>
              {/* Stroke draw-on layer */}
              {[SILHOUETTE, WING].map((d, i) => (
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
                    duration: reduced ? 0 : 0.5,
                    ease: EASE,
                    delay: reduced ? 0 : i * 0.08,
                  }}
                />
              ))}
              {/* Solid fills bloom in after the stroke has drawn — grey ribbon,
                  darker head fold, then the bright wing on top */}
              <motion.path
                d={RIBBON}
                fill="var(--ink)"
                initial={reduced ? { opacity: 0.57 } : { opacity: 0 }}
                animate={{ opacity: 0.57 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.45 }}
              />
              <motion.path
                d={FOLD}
                fill="var(--ink)"
                initial={reduced ? { opacity: 0.47 } : { opacity: 0 }}
                animate={{ opacity: 0.47 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.45 }}
              />
              <motion.path
                d={WING}
                fill="var(--ink)"
                initial={reduced ? { opacity: 0.95 } : { opacity: 0 }}
                animate={{ opacity: 0.95 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.52 }}
              />
            </svg>

            {/* Mint scan-line sweep across the mark */}
            {!reduced && (
              <motion.span
                className="kagu-bootloader__scan"
                aria-hidden
                initial={{ x: "-130%" }}
                animate={{ x: "130%" }}
                transition={{ duration: 0.55, ease: EASE, delay: 0.35 }}
              />
            )}
          </div>

          {/* Wordmark + progress hairline */}
          <motion.div
            className="kagu-bootloader__meta"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: reduced ? 0 : 0.4 }}
          >
            <span className="kagu-bootloader__word">kagu</span>
            {tag ? <span className="kagu-bootloader__tag">{tag}</span> : null}
          </motion.div>

          <span className="kagu-bootloader__bar" aria-hidden>
            <motion.span
              className="kagu-bootloader__fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: reduced ? 0.2 : 0.85, ease: [0.4, 0, 0.2, 1] }}
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
  );
}
