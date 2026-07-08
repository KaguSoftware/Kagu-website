"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { JobStatus, Tables } from "@/lib/supabase/database.types";
import {
  createSeoStrategyJob,
  getLeadSeoStrategy,
} from "../../_actions/seo-strategy-jobs";
import { adminToast } from "../../_components/toast";
import { JobStatusBadge } from "./JobStatusBadge";
import { seoAuditScoreClass } from "../_lib/constants";

type LeadSeoJob = {
  id: string;
  status: JobStatus;
  audit_score: number | null;
  pages_planned: number;
  created_at: string;
};

/*
  The lead drawer's bridge into the SEO tool: queue a strategy run for the
  lead's website, and once one exists, surface its audit score + report link —
  the concrete numbers an outreach message can quote.
*/
export function LeadSeoAction({ lead }: { lead: Tables<"leads"> }) {
  const [job, setJob] = useState<LeadSeoJob | null | undefined>(undefined); // undefined = loading
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let stale = false;
    if (!lead.website_url) {
      setJob(null);
      return;
    }
    getLeadSeoStrategy(lead.website_url).then((result) => {
      if (!stale) setJob(result.ok ? ((result.data ?? null) as LeadSeoJob | null) : null);
    });
    return () => {
      stale = true;
    };
  }, [lead.id, lead.website_url]);

  if (!lead.website_url) return null;

  const queue = () =>
    startTransition(async () => {
      const result = await createSeoStrategyJob({
        url: lead.website_url!,
        context: `This is a lead we are pitching: ${lead.name}, a ${lead.category} in ${lead.district}, Istanbul. Build the strategy for THEIR business.`,
        serpQueries: 6,
        auditPages: 3,
      });
      if (result.ok) {
        adminToast("success", "Strategy queued — it will appear in the SEO tab.");
        setJob(undefined);
        if (lead.website_url) {
          const refreshed = await getLeadSeoStrategy(lead.website_url);
          setJob(refreshed.ok ? ((refreshed.data ?? null) as LeadSeoJob | null) : null);
        }
      } else {
        adminToast("error", result.error);
      }
    });

  return (
    <div>
      <span className="eyebrow mb-2 block">SEO strategy</span>
      {job === undefined ? (
        <p className="text-xs text-slate-ink">Checking…</p>
      ) : job ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <JobStatusBadge status={job.status} />
          {job.status === "done" ? (
            <>
              {job.audit_score !== null ? (
                <span className={`font-mono text-xs ${seoAuditScoreClass(job.audit_score)}`}>
                  audit {job.audit_score}/100
                </span>
              ) : null}
              <Link
                href={`/admin/leads/seo/${job.id}`}
                className="text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 hover:underline"
              >
                View report →
              </Link>
            </>
          ) : null}
          {(job.status === "done" || job.status === "failed" || job.status === "cancelled") && (
            <button
              type="button"
              disabled={pending}
              onClick={queue}
              className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-50"
            >
              {pending ? "…" : "Re-run"}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={queue}
          className="border border-neutral px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink disabled:opacity-50"
        >
          {pending ? "Queuing…" : "Queue SEO strategy"}
        </button>
      )}
    </div>
  );
}
