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
import { CustomSelect } from "../../_components/ui";
import {
  SEO_STRATEGY_AUDIT_OPTIONS,
  SEO_STRATEGY_SERP_OPTIONS,
} from "../_lib/constants";

const SERP_OPTIONS = SEO_STRATEGY_SERP_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));
const AUDIT_OPTIONS = SEO_STRATEGY_AUDIT_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

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
        className="adm-btn adm-btn--solid"
      >
        New strategy
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="adm-confirm"
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
              className="adm-confirm__card ld-modal"
              style={{ width: "min(94vw, 520px)" }}
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="adm-confirm__title">New strategy</h2>
              <form action={submit}>
                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">
                    Website URL <span className="text-mint-deep">*</span>
                  </span>
                  <input
                    name="url"
                    required
                    minLength={4}
                    placeholder="e.g. kagusoftware.com"
                    className="w-full"
                  />
                </label>

                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">Owner context (optional)</span>
                  <textarea
                    name="context"
                    rows={3}
                    maxLength={1000}
                    placeholder="Ground truth the site under-communicates, e.g. 'we build fully custom systems per client request'"
                    className="w-full resize-y"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="kagu-field block">
                    <span id="strategy-serp-label" className="eyebrow mb-2 block">
                      SERP checks
                    </span>
                    <CustomSelect
                      name="serpQueries"
                      value={String(serpQueries)}
                      onChange={(v) => setSerpQueries(Number(v))}
                      options={SERP_OPTIONS}
                      aria-labelledby="strategy-serp-label"
                    />
                  </div>
                  <div className="kagu-field block">
                    <span id="strategy-audit-label" className="eyebrow mb-2 block">
                      Embedded audit
                    </span>
                    <CustomSelect
                      name="auditPages"
                      value={String(auditPages)}
                      onChange={(v) => setAuditPages(Number(v))}
                      options={AUDIT_OPTIONS}
                      aria-labelledby="strategy-audit-label"
                    />
                  </div>
                </div>

                <p className="ld-small">
                  The worker reads the site, understands the business (LLM),
                  generates customer searches per intent, checks them against
                  the live SERP plus real autocomplete demand (and Search
                  Console when connected), grades winnability, runs the
                  technical audit, and writes one master prompt to hand to a
                  coding agent. Roughly 3–6 minutes.
                </p>

                <div className="adm-confirm__actions">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="adm-btn adm-btn--text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="adm-btn adm-btn--solid"
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
