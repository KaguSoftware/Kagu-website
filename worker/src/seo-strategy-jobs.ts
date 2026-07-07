import { db } from "./db.js";
import type { StrategyReport } from "./strategy.js";
import type { SeoStrategyJobRow } from "./types.js";

/*
  DB layer for SEO strategy jobs — the seo_strategy_jobs analogue of
  seo-audit-jobs.ts. Same atomic-claim pattern and same status lifecycle (the
  worker reuses JobStatus), so cancel/retry from the panel behave exactly
  like the other queues. The whole result — understanding, evidence, page
  plan, embedded audit, master prompt — is one jsonb report on the job row.
*/

export async function claimNextSeoStrategyJob(): Promise<SeoStrategyJobRow | null> {
  const { data: candidate, error: selectError } = await db
    .from("seo_strategy_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (!candidate) return null;

  // Conditional UPDATE — only one worker wins the `pending` → `running` flip.
  const { data: claimed, error: claimError } = await db
    .from("seo_strategy_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  return (claimed as SeoStrategyJobRow | null) ?? null;
}

export async function isSeoStrategyCancelRequested(jobId: string): Promise<boolean> {
  const { data } = await db
    .from("seo_strategy_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "cancel_requested";
}

export async function updateSeoStrategyJobProgress(jobId: string, progress: number): Promise<void> {
  await db
    .from("seo_strategy_jobs")
    .update({ progress: Math.min(100, Math.max(0, Math.round(progress))) })
    .eq("id", jobId);
}

export async function completeSeoStrategyJob(jobId: string, report: StrategyReport): Promise<void> {
  const demandQueries =
    report.searchesChecked.reduce((s, e) => s + e.suggestions.length, 0) +
    (report.gsc?.length ?? 0);
  const { error } = await db
    .from("seo_strategy_jobs")
    .update({
      status: "done",
      progress: 100,
      pages_planned: report.pages.length,
      demand_queries: demandQueries,
      audit_score: report.audit?.score ?? null,
      report,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function failSeoStrategyJob(jobId: string, message: string): Promise<void> {
  await db
    .from("seo_strategy_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 1000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function markSeoStrategyCancelled(jobId: string): Promise<void> {
  await db
    .from("seo_strategy_jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", jobId);
}

/* Re-queue jobs orphaned in "running" by a worker that died mid-job. Safe
   with a single worker: completion overwrites the report wholesale, so a
   retry never leaves stale partial results. */
export async function requeueOrphanedSeoStrategyJobs(): Promise<void> {
  const { data, error } = await db
    .from("seo_strategy_jobs")
    .update({ status: "pending", progress: 0, started_at: null })
    .eq("status", "running")
    .select("id");
  if (error) {
    console.warn("Failed to re-queue orphaned SEO strategy jobs:", error.message);
    return;
  }
  if (data?.length) console.log(`Re-queued ${data.length} orphaned running SEO strategy job(s)`);
}
