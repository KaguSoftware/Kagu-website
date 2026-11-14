"use client";

/*
  Admin toast system — ADMIN PANEL ONLY (mounted from src/app/admin/layout.tsx).

  Two ways toasts appear:
    1. Flash across redirects — the layout reads a one-shot cookie (set by Server
       Actions via flash()) and passes it as `initialFlash`; we show it once and
       clear the cookie client-side.
    2. Client-side — any admin client component calls `adminToast(tone, msg)`
       (e.g. "Copied", validation errors) via a tiny global event bus.

  Kagu-styled: cream card, small uppercase labels, ok/bad/accent tone dots. Animated
  with Framer Motion, stacked bottom-right, auto-dismiss with a draining bar.
  Styles live in src/styles/admin.css (.adm-toast*).
*/

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FLASH_COOKIE, type Flash, type FlashTone } from "../_actions/flash-shared";

type Toast = Flash & { id: number };

const TONE: Record<FlashTone, { accent: string; ink: string; label: string }> = {
  success: { accent: "var(--ok)", ink: "var(--ok-ink)", label: "Done" },
  error: { accent: "var(--bad)", ink: "var(--bad-ink)", label: "Error" },
  info: { accent: "var(--accent)", ink: "var(--accent-ink)", label: "Note" },
};

const EVENT = "kagu-admin-toast";

/** Fire a toast from any admin client component. */
export function adminToast(tone: FlashTone, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Flash>(EVENT, { detail: { tone, message } }));
}

let counter = 0;

export function Toaster({ initialFlash }: { initialFlash: Flash | null }) {
  const reduced = useReducedMotion() ?? false;
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Flash) => {
    const id = ++counter;
    setToasts((cur) => [...cur, { ...t, id }]);
    // Auto-dismiss after 4.5s (errors linger a touch longer).
    const ttl = t.tone === "error" ? 6000 : 4500;
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), ttl);
  }, []);

  // Show the server flash once, then clear the cookie so it doesn't repeat.
  useEffect(() => {
    if (!initialFlash) return;
    push(initialFlash);
    document.cookie = `${FLASH_COOKIE}=; path=/admin; max-age=0`;
  }, [initialFlash, push]);

  // Listen for client-side toasts.
  useEffect(() => {
    const handler = (e: Event) => push((e as CustomEvent<Flash>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [push]);

  const dismiss = (id: number) => setToasts((cur) => cur.filter((x) => x.id !== id));

  return (
    <div className="adm-toasts" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          const ttl = t.tone === "error" ? 6 : 4.5;
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              role="status"
              className="adm-toast"
              style={{ ["--toast-accent" as string]: tone.accent, ["--toast-ink" as string]: tone.ink }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="adm-toast__dot" aria-hidden />
              <div className="adm-toast__body">
                <span className="adm-toast__label">{tone.label}</span>
                <span className="adm-toast__msg">{t.message}</span>
              </div>
              <button
                type="button"
                className="adm-toast__close"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                ✕
              </button>
              {!reduced && (
                <motion.span
                  className="adm-toast__timer"
                  aria-hidden
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: ttl, ease: "linear" }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

    </div>
  );
}
