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
import { CustomSelect } from "../../_components/ui";
import { CATEGORY_SUGGESTIONS, ISTANBUL_DISTRICTS } from "../_lib/constants";
import { SuggestInput } from "./SuggestInput";

const OTHER = "__other__";

const DISTRICT_OPTIONS = [
  ...ISTANBUL_DISTRICTS.map((d) => ({ value: d as string, label: d as string })),
  { value: OTHER, label: "Other…" },
];

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
        className="adm-btn adm-btn--solid"
      >
        New scrape
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="adm-confirm"
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
              className="adm-confirm__card ld-modal"
              onClick={(e) => e.stopPropagation()}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="adm-confirm__title">New scrape</h2>
              <form action={submit}>
                <div className="kagu-field block">
                  <span className="eyebrow mb-2 block">
                    Category <span className="text-mint-deep">*</span>
                  </span>
                  <SuggestInput
                    name="category"
                    required
                    minLength={2}
                    suggestions={CATEGORY_SUGGESTIONS}
                    placeholder="e.g. dentist"
                  />
                </div>

                <div className="kagu-field block">
                  <span id="scrape-district-label" className="eyebrow mb-2 block">
                    District <span className="text-mint-deep">*</span>
                  </span>
                  <CustomSelect
                    name="district"
                    value={district}
                    onChange={setDistrict}
                    options={DISTRICT_OPTIONS}
                    aria-labelledby="scrape-district-label"
                  />
                </div>

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
                      className="w-full"
                    />
                  </label>
                )}

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
