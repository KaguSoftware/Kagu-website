"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ActionResult } from "../../_actions/action-result";
import type { Tables } from "@/lib/supabase/database.types";
import { cancelSeoStrategyJob, retrySeoStrategyJob } from "../../_actions/seo-strategy-jobs";
import { adminToast } from "../../_components/toast";
import { EmptyState } from "../../_components/ui";
import { JobStatusBadge } from "./JobStatusBadge";
import { ProgressBar } from "./ProgressBar";
import { useRealtimeRows } from "../../_components/use-realtime-rows";
import { seoAuditScoreClass } from "../_lib/constants";

type StrategyJob = Tables<"seo_strategy_jobs">;

/* Newest first — matches the server query's order. */
const byCreatedDesc = (a: StrategyJob, b: StrategyJob) =>
  b.created_at.localeCompare(a.created_at);

/* "https://www.example.com/x" → "example.com/x" for the table cell. */
const displayUrl = (url: string) =>
  url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

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

function JobActions({ job }: { job: StrategyJob }) {
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
        onClick={() => run(cancelSeoStrategyJob, "Cancellation requested.")}
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
        onClick={() => run(retrySeoStrategyJob, "Strategy queued again.")}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Retry"}
      </button>
    );
  }
  if (job.status === "done") {
    return (
      <Link
        href={`/admin/leads/strategy/${job.id}`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline"
      >
        View →
      </Link>
    );
  }
  return null;
}

export function StrategyJobsLive({
  initial,
  limit,
}: {
  initial: StrategyJob[];
  limit?: number;
}) {
  const { rows, live } = useRealtimeRows<StrategyJob>({
    table: "seo_strategy_jobs",
    initial,
    sort: byCreatedDesc,
    limit,
  });

  if (rows.length === 0) {
    return (
      <EmptyState>
        No strategies yet. Queue a website URL and start the worker to get a
        full keyword strategy, page plan, audit, and the master prompt to
        build it all.
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
              <th className="eyebrow px-4 py-3 font-normal">Website</th>
              <th className="eyebrow px-4 py-3 font-normal">Status</th>
              <th className="eyebrow px-4 py-3 font-normal">Progress</th>
              <th className="eyebrow px-4 py-3 font-normal">Pages planned</th>
              <th className="eyebrow px-4 py-3 font-normal">Demand queries</th>
              <th className="eyebrow px-4 py-3 font-normal">Audit</th>
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
                      href={`/admin/leads/strategy/${job.id}`}
                      className="text-ink underline-offset-4 hover:underline"
                    >
                      {displayUrl(job.url)}
                    </Link>
                  ) : (
                    <span className="text-ink">{displayUrl(job.url)}</span>
                  )}
                  {job.context ? (
                    <p
                      className="mt-1 max-w-md truncate text-xs text-slate-ink"
                      title={job.context}
                    >
                      {job.context}
                    </p>
                  ) : null}
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
                <td className="px-4 py-3 text-ink">
                  {job.status === "done" ? job.pages_planned : "—"}
                </td>
                <td className="px-4 py-3 text-ink">
                  {job.status === "done" ? job.demand_queries : "—"}
                </td>
                <td className="px-4 py-3">
                  {job.audit_score !== null ? (
                    <span className={`font-mono ${seoAuditScoreClass(job.audit_score)}`}>
                      {job.audit_score}
                    </span>
                  ) : (
                    <span className="text-slate-ink">—</span>
                  )}
                </td>
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
