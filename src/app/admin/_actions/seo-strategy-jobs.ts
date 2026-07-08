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

/*
  The lead drawer's SEO block: the newest strategy job for a lead's website,
  matched by host, so outreach can quote real numbers ("your site audits
  61/100") and link the full report.
*/
export const getLeadSeoStrategy = withResult(
  async (websiteUrl: string) => {
    await requireAdmin();
    let host: string;
    try {
      host = new URL(
        /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
      ).hostname.replace(/^www\./, "");
    } catch {
      throw new Error("Lead has no valid website URL.");
    }
    const db = createAdminClient();
    const { data, error } = await db
      .from("seo_strategy_jobs")
      .select("id, status, audit_score, pages_planned, created_at")
      .ilike("url", `%${host}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
);

/*
  "Did the agent actually ship everything?" — fetch every planned slug on the
  live site and store which ones answer 2xx, inside the report jsonb (so a
  worker re-run, which rewrites the report, naturally resets the check).
*/
export const verifySeoStrategyPages = withResult(async (id: string) => {
  await requireAdmin();
  const jobId = z.uuid().parse(id);
  const db = createAdminClient();
  const { data: job, error } = await db
    .from("seo_strategy_jobs")
    .select("report")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!job?.report) throw new Error("This job has no report to verify.");

  const report = job.report;
  const results: Array<{ slug: string; ok: boolean; status: number | null }> = [];
  for (const page of report.pages) {
    let ok = false;
    let status: number | null = null;
    try {
      const res = await fetch(`https://${report.host}${page.slug}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { "user-agent": "kagu-admin-page-check" },
        cache: "no-store",
      });
      ok = res.ok;
      status = res.status;
    } catch {
      /* unreachable — ok stays false, status null */
    }
    results.push({ slug: page.slug, ok, status });
  }

  const { error: updateError } = await db
    .from("seo_strategy_jobs")
    .update({
      report: {
        ...report,
        pageCheck: { checkedAt: new Date().toISOString(), results },
      },
    })
    .eq("id", jobId);
  if (updateError) throw new Error(updateError.message);
  revalidatePath("/admin/leads/seo", "layout");
});

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
