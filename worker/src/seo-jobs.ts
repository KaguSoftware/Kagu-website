import { db } from "./db.js";
import type { OrganicResult } from "./seo.js";
import type { SeoJobRow } from "./types.js";

/*
  DB layer for SEO research jobs — the seo_jobs analogue of jobs.ts. Same
  atomic-claim pattern and same status lifecycle (the worker reuses JobStatus),
  so cancel/retry from the panel behave exactly like scrape jobs.
*/

export async function claimNextSeoJob(): Promise<SeoJobRow | null> {
  const { data: candidate, error: selectError } = await db
    .from("seo_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (!candidate) return null;

  // Conditional UPDATE — only one worker wins the `pending` → `running` flip.
  const { data: claimed, error: claimError } = await db
    .from("seo_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  return (claimed as SeoJobRow | null) ?? null;
}

export async function isSeoCancelRequested(jobId: string): Promise<boolean> {
  const { data } = await db
    .from("seo_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "cancel_requested";
}

export async function updateSeoJobProgress(jobId: string, progress: number): Promise<void> {
  await db
    .from("seo_jobs")
    .update({ progress: Math.min(100, Math.max(0, Math.round(progress))) })
    .eq("id", jobId);
}

export async function completeSeoJob(
  jobId: string,
  summary: {
    keywordsFound: number;
    adsSkipped: number;
    pagesCrawled: number;
    organic: OrganicResult[];
  }
): Promise<void> {
  await db
    .from("seo_jobs")
    .update({
      status: "done",
      progress: 100,
      keywords_found: summary.keywordsFound,
      ads_skipped: summary.adsSkipped,
      pages_crawled: summary.pagesCrawled,
      organic: summary.organic,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function failSeoJob(jobId: string, message: string): Promise<void> {
  await db
    .from("seo_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 1000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function markSeoCancelled(jobId: string): Promise<void> {
  await db
    .from("seo_jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", jobId);
}

/* Re-queue jobs orphaned in "running" by a worker that died mid-job. Safe with
   a single worker: re-processing deletes the job's keywords first, so a retry
   never piles up duplicates. */
export async function requeueOrphanedSeoJobs(): Promise<void> {
  const { data, error } = await db
    .from("seo_jobs")
    .update({ status: "pending", progress: 0, started_at: null })
    .eq("status", "running")
    .select("id");
  if (error) {
    console.warn("Failed to re-queue orphaned SEO jobs:", error.message);
    return;
  }
  if (data?.length) console.log(`Re-queued ${data.length} orphaned running SEO job(s)`);
}
