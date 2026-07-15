import { runSpeedInsights, type SpeedReport, type StrategyReport } from "./speed.js";
import { fetchCruxHistory, type CruxHistory } from "./crux.js";

/*
  Speed history — the rank-tracking pattern applied to speed.

  A speed report is one-shot: it says how fast the site is TODAY, but not
  whether the last deploy made it slower. So every CLI run saves its medians
  as a row in seo_speed_snapshots (seeding the URL into seo_speed_tracked_urls
  on first run), and the idle worker re-checks each tracked URL when its
  latest Lighthouse snapshot is older than a week — exactly like
  rank-tracking.ts does for keywords. The admin SEO tab charts the trend.

  Self-monitoring: a snapshot whose median performance score drops more than
  REGRESSION_DROP points vs the previous snapshot of the same URL+strategy is
  flagged `regression` (loud in the log, badged in the admin tab).

  CrUX weekly points land in the same table as source='crux' rows — the
  --field-only CLI mode backfills ~40 weeks retroactively, and each weekly
  worker check appends the newest week, so field history stays current.

  Persistence is OPPORTUNISTIC for the CLI: speed.ts stays a standalone tool,
  so db.js is imported lazily and only when SUPABASE_URL +
  SUPABASE_SERVICE_ROLE_KEY are present (config getters exit the process on
  access when they're missing). No creds = the report still prints, nothing
  is saved. Both tables come from supabase/seo_speed_module.sql; until that
  module is run, the missing-table error is logged once and the feature stays
  dormant for the process lifetime.
*/

const REGRESSION_DROP = 5; // score points vs the previous snapshot
const DUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // a URL is re-checked weekly
const ATTEMPT_EVERY_MS = 60 * 60 * 1000; // look for due URLs at most hourly

let tablesMissing = false;
let lastAttempt = 0;

type Db = typeof import("./db.js").db;
let dbModule: Promise<Db> | null = null;

export function hasDbCreds(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getDb(): Promise<Db> {
  dbModule ??= import("./db.js").then((m) => m.db);
  return dbModule;
}

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
      "[speed-history] seo_speed_module.sql not applied yet — speed history dormant (run it once in the Supabase SQL editor)"
    );
  }
  tablesMissing = true;
}

/* --------------------------------------------------------------------- */
/* Tracked-URL seeding                                                   */
/* --------------------------------------------------------------------- */

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/*
  Find-or-create the tracked row for a URL. Rows the owner deactivated in the
  DB are respected (returns null → nothing saved), mirroring how rank
  tracking never resurrects deactivated keywords.
*/
async function trackedIdFor(url: string): Promise<string | null> {
  const db = await getDb();
  const { data: existing, error: selError } = await db
    .from("seo_speed_tracked_urls")
    .select("id, active")
    .eq("url", url)
    .maybeSingle();
  if (selError) throw selError;
  if (existing) return existing.active ? existing.id : null;

  const { data: created, error: insError } = await db
    .from("seo_speed_tracked_urls")
    .insert({ url, host: hostOf(url) })
    .select("id")
    .single();
  if (insError) throw insError;
  return created.id;
}

/* --------------------------------------------------------------------- */
/* Lighthouse snapshots                                                  */
/* --------------------------------------------------------------------- */

export interface Regression {
  strategy: string;
  from: number;
  to: number;
}

export interface SaveResult {
  saved: number;
  regressions: Regression[];
}

function labValue(s: StrategyReport, id: string): number | null {
  const m = s.lab.find((x) => x.id === id);
  return m ? Math.round(m.value) : null;
}

function categoryScore(s: StrategyReport, id: string): number | null {
  return s.scores.find((x) => x.id === id)?.score ?? null;
}

/*
  One row per strategy, holding the report's medians. Returns null when the
  tables are missing or the URL was deactivated; throws nothing — persistence
  must never sink a report that already printed.
*/
export async function saveSpeedSnapshots(report: SpeedReport): Promise<SaveResult | null> {
  if (tablesMissing || !hasDbCreds()) return null;
  try {
    const trackedId = await trackedIdFor(report.finalUrl);
    if (!trackedId) return null;
    const db = await getDb();

    const result: SaveResult = { saved: 0, regressions: [] };
    for (const s of report.reports) {
      // Regression check: previous Lighthouse snapshot of this URL+strategy.
      const { data: prev, error: prevError } = await db
        .from("seo_speed_snapshots")
        .select("score")
        .eq("tracked_id", trackedId)
        .eq("strategy", s.strategy)
        .eq("source", "lighthouse")
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevError) throw prevError;
      const regression =
        typeof prev?.score === "number" && prev.score - s.score > REGRESSION_DROP;
      if (regression) {
        result.regressions.push({ strategy: s.strategy, from: prev!.score!, to: s.score });
      }

      const cls = s.lab.find((m) => m.id === "cumulative-layout-shift");
      const { error } = await db.from("seo_speed_snapshots").insert({
        tracked_id: trackedId,
        strategy: s.strategy,
        source: "lighthouse",
        score: s.score,
        accessibility: categoryScore(s, "accessibility"),
        best_practices: categoryScore(s, "best-practices"),
        seo: categoryScore(s, "seo"),
        runs: s.runs,
        fcp_ms: labValue(s, "first-contentful-paint"),
        lcp_ms: labValue(s, "largest-contentful-paint"),
        tbt_ms: labValue(s, "total-blocking-time"),
        cls: cls ? Number(cls.value.toFixed(4)) : null,
        si_ms: labValue(s, "speed-index"),
        ttfb_ms: labValue(s, "server-response-time"),
        regression,
        checked_at: report.fetchedAt,
      });
      if (error) throw error;
      result.saved++;
    }
    return result;
  } catch (err) {
    if (isMissingTable(err)) {
      noteMissingTables();
      return null;
    }
    console.warn(
      "[speed-history] saving snapshot failed:",
      err instanceof Error ? err.message : (err as { message?: string })?.message ?? err
    );
    return null;
  }
}

/* --------------------------------------------------------------------- */
/* CrUX history backfill                                                 */
/* --------------------------------------------------------------------- */

/*
  Upsert weekly CrUX points as source='crux' rows, keyed by the collection
  period's end date — idempotent, so a re-run (or the weekly worker pass)
  only appends periods it hasn't seen. Returns rows written, or null when
  dormant/deactivated.
*/
export async function backfillCruxSnapshots(
  url: string,
  histories: CruxHistory[]
): Promise<number | null> {
  if (tablesMissing || !hasDbCreds()) return null;
  try {
    const trackedId = await trackedIdFor(url);
    if (!trackedId) return null;
    const db = await getDb();

    const rows = histories.flatMap((h) =>
      h.points
        .filter((p) => p.periodEnd !== "?")
        .map((p) => ({
          tracked_id: trackedId,
          strategy: h.strategy,
          source: "crux",
          fcp_ms: p.metrics.fcp ?? null,
          lcp_ms: p.metrics.lcp ?? null,
          cls: p.metrics.cls ?? null,
          ttfb_ms: p.metrics.ttfb ?? null,
          inp_ms: p.metrics.inp ?? null,
          // Noon UTC keeps the date stable across timezones.
          checked_at: `${p.periodEnd}T12:00:00Z`,
        }))
    );
    if (rows.length === 0) return 0;

    const { data, error } = await db
      .from("seo_speed_snapshots")
      .upsert(rows, {
        onConflict: "tracked_id,strategy,source,checked_at",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  } catch (err) {
    if (isMissingTable(err)) {
      noteMissingTables();
      return null;
    }
    console.warn(
      "[speed-history] CrUX backfill failed:",
      err instanceof Error ? err.message : (err as { message?: string })?.message ?? err
    );
    return null;
  }
}

/* --------------------------------------------------------------------- */
/* Weekly idle-time checks (worker main loop)                            */
/* --------------------------------------------------------------------- */

interface TrackedUrlRow {
  id: string;
  url: string;
  seo_speed_snapshots: Array<{ checked_at: string }>;
}

/*
  Idle-time pass: find ONE due URL (a full check is strategies × runs PSI
  calls ≈ 3 minutes — short passes keep the job queues responsive) and
  snapshot it. Failures leave the URL due, so it's retried next attempt.
*/
export async function runDueSpeedChecks(): Promise<void> {
  if (tablesMissing || !hasDbCreds()) return;
  const now = Date.now();
  if (now - lastAttempt < ATTEMPT_EVERY_MS) return;
  lastAttempt = now;

  let due: TrackedUrlRow | undefined;
  try {
    const db = await getDb();
    // Due-ness reads the latest LIGHTHOUSE snapshot — fresh weekly CrUX rows
    // must not make a URL look recently lab-checked.
    const { data, error } = await db
      .from("seo_speed_tracked_urls")
      .select("id, url, seo_speed_snapshots(checked_at)")
      .eq("active", true)
      .eq("seo_speed_snapshots.source", "lighthouse")
      .order("checked_at", { referencedTable: "seo_speed_snapshots", ascending: false })
      .limit(1, { referencedTable: "seo_speed_snapshots" });
    if (error) throw error;

    due = ((data ?? []) as TrackedUrlRow[]).find((r) => {
      const last = r.seo_speed_snapshots[0]?.checked_at;
      return !last || now - new Date(last).getTime() > DUE_AFTER_MS;
    });
  } catch (err) {
    if (isMissingTable(err)) return noteMissingTables();
    console.warn(
      "[speed-history] loading tracked URLs failed:",
      err instanceof Error ? err.message : (err as { message?: string })?.message ?? err
    );
    return;
  }
  if (!due) return;

  console.log(`[speed-history] weekly check for ${due.url}`);
  try {
    const report = await runSpeedInsights(due.url);
    const saved = await saveSpeedSnapshots(report);
    for (const r of saved?.regressions ?? []) {
      console.warn(
        `[speed-history] REGRESSION on ${due.url} (${r.strategy}): performance ${r.from} → ${r.to}`
      );
    }
    const scores = report.reports.map((s) => `${s.strategy} ${s.score}`).join(", ");
    console.log(`[speed-history] ${due.url} done — ${scores} (${saved?.saved ?? 0} snapshot(s))`);
  } catch (err) {
    console.warn(
      `[speed-history] ${due.url} check failed (stays due):`,
      err instanceof Error ? err.message : err
    );
    return;
  }

  // Ride-along CrUX refresh: appends the newest weekly field points. Missing
  // key / no CrUX record is fine — field history is a bonus, not a gate.
  try {
    const histories: CruxHistory[] = [];
    for (const strategy of ["mobile", "desktop"] as const) {
      const h = await fetchCruxHistory(due.url, strategy);
      if (h) histories.push(h);
    }
    if (histories.length > 0) {
      const added = await backfillCruxSnapshots(due.url, histories);
      if (added) console.log(`[speed-history] ${due.url} — ${added} new CrUX week(s)`);
    }
  } catch (err) {
    console.log(
      `[speed-history] CrUX refresh skipped: ${err instanceof Error ? err.message : err}`
    );
  }
}
