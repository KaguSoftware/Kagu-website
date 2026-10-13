import { config } from "./config.js";
import { db } from "./db.js";
import { fetchGscQueryStats, gscConfigured, normalizeQuery, type GscQueryStat } from "./gsc.js";
import { scrapeOrganicResults } from "./seo.js";
import type { StrategyReport } from "./strategy.js";

/*
  Rank tracking — closes the plan → ship → measure loop.

  A strategy report is one-shot: it plans, but can't say whether anything
  moved. So every completed strategy job seeds its page plan into
  seo_tracked_keywords (worker-side, service role): each page's head keyword
  (kind 'head') plus up to CLUSTER_PER_PAGE of its cluster queries (kind
  'cluster'), tagged with the site's market country. The idle worker
  re-checks a host's keywords when their latest snapshot is older than a
  week, appending to seo_rank_snapshots. The admin SEO tab reads both tables
  and shows movement.

  GSC-first: one Search Console call (last 7 days) answers every keyword the
  site already has impressions for — real average position, impressions and
  clicks, zero SERP credits (source 'gsc'). Only HEAD keywords with no GSC
  row (or when GSC isn't configured / errors) fall back to a live SERP check
  in the keyword's own market (`gl` = country, source 'serp'). Cluster
  keywords never spend SERP credits: with GSC they get a zero-impression
  'gsc' snapshot when Google showed nothing; without GSC they aren't
  checkable and are skipped (never kept "due").

  Both tables come from supabase/seo_rank_module.sql. Until that module is
  run, every call here hits "table not found" — logged once, then the whole
  feature stays dormant for the process lifetime instead of spamming the log
  every poll. A module applied BEFORE the GSC-first columns existed degrades
  to the legacy head-only / SERP-only shape with a one-time re-run hint.
*/

const DUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // a host is re-checked weekly
const ATTEMPT_EVERY_MS = 60 * 60 * 1000; // look for due hosts at most hourly
const CLUSTER_PER_PAGE = 5; // cluster queries seeded per planned page

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

let tablesMissing = false;
let legacySchema = false; // module applied before country/kind/source columns
let lastAttempt = 0;
/* Hosts whose last pass ended with a Search Console failure (typically a
   permanent 403 — a domain the service account can't see). Without this a
   host whose cluster keywords can never be answered would be picked as "due"
   every single hour and starve every host behind it in row order. */
const HOST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const hostCooldownUntil = new Map<string, number>();

function errMessage(err: unknown): string {
  return typeof err === "object" && err !== null && "message" in err
    ? String((err as { message: unknown }).message)
    : String(err);
}

/* Supabase's PostgrestError is a plain object, not an Error — read .message
   structurally. Missing COLUMN is checked first: its message also says
   "does not exist", and it must not put the whole feature to sleep. */
function isMissingColumn(err: unknown): boolean {
  return /PGRST204|42703|column .* does not exist|Could not find the '.*' column/i.test(
    errMessage(err)
  );
}

function isMissingTable(err: unknown): boolean {
  if (isMissingColumn(err)) return false;
  return /PGRST205|Could not find the table|does not exist/i.test(errMessage(err));
}

function noteMissingTables(): void {
  if (!tablesMissing) {
    console.log(
      "[rank] seo_rank_module.sql not applied yet — rank tracking dormant (run it once in the Supabase SQL editor)"
    );
  }
  tablesMissing = true;
}

function noteLegacySchema(): void {
  if (!legacySchema) {
    console.log(
      "[rank] seo_rank_module.sql predates GSC-first tracking (country/kind/source columns missing) — " +
        "running head-only SERP checks; re-run the module in the Supabase SQL editor to upgrade"
    );
  }
  legacySchema = true;
}

/* The market a report's keywords are checked in: the strategy's own
   understanding.marketCountry, or config.seoRegion for reports stored before
   that field existed. */
export function marketCountryOf(report: StrategyReport): string {
  const c = (report.understanding as { marketCountry?: string } | undefined)?.marketCountry;
  return (typeof c === "string" && /^[a-z]{2}$/i.test(c.trim()) ? c.trim() : config.seoRegion).toLowerCase();
}

/* A page's cluster queries: clusterQueries when present, else tailQueries
   (reports stored before clusterQueries existed). */
export function clusterQueriesOf(page: StrategyReport["pages"][number]): string[] {
  const p = page as { clusterQueries?: string[]; tailQueries?: string[] };
  const list = Array.isArray(p.clusterQueries) && p.clusterQueries.length > 0 ? p.clusterQueries : p.tailQueries;
  return (list ?? []).filter((q): q is string => typeof q === "string" && q.trim().length > 0);
}

interface SeedRow {
  host: string;
  keyword: string;
  language: string;
  country: string;
  kind: "head" | "cluster";
}

/* Called after a strategy job completes: every planned page's head keyword
   plus its first few cluster queries become tracked keywords for that host.
   ignoreDuplicates keeps rows the owner already deactivated from being
   resurrected by a re-run (and keeps an existing row's kind/country). */
export async function seedTrackedKeywords(report: StrategyReport): Promise<void> {
  if (tablesMissing) return;
  const country = marketCountryOf(report);
  const seen = new Set<string>();
  const rows: SeedRow[] = [];
  const add = (keyword: string, language: string, kind: SeedRow["kind"]) => {
    const kw = keyword.trim();
    const key = normalizeQuery(kw);
    if (!kw || seen.has(key)) return;
    seen.add(key);
    rows.push({ host: report.host, keyword: kw, language: language || "en", country, kind });
  };
  // Heads first so a query that is one page's head and another's cluster
  // member is tracked as a head.
  for (const p of report.pages) add(p.headKeyword, p.language, "head");
  for (const p of report.pages) {
    for (const q of clusterQueriesOf(p).slice(0, CLUSTER_PER_PAGE)) add(q, p.language, "cluster");
  }
  if (rows.length === 0) return;

  let payload: Array<Partial<SeedRow>> = legacySchema
    ? rows.filter((r) => r.kind === "head").map(({ host, keyword, language }) => ({ host, keyword, language }))
    : rows;
  let { error } = await db
    .from("seo_tracked_keywords")
    .upsert(payload, { onConflict: "host,keyword", ignoreDuplicates: true });
  if (error && isMissingColumn(error)) {
    noteLegacySchema();
    payload = rows.filter((r) => r.kind === "head").map(({ host, keyword, language }) => ({ host, keyword, language }));
    ({ error } = await db
      .from("seo_tracked_keywords")
      .upsert(payload, { onConflict: "host,keyword", ignoreDuplicates: true }));
  }
  if (error) {
    if (isMissingTable(error)) return noteMissingTables();
    console.warn("[rank] seeding tracked keywords failed:", error.message);
    return;
  }
  const heads = payload.filter((r) => (r.kind ?? "head") === "head").length;
  console.log(
    `[rank] tracking ${payload.length} keyword(s) for ${report.host} ` +
      `(${heads} head, ${payload.length - heads} cluster; market ${legacySchema ? config.seoRegion : country})`
  );
}

interface TrackedRow {
  id: string;
  host: string;
  keyword: string;
  language: string;
  country?: string;
  kind?: "head" | "cluster";
  seo_rank_snapshots: Array<{ checked_at: string }>;
}

/* PostgREST caps a response at 1,000 rows and a strategy now seeds up to
   six keywords per page, so page through — a keyword past the cap would
   otherwise never be checked, silently. */
const PAGE = 1000;

async function loadTracked(): Promise<TrackedRow[] | null> {
  const query = (cols: string, from: number) =>
    db
      .from("seo_tracked_keywords")
      .select(`${cols}, seo_rank_snapshots(checked_at)`)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .order("checked_at", { referencedTable: "seo_rank_snapshots", ascending: false })
      .limit(1, { referencedTable: "seo_rank_snapshots" })
      .range(from, from + PAGE - 1);

  let cols = legacySchema ? "id, host, keyword, language" : "id, host, keyword, language, country, kind";
  const rows: TrackedRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let { data, error } = await query(cols, from);
    if (error && isMissingColumn(error)) {
      noteLegacySchema();
      cols = "id, host, keyword, language";
      ({ data, error } = await query(cols, from));
    }
    if (error) {
      if (isMissingTable(error)) {
        noteMissingTables();
        return null;
      }
      console.warn("[rank] loading tracked keywords failed:", error.message);
      return null;
    }
    const page = (data ?? []) as unknown as TrackedRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function insertSnapshot(row: Record<string, unknown>): Promise<void> {
  const payload = legacySchema ? { tracked_id: row.tracked_id, rank: row.rank } : row;
  const { error } = await db.from("seo_rank_snapshots").insert(payload);
  if (!error) return;
  if (isMissingColumn(error) && !legacySchema) {
    noteLegacySchema();
    const { error: retryError } = await db
      .from("seo_rank_snapshots")
      .insert({ tracked_id: row.tracked_id, rank: row.rank });
    if (retryError) throw new Error(retryError.message);
    return;
  }
  throw new Error(error.message);
}

/*
  Idle-time pass: find ONE due host (all pending work drains at one host per
  hourly attempt — SERP fallbacks are paced, so short passes beat long ones),
  answer what Search Console can in one call, SERP-check the remaining head
  keywords. A failed check skips the snapshot so the keyword stays due and is
  retried on the next attempt.
*/
export async function runDueRankChecks(): Promise<void> {
  if (tablesMissing || config.mockMode) return;
  const now = Date.now();
  if (now - lastAttempt < ATTEMPT_EVERY_MS) return;
  lastAttempt = now;

  const rows = await loadTracked();
  if (!rows) return;

  // Without Search Console (or on a pre-upgrade schema), cluster keywords
  // can't be checked without spending SERP credits — leave them out of the
  // due set entirely so they never pin a host as "due".
  const gscOn = !legacySchema && gscConfigured();
  const checkable = (r: TrackedRow) => (r.kind ?? "head") === "head" || gscOn;
  const isDue = (r: TrackedRow) => {
    if (!checkable(r)) return false;
    const last = r.seo_rank_snapshots[0]?.checked_at;
    return !last || now - new Date(last).getTime() > DUE_AFTER_MS;
  };
  const dueHost = rows.find((r) => isDue(r) && (hostCooldownUntil.get(r.host) ?? 0) <= now)?.host;
  if (!dueHost) return;

  const due = rows.filter((r) => r.host === dueHost && isDue(r));
  console.log(`[rank] weekly check for ${dueHost} — ${due.length} keyword(s)`);

  let stats: Map<string, GscQueryStat> | null = null;
  if (gscOn) {
    try {
      stats = await fetchGscQueryStats(
        dueHost,
        due.map((r) => r.keyword),
        7
      );
    } catch (err) {
      console.warn(
        "[rank]   Search Console lookup failed — head keywords fall back to SERP, cluster keywords stay due (host retried in 24h):",
        err instanceof Error ? err.message : err
      );
      hostCooldownUntil.set(dueHost, now + HOST_COOLDOWN_MS);
    }
  }

  let viaGsc = 0;
  let viaSerp = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of due) {
    const kind = r.kind ?? "head";
    const gsc = stats?.get(r.keyword);
    try {
      if (gsc) {
        await insertSnapshot({
          tracked_id: r.id,
          source: "gsc",
          rank: Math.round(gsc.position),
          position: gsc.position,
          impressions: gsc.impressions,
          clicks: gsc.clicks,
        });
        viaGsc++;
        console.log(
          `[rank]   "${r.keyword}" → GSC avg #${gsc.position} (${gsc.impressions} impr, ${gsc.clicks} clicks)`
        );
        continue;
      }
      if (kind === "cluster") {
        if (!stats) {
          skipped++; // GSC errored this pass — stays due, no SERP spend
          continue;
        }
        // Search Console answered and had nothing: zero impressions this week.
        await insertSnapshot({
          tracked_id: r.id,
          source: "gsc",
          rank: null,
          position: null,
          impressions: 0,
          clicks: 0,
        });
        viaGsc++;
        console.log(`[rank]   "${r.keyword}" → GSC: no impressions in 7 days`);
        continue;
      }

      const gl = (r.country || config.seoRegion).toLowerCase();
      const { results } = await scrapeOrganicResults(r.keyword, gl, r.language || config.seoLanguage);
      const mine = results.find((x) => x.domain === r.host || x.domain.endsWith(`.${r.host}`));
      await insertSnapshot({ tracked_id: r.id, source: "serp", rank: mine?.rank ?? null });
      viaSerp++;
      console.log(
        `[rank]   "${r.keyword}" → SERP (${gl}) ${mine ? `#${mine.rank}` : "not in top results"}`
      );
    } catch (err) {
      failed++;
      console.warn(
        `[rank]   "${r.keyword}" check failed (stays due):`,
        err instanceof Error ? err.message : err
      );
    }
    await sleep(rand(1500, 3500)); // same SERP pacing as the strategy checks
  }
  console.log(
    `[rank] ${dueHost} done — ${viaGsc + viaSerp}/${due.length} snapshot(s) written ` +
      `(${viaGsc} via GSC, ${viaSerp} via SERP${failed ? `, ${failed} failed` : ""}${skipped ? `, ${skipped} skipped` : ""})`
  );
}
