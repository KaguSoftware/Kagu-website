/*
  Main loop: poll scrape_jobs → claim → crawl → per lead enrich/score/upsert/
  draft → complete. Cooperative cancellation between leads; per-lead failures
  are logged and skipped, job-level failures mark the job failed (the panel
  offers Retry).
*/

import { spawn, type ChildProcess } from "node:child_process";
import { config } from "./config.js";
import { db } from "./db.js";
import { crawlMaps } from "./crawl.js";
import { closeEnrichBrowser, enrichLead } from "./enrich.js";
import { scoreLead } from "./score.js";
import { draftMessages } from "./draft.js";
import { researchKeywords } from "./seo.js";
import {
  claimNextJob,
  completeJob,
  failJob,
  isCancelRequested,
  markCancelled,
  updateJobProgress,
} from "./jobs.js";
import {
  claimNextSeoJob,
  completeSeoJob,
  failSeoJob,
  isSeoCancelRequested,
  markSeoCancelled,
  requeueOrphanedSeoJobs,
  updateSeoJobProgress,
} from "./seo-jobs.js";
import { auditSite } from "./audit.js";
import {
  claimNextSeoAuditJob,
  completeSeoAuditJob,
  failSeoAuditJob,
  isSeoAuditCancelRequested,
  markSeoAuditCancelled,
  requeueOrphanedSeoAuditJobs,
  updateSeoAuditJobProgress,
} from "./seo-audit-jobs.js";
import { buildSeoStrategy } from "./strategy.js";
import { runDueRankChecks, seedTrackedKeywords } from "./rank-tracking.js";
import {
  claimNextSeoStrategyJob,
  completeSeoStrategyJob,
  failSeoStrategyJob,
  isSeoStrategyCancelRequested,
  markSeoStrategyCancelled,
  requeueOrphanedSeoStrategyJobs,
  updateSeoStrategyJobProgress,
} from "./seo-strategy-jobs.js";
import type {
  ScrapeJobRow,
  SeoAuditJobRow,
  SeoJobRow,
  SeoKeywordInsert,
  SeoStrategyJobRow,
} from "./types.js";

const CANCEL_CHECK_EVERY = 3; // leads between cancellation checks
// Progress is phase-weighted: visiting place pages (crawl) and processing
// leads (enrich/screenshot/draft) take roughly as long per item.
const CRAWL_SHARE = 50; // % of the bar the crawl phase owns
// SEO jobs crawl only ~topN pages — the page-crawl loop owns the middle 80%
// of the bar, with the SERP scrape and Groq pass as the bookends.
const SEO_CRAWL_LO = 10;
const SEO_CRAWL_HI = 90;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Thrown from inside the crawl progress callback to abort on cancellation. */
class JobCancelled extends Error {}

/*
  macOS idle-sleep guard: a claimed job dies half-done when the Mac dozes
  off mid-crawl, so hold a caffeinate assertion for exactly as long as a job
  is processing (idle polling never keeps the machine awake). `-i` blocks
  idle sleep only — closing the lid still sleeps. No-op off macOS.
*/
let caffeinateProc: ChildProcess | null = null;
function stayAwake(): void {
  if (process.platform !== "darwin" || caffeinateProc) return;
  try {
    caffeinateProc = spawn("caffeinate", ["-i", "-w", String(process.pid)], {
      stdio: "ignore",
    });
    caffeinateProc.on("error", () => {
      caffeinateProc = null; // caffeinate missing — degrade silently
    });
  } catch {
    caffeinateProc = null;
  }
}
function allowSleep(): void {
  caffeinateProc?.kill();
  caffeinateProc = null;
}

/* Run one claimed job with the sleep guard held and errors funneled to the
   queue's fail handler — the shared shape of all four queue branches. */
async function runClaimed<T extends { id: string }>(
  job: T,
  label: string,
  handler: (job: T) => Promise<void>,
  fail: (id: string, message: string) => Promise<void>,
  cleanup?: () => Promise<void>
): Promise<void> {
  stayAwake();
  try {
    await handler(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${label} ${job.id}] failed:`, message);
    await fail(job.id, message);
  } finally {
    allowSleep();
    await cleanup?.();
  }
}

async function processJob(job: ScrapeJobRow): Promise<void> {
  console.log(`[job ${job.id}] ${job.category} / ${job.district} — crawling…`);

  let listings;
  try {
    listings = await crawlMaps(job.category, job.district, async (done, total) => {
      if (done % CANCEL_CHECK_EVERY === 0 && (await isCancelRequested(job.id))) {
        throw new JobCancelled();
      }
      await updateJobProgress(job.id, (done / total) * CRAWL_SHARE, 0);
    });
  } catch (err) {
    if (err instanceof JobCancelled) {
      console.log(`[job ${job.id}] cancellation requested during crawl — stopping`);
      await markCancelled(job.id);
      return;
    }
    throw err;
  }
  console.log(`[job ${job.id}] ${listings.length} listings found`);

  let processed = 0;
  let upserted = 0;

  for (const raw of listings) {
    if (processed % CANCEL_CHECK_EVERY === 0 && (await isCancelRequested(job.id))) {
      console.log(`[job ${job.id}] cancellation requested — stopping`);
      await markCancelled(job.id);
      return;
    }

    try {
      const enrichment = await enrichLead(raw);
      const lead_score = scoreLead(raw, enrichment);
      const now = new Date().toISOString();

      // place_id is the dedup key: re-running a job refreshes existing rows
      // instead of duplicating them. Pipeline status/notes are intentionally
      // NOT in this payload so re-scrapes never clobber sales-side state.
      const { data: lead, error } = await db
        .from("leads")
        .upsert(
          {
            place_id: raw.place_id,
            name: raw.name,
            category: raw.category,
            district: raw.district,
            address: raw.address,
            lat: raw.lat,
            lng: raw.lng,
            phone: raw.phone,
            website_url: raw.website_url,
            rating: raw.rating,
            review_count: raw.review_count,
            instagram_handle: enrichment.instagram_handle,
            instagram_followers: enrichment.instagram_followers,
            audit_flags: enrichment.audit_flags,
            review_themes: enrichment.review_themes,
            screenshot_url: enrichment.screenshot_url,
            lead_score,
            source_job_id: job.id,
            updated_at: now,
          },
          { onConflict: "place_id" }
        )
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      upserted++;

      // Idempotent drafting: skip leads that already have messages so job
      // retries don't pile up duplicate drafts.
      const { count } = await db
        .from("lead_messages")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", lead.id);
      if ((count ?? 0) === 0) {
        const drafts = await draftMessages(raw, enrichment);
        if (drafts.length > 0) {
          const { error: draftError } = await db
            .from("lead_messages")
            .insert(drafts.map((d) => ({ ...d, lead_id: lead.id })));
          if (draftError) throw new Error(draftError.message);
        }
      }
    } catch (err) {
      console.error(`[job ${job.id}] lead ${raw.place_id} failed:`, err);
    }

    processed++;
    await updateJobProgress(
      job.id,
      CRAWL_SHARE + (processed / listings.length) * (100 - CRAWL_SHARE),
      upserted
    );
  }

  await completeJob(job.id, upserted);
  console.log(`[job ${job.id}] done — ${upserted}/${listings.length} leads upserted`);
}

/*
  SEO research job: scrape the top organic results for the seed, crawl them,
  rank keywords, and write seo_keywords back. Cooperative cancellation runs
  through the same JobCancelled-from-progress-callback path as the Maps crawl.
*/
async function processSeoJob(job: SeoJobRow): Promise<void> {
  console.log(
    `[seo-job ${job.id}] "${job.seed}" (${job.region}/${job.language}) — researching…`
  );

  let report;
  try {
    report = await researchKeywords(job.seed, {
      region: job.region,
      language: job.language,
      onProgress: async (done, total) => {
        if (await isSeoCancelRequested(job.id)) throw new JobCancelled();
        await updateSeoJobProgress(
          job.id,
          SEO_CRAWL_LO + (done / total) * (SEO_CRAWL_HI - SEO_CRAWL_LO)
        );
      },
    });
  } catch (err) {
    if (err instanceof JobCancelled) {
      console.log(`[seo-job ${job.id}] cancellation requested — stopping`);
      await markSeoCancelled(job.id);
      return;
    }
    throw err;
  }

  // Idempotent retry: clear any keywords from a previous run first, so a
  // re-processed job replaces its results instead of stacking duplicates.
  const { error: delError } = await db.from("seo_keywords").delete().eq("job_id", job.id);
  if (delError) throw new Error(delError.message);

  // Two row sets, mirroring the CLI report: Groq's curated recommendations
  // (refined, carrying intent/rationale) then the raw on-page-signal ranking.
  const rows: SeoKeywordInsert[] = [];
  (report.refined ?? []).forEach((k, i) =>
    rows.push({
      job_id: job.id,
      keyword: k.keyword,
      score: 0,
      frequency: null,
      pages: null,
      title_hits: null,
      heading_hits: null,
      meta_hits: null,
      refined: true,
      intent: k.intent,
      rationale: k.rationale || null,
      rank: i,
    })
  );
  report.candidates.forEach((c, i) =>
    rows.push({
      job_id: job.id,
      keyword: c.keyword,
      score: c.score,
      frequency: c.frequency,
      pages: c.pages,
      title_hits: c.titleHits,
      heading_hits: c.headingHits,
      meta_hits: c.metaHits,
      refined: false,
      intent: null,
      rationale: null,
      rank: i,
    })
  );

  if (rows.length > 0) {
    const { error } = await db.from("seo_keywords").insert(rows);
    if (error) throw new Error(error.message);
  }

  await completeSeoJob(job.id, {
    keywordsFound: (report.refined ?? report.candidates).length,
    adsSkipped: report.adsSkipped,
    pagesCrawled: report.pagesCrawled,
    organic: report.organic,
  });
  console.log(`[seo-job ${job.id}] done — ${rows.length} keyword rows written`);
}

/*
  SEO site-audit job: crawl the site from the given URL as a throttled mobile
  device, score every page, and write the merged report back onto the job row.
  Same cooperative-cancellation path as the other queues.
*/
async function processSeoAuditJob(job: SeoAuditJobRow): Promise<void> {
  console.log(`[audit-job ${job.id}] ${job.url} (max ${job.max_pages} pages) — auditing…`);

  let report;
  try {
    report = await auditSite(job.url, {
      maxPages: job.max_pages,
      onProgress: async (done, total) => {
        if (await isSeoAuditCancelRequested(job.id)) throw new JobCancelled();
        // The page loop owns 5–95%; completion snaps to 100.
        await updateSeoAuditJobProgress(job.id, 5 + (done / total) * 90);
      },
    });
  } catch (err) {
    if (err instanceof JobCancelled) {
      console.log(`[audit-job ${job.id}] cancellation requested — stopping`);
      await markSeoAuditCancelled(job.id);
      return;
    }
    throw err;
  }

  await completeSeoAuditJob(job.id, report);
  console.log(
    `[audit-job ${job.id}] done — score ${report.score}/100, ` +
      `${report.pages.length} pages, ${report.findings.length} issues`
  );
}

/*
  SEO strategy job: the whole funnel — read + understand the site, generate
  searches, check SERP + autocomplete demand (+ Search Console when
  configured), build the winnability-graded page plan, run the embedded
  audit, compose the master prompt — and write it all back as one report.
  Same cooperative-cancellation path as the other queues.
*/
async function processSeoStrategyJob(job: SeoStrategyJobRow): Promise<void> {
  console.log(`[strategy-job ${job.id}] ${job.url} — building strategy…`);

  let report;
  try {
    report = await buildSeoStrategy(job.url, {
      serpQueries: job.serp_queries,
      auditPages: job.audit_pages,
      ownerNotes: job.context ?? undefined,
      onProgress: async (done, total) => {
        if (await isSeoStrategyCancelRequested(job.id)) throw new JobCancelled();
        // The coarse steps own 3–97%; completion snaps to 100.
        await updateSeoStrategyJobProgress(job.id, 3 + (done / total) * 94);
      },
    });
  } catch (err) {
    if (err instanceof JobCancelled) {
      console.log(`[strategy-job ${job.id}] cancellation requested — stopping`);
      await markSeoStrategyCancelled(job.id);
      return;
    }
    throw err;
  }

  await completeSeoStrategyJob(job.id, report);
  await seedTrackedKeywords(report); // head keywords enter weekly rank tracking
  console.log(
    `[strategy-job ${job.id}] done — ${report.pages.length} pages planned, ` +
      `${report.headKeywords.length} head keywords, audit ${report.audit ? `${report.audit.score}/100` : "skipped"}`
  );
}

/*
  Re-queue jobs orphaned in "running" by a previous worker process dying
  mid-job (deploy restart, crash, reboot). Safe with a single worker —
  re-processing is idempotent (leads upsert on place_id, drafting skips
  leads that already have messages). Don't run multiple workers with this on.
*/
async function requeueOrphanedJobs(): Promise<void> {
  const { data, error } = await db
    .from("scrape_jobs")
    .update({ status: "pending", progress: 0, started_at: null })
    .eq("status", "running")
    .select("id");
  if (error) {
    console.warn("Failed to re-queue orphaned jobs:", error.message);
    return;
  }
  if (data?.length) console.log(`Re-queued ${data.length} orphaned running job(s)`);
}

async function main(): Promise<void> {
  console.log(
    `Kagu leads worker starting (mock=${config.mockMode}, once=${config.runOnce}, poll=${config.pollIntervalMs}ms)`
  );
  await requeueOrphanedJobs();
  await requeueOrphanedSeoJobs();
  await requeueOrphanedSeoAuditJobs();
  await requeueOrphanedSeoStrategyJobs();

  for (;;) {
    // Lead scrapes take priority; SEO research, site-audit, then strategy
    // jobs drain when the lead queue is idle. One worker, four queues.
    let scrapeJob: ScrapeJobRow | null = null;
    try {
      scrapeJob = await claimNextJob();
    } catch (err) {
      console.error("Failed to poll for scrape jobs:", err);
    }

    if (scrapeJob) {
      // closeEnrichBrowser: don't keep Chromium alive between jobs.
      await runClaimed(scrapeJob, "job", processJob, failJob, closeEnrichBrowser);
      if (config.runOnce) break;
      continue; // look for the next job immediately
    }

    let seoJob: SeoJobRow | null = null;
    try {
      seoJob = await claimNextSeoJob();
    } catch (err) {
      console.error("Failed to poll for SEO jobs:", err);
    }

    if (seoJob) {
      await runClaimed(seoJob, "seo-job", processSeoJob, failSeoJob);
      if (config.runOnce) break;
      continue;
    }

    let auditJob: SeoAuditJobRow | null = null;
    try {
      auditJob = await claimNextSeoAuditJob();
    } catch (err) {
      console.error("Failed to poll for SEO audit jobs:", err);
    }

    if (auditJob) {
      await runClaimed(auditJob, "audit-job", processSeoAuditJob, failSeoAuditJob);
      if (config.runOnce) break;
      continue;
    }

    let strategyJob: SeoStrategyJobRow | null = null;
    try {
      strategyJob = await claimNextSeoStrategyJob();
    } catch (err) {
      console.error("Failed to poll for SEO strategy jobs:", err);
    }

    if (strategyJob) {
      await runClaimed(strategyJob, "strategy-job", processSeoStrategyJob, failSeoStrategyJob);
      if (config.runOnce) break;
      continue;
    }

    if (config.runOnce) {
      console.log("No pending jobs. Exiting (RUN_ONCE=1).");
      break;
    }
    // All four queues idle — spend the quiet time on weekly rank checks
    // (self-throttled to one attempt per hour, one host per attempt).
    try {
      await runDueRankChecks();
    } catch (err) {
      console.warn("[rank] pass failed:", err instanceof Error ? err.message : err);
    }
    await sleep(config.pollIntervalMs);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Worker crashed:", err);
    process.exit(1);
  }
);
