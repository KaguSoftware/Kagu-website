"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withResult } from "./action-result";

const CreateSchema = z.object({
  category: z.string().min(2, { error: "Category is required." }).trim(),
  district: z.string().min(2, { error: "District is required." }).trim(),
});

/*
  Creating a job only inserts a `pending` row — the crawler worker (worker/)
  polls scrape_jobs and does everything else. The DB is the contract.
*/
export const createScrapeJob = withResult(
  async (input: { category: string; district: string }) => {
    const user = await requireAdmin();
    const { category, district } = CreateSchema.parse(input);
    const db = createAdminClient();
    const { error } = await db.from("scrape_jobs").insert({
      category,
      district,
      requested_by: user.id,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads", "layout");
  }
);

/*
  Cancellation is cooperative: we flip the status to `cancel_requested` and the
  worker notices between leads and marks the job `cancelled`. A pending job is
  also "cancelled" this way so the worker (or its absence) never races us.
*/
export const cancelScrapeJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("scrape_jobs")
    .update({ status: "cancel_requested" })
    .eq("id", jobId)
    .in("status", ["pending", "running"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job is not pending or running.");
  revalidatePath("/admin/leads", "layout");
});

export const retryScrapeJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("scrape_jobs")
    .update({
      status: "pending",
      error: null,
      progress: 0,
      leads_found: 0,
      started_at: null,
      finished_at: null,
    })
    .eq("id", jobId)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only failed jobs can be retried.");
  revalidatePath("/admin/leads", "layout");
});
