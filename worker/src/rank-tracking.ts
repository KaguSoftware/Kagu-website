import { config } from "./config.js";
import { db } from "./db.js";
import { scrapeOrganicResults } from "./seo.js";
import type { StrategyReport } from "./strategy.js";

/*
  Rank tracking — closes the plan → ship → measure loop.

  A strategy report is one-shot: it plans, but can't say whether anything
  moved. So every completed strategy job seeds its page plan's head keywords
  into seo_tracked_keywords (worker-side, service role), and the idle worker
  re-checks each host's keywords against the live SERP when its latest
  snapshot is older than a week, appending to seo_rank_snapshots. The admin
  SEO tab reads both tables and shows movement.

  Both tables come from supabase/seo_rank_module.sql. Until that module is
  run, every call here hits "table not found" — logged once, then the whole
  feature stays dormant for the process lifetime instead of spamming the log
  every poll.
*/

const DUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // a host is re-checked weekly
const ATTEMPT_EVERY_MS = 60 * 60 * 1000; // look for due hosts at most hourly

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

let tablesMissing = false;
let lastAttempt = 0;

/* Supabase's PostgrestError is a plain object, not an Error — read .message
   structurally. */
function isMissingTable(err: unknown): boolean {
  const m =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return /PGRST205|Could not find the table|does not exist/i.test(m);
}

function noteMissingTables(): void {
  if (!tablesMissing) {
    console.log(
      "[rank] seo_rank_module.sql not applied yet — rank tracking dormant (run it once in the Supabase SQL editor)"
    );
  }
  tablesMissing = true;
}

/* Called after a strategy job completes: every planned page's head keyword
   becomes a tracked keyword for that host. ignoreDuplicates keeps rows the
   owner already deactivated from being resurrected by a re-run. */
export async function seedTrackedKeywords(report: StrategyReport): Promise<void> {
  if (tablesMissing) return;
  const rows = report.pages.map((p) => ({
    host: report.host,
    keyword: p.headKeyword,
    language: p.language || "en",
  }));
  if (rows.length === 0) return;
  const { error } = await db
    .from("seo_tracked_keywords")
    .upsert(rows, { onConflict: "host,keyword", ignoreDuplicates: true });
  if (error) {
    if (isMissingTable(error)) return noteMissingTables();
    console.warn("[rank] seeding tracked keywords failed:", error.message);
    return;
  }
  console.log(`[rank] tracking ${rows.length} keyword(s) for ${report.host}`);
}

interface TrackedRow {
  id: string;
  host: string;
  keyword: string;
  language: string;
  seo_rank_snapshots: Array<{ checked_at: string }>;
}

/*
  Idle-time pass: find ONE due host (all pending work drains at one host per
  hourly attempt — SERP checks are paced, so short passes beat long ones) and
  snapshot every active keyword it has. SERP failures skip the snapshot so
  the keyword stays due and is retried on the next attempt.
*/
export async function runDueRankChecks(): Promise<void> {
  if (tablesMissing) return;
  const now = Date.now();
  if (now - lastAttempt < ATTEMPT_EVERY_MS) return;
  lastAttempt = now;

  const { data, error } = await db
    .from("seo_tracked_keywords")
    .select("id, host, keyword, language, seo_rank_snapshots(checked_at)")
    .eq("active", true)
    .order("checked_at", { referencedTable: "seo_rank_snapshots", ascending: false })
    .limit(1, { referencedTable: "seo_rank_snapshots" });
  if (error) {
    if (isMissingTable(error)) return noteMissingTables();
    console.warn("[rank] loading tracked keywords failed:", error.message);
    return;
  }

  const rows = (data ?? []) as TrackedRow[];
  const isDue = (r: TrackedRow) => {
    const last = r.seo_rank_snapshots[0]?.checked_at;
    return !last || now - new Date(last).getTime() > DUE_AFTER_MS;
  };
  const dueHost = rows.find(isDue)?.host;
  if (!dueHost) return;

  const due = rows.filter((r) => r.host === dueHost && isDue(r));
  console.log(`[rank] weekly check for ${dueHost} — ${due.length} keyword(s)`);

  let checked = 0;
  for (const r of due) {
    try {
      const { results } = await scrapeOrganicResults(
        r.keyword,
        config.seoRegion,
        r.language || config.seoLanguage
      );
      const mine = results.find(
        (x) => x.domain === r.host || x.domain.endsWith(`.${r.host}`)
      );
      const { error: insertError } = await db
        .from("seo_rank_snapshots")
        .insert({ tracked_id: r.id, rank: mine?.rank ?? null });
      if (insertError) throw new Error(insertError.message);
      checked++;
      console.log(`[rank]   "${r.keyword}" → ${mine ? `#${mine.rank}` : "not in top results"}`);
    } catch (err) {
      console.warn(
        `[rank]   "${r.keyword}" check failed (stays due):`,
        err instanceof Error ? err.message : err
      );
    }
    await sleep(rand(1500, 3500)); // same SERP pacing as the strategy checks
  }
  console.log(`[rank] ${dueHost} done — ${checked}/${due.length} snapshot(s) written`);
}
