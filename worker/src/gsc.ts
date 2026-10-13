import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

/*
  gsc.ts — Google Search Console: the site's OWN real search data.

  This is the demand evidence nothing else in the pipeline can provide —
  actual queries the site got impressions for, with clicks and average
  position, straight from Google. The API is free (no paid tier), and this
  uses no client library: the official googleapis SDK is a heavyweight
  dependency for what amounts to one RS256-signed JWT (node:crypto does that
  natively) exchanged for an access token, plus one REST call. Same
  zero-dependency stance as the Groq calls in draft.ts / strategy.ts.

  One-time setup (details in worker/README.md):
    1. Google Cloud Console → any project → enable "Google Search Console API".
    2. Create a service account, download its JSON key to worker/gsc-key.json
       (gitignored) — or point GSC_KEY_FILE somewhere else.
    3. Search Console → your property → Settings → Users and permissions →
       add the service account's email (Restricted permission is enough).

  Degrades gracefully: no key file → null (the strategy tool proceeds without
  GSC evidence); API errors throw with the likely fix in the message.
*/

export interface GscRow {
  query: string;
  topPage: string; // the page that carried most impressions for this query
  clicks: number;
  impressions: number;
  position: number; // impression-weighted average across pages
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function loadKey(): ServiceAccountKey | null {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const path = config.gscKeyFile
    ? isAbsolute(config.gscKeyFile)
      ? config.gscKeyFile
      : join(root, config.gscKeyFile)
    : join(root, "gsc-key.json");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null; // not configured — caller skips GSC evidence
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccountKey>;
    if (typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
      return { client_email: parsed.client_email, private_key: parsed.private_key };
    }
  } catch {
    /* fall through */
  }
  console.warn(`[gsc] ${path} is not a service-account key (needs client_email + private_key) — skipping GSC`);
  return null;
}

const b64url = (s: string) => Buffer.from(s).toString("base64url");

/* Service-account OAuth: sign a JWT with the key, trade it for a one-hour
   access token. This IS the whole "library". */
async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) +
    "." +
    b64url(
      JSON.stringify({
        iss: key.client_email,
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    );
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(key.private_key).toString("base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`GSC token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("GSC token exchange returned no access_token");
  return data.access_token;
}

/* One Search Analytics call over the last `days` (ending 2 days ago — GSC
   data lags), split by query × page, aggregated per query: volume summed,
   position impression-weighted, the strongest page kept. Shared by the
   strategy's 90-day evidence pull and the weekly measurement loop. Returns
   null when GSC isn't configured. */
/* GSC_SITE_URL names ONE property (for a URL-prefix property). It must only
   ever stand in for its own host: the worker tracks many hosts, and sending a
   client's keywords to Kagu's property would store Kagu's positions as
   theirs. Any other host gets its domain property. */
function propertyFor(host: string): string {
  const configured = config.gscSiteUrl;
  if (configured) {
    const h = configured.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    if (h === host || host.endsWith(`.${h}`)) return configured;
  }
  return `sc-domain:${host}`;
}

async function querySearchAnalytics(
  host: string,
  days: number,
  rowLimit: number,
  endAt?: Date
): Promise<GscRow[] | null> {
  const key = loadKey();
  if (!key) return null;

  const property = propertyFor(host);
  const token = await getAccessToken(key);

  // GSC data lags ~2 days; `endAt` asks for a historical window (the
  // plan-check baseline — "the 7 days before the strategy ran").
  const end = new Date(Math.min(Date.now() - 2 * 86_400_000, endAt?.getTime() ?? Infinity));
  const start = new Date(end.getTime() - days * 86_400_000);
  const day = (d: Date) => d.toISOString().slice(0, 10);

  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        startDate: day(start),
        endDate: day(end),
        dimensions: ["query", "page"],
        rowLimit,
      }),
      signal: AbortSignal.timeout(20000),
    }
  );
  if (res.status === 403) {
    throw new Error(
      `Search Console denied access to "${property}" — add ${key.client_email} under the property's Users and permissions.`
    );
  }
  if (res.status === 404) {
    throw new Error(
      `Search Console property "${property}" not found — set GSC_SITE_URL to your exact property ("sc-domain:example.com" or "https://example.com/").`
    );
  }
  if (!res.ok) {
    throw new Error(`Search Console query failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; position?: number }>;
  };
  return aggregateByQuery(data.rows ?? []);
}

/* Exported for tests: fold query × page rows into one row per query. */
export function aggregateByQuery(
  rows: Array<{ keys?: string[]; clicks?: number; impressions?: number; position?: number }>
): GscRow[] {
  interface Agg extends GscRow {
    posWeight: number;
    topPageImpressions: number;
  }
  const byQuery = new Map<string, Agg>();
  for (const row of rows) {
    const query = row.keys?.[0]?.trim();
    if (!query) continue;
    const impressions = row.impressions ?? 0;
    let agg = byQuery.get(query);
    if (!agg) {
      agg = {
        query,
        topPage: "",
        clicks: 0,
        impressions: 0,
        position: 0,
        posWeight: 0,
        topPageImpressions: -1,
      };
      byQuery.set(query, agg);
    }
    agg.clicks += row.clicks ?? 0;
    agg.impressions += impressions;
    agg.posWeight += (row.position ?? 0) * impressions;
    if (impressions > agg.topPageImpressions) {
      agg.topPageImpressions = impressions;
      agg.topPage = row.keys?.[1] ?? "";
    }
  }

  return [...byQuery.values()]
    .map(({ posWeight, topPageImpressions: _t, ...r }) => ({
      ...r,
      position: r.impressions > 0 ? Math.round((posWeight / r.impressions) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

/* The site's real queries over the last `days`, aggregated per query (the
   API splits by page; we sum volume, impression-weight the position, and
   keep the strongest page). Returns null when GSC isn't configured. */
export async function fetchGscQueries(host: string, days = 90): Promise<GscRow[] | null> {
  const rows = await querySearchAnalytics(host, days, 500);
  return rows ? rows.slice(0, 250) : null;
}

/* Query identity for matching planned keywords to GSC rows: trim, lowercase,
   collapse whitespace, and drop the combining dot (U+0307) that lowercasing
   Turkish "İ" inserts — same normalisation seo.ts's tokenize applies. */
export function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/\u0307/g, "").replace(/\s+/g, " ").trim();
}

export interface GscQueryStat {
  position: number;
  impressions: number;
  clicks: number;
  topPage: string;
}

/*
  Measurement-loop lookup: last `days` of GSC data (one call, up to 5000
  query × page rows) for exactly the requested queries, matched by
  normalised equality. Keyed by the REQUESTED query string as passed in;
  queries with no impressions in the window are simply absent from the map.
  Returns null when GSC isn't configured; API errors throw.
*/
export async function fetchGscQueryStats(
  host: string,
  queries: string[],
  days = 7,
  endAt?: Date
): Promise<Map<string, GscQueryStat> | null> {
  const rows = await querySearchAnalytics(host, days, 5000, endAt);
  if (!rows) return null;
  // rows are impression-sorted, so the first spelling per normalised key wins.
  const byNorm = new Map<string, GscRow>();
  for (const r of rows) {
    const k = normalizeQuery(r.query);
    if (!byNorm.has(k)) byNorm.set(k, r);
  }
  const out = new Map<string, GscQueryStat>();
  for (const q of queries) {
    const r = byNorm.get(normalizeQuery(q));
    if (r) {
      out.set(q, {
        position: r.position,
        impressions: r.impressions,
        clicks: r.clicks,
        topPage: r.topPage,
      });
    }
  }
  return out;
}

/* Whether GSC is configured at all — lets callers skip work (and log the
   right path) without paying for a token exchange. */
export function gscConfigured(): boolean {
  return loadKey() !== null;
}

/* Queries already on page 1–3 but not winning — lifting an existing page a
   few positions is the cheapest traffic in SEO, so these lead the brief. */
export function strikingDistance(rows: GscRow[]): GscRow[] {
  return rows
    .filter((r) => r.position >= 8 && r.position <= 30 && r.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions);
}
