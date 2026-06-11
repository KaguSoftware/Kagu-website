"use client";

import { useTransition } from "react";
import type { ActionResult } from "../../_actions/action-result";
import type { Tables } from "@/lib/supabase/database.types";
import { cancelScrapeJob, retryScrapeJob } from "../../_actions/scrape-jobs";
import { adminToast } from "../../_components/toast";
import { EmptyState } from "../../_components/ui";
import { JobStatusBadge } from "./JobStatusBadge";
import { ProgressBar } from "./ProgressBar";
import { useRealtimeRows } from "../../_components/use-realtime-rows";

type Job = Tables<"scrape_jobs">;

/* Newest first — matches the server query's order. */
const byCreatedDesc = (a: Job, b: Job) => b.created_at.localeCompare(a.created_at);

function LiveDot({ live }: { live: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink"
      title={live ? "Realtime connected" : "Realtime unavailable — polling"}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${
          live ? "bg-[#3fb27f]" : "animate-pulse bg-[#d9a13b]"
        }`}
      />
      {live ? "Live" : "Polling"}
    </span>
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
        className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-50"
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
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline disabled:opacity-50"
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
      <div className="overflow-x-auto border border-neutral">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral">
              <th className="eyebrow px-4 py-3 font-normal">Search</th>
              <th className="eyebrow px-4 py-3 font-normal">Status</th>
              <th className="eyebrow px-4 py-3 font-normal">Progress</th>
              <th className="eyebrow px-4 py-3 font-normal">Leads</th>
              {!compact && <th className="eyebrow px-4 py-3 font-normal">Requested</th>}
              <th className="eyebrow px-4 py-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id} className="border-b border-neutral last:border-0">
                <td className="px-4 py-3">
                  <span className="text-ink">{job.category}</span>
                  <span className="text-slate-ink"> · {job.district}</span>
                  {job.error && !compact ? (
                    <p className="mt-1 max-w-md text-xs text-[#e5594e]">{job.error}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={job.progress} />
                    <span className="text-xs text-slate-ink">{job.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink">{job.leads_found}</td>
                {!compact && (
                  <td className="px-4 py-3 text-xs text-slate-ink">
                    {new Date(job.created_at).toLocaleString("en-GB")}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
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
