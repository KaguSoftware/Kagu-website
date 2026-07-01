"use client";

/*
  PageTransition — swipe-in / swipe-out curtain that reads as a page transition
  rather than a load screen.

  A full-screen panel swipes IN from the left carrying the flat 2D kagu mark and
  a playful "loading screen" phrase, holds briefly, then swipes OUT to the left —
  revealing the page that was mounted underneath the whole time. On navigation the
  App Router keeps the current segment mounted until the next is ready, so the old
  page stays visible beneath the swipe (true overlay, no blank flash).

  Runs on first visit (session-gated per sessionKey) and on every pathname change.
  Respects reduced-motion (quick fade instead of a swipe).
*/

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Flat-2D Kagu mark — same paths/fills as the boot mark, kept static here so the
// transition stays snappy (no stroke draw-on).
const VIEWBOX = "0 0 1079 486";
const RIBBON =
  "M 1078 0 L 778 0 Q 741 0 719 19 L 459 262 L 340 146 L 104 146 L 218 256 L 345 368 L 564 369 L 663 463 L 911 486 L 733 317 Z";
const FOLD = "M 104 146 L 0 256 L 218 256 Z";
const WING = "M 1078 0 L 778 0 Q 741 0 719 19 L 345 368 L 677 368 Z";

const EASE = [0.16, 1, 0.3, 1] as const;

// Playful, studio/software-flavored loading lines — picked at random per swipe.
// Edit freely.
const PHRASES = [
  "Polishing pixels…",
  "Aligning to the grid…",
  "Compiling good taste…",
  "Waking the servers…",
  "Negotiating with the CSS…",
  "Warming up the espresso…",
  "Reticulating splines…",
  "Convincing the cache…",
  "Shipping something nice…",
  "Almost there, promise…",
] as const;

function pickPhrase() {
  return PHRASES[Math.floor(Math.random() * PHRASES.length)];
}

export function PageTransition({ sessionKey }: { sessionKey: string }) {
  const reduced = useReducedMotion() ?? false;
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [phrase, setPhrase] = useState<string>(PHRASES[0]);
  // Skip the very first pathname effect on a returning-session visit so we don't
  // double-fire (mount + pathname) — but still fire on genuine first visits.
  const firstRun = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // On the initial mount, gate the first-visit curtain per session.
    if (firstRun.current) {
      firstRun.current = false;
      if (sessionStorage.getItem(sessionKey)) return; // already visited this tab
      sessionStorage.setItem(sessionKey, "1");
    }

    setPhrase(pickPhrase());
    // Client-only, post-mount decision (no SSR output) — safe from hydration
    // mismatch, so the cascading-render lint rule doesn't apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);

    // in (~0.85) + hold (~0.8) ≈ 1.65s visible, then a ~0.85s swipe-out — a slow,
    // premium ≈2.5s total. Hide once the hold ends; AnimatePresence plays the exit
    // swipe. Reduced-motion: quick fade.
    const total = reduced ? 600 : 1650; // time visible before we trigger exit
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [pathname, reduced, sessionKey]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="kagu-swipe"
          aria-hidden
          initial={reduced ? { opacity: 0 } : { x: "-100%" }}
          animate={reduced ? { opacity: 1 } : { x: "0%" }}
          exit={reduced ? { opacity: 0 } : { x: "-100%" }}
          transition={{ duration: reduced ? 0.3 : 0.85, ease: EASE }}
        >
          <div className="kagu-swipe__inner">
            <div className="kagu-swipe__mark">
              <svg viewBox={VIEWBOX} className="kagu-swipe__svg" aria-hidden>
                <path d={RIBBON} fill="var(--ink)" opacity={0.57} />
                <path d={FOLD} fill="var(--ink)" opacity={0.47} />
                <path d={WING} fill="var(--ink)" opacity={0.95} />
              </svg>
            </div>
            <span className="kagu-swipe__phrase">{phrase}</span>
          </div>

          {/* Styles inline so they only ship when the overlay mounts. */}
          <style>{`
            .kagu-swipe {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              background:
                radial-gradient(circle at 50% 42%,
                  color-mix(in oklab, var(--mint-deep) 12%, var(--paper)) 0%,
                  var(--paper) 60%);
            }
            .kagu-swipe__inner {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: clamp(1rem, 3.5vh, 1.75rem);
            }
            .kagu-swipe__mark {
              width: min(52vw, 300px);
            }
            .kagu-swipe__svg {
              display: block;
              width: 100%;
              height: auto;
              overflow: visible;
            }
            .kagu-swipe__phrase {
              font-family: var(--font-mono, ui-monospace, monospace);
              font-size: var(--type-xs);
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: var(--mint-deep);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
