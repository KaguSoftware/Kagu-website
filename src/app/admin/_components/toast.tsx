"use client";

/*
  Admin toast system — ADMIN PANEL ONLY (mounted from src/app/admin/layout.tsx).

  Two ways toasts appear:
    1. Flash across redirects — the layout reads a one-shot cookie (set by Server
       Actions via flash()) and passes it as `initialFlash`; we show it once and
       clear the cookie client-side.
    2. Client-side — any admin client component calls `adminToast(tone, msg)`
       (e.g. "Copied", validation errors) via a tiny global event bus.

  Kagu-styled: dark surface, mono labels, mint/amber/red tone accents. Animated
  with Framer Motion, stacked bottom-right, auto-dismiss with a draining bar.
  Styles are inline so they never ship to the public site.
*/

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FLASH_COOKIE, type Flash, type FlashTone } from "../_actions/flash-shared";

type Toast = Flash & { id: number };

const TONE: Record<FlashTone, { accent: string; label: string }> = {
  success: { accent: "var(--mint-deep)", label: "Done" },
  error: { accent: "#e5594e", label: "Error" },
  info: { accent: "var(--slate-ink)", label: "Note" },
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
    <div className="kagu-toasts" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          const ttl = t.tone === "error" ? 6 : 4.5;
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              role="status"
              className="kagu-toast"
              style={{ ["--toast-accent" as string]: tone.accent }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="kagu-toast__dot" aria-hidden />
              <div className="kagu-toast__body">
                <span className="kagu-toast__label">{tone.label}</span>
                <span className="kagu-toast__msg">{t.message}</span>
              </div>
              <button
                type="button"
                className="kagu-toast__close"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                ✕
              </button>
              {!reduced && (
                <motion.span
                  className="kagu-toast__timer"
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

      <style>{`
        .kagu-toasts {
          position: fixed;
          right: clamp(12px, 3vw, 24px);
          bottom: clamp(12px, 3vh, 24px);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: min(92vw, 360px);
          pointer-events: none;
        }
        .kagu-toast {
          position: relative;
          pointer-events: auto;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          overflow: hidden;
          padding: 13px 14px 15px;
          background: color-mix(in oklab, var(--mint-pale) 92%, var(--paper));
          border: 1px solid var(--neutral);
          border-left: 3px solid var(--toast-accent);
          border-radius: var(--radius-md, 8px);
          box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.6);
        }
        .kagu-toast__dot {
          margin-top: 5px;
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: var(--toast-accent);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--toast-accent) 22%, transparent);
        }
        .kagu-toast__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .kagu-toast__label {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--toast-accent);
        }
        .kagu-toast__msg {
          font-size: var(--type-sm, 0.875rem);
          line-height: 1.4;
          color: var(--ink);
          word-break: break-word;
        }
        .kagu-toast__close {
          flex: 0 0 auto;
          background: none;
          border: 0;
          cursor: pointer;
          font-size: 11px;
          line-height: 1;
          padding: 2px;
          color: var(--slate-ink);
          transition: color 160ms ease;
        }
        .kagu-toast__close:hover { color: var(--ink); }
        .kagu-toast__timer {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 100%;
          transform-origin: left;
          background: var(--toast-accent);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
