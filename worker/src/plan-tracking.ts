import { auditSite } from "./audit.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { composeFollowup, type PlanCheck } from "./followup.js";
import { fetchGscQueryStats, gscConfigured, normalizeQuery, type GscQueryStat } from "./gsc.js";
import { clusterQueriesOf } from "./rank-tracking.js";
import { decodeEntities, firstMatch, fuzzyTokenMatch, tokenize } from "./seo.js";
import type { StrategyReport } from "./strategy.js";

/*
  Plan tracking — did the plan ship, and did it move?

  A strategy report plans pages; nothing re-checks them. This idle-time pass
  takes the latest `done` seo_strategy_jobs row per host and, every
  SEO_PLAN_CHECK_DAYS (default 7), measures each planned page on the live
  site with plain HTTP — no browser, no SERP credits:

    shipped        GET origin + slug (redirects followed) answers 200 HTML
    inSitemap      robots.txt → Sitemap: URLs (or /sitemap.xml), one level of
                   sitemap index followed; does any <loc> path equal the slug
    indexable      no noindex in meta robots / X-Robots-Tag; canonical
                   absent or self
    titleHasHead   ≥ 60% of the head keyword's tokens fuzzily in <title>
    hasFaqSchema   FAQPage JSON-LD present (only when the plan had ≥ 2 FAQs)
    GSC movement   one Search Console call per pass (7 days) summed over each
                   page's cluster queries (+ head keyword); the baseline is
                   the strategy's own 90-day GSC rows scaled ×7/90

  auditIssues    shipped pages get a static-only single-page audit
                 (auditSite with staticOnly — no browser, ~1s/page); warn-
                 or-worse findings, max 10. followup.ts diffs them against
                 the strategy's original audit to surface NEW issues only.

  Rows land in seo_plan_checks; the pass then asks followup.ts for a
  deterministic follow-up prompt and stores it in seo_strategy_followups —
  unless nothing is actionable, or the findings' fingerprint matches the
  latest follow-up for that job (no weekly spam when nothing changed).

  Same self-throttle as rank-tracking: one attempt per hour, one host per
  attempt, dormant for the process lifetime once a missing-table error says
  supabase/seo_plan_module.sql hasn't been applied. MOCK_MODE skips it.
*/

const ATTEMPT_EVERY_MS = 60 * 60 * 1000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TITLE_MATCH_RATIO = 0.6;
const MAX_CHILD_SITEMAPS = 20;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let tablesMissing = false;
let lastAttempt = 0;
const noPlan = new Set<string>(); // strategy jobs without pages — never due again this process

function errMessage(err: unknown): string {
  return typeof err === "object" && err !== null && "message" in err
    ? String((err as { message: unknown }).message)
    : String(err);
}

function isMissingTable(err: unknown): boolean {
  return /PGRST205|Could not find the table|relation .* does not exist/i.test(errMessage(err));
}

function noteMissingTables(): void {
  if (!tablesMissing) {
    console.log(
      "[plan] seo_plan_module.sql not applied yet — plan tracking dormant (run it once in the Supabase SQL editor)"
    );
  }
  tablesMissing = true;
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const slugPath = (slug: string) => (slug.startsWith("/") ? slug : `/${slug}`);
const normPath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p).toLowerCase();

async function get(url: string, timeoutMs = 20000): Promise<Response | null> {
  try {
    return await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* Sitemap (per host, per pass)                                             */
/* ------------------------------------------------------------------------ */

const locsOf = (xml: string) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));

/* Every page path the site's sitemaps list, or null when no sitemap exists. */
export async function loadSitemapPaths(origin: string): Promise<Set<string> | null> {
  let sitemapUrls: string[] = [];
  const robots = await get(`${origin}/robots.txt`, 15000);
  if (robots?.ok) {
    const txt = await robots.text();
    sitemapUrls = [...txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  }
  if (sitemapUrls.length === 0) sitemapUrls = [`${origin}/sitemap.xml`];

  const paths = new Set<string>();
  let found = false;
  const queue = [...sitemapUrls];
  let children = 0;
  while (queue.length) {
    const url = queue.shift()!;
    const res = await get(url, 15000);
    if (!res?.ok) continue;
    const xml = await res.text();
    if (!/<(urlset|sitemapindex)[\s>]/i.test(xml)) continue;
    found = true;
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    for (const loc of locsOf(xml)) {
      if (isIndex) {
        if (children++ < MAX_CHILD_SITEMAPS) queue.push(loc);
      } else {
        try {
          paths.add(normPath(new URL(loc).pathname));
        } catch {
          /* skip malformed loc */
        }
      }
    }
  }
  return found ? paths : null;
}

/* ------------------------------------------------------------------------ */
/* Static page checks                                                       */
/* ------------------------------------------------------------------------ */

function linkCanonical(html: string): string {
  return (
    firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    firstMatch(html, /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
  );
}

function metaRobots(html: string): string {
  const out: string[] = [];
  for (const m of html.matchAll(/<meta[^>]+>/gi)) {
    const tag = m[0];
    if (!/name=["'](robots|googlebot)["']/i.test(tag)) continue;
    const c = tag.match(/content=["']([^"']*)["']/i);
    if (c) out.push(c[1]);
  }
  return out.join(", ");
}

const sameUrl = (a: string, b: string): boolean => {
  try {
    const x = new URL(a);
    const y = new URL(b);
    return (
      x.hostname.replace(/^www\./, "") === y.hostname.replace(/^www\./, "") &&
      normPath(x.pathname) === normPath(y.pathname) &&
      x.search === y.search
    );
  } catch {
    return false;
  }
};

/* Exported for tests. */
export function indexability(
  html: string,
  xRobotsTag: string | null,
  finalUrl: string
): { indexable: boolean; reason: string | null } {
  const robots = metaRobots(html);
  if (/noindex/i.test(robots)) return { indexable: false, reason: `meta robots says "${robots}"` };
  if (xRobotsTag && /noindex/i.test(xRobotsTag)) {
    return { indexable: false, reason: `X-Robots-Tag header says "${xRobotsTag}"` };
  }
  const canonical = linkCanonical(html);
  if (canonical) {
    let abs = canonical;
    try {
      abs = new URL(canonical, finalUrl).toString();
    } catch {
      /* keep raw */
    }
    if (!sameUrl(abs, finalUrl)) {
      return { indexable: false, reason: `canonical points elsewhere (${abs})` };
    }
  }
  return { indexable: true, reason: null };
}

/* Head keyword "in" the title: ≥ 60% of its tokens fuzzily present
   (Turkish suffixes tolerated via seo.ts's fuzzyTokenMatch). */
export function titleHasHeadKeyword(title: string, head: string): boolean {
  const want = tokenize(head);
  if (want.length === 0) return true;
  const have = tokenize(title);
  const hit = want.filter((w) => have.some((h) => fuzzyTokenMatch(w, h))).length;
  return hit / want.length >= TITLE_MATCH_RATIO;
}

function hasType(node: unknown, type: string): boolean {
  if (Array.isArray(node)) return node.some((n) => hasType(n, type));
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    if (t === type || (Array.isArray(t) && t.includes(type))) return true;
    return Object.values(o).some((v) => hasType(v, type));
  }
  return false;
}

export function hasFaqPageSchema(html: string): boolean {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      if (hasType(JSON.parse(m[1]), "FAQPage")) return true;
    } catch {
      if (/"@type"\s*:\s*\[?[^\]]*"FAQPage"/.test(m[1])) return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------------ */
/* GSC aggregation per page                                                 */
/* ------------------------------------------------------------------------ */

/* The queries a page is measured on: its cluster queries plus the head
   keyword (deduped by normalised form). */
function measuredQueries(page: StrategyReport["pages"][number]): string[] {
  const seen = new Set<string>();
  return [page.headKeyword, ...clusterQueriesOf(page)].filter((q) => {
    const k = normalizeQuery(q ?? "");
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function gscFor(queries: string[], stats: Map<string, GscQueryStat> | null) {
  if (!stats) return { impressions7d: null, clicks7d: null, avgPosition: null };
  let impressions = 0;
  let clicks = 0;
  let weighted = 0;
  for (const q of queries) {
    const s = stats.get(q);
    if (!s) continue;
    impressions += s.impressions;
    clicks += s.clicks;
    weighted += s.position * s.impressions;
  }
  return {
    impressions7d: impressions,
    clicks7d: clicks,
    avgPosition: impressions > 0 ? Math.round((weighted / impressions) * 10) / 10 : null,
  };
}

/* "Before" number for a page's cluster. Preferred: a like-for-like Search
   Console window — the 7 days ending when the strategy ran (GSC keeps 16
   months, so this is exact and covers every query). Fallback: the report's
   stored 90-day rows scaled to a week — those are only the top 250 queries,
   so long-tail baselines read as 0 there and would mint false "wins". */
function baselineFor(
  queries: string[],
  report: StrategyReport,
  baseline: Map<string, GscQueryStat> | null
): number | null {
  if (baseline) {
    return queries.reduce((sum, q) => sum + (baseline.get(q)?.impressions ?? 0), 0);
  }
  if (!report.gsc) return null;
  const wanted = new Set(queries.map(normalizeQuery));
  const sum = report.gsc
    .filter((r) => wanted.has(normalizeQuery(r.query)))
    .reduce((s, r) => s + r.impressions, 0);
  return Math.round((sum * 7) / 90);
}

/* ------------------------------------------------------------------------ */
/* One page                                                                 */
/* ------------------------------------------------------------------------ */

async function checkPage(
  origin: string,
  page: StrategyReport["pages"][number],
  sitemap: Set<string> | null,
  stats: Map<string, GscQueryStat> | null,
  baseline: Map<string, GscQueryStat> | null,
  report: StrategyReport,
  checkedAt: string
): Promise<PlanCheck> {
  const path = slugPath(page.slug);
  const res = await get(`${origin}${path}`);
  const httpStatus = res ? res.status : null;
  const contentType = res?.headers.get("content-type") ?? "";
  const shipped = Boolean(res && res.status === 200 && /html/i.test(contentType));
  const finalUrl = res?.url || null;

  let indexable: boolean | null = null;
  let indexableReason: string | null = null;
  let titleHasHead: boolean | null = null;
  let hasFaqSchema: boolean | null = null;
  let pageTitle: string | null = null;
  if (shipped && res) {
    const html = (await res.text()).slice(0, 1_500_000);
    const verdict = indexability(html, res.headers.get("x-robots-tag"), finalUrl ?? `${origin}${path}`);
    indexable = verdict.indexable;
    indexableReason = verdict.reason;
    pageTitle = decodeEntities(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, " ").trim());
    titleHasHead = titleHasHeadKeyword(pageTitle, page.headKeyword);
    if ((page.faq?.length ?? 0) >= 2) hasFaqSchema = hasFaqPageSchema(html);
  } else {
    await res?.body?.cancel().catch(() => {});
  }

  let inSitemap: boolean | null = null;
  if (sitemap) {
    const candidates = [normPath(path)];
    if (finalUrl) {
      try {
        candidates.push(normPath(new URL(finalUrl).pathname));
      } catch {
        /* ignore */
      }
    }
    inSitemap = candidates.some((c) => sitemap.has(c));
  }

  const queries = measuredQueries(page);
  return {
    slug: page.slug,
    action: page.action,
    checkedAt,
    shipped,
    finalUrl,
    httpStatus,
    inSitemap,
    indexable,
    titleHasHead,
    hasFaqSchema,
    ...gscFor(queries, stats),
    baselineImpressions7d: baselineFor(queries, report, baseline),
    auditIssues: shipped ? await staticAuditIssues(finalUrl ?? `${origin}${path}`) : null,
    indexableReason,
    pageTitle,
  };
}

/* Static-only single-page audit of a shipped page. Never fatal: an audit
   failure leaves auditIssues null ("not audited"), not an empty list. */
async function staticAuditIssues(url: string): Promise<PlanCheck["auditIssues"]> {
  try {
    const report = await auditSite(url, { maxPages: 1, staticOnly: true });
    // The strategy's own audit rendered pages in a browser; this pass reads
    // raw HTML. Categories judged from the rendered DOM (content volume,
    // mobile usability, speed, images) would show "new" issues on any
    // client-rendered page that were never real — keep the static-reliable
    // ones only.
    const renderDependent = new Set(["content", "mobile", "performance", "images"]);
    return report.findings
      .filter((f) => f.severity !== "info" && !renderDependent.has(f.category))
      .slice(0, 10)
      .map(({ severity, label, issue, fix }) => ({ severity, label, issue, fix }));
  } catch (err) {
    console.warn(`[plan]   audit of ${url} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* DB mapping                                                               */
/* ------------------------------------------------------------------------ */

interface PlanCheckRow {
  slug: string;
  action: "create" | "update";
  checked_at: string;
  shipped: boolean;
  final_url: string | null;
  http_status: number | null;
  in_sitemap: boolean | null;
  indexable: boolean | null;
  title_has_head: boolean | null;
  has_faq_schema: boolean | null;
  impressions_7d: number | null;
  clicks_7d: number | null;
  avg_position: number | string | null;
  baseline_impressions_7d: number | null;
  audit_issues: PlanCheck["auditIssues"];
}

const toRow = (jobId: string, c: PlanCheck) => ({
  strategy_job_id: jobId,
  slug: c.slug,
  action: c.action,
  checked_at: c.checkedAt,
  shipped: c.shipped,
  final_url: c.finalUrl,
  http_status: c.httpStatus,
  in_sitemap: c.inSitemap,
  indexable: c.indexable,
  title_has_head: c.titleHasHead,
  has_faq_schema: c.hasFaqSchema,
  impressions_7d: c.impressions7d,
  clicks_7d: c.clicks7d,
  avg_position: c.avgPosition,
  baseline_impressions_7d: c.baselineImpressions7d,
  audit_issues: c.auditIssues,
});

const fromRow = (r: PlanCheckRow): PlanCheck => ({
  slug: r.slug,
  action: r.action,
  checkedAt: r.checked_at,
  shipped: r.shipped,
  finalUrl: r.final_url,
  httpStatus: r.http_status,
  inSitemap: r.in_sitemap,
  indexable: r.indexable,
  titleHasHead: r.title_has_head,
  hasFaqSchema: r.has_faq_schema,
  impressions7d: r.impressions_7d,
  clicks7d: r.clicks_7d,
  avgPosition: r.avg_position === null ? null : Number(r.avg_position), // numeric arrives as string
  baselineImpressions7d: r.baseline_impressions_7d,
  auditIssues: r.audit_issues,
});

/* ------------------------------------------------------------------------ */
/* Idle-time pass                                                           */
/* ------------------------------------------------------------------------ */

interface JobRef {
  id: string;
  url: string;
  finished_at: string | null;
}

/* The latest done strategy per host whose last plan check is older than
   SEO_PLAN_CHECK_DAYS (or never ran). Lightweight: no report blobs. */
async function findDueJob(now: number): Promise<JobRef | null> {
  const { data: jobs, error } = await db
    .from("seo_strategy_jobs")
    .select("id, url, finished_at")
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const latestPerHost = new Map<string, JobRef>();
  for (const j of (jobs ?? []) as JobRef[]) {
    const h = hostOf(j.url);
    if (!latestPerHost.has(h)) latestPerHost.set(h, j);
  }
  const candidates = [...latestPerHost.values()];
  if (candidates.length === 0) return null;

  const { data: checks, error: checksError } = await db
    .from("seo_plan_checks")
    .select("strategy_job_id, checked_at")
    .in(
      "strategy_job_id",
      candidates.map((c) => c.id)
    )
    .order("checked_at", { ascending: false })
    .limit(2000);
  if (checksError) throw checksError;
  const lastCheck = new Map<string, string>();
  for (const c of (checks ?? []) as Array<{ strategy_job_id: string; checked_at: string }>) {
    if (!lastCheck.has(c.strategy_job_id)) lastCheck.set(c.strategy_job_id, c.checked_at);
  }
  const dueAfter = config.seoPlanCheckDays * 86_400_000;
  return (
    candidates.find((c) => {
      if (noPlan.has(c.id)) return false;
      const last = lastCheck.get(c.id);
      return !last || now - new Date(last).getTime() > dueAfter;
    }) ?? null
  );
}

export async function runDuePlanChecks(): Promise<void> {
  if (tablesMissing || config.mockMode) return;
  const now = Date.now();
  if (now - lastAttempt < ATTEMPT_EVERY_MS) return;
  lastAttempt = now;

  try {
    const job = await findDueJob(now);
    if (!job) return;
    await checkStrategyPlan(job);
  } catch (err) {
    if (isMissingTable(err)) return noteMissingTables();
    throw err instanceof Error ? err : new Error(errMessage(err));
  }
}

async function checkStrategyPlan(job: JobRef): Promise<void> {
  const { data, error } = await db.from("seo_strategy_jobs").select("report").eq("id", job.id).single();
  if (error) throw error;
  const report = (data as { report: StrategyReport | null }).report;
  if (!report?.pages?.length) {
    console.log(`[plan] ${job.url} — strategy ${job.id} has no page plan, skipping`);
    // Nothing to measure — remember it so it can't pin this host (and
    // starve the others) on every hourly attempt.
    noPlan.add(job.id);
    return;
  }
  const host = report.host || hostOf(job.url);
  let origin: string;
  try {
    origin = new URL(report.url || job.url).origin;
  } catch {
    origin = `https://${host}`;
  }
  console.log(`[plan] weekly plan check for ${host} — ${report.pages.length} planned page(s) (strategy ${job.id})`);

  // Two Search Console calls for every page's measured queries: this week,
  // and the week the strategy ran (the baseline).
  let stats: Map<string, GscQueryStat> | null = null;
  let baseline: Map<string, GscQueryStat> | null = null;
  if (gscConfigured()) {
    const measured = report.pages.flatMap(measuredQueries);
    try {
      stats = await fetchGscQueryStats(host, measured, 7);
    } catch (err) {
      console.warn("[plan]   Search Console lookup failed — movement unknown this pass:", err instanceof Error ? err.message : err);
    }
    if (stats) {
      try {
        const ranAt = new Date(report.fetchedAt);
        if (Number.isFinite(ranAt.getTime())) baseline = await fetchGscQueryStats(host, measured, 7, ranAt);
      } catch (err) {
        console.warn("[plan]   Search Console baseline lookup failed — using the report's stored rows:", err instanceof Error ? err.message : err);
      }
    }
  }

  const sitemap = await loadSitemapPaths(origin).catch(() => null);
  const checkedAt = new Date().toISOString();
  const checks: PlanCheck[] = [];
  for (const page of report.pages) {
    const c = await checkPage(origin, page, sitemap, stats, baseline, report, checkedAt);
    checks.push(c);
    const flags = [
      c.shipped ? "shipped" : `NOT shipped (${c.httpStatus ?? "unreachable"})`,
      c.indexable === false ? `noindex: ${c.indexableReason}` : null,
      c.inSitemap === false ? "not in sitemap" : null,
      c.titleHasHead === false ? "title misses head keyword" : null,
      c.hasFaqSchema === false ? "no FAQPage schema" : null,
      c.impressions7d !== null ? `${c.impressions7d} impr/7d (baseline ${c.baselineImpressions7d ?? "—"})` : null,
    ].filter(Boolean);
    console.log(`[plan]   ${slugPath(page.slug)} — ${flags.join(", ")}`);
    await sleep(800);
  }

  // Previous pass, for position movement — read BEFORE inserting this one.
  const { data: prevData, error: prevError } = await db
    .from("seo_plan_checks")
    .select(
      "slug, action, checked_at, shipped, final_url, http_status, in_sitemap, indexable, title_has_head, has_faq_schema, impressions_7d, clicks_7d, avg_position, baseline_impressions_7d, audit_issues"
    )
    .eq("strategy_job_id", job.id)
    .order("checked_at", { ascending: false })
    .limit(500);
  if (prevError) throw prevError;
  const previous: PlanCheck[] = [];
  const seenSlug = new Set<string>();
  for (const r of (prevData ?? []) as PlanCheckRow[]) {
    if (seenSlug.has(r.slug)) continue;
    seenSlug.add(r.slug);
    previous.push(fromRow(r));
  }

  const { error: insertError } = await db.from("seo_plan_checks").insert(checks.map((c) => toRow(job.id, c)));
  if (insertError) throw insertError;

  const shipped = checks.filter((c) => c.shipped).length;
  console.log(`[plan] ${host} done — ${shipped}/${checks.length} shipped${sitemap ? "" : " (no sitemap found)"}${stats ? "" : " (no GSC)"}`);

  const followup = composeFollowup(report, checks, previous, {
    jobId: job.id,
    finishedAt: job.finished_at,
    graceDays: config.seoFollowupGraceDays,
  });
  if (!followup) {
    console.log(`[plan] ${host} — nothing actionable, no follow-up written`);
    return;
  }
  const { data: last, error: lastError } = await db
    .from("seo_strategy_followups")
    .select("fingerprint")
    .eq("strategy_job_id", job.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
  if (last?.fingerprint === followup.fingerprint) {
    console.log(`[plan] ${host} — findings unchanged since the last follow-up, not writing a new one`);
    return;
  }
  const { error: fuError } = await db.from("seo_strategy_followups").insert({
    strategy_job_id: job.id,
    summary: followup.summary,
    prompt: followup.prompt,
    fingerprint: followup.fingerprint,
  });
  if (fuError) throw fuError;
  console.log(
    `[plan] ${host} — follow-up prompt written (${followup.summary.sections.map((s) => `${s.id}: ${s.slugs.length}`).join(", ")})`
  );
}
