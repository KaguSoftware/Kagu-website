"use client";

/*
  RouteProgress — a thin mint progress bar across the top of the admin panel
  (YouTube/Vercel style). ADMIN PANEL ONLY (mounted from admin/layout.tsx).

  Next.js App Router has no public navigation-start event, so we approximate:
  intercept admin link clicks (capture phase) to START the bar, and COMPLETE it
  when the pathname actually changes. Gives immediate feedback on click plus a
  truthful finish on arrival. Reduced-motion: a brief, non-animated flash.
*/

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function RouteProgress() {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(false);
  const prevPath = useRef(pathname);

  // Start the bar when an internal admin link is clicked.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey)
        return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || a.target === "_blank") return;
      // Same-path clicks won't trigger a pathname change → don't get stuck.
      if (href === pathname) return;
      setActive(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  // Complete when the route actually changes.
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setActive(false);
    }
  }, [pathname]);

  // Safety: never let the bar hang forever if a click didn't navigate.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 6000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="kagu-routeprogress"
          aria-hidden
          initial={{ scaleX: 0, opacity: 1 }}
          // Trickle toward ~90% while pending, then snap to 100% on exit.
          animate={{ scaleX: reduced ? 0.9 : [0, 0.3, 0.62, 0.86, 0.92] }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  scaleX: { duration: 2.2, ease: [0.16, 1, 0.3, 1], times: [0, 0.15, 0.4, 0.75, 1] },
                  opacity: { duration: 0.25, delay: 0.1 },
                }
          }
        >
          <style>{`
            .kagu-routeprogress {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 2px;
              transform-origin: left;
              z-index: 10001;
              background: linear-gradient(
                90deg,
                color-mix(in oklab, var(--mint-deep) 60%, transparent),
                var(--mint-deep)
              );
              box-shadow: 0 0 12px color-mix(in oklab, var(--mint-deep) 70%, transparent);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
