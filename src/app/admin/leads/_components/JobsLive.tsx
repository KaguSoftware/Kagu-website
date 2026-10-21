"use client";

import { useTransition } from "react";
import type { ActionResult } from "../../_actions/action-result";
import type { Tables } from "@/lib/supabase/database.types";
import { cancelScrapeJob, retryScrapeJob } from "../../_actions/scrape-jobs";
import { adminToast } from "../../_components/toast";
import { EmptyState, Tip } from "../../_components/ui";
import { JobStatusBadge } from "./JobStatusBadge";
import { ProgressBar } from "./ProgressBar";
import { useRealtimeRows } from "../../_components/use-realtime-rows";

type Job = Tables<"scrape_jobs">;

/* Newest first — matches the server query's order. */
const byCreatedDesc = (a: Job, b: Job) => b.created_at.localeCompare(a.created_at);

function LiveDot({ live }: { live: boolean }) {
  return (
    <Tip text={live ? "Realtime connected" : "Realtime unavailable — polling"}>
      <span className="ld-live" data-live={live}>
        {live ? "Live" : "Polling"}
      </span>
    </Tip>
  );
}

function JobActions({ job }: { job: Job }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: (id: string) => Promise<ActionResult>, doneMsg: string) =>
    startTransition(async () => {
      const result = await fn(job.id);
      if (result.ok) adminToast("success", doneMsg);
      else adminToast("error", result.error);
    });

  if (job.status === "pending" || job.status === "running") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(cancelScrapeJob, "Cancellation requested.")}
        className="ld-act"
      >
        {pending ? "…" : "Cancel"}
      </button>
    );
  }
  if (job.status === "failed") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(retryScrapeJob, "Job queued again.")}
        className="ld-act ld-act--accent"
      >
        {pending ? "…" : "Retry"}
      </button>
    );
  }
  return null;
}

export function JobsLive({
  initial,
  compact = false,
  limit,
}: {
  initial: Job[];
  compact?: boolean;
  limit?: number;
}) {
  const { rows, live } = useRealtimeRows<Job>({
    table: "scrape_jobs",
    initial,
    sort: byCreatedDesc,
    limit,
  });

  if (rows.length === 0) {
    return (
      <EmptyState>
        No scrape jobs yet. Request one and start the worker to begin collecting leads.
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="flex justify-end pb-2">
        <LiveDot live={live} />
      </div>
      <div className="ld-wrap">
        <table className="ld-table">
          <thead>
            <tr>
              <th>Search</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Leads</th>
              {!compact && <th>Requested</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id}>
                <td>
                  <span>{job.category}</span>
                  <span className="ld-t-muted"> · {job.district}</span>
                  {job.error && !compact ? (
                    <p className="ld-small ld-t-bad mt-1 max-w-md">{job.error}</p>
                  ) : null}
                </td>
                <td>
                  <JobStatusBadge status={job.status} />
                </td>
                <td>
                  <div className="ld-meter-row">
                    <ProgressBar value={job.progress} tone={job.status === "done" ? "ok" : job.status === "failed" ? "bad" : undefined} />
                    <span className="ld-small">{job.progress}%</span>
                  </div>
                </td>
                <td>{job.leads_found}</td>
                {!compact && (
                  <td className="ld-w ld-small">
                    {new Date(job.created_at).toLocaleString("en-GB")}
                  </td>
                )}
                <td className="ld-r">
                  <JobActions job={job} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
