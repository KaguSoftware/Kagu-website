"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PipelineStatus } from "@/lib/supabase/database.types";
import { bulkUpdateLeadStatus } from "../../_actions/leads";
import { adminToast } from "../../_components/toast";
import { CustomSelect } from "../../_components/ui";
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS } from "../_lib/constants";

const STATUS_OPTIONS = PIPELINE_STATUSES.map((s) => ({
  value: s,
  label: PIPELINE_STATUS_LABELS[s],
}));

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
          className="ld-bulk"
        >
          <span className="ld-num text-sm font-medium text-ink">
            {selectedIds.length} selected
          </span>
          <CustomSelect
            value={status}
            onChange={(v) => setStatus(v as PipelineStatus)}
            options={STATUS_OPTIONS}
            aria-label="Set pipeline status"
          />
          <button
            type="button"
            disabled={pending}
            onClick={apply}
            className="adm-btn adm-btn--solid ld-sm"
          >
            {pending ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="ld-act"
          >
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
