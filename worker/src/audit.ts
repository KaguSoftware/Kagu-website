import tls from "node:tls";
import { devices, type Browser } from "playwright";
import { launchBrowser } from "./browser.js";
import { config } from "./config.js";
import {
  allMatches,
  decodeEntities,
  firstMatch,
  metaContent,
  stripTags,
  visibleText,
} from "./seo.js";

/*
  audit.ts — on-page SEO audit for a whole site.

  Given a start URL this crawls the site (start page → sitemap.xml URLs →
  internal links, breadth-first, capped at `maxPages` because every page gets
  a full throttled mobile render) and audits each page in two passes:

    1. STATIC — plain fetch. Follows the redirect chain hop by hop, then reads
       the raw HTML for the things Google reads pre-render: title/meta/
       canonical/robots, structured data, render-blocking <head> resources,
       compression, mixed content. Site-level probes (robots.txt rules,
       sitemap contents, HTTP/2 via ALPN) run once and are shared by every
       page; a HEAD-status cache means each internal link is checked for 404
       at most once across the whole crawl.

    2. RENDERED — Playwright emulating a phone (Google indexes mobile-first),
       with CDP network+CPU throttling approximating a mid-range device on 4G.
       This yields the DOM as Google's renderer sees it (headings, images,
       links, viewport behaviour, tap targets, font sizes) plus lab web vitals
       (TTFB / LCP / CLS) and the real transfer weight per resource. One
       browser serves the whole crawl; each page gets a fresh context so its
       metrics are cold-cache honest.

  Every check carries three layers of output: the ISSUE (what is wrong, with
  counts), WHY it matters for ranking, and SPECIFICS — the exact offending
  parts (heading texts, image files, CSS-selector-ish descriptions of the
  tiny-font / overflow / tap-target culprits, the LCP element, broken URLs).

  Checks land in nine weighted categories; a check scores full credit (pass),
  half (warn) or zero (fail), a category is the weighted average of its
  applicable checks, and a page score is the category-weight average.
  Inapplicable checks (images on a page without images) are excluded rather
  than counted as passes. The site report averages page scores and merges
  identical findings across pages, listing which pages each issue affects.

  Like seo.ts this is a standalone tool (run via `npm run seo:audit`) — it
  writes nothing to the DB and needs no Supabase creds. If the browser pass
  fails the static checks still produce a report; mobile/performance
  categories drop out of the score.
*/

/* ------------------------------------------------------------------------ */
/* Report types                                                             */
/* ------------------------------------------------------------------------ */

export type Severity = "error" | "warn" | "info";

export type CategoryId =
  | "headings"
  | "meta"
  | "content"
  | "mobile"
  | "performance"
  | "images"
  | "indexability"
  | "links"
  | "schema";

const CATEGORIES: Record<CategoryId, { label: string; weight: number }> = {
  headings: { label: "Headings", weight: 15 },
  meta: { label: "Title & Meta", weight: 10 },
  content: { label: "Content", weight: 5 },
  mobile: { label: "Mobile", weight: 15 },
  performance: { label: "Speed (mobile lab)", weight: 20 },
  images: { label: "Images", weight: 10 },
  indexability: { label: "Indexability", weight: 15 },
  links: { label: "Links", weight: 5 },
  schema: { label: "Structured data", weight: 5 },
};

export interface Finding {
  category: CategoryId;
  label: string; // stable check name, e.g. "Legible font sizes"
  severity: Severity;
  issue: string; // what is wrong, with the numbers found
  why: string; // why this matters for SEO
  fix: string; // the concrete code-level change
  specifics: string[]; // exact offending parts, [path]-prefixed in site mode
  pages: string[]; // page paths this issue was found on
}

export interface CategoryScore {
  category: CategoryId;
  label: string;
  score: number | null; // null = no applicable checks
}

export interface AuditMetrics {
  ttfbMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  loadMs: number | null;
  pageWeightBytes: number | null;
  requestCount: number | null;
}

export interface PageResult {
  url: string; // as queued
  finalUrl: string; // after redirects
  httpStatus: number;
  renderOk: boolean;
  score: number;
  categories: CategoryScore[];
  metrics: AuditMetrics;
  error?: string; // set when the page could not be fetched at all
}

export interface AuditReport {
  url: string; // input
  siteHost: string;
  fetchedAt: string;
  maxPages: number;
  pages: PageResult[];
  score: number; // site average of page scores
  categories: CategoryScore[]; // site averages
  findings: Finding[]; // merged across pages, most severe first
  passed: string[]; // checks that passed everywhere they applied
}

/* ------------------------------------------------------------------------ */
/* Internal check collector                                                 */
/* ------------------------------------------------------------------------ */

type Status = "pass" | "warn" | "fail";

interface FlagOpts {
  issue: string;
  why: string;
  fix: string;
  specifics?: string[];
  severity?: Severity; // default: fail → error, warn → warn
}

interface CheckOutcome {
  category: CategoryId;
  label: string;
  weight: number;
  status: Status;
  severity: Severity;
  issue: string;
  why: string;
  fix: string;
  specifics: string[];
}

class Checks {
  outcomes: CheckOutcome[] = [];

  pass(category: CategoryId, label: string, weight: number): void {
    this.outcomes.push({
      category, label, weight, status: "pass", severity: "info",
      issue: "", why: "", fix: "", specifics: [],
    });
  }

  flag(category: CategoryId, label: string, weight: number, status: "warn" | "fail", o: FlagOpts): void {
    this.outcomes.push({
      category, label, weight, status,
      severity: o.severity ?? (status === "fail" ? "error" : "warn"),
      issue: o.issue, why: o.why, fix: o.fix, specifics: o.specifics ?? [],
    });
  }

  /* Zero-weight note — shows in the issues list, never moves the score. */
  info(category: CategoryId, label: string, o: FlagOpts): void {
    this.outcomes.push({
      category, label, weight: 0, status: "warn", severity: "info",
      issue: o.issue, why: o.why, fix: o.fix, specifics: o.specifics ?? [],
    });
  }
}

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/* ------------------------------------------------------------------------ */
/* Entry point — crawl the site, audit each page, merge                     */
/* ------------------------------------------------------------------------ */

export interface AuditOptions {
  maxPages?: number; // 1 = only the given URL
}

interface SiteContext {
  host: string;
  browser: Browser | null;
  robots: RobotsData;
  sitemaps: SitemapData;
  alpn: string | null;
  linkStatus: Map<string, number | null>; // HEAD-status cache, site-wide
}

interface PageAudit {
  result: PageResult;
  outcomes: CheckOutcome[];
  internalLinks: string[];
}

export async function auditSite(inputUrl: string, opts: AuditOptions = {}): Promise<AuditReport> {
  const maxPages = Math.max(1, opts.maxPages ?? config.seoAuditMaxPages);
  const startUrl = normalizeInputUrl(inputUrl);

  console.log(`[audit] fetching ${startUrl} …`);
  const startNav = await followRedirects(startUrl);
  if (!startNav.response) {
    throw new Error(`Could not fetch ${startUrl}: ${startNav.error ?? "no response"}`);
  }
  const site = new URL(startNav.finalUrl);

  console.log(`[audit] probing robots.txt / sitemap / ALPN for ${site.hostname} …`);
  const robots = await fetchRobots(site.origin);
  const alpn = site.protocol === "https:" ? await checkAlpn(site.hostname) : null;
  const sitemaps = await loadSitemaps(
    robots.sitemaps.length ? robots.sitemaps : [`${site.origin}/sitemap.xml`]
  );

  const ctx: SiteContext = {
    host: site.hostname,
    browser: null,
    robots,
    sitemaps,
    alpn,
    linkStatus: new Map(),
  };
  try {
    ctx.browser = await launchBrowser();
  } catch (err) {
    console.warn("[audit] browser launch failed — static checks only:", err instanceof Error ? err.message : err);
  }

  // BFS queue: start page, then the site's own sitemap URLs, then whatever
  // internal links each audited page reveals. Every URL is marked visited at
  // enqueue time, so nothing is audited twice.
  const visited = new Set<string>([normKey(startNav.finalUrl)]);
  const queue: string[] = [startNav.finalUrl];
  for (const loc of sitemaps.locs) {
    if (!sameSitePage(loc, ctx.host) || queue.length >= maxPages * 3) continue;
    const key = normKey(loc);
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push(loc);
  }
  const audits: PageAudit[] = [];
  let preNav: Navigation | null = startNav; // reuse the start fetch

  try {
    while (queue.length > 0 && audits.length < maxPages) {
      const pageUrl = queue.shift()!;
      const nav = preNav;
      preNav = null;
      console.log(`[audit] page ${audits.length + 1}/${maxPages}: ${pathOf(pageUrl)} …`);
      const audit = await auditPage(pageUrl, ctx, nav ?? undefined);
      visited.add(normKey(audit.result.finalUrl));
      audits.push(audit);

      for (const link of audit.internalLinks) {
        const key = normKey(link);
        if (visited.has(key)) continue;
        visited.add(key);
        if (queue.length < maxPages * 5) queue.push(link);
      }
    }
  } finally {
    await ctx.browser?.close().catch(() => {});
  }

  console.log(`[audit] ${audits.length} page(s) audited — assembling report`);
  return assembleSiteReport(inputUrl, site.hostname, maxPages, audits);
}

/* ------------------------------------------------------------------------ */
/* One page                                                                 */
/* ------------------------------------------------------------------------ */

async function auditPage(url: string, ctx: SiteContext, preNav?: Navigation): Promise<PageAudit> {
  const nav = preNav ?? (await followRedirects(url));
  if (!nav.response) {
    const c = new Checks();
    c.flag("indexability", "Page fetches successfully", 5, "fail", {
      issue: `Could not fetch ${url} (${nav.error ?? "no response"}).`,
      why: "A page that doesn't respond can't be crawled, indexed, or ranked — and links pointing here leak authority into a dead end.",
      fix: "Make the URL respond, or fix/remove the internal links pointing at it.",
      specifics: [url],
    });
    return {
      result: assemblePage(url, url, 0, null, [], c, nav.error),
      outcomes: c.outcomes,
      internalLinks: [],
    };
  }

  const finalUrl = nav.finalUrl;
  const final = new URL(finalUrl);
  const headers = nav.response.headers;
  const html = (await nav.response.text()).slice(0, 1_500_000);

  let rendered: RenderedData | null = null;
  let resources: ResourceInfo[] = [];
  if (ctx.browser) {
    try {
      const r = await renderMobile(ctx.browser, finalUrl);
      rendered = r.data;
      resources = r.resources;
    } catch (err) {
      console.warn(`[audit] mobile render failed for ${pathOf(finalUrl)}:`, err instanceof Error ? err.message : err);
    }
  }

  const links = rendered?.links?.length ? rendered.links : staticLinks(html, finalUrl);
  const broken = await checkInternalLinks(links, final, finalUrl, ctx.linkStatus);
  const robotsVerdict = robotsBlockVerdict(ctx.robots, final.pathname + final.search);
  const sitemapStatus = sitemapStatusFor(ctx.sitemaps, finalUrl);

  const c = new Checks();
  runHeadingChecks(c, rendered?.headings ?? staticHeadings(html), staticTitle(html) || rendered?.title || "");
  runMetaChecks(c, html, rendered, finalUrl);
  runContentChecks(c, html, rendered);
  runMobileChecks(c, html, rendered);
  runPerformanceChecks(c, html, headers, rendered, resources);
  runImageChecks(c, rendered, resources);
  runIndexabilityChecks(c, html, headers, nav, final, ctx.robots, robotsVerdict, sitemapStatus, ctx.alpn);
  runLinkChecks(c, html, links, final, broken);
  runSchemaChecks(c, html);

  return {
    result: assemblePage(url, finalUrl, nav.status, rendered, resources, c),
    outcomes: c.outcomes,
    internalLinks: links
      .map((l) => l.href)
      .filter((href) => sameSitePage(href, ctx.host))
      .map((href) => {
        const u = new URL(href);
        u.hash = "";
        return u.toString();
      }),
  };
}

/* Crawlable same-host HTML page (skips assets, mailto/tel, other hosts). */
function sameSitePage(href: string, host: string): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(u.protocol) || u.hostname !== host) return false;
  return !/\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|mp3|mp4|webm|zip|rar|gz|xml|json|txt|woff2?|ttf|eot)$/i.test(
    u.pathname
  );
}

/* Dedup key: hash stripped, trailing slash normalized (except root). */
function normKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let s = u.toString();
    if (u.pathname !== "/" && u.pathname.endsWith("/") && !u.search) s = s.replace(/\/$/, "");
    return s;
  } catch {
    return url;
  }
}

/* Short page identifier for logs/specifics: path + query. */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname || "/") + u.search;
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------------ */
/* Static phase: redirect chain + headers + raw HTML                        */
/* ------------------------------------------------------------------------ */

interface Navigation {
  chain: Array<{ url: string; status: number }>;
  finalUrl: string;
  status: number;
  response: Response | null;
  error?: string;
}

function normalizeInputUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/* Manual hop-by-hop follow so the report can show the chain itself. */
async function followRedirects(startUrl: string): Promise<Navigation> {
  const chain: Array<{ url: string; status: number }> = [];
  let current = startUrl;
  try {
    for (let hop = 0; hop < 8; hop++) {
      const res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": UA, "accept-language": "en;q=0.9" },
      });
      chain.push({ url: current, status: res.status });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { chain, finalUrl: current, status: res.status, response: res };
        current = new URL(loc, current).toString();
        continue;
      }
      return { chain, finalUrl: current, status: res.status, response: res };
    }
    return { chain, finalUrl: current, status: 0, response: null, error: "too many redirects" };
  } catch (err) {
    return {
      chain,
      finalUrl: current,
      status: 0,
      response: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function staticTitle(html: string): string {
  return stripTags(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
}

function staticHeadings(html: string): Array<{ level: number; text: string }> {
  return [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .slice(0, 200)
    .map((m) => ({ level: Number(m[1]), text: stripTags(m[2]).slice(0, 120) }));
}

function staticLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const out: Array<{ href: string; text: string }> = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (out.length >= 500) break;
    try {
      out.push({ href: new URL(decodeEntities(m[1]), baseUrl).toString(), text: stripTags(m[2]).slice(0, 80) });
    } catch {
      /* unparseable href */
    }
  }
  return out;
}

/* <meta property="og:…" content="…"> — property= counterpart of metaContent. */
function metaProperty(html: string, prop: string): string {
  const a = html.match(
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i")
  );
  if (a) return decodeEntities(a[1]);
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${prop}["']`, "i")
  );
  return b ? decodeEntities(b[1]) : "";
}

/* ------------------------------------------------------------------------ */
/* Site-level probes: robots.txt / sitemap / ALPN / link statuses           */
/* ------------------------------------------------------------------------ */

interface RobotsData {
  fetched: boolean;
  rules: Array<{ allow: boolean; pattern: string }> | null; // group Googlebot obeys
  sitemaps: string[];
}

async function fetchRobots(origin: string): Promise<RobotsData> {
  let text: string;
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": UA },
    });
    if (!res.ok) return { fetched: false, rules: null, sitemaps: [] };
    text = (await res.text()).slice(0, 500_000);
  } catch {
    return { fetched: false, rules: null, sitemaps: [] };
  }

  // Parse groups: consecutive User-agent lines share the rules that follow.
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; pattern: string }> }> = [];
  let current: (typeof groups)[number] | null = null;
  let collectingAgents = false;
  const sitemaps: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();

    if (field === "sitemap" && value) sitemaps.push(value);
    else if (field === "user-agent") {
      if (!collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
        collectingAgents = true;
      }
      current!.agents.push(value.toLowerCase());
    } else if (field === "disallow" || field === "allow") {
      collectingAgents = false;
      if (current && value) current.rules.push({ allow: field === "allow", pattern: value });
    } else {
      collectingAgents = false;
    }
  }

  // Googlebot obeys its own group when present, else the * group.
  const group =
    groups.find((g) => g.agents.some((a) => a.includes("googlebot"))) ??
    groups.find((g) => g.agents.includes("*"));
  return { fetched: true, rules: group?.rules ?? null, sitemaps };
}

/* Longest matching pattern wins; Allow wins ties (RFC 9309, simplified). */
function robotsBlockVerdict(
  robots: RobotsData,
  path: string
): { blocked: boolean; rule: string } {
  if (!robots.rules) return { blocked: false, rule: "" };
  let best: { allow: boolean; pattern: string } | null = null;
  for (const rule of robots.rules) {
    if (!robotsPatternMatches(rule.pattern, path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  if (!best) return { blocked: false, rule: "" };
  return { blocked: !best.allow, rule: `${best.allow ? "Allow" : "Disallow"}: ${best.pattern}` };
}

/* robots patterns: prefix match with * wildcard and optional $ end anchor. */
function robotsPatternMatches(pattern: string, path: string): boolean {
  const endAnchor = pattern.endsWith("$");
  const body = (endAnchor ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  try {
    return new RegExp(`^${body}${endAnchor ? "$" : ""}`).test(path);
  } catch {
    return false;
  }
}

interface SitemapData {
  primaryUrl: string | null; // the sitemap actually found, null = none reachable
  texts: string[]; // fetched sitemap XML bodies (index children included)
  locs: string[]; // <loc> page URLs — used to seed the crawl queue
}

/* Fetch the sitemap once for the whole crawl; every page checks membership
   against these cached bodies instead of refetching. */
async function loadSitemaps(candidates: string[]): Promise<SitemapData> {
  const fetchXml = async (u: string): Promise<string | null> => {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(12000), headers: { "user-agent": UA } });
      if (!res.ok) return null;
      return (await res.text()).slice(0, 3_000_000);
    } catch {
      return null;
    }
  };

  for (const candidate of candidates.slice(0, 3)) {
    const xml = await fetchXml(candidate);
    if (xml === null) continue;
    const texts = [xml];
    if (/<sitemapindex/i.test(xml)) {
      const children = allMatches(xml, /<loc>\s*([^<\s]+)\s*<\/loc>/gi).slice(0, 4);
      for (const child of children) {
        const childXml = await fetchXml(child.trim());
        if (childXml) texts.push(childXml);
      }
    }
    const locs = texts
      .flatMap((t) => allMatches(t, /<loc>\s*([^<\s]+)\s*<\/loc>/gi))
      .map((l) => decodeEntities(l.trim()))
      .slice(0, 500);
    return { primaryUrl: candidate, texts, locs };
  }
  return { primaryUrl: null, texts: [], locs: [] };
}

function sitemapStatusFor(sitemaps: SitemapData, url: string): "found" | "absent" | "none" {
  if (!sitemaps.primaryUrl) return "none";
  const noSlash = url.replace(/\/$/, "");
  const withSlash = `${noSlash}/`;
  return sitemaps.texts.some((t) => t.includes(noSlash) || t.includes(withSlash))
    ? "found"
    : "absent";
}

/* Negotiated protocol for the origin — h2 vs http/1.1. */
function checkAlpn(host: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, ALPNProtocols: ["h2", "http/1.1"], timeout: 6000 },
      () => {
        const proto = socket.alpnProtocol || null;
        socket.end();
        resolve(proto);
      }
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

interface BrokenLink {
  url: string;
  status: number | null; // null = unreachable
}

/* HEAD-check a sample of same-host links. The cache is site-wide, so a nav
   link that appears on every page costs one request for the whole crawl. */
async function checkInternalLinks(
  links: Array<{ href: string; text: string }>,
  finalHost: URL,
  selfUrl: string,
  cache: Map<string, number | null>
): Promise<{ checked: number; broken: BrokenLink[] }> {
  const seen = new Set<string>();
  const sample: string[] = [];
  for (const l of links) {
    let u: URL;
    try {
      u = new URL(l.href);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || u.hostname !== finalHost.hostname) continue;
    u.hash = "";
    const clean = u.toString();
    if (clean === selfUrl || seen.has(clean)) continue;
    seen.add(clean);
    sample.push(clean);
    if (sample.length >= 10) break;
  }

  const broken: BrokenLink[] = [];
  for (const link of sample) {
    let status: number | null;
    if (cache.has(link)) status = cache.get(link)!;
    else {
      status = await headStatus(link);
      cache.set(link, status);
    }
    if (status === null || status >= 400) broken.push({ url: link, status });
  }
  return { checked: sample.length, broken };
}

async function headStatus(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": UA },
    });
    // Some servers reject HEAD — confirm with GET before calling it broken.
    if (res.status === 405 || res.status === 501 || res.status >= 400) {
      const get = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { "user-agent": UA },
      });
      return get.status;
    }
    return res.status;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* Rendered phase: Playwright mobile emulation + throttling + lab metrics   */
/* ------------------------------------------------------------------------ */

interface RenderedData {
  title: string;
  metaDescription: string;
  canonical: string;
  viewportContent: string | null;
  headings: Array<{ level: number; text: string }>;
  images: Array<{ src: string; hasAlt: boolean; hasDims: boolean; loading: string }>;
  links: Array<{ href: string; text: string }>;
  scrollWidth: number;
  innerWidth: number;
  overflowCulprits: string[]; // elements wider than the viewport
  textChecked: number;
  tinyFonts: number;
  tinyFontExamples: string[];
  tapTargets: number;
  smallTapTargets: number;
  smallTapExamples: string[];
  wordCount: number;
  bodyTextLength: number;
  ttfbMs: number;
  loadMs: number;
  lcpMs: number;
  lcpElement: string; // description of the LCP element
  cls: number;
}

interface ResourceInfo {
  url: string;
  type: string;
  bytes: number;
}

/* One page in a fresh context (cold cache → honest metrics), shared browser. */
async function renderMobile(
  browser: Browser,
  url: string
): Promise<{ data: RenderedData; resources: ResourceInfo[] }> {
  const context = await browser.newContext({ ...devices["Pixel 7"], locale: "en-US" });
  try {
    // Same tsx/esbuild `__name` guard as browser.ts — must be first, and must
    // be a string so esbuild leaves it untouched.
    await context.addInitScript("globalThis.__name = globalThis.__name || ((fn) => fn);");

    // Buffered observers must be registered before any page script runs.
    await context.addInitScript(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const g = globalThis as any;
      g.__audit = { lcp: 0, cls: 0, lcpEl: "" };
      const describe = (el: any): string => {
        if (!el || !el.tagName) return "";
        const cls =
          typeof el.className === "string" && el.className.trim()
            ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";
        const src = el.currentSrc || el.src;
        return (
          el.tagName.toLowerCase() +
          (el.id ? `#${el.id}` : "") +
          cls +
          (src ? ` (${String(src).split("/").pop()?.slice(0, 60)})` : "")
        );
      };
      try {
        new g.PerformanceObserver((list: any) => {
          const entries = list.getEntries();
          if (entries.length) {
            const last = entries[entries.length - 1];
            g.__audit.lcp = last.startTime;
            g.__audit.lcpEl = describe(last.element);
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new g.PerformanceObserver((list: any) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) g.__audit.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch {
        /* observer types unsupported */
      }
    });

    const page = await context.newPage();

    const resources: ResourceInfo[] = [];
    page.on("requestfinished", (req) => {
      req
        .sizes()
        .then((s) => {
          resources.push({
            url: req.url(),
            type: req.resourceType(),
            bytes: Math.max(0, s.responseBodySize) + Math.max(0, s.responseHeadersSize),
          });
        })
        .catch(() => {});
    });

    // Approximate a mid-range phone on 4G (Lighthouse mobile defaults):
    // 1.6 Mbps down / 750 Kbps up / 150 ms RTT, 4× CPU slowdown.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    let loadTimedOut = false;
    try {
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
    } catch {
      loadTimedOut = true; // keep going — a partially loaded DOM still audits
    }
    await page.waitForTimeout(2500); // let LCP/CLS entries settle

    const data = (await page.evaluate(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const g = globalThis as any;
      const d = g.document;

      const describe = (el: any): string => {
        const cls =
          typeof el.className === "string" && el.className.trim()
            ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";
        return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + cls;
      };
      const snippet = (el: any): string => {
        const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
        return t ? ` "${t}"` : "";
      };

      const headings = Array.from(d.querySelectorAll("h1,h2,h3,h4,h5,h6"))
        .slice(0, 200)
        .map((h: any) => ({
          level: Number(h.tagName[1]),
          text: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
        }));

      const images = Array.from(d.images)
        .slice(0, 300)
        .map((img: any) => ({
          src: (img.currentSrc || img.src || "").slice(0, 300),
          hasAlt: img.hasAttribute("alt"),
          hasDims: img.hasAttribute("width") && img.hasAttribute("height"),
          loading: img.getAttribute("loading") || "",
        }));

      const links = Array.from(d.querySelectorAll("a[href]"))
        .slice(0, 500)
        .map((a: any) => ({
          href: a.href || "",
          text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
        }));

      let textChecked = 0;
      let tinyFonts = 0;
      const tinyFontExamples: string[] = [];
      for (const el of Array.from(d.querySelectorAll("p,li,a,span,button,td,label")).slice(0, 1200) as any[]) {
        if (!(el.textContent || "").trim()) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width && !rect.height) continue; // hidden
        const size = parseFloat(g.getComputedStyle(el).fontSize);
        if (!size) continue;
        textChecked++;
        if (size < 12) {
          tinyFonts++;
          if (tinyFontExamples.length < 5)
            tinyFontExamples.push(`${describe(el)}${snippet(el)} — ${Math.round(size * 10) / 10}px`);
        }
      }

      let tapTargets = 0;
      let smallTapTargets = 0;
      const smallTapExamples: string[] = [];
      for (const el of Array.from(
        d.querySelectorAll("a[href],button,input,select,textarea,[role=button]")
      ).slice(0, 400) as any[]) {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        tapTargets++;
        if (rect.width < 40 && rect.height < 40) {
          smallTapTargets++;
          if (smallTapExamples.length < 5)
            smallTapExamples.push(
              `${describe(el)}${snippet(el)} — ${Math.round(rect.width)}×${Math.round(rect.height)}px`
            );
        }
      }

      const overflowCulprits: string[] = [];
      if (d.documentElement.scrollWidth > g.innerWidth + 8) {
        for (const el of Array.from(d.querySelectorAll("body *")).slice(0, 2000) as any[]) {
          const rect = el.getBoundingClientRect();
          if (rect.width > g.innerWidth + 8) {
            overflowCulprits.push(`${describe(el)} — ${Math.round(rect.width)}px wide`);
            if (overflowCulprits.length >= 3) break;
          }
        }
      }

      const bodyText = ((d.body && d.body.innerText) || "").trim();
      const nav = g.performance.getEntriesByType("navigation")[0];

      return {
        title: (d.title || "").trim(),
        metaDescription:
          d.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "",
        canonical: d.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
        viewportContent: d.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null,
        headings,
        images,
        links,
        scrollWidth: d.documentElement.scrollWidth,
        innerWidth: g.innerWidth,
        overflowCulprits,
        textChecked,
        tinyFonts,
        tinyFontExamples,
        tapTargets,
        smallTapTargets,
        smallTapExamples,
        wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
        bodyTextLength: bodyText.length,
        ttfbMs: nav ? Math.round(nav.responseStart) : 0,
        loadMs: nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
        lcpMs: Math.round(g.__audit?.lcp ?? 0),
        lcpElement: g.__audit?.lcpEl ?? "",
        cls: Math.round((g.__audit?.cls ?? 0) * 1000) / 1000,
      };
    })) as RenderedData;

    if (loadTimedOut) data.loadMs = 0; // load never fired — don't report a fake number
    return { data, resources };
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------------ */
/* Checks                                                                   */
/* ------------------------------------------------------------------------ */

function runHeadingChecks(
  c: Checks,
  headings: Array<{ level: number; text: string }>,
  title: string
): void {
  const h1s = headings.filter((h) => h.level === 1);
  const outline = headings
    .slice(0, 12)
    .map((h) => `${"  ".repeat(h.level - 1)}h${h.level} "${h.text || "(empty)"}"`);

  if (h1s.length === 1) c.pass("headings", "Exactly one <h1>", 4);
  else if (h1s.length === 0)
    c.flag("headings", "Exactly one <h1>", 4, "fail", {
      issue: "No <h1> on the page.",
      why: "The <h1> is the strongest on-page statement of what the page is about — Google weights it heavily when matching the page to queries.",
      fix: "Add a single <h1> near the top of the content containing the page's primary keyword.",
    });
  else
    c.flag("headings", "Exactly one <h1>", 4, "warn", {
      issue: `${h1s.length} <h1> tags on the page.`,
      why: "Multiple <h1>s split the 'main topic' signal — Google has to guess which one defines the page.",
      fix: "Keep one <h1> for the main topic and demote the others to <h2>.",
      specifics: h1s.slice(0, 5).map((h) => `<h1> "${h.text || "(empty)"}"`),
    });

  const skips: string[] = [];
  let prev = 0;
  for (const h of headings) {
    if (prev > 0 && h.level > prev + 1 && skips.length < 5) {
      skips.push(`h${prev} → h${h.level} at "${h.text || "(empty)"}"`);
    }
    prev = h.level;
  }
  if (headings.length === 0) {
    c.flag("headings", "Headings present", 3, "fail", {
      issue: "No headings (h1–h6) at all — the page has no document outline.",
      why: "Google reconstructs your content's structure from headings; without them every paragraph carries equal (i.e. no) topical weight.",
      fix: "Structure the content with an <h1> and <h2> section headings.",
    });
  } else if (skips.length === 0) {
    c.pass("headings", "No skipped heading levels", 3);
  } else {
    c.flag("headings", "No skipped heading levels", 3, "warn", {
      issue: `Heading hierarchy skips levels in ${skips.length} place(s).`,
      why: "Google (and screen readers) rebuild the content outline from heading levels; a skip makes a subsection look unrelated to its parent topic.",
      fix: "Don't jump levels — a subsection of an <h1> section should be <h2>, not <h3>. Use CSS for sizing, headings for structure.",
      specifics: [...skips, "— page outline —", ...outline],
    });
  }

  const empty = headings.filter((h) => !h.text);
  if (headings.length > 0) {
    if (empty.length === 0) c.pass("headings", "No empty headings", 2);
    else
      c.flag("headings", "No empty headings", 2, "warn", {
        issue: `${empty.length} heading tag(s) contain no text.`,
        why: "Empty headings add meaningless entries to the document outline and dilute the structure signal.",
        fix: "Remove empty <hN> tags (often leftover markup or icon wrappers) or put the real section title inside them.",
        specifics: empty.slice(0, 5).map((h) => `<h${h.level}> (empty)`),
      });
  }

  if (h1s.length > 0 && title) {
    const words = (s: string) => new Set(s.toLowerCase().match(/\p{L}{3,}/gu) ?? []);
    const t = words(title);
    const shared = [...words(h1s[0].text)].some((w) => t.has(w));
    if (shared) c.pass("headings", "<h1> relates to <title>", 2);
    else
      c.flag("headings", "<h1> relates to <title>", 2, "warn", {
        issue: "The <h1> shares no significant word with the <title>.",
        why: "Title and h1 are the two topic statements Google cross-checks; when they disagree, the page's focus looks ambiguous.",
        fix: "Align them on the page's core keyword (they shouldn't be identical, just clearly about the same thing).",
        specifics: [`<title> "${title.slice(0, 80)}"`, `<h1> "${h1s[0].text}"`],
        severity: "info",
      });
  }
}

function runMetaChecks(c: Checks, html: string, rendered: RenderedData | null, finalUrl: string): void {
  const title = staticTitle(html);
  const renderedTitle = rendered?.title ?? "";
  if (title) {
    c.pass("meta", "<title> present", 4);
    if (title.length >= 15 && title.length <= 60) c.pass("meta", "<title> length", 1);
    else
      c.flag("meta", "<title> length", 1, "warn", {
        issue: `<title> is ${title.length} characters — ${title.length < 15 ? "too short to carry a keyword and brand" : "Google truncates at ~60"}.`,
        why: "The title is your blue link in search results; a truncated or empty-feeling title loses clicks even when you rank.",
        fix:
          title.length < 15
            ? "Expand it to 'Primary Keyword – Brand' (15–60 chars)."
            : "Trim to ≤60 chars and put the primary keyword first — the end is what gets cut off.",
        specifics: [`<title> "${title.slice(0, 90)}${title.length > 90 ? "…" : ""}"`],
      });
  } else if (renderedTitle) {
    c.flag("meta", "<title> present", 4, "warn", {
      issue: "<title> is empty in the raw HTML and only set by JavaScript.",
      why: "Crawlers that don't execute JS (and share previews) see no title at all; even Googlebot sees it late, in the render wave.",
      fix: "Render the <title> server-side.",
      specifics: [`JS-injected title: "${renderedTitle.slice(0, 80)}"`],
    });
  } else {
    c.flag("meta", "<title> present", 4, "fail", {
      issue: "No <title> tag.",
      why: "The title tag is the single most important on-page element — it's both a strong ranking signal and your headline in the results page.",
      fix: "Add <title>Primary Keyword – Brand</title> (15–60 chars) in <head>.",
    });
  }

  const staticDesc = metaContent(html, "description");
  const desc = staticDesc || rendered?.metaDescription || "";
  if (!desc) {
    c.flag("meta", "Meta description present", 3, "warn", {
      issue: "No meta description.",
      why: "Not a direct ranking factor, but it's your ad copy under the blue link — without one Google improvises a snippet from page text, which usually reads worse and wins fewer clicks.",
      fix: 'Add <meta name="description" content="…"> (70–160 chars) that reads like ad copy for the page.',
    });
  } else {
    if (staticDesc) c.pass("meta", "Meta description present", 3);
    else
      c.flag("meta", "Meta description present", 3, "warn", {
        issue: "Meta description is only injected by JavaScript.",
        why: "Non-JS crawlers and share previews never see it.",
        fix: "Render it server-side.",
        specifics: [`JS-injected description: "${desc.slice(0, 100)}…"`],
        severity: "info",
      });
    if (desc.length >= 70 && desc.length <= 160) c.pass("meta", "Meta description length", 1);
    else
      c.flag("meta", "Meta description length", 1, "warn", {
        issue: `Meta description is ${desc.length} characters — ${desc.length < 70 ? "too short to fill the snippet" : "Google truncates at ~160"}.`,
        why: "A snippet that fills the available space (without being cut mid-sentence) wins more clicks.",
        fix: "Rewrite to 70–160 chars including the primary keyword.",
        specifics: [`"${desc.slice(0, 120)}${desc.length > 120 ? "…" : ""}"`],
        severity: "info",
      });
  }

  const canonicalHref =
    firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    firstMatch(html, /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) ||
    rendered?.canonical ||
    "";
  if (!canonicalHref) {
    c.flag("meta", "Canonical URL", 2, "warn", {
      issue: 'No <link rel="canonical">.',
      why: "Without a canonical, every URL variant (?utm=…, trailing slash, www vs non-www) can be indexed as a separate page, splitting your ranking signals between duplicates.",
      fix: `Add <link rel="canonical" href="${finalUrl}"> to <head>.`,
    });
  } else {
    let resolved = "";
    try {
      resolved = new URL(canonicalHref, finalUrl).toString();
    } catch {
      /* malformed */
    }
    const norm = (u: string) => u.replace(/\/$/, "").toLowerCase();
    if (!resolved) {
      c.flag("meta", "Canonical URL", 2, "warn", {
        issue: "Canonical href is malformed.",
        why: "A canonical Google can't parse is ignored — you lose the dedup protection it should provide.",
        fix: "Use an absolute, valid URL in the canonical tag.",
        specifics: [`<link rel="canonical" href="${canonicalHref}">`],
      });
    } else if (norm(resolved) === norm(finalUrl)) {
      c.pass("meta", "Canonical URL", 2);
    } else {
      c.flag("meta", "Canonical URL", 2, "warn", {
        issue: "Canonical points at a different URL.",
        why: "This tells Google another URL is the primary version — this page will generally NOT be indexed separately. Sometimes intentional, often a copy-paste bug.",
        fix: "If this page should rank, make the canonical self-referencing; if the other URL is intentional, no change needed.",
        specifics: [`this page: ${finalUrl}`, `canonical:  ${resolved}`],
      });
    }
  }

  const lang = firstMatch(html, /<html[^>]*\slang=["']?([a-zA-Z-]+)/i);
  if (lang) c.pass("meta", "<html lang> attribute", 1);
  else
    c.flag("meta", "<html lang> attribute", 1, "warn", {
      issue: "No lang attribute on <html>.",
      why: "Tells Google which language market to serve the page to; without it, language detection has to guess — risky on mixed TR/EN pages.",
      fix: 'Add <html lang="tr"> (or the page\'s actual language).',
    });

  const charset =
    /<meta[^>]+charset=["']?[\w-]+/i.test(html) || /<meta[^>]+http-equiv=["']?content-type/i.test(html);
  if (charset) c.pass("meta", "Charset declared", 1);
  else
    c.flag("meta", "Charset declared", 1, "warn", {
      issue: "No charset declaration.",
      why: "Ambiguous encoding can garble extracted text (Turkish characters especially) in the index and in snippets.",
      fix: 'Add <meta charset="utf-8"> as the first tag in <head>.',
    });

  const missing = ["og:title", "og:description", "og:image"].filter((p) => !metaProperty(html, p));
  if (missing.length === 0) c.pass("meta", "Social preview tags", 1);
  else
    c.flag("meta", "Social preview tags", 1, "warn", {
      issue: `Open Graph tags incomplete — missing ${missing.join(", ")}.`,
      why: "Not a ranking factor, but links shared on WhatsApp/LinkedIn/X render as bare URLs without them — shares that could bring traffic get ignored.",
      fix: "Add og:title, og:description, og:image (1200×630) and twitter:card tags.",
      specifics: missing.map((m) => `missing <meta property="${m}">`),
      severity: "info",
    });
}

function runContentChecks(c: Checks, html: string, rendered: RenderedData | null): void {
  const rawTextLen = visibleText(html).length;

  if (rendered) {
    if (rendered.wordCount >= 300) c.pass("content", "Enough text content", 3);
    else
      c.flag("content", "Enough text content", 3, rendered.wordCount < 150 ? "fail" : "warn", {
        issue: `Only ~${rendered.wordCount} words of visible text.`,
        why: "Google's helpful-content systems demote thin pages — with little text there's simply nothing for the page to rank FOR.",
        fix: "Add real copy: what the business does, services, prices, location, FAQs. Aim for 300+ useful words.",
        severity: "warn",
      });

    if (rendered.bodyTextLength > 500) {
      const ratio = rawTextLen / rendered.bodyTextLength;
      if (ratio >= 0.3) c.pass("content", "Content present in raw HTML (SSR)", 2);
      else
        c.flag("content", "Content present in raw HTML (SSR)", 2, "warn", {
          issue: `Only ~${Math.round(ratio * 100)}% of the rendered text exists in the raw HTML — the content is built by JavaScript.`,
          why: "Googlebot executes JS in a delayed second wave, and most other crawlers (Bing partially, AI/social crawlers not at all) never run it — JS-only content is invisible or late to them.",
          fix: "Server-render (SSR/SSG) the main copy so it's in the initial HTML response.",
        });
    }
  } else if (rawTextLen > 0) {
    const words = visibleText(html).split(/\s+/).length;
    if (words >= 300) c.pass("content", "Enough text content", 3);
    else
      c.flag("content", "Enough text content", 3, "warn", {
        issue: `Only ~${words} words of visible text in the raw HTML (browser render unavailable).`,
        why: "Thin pages have nothing to rank for.",
        fix: "Add real copy: services, prices, location, FAQs. Aim for 300+ words.",
      });
  }
}

function runMobileChecks(c: Checks, html: string, rendered: RenderedData | null): void {
  const viewport = rendered?.viewportContent ?? metaContent(html, "viewport") ?? null;
  if (viewport && /width\s*=\s*device-width/i.test(viewport)) {
    c.pass("mobile", "Viewport meta tag", 5);
  } else if (viewport) {
    c.flag("mobile", "Viewport meta tag", 5, "warn", {
      issue: "Viewport meta exists but lacks width=device-width.",
      why: "Google indexes the MOBILE rendering of every page; a wrong viewport makes the phone render as shrunken desktop and fails mobile-friendliness.",
      fix: 'Use <meta name="viewport" content="width=device-width, initial-scale=1">.',
      specifics: [`found: <meta name="viewport" content="${viewport.slice(0, 80)}">`],
    });
  } else {
    c.flag("mobile", "Viewport meta tag", 5, "fail", {
      issue: "No viewport meta tag.",
      why: "Google indexes the MOBILE rendering of every page; without a viewport the page renders as zoomed-out desktop on phones — the #1 mobile-usability failure.",
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> in <head>.',
    });
  }

  if (!rendered) return; // remaining mobile checks need the real render

  const overflow = rendered.scrollWidth - rendered.innerWidth;
  if (overflow <= 8) c.pass("mobile", "No horizontal overflow", 4);
  else
    c.flag("mobile", "No horizontal overflow", 4, "fail", {
      issue: `Content is ${overflow}px wider than the phone viewport (${rendered.scrollWidth}px vs ${rendered.innerWidth}px) — users get horizontal scroll.`,
      why: "Content wider than the screen is a core mobile-usability failure Google measures, and a strong bounce trigger on real phones.",
      fix: "Give the culprits below max-width:100% (images) or overflow-x:auto (tables); check fixed-width containers.",
      specifics: rendered.overflowCulprits,
    });

  if (rendered.textChecked > 0) {
    const share = rendered.tinyFonts / rendered.textChecked;
    if (rendered.tinyFonts === 0) c.pass("mobile", "Legible font sizes", 3);
    else
      c.flag("mobile", "Legible font sizes", 3, share > 0.2 ? "fail" : "warn", {
        issue: `${rendered.tinyFonts} of ${rendered.textChecked} text elements render below 12px on mobile.`,
        why: "Text under ~12px is what Google's mobile-usability check calls 'text too small to read'; users pinch-zoom or leave.",
        fix: "Use ≥12px (ideally 16px) for body text on mobile — check the elements below for the classes to change.",
        specifics: rendered.tinyFontExamples,
        severity: share > 0.2 ? "error" : "warn",
      });
  }

  if (rendered.tapTargets > 0) {
    const share = rendered.smallTapTargets / rendered.tapTargets;
    if (share <= 0.2 || rendered.smallTapTargets < 3) c.pass("mobile", "Tap target size", 3);
    else
      c.flag("mobile", "Tap target size", 3, "warn", {
        issue: `${rendered.smallTapTargets} of ${rendered.tapTargets} links/buttons are smaller than 40×40px on mobile.`,
        why: "Tap targets that are too small or too close together are a mobile-usability signal — and mis-taps cost real conversions.",
        fix: "Give interactive elements ~44×44px touch area (padding counts) or more spacing between them.",
        specifics: rendered.smallTapExamples,
      });
  }
}

function runPerformanceChecks(
  c: Checks,
  html: string,
  headers: Headers,
  rendered: RenderedData | null,
  resources: ResourceInfo[]
): void {
  if (rendered) {
    const s = (n: number) => `${(n / 1000).toFixed(1)}s`;

    if (rendered.lcpMs > 0) {
      if (rendered.lcpMs <= 2500) c.pass("performance", "LCP — largest contentful paint", 5);
      else
        c.flag("performance", "LCP — largest contentful paint", 5, rendered.lcpMs <= 4000 ? "warn" : "fail", {
          issue: `LCP is ${s(rendered.lcpMs)} on a throttled mobile connection (good ≤ 2.5s, poor > 4s).`,
          why: "LCP is a Core Web Vital — part of Google's page-experience ranking signal, measured on mobile. It's when the main content becomes visible; slow LCP = users staring at a blank hero.",
          fix: "Optimize the LCP element below: compress/preload it if it's an image, inline critical CSS, defer non-essential JS.",
          specifics: rendered.lcpElement ? [`LCP element: ${rendered.lcpElement}`] : [],
        });
    }

    if (rendered.ttfbMs > 0) {
      if (rendered.ttfbMs <= 800) c.pass("performance", "TTFB — server response time", 3);
      else
        c.flag("performance", "TTFB — server response time", 3, rendered.ttfbMs <= 1800 ? "warn" : "fail", {
          issue: `Server takes ${s(rendered.ttfbMs)} to send the first byte (good ≤ 0.8s).`,
          why: "TTFB is the floor under every other speed metric — nothing can paint before the HTML arrives. This is server/hosting time, not page code.",
          fix: "Cache the HTML response, use a CDN close to your visitors, or upgrade hosting.",
        });
    }

    if (rendered.cls <= 0.1) c.pass("performance", "CLS — layout shift", 3);
    else
      c.flag("performance", "CLS — layout shift", 3, rendered.cls <= 0.25 ? "warn" : "fail", {
        issue: `Cumulative layout shift is ${rendered.cls} (good ≤ 0.1) — content jumps around while loading.`,
        why: "CLS is a Core Web Vital (page-experience ranking signal); layout jumps also cause misclicks and reading loss on mobile.",
        fix: "Set width/height on images and embeds, reserve space for banners/ads, don't insert content above existing content.",
      });

    if (resources.length > 0) {
      const totalBytes = resources.reduce((sum, r) => sum + r.bytes, 0);
      const heaviest = [...resources]
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 5)
        .map((r) => `${shortName(r.url)} (${r.type}, ${Math.round(r.bytes / 1024)} KB)`);
      if (totalBytes <= 1_500_000) c.pass("performance", "Total page weight", 4);
      else
        c.flag("performance", "Total page weight", 4, totalBytes <= 3_000_000 ? "warn" : "fail", {
          issue: `Page transfers ${(totalBytes / 1024 / 1024).toFixed(1)} MB over ${resources.length} requests.`,
          why: "Bytes are the biggest lever on mobile speed — every 500 KB is ~2.5s on a 1.6 Mbps connection, straight onto your LCP.",
          fix: "Compress/resize the heaviest assets below, lazy-load below-the-fold media, drop unused scripts. Target ≤1.5 MB.",
          specifics: heaviest,
        });

      if (resources.length <= 60) c.pass("performance", "Request count", 1);
      else
        c.flag("performance", "Request count", 1, "warn", {
          issue: `${resources.length} network requests to render the page.`,
          why: "Each request costs a round-trip (~150ms on 4G) and mobile browsers only run a few in parallel.",
          fix: "Bundle/trim third-party scripts and combine small assets.",
        });
    }
  }

  // Static: render-blocking <head> resources.
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? "";
  const cssLinks = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((t) => /rel=["']?stylesheet/i.test(t) && !/media=["']?print/i.test(t));
  const syncScripts = [...head.matchAll(/<script\b[^>]*\ssrc=[^>]*>/gi)]
    .map((m) => m[0])
    .filter((t) => !/\b(async|defer)\b/i.test(t) && !/type=["']module/i.test(t));
  const blocking = cssLinks.length + syncScripts.length;
  if (blocking <= 2) c.pass("performance", "Render-blocking resources", 2);
  else
    c.flag("performance", "Render-blocking resources", 2, "warn", {
      issue: `${blocking} render-blocking resources in <head> (${cssLinks.length} stylesheets, ${syncScripts.length} synchronous scripts).`,
      why: "The browser paints NOTHING until these download and parse — they push LCP back directly.",
      fix: "Add defer/async to the scripts, inline critical CSS and load the rest async, or split CSS per page.",
      specifics: [...cssLinks, ...syncScripts].slice(0, 5).map((t) => t.slice(0, 110)),
    });

  const encoding = (headers.get("content-encoding") || "").toLowerCase();
  if (/br|gzip|zstd/.test(encoding)) c.pass("performance", "Text compression", 2);
  else if (html.length > 20_000)
    c.flag("performance", "Text compression", 2, "warn", {
      issue: `HTML (${Math.round(html.length / 1024)} KB) served without gzip/brotli.`,
      why: "Compression cuts text transfer ~70% — pure speed win for one line of server config.",
      fix: "Enable brotli or gzip on the server/CDN.",
      specifics: [`content-encoding header: ${encoding || "(none)"}`],
    });
}

function runImageChecks(c: Checks, rendered: RenderedData | null, resources: ResourceInfo[]): void {
  const imgs = rendered?.images ?? [];
  if (imgs.length > 0) {
    const missingAlt = imgs.filter((i) => !i.hasAlt);
    if (missingAlt.length === 0) c.pass("images", "Alt text on images", 4);
    else
      c.flag("images", "Alt text on images", 4, missingAlt.length / imgs.length > 0.3 ? "fail" : "warn", {
        issue: `${missingAlt.length} of ${imgs.length} images have no alt attribute.`,
        why: "Alt text is how Google understands what an image shows (and how you rank in image search); it's also an accessibility requirement.",
        fix: 'Add descriptive alt="" to content images — say what\'s IN the image, with keywords where natural; use empty alt="" for decorative ones.',
        specifics: missingAlt.slice(0, 5).map((i) => `<img src="…${shortName(i.src)}">`),
      });

    const missingDims = imgs.filter((i) => !i.hasDims);
    if (missingDims.length === 0) c.pass("images", "Width/height attributes", 2);
    else
      c.flag("images", "Width/height attributes", 2, "warn", {
        issue: `${missingDims.length} of ${imgs.length} images lack width/height attributes.`,
        why: "Without declared dimensions the browser can't reserve space, so the layout jumps when each image loads — a direct cause of CLS.",
        fix: "Set width and height attributes (or CSS aspect-ratio) on every <img>.",
        specifics: missingDims.slice(0, 5).map((i) => `<img src="…${shortName(i.src)}">`),
      });

    if (imgs.length > 6) {
      const lazy = imgs.filter((i) => i.loading === "lazy").length;
      if (lazy > 0) c.pass("images", "Lazy loading", 2);
      else
        c.flag("images", "Lazy loading", 2, "warn", {
          issue: `${imgs.length} images and none use loading="lazy" — everything downloads up front.`,
          why: "Below-the-fold images compete with the hero image for bandwidth on mobile, delaying LCP for content nobody has scrolled to yet.",
          fix: 'Add loading="lazy" to below-the-fold images (keep the LCP/hero image eager).',
        });
    }
  }

  const heavy = resources
    .filter((r) => r.type === "image" && r.bytes > 300_000)
    .sort((a, b) => b.bytes - a.bytes);
  if (resources.some((r) => r.type === "image")) {
    if (heavy.length === 0) c.pass("images", "No oversized image files", 2);
    else
      c.flag("images", "No oversized image files", 2, "warn", {
        issue: `${heavy.length} image(s) over 300 KB.`,
        why: "Image bytes dominate page weight on most sites — the cheapest big LCP win available.",
        fix: "Resize to the displayed dimensions and serve WebP/AVIF — typically 60–90% smaller.",
        specifics: heavy.slice(0, 5).map((r) => `${shortName(r.url)} — ${Math.round(r.bytes / 1024)} KB`),
      });
  }
}

function runIndexabilityChecks(
  c: Checks,
  html: string,
  headers: Headers,
  nav: Navigation,
  final: URL,
  robots: RobotsData,
  robotsVerdict: { blocked: boolean; rule: string },
  sitemapStatus: "found" | "absent" | "none",
  alpn: string | null
): void {
  if (nav.status === 200) c.pass("indexability", "Page returns HTTP 200", 5);
  else
    c.flag("indexability", "Page returns HTTP 200", 5, "fail", {
      issue: `Final response is HTTP ${nav.status}.`,
      why: "Google drops non-200 pages from the index — whatever content is on this page ranks nowhere.",
      fix: "Make the page answer 200 at a stable URL (or 301 it to its replacement).",
    });

  if (final.protocol === "https:") c.pass("indexability", "Served over HTTPS", 3);
  else
    c.flag("indexability", "Served over HTTPS", 3, "fail", {
      issue: "Page is served over plain HTTP.",
      why: "HTTPS is a (light) ranking signal, and browsers mark HTTP pages 'Not secure' — instant trust killer for visitors.",
      fix: "Install a TLS certificate and 301-redirect all http:// URLs to https://.",
    });

  const metaRobots = metaContent(html, "robots").toLowerCase();
  const xRobots = (headers.get("x-robots-tag") || "").toLowerCase();
  const noindexSource = metaRobots.includes("noindex")
    ? `<meta name="robots" content="${metaRobots}">`
    : xRobots.includes("noindex")
      ? `X-Robots-Tag: ${xRobots} (HTTP header)`
      : "";
  if (!noindexSource) c.pass("indexability", "No noindex", 4);
  else
    c.flag("indexability", "No noindex", 4, "fail", {
      issue: "Page carries a noindex directive.",
      why: "noindex removes the page from Google entirely — the most severe on-page issue possible. Usually a staging-config leftover.",
      fix: "Remove the noindex directive if this page should rank.",
      specifics: [noindexSource],
    });

  if (robotsVerdict.blocked)
    c.flag("indexability", "robots.txt allows this page", 3, "fail", {
      issue: "robots.txt blocks this URL for Googlebot.",
      why: "Google can't even crawl the page, so it can't see the content — at best the bare URL appears with no snippet.",
      fix: "Remove or narrow that Disallow rule in robots.txt.",
      specifics: [robotsVerdict.rule],
    });
  else {
    c.pass("indexability", "robots.txt allows this page", 3);
    if (!robots.fetched)
      c.info("indexability", "robots.txt exists", {
        issue: "No robots.txt found.",
        why: "Everything is crawlable by default (fine), but robots.txt is also where you declare your sitemap — free discovery you're skipping.",
        fix: "Add a robots.txt with a `Sitemap: https://…/sitemap.xml` line.",
      });
  }

  const hops = nav.chain.length - 1;
  if (hops <= 1) c.pass("indexability", "Short redirect chain", 2);
  else
    c.flag("indexability", "Short redirect chain", 2, "warn", {
      issue: `${hops} redirect hops before the final URL.`,
      why: "Each hop wastes crawl budget and leaks link equity; Google may stop following long chains entirely.",
      fix: "Redirect straight to the final URL in one hop, and update internal links to point at the final URL directly.",
      specifics: nav.chain.map((h) => `${h.status} ${h.url}`),
    });

  if (sitemapStatus === "found") c.pass("indexability", "URL listed in sitemap.xml", 2);
  else if (sitemapStatus === "absent")
    c.flag("indexability", "URL listed in sitemap.xml", 2, "warn", {
      issue: "A sitemap exists but this URL isn't in it.",
      why: "Sitemaps drive discovery and recrawl priority — pages missing from it get found later and revisited less often.",
      fix: "Add the URL to the sitemap (or fix the generator that builds it).",
    });
  else
    c.flag("indexability", "URL listed in sitemap.xml", 2, "warn", {
      issue: "No sitemap.xml found for the site.",
      why: "Without a sitemap Google discovers pages only by following links — new or deep pages can take weeks to be found.",
      fix: "Generate a sitemap.xml, serve it at /sitemap.xml, and declare it in robots.txt.",
    });

  if (alpn !== null) {
    if (alpn === "h2") c.pass("indexability", "HTTP/2 enabled", 1);
    else
      c.flag("indexability", "HTTP/2 enabled", 1, "warn", {
        issue: `Server negotiated ${alpn || "HTTP/1.1"}.`,
        why: "HTTP/2 multiplexes many requests over one connection — noticeably faster asset loading on mobile.",
        fix: "Enable HTTP/2 on the server/CDN (usually a one-line config once TLS is in place).",
        severity: "info",
      });
  }
}

function runLinkChecks(
  c: Checks,
  html: string,
  links: Array<{ href: string; text: string }>,
  final: URL,
  broken: { checked: number; broken: BrokenLink[] }
): void {
  if (broken.checked > 0) {
    if (broken.broken.length === 0) c.pass("links", "No broken internal links", 3);
    else {
      const real = broken.broken.filter((b) => b.status !== null);
      c.flag("links", "No broken internal links", 3, real.length > 0 ? "fail" : "warn", {
        issue: `${broken.broken.length} of ${broken.checked} sampled internal links failed.`,
        why: "404s waste crawl budget, drop the link equity flowing through them, and are a poor-quality signal to both Google and users.",
        fix: "Fix or remove the links below.",
        specifics: broken.broken.slice(0, 6).map((b) => `${b.url} → ${b.status ?? "unreachable"}`),
      });
    }
  }

  if (links.length > 0) {
    const GENERIC = new Set([
      "click here","here","read more","learn more","more","link","this","details","see more",
      "tıkla","tıklayın","buraya tıklayın","devamını oku","devamı","daha fazla","incele",
    ]);
    const generic = links.filter((l) => GENERIC.has(l.text.toLowerCase()));
    if (generic.length === 0) c.pass("links", "Descriptive anchor text", 1);
    else
      c.flag("links", "Descriptive anchor text", 1, "warn", {
        issue: `${generic.length} link(s) use generic anchor text.`,
        why: "Anchor text tells Google what the destination page is about — 'click here' throws that relevance signal away.",
        fix: "Use anchor text that names the destination ('web design pricing' beats 'click here').",
        specifics: generic.slice(0, 5).map((l) => `"${l.text}" → ${pathOf(l.href)}`),
        severity: "info",
      });
  }

  if (final.protocol === "https:") {
    const mixed = [...html.matchAll(/\ssrc=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]);
    if (mixed.length === 0) c.pass("links", "No insecure http:// subresources", 1);
    else
      c.flag("links", "No insecure http:// subresources", 1, "warn", {
        issue: `${mixed.length} subresource(s) loaded over http:// on an https page.`,
        why: "Browsers block or warn on mixed content — a blocked script/image breaks the page Google renders and indexes.",
        fix: "Change those src URLs to https:// and fix the underlying assets.",
        specifics: mixed.slice(0, 5),
      });
  }
}

function runSchemaChecks(c: Checks, html: string): void {
  const blocks = allMatches(
    html,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (blocks.length === 0) {
    c.flag("schema", "Structured data present", 3, "warn", {
      issue: "No JSON-LD structured data on the page.",
      why: "Structured data unlocks rich results — star ratings, FAQ dropdowns, business info panels — which take more SERP space and win more clicks at the same ranking position.",
      fix: "Add a JSON-LD block: LocalBusiness/Organization with name, address, phone, opening hours — or Product/FAQPage/Service as fits the page.",
    });
    return;
  }
  c.pass("schema", "Structured data present", 3);

  const types: string[] = [];
  let invalid = 0;
  const errors: string[] = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.trim()) as unknown;
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        const t = (node as Record<string, unknown>)?.["@type"];
        if (typeof t === "string") types.push(t);
        else if (Array.isArray(t)) types.push(...t.filter((x): x is string => typeof x === "string"));
      }
    } catch (err) {
      invalid++;
      if (errors.length < 3)
        errors.push(`block starting "${block.trim().slice(0, 60)}…": ${err instanceof Error ? err.message : "parse error"}`);
    }
  }
  if (invalid === 0)
    c.pass("schema", `JSON-LD parses${types.length ? ` (${[...new Set(types)].slice(0, 5).join(", ")})` : ""}`, 2);
  else
    c.flag("schema", "JSON-LD parses", 2, "fail", {
      issue: `${invalid} of ${blocks.length} JSON-LD block(s) contain invalid JSON.`,
      why: "Google silently ignores unparseable blocks — a single trailing comma voids the whole thing and you lose the rich-result eligibility.",
      fix: "Fix the JSON (validate at search.google.com/test/rich-results).",
      specifics: errors,
    });
}

/* ------------------------------------------------------------------------ */
/* Scoring + assembly                                                       */
/* ------------------------------------------------------------------------ */

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
const CREDIT: Record<Status, number> = { pass: 1, warn: 0.5, fail: 0 };

function categoryScores(outcomes: CheckOutcome[]): { scores: CategoryScore[]; overall: number } {
  const scores: CategoryScore[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const [id, meta] of Object.entries(CATEGORIES) as Array<[CategoryId, { label: string; weight: number }]>) {
    const checks = outcomes.filter((o) => o.category === id && o.weight > 0);
    const wTotal = checks.reduce((s, o) => s + o.weight, 0);
    if (wTotal === 0) {
      scores.push({ category: id, label: meta.label, score: null });
      continue;
    }
    const earned = checks.reduce((s, o) => s + o.weight * CREDIT[o.status], 0);
    const score = Math.round((earned / wTotal) * 100);
    scores.push({ category: id, label: meta.label, score });
    weightedSum += score * meta.weight;
    weightTotal += meta.weight;
  }
  return { scores, overall: weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0 };
}

function assemblePage(
  url: string,
  finalUrl: string,
  httpStatus: number,
  rendered: RenderedData | null,
  resources: ResourceInfo[],
  c: Checks,
  error?: string
): PageResult {
  const { scores, overall } = categoryScores(c.outcomes);
  const totalBytes = resources.reduce((s, r) => s + r.bytes, 0);
  return {
    url,
    finalUrl,
    httpStatus,
    renderOk: rendered !== null,
    score: overall,
    categories: scores,
    metrics: {
      ttfbMs: rendered?.ttfbMs || null,
      lcpMs: rendered?.lcpMs || null,
      cls: rendered ? rendered.cls : null,
      loadMs: rendered?.loadMs || null,
      pageWeightBytes: resources.length ? totalBytes : null,
      requestCount: resources.length || null,
    },
    ...(error ? { error } : {}),
  };
}

/* Merge per-page outcomes into one site report: identical checks group by
   label, keeping the worst severity, the pages affected, and the specifics
   from each page ([path]-prefixed when more than one page was audited). */
function assembleSiteReport(
  inputUrl: string,
  siteHost: string,
  maxPages: number,
  audits: PageAudit[]
): AuditReport {
  const pages = audits.map((a) => a.result);
  const total = pages.length;

  // Site category scores: mean of page category scores where applicable.
  const categories: CategoryScore[] = (Object.entries(CATEGORIES) as Array<[CategoryId, { label: string }]>).map(
    ([id, meta]) => {
      const vals = pages
        .map((p) => p.categories.find((cs) => cs.category === id)?.score)
        .filter((v): v is number => typeof v === "number");
      return {
        category: id,
        label: meta.label,
        score: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      };
    }
  );
  const score = total ? Math.round(pages.reduce((s, p) => s + p.score, 0) / total) : 0;

  // Group issues across pages by check label.
  interface Group {
    outcome: CheckOutcome;
    severity: Severity;
    pages: string[];
    specifics: string[];
  }
  const groups = new Map<string, Group>();
  const flaggedLabels = new Set<string>();
  const passedLabels = new Set<string>();

  for (const audit of audits) {
    const path = pathOf(audit.result.finalUrl);
    for (const o of audit.outcomes) {
      if (o.status === "pass") {
        passedLabels.add(o.label);
        continue;
      }
      flaggedLabels.add(o.label);
      let g = groups.get(o.label);
      if (!g) {
        g = { outcome: o, severity: o.severity, pages: [], specifics: [] };
        groups.set(o.label, g);
      }
      if (SEVERITY_ORDER[o.severity] < SEVERITY_ORDER[g.severity]) {
        g.severity = o.severity;
        g.outcome = o; // keep the worst page's wording/evidence as the lead
      }
      if (!g.pages.includes(path)) g.pages.push(path);
      for (const spec of o.specifics) {
        if (g.specifics.length >= 12) break;
        g.specifics.push(total > 1 ? `[${path}] ${spec}` : spec);
      }
    }
  }

  const categoryOrder = Object.keys(CATEGORIES) as CategoryId[];
  const findings: Finding[] = [...groups.values()]
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.pages.length - a.pages.length ||
        categoryOrder.indexOf(a.outcome.category) - categoryOrder.indexOf(b.outcome.category)
    )
    .map((g) => ({
      category: g.outcome.category,
      label: g.outcome.label,
      severity: g.severity,
      issue:
        total > 1 && g.pages.length > 1
          ? `On ${g.pages.length} of ${total} pages — ${g.outcome.issue}`
          : g.outcome.issue,
      why: g.outcome.why,
      fix: g.outcome.fix,
      specifics: g.specifics,
      pages: g.pages,
    }));

  return {
    url: inputUrl,
    siteHost,
    fetchedAt: new Date().toISOString(),
    maxPages,
    pages,
    score,
    categories,
    findings,
    passed: [...passedLabels].filter((l) => !flaggedLabels.has(l)),
  };
}

/* Last path segment (or host) — keeps evidence lines short. */
function shortName(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg ? seg.slice(0, 50) : u.hostname;
  } catch {
    return url.slice(0, 50);
  }
}
