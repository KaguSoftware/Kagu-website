import { runSpeedInsights, type SpeedReport, type Strategy } from "./speed.js";

/*
  speed-site.ts — multi-page sampling for the speed tool.

  One URL isn't the site: the homepage, a case page, and a pricing page have
  completely different performance profiles. `--site N` pulls N URLs from the
  sitemap (same discovery as audit.ts: robots.txt Sitemap lines, then
  /sitemap.xml, with a homepage-link fallback when neither exists), spreads
  the sample across path sections so it isn't ten blog posts, and runs each
  page through PSI. The CLI prints a per-page score table, worst first.

  Each sampled page costs runs × strategies PSI calls (~30s each), so site
  mode defaults to mobile-only single runs — a 6-page sample is ~6 calls.
*/

const UA = "Mozilla/5.0 (compatible; KaguSpeedBot/1.0)";

const SKIP_EXTENSIONS =
  /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|zip|gz|mp4|webm|mp3|woff2?|ttf)$/i;

async function fetchText(url: string, timeoutMs: number, maxBytes: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": UA },
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, maxBytes);
  } catch {
    return null;
  }
}

function allMatches(text: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(re)) out.push(m[1]);
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/* Sitemap URLs: robots.txt Sitemap: lines first, /sitemap.xml as fallback,
   sitemap indexes followed a few children deep. */
async function sitemapLocs(origin: string): Promise<string[]> {
  const candidates: string[] = [];
  const robots = await fetchText(`${origin}/robots.txt`, 10_000, 500_000);
  if (robots) {
    for (const line of robots.split(/\r?\n/)) {
      const m = line.replace(/#.*$/, "").match(/^\s*sitemap\s*:\s*(\S+)/i);
      if (m) candidates.push(m[1]);
    }
  }
  candidates.push(`${origin}/sitemap.xml`);

  for (const candidate of candidates.slice(0, 3)) {
    const xml = await fetchText(candidate, 12_000, 3_000_000);
    if (xml === null) continue;
    const texts = [xml];
    if (/<sitemapindex/i.test(xml)) {
      const children = allMatches(xml, /<loc>\s*([^<\s]+)\s*<\/loc>/gi).slice(0, 4);
      for (const child of children) {
        const childXml = await fetchText(child.trim(), 12_000, 3_000_000);
        if (childXml) texts.push(childXml);
      }
    }
    const locs = texts
      .flatMap((t) => allMatches(t, /<loc>\s*([^<\s]+)\s*<\/loc>/gi))
      .map((l) => decodeEntities(l.trim()))
      .slice(0, 500);
    if (locs.length > 0) return locs;
  }
  return [];
}

/* No sitemap → same-host links off the start page. */
async function homepageLinks(startUrl: string, origin: string): Promise<string[]> {
  const html = await fetchText(startUrl, 15_000, 2_000_000);
  if (!html) return [];
  return allMatches(html, /<a[^>]+href\s*=\s*["']([^"'#]+)["']/gi)
    .map((href) => {
      try {
        return new URL(decodeEntities(href), startUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => u !== null && u.startsWith(origin));
}

/*
  Pick n URLs: the start page always leads, then one URL per path section
  (first segment) round-robin, so the sample covers the site's shape instead
  of drowning in whichever section dominates the sitemap.
*/
export async function discoverSiteUrls(startUrl: string, n: number): Promise<string[]> {
  const start = new URL(/^https?:\/\//i.test(startUrl) ? startUrl : `https://${startUrl}`);
  const origin = start.origin;

  let found = await sitemapLocs(origin);
  if (found.length === 0) found = await homepageLinks(start.toString(), origin);

  const seen = new Set<string>();
  const clean: URL[] = [];
  for (const loc of found) {
    let u: URL;
    try {
      u = new URL(loc);
    } catch {
      continue;
    }
    if (u.origin !== origin) continue;
    if (SKIP_EXTENSIONS.test(u.pathname)) continue;
    u.hash = "";
    const key = u.toString().replace(/\/$/, "");
    if (seen.has(key) || key === start.toString().replace(/\/$/, "")) continue;
    seen.add(key);
    clean.push(u);
  }

  // Group by first path segment, then round-robin across groups.
  const groups = new Map<string, URL[]>();
  for (const u of clean) {
    const section = u.pathname.split("/").filter(Boolean)[0] ?? "/";
    const g = groups.get(section) ?? [];
    g.push(u);
    groups.set(section, g);
  }

  const picked: string[] = [start.toString()];
  const buckets = [...groups.values()];
  for (let round = 0; picked.length < n; round++) {
    let took = false;
    for (const bucket of buckets) {
      if (picked.length >= n) break;
      const u = bucket[round];
      if (!u) continue;
      picked.push(u.toString());
      took = true;
    }
    if (!took) break; // every bucket exhausted
  }
  return picked;
}

export interface SitePageResult {
  url: string;
  report: SpeedReport | null;
  error?: string;
}

/*
  Run PSI on each sampled page sequentially (parallel calls trip the per-IP
  burst limit). A failed page becomes an error row instead of sinking the
  whole sample.
*/
export async function runSiteSample(
  urls: string[],
  strategies: Strategy[],
  runs: number
): Promise<SitePageResult[]> {
  const results: SitePageResult[] = [];
  for (const [i, url] of urls.entries()) {
    console.log(`[speed] page ${i + 1}/${urls.length}: ${url}`);
    try {
      results.push({ url, report: await runSpeedInsights(url, strategies, runs) });
    } catch (err) {
      results.push({ url, report: null, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
