"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PipelineStatus } from "@/lib/supabase/database.types";
import { bulkUpdateLeadStatus } from "../../_actions/leads";
import { adminToast } from "../../_components/toast";
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS } from "../_lib/constants";

export function BulkBar({
  selectedIds,
  onDone,
}: {
  selectedIds: string[];
  onDone: () => void;
}) {
  const [status, setStatus] = useState<PipelineStatus>("queued");
  const [pending, startTransition] = useTransition();

  const apply = () =>
    startTransition(async () => {
      const result = await bulkUpdateLeadStatus(selectedIds, status);
      if (result.ok) {
        adminToast("success", `${selectedIds.length} leads → ${PIPELINE_STATUS_LABELS[status]}.`);
        onDone();
      } else {
        adminToast("error", result.error);
      }
    });

  return (
    <AnimatePresence>
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 z-[10001] flex -translate-x-1/2 items-center gap-3 border border-neutral bg-mint-soft px-4 py-3 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.65)]"
        >
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-ink">
            {selectedIds.length} selected
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PipelineStatus)}
            className="border border-neutral bg-paper px-2 py-1.5 text-sm text-ink outline-none"
          >
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PIPELINE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={apply}
            className="bg-mint-deep px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink hover:text-ink"
          >
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
