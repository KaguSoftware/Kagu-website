import { config } from "./config.js";

/*
  speed.ts — full Lighthouse insights via Google's PageSpeed Insights API v5.

  This is the exact engine behind pagespeed.web.dev: each call runs Lighthouse
  on Google's own infrastructure (a real throttled load, not our machine's
  network) and, when the site has enough Chrome traffic, attaches CrUX field
  data — the real-user Core Web Vitals that actually feed Google's ranking
  signal. One report per strategy (mobile / desktop), each with:

    - all four Lighthouse scores (0–100): performance, accessibility,
      best practices, SEO
    - lab metrics: FCP, LCP, TBT, CLS, Speed Index, TTFB
    - field data (28-day CrUX): LCP, INP, CLS, FCP, TTFB percentiles with
      Google's own good / needs-improvement / poor grading, page-level when
      available, origin-level as fallback
    - opportunities: every failed performance audit with estimated ms/bytes
      savings and the top offending resources (the "ways to speed it up")
    - diagnostics: the LCP element, layout-shift culprits, main-thread and
      third-party cost — context that explains WHERE the time goes
    - findings: every failed accessibility / best-practices / SEO audit with
      the exact offending elements, so each one is directly fixable

  Lighthouse is noisy — back-to-back runs of the same page can swing the
  performance score by ±10 (network jitter, server variance, throttling
  simulation). So each strategy is run SEO_SPEED_RUNS times (default 3,
  `--runs` overrides; use odd counts) and judged by the median: category
  scores and lab metrics are per-item medians across runs (with the observed
  min–max spread kept), while opportunities / diagnostics / findings / field
  data come from the representative run — the one with the median performance
  score — so that evidence stays internally consistent.

  The API is free. Anonymous calls work for occasional use but are rate
  limited per IP; set PSI_API_KEY (a plain Google Cloud API key with the
  "PageSpeed Insights API" enabled — no OAuth, no service account) to get
  25k requests/day. Like seo.ts/audit.ts this is a standalone tool (run via
  `npm run seo:speed`) — it writes nothing to the DB and needs no Supabase
  creds.
*/

/* ------------------------------------------------------------------------ */
/* Report types                                                             */
/* ------------------------------------------------------------------------ */

export type Strategy = "mobile" | "desktop";

export type MetricGrade = "good" | "needs-improvement" | "poor";

export type CategoryId = "performance" | "accessibility" | "best-practices" | "seo";

export interface CategoryScore {
  id: CategoryId;
  label: string;
  score: number;
}

/** A failed audit in a non-performance category, with its exact culprits. */
export interface Finding {
  id: string;
  title: string;
  description: string;
  displayValue: string;
  /** How much this audit counts toward its category score. */
  weight: number;
  items: string[];
}

export interface CategoryFindings {
  id: CategoryId;
  label: string;
  score: number;
  findings: Finding[];
}

export interface LabMetric {
  id: string;
  label: string;
  /** ms for timings, unitless for CLS. Median across runs when runs > 1. */
  value: number;
  display: string;
  grade: MetricGrade;
  /** Observed spread across runs (absent on single-run reports). */
  min?: number;
  max?: number;
}

export interface FieldMetric {
  id: string;
  label: string;
  /** p75 — ms for timings, unitless for CLS */
  percentile: number;
  display: string;
  grade: MetricGrade;
}

export interface Opportunity {
  id: string;
  title: string;
  /** Estimated main-metric savings if fixed. Either may be 0. */
  savingsMs: number;
  savingsBytes: number;
  description: string;
  /** Top offending resources/elements — url or selector + wasted amount. */
  items: string[];
}

export interface Diagnostic {
  id: string;
  title: string;
  display: string;
  items: string[];
}

export interface StrategyReport {
  strategy: Strategy;
  /** How many Lighthouse runs this report is the median of. */
  runs: number;
  /** Performance score of every run, in run order. */
  runScores: number[];
  /** All four Lighthouse scores, 0–100, in PERFORMANCE..SEO order.
   *  Per-category medians across runs. */
  scores: CategoryScore[];
  /** Median performance score, 0–100 (also present in `scores`). */
  score: number;
  lab: LabMetric[];
  /** null = site has too little Chrome traffic for CrUX. */
  field: { source: "page" | "origin"; overall: MetricGrade | null; metrics: FieldMetric[] } | null;
  opportunities: Opportunity[];
  diagnostics: Diagnostic[];
  /** Failed accessibility / best-practices / SEO audits, worst first. */
  categories: CategoryFindings[];
  lighthouseVersion: string;
}

export interface SpeedReport {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  reports: StrategyReport[];
}

/* ------------------------------------------------------------------------ */
/* PSI response shape (only the parts we read)                              */
/* ------------------------------------------------------------------------ */

interface PsiAuditItem {
  url?: string;
  source?: { url?: string };
  node?: { selector?: string; nodeLabel?: string };
  entity?: string;
  wastedMs?: number;
  wastedBytes?: number;
  totalBytes?: number;
  transferSize?: number;
  blockingTime?: number;
  mainThreadTime?: number;
  duration?: number;
  score?: number;
  [key: string]: unknown;
}

interface PsiAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number;
  displayValue?: string;
  metricSavings?: Record<string, number>;
  details?: {
    type?: string;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
    items?: PsiAuditItem[];
  };
}

interface PsiCategory {
  title?: string;
  score?: number | null;
  auditRefs?: { id?: string; weight?: number }[];
}

interface PsiCruxMetric {
  percentile?: number;
  category?: "FAST" | "AVERAGE" | "SLOW";
}

interface PsiLoadingExperience {
  metrics?: Record<string, PsiCruxMetric>;
  overall_category?: "FAST" | "AVERAGE" | "SLOW";
  origin_fallback?: boolean;
}

interface PsiResponse {
  lighthouseResult?: {
    finalDisplayedUrl?: string;
    finalUrl?: string;
    lighthouseVersion?: string;
    categories?: Partial<Record<CategoryId, PsiCategory>>;
    audits?: Record<string, PsiAudit>;
  };
  loadingExperience?: PsiLoadingExperience;
  originLoadingExperience?: PsiLoadingExperience;
  error?: { message?: string };
}

const CATEGORY_ORDER: { id: CategoryId; label: string; param: string }[] = [
  { id: "performance", label: "Performance", param: "PERFORMANCE" },
  { id: "accessibility", label: "Accessibility", param: "ACCESSIBILITY" },
  { id: "best-practices", label: "Best Practices", param: "BEST_PRACTICES" },
  { id: "seo", label: "SEO", param: "SEO" },
];

/* ------------------------------------------------------------------------ */
/* Metric definitions — Google's official good / poor thresholds            */
/* ------------------------------------------------------------------------ */

const LAB_METRICS: { id: string; label: string; good: number; poor: number }[] = [
  { id: "first-contentful-paint", label: "First Contentful Paint", good: 1800, poor: 3000 },
  { id: "largest-contentful-paint", label: "Largest Contentful Paint", good: 2500, poor: 4000 },
  { id: "total-blocking-time", label: "Total Blocking Time", good: 200, poor: 600 },
  { id: "cumulative-layout-shift", label: "Cumulative Layout Shift", good: 0.1, poor: 0.25 },
  { id: "speed-index", label: "Speed Index", good: 3400, poor: 5800 },
  { id: "server-response-time", label: "Time to First Byte", good: 800, poor: 1800 },
];

const FIELD_METRICS: { key: string; label: string; good: number; poor: number; cls?: boolean }[] = [
  { key: "LARGEST_CONTENTFUL_PAINT_MS", label: "LCP", good: 2500, poor: 4000 },
  { key: "INTERACTION_TO_NEXT_PAINT", label: "INP", good: 200, poor: 500 },
  // CrUX reports CLS ×100 (e.g. 5 = 0.05)
  { key: "CUMULATIVE_LAYOUT_SHIFT_SCORE", label: "CLS", good: 10, poor: 25, cls: true },
  { key: "FIRST_CONTENTFUL_PAINT_MS", label: "FCP", good: 1800, poor: 3000 },
  { key: "EXPERIMENTAL_TIME_TO_FIRST_BYTE", label: "TTFB", good: 800, poor: 1800 },
];

/* Informational audits worth surfacing even without a ms/bytes saving —
   they say WHERE the time goes rather than what to delete. */
const DIAGNOSTIC_IDS = [
  "largest-contentful-paint-element",
  "layout-shifts",
  "layout-shift-elements",
  "mainthread-work-breakdown",
  "bootup-time",
  "third-party-summary",
  "dom-size",
  "total-byte-weight",
  "network-server-latency",
  "critical-request-chains",
  "font-display",
  "lcp-lazy-loaded",
];

/* ------------------------------------------------------------------------ */
/* Fetch + parse                                                            */
/* ------------------------------------------------------------------------ */

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function runSpeedInsights(
  rawUrl: string,
  strategies: Strategy[] = ["mobile", "desktop"],
  runs?: number
): Promise<SpeedReport> {
  const url = normalizeUrl(rawUrl);
  const runCount = clampRuns(runs ?? config.seoSpeedRuns);
  const reports: StrategyReport[] = [];
  let finalUrl = url;

  // Sequential on purpose: two parallel anonymous calls trip the per-IP
  // burst limit far more often than back-to-back ones.
  for (const strategy of strategies) {
    const parsed: StrategyReport[] = [];
    let firstError: unknown;
    for (let i = 1; i <= runCount; i++) {
      try {
        const psi = await fetchPsi(url, strategy, i, runCount);
        finalUrl =
          psi.lighthouseResult?.finalDisplayedUrl ?? psi.lighthouseResult?.finalUrl ?? finalUrl;
        parsed.push(parseStrategy(psi, strategy));
      } catch (err) {
        // A failed run (quota blip, timeout) shrinks the sample instead of
        // sinking the report — unless every run failed.
        firstError ??= err;
        console.log(
          `[speed] ${strategy} run ${i}/${runCount} failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }
    if (parsed.length === 0) {
      throw firstError instanceof Error
        ? firstError
        : new Error(`all ${runCount} ${strategy} runs failed`);
    }
    if (parsed.length < runCount) {
      console.log(`[speed] ${strategy}: judging by ${parsed.length} of ${runCount} runs`);
    }
    reports.push(mergeRuns(parsed));
  }

  return { url, finalUrl, fetchedAt: new Date().toISOString(), reports };
}

function clampRuns(n: number): number {
  return Math.max(1, Math.min(9, Math.round(n) || 1));
}

async function fetchPsi(
  url: string,
  strategy: Strategy,
  run: number,
  runCount: number
): Promise<PsiResponse> {
  const params = new URLSearchParams({ url, strategy });
  for (const cat of CATEGORY_ORDER) params.append("category", cat.param);
  if (config.psiApiKey) params.set("key", config.psiApiKey);

  const runLabel = runCount > 1 ? `, run ${run}/${runCount}` : "";
  console.log(`[speed] running Lighthouse (${strategy}${runLabel}) on Google's infra — ~30s…`);
  const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(120_000),
  });

  const body = (await res.json().catch(() => ({}))) as PsiResponse;
  if (!res.ok) {
    const detail = body.error?.message ?? `HTTP ${res.status}`;
    const hint =
      res.status === 429
        ? " (anonymous per-IP quota hit — set PSI_API_KEY in worker/.env, or wait a minute)"
        : "";
    throw new Error(`PageSpeed API failed for ${strategy}: ${detail}${hint}`);
  }
  if (!body.lighthouseResult) {
    throw new Error(`PageSpeed API returned no Lighthouse result for ${strategy}`);
  }
  return body;
}

function parseStrategy(psi: PsiResponse, strategy: Strategy): StrategyReport {
  const lhr = psi.lighthouseResult!;
  const audits = lhr.audits ?? {};

  const scores: CategoryScore[] = [];
  for (const cat of CATEGORY_ORDER) {
    const c = lhr.categories?.[cat.id];
    if (typeof c?.score !== "number") continue;
    scores.push({ id: cat.id, label: cat.label, score: Math.round(c.score * 100) });
  }
  const score = scores.find((s) => s.id === "performance")?.score ?? 0;

  const lab: LabMetric[] = [];
  for (const def of LAB_METRICS) {
    const a = audits[def.id];
    if (!a || typeof a.numericValue !== "number") continue;
    lab.push({
      id: def.id,
      label: def.label,
      value: a.numericValue,
      display: a.displayValue ?? formatMs(a.numericValue),
      grade: gradeOf(a.numericValue, def.good, def.poor),
    });
  }

  return {
    strategy,
    runs: 1,
    runScores: [score],
    scores,
    score,
    lab,
    field: parseField(psi),
    opportunities: parseOpportunities(audits),
    diagnostics: parseDiagnostics(audits),
    categories: parseCategoryFindings(lhr.categories, audits),
    lighthouseVersion: lhr.lighthouseVersion ?? "?",
  };
}

/* Judge by the median. Category scores and lab metrics become per-item
   medians across runs (a metric absent from some runs uses the runs that
   have it); everything evidential — opportunities, diagnostics, findings,
   field data — comes from the representative run (median performance score,
   lower-middle on even counts) so its numbers stay internally consistent. */
function mergeRuns(runs: StrategyReport[]): StrategyReport {
  if (runs.length === 1) return runs[0];

  const byScore = [...runs].sort((a, b) => a.score - b.score);
  const rep = byScore[Math.floor((byScore.length - 1) / 2)];

  const scores: CategoryScore[] = rep.scores.map((c) => ({
    ...c,
    score: Math.round(
      median(runs.flatMap((r) => r.scores.filter((s) => s.id === c.id).map((s) => s.score)))
    ),
  }));

  const lab: LabMetric[] = rep.lab.map((m) => {
    const def = LAB_METRICS.find((d) => d.id === m.id);
    const values = runs.flatMap((r) => r.lab.filter((x) => x.id === m.id).map((x) => x.value));
    const mid = median(values);
    return {
      ...m,
      value: mid,
      display: formatMetric(m.id, mid),
      grade: def ? gradeOf(mid, def.good, def.poor) : m.grade,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });

  return {
    ...rep,
    runs: runs.length,
    runScores: runs.map((r) => r.score),
    scores,
    score: scores.find((s) => s.id === "performance")?.score ?? rep.score,
    lab,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Failed audits per non-performance category — each one a concrete fix. */
function parseCategoryFindings(
  categories: Partial<Record<CategoryId, PsiCategory>> | undefined,
  audits: Record<string, PsiAudit>
): CategoryFindings[] {
  const out: CategoryFindings[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (cat.id === "performance") continue; // covered by opportunities/diagnostics
    const c = categories?.[cat.id];
    if (!c) continue;

    const findings: Finding[] = [];
    for (const ref of c.auditRefs ?? []) {
      const a = ref.id ? audits[ref.id] : undefined;
      if (!a) continue;
      // Binary/numeric audits that failed. Manual, notApplicable and
      // informative audits have score null and are review items, not failures.
      if (a.score === null || a.score === undefined || a.score >= 1) continue;
      findings.push({
        id: ref.id!,
        title: a.title ?? ref.id!,
        description: cleanDescription(a.description),
        displayValue: a.displayValue ?? "",
        weight: ref.weight ?? 0,
        items: itemLabels(a.details?.items ?? [], 8),
      });
    }
    // Heaviest-weighted (biggest score impact) first, worst score breaks ties.
    findings.sort((x, y) => y.weight - x.weight);
    out.push({
      id: cat.id,
      label: cat.label,
      score: Math.round((c.score ?? 0) * 100),
      findings,
    });
  }
  return out;
}

function parseField(psi: PsiResponse): StrategyReport["field"] {
  // Page-level CrUX first; low-traffic pages fall back to origin-level.
  const page = psi.loadingExperience;
  const origin = psi.originLoadingExperience;
  const chosen = page?.metrics && Object.keys(page.metrics).length > 0 && !page.origin_fallback ? page : origin;
  if (!chosen?.metrics || Object.keys(chosen.metrics).length === 0) return null;

  const metrics: FieldMetric[] = [];
  for (const def of FIELD_METRICS) {
    const m = chosen.metrics[def.key];
    if (!m || typeof m.percentile !== "number") continue;
    const value = def.cls ? m.percentile / 100 : m.percentile;
    metrics.push({
      id: def.key,
      label: def.label,
      percentile: value,
      display: def.cls ? value.toFixed(2) : formatMs(m.percentile),
      grade: cruxGrade(m.category) ?? gradeOf(m.percentile, def.good, def.poor),
    });
  }
  if (metrics.length === 0) return null;

  return {
    source: chosen === page ? "page" : "origin",
    overall: cruxGrade(chosen.overall_category),
    metrics,
  };
}

function parseOpportunities(audits: Record<string, PsiAudit>): Opportunity[] {
  const out: Opportunity[] = [];
  for (const [id, a] of Object.entries(audits)) {
    if (a.score === null || a.score === undefined || a.score >= 1) continue;
    const savingsMs = Math.round(
      a.details?.overallSavingsMs ?? Math.max(0, ...Object.values(a.metricSavings ?? { _: 0 }))
    );
    const savingsBytes = Math.round(a.details?.overallSavingsBytes ?? 0);
    if (savingsMs <= 0 && savingsBytes <= 0) continue;
    out.push({
      id,
      title: a.title ?? id,
      savingsMs,
      savingsBytes,
      description: cleanDescription(a.description),
      items: itemLabels(a.details?.items ?? []),
    });
  }
  // Biggest wins first — ms savings dominate, bytes break ties.
  return out.sort((x, y) => y.savingsMs - x.savingsMs || y.savingsBytes - x.savingsBytes);
}

function parseDiagnostics(audits: Record<string, PsiAudit>): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const id of DIAGNOSTIC_IDS) {
    const a = audits[id];
    if (!a) continue;
    const items = itemLabels(a.details?.items ?? []);
    // Skip clean passes with nothing to show — diagnostics earn their place
    // by naming a culprit.
    if (!a.displayValue && items.length === 0) continue;
    if (a.score === 1 && !a.displayValue) continue;
    out.push({ id, title: a.title ?? id, display: a.displayValue ?? "", items });
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function gradeOf(value: number, good: number, poor: number): MetricGrade {
  return value <= good ? "good" : value <= poor ? "needs-improvement" : "poor";
}

function cruxGrade(cat: "FAST" | "AVERAGE" | "SLOW" | undefined): MetricGrade | null {
  return cat === "FAST" ? "good" : cat === "AVERAGE" ? "needs-improvement" : cat === "SLOW" ? "poor" : null;
}

/** PSI descriptions embed markdown links — keep the text, drop the URL. */
function cleanDescription(desc: string | undefined): string {
  return (desc ?? "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
}

function itemLabels(items: PsiAuditItem[], max = 6): string[] {
  const labels: string[] = [];
  for (const item of items.slice(0, max)) {
    const what =
      item.node?.selector ??
      item.node?.nodeLabel ??
      item.entity ??
      shortUrl(item.url ?? item.source?.url);
    if (!what) continue;
    const costs: string[] = [];
    if (typeof item.wastedMs === "number" && item.wastedMs >= 1) costs.push(`${formatMs(item.wastedMs)} wasted`);
    if (typeof item.wastedBytes === "number" && item.wastedBytes > 0) costs.push(`${formatKb(item.wastedBytes)} wasted`);
    if (typeof item.blockingTime === "number" && item.blockingTime >= 1) costs.push(`${formatMs(item.blockingTime)} blocking`);
    if (typeof item.mainThreadTime === "number" && item.mainThreadTime >= 1) costs.push(`${formatMs(item.mainThreadTime)} main-thread`);
    if (costs.length === 0 && typeof item.transferSize === "number" && item.transferSize > 0)
      costs.push(formatKb(item.transferSize));
    if (costs.length === 0 && typeof item.totalBytes === "number" && item.totalBytes > 0)
      costs.push(formatKb(item.totalBytes));
    labels.push(costs.length > 0 ? `${what} (${costs.join(", ")})` : what);
  }
  return labels;
}

function shortUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const path = u.pathname.length > 64 ? `…${u.pathname.slice(-60)}` : u.pathname;
    return `${u.hostname}${path}${u.search ? "?…" : ""}`;
  } catch {
    return url;
  }
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

/** Lab metric formatter — CLS is unitless, everything else is ms. */
export function formatMetric(id: string, value: number): string {
  return id === "cumulative-layout-shift" ? value.toFixed(3) : formatMs(value);
}

export function formatKb(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}
