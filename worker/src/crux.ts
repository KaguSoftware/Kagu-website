import { config } from "./config.js";
import type { MetricGrade, Strategy } from "./speed.js";

/*
  crux.ts — weekly real-user Core Web Vitals via the CrUX History API.

  https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord returns
  up to ~40 collection periods (28-day windows, ending one week apart) of
  field data — the same real-Chrome-user percentiles Google's ranking signal
  reads, but TRENDED. No Lighthouse run, no lab throttling: one HTTP call per
  form factor, near-instant, and on a quota separate from PageSpeed Insights.

  Page-level records need real traffic; low-traffic pages fall back to the
  origin-level record automatically (same behavior as PSI's field block).

  Unlike PSI, the CrUX API accepts no anonymous calls — it needs PSI_API_KEY
  (the same plain Google Cloud API key) with the "Chrome UX Report API"
  enabled on its project.
*/

export type CruxMetricId = "lcp" | "inp" | "cls" | "fcp" | "ttfb";

export const CRUX_METRICS: {
  id: CruxMetricId;
  apiName: string;
  label: string;
  good: number;
  poor: number;
}[] = [
  { id: "lcp", apiName: "largest_contentful_paint", label: "LCP", good: 2500, poor: 4000 },
  { id: "inp", apiName: "interaction_to_next_paint", label: "INP", good: 200, poor: 500 },
  { id: "cls", apiName: "cumulative_layout_shift", label: "CLS", good: 0.1, poor: 0.25 },
  { id: "fcp", apiName: "first_contentful_paint", label: "FCP", good: 1800, poor: 3000 },
  { id: "ttfb", apiName: "experimental_time_to_first_byte", label: "TTFB", good: 800, poor: 1800 },
];

export interface CruxHistoryPoint {
  /** Last day of the 28-day collection period, YYYY-MM-DD. */
  periodEnd: string;
  /** p75 per metric — ms for timings, unitless for CLS. Missing = no data. */
  metrics: Partial<Record<CruxMetricId, number>>;
}

export interface CruxHistory {
  strategy: Strategy;
  /** Whether the record is for the exact page or the whole origin. */
  source: "url" | "origin";
  /** Oldest → newest. */
  points: CruxHistoryPoint[];
}

/* --------------------------------------------------------------------- */
/* API response shape (only the parts we read)                           */
/* --------------------------------------------------------------------- */

interface CruxDate {
  year?: number;
  month?: number;
  day?: number;
}

interface CruxApiResponse {
  record?: {
    collectionPeriods?: { firstDate?: CruxDate; lastDate?: CruxDate }[];
    metrics?: Record<
      string,
      { percentilesTimeseries?: { p75s?: Array<number | string | null> } }
    >;
  };
  error?: { code?: number; message?: string };
}

const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord";

/*
  History for one URL and strategy: page-level record first, origin-level
  fallback. Returns null when CrUX has no data at either level (too little
  Chrome traffic). Throws on missing key / quota / malformed responses.
*/
export async function fetchCruxHistory(
  rawUrl: string,
  strategy: Strategy,
  weeks = 40
): Promise<CruxHistory | null> {
  if (!config.psiApiKey) {
    throw new Error(
      "CrUX History API needs an API key — set PSI_API_KEY in worker/.env and enable " +
        '"Chrome UX Report API" on its Google Cloud project (same console page as PageSpeed Insights API)'
    );
  }

  const url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const origin = new URL(url).origin;
  const formFactor = strategy === "mobile" ? "PHONE" : "DESKTOP";
  const count = Math.max(1, Math.min(40, Math.round(weeks)));

  const page = await queryHistory({ url }, formFactor, count);
  if (page) return { strategy, source: "url", points: page };

  const site = await queryHistory({ origin }, formFactor, count);
  if (site) return { strategy, source: "origin", points: site };
  return null;
}

async function queryHistory(
  key: { url: string } | { origin: string },
  formFactor: "PHONE" | "DESKTOP",
  collectionPeriodCount: number
): Promise<CruxHistoryPoint[] | null> {
  const res = await fetch(`${CRUX_ENDPOINT}?key=${encodeURIComponent(config.psiApiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...key,
      formFactor,
      collectionPeriodCount,
      metrics: CRUX_METRICS.map((m) => m.apiName),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await res.json().catch(() => ({}))) as CruxApiResponse;
  // 404 = "chrome ux report data not found" — not an error, just no record
  // at this level. Everything else (403 key not enabled, 429 quota) is real.
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = body.error?.message ?? `HTTP ${res.status}`;
    const hint =
      res.status === 403
        ? ' (is "Chrome UX Report API" enabled on the PSI_API_KEY project?)'
        : "";
    throw new Error(`CrUX History API failed: ${detail}${hint}`);
  }

  const periods = body.record?.collectionPeriods ?? [];
  const metrics = body.record?.metrics ?? {};
  if (periods.length === 0) return null;

  const points: CruxHistoryPoint[] = periods.map((p) => ({
    periodEnd: formatCruxDate(p.lastDate),
    metrics: {},
  }));
  for (const def of CRUX_METRICS) {
    const p75s = metrics[def.apiName]?.percentilesTimeseries?.p75s ?? [];
    p75s.forEach((raw, i) => {
      if (raw === null || raw === undefined || !points[i]) return;
      const value = Number(raw); // CLS arrives as a string ("0.05")
      if (Number.isFinite(value)) points[i].metrics[def.id] = value;
    });
  }
  // A period with no metric at all (site fell out of CrUX that week) says
  // nothing — drop it rather than charting a gap as a zero.
  const filled = points.filter((p) => Object.keys(p.metrics).length > 0);
  return filled.length > 0 ? filled : null;
}

function formatCruxDate(d: CruxDate | undefined): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!d?.year) return "?";
  return `${d.year}-${pad(d.month ?? 1)}-${pad(d.day ?? 1)}`;
}

export function cruxGradeOf(id: CruxMetricId, value: number): MetricGrade {
  const def = CRUX_METRICS.find((m) => m.id === id)!;
  return value <= def.good ? "good" : value <= def.poor ? "needs-improvement" : "poor";
}

/** CLS is unitless; everything else is ms. */
export function formatCruxValue(id: CruxMetricId, value: number): string {
  if (id === "cls") return value.toFixed(2);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}
