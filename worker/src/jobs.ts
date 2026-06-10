import { db } from "./db.js";
import type { ScrapeJobRow } from "./types.js";

/*
  Atomically claim the oldest pending job. Race-safe even with several worker
  instances: the conditional UPDATE (`eq status pending`) only succeeds for
  one of them — a null result means we lost the race and should look again.
*/
export async function claimNextJob(): Promise<ScrapeJobRow | null> {
  const { data: candidate, error: selectError } = await db
    .from("scrape_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (!candidate) return null;

  const { data: claimed, error: claimError } = await db
    .from("scrape_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  return (claimed as ScrapeJobRow | null) ?? null;
}

export async function isCancelRequested(jobId: string): Promise<boolean> {
  const { data } = await db
    .from("scrape_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "cancel_requested";
}

export async function updateJobProgress(
  jobId: string,
  progress: number,
  leadsFound: number
): Promise<void> {
  await db
    .from("scrape_jobs")
    .update({ progress: Math.min(100, Math.round(progress)), leads_found: leadsFound })
    .eq("id", jobId);
}

export async function completeJob(jobId: string, leadsFound: number): Promise<void> {
  await db
    .from("scrape_jobs")
    .update({
      status: "done",
      progress: 100,
      leads_found: leadsFound,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function failJob(jobId: string, message: string): Promise<void> {
  await db
    .from("scrape_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 1000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function markCancelled(jobId: string): Promise<void> {
  await db
    .from("scrape_jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", jobId);
}
