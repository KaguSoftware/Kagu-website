import { db } from "./db.js";
import type { AuditReport } from "./audit.js";
import type { SeoAuditJobRow } from "./types.js";

/*
  DB layer for SEO site-audit jobs — the seo_audit_jobs analogue of
  seo-jobs.ts. Same atomic-claim pattern and same status lifecycle (the worker
  reuses JobStatus), so cancel/retry from the panel behave exactly like the
  other queues. The whole result is one jsonb report on the job row — no
  child table.
*/

export async function claimNextSeoAuditJob(): Promise<SeoAuditJobRow | null> {
  const { data: candidate, error: selectError } = await db
    .from("seo_audit_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (!candidate) return null;

  // Conditional UPDATE — only one worker wins the `pending` → `running` flip.
  const { data: claimed, error: claimError } = await db
    .from("seo_audit_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  return (claimed as SeoAuditJobRow | null) ?? null;
}

export async function isSeoAuditCancelRequested(jobId: string): Promise<boolean> {
  const { data } = await db
    .from("seo_audit_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "cancel_requested";
}

export async function updateSeoAuditJobProgress(jobId: string, progress: number): Promise<void> {
  await db
    .from("seo_audit_jobs")
    .update({ progress: Math.min(100, Math.max(0, Math.round(progress))) })
    .eq("id", jobId);
}

export async function completeSeoAuditJob(jobId: string, report: AuditReport): Promise<void> {
  const { error } = await db
    .from("seo_audit_jobs")
    .update({
      status: "done",
      progress: 100,
      score: report.score,
      pages_audited: report.pages.length,
      issues_found: report.findings.length,
      report,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function failSeoAuditJob(jobId: string, message: string): Promise<void> {
  await db
    .from("seo_audit_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 1000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function markSeoAuditCancelled(jobId: string): Promise<void> {
  await db
    .from("seo_audit_jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", jobId);
}

/* Re-queue jobs orphaned in "running" by a worker that died mid-job. Safe
   with a single worker: completion overwrites the report wholesale, so a
   retry never leaves stale partial results. */
export async function requeueOrphanedSeoAuditJobs(): Promise<void> {
  const { data, error } = await db
    .from("seo_audit_jobs")
    .update({ status: "pending", progress: 0, started_at: null })
    .eq("status", "running")
    .select("id");
  if (error) {
    console.warn("Failed to re-queue orphaned SEO audit jobs:", error.message);
    return;
  }
  if (data?.length) console.log(`Re-queued ${data.length} orphaned running SEO audit job(s)`);
}
