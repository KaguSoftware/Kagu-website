"use client";

/*
  DeleteButton — a "Delete" trigger that opens a Kagu-styled confirm dialog
  (replacing the native window.confirm), then submits a delete Server Action
  bound to a hidden `id`. Animated with Framer Motion; Esc / backdrop / Cancel
  dismiss; the confirm button shows a pending state while the action runs.
*/

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

function ConfirmSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-[#e5594e] px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DeleteButton({
  id,
  action,
  confirm = "Delete this item? This cannot be undone.",
  label = "Delete",
}: {
  id: string;
  action: (formData: FormData) => void;
  confirm?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;

  // Esc closes the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="kagu-confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="kagu-confirm__card"
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="kagu-confirm__eyebrow">Confirm</span>
              <p className="kagu-confirm__msg">{confirm}</p>
              <div className="kagu-confirm__actions">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Cancel
                </button>
                <form action={action}>
                  <input type="hidden" name="id" value={id} />
                  <ConfirmSubmit />
                </form>
              </div>
            </motion.div>

            <style>{`
              .kagu-confirm {
                position: fixed;
                inset: 0;
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.25rem;
                background: color-mix(in oklab, var(--paper) 64%, transparent);
                backdrop-filter: blur(3px);
              }
              .kagu-confirm__card {
                width: min(94vw, 380px);
                padding: 1.5rem;
                background: color-mix(in oklab, var(--mint-pale) 94%, var(--paper));
                border: 1px solid var(--neutral);
                border-radius: var(--radius-md, 8px);
                box-shadow: 0 28px 64px -22px rgba(0, 0, 0, 0.65);
              }
              .kagu-confirm__eyebrow {
                font-family: var(--font-mono, monospace);
                font-size: 10px;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #e5594e;
              }
              .kagu-confirm__msg {
                margin: 0.6rem 0 1.4rem;
                font-size: var(--type-base, 1rem);
                line-height: 1.5;
                color: var(--ink);
              }
              .kagu-confirm__actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 0.5rem;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
