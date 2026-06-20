"use client";

/*
  "New research" trigger + modal — the SEO analogue of NewScrapeModal.
  Submits createSeoJob, which only inserts a pending row; the crawler worker
  picks it up from the DB.
*/

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createSeoJob } from "../../_actions/seo-jobs";
import { adminToast } from "../../_components/toast";
import {
  SEO_LANGUAGE_OPTIONS,
  SEO_REGION_OPTIONS,
  SEO_SEED_SUGGESTIONS,
} from "../_lib/constants";

export function NewSeoModal() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState("tr");
  const [language, setLanguage] = useState("en");
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
    const seed = String(formData.get("seed") ?? "").trim();
    startTransition(async () => {
      const result = await createSeoJob({ seed, region, language });
      if (result.ok) {
        adminToast("success", "Research queued. The worker will pick it up.");
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
        New research
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[10002] flex items-center justify-center p-5 backdrop-blur-[3px]"
            style={{ background: "color-mix(in oklab, var(--paper) 64%, transparent)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Request SEO keyword research"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-[min(94vw,420px)] border border-neutral bg-mint-pale p-6 shadow-[0_28px_64px_-22px_rgba(0,0,0,0.65)]"
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="eyebrow text-mint-deep">New research</span>
              <form action={submit} className="mt-4 flex flex-col gap-5">
                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">
                    Seed query <span className="text-mint-deep">*</span>
                  </span>
                  <input
                    name="seed"
                    required
                    minLength={2}
                    list="seo-seed-suggestions"
                    placeholder="e.g. dentist istanbul"
                    className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none placeholder:text-neutral"
                  />
                  <datalist id="seo-seed-suggestions">
                    {SEO_SEED_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="kagu-field block">
                    <span className="eyebrow mb-2 block">Region</span>
                    <select
                      name="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full border border-neutral bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-mint-deep"
                    >
                      {SEO_REGION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="kagu-field block">
                    <span className="eyebrow mb-2 block">Language</span>
                    <select
                      name="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full border border-neutral bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-mint-deep"
                    >
                      {SEO_LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-xs text-slate-ink">
                  The worker scrapes the top organic results (sponsored ads are
                  skipped), crawls them, and ranks the keywords that got them
                  there.
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
                    {pending ? "Queuing…" : "Queue research"}
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
