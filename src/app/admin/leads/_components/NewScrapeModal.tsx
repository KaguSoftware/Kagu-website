"use client";

/*
  "New scrape" trigger + modal (visual pattern: DeleteButton.tsx confirm
  dialog). Submits createScrapeJob — which only inserts a pending row; the
  crawler worker picks it up from the DB.
*/

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createScrapeJob } from "../../_actions/scrape-jobs";
import { adminToast } from "../../_components/toast";
import { CATEGORY_SUGGESTIONS, ISTANBUL_DISTRICTS } from "../_lib/constants";

const OTHER = "__other__";

export function NewScrapeModal() {
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState<string>("Kadıköy");
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
    const category = String(formData.get("category") ?? "").trim();
    const districtValue =
      district === OTHER
        ? String(formData.get("district_other") ?? "").trim()
        : district;
    startTransition(async () => {
      const result = await createScrapeJob({ category, district: districtValue });
      if (result.ok) {
        adminToast("success", "Scrape job queued. The worker will pick it up.");
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
        New scrape
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[10002] flex items-center justify-center p-5 backdrop-blur-[3px]"
            style={{ background: "color-mix(in oklab, var(--paper) 64%, transparent)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Request a scrape"
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
              <span className="eyebrow text-mint-deep">New scrape</span>
              <form action={submit} className="mt-4 flex flex-col gap-5">
                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">
                    Category <span className="text-mint-deep">*</span>
                  </span>
                  <input
                    name="category"
                    required
                    minLength={2}
                    list="category-suggestions"
                    placeholder="e.g. dentist"
                    className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none placeholder:text-neutral"
                  />
                  <datalist id="category-suggestions">
                    {CATEGORY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>

                <label className="kagu-field block">
                  <span className="eyebrow mb-2 block">
                    District <span className="text-mint-deep">*</span>
                  </span>
                  <select
                    name="district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full border border-neutral bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-mint-deep"
                  >
                    {ISTANBUL_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value={OTHER}>Other…</option>
                  </select>
                </label>

                {district === OTHER && (
                  <label className="kagu-field block">
                    <span className="eyebrow mb-2 block">
                      Custom district <span className="text-mint-deep">*</span>
                    </span>
                    <input
                      name="district_other"
                      required
                      minLength={2}
                      placeholder="e.g. İzmit"
                      className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none placeholder:text-neutral"
                    />
                  </label>
                )}

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
                    {pending ? "Queuing…" : "Queue job"}
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
