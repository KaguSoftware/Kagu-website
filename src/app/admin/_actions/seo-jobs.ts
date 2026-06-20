"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withResult } from "./action-result";

const CreateSchema = z.object({
  seed: z.string().min(2, { error: "A seed query is required." }).max(120).trim(),
  // ISO-ish country / language codes; keep them short and lowercase.
  region: z.string().trim().toLowerCase().regex(/^[a-z]{2}$/, { error: "Use a 2-letter country code." }),
  language: z.string().trim().toLowerCase().regex(/^[a-z]{2}$/, { error: "Use a 2-letter language code." }),
});

/*
  Like createScrapeJob, this only inserts a `pending` row — the same crawler
  worker (worker/) polls seo_jobs, scrapes the top organic results, crawls
  them, and writes ranked keywords back. The DB is the contract.
*/
export const createSeoJob = withResult(
  async (input: { seed: string; region: string; language: string }) => {
    const user = await requireAdmin();
    const { seed, region, language } = CreateSchema.parse(input);
    const db = createAdminClient();
    const { error } = await db.from("seo_jobs").insert({
      seed,
      region,
      language,
      requested_by: user.id,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads/seo", "layout");
  }
);

/* Cooperative cancellation — mirrors cancelScrapeJob. */
export const cancelSeoJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("seo_jobs")
    .update({ status: "cancel_requested" })
    .eq("id", jobId)
    .in("status", ["pending", "running"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job is not pending or running.");
  revalidatePath("/admin/leads/seo", "layout");
});

export const retrySeoJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("seo_jobs")
    .update({
      status: "pending",
      error: null,
      progress: 0,
      keywords_found: 0,
      ads_skipped: 0,
      pages_crawled: 0,
      started_at: null,
      finished_at: null,
    })
    .eq("id", jobId)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only failed jobs can be retried.");
  revalidatePath("/admin/leads/seo", "layout");
});
