"use client";

/*
  PageTransition — swipe curtain that reads as a page transition rather than a
  load screen.

  A full-screen panel carrying the flat 2D kagu mark and a playful phrase swipes
  IN from the left the moment an internal link is clicked (covering whatever load
  latency the next route has), then swipes OUT to the right once the new page has
  actually landed. Because the panel is already covering the screen during the
  load, there's no dead wait staring at the old page.

  Two phases, two signals:
    • click on an internal <a>  → cover (swipe in), hold
    • pathname finally changes  → reveal (swipe out)
  Plus a session-gated first-visit curtain on mount.

  Respects reduced-motion (quick fade instead of a swipe).
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Flat-2D Kagu mark — same paths/fills as the boot mark. The full silhouette
// (with head-fold detour) strokes itself on; the fills bloom in afterward.
const VIEWBOX = "0 0 1079 486";
const SILHOUETTE =
  "M 1078 0 L 778 0 Q 741 0 719 19 L 459 262 L 340 146 L 104 146 L 0 256 L 218 256 L 345 368 L 564 369 L 663 463 L 911 486 L 733 317 Z";
const RIBBON =
  "M 1078 0 L 778 0 Q 741 0 719 19 L 459 262 L 340 146 L 104 146 L 218 256 L 345 368 L 564 369 L 663 463 L 911 486 L 733 317 Z";
const FOLD = "M 104 146 L 0 256 L 218 256 Z";
const WING = "M 1078 0 L 778 0 Q 741 0 719 19 L 345 368 L 677 368 Z";

const EASE = [0.16, 1, 0.3, 1] as const;

// Minimum time the cover stays up so fast navigations still read as a deliberate
// transition (just past the swipe-in). The curtain must never make the user wait
// on an already-loaded page — it reveals as soon as the route lands.
const MIN_COVER_MS = 650;

// Playful, studio/software-flavored loading lines — picked at random per swipe.
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
  "Bribing the load balancer…",
  "Untangling the spaghetti code…",
  "Asking the intern nicely…",
  "Feeding the hamsters…",
  "Dividing by zero, carefully…",
  "Rounding up the stray semicolons…",
  "Blaming it on the cache…",
  "Petting the server rack…",
  "Summoning the pixels…",
  "Yelling at the router…",
  "Pretending to load…",
  "Buffering your patience…",
  "Consulting the rubber duck…",
  "Applying a light coat of magic…",
  "Waking up the designers…",
  "Counting to infinity, twice…",
  "Hiding the merge conflicts…",
  "Sacrificing a bug to the compiler…",
  "Making it look effortless…",
  "Aligning the stars (and the divs)…",
  "Refilling the coffee machine…",
  "Turning it off and on again…",
  "Downloading more RAM…",
  "Teaching the AI some manners…",
  "Whispering to the database…",
  "Herding the microservices…",
  "Ignoring the warnings…",
  "Faking it till we make it…",
  "Loading the loading screen…",
  "Please hold, we're vibing…",
] as const;

function pickPhrase() {
  return PHRASES[Math.floor(Math.random() * PHRASES.length)];
}

export function PageTransition() {
  const reduced = useReducedMotion() ?? false;
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [phrase, setPhrase] = useState<string>(PHRASES[0]);
  // Bumped every time the cover is raised so the SVG remounts and replays its
  // draw-on animation from scratch on every transition (not just the first).
  const [runId, setRunId] = useState(0);

  // When the cover went up, so we can enforce MIN_COVER_MS before revealing.
  const coverStart = useRef(0);
  // Pathname we were on when the cover went up — reveal only once it actually
  // changes (i.e. the new route landed).
  const coverFromPath = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const raise = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPhrase(pickPhrase());
    setRunId((n) => n + 1);
    coverStart.current = Date.now();
    coverFromPath.current = window.location.pathname;
    setShow(true);
  }, []);

  // Cover on internal-link clicks (capture phase, before Next router hijacks it).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const target = a.getAttribute("target");
      if (!href || href.startsWith("#") || target === "_blank") return;
      if (a.hasAttribute("download")) return;

      // Same-origin internal navigation only, and not the current page.
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      // No funny overlay anywhere near the admin panel — the admin BootLoader
      // owns that experience.
      if (url.pathname.startsWith("/admin") || window.location.pathname.startsWith("/admin")) return;

      raise();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [raise]);

  // Reveal once the destination route has actually landed (pathname changed
  // from the one we covered), respecting the minimum cover time.
  useEffect(() => {
    if (!show) return;
    if (pathname === coverFromPath.current) return; // still loading — keep covered

    const elapsed = Date.now() - coverStart.current;
    const wait = Math.max(0, MIN_COVER_MS - elapsed);
    hideTimer.current = setTimeout(() => setShow(false), wait);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname, show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="kagu-swipe"
          aria-hidden
          initial={reduced ? { opacity: 0 } : { x: "-100%" }}
          animate={reduced ? { opacity: 1 } : { x: "0%" }}
          exit={reduced ? { opacity: 0 } : { x: "100%" }}
          transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE }}
        >
          <div className="kagu-swipe__inner">
            <div className="kagu-swipe__mark">
              <svg key={runId} viewBox={VIEWBOX} className="kagu-swipe__svg" aria-hidden>
                {/* Stroke draw-on: the outline sweeps itself in. Kept independent
                    of reduced-motion (it's the point of the transition) — only
                    the big panel swipe honors reduced-motion. */}
                {[SILHOUETTE, WING].map((d, i) => (
                  <motion.path
                    key={`stroke-${i}`}
                    d={d}
                    fill="none"
                    stroke="var(--mint-deep)"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0.9 }}
                    animate={{ pathLength: 1, opacity: 0.9 }}
                    transition={{
                      duration: 0.5,
                      ease: EASE,
                      delay: 0.1 + i * 0.08,
                    }}
                  />
                ))}
                {/* Solid fills bloom in after the stroke has drawn */}
                <motion.path
                  d={RIBBON}
                  fill="var(--ink)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.57 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                />
                <motion.path
                  d={FOLD}
                  fill="var(--ink)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.47 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                />
                <motion.path
                  d={WING}
                  fill="var(--ink)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  transition={{ duration: 0.3, delay: 0.56 }}
                />
              </svg>

              {/* Mint scan-line sweep across the mark */}
              <motion.span
                className="kagu-swipe__scan"
                aria-hidden
                initial={{ x: "-130%" }}
                animate={{ x: "130%" }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
              />
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
              position: relative;
              width: min(52vw, 300px);
              overflow: hidden;
            }
            .kagu-swipe__svg {
              display: block;
              width: 100%;
              height: auto;
              overflow: visible;
            }
            .kagu-swipe__scan {
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
            .kagu-swipe__phrase {
              font-family: var(--font-mono, ui-monospace, monospace);
              font-size: clamp(0.95rem, 2.6vw, 1.25rem);
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: var(--ink);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
