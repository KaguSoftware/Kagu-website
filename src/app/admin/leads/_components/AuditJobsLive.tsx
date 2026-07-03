"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ActionResult } from "../../_actions/action-result";
import type { Tables } from "@/lib/supabase/database.types";
import { cancelSeoAuditJob, retrySeoAuditJob } from "../../_actions/seo-audit-jobs";
import { adminToast } from "../../_components/toast";
import { EmptyState } from "../../_components/ui";
import { JobStatusBadge } from "./JobStatusBadge";
import { ProgressBar } from "./ProgressBar";
import { useRealtimeRows } from "../../_components/use-realtime-rows";
import { seoAuditScoreClass } from "../_lib/constants";

type AuditJob = Tables<"seo_audit_jobs">;

/* Newest first — matches the server query's order. */
const byCreatedDesc = (a: AuditJob, b: AuditJob) =>
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

function JobActions({ job }: { job: AuditJob }) {
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
        onClick={() => run(cancelSeoAuditJob, "Cancellation requested.")}
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
        onClick={() => run(retrySeoAuditJob, "Audit queued again.")}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Retry"}
      </button>
    );
  }
  if (job.status === "done") {
    return (
      <Link
        href={`/admin/leads/audit/${job.id}`}
        className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline"
      >
        View →
      </Link>
    );
  }
  return null;
}

export function AuditJobsLive({
  initial,
  limit,
}: {
  initial: AuditJob[];
  limit?: number;
}) {
  const { rows, live } = useRealtimeRows<AuditJob>({
    table: "seo_audit_jobs",
    initial,
    sort: byCreatedDesc,
    limit,
  });

  if (rows.length === 0) {
    return (
      <EmptyState>
        No audits yet. Queue a website URL and start the worker to get a scored
        SEO report with every issue and its fix.
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
              <th className="eyebrow px-4 py-3 font-normal">Score</th>
              <th className="eyebrow px-4 py-3 font-normal">Pages</th>
              <th className="eyebrow px-4 py-3 font-normal">Issues</th>
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
                      href={`/admin/leads/audit/${job.id}`}
                      className="text-ink underline-offset-4 hover:underline"
                    >
                      {displayUrl(job.url)}
                    </Link>
                  ) : (
                    <span className="text-ink">{displayUrl(job.url)}</span>
                  )}
                  <span className="text-slate-ink"> · max {job.max_pages}p</span>
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
                <td className="px-4 py-3">
                  {job.score !== null ? (
                    <span className={`font-mono ${seoAuditScoreClass(job.score)}`}>
                      {job.score}
                    </span>
                  ) : (
                    <span className="text-slate-ink">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink">{job.pages_audited || "—"}</td>
                <td className="px-4 py-3 text-ink">
                  {job.status === "done" ? job.issues_found : "—"}
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
