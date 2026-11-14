"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ActionResult } from "../../_actions/action-result";
import type { Tables } from "@/lib/supabase/database.types";
import { cancelSeoStrategyJob, retrySeoStrategyJob } from "../../_actions/seo-strategy-jobs";
import { RerunStrategyButton } from "./RerunStrategyButton";
import { adminToast } from "../../_components/toast";
import { EmptyState, Tip } from "../../_components/ui";
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
    <Tip text={live ? "Realtime connected" : "Realtime unavailable — polling"}>
      <span className="ld-live" data-live={live}>
        {live ? "Live" : "Polling"}
      </span>
    </Tip>
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
        onClick={() => run(retrySeoStrategyJob, "Strategy queued again.")}
        className="ld-act ld-act--accent"
      >
        {pending ? "…" : "Retry"}
      </button>
    );
  }
  if (job.status === "done") {
    return (
      <span className="inline-flex items-center gap-4">
        <RerunStrategyButton jobId={job.id} variant="link" />
        <Link
          href={`/admin/leads/seo/${job.id}`}
          className="ld-act ld-act--accent"
        >
          View →
        </Link>
      </span>
    );
  }
  // cancelled: nothing to retry in place, but the same settings can be re-queued.
  return <RerunStrategyButton jobId={job.id} variant="link" />;
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
      <div className="ld-wrap">
        <table className="ld-table">
          <thead>
            <tr>
              <th>Website</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Pages planned</th>
              <th>Demand queries</th>
              <th>Audit</th>
              <th>Requested</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id}>
                <td>
                  {job.status === "done" ? (
                    <Link
                      href={`/admin/leads/seo/${job.id}`}
                      className="ld-link"
                    >
                      {displayUrl(job.url)}
                    </Link>
                  ) : (
                    <span>{displayUrl(job.url)}</span>
                  )}
                  {job.context ? (
                    <Tip text={job.context}>
                      <p className="ld-small mt-1 max-w-md truncate">{job.context}</p>
                    </Tip>
                  ) : null}
                  {job.error ? (
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
                <td>
                  {job.status === "done" ? job.pages_planned : "—"}
                </td>
                <td>
                  {job.status === "done" ? job.demand_queries : "—"}
                </td>
                <td>
                  {job.audit_score !== null ? (
                    <span className={seoAuditScoreClass(job.audit_score)}>
                      {job.audit_score}
                    </span>
                  ) : (
                    <span className="ld-t-muted">—</span>
                  )}
                </td>
                <td className="ld-w ld-small">
                  {new Date(job.created_at).toLocaleString("en-GB")}
                </td>
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
