import type { JobStatus } from "@/lib/supabase/database.types";
import { JOB_STATUS_CLASSES, JOB_STATUS_LABELS } from "../_lib/constants";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`ld-pill ${JOB_STATUS_CLASSES[status]}${status === "running" ? " ld-pill--pulse" : ""}`}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
