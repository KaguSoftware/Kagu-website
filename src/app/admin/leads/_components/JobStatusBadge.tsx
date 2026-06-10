import type { JobStatus } from "@/lib/supabase/database.types";
import { JOB_STATUS_CLASSES, JOB_STATUS_LABELS } from "../_lib/constants";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${JOB_STATUS_CLASSES[status]}`}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
