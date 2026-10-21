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
      className="adm-btn adm-btn--danger"
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
        className="adm-btn adm-btn--text"
      >
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="adm-confirm"
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
              className="adm-confirm__card"
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="adm-confirm__title">Are you sure?</h2>
              <p className="adm-confirm__msg">{confirm}</p>
              <div className="adm-confirm__actions">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="adm-btn adm-btn--ghost"
                >
                  Cancel
                </button>
                <form action={action}>
                  <input type="hidden" name="id" value={id} />
                  <ConfirmSubmit />
                </form>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
