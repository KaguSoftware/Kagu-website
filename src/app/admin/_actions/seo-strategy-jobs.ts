"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withResult } from "./action-result";

const CreateSchema = z.object({
  url: z.string().trim().min(4, { error: "A URL is required." }).max(300),
  context: z.string().trim().max(1000),
  serpQueries: z.number().int().min(2).max(16),
  auditPages: z.number().int().min(0).max(12),
});

/*
  Like createSeoAuditJob, this only inserts a `pending` row — the same
  crawler worker (worker/) polls seo_strategy_jobs, runs the whole strategy
  funnel (understand → SERP + demand → plan → embedded audit → master
  prompt), and writes the report back. The DB is the contract.
*/
export const createSeoStrategyJob = withResult(
  async (input: { url: string; context: string; serpQueries: number; auditPages: number }) => {
    const user = await requireAdmin();
    const { url, context, serpQueries, auditPages } = CreateSchema.parse(input);

    // Accept bare domains ("kagusoftware.com") — the worker assumes https too.
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error("Enter a valid URL, e.g. kagusoftware.com");
    }
    if (!parsed.hostname.includes(".")) {
      throw new Error("Enter a full domain, e.g. kagusoftware.com");
    }

    const db = createAdminClient();
    const { error } = await db.from("seo_strategy_jobs").insert({
      url: normalized,
      context: context || null,
      serp_queries: serpQueries,
      audit_pages: auditPages,
      requested_by: user.id,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads/seo", "layout");
  }
);

/* Cooperative cancellation — the worker checks the status between steps. */
export const cancelSeoStrategyJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("seo_strategy_jobs")
    .update({ status: "cancel_requested" })
    .eq("id", jobId)
    .in("status", ["pending", "running"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job is not pending or running.");
  revalidatePath("/admin/leads/seo", "layout");
});

export const retrySeoStrategyJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("seo_strategy_jobs")
    .update({
      status: "pending",
      error: null,
      progress: 0,
      pages_planned: 0,
      demand_queries: 0,
      audit_score: null,
      report: null,
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
