"use client";

/*
  "New strategy" trigger + modal for the SEO tab.
  Submits createSeoStrategyJob, which only inserts a pending row; the crawler
  worker picks it up, runs the whole funnel (understand the site → SERP +
  autocomplete demand → winnability-graded page plan → embedded audit), and
  writes the report + master prompt back.
*/

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createSeoStrategyJob } from "../../_actions/seo-strategy-jobs";
import { adminToast } from "../../_components/toast";
import {
  SEO_STRATEGY_AUDIT_OPTIONS,
  SEO_STRATEGY_SERP_OPTIONS,
} from "../_lib/constants";

export function NewStrategyModal() {
  const [open, setOpen] = useState(false);
  const [serpQueries, setSerpQueries] = useState(10);
  const [auditPages, setAuditPages] = useState(6);
  const [pending, startTransition] = useTransition();
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = (formData: FormData) => {
    const url = String(formData.get("url") ?? "").trim();
    const context = String(formData.get("context") ?? "").trim();
    startTransition(async () => {
      const result = await createSeoStrategyJob({ url, context, serpQueries, auditPages });
      if (result.ok) {
        adminToast("success", "Strategy queued. The worker will pick it up.");
        setOpen(false);
      } else {
        adminToast("error", result.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-ink px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-paper transition-colors hover:bg-mint-deep"
      >
        New strategy
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[10002] flex items-center justify-center p-5 backdrop-blur-[3px]"
            style={{ background: "color-mix(in oklab, var(--paper) 64%, transparent)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Request an SEO strategy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-[min(94vw,460px)] border border-neutral bg-mint-pale p-6 shadow-[0_28px_64px_-22px_rgba(0,0,0,0.65)]"
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="eyebrow text-mint-deep">New strategy</span>
              <form action={submit} className="mt-4 flex flex-col gap-5">
                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">
                    Website URL <span className="text-mint-deep">*</span>
                  </span>
                  <input
                    name="url"
                    required
                    minLength={4}
                    placeholder="e.g. kagusoftware.com"
                    className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none placeholder:text-neutral"
                  />
                </label>

                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">Owner context (optional)</span>
                  <textarea
                    name="context"
                    rows={3}
                    maxLength={1000}
                    placeholder="Ground truth the site under-communicates, e.g. 'we build fully custom systems per client request'"
                    className="w-full resize-y border border-neutral bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-neutral focus-visible:border-mint-deep"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="kagu-field block">
                    <span className="eyebrow mb-2 block">SERP checks</span>
                    <select
                      name="serpQueries"
                      value={serpQueries}
                      onChange={(e) => setSerpQueries(Number(e.target.value))}
                      className="w-full border border-neutral bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-mint-deep"
                    >
                      {SEO_STRATEGY_SERP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="kagu-field block">
                    <span className="eyebrow mb-2 block">Embedded audit</span>
                    <select
                      name="auditPages"
                      value={auditPages}
                      onChange={(e) => setAuditPages(Number(e.target.value))}
                      className="w-full border border-neutral bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:border-mint-deep"
                    >
                      {SEO_STRATEGY_AUDIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-xs text-slate-ink">
                  The worker reads the site, understands the business (LLM),
                  generates customer searches per intent, checks them against
                  the live SERP plus real autocomplete demand (and Search
                  Console when connected), grades winnability, runs the
                  technical audit, and writes one master prompt to hand to a
                  coding agent. Roughly 3–6 minutes.
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-2 bg-mint-deep px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? "Queuing…" : "Queue strategy"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
