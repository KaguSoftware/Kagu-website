/*
  Main loop: poll scrape_jobs → claim → crawl → per lead enrich/score/upsert/
  draft → complete. Cooperative cancellation between leads; per-lead failures
  are logged and skipped, job-level failures mark the job failed (the panel
  offers Retry).
*/

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
import type { ScrapeJobRow, SeoJobRow, SeoKeywordInsert } from "./types.js";

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

  for (;;) {
    // Lead scrapes take priority; SEO research jobs drain when the lead queue
    // is idle. One worker, two queues — same poll cadence.
    let scrapeJob: ScrapeJobRow | null = null;
    try {
      scrapeJob = await claimNextJob();
    } catch (err) {
      console.error("Failed to poll for scrape jobs:", err);
    }

    if (scrapeJob) {
      try {
        await processJob(scrapeJob);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[job ${scrapeJob.id}] failed:`, message);
        await failJob(scrapeJob.id, message);
      } finally {
        await closeEnrichBrowser(); // don't keep Chromium alive between jobs
      }
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
      try {
        await processSeoJob(seoJob);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[seo-job ${seoJob.id}] failed:`, message);
        await failSeoJob(seoJob.id, message);
      }
      if (config.runOnce) break;
      continue;
    }

    if (config.runOnce) {
      console.log("No pending jobs. Exiting (RUN_ONCE=1).");
      break;
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
