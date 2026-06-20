"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ActionResult } from "../../_actions/action-result";
import type { Tables } from "@/lib/supabase/database.types";
import { cancelSeoJob, retrySeoJob } from "../../_actions/seo-jobs";
import { adminToast } from "../../_components/toast";
import { EmptyState } from "../../_components/ui";
import { JobStatusBadge } from "./JobStatusBadge";
import { ProgressBar } from "./ProgressBar";
import { useRealtimeRows } from "../../_components/use-realtime-rows";

type SeoJob = Tables<"seo_jobs">;

/* Newest first — matches the server query's order. */
const byCreatedDesc = (a: SeoJob, b: SeoJob) =>
  b.created_at.localeCompare(a.created_at);

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

function JobActions({ job }: { job: SeoJob }) {
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
        onClick={() => run(cancelSeoJob, "Cancellation requested.")}
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
        onClick={() => run(retrySeoJob, "Research queued again.")}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Retry"}
      </button>
    );
  }
  if (job.status === "done") {
    return (
      <Link
        href={`/admin/leads/seo/${job.id}`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline"
      >
        View →
      </Link>
    );
  }
  return null;
}

export function SeoJobsLive({
  initial,
  limit,
}: {
  initial: SeoJob[];
  limit?: number;
}) {
  const { rows, live } = useRealtimeRows<SeoJob>({
    table: "seo_jobs",
    initial,
    sort: byCreatedDesc,
    limit,
  });

  if (rows.length === 0) {
    return (
      <EmptyState>
        No research yet. Queue a seed query and start the worker to find the
        keywords ranking the top results.
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
              <th className="eyebrow px-4 py-3 font-normal">Seed query</th>
              <th className="eyebrow px-4 py-3 font-normal">Status</th>
              <th className="eyebrow px-4 py-3 font-normal">Progress</th>
              <th className="eyebrow px-4 py-3 font-normal">Keywords</th>
              <th className="eyebrow px-4 py-3 font-normal">Requested</th>
              <th className="eyebrow px-4 py-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id} className="border-b border-neutral last:border-0">
                <td className="px-4 py-3">
                  {job.status === "done" ? (
                    <Link
                      href={`/admin/leads/seo/${job.id}`}
                      className="text-ink underline-offset-4 hover:underline"
                    >
                      {job.seed}
                    </Link>
                  ) : (
                    <span className="text-ink">{job.seed}</span>
                  )}
                  <span className="text-slate-ink">
                    {" "}
                    · {job.region}/{job.language}
                  </span>
                  {job.error ? (
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
                <td className="px-4 py-3 text-ink">{job.keywords_found}</td>
                <td className="px-4 py-3 text-xs text-slate-ink">
                  {new Date(job.created_at).toLocaleString("en-GB")}
                </td>
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
