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
import {
  claimNextJob,
  completeJob,
  failJob,
  isCancelRequested,
  markCancelled,
  updateJobProgress,
} from "./jobs.js";
import type { ScrapeJobRow } from "./types.js";

const CANCEL_CHECK_EVERY = 3; // leads between cancellation checks

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function processJob(job: ScrapeJobRow): Promise<void> {
  console.log(`[job ${job.id}] ${job.category} / ${job.district} — crawling…`);
  const listings = await crawlMaps(job.category, job.district);
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
    await updateJobProgress(job.id, (processed / listings.length) * 100, upserted);
  }

  await completeJob(job.id, upserted);
  console.log(`[job ${job.id}] done — ${upserted}/${listings.length} leads upserted`);
}

async function main(): Promise<void> {
  console.log(
    `Kagu leads worker starting (mock=${config.mockMode}, once=${config.runOnce}, poll=${config.pollIntervalMs}ms)`
  );

  for (;;) {
    let job: ScrapeJobRow | null = null;
    try {
      job = await claimNextJob();
    } catch (err) {
      console.error("Failed to poll for jobs:", err);
    }

    if (job) {
      try {
        await processJob(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[job ${job.id}] failed:`, message);
        await failJob(job.id, message);
      } finally {
        await closeEnrichBrowser(); // don't keep Chromium alive between jobs
      }
      if (config.runOnce) break;
      continue; // look for the next job immediately
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
