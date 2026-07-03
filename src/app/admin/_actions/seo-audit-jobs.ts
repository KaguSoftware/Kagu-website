"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withResult } from "./action-result";

const CreateSchema = z.object({
  url: z.string().trim().min(4, { error: "A URL is required." }).max(300),
  maxPages: z.number().int().min(1).max(30),
});

/*
  Like createSeoJob, this only inserts a `pending` row — the same crawler
  worker (worker/) polls seo_audit_jobs, crawls the site as a throttled
  mobile device, and writes the scored report back. The DB is the contract.
*/
export const createSeoAuditJob = withResult(
  async (input: { url: string; maxPages: number }) => {
    const user = await requireAdmin();
    const { url, maxPages } = CreateSchema.parse(input);

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
    const { error } = await db.from("seo_audit_jobs").insert({
      url: normalized,
      max_pages: maxPages,
      requested_by: user.id,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads/audit", "layout");
  }
);

/* Cooperative cancellation — mirrors cancelSeoJob. */
export const cancelSeoAuditJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("seo_audit_jobs")
    .update({ status: "cancel_requested" })
    .eq("id", jobId)
    .in("status", ["pending", "running"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job is not pending or running.");
  revalidatePath("/admin/leads/audit", "layout");
});

export const retrySeoAuditJob = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data, error } = await db
    .from("seo_audit_jobs")
    .update({
      status: "pending",
      error: null,
      progress: 0,
      score: null,
      pages_audited: 0,
      issues_found: 0,
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
  revalidatePath("/admin/leads/audit", "layout");
});
