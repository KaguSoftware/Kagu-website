import type { Browser } from "playwright";
import { launchBrowser } from "./browser.js";
import { config } from "./config.js";
import { auditSite, type AuditReport } from "./audit.js";
import { fetchGscQueries, strikingDistance, type GscRow } from "./gsc.js";
import {
  allMatches,
  decodeEntities,
  fetchPageText,
  firstMatch,
  metaContent,
  scrapeOrganicResults,
  stripTags,
  visibleText,
  type PageText,
} from "./seo.js";

/*
  strategy.ts — "give me a URL, get back the prompt that makes it rank."

  The full pipeline, given a start URL:

    1. READ the site itself (homepage + the most business-relevant internal
       pages by path heuristics, plain fetch; one unthrottled browser render
       of the homepage as fallback for JS-only sites) and have Groq state
       what the business actually IS from the on-page content — sector,
       offerings, problems solved, audience, market — not from any README
       or prior brand knowledge.
    2. GENERATE the searches its customers would type, across all four
       intents (informational / commercial / transactional / navigational),
       in the site's own language(s) — anchored to the site's own
       top-of-page wording (titles/headings), so what the site leads with
       can't be paraphrased out of the plan.
    3. CHECK each search against the live SERP (seo.ts: Serper/Google when
       keyed, DuckDuckGo fallback) in the site's own market country (`gl`):
       who ranks, whether this site appears at all, Google's People Also
       Ask / related searches / answer box, and what shape the winning
       pages take (headings, length, H2 count, FAQ/HowTo schema, prices,
       freshness). Alongside each check, pull REAL TYPED DEMAND from Google
       Autocomplete (query + shortened-seed + question-word probes) — free
       validation the LLM's imagination lacks.
    4. STRATEGIZE (Groq): head keywords worth owning — each graded for
       winnability against the current SERP (a low-authority site should
       fight where forums/UGC rank, not where established brands do) — plus
       a page plan where every page owns one intent cluster of long-tail
       queries sourced from the autocomplete demand first, mapped to "update
       this existing path" or "create this slug". A code-level
       near-duplicate pass then guarantees no query is targeted by two pages
       (LLMs love repeating themselves).
    5. AUDIT the site with audit.ts (throttled mobile render, all ten
       categories, AEO included) so every technical fix ships inside the
       same deliverable.
    6. COMPOSE the deliverable: one self-contained master prompt (markdown)
       for a coding agent — pages to build with titles/outlines/FAQs,
       AI-Overview-friendly writing rules (answer-first, liftable
       sentences), the audit fixes, robots.txt / llms.txt / sitemap /
       JSON-LD setup, and anti-duplication rules.

  Unlike seo.ts's optional refine pass, Groq is REQUIRED here — the
  understanding/strategy passes are the tool. No key = clear error up front.
  Like the other tools this is standalone (run via `npm run seo:strategy`),
  writes nothing to the DB, and needs no Supabase creds. MOCK_MODE returns a
  deterministic report (exercising the real prompt assembly) offline.
*/

/* ------------------------------------------------------------------------ */
/* Report types                                                             */
/* ------------------------------------------------------------------------ */

export type Intent = "informational" | "commercial" | "transactional" | "navigational";
const INTENTS: Intent[] = ["informational", "commercial", "transactional", "navigational"];

export interface SiteUnderstanding {
  brand: string;
  sector: string;
  subSector: string;
  coreValueProposition: string; // the one thing the business leads with
  languages: string[]; // primary first, e.g. ["tr", "en"]
  audience: string;
  locations: string;
  /* ISO 3166-1 alpha-2, lowercase — the Google `gl` for every SERP check,
     market scan and rank snapshot of this site. Derived from `locations`
     (global sites fall back to config.seoRegion). */
  marketCountry: string;
  offerings: string[];
  problemsSolved: string[];
  differentiators: string[];
  intentNotes: Record<Intent, string>; // what the site offers each intent today
}

export interface CandidateSearch {
  query: string;
  intent: Intent;
  language: string;
  why: string;
}

/* Content-shape features of one top-ranking page — what "winning" looks like
   for this query, so the page plan copies the shape rather than guessing. */
export interface WinnerProfile {
  rank: number;
  title: string;
  headings: string; // h1–h3 joined, truncated
  wordCount: number;
  h2Count: number;
  hasFaqSchema: boolean; // FAQPage JSON-LD
  hasHowToSchema: boolean; // HowTo JSON-LD
  hasPriceSignals: boolean; // currency symbols / "fiyat" / "price" + numbers in the body
  publishedDate: string | null; // article:published_time / datePublished, ISO or null
}

export interface SerpEvidence {
  query: string;
  intent: Intent;
  language: string;
  siteRank: number | null; // where the target site ranks, null = not in top results
  results: Array<{ rank: number; title: string; domain: string }>;
  winners: WinnerProfile[]; // content shape of the top pages
  suggestions: string[]; // real typed queries from Google Autocomplete for this topic
  /* Google's own SERP features (Serper only; empty under DuckDuckGo). */
  peopleAlsoAsk: Array<{ question: string; snippet: string; link: string }>;
  relatedSearches: string[];
  answerBox: { title: string; snippet: string; link: string } | null; // featured snippet — the AEO target
  error?: string; // SERP fetch failed (rate limit etc.) — evidence missing, not fatal
}

export type Winnability = "easy" | "medium" | "hard";

export interface HeadKeyword {
  keyword: string;
  intent: Intent;
  winnability: Winnability; // judged from who currently ranks, assuming low domain authority
  rationale: string;
}

export interface FaqItem {
  question: string;
  answerGuidance: string; // the facts the answer's first sentence must state
}

export interface PagePlan {
  action: "create" | "update";
  slug: string; // for "update": the existing path
  title: string; // ≤60 chars, head keyword first
  metaDescription: string; // 70–160 chars
  pageType: string; // landing | service | pricing | comparison | faq | guide | blog
  intent: Intent;
  language: string;
  headKeyword: string;
  /* The verified queries (SERP-checked, autocomplete, Search Console) the
     planner assigned exclusively to this page. The measurement loop sums
     Search Console impressions over these to tell whether the page moved. */
  clusterQueries: string[];
  /* Representative queries in this page's intent cluster — demand evidence
     and dedup keys, NOT strings to paste. Modern retrieval matches meaning;
     the page must cover the cluster's meaning, not echo these verbatim. */
  tailQueries: string[];
  entities: string[]; // concepts/attributes the page must cover for full topical coverage
  faq: FaqItem[];
  outline: string[]; // H2s, several directly addressing the cluster's questions
}

/* A business ranking for the money searches — its site crawled and profiled
   so the plan can respond to what it targets and where it is thin. Sourced
   from commercial/transactional SERPs only: informational winners are
   content sites and the navigational SERP is the brand itself, neither is
   "the same business". */
export interface CompetitorProfile {
  domain: string;
  bestRank: number;
  appearsFor: string[]; // the money searches it ranked for
  pagesRead: number; // homepage + priority internal pages crawled
  summary: string; // what it sells and to whom, from its own pages
  keywordsTargeted: string[]; // topics its titles/headings visibly target
  angles: string[]; // the selling points it leads with
  gaps: string[]; // what it does NOT cover — openings the target can own
}

/* The market read across every crawled competitor — built from the money
   SERPs PLUS dedicated market-scan searches, so it maps the market rather
   than just whoever happened to rank for the checked queries. */
export interface MarketOverview {
  scanQueries: string[]; // extra provider-finding searches swept for discovery
  summary: string; // one-paragraph read of the market
  tableStakes: string[]; // what everyone in the market offers/claims
  standardAngles: string[]; // selling points that repeat across the market
  openings: string[]; // underserved needs the target can own
}

export interface StrategyReport {
  url: string;
  host: string;
  fetchedAt: string;
  understanding: SiteUnderstanding;
  searchesChecked: SerpEvidence[];
  gsc: GscRow[] | null; // the site's own Search Console queries; null = not configured
  competitors: CompetitorProfile[];
  market: MarketOverview | null; // null = stage failed or found nothing
  headKeywords: HeadKeyword[];
  pages: PagePlan[];
  duplicatesRemoved: number; // near-duplicate queries/pages pruned after the LLM pass
  audit: AuditReport | null; // null = skipped or failed
  prompt: string; // the master prompt — the actual deliverable
}

/* ------------------------------------------------------------------------ */
/* Entry point                                                              */
/* ------------------------------------------------------------------------ */

export interface StrategyOptions {
  serpQueries?: number; // candidate searches checked against the live SERP
  sitePages?: number; // site pages read for understanding
  auditPages?: number; // embedded audit crawl cap; 0 = skip the audit
  /* Owner-supplied ground truth (CLI --context) — what the business wants to
     be known for, when the site's own copy under-communicates it. Injected
     into the understanding and strategy passes and surfaced in the brief. */
  ownerNotes?: string;
  winners?: number; // top-ranking pages profiled per SERP check (default config.seoStrategyWinners)
  /* Called after each coarse step (understanding, each SERP check, plan,
     each audited page) — lets a future DB-driven job report progress and
     abort (by throwing) on cancellation, exactly like the other tools. */
  onProgress?: (done: number, total: number) => Promise<void> | void;
}

export async function buildSeoStrategy(
  inputUrl: string,
  opts: StrategyOptions = {}
): Promise<StrategyReport> {
  if (config.mockMode) return mockStrategy(inputUrl);
  if (!config.groqApiKey) {
    throw new Error(
      "GROQ_API_KEY is required for the strategy tool — site understanding and keyword generation are LLM passes."
    );
  }

  const serpQueries = opts.serpQueries ?? config.seoStrategySerpQueries;
  const sitePages = opts.sitePages ?? config.seoStrategySitePages;
  const auditPages = opts.auditPages ?? config.seoStrategyAuditPages;
  const winnersPerQuery = Math.max(0, Math.min(5, opts.winners ?? config.seoStrategyWinners));
  suggestionCache.clear(); // per-run only — a fresh run must re-probe autocomplete

  const totalSteps = 2 + serpQueries + 2 + auditPages; // + competitor stage + plan
  let step = 0;
  const tick = async () => {
    step = Math.min(step + 1, totalSteps);
    await opts.onProgress?.(step, totalSteps); // may throw to cancel
  };

  const url = normalizeInputUrl(inputUrl);
  console.log(`[strategy] reading ${url} …`);
  const site = await readSite(url, sitePages);
  await tick();

  // The site's own Search Console data — the strongest demand evidence in
  // the whole pipeline when configured, a one-line skip when not. Transient
  // network failures happen under the LaunchAgent (seen live), so retry once.
  let gsc: GscRow[] | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      gsc = await fetchGscQueries(site.host);
      if (gsc) {
        console.log(
          `[strategy] Search Console: ${gsc.length} real queries, ` +
            `${strikingDistance(gsc).length} in striking distance (pos 8–30)`
        );
      } else {
        console.log("[strategy] Search Console not configured — skipping (worker/README.md shows setup)");
      }
      break;
    } catch (err) {
      console.warn(
        `[strategy] Search Console fetch failed (attempt ${attempt}):`,
        err instanceof Error ? err.message : err
      );
      if (attempt === 1) await sleep(2000);
    }
  }

  console.log(`[strategy] understanding ${site.host} from ${site.pages.length} page(s) …`);
  const understanding = await understandSite(site, opts.ownerNotes);
  await tick();
  console.log(
    `[strategy] ${understanding.brand || site.host} — ${understanding.sector}` +
      (understanding.subSector ? ` / ${understanding.subSector}` : "") +
      ` · market ${understanding.marketCountry.toUpperCase()}`
  );

  const candidates = await proposeSearches(understanding, topOfPageCopy(site));
  const vetted = await vetSearches(candidates, understanding);
  const picked = pickBalanced(vetted, serpQueries);
  console.log(
    `[strategy] checking ${picked.length} searches against the SERP (gl=${understanding.marketCountry}, ` +
      `${winnersPerQuery} winner page(s) profiled each) …`
  );

  const evidence: SerpEvidence[] = [];
  for (const search of picked) {
    const e = await checkSerp(search, site.host, understanding.marketCountry, winnersPerQuery);
    evidence.push(e);
    console.log(
      `[strategy]   "${e.query}" → ${e.error ? `SERP failed (${e.error})` : e.siteRank ? `we rank #${e.siteRank}` : "not in top results"}`
    );
    await tick();
    await sleep(rand(1500, 3500)); // pace SERP queries — DDG rate-limits bursts
  }

  // Map the market: money-SERP domains + dedicated provider-finding scans,
  // deep-crawled and profiled. Never fatal: a run without market intel is
  // still a full strategy.
  let competitors: CompetitorProfile[] = [];
  let market: MarketOverview | null = null;
  try {
    console.log("[strategy] mapping the market (money SERPs + provider scans) …");
    const mapped = await mapMarket(site.host, understanding, evidence, async () => {
      await opts.onProgress?.(step, totalSteps); // keeps cancellation live mid-crawl
    });
    competitors = mapped.competitors;
    market = mapped.market;
  } catch (err) {
    console.warn(
      "[strategy] market mapping failed — continuing without it:",
      err instanceof Error ? err.message : err
    );
  }
  await tick();

  console.log("[strategy] building keyword strategy + page plan …");
  const plan = await buildPlan(understanding, evidence, site.paths, competitors, market, opts.ownerNotes, gsc, async () => {
    // Same step re-reported: keeps DB progress fresh and cancellation live
    // through the minutes-long, TPM-paced planning stage.
    await opts.onProgress?.(step, totalSteps);
  });
  const duplicatesRemoved = dedupePlan(plan.pages);
  if (duplicatesRemoved > 0) {
    console.log(`[strategy] pruned ${duplicatesRemoved} near-duplicate quer(y/ies)/page(s)`);
  }
  // The LLM paraphrases instead of copying the verified queries (observed
  // live: 33 collected, 1 used) — so the code assigns them, not the model.
  const adopted = adoptVerifiedDemand(plan.pages, evidence);
  if (adopted.tails + adopted.faqs > 0) {
    console.log(
      `[strategy] adopted ${adopted.tails} verified autocomplete quer(y/ies) as tails and ` +
        `${adopted.faqs} People-Also-Ask question(s) as FAQ entries`
    );
  }
  await tick();

  let audit: AuditReport | null = null;
  if (auditPages > 0) {
    console.log(`[strategy] running technical audit (max ${auditPages} pages) …`);
    try {
      audit = await auditSite(url, {
        maxPages: auditPages,
        onProgress: async () => {
          await tick();
        },
      });
    } catch (err) {
      console.warn(
        "[strategy] audit failed — prompt will note it was skipped:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const prompt = composePrompt({
    url: site.url,
    host: site.host,
    u: understanding,
    evidence,
    competitors,
    market,
    heads: plan.headKeywords,
    pages: plan.pages,
    audit,
    ownerNotes: opts.ownerNotes,
    gsc,
  });

  return {
    url: site.url,
    host: site.host,
    fetchedAt: new Date().toISOString(),
    understanding,
    searchesChecked: evidence,
    gsc,
    competitors,
    market,
    headKeywords: plan.headKeywords,
    pages: plan.pages,
    duplicatesRemoved,
    audit,
    prompt,
  };
}

/* ------------------------------------------------------------------------ */
/* 1. Read the site itself                                                  */
/* ------------------------------------------------------------------------ */

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface SiteData {
  url: string; // final homepage URL after redirects
  host: string; // www-stripped
  origin: string;
  pages: PageText[]; // homepage first
  paths: string[]; // known site paths (links + sitemap) — fed to the plan pass
}

async function readSite(startUrl: string, maxPages: number): Promise<SiteData> {
  const res = await fetch(startUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": DESKTOP_UA, "accept-language": "en;q=0.9" },
  });
  if (!res.ok) throw new Error(`Could not fetch ${startUrl}: HTTP ${res.status}`);
  const finalUrl = res.url || startUrl;
  const parsed = new URL(finalUrl);
  const host = parsed.hostname.replace(/^www\./, "");
  const html = (await res.text()).slice(0, 1_500_000);

  // Homepage digest from the HTML we already have.
  const pages: PageText[] = [
    {
      url: finalUrl,
      title: stripTags(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
      metaDescription: metaContent(html, "description"),
      metaKeywords: metaContent(html, "keywords"),
      headings: allMatches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)
        .map(stripTags)
        .join(" . "),
      body: visibleText(html),
    },
  ];

  // Candidate internal pages: homepage links + sitemap, best-for-understanding
  // first (about/services/pricing/FAQ tell us what the business is; deep blog
  // posts don't).
  const candidates = new Map<string, string>(); // path → url
  for (const u of [...extractLinks(html, finalUrl, host), ...(await sitemapLocs(parsed.origin))]) {
    try {
      const cu = new URL(u);
      if (cu.hostname.replace(/^www\./, "") !== host) continue;
      const path = cu.pathname.replace(/\/$/, "") || "/";
      if (path !== "/" && !candidates.has(path)) candidates.set(path, u);
    } catch {
      /* unparseable */
    }
  }
  const ordered = [...candidates.entries()].sort((a, b) => pageScore(b[0]) - pageScore(a[0]));

  for (const [, u] of ordered) {
    if (pages.length >= Math.max(1, maxPages)) break;
    const p = await fetchPageText(u);
    if (p && (p.body.length > 80 || p.headings)) pages.push(p);
    await sleep(rand(300, 800)); // polite pacing on the target's own server
  }

  // JS-only sites serve near-empty static HTML — render the homepage once
  // (unthrottled; we want its text, not its metrics) and use that as body.
  if (pages.reduce((s, p) => s + p.body.length, 0) < 600) {
    console.log("[strategy] static text too thin — rendering homepage in a browser …");
    const renderedBody = await renderHomepageText(finalUrl);
    if (renderedBody) pages[0] = { ...pages[0], body: renderedBody };
  }

  return {
    url: finalUrl,
    host,
    origin: parsed.origin,
    pages,
    paths: ["/", ...candidates.keys()].slice(0, 60),
  };
}

/* Same-host page links, assets skipped — the static-link subset of what
   audit.ts collects, kept local to avoid exporting its internals. */
function extractLinks(html: string, baseUrl: string, host: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    if (out.length >= 200) break;
    try {
      const u = new URL(decodeEntities(m[1]), baseUrl);
      if (!/^https?:$/.test(u.protocol) || u.hostname.replace(/^www\./, "") !== host) continue;
      if (/\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|mp3|mp4|webm|zip|rar|gz|xml|json|txt|woff2?|ttf|eot)$/i.test(u.pathname)) continue;
      u.hash = "";
      const s = u.toString();
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    } catch {
      /* unparseable href */
    }
  }
  return out;
}

async function sitemapLocs(origin: string): Promise<string[]> {
  const fetchXml = async (u: string): Promise<string | null> => {
    try {
      const r = await fetch(u, {
        signal: AbortSignal.timeout(10000),
        headers: { "user-agent": DESKTOP_UA },
      });
      return r.ok ? (await r.text()).slice(0, 2_000_000) : null;
    } catch {
      return null;
    }
  };
  const xml = await fetchXml(`${origin}/sitemap.xml`);
  if (!xml) return [];
  const texts = [xml];
  if (/<sitemapindex/i.test(xml)) {
    for (const child of allMatches(xml, /<loc>\s*([^<\s]+)\s*<\/loc>/gi).slice(0, 3)) {
      const childXml = await fetchXml(child.trim());
      if (childXml) texts.push(childXml);
    }
  }
  return texts
    .flatMap((t) => allMatches(t, /<loc>\s*([^<\s]+)\s*<\/loc>/gi))
    .map((l) => decodeEntities(l.trim()))
    .slice(0, 300);
}

/* Paths that explain the business outrank paths that don't. Mixed EN/TR
   because the Istanbul market means either language on any given site. */
const PRIORITY_PATH =
  /about|hakk|service|hizmet|solution|çözüm|cozum|product|ürün|urun|pricing|fiyat|plan|paket|faq|sss|feature|özellik|ozellik|industr|sektör|sektor|case|work|portfolio|referans|project|proje|contact|iletisim|iletişim/i;

function pageScore(path: string): number {
  let s = 0;
  if (PRIORITY_PATH.test(path)) s += 10;
  if (/blog|news|haber|makale/i.test(path)) s -= 3;
  s -= path.split("/").filter(Boolean).length; // shallow beats deep
  return s;
}

async function renderHomepageText(url: string): Promise<string> {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    // Same tsx/esbuild `__name` guard as browser.ts — must be a string.
    await context.addInitScript("globalThis.__name = globalThis.__name || ((fn) => fn);");
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    const text = await page.evaluate(() => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const g = globalThis as any;
      return ((g.document.body && g.document.body.innerText) || "") as string;
    });
    return text.replace(/\s+/g, " ").trim().slice(0, 8000);
  } catch (err) {
    console.warn(
      "[strategy] homepage render fallback failed:",
      err instanceof Error ? err.message : err
    );
    return "";
  } finally {
    await browser?.close().catch(() => {});
  }
}

/* ------------------------------------------------------------------------ */
/* Groq passes                                                              */
/* ------------------------------------------------------------------------ */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/* Groq's on-demand tier caps the model at 12k tokens per minute, counted
   as prompt tokens + the completion cap (seen live as HTTP 413). Rather than
   praying single calls fit, every call passes this gate: a rolling 60s
   window that sleeps until the next window when the budget would overflow.
   Combined with the chunked strategy pass below, big jobs simply spread over
   two-or-so minutes instead of failing. */
/* Groq's on-demand tier enforces 8,000 tokens/minute for gpt-oss-120b (seen
   live as a 429: "Limit 8000, Used 2986, Requested 5043"). Budget under it;
   GROQ_TPM_LIMIT raises it for a paid tier. */
const GROQ_TPM_BUDGET = Math.round((Number(process.env.GROQ_TPM_LIMIT) || 8000) * 0.9);

let tpmWindowStart = 0;
let tpmWindowTokens = 0;

/* 3 chars/token, not the English 3.5–4: Turkish and Arabic tokenise worse,
   and an undercount here shows up as a 429 + 60s retry (seen live: "Used
   7011, Requested 2081" after the gate had let the call through). */
function estimateTokens(prompt: string, maxTokens: number): number {
  return Math.ceil(prompt.length / 3) + maxTokens;
}

async function tpmGate(cost: number): Promise<void> {
  const now = Date.now();
  if (now - tpmWindowStart >= 60_000) {
    tpmWindowStart = now;
    tpmWindowTokens = 0;
  }
  if (tpmWindowTokens + cost > GROQ_TPM_BUDGET) {
    const wait = 60_000 - (now - tpmWindowStart) + 1000;
    console.log(`[strategy] Groq TPM pacing — waiting ${Math.ceil(wait / 1000)}s before the next call`);
    await sleep(wait);
    tpmWindowStart = Date.now();
    tpmWindowTokens = 0;
  }
  tpmWindowTokens += cost;
}

async function groqJson<T>(label: string, prompt: string, maxTokens: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await tpmGate(estimateTokens(prompt, maxTokens));
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.groqApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.groqModel,
          ...config.groqExtraParams,
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`Groq API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      if (data.usage) {
        console.log(
          `[strategy] Groq ${label}: ${data.usage.prompt_tokens ?? "?"} in / ${data.usage.completion_tokens ?? "?"} out tokens`
        );
      }
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq response had no message content");
      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[strategy] Groq ${label} attempt ${attempt} failed:`, msg);
      // Rate-limited despite the gate (estimate ran low) — wait a window out.
      if (attempt < 2 && /Groq API (413|429)/.test(msg)) await sleep(35_000);
    }
  }
  throw new Error(
    `Groq ${label} pass failed twice: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

/* Loose-JSON coercion helpers — Groq's JSON mode guarantees syntax, not shape. */
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];
/* The model is asked for ISO codes but emits "turkish" / "tr-TR" often
   enough; the value goes straight to Google as `hl`, so anything that isn't
   two letters is dropped and the caller's default applies. */
function langCode(raw: string): string {
  const m = raw.trim().toLowerCase().match(/^([a-z]{2})(?:[-_][a-z]{2,4})?$/);
  return m ? m[1] : "";
}

function asIntent(v: unknown): Intent {
  const s = str(v).toLowerCase();
  return (INTENTS as string[]).includes(s) ? (s as Intent) : "informational";
}

async function understandSite(site: SiteData, ownerNotes?: string): Promise<SiteUnderstanding> {
  const digests = site.pages
    .map((p) =>
      [
        `PAGE ${pathOf(p.url)}`,
        p.title && `title: ${p.title}`,
        p.metaDescription && `meta: ${p.metaDescription}`,
        p.headings && `headings: ${p.headings.slice(0, 500)}`,
        p.body && `text: ${p.body.slice(0, 1600)}`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n")
    .slice(0, 14000);

  const prompt = `You are a market analyst. Below is the actual on-page content scraped from ${site.host}. Work ONLY from this content — not from any prior knowledge of the brand or domain name.

${digests}
${ownerNotes ? `\nTHE SITE OWNER ADDS THIS CONTEXT (treat it as ground truth and reconcile the scraped content with it):\n${ownerNotes}\n` : ""}
Describe what this business actually is. Respond with STRICT JSON, nothing else:
{
  "brand": "business/brand name as the site presents it",
  "sector": "the industry it operates in",
  "subSector": "the specific niche within that industry",
  "coreValueProposition": "the ONE thing this business leads with and wants to be known for — its hero pitch, not a category label (e.g. 'fully custom-built software per client request' rather than 'software development')",
  "languages": ["site language codes, primary first, e.g. tr, en"],
  "audience": "who buys this — one sentence",
  "locations": "geographic market it serves (city/country), or 'global'",
  "marketCountry": "ISO 3166-1 alpha-2 code of the country most of its customers search from (e.g. tr, de, us) — the country of 'locations', or the primary language's home country when global",
  "offerings": ["each concrete product/service it sells"],
  "problemsSolved": ["each customer problem it fixes, phrased the way the customer would say it"],
  "differentiators": ["what it claims makes it better than alternatives"],
  "intentNotes": {
    "informational": "what the site currently offers a visitor researching the topic",
    "commercial": "what it offers a visitor comparing providers",
    "transactional": "how a visitor ready to buy converts (form, phone, checkout) — or what's missing",
    "navigational": "how clearly the site owns its own brand (title/branding)"
  }
}`;

  const raw = await groqJson<Record<string, unknown>>("understand", prompt, 2048);
  const notes = (raw.intentNotes ?? {}) as Record<string, unknown>;
  return {
    brand: str(raw.brand) || site.host,
    sector: str(raw.sector) || "unknown",
    subSector: str(raw.subSector),
    coreValueProposition: str(raw.coreValueProposition),
    languages: strArr(raw.languages).map((l) => l.toLowerCase()).slice(0, 3) || ["en"],
    audience: str(raw.audience),
    locations: str(raw.locations) || "unspecified",
    marketCountry: /^[a-z]{2}$/i.test(str(raw.marketCountry))
      ? str(raw.marketCountry).toLowerCase()
      : config.seoRegion,
    offerings: strArr(raw.offerings).slice(0, 12),
    problemsSolved: strArr(raw.problemsSolved).slice(0, 12),
    differentiators: strArr(raw.differentiators).slice(0, 8),
    intentNotes: {
      informational: str(notes.informational),
      commercial: str(notes.commercial),
      transactional: str(notes.transactional),
      navigational: str(notes.navigational),
    },
  };
}

/* The site's own top-of-page copy (titles + headings, verbatim) — the words
   the business itself leads with. understandSite abstracts these into a
   category summary, and the searches pass then invents phrasing from that
   abstraction — observed live: a site fronting custom websites with price
   estimation produced zero searches containing "custom website". Feeding the
   literal lines back in pins the generated searches to the site's own words. */
function topOfPageCopy(site: SiteData): string {
  return site.pages
    .slice(0, 8)
    .map((p) => {
      const bits = [p.title, p.headings.slice(0, 300)].filter(Boolean).join(" | ");
      return bits ? `${pathOf(p.url)}: ${bits}` : "";
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 2600);
}

/* How many candidates the LLM over-generates; vetSearches cuts them down to
   the ones real people type, and only those spend a SERP check. */
const CANDIDATE_POOL = 30;

async function proposeSearches(u: SiteUnderstanding, siteCopy: string): Promise<CandidateSearch[]> {
  const primary = u.languages[0] ?? "en";
  const prompt = `You are an SEO strategist. This business:
${JSON.stringify(u, null, 2)}
${siteCopy ? `\nTHE SITE'S OWN TOP-OF-PAGE COPY (titles and headings, verbatim). It is polluted with banner, popup, button, slogan, blog-post and third-party-widget text — use it ONLY to learn what NAMES the business gives its own products/services, never as a source of searches:\n${siteCopy}\n` : ""}
Write ${CANDIDATE_POOL} Google searches that a stranger who has NEVER heard of this brand would type when they need what it sells. Every search must be one a real person plausibly types, in ${u.locations === "global" ? "its main markets" : u.locations} — the searches will be checked on Google for country "${u.marketCountry.toUpperCase()}", so localise place names and local modifiers ("near me", city names such as "istanbul", local currency/price words) to that country.

How real searches look:
- 2–6 words, the way people type into Google: "araç kiralama fiyatları", "cheap car rental istanbul airport", "vize başvurusu nasıl yapılır". No punctuation, no exclamation or question marks, never a full sentence or slogan.
- ONE language per query — never mix languages or scripts inside a query. Write them in ${primary}${u.languages.length > 1 ? ` (and ${u.languages.slice(1).join("/")} only for markets this business really serves in that language)` : ""}; do not invent other languages.
- Name the thing the business sells with the plain words customers use (its offering names above), plus a buyer modifier where natural (price, cost, cheap, best, near me, booking, online, or the ${primary} equivalents) and the place for local services.

Focus: the business's core is "${u.coreValueProposition || u.subSector}". At least two thirds of the searches must be about that core. Anything it merely hosts or resells on the side (partner widgets, affiliate products, add-ons) gets at most 2 searches in total. Non-${primary} searches are at most a quarter of the list.

What to avoid (these made previous runs useless):
- NEVER lift UI text, banner/popup copy, calls to action ("download now", "contact us", "exclusive deals"), blog-post titles, or the names of partner/affiliate products shown in widgets. If the business does not itself sell it, nobody searching it wants this business.
- Brand-name searches are almost never typed for a small brand: include AT MOST 2 navigational searches in total, and only the bare brand name or "brand + what it is" (e.g. "${u.brand}", "${u.brand} reviews"). No "About us", "FAQ", "contact" style navigational searches.
- No competitor brand names. No two searches that mean the same thing.

Mix: about 60% commercial + transactional (comparing, pricing, booking, hiring — the money searches), about 35% informational (the problems it solves, phrased the way a customer says them), and the at-most-2 navigational.

Respond with STRICT JSON, nothing else:
{"searches": [{"query": "...", "intent": "informational|commercial|transactional|navigational", "language": "iso code of the query", "why": "one short clause"}]}`;

  const raw = await groqJson<{ searches?: unknown }>("searches", prompt, 3072);
  const list = Array.isArray(raw.searches) ? raw.searches : [];
  const out: CandidateSearch[] = [];
  for (const item of list) {
    const s = item as Record<string, unknown>;
    const query = str(s.query).replace(/[!?]+$/g, "").trim();
    if (!query) continue;
    out.push({
      query,
      intent: asIntent(s.intent),
      language: langCode(str(s.language)) || primary,
      why: str(s.why),
    });
  }
  if (out.length === 0) throw new Error("Groq returned no usable candidate searches");
  return out;
}

/* Cheap structural filter — queries nobody types: sentence-length, slogan
   punctuation, or two scripts glued together ("… Kezdura موقع التواصل"). */
function looksTypeable(query: string): boolean {
  const words = query.trim().split(/\s+/);
  if (words.length < 2 && !/^\S{3,}$/.test(query.trim())) return false;
  if (words.length > 8 || query.length > 70) return false;
  if (/[!:;]/.test(query)) return false;
  const scripts = new Set<string>();
  if (/\p{Script=Latin}/u.test(query)) scripts.add("latin");
  if (/\p{Script=Arabic}/u.test(query)) scripts.add("arabic");
  if (/\p{Script=Cyrillic}/u.test(query)) scripts.add("cyrillic");
  return scripts.size <= 1;
}

/* Share of the query's own tokens found in a suggestion (fuzzy: plurals etc). */
function queryCoverage(suggestion: string, query: string): number {
  const tq = normalizeQuery(query).split(" ").filter(Boolean);
  const ts = normalizeQuery(suggestion).split(" ").filter(Boolean);
  if (tq.length === 0) return 0;
  return tq.filter((x) => ts.some((y) => fuzzyTokenEq(x, y))).length / tq.length;
}

/* Demand vetting: keep a candidate only if Google autocomplete shows real
   people typing it (or a near variant). Autocomplete is free and takes no
   SERP credit, so the garbage dies here instead of eating checks. One bare
   brand-name search is exempt — it checks whether the site owns its name,
   and a small brand has no autocomplete yet. Fails open: if autocomplete is
   unreachable (no candidate got ANY suggestion) the rule-filtered list is
   returned as-is rather than emptying the run. */

/* Minimum searches vetting hands on. Below this the plan has too little SERP
   evidence to cluster into 5+ heads, so vetting tops up with structurally-clean but unverified candidates. It is a floor,
   not a target — real demand always wins the slots first. */
const VET_FLOOR = 6;

async function vetSearches(
  candidates: CandidateSearch[],
  u: SiteUnderstanding
): Promise<CandidateSearch[]> {
  const typeable: CandidateSearch[] = [];
  for (const c of candidates) {
    if (!looksTypeable(c.query)) {
      console.log(`[strategy]   drop (not how people type): "${c.query}"`);
      continue;
    }
    if (typeable.some((t) => similarQuery(t.query, c.query))) continue;
    typeable.push(c);
  }

  const brand = normalizeQuery(u.brand);
  const kept: CandidateSearch[] = [];
  const dropped: CandidateSearch[] = [];
  let sawAnySuggestion = false;
  let brandExempt = false;

  for (const c of typeable) {
    // Real demand = Google completes THIS query (the suggestion contains
    // essentially all of its words). A suggestion that only echoes a prefix
    // of it is another search, not evidence for this one.
    // Through the run cache: gatherAutocomplete probes this exact query again
    // later for every picked search. One Google attempt (then DDG) here —
    // 30 candidates × the full retry ladder would stall vetting.
    const lang = c.language || config.seoLanguage;
    const sugg = await fetchSuggestions(c.query, lang, 1);
    if (sugg.length) sawAnySuggestion = true;
    const demand = sugg.some((x) => queryCoverage(x, c.query) >= 0.8);
    const isBareBrand = brand !== "" && normalizeQuery(c.query) === brand;
    if (demand) kept.push(c);
    else if (isBareBrand && !brandExempt) {
      brandExempt = true;
      kept.push(c);
    } else {
      // Nobody types the model's phrasing — but they may type its first few
      // words. Ask autocomplete for the shortened prefix and adopt Google's
      // own completion when it still means the same thing: the candidate's
      // intent survives, in words with proven demand. (Seen live: 2/32 kept
      // before this, because gpt-oss writes 6-word Turkish noun phrases.)
      const rewritten = await rewriteFromAutocomplete(c, lang);
      if (rewritten && !kept.some((k) => similarQuery(k.query, rewritten.query))) {
        sawAnySuggestion = true;
        console.log(`[strategy]   rewrote "${c.query}" → "${rewritten.query}" (autocomplete)`);
        kept.push(rewritten);
      } else dropped.push(c);
    }
    await sleep(rand(150, 350));
  }

  if (!sawAnySuggestion) {
    console.warn("[strategy] autocomplete unreachable — skipping demand vetting");
    return typeable;
  }
  console.log(
    `[strategy] demand vetting: ${kept.length}/${typeable.length} searches kept` +
      (dropped.length ? ` — dropped (nobody types these): ${dropped.map((d) => `"${d.query}"`).join(", ")}` : "")
  );
  // Too few survivors makes a thin strategy: top up with the best of the
  // rest (they at least passed the structural filter) up to VET_FLOOR.
  for (const d of dropped) {
    if (kept.length >= VET_FLOOR) break;
    if (d.intent !== "navigational") kept.push(d);
  }
  return kept;
}

/* Prefix ladder: the query minus its last word, then its first three, then
   first two. The first prefix Google completes wins, and the completion that
   keeps the most of the ORIGINAL's words (≥ 60% of them — so "özel butik
   otel yazılımı fiyatları" may become "özel butik otel yazılımı fiyat" but
   never "özel butik otel isimleri") replaces it. */
async function rewriteFromAutocomplete(c: CandidateSearch, lang: string): Promise<CandidateSearch | null> {
  const words = c.query.split(/\s+/);
  const lengths = [...new Set([words.length - 1, 3, 2])].filter((n) => n >= 2 && n < words.length);
  for (const n of lengths) {
    const prefix = words.slice(0, n).join(" ");
    const sugg = await fetchSuggestions(prefix, lang, 1);
    if (!sugg.length) continue;
    // Google sometimes answers a prefix with a reordered or different query
    // ("turkish english bilingual" → "turkish to english google translate");
    // only completions that literally continue the prefix keep its meaning.
    const prefixNorm = normalizeQuery(prefix);
    const best = sugg
      .filter((x) => looksTypeable(x) && normalizeQuery(x).startsWith(prefixNorm))
      .map((x) => ({ x, kept: queryCoverage(x, c.query) }))
      .sort((p, q) => q.kept - p.kept)[0];
    if (best && best.kept >= 0.6) {
      return { ...c, query: best.x, why: `${c.why} (autocomplete rewrite of "${c.query}")` };
    }
  }
  return null;
}

/* Round-robin across intents so a cap of N still touches all four. */
function pickBalanced(candidates: CandidateSearch[], max: number): CandidateSearch[] {
  const byIntent = new Map<Intent, CandidateSearch[]>(INTENTS.map((i) => [i, []]));
  for (const c of candidates) byIntent.get(c.intent)!.push(c);
  const picked: CandidateSearch[] = [];
  for (let round = 0; picked.length < max; round++) {
    let added = false;
    for (const intent of INTENTS) {
      const bucket = byIntent.get(intent)!;
      if (round < bucket.length && picked.length < max) {
        picked.push(bucket[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked;
}

/* ------------------------------------------------------------------------ */
/* 3. Demand + SERP check per candidate search                              */
/* ------------------------------------------------------------------------ */

/* Words that turn a seed into the question-form completions searchers type —
   the AnswerThePublic technique. Google's real People Also Ask arrives with
   every Serper-backed SERP check; question-prefix autocomplete is the free
   fallback that still yields real typed questions under DuckDuckGo. */
const QUESTION_WORDS: Record<string, string[]> = {
  tr: ["nedir", "fiyat"],
  en: ["how", "price"],
  ar: ["ما هو", "سعر"],
};

/* Google's browser-suggest endpoint: no key, no CAPTCHA — it's the API the
   address bar uses. Every suggestion is a query real people actually type,
   which makes this the demand validation the LLM's imagination lacks.
   Deliberately NO browser user-agent here: a Chrome UA without the rest of
   a real browser's fingerprint got the whole run tarpitted (every request
   timing out) in live testing, while a plain client is served in ~100ms. */
async function googleSuggest(query: string, language: string): Promise<string[]> {
  try {
    const url =
      "https://suggestqueries.google.com/complete/search" +
      `?client=firefox&ie=UTF-8&oe=UTF-8&hl=${encodeURIComponent(language)}` +
      `&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    const list =
      Array.isArray(data) && Array.isArray((data as unknown[])[1])
        ? ((data as unknown[])[1] as unknown[])
        : [];
    return list.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  } catch {
    return [];
  }
}

/* Fallback source: DuckDuckGo's autocomplete (Bing-index typed queries) —
   different infrastructure, same class of real-demand evidence. */
async function ddgSuggest(query: string, language: string): Promise<string[]> {
  try {
    const kl = `${language.toLowerCase()}-${language.toLowerCase()}`;
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&kl=${encodeURIComponent(kl)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return (Array.isArray(data) ? data : [])
      .map((item) => (item as { phrase?: unknown })?.phrase)
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  } catch {
    return [];
  }
}

/* In-run suggestion cache: vetSearches and gatherAutocomplete probe the same
   queries. Keyed `${lang}|${normalizedQuery}`; empty results are cached too
   so a tarpitted probe isn't retried. Cleared at the start of every
   buildSeoStrategy run — autocomplete drifts, so it never outlives a run. */
const suggestionCache = new Map<string, string[]>();

async function fetchSuggestions(query: string, language: string, googleAttempts = 2): Promise<string[]> {
  const key = `${language}|${normalizeQuery(query)}`;
  const cached = suggestionCache.get(key);
  // An empty answer from the single-attempt vetting probe is not final —
  // the later autocomplete pass may retry it once (and only once).
  if (cached && (cached.length > 0 || googleAttempts <= 1)) return cached;
  let got: string[] = [];
  for (let attempt = 1; attempt <= googleAttempts; attempt++) {
    got = await googleSuggest(query, language);
    if (got.length) break;
    if (attempt < googleAttempts) await sleep(rand(500, 1200));
  }
  if (!got.length) got = await ddgSuggest(query, language);
  suggestionCache.set(key, got);
  return got;
}

/* Real typed demand around one candidate search: completions of the query
   itself, of a shortened seed (query minus its last word — usually the
   question/modifier), and of seed + question-word expansions. */
async function gatherAutocomplete(search: CandidateSearch): Promise<string[]> {
  const lang = search.language || config.seoLanguage;
  const words = search.query.split(/\s+/);
  const seed = words.length >= 3 ? words.slice(0, -1).join(" ") : search.query;
  const probes = [search.query];
  if (seed !== search.query) probes.push(seed);
  for (const qw of QUESTION_WORDS[lang] ?? []) probes.push(`${seed} ${qw}`);

  const out: string[] = [];
  for (const probe of probes.slice(0, 4)) {
    if (out.length >= 12) break;
    for (const s of await fetchSuggestions(probe, lang)) {
      if (out.length >= 12) break;
      if (!out.some((prev) => similarQuery(prev, s))) out.push(s);
    }
    await sleep(rand(300, 700));
  }
  return out;
}

/* Profiles one top-ranking page from its raw HTML — fetched here rather than
   via fetchPageText because the shape signals (JSON-LD, <h2> count, meta
   dates) live in markup that the text digest strips. Same UA/timeout/size
   cap as fetchPageText. Null on any failure: a missing winner costs one
   data point, never the check. */
const JSON_LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const PRICE_SYMBOL_RE = /[₺$€£]\s?\d|\d[\d.,]*\s?(?:[₺$€£]|\bTL\b|\bTRY\b|\bUSD\b|\bEUR\b)/;
// Lookbehind, not \b: JS \b is ASCII-only, so it never fires before "ücret"
// or after "fiyatı". "ücretsiz" (free) and bare years ("fiyatları 2026")
// are not price signals.
const PRICE_WORD_RE =
  /(?<!\p{L})(?:fiyat|price|pricing|ücret(?!siz)|cost|maliyet)\p{L}*[^.\n]{0,30}?(?<![\d.,])(?!(?:19|20)\d\d(?!\d))\d/iu;

function isoDay(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

async function profileWinner(
  url: string,
  rank: number,
  fallbackTitle: string
): Promise<WinnerProfile | null> {
  let html: string;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; KaguSEO/1.0)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct && !/html|text/i.test(ct)) return null; // PDFs/images/etc.
    html = (await res.text()).slice(0, 600_000);
  } catch {
    return null;
  }

  const ld = allMatches(html, JSON_LD_RE).join("\n");
  const text = visibleText(html);

  // Freshness: article:published_time (property= or name=, either attribute
  // order) first, then JSON-LD datePublished.
  const metaDate =
    firstMatch(html, /<meta[^>]+(?:property|name)=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']article:published_time["']/i);
  const ldDate = firstMatch(ld, /"datePublished"\s*:\s*"([^"]+)"/i);

  return {
    rank,
    title: stripTags(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)) || fallbackTitle,
    headings: allMatches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)
      .map(stripTags)
      .join(" . ")
      .slice(0, 400),
    wordCount: text.split(/\s+/).filter(Boolean).length,
    h2Count: (html.match(/<h2[\s>]/gi) ?? []).length,
    hasFaqSchema: /"@type"\s*:\s*(?:\[[^\]]*)?"FAQPage"/i.test(ld),
    hasHowToSchema: /"@type"\s*:\s*(?:\[[^\]]*)?"HowTo"/i.test(ld),
    hasPriceSignals: PRICE_SYMBOL_RE.test(text) || PRICE_WORD_RE.test(text),
    publishedDate: isoDay(metaDate) ?? isoDay(ldDate),
  };
}

/* The winners' shape in one line — what the planning prompts copy. */
function winnerShape(winners: WinnerProfile[]): string {
  if (winners.length === 0) return "";
  const n = winners.length;
  const words = winners.map((w) => w.wordCount).sort((a, b) => a - b);
  const h2s = winners.map((w) => w.h2Count).sort((a, b) => a - b);
  const median = (xs: number[]) => xs[Math.floor((xs.length - 1) / 2)];
  const count = (f: (w: WinnerProfile) => boolean) => winners.filter(f).length;
  const newest = winners
    .map((w) => w.publishedDate)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  return [
    `~${median(words).toLocaleString("en-US")} words` +
      (n > 1 ? ` (${words[0].toLocaleString("en-US")}–${words[n - 1].toLocaleString("en-US")})` : ""),
    `${median(h2s)} H2s`,
    `${count((w) => w.hasFaqSchema)}/${n} have FAQ schema`,
    count((w) => w.hasHowToSchema) ? `${count((w) => w.hasHowToSchema)}/${n} HowTo schema` : "",
    `${count((w) => w.hasPriceSignals)}/${n} show prices`,
    newest ? `newest ${newest.slice(0, 7)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

async function checkSerp(
  search: CandidateSearch,
  host: string,
  gl: string,
  winnersPerQuery: number = config.seoStrategyWinners
): Promise<SerpEvidence> {
  const suggestions = await gatherAutocomplete(search);
  try {
    const serp = await scrapeOrganicResults(search.query, gl, search.language || config.seoLanguage, {
      features: true, // PAA / related / answer box — Serper omits them on gl-scoped calls
    });
    const { results } = serp;
    const top = results.slice(0, 8);
    const mine = top.find((r) => r.domain === host || r.domain.endsWith(`.${host}`));

    // The top winners' shape (headings, length, H2s, schema, prices,
    // freshness) shows what content wins this query. Our own page is not a
    // benchmark to copy, so it's skipped.
    const winners: SerpEvidence["winners"] = [];
    for (const r of top.filter((x) => x !== mine).slice(0, winnersPerQuery)) {
      const w = await profileWinner(r.url, r.rank, r.title);
      if (w) winners.push(w);
      await sleep(rand(400, 900));
    }

    return {
      query: search.query,
      intent: search.intent,
      language: search.language,
      siteRank: mine?.rank ?? null,
      results: top.map(({ rank, title, domain }) => ({ rank, title, domain })),
      winners,
      suggestions,
      peopleAlsoAsk: serp.peopleAlsoAsk.map(({ question, snippet, link }) => ({ question, snippet, link })),
      relatedSearches: serp.relatedSearches,
      answerBox: serp.answerBox,
    };
  } catch (err) {
    return {
      query: search.query,
      intent: search.intent,
      language: search.language,
      siteRank: null,
      results: [],
      winners: [],
      suggestions,
      peopleAlsoAsk: [],
      relatedSearches: [],
      answerBox: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ------------------------------------------------------------------------ */
/* 3b. Market map — competitors from the money SERPs + provider scans       */
/* ------------------------------------------------------------------------ */

/* Hosts a small site can realistically outrank — forums, UGC, social, free
   blogs. Their presence in a query's top results marks the cluster winnable
   for a low-authority domain. */
const UGC_HOST =
  /(^|\.)(reddit|quora|stackexchange|stackoverflow|eksisozluk|uludagsozluk|sikayetvar|donanimhaber|technopat|r10|medium|blogspot|wordpress|tumblr|facebook|instagram|youtube|pinterest|linkedin)\.(com|net|org|co)$|forum/i;

/* Directories and marketplaces rank for money searches without being the
   same business. This regex saves crawl budget on the obvious ones; the LLM
   filter below drops the rest. */
const AGGREGATOR_HOST =
  /(^|\.)(yelp|yellowpages|tripadvisor|armut|sahibinden|hepsiburada|trendyol|n11|amazon|etsy|alibaba|fiverr|upwork|freelancer|clutch|goodfirms|sortlist|designrush|trustpilot|foursquare|glassdoor|indeed|kariyer|wikipedia|wikihow|g2|capterra)\.(com|net|org|co|io)/i;

interface CompetitorSource {
  domain: string;
  bestRank: number;
  appearsFor: string[];
}

/* One SERP result folded into the domain map — self, UGC, and aggregator
   hosts skipped. */
function addCompetitorSource(
  byDomain: Map<string, CompetitorSource>,
  host: string,
  rawDomain: string,
  rank: number,
  query: string
): void {
  const d = rawDomain.replace(/^www\./, "");
  if (d === host || d.endsWith(`.${host}`)) return;
  if (UGC_HOST.test(d) || AGGREGATOR_HOST.test(d)) return;
  const cur = byDomain.get(d) ?? { domain: d, bestRank: rank, appearsFor: [] };
  cur.bestRank = Math.min(cur.bestRank, rank);
  if (!cur.appearsFor.includes(query)) cur.appearsFor.push(query);
  byDomain.set(d, cur);
}

/* Searches a buyer would use to FIND providers ("best X companies istanbul",
   "X firmaları") — swept purely for competitor discovery, so the market map
   isn't limited to the domains behind the already-checked searches. */
async function proposeMarketScanQueries(u: SiteUnderstanding): Promise<string[]> {
  const prompt = `This business:
${JSON.stringify(u)}

Generate 6 searches a buyer would type into Google to FIND AND COMPARE providers of what this business sells, in its market (${u.locations}; searched on Google for country "${u.marketCountry.toUpperCase()}"). Provider-list searches only — "best <offering> companies <city>", "<offering> firmaları", "top <sector> agencies" and the like. No how-to/informational queries, no invented brand names. Write them in the site's language(s) (${u.languages.join(", ")}), at least half in the primary language.

Respond with STRICT JSON, nothing else — each array item is ONE plain search string (no language labels, no "en:" prefixes, no objects):
{"queries": ["..."]}`;
  const raw = await groqJson<{ queries?: unknown }>("market-scan", prompt, 600);
  // Seen live: ["en", ":", "best … istanbul", "tr", ":", "…"] — the model
  // tokenised its language labels into the array. Strip label prefixes and
  // keep only strings a person would actually type.
  return strArr(raw.queries)
    .map((q) => q.replace(/^\s*[a-z]{2}\s*[:\-–]\s*/i, "").trim())
    .filter((q) => looksTypeable(q) && /\p{L}{3,}/u.test(q))
    .slice(0, 6);
}

/* Homepage plus up to two priority internal pages (services/pricing/about —
   the same path heuristics readSite uses on the target). Plain fetch, no JS
   render: a competitor worth beating in organic search has crawlable HTML. */
async function readCompetitorPages(domain: string): Promise<PageText[]> {
  let html = "";
  let finalUrl = `https://${domain}/`;
  try {
    const res = await fetch(finalUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": DESKTOP_UA, "accept-language": "en;q=0.9" },
    });
    if (!res.ok) return [];
    finalUrl = res.url || finalUrl;
    html = (await res.text()).slice(0, 1_000_000);
  } catch {
    return [];
  }

  const pages: PageText[] = [
    {
      url: finalUrl,
      title: stripTags(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
      metaDescription: metaContent(html, "description"),
      metaKeywords: metaContent(html, "keywords"),
      headings: allMatches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)
        .map(stripTags)
        .join(" . "),
      body: visibleText(html),
    },
  ];

  const internal = extractLinks(html, finalUrl, domain)
    .map((u) => {
      try {
        return { u, path: new URL(u).pathname.replace(/\/$/, "") || "/" };
      } catch {
        return null;
      }
    })
    .filter((x): x is { u: string; path: string } => x !== null && x.path !== "/")
    .sort((a, b) => pageScore(b.path) - pageScore(a.path))
    .slice(0, 2);
  for (const { u } of internal) {
    const p = await fetchPageText(u);
    if (p && (p.body.length > 80 || p.headings)) pages.push(p);
    await sleep(rand(400, 900));
  }
  return pages;
}

async function mapMarket(
  host: string,
  u: SiteUnderstanding,
  evidence: SerpEvidence[],
  onStep?: () => Promise<void> | void
): Promise<{ competitors: CompetitorProfile[]; market: MarketOverview | null }> {
  // Seed the domain map from the money searches already checked …
  const byDomain = new Map<string, CompetitorSource>();
  for (const e of evidence) {
    if (e.intent !== "commercial" && e.intent !== "transactional") continue;
    for (const r of e.results.slice(0, 5)) {
      addCompetitorSource(byDomain, host, r.domain, r.rank, e.query);
    }
  }

  // … then sweep dedicated provider-finding searches so the map covers the
  // market, not just whoever ranked for the checked queries. Best-effort:
  // a failed scan costs coverage, never the run.
  let scanQueries: string[] = [];
  try {
    scanQueries = await proposeMarketScanQueries(u);
  } catch (err) {
    console.warn(
      "[strategy] market-scan query generation failed — using checked SERPs only:",
      err instanceof Error ? err.message : err
    );
  }
  const scanned: string[] = [];
  for (const q of scanQueries) {
    try {
      const { results } = await scrapeOrganicResults(
        q,
        u.marketCountry,
        u.languages[0] ?? config.seoLanguage
      );
      for (const r of results.slice(0, 8)) {
        addCompetitorSource(byDomain, host, r.domain, r.rank, q);
      }
      scanned.push(q);
      console.log(`[strategy]   market scan "${q}" — ${results.length} results`);
    } catch (err) {
      console.warn(
        `[strategy]   market scan "${q}" failed:`,
        err instanceof Error ? err.message : err
      );
    }
    await onStep?.(); // progress heartbeat + cancellation point
    await sleep(rand(1500, 3500)); // same SERP pacing as the checks
  }

  const sources = [...byDomain.values()]
    .sort((a, b) => b.appearsFor.length - a.appearsFor.length || a.bestRank - b.bestRank)
    .slice(0, 6);
  if (sources.length === 0) {
    console.log("[strategy] no crawlable competitors found across the money SERPs + market scans");
    return { competitors: [], market: null };
  }
  console.log(
    `[strategy] deep-diving ${sources.length} competitor site(s): ${sources.map((s) => s.domain).join(", ")} …`
  );

  const crawled: Array<{ src: CompetitorSource; pages: PageText[] }> = [];
  for (const src of sources) {
    const pages = await readCompetitorPages(src.domain);
    if (pages.length > 0) {
      crawled.push({ src, pages });
      console.log(`[strategy]   ${src.domain} — ${pages.length} page(s) read`);
    } else {
      console.log(`[strategy]   ${src.domain} — unreachable, skipped`);
    }
    await onStep?.(); // progress heartbeat + cancellation point between crawls
    await sleep(rand(500, 1200));
  }
  if (crawled.length === 0) return { competitors: [], market: null };

  const digests = crawled
    .map(({ src, pages }) => {
      const pageLines = pages
        .map((p) =>
          [
            `  PAGE ${pathOf(p.url)}`,
            p.title && `  title: ${p.title}`,
            p.metaDescription && `  meta: ${p.metaDescription}`,
            p.headings && `  headings: ${p.headings.slice(0, 400)}`,
            p.body && `  text: ${p.body.slice(0, 700)}`,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n");
      return `COMPETITOR ${src.domain} (best rank #${src.bestRank}; found via: ${src.appearsFor
        .map((q) => `"${q}"`)
        .join(", ")})\n${pageLines}`;
    })
    .join("\n\n")
    .slice(0, 13000);

  const prompt = `You are a competitive analyst for ${u.brand} (${u.sector}${u.subSector ? ` — ${u.subSector}` : ""}), which sells: ${u.offerings.join("; ") || u.sector}.

Below are pages crawled from the sites found through the commercial/transactional searches ${u.brand} wants to win, plus provider-finding market scans. Work ONLY from this content.

${digests}

Two tasks. FIRST, for each domain decide whether it is a DIRECT competitor — a business selling substantially the same thing to the same buyers (not a directory, marketplace, news site, or unrelated business) — and profile it. SECOND, read the MARKET across the direct competitors: what everyone offers (table stakes), the selling points that repeat, and what nobody covers well (openings). Respond with STRICT JSON, nothing else:
{"competitors": [{
  "domain": "...",
  "direct": true,
  "summary": "what this business sells and to whom — one sentence",
  "keywordsTargeted": ["the topics its titles/headings visibly target, in its own words — 5-10 items"],
  "angles": ["the selling points it leads with (pricing model, speed, guarantees, niche) — 2-5 items"],
  "gaps": ["what buyers ask for that it does NOT cover or say — concrete openings ${u.brand} can own — 2-4 items"]
}],
"market": {
  "summary": "one short paragraph: what this market looks like, who competes how, and where ${u.brand} fits",
  "tableStakes": ["what every direct competitor offers or claims — a page missing these loses by default — 3-6 items"],
  "standardAngles": ["selling points repeated across the market (they no longer differentiate) — 2-5 items"],
  "openings": ["needs no direct competitor covers well — the differentiation ${u.brand} should lead with — 2-5 items"]
}}`;

  const raw = await groqJson<{ competitors?: unknown; market?: unknown }>(
    "market",
    prompt,
    3600
  );
  const out: CompetitorProfile[] = [];
  for (const item of Array.isArray(raw.competitors) ? raw.competitors : []) {
    const c = item as Record<string, unknown>;
    const domain = str(c.domain).replace(/^www\./, "");
    const entry = crawled.find((x) => x.src.domain === domain);
    if (!entry) continue;
    if (c.direct === false) {
      console.log(`[strategy]   ${domain} — not a direct competitor, dropped`);
      continue;
    }
    out.push({
      domain,
      bestRank: entry.src.bestRank,
      appearsFor: entry.src.appearsFor,
      pagesRead: entry.pages.length,
      summary: str(c.summary),
      keywordsTargeted: strArr(c.keywordsTargeted).slice(0, 10),
      angles: strArr(c.angles).slice(0, 5),
      gaps: strArr(c.gaps).slice(0, 4),
    });
  }

  const m = (raw.market ?? {}) as Record<string, unknown>;
  const market: MarketOverview | null =
    out.length > 0
      ? {
          scanQueries: scanned,
          summary: str(m.summary),
          tableStakes: strArr(m.tableStakes).slice(0, 6),
          standardAngles: strArr(m.standardAngles).slice(0, 5),
          openings: strArr(m.openings).slice(0, 5),
        }
      : null;

  console.log(
    `[strategy] market mapped — ${out.length} direct competitor profile(s), ${scanned.length} scan quer(y/ies) swept`
  );
  return { competitors: out, market };
}

/* ------------------------------------------------------------------------ */
/* 4. Strategy pass: head keywords + page plan                              */
/* ------------------------------------------------------------------------ */

/*
  The strategy pass is CHUNKED on purpose: one call plans the head topics and
  assigns every verified query to exactly one cluster, then one small call
  per page writes that page's plan from only its own cluster's evidence.
  Compared to the old single mega-call this (a) keeps every request small
  enough for Groq's on-demand TPM cap — the tpmGate spreads the calls over a
  couple of minutes instead of failing with 413s; (b) makes query
  exclusivity structural (a page call never even sees another cluster's
  queries); and (c) turns a failed call into one skipped page, not a dead job.
*/

/* Pass 1 output: a head topic plus the structural decisions for its page. */
interface PlannedHead extends HeadKeyword {
  language: string;
  action: "create" | "update";
  slug: string;
  pageType: string;
  clusterQueries: string[]; // verified queries assigned exclusively to this head
}

async function planHeads(
  u: SiteUnderstanding,
  evidence: SerpEvidence[],
  existingPaths: string[],
  competitors: CompetitorProfile[],
  market: MarketOverview | null,
  ownerNotes?: string,
  gsc?: GscRow[] | null
): Promise<PlannedHead[]> {
  const serpLinesFull = evidence
    .map((e) => {
      const ours = e.siteRank ? `we rank #${e.siteRank}` : "we are NOT in the top results";
      const top = e.results
        .slice(0, 8)
        .map(
          (r) =>
            `#${r.rank} ${r.domain}${UGC_HOST.test(r.domain) ? " [forum/UGC — beatable]" : ""} "${r.title.slice(0, 60)}"`
        )
        .join(" | ");
      const typed = e.suggestions.slice(0, 10).map((s) => `"${s}"`).join(", ");
      const paa = e.peopleAlsoAsk.slice(0, 4).map((p) => `"${p.question}"`).join(", ");
      const rel = e.relatedSearches.slice(0, 5).map((s) => `"${s}"`).join(", ");
      const shape = winnerShape(e.winners);
      return (
        `SEARCH "${e.query}" (${e.intent}, ${e.language}) — ${ours}` +
        (e.error ? ` [SERP check failed: ${e.error}]` : "") +
        (typed ? `\n  typed-in-Google (autocomplete — VERIFIED real searches): ${typed}` : "") +
        (paa ? `\n  people-also-ask (Google's own questions — VERIFIED): ${paa}` : "") +
        (rel ? `\n  related (Google's related searches — VERIFIED): ${rel}` : "") +
        (e.answerBox ? `\n  answer box owned by ${domainOf(e.answerBox.link)}` : "") +
        (top ? `\n  top: ${top}` : "") +
        (shape ? `\n  winners: ${shape}` : "")
      );
    })
    .join("\n");
  // The evidence block is the one part of this prompt that can shrink: it
  // starts at 13k chars (room for the PAA/related/winner lines) and is cut
  // back until the whole call fits GROQ_TPM_BUDGET — a site with GSC data and
  // a full competitor block otherwise lands over Groq's 12k TPM and 413s.
  const SERP_BLOCK_MAX = 13000;
  const SERP_BLOCK_MIN = 5000;
  const HEADS_MAX_TOKENS = 2500;

  const gscRow = (r: GscRow) =>
    `"${r.query}" — ${r.impressions} impressions, ${r.clicks} clicks, avg position ${r.position}` +
    (r.topPage ? `, ranks via ${pathOf(r.topPage)}` : "");
  const striking = gsc ? strikingDistance(gsc) : [];
  const gscBlock = gsc?.length
    ? `\nTHIS SITE'S OWN SEARCH CONSOLE DATA (last 90 days — PROVEN demand for this exact site, the strongest evidence here):\n${gsc
        .slice(0, 30)
        .map(gscRow)
        .join("\n")}${
        striking.length
          ? `\n\nSTRIKING DISTANCE (position 8–30 with impressions — the easiest wins available; prioritize clusters around these):\n${striking
              .slice(0, 15)
              .map(gscRow)
              .join("\n")}`
          : ""
      }\n`
    : "";

  const competitorBlock = competitors.length
    ? `\nDIRECT COMPETITORS (their sites were crawled — found via the commercial/transactional SERPs plus provider-finding market scans):\n${competitors
        .map(
          (c) =>
            `${c.domain} (best rank #${c.bestRank}) — ${c.summary}\n  targets: ${c.keywordsTargeted.join("; ")}\n  leads with: ${c.angles.join("; ")}\n  gaps: ${c.gaps.join("; ")}`
        )
        .join("\n")}\n${
        market
          ? `\nMARKET OVERVIEW (across all crawled competitors):\n${market.summary}\n  table stakes (everyone offers — a money page missing these loses by default): ${market.tableStakes.join("; ")}\n  standard angles (repeated everywhere — no longer differentiating): ${market.standardAngles.join("; ")}\n  openings (nobody covers well — lead with these): ${market.openings.join("; ")}\n`
          : ""
      }`
    : "";

  const buildPrompt = (serpCap: number) => `You are an SEO strategist planning intent clusters for ${u.brand} (${u.sector}${u.subSector ? ` — ${u.subSector}` : ""}). Modern search retrieval is SEMANTIC — plan topic clusters a page can own, not strings to repeat.

BUSINESS:
${JSON.stringify(u)}
${ownerNotes ? `\nOWNER CONTEXT (ground truth — the plan must foreground this): ${ownerNotes}\n` : ""}${gscBlock}${competitorBlock}
LIVE SERP + DEMAND EVIDENCE (who currently ranks, and what people actually type):
${serpLinesFull.slice(0, serpCap) || "(all SERP checks failed — plan from the business description alone)"}

EXISTING SITE PATHS (never plan a duplicate of one of these — plan an "update" of it instead):
${existingPaths.join(", ")}

Plan 5–10 HEAD topics, each becoming exactly one page. Rules:
- Each head is a short (1–3 word) semantically distinct topic grounded in the evidence — never two heads that mean roughly the same thing (they would cannibalize each other).
- WINNABILITY: assume this site is small with LOW domain authority. "easy" = the current top results include forums/UGC/directories/thin or off-topic pages (marked [forum/UGC — beatable] above); "hard" = the top 5 are all established brands with exact-topic pages; "medium" otherwise. Prefer easy/medium heads — include a hard one only when it is the core money topic, and say so in its rationale.${gsc?.length ? `\n- Search Console striking-distance queries are the cheapest traffic available — build heads around them first, and use each query's "ranks via" page to choose "update" (that page) over "create".` : ""}
- clusterQueries: assign the REAL queries above (the checked searches, the typed-in-Google and related lines, the Search Console queries — not the people-also-ask questions, which become the pages' FAQs) to the ONE head they belong to — a query must never appear under two heads. 3–8 per head, keep their exact phrasing.
- action: "update" with the existing path when the site already covers that topic; "create" with a new slug otherwise.
- slug: lowercase ASCII kebab-case ONLY. Romanize Turkish characters (ç→c, ş→s, ı→i, ğ→g, ö→o, ü→u) and give Arabic-language pages a romanized or English slug (e.g. /ar/custom-software) — never put non-ASCII characters in a slug.
- Cover all four intents (informational / commercial / transactional / navigational) across the heads: money pages first, then guides, one navigational item for the homepage/brand.${competitors.length ? `\n- COMPETITORS: a topic several direct competitors target is table stakes for the money searches — the plan must cover it at least as completely. Their listed gaps${market ? ` and the market overview's openings` : ""} are the cheapest differentiation — work them into the relevant heads, and cite the competitor in that head's rationale.` : ""}
- language: the language of that head's searchers (${u.languages.join(" / ")}).

Respond with STRICT JSON, nothing else:
{"heads": [{
  "keyword": "...",
  "intent": "informational|commercial|transactional|navigational",
  "winnability": "easy|medium|hard",
  "rationale": "one clause citing the evidence",
  "language": "${u.languages[0] ?? "en"}",
  "action": "create|update",
  "slug": "/path",
  "pageType": "landing|service|pricing|comparison|faq|guide|blog",
  "clusterQueries": ["..."]
}]}`;

  let serpCap = SERP_BLOCK_MAX;
  let prompt = buildPrompt(serpCap);
  while (estimateTokens(prompt, HEADS_MAX_TOKENS) > GROQ_TPM_BUDGET && serpCap > SERP_BLOCK_MIN) {
    serpCap = Math.max(SERP_BLOCK_MIN, serpCap - 2000);
    prompt = buildPrompt(serpCap);
  }
  if (serpCap < SERP_BLOCK_MAX) {
    console.log(`[strategy] heads prompt trimmed to fit Groq's TPM budget (SERP evidence block ${serpCap} chars)`);
  }

  const raw = await groqJson<{ heads?: unknown }>("heads", prompt, HEADS_MAX_TOKENS);

  const heads: PlannedHead[] = [];
  for (const item of Array.isArray(raw.heads) ? raw.heads : []) {
    const k = item as Record<string, unknown>;
    const keyword = str(k.keyword);
    if (!keyword) continue;
    // A head that near-duplicates an earlier one is cannibalization — drop it.
    if (heads.some((h) => similarQuery(h.keyword, keyword))) continue;
    const w = str(k.winnability).toLowerCase();
    const slugRaw = str(k.slug);
    const asIs = slugRaw.startsWith("/") ? slugRaw : `/${slugRaw}`;
    // "update" is only honest for a path that exists — the model regularly
    // says "update /hizmetler/x" for pages it imagined. Those are creates;
    // otherwise the measurement loop would report a never-built page as a
    // route that broke.
    const action =
      str(k.action).toLowerCase() === "update" && existingPaths.includes(asIs) ? "update" : "create";
    heads.push({
      keyword,
      intent: asIntent(k.intent),
      winnability: w === "easy" || w === "hard" ? w : "medium",
      rationale: str(k.rationale),
      language: langCode(str(k.language)) || u.languages[0] || "en",
      action,
      // An "update" of a path that really exists keeps it verbatim; anything
      // else goes through the sanitizer (the LLM sometimes emits non-ASCII
      // or mixed-script slugs despite the rules).
      slug: action === "update" ? asIs : sanitizeSlug(slugRaw || keyword, keyword, heads.length),
      pageType: str(k.pageType) || "landing",
      clusterQueries: strArr(k.clusterQueries).slice(0, 8),
    });
    if (heads.length >= 10) break;
  }
  if (heads.length === 0) throw new Error("Groq returned no usable head topics");
  return heads;
}

/* The SERP checks that belong to one page's cluster: a checked query the
   planner assigned to it, or one that clearly restates its head. Shared by
   planPage and composePrompt so the brief shows the same evidence the page
   was planned from. */
function clusterEvidence(
  headKeyword: string,
  clusterQueries: string[],
  evidence: SerpEvidence[]
): SerpEvidence[] {
  return evidence.filter(
    (e) =>
      clusterQueries.some((q) => similarQuery(q, e.query)) ||
      tokenOverlap(headKeyword, e.query) >= 0.75
  );
}

/* Google's People-Also-Ask questions for one cluster: every PAA on the
   cluster's own SERPs, plus PAA from other SERPs that share most of the
   head's tokens. Near-duplicates collapsed. */
function clusterPaa(
  headKeyword: string,
  related: SerpEvidence[],
  evidence: SerpEvidence[],
  max = 6
): Array<{ question: string; snippet: string; link: string }> {
  const out: Array<{ question: string; snippet: string; link: string }> = [];
  const push = (p: { question: string; snippet: string; link: string }) => {
    if (out.length < max && !out.some((o) => similarQuery(o.question, p.question))) out.push(p);
  };
  for (const e of related) for (const p of e.peopleAlsoAsk) push(p);
  for (const e of evidence) {
    if (related.includes(e)) continue;
    for (const p of e.peopleAlsoAsk) if (tokenOverlap(headKeyword, p.question) >= 0.5) push(p);
  }
  return out;
}

/* Pass 2: one small call per page, seeing ONLY its own cluster's evidence. */
async function planPage(
  u: SiteUnderstanding,
  head: PlannedHead,
  evidence: SerpEvidence[],
  gsc: GscRow[] | null | undefined,
  ownerNotes?: string
): Promise<PagePlan | null> {
  // This cluster's demand: the assigned queries plus autocomplete / related-
  // search / GSC lines that clearly belong to this topic.
  const related = clusterEvidence(head.keyword, head.clusterQueries, evidence);
  const onTopic = (s: string) => tokenOverlap(head.keyword, s) >= 0.5;
  const realQueries = [
    ...new Set(
      [
        ...head.clusterQueries,
        ...related.flatMap((e) => e.suggestions.filter(onTopic)),
        ...related.flatMap((e) => e.relatedSearches.filter(onTopic)),
      ].slice(0, 16)
    ),
  ];
  const paa = clusterPaa(head.keyword, related, evidence);
  const answerBoxes = related
    .filter((e) => e.answerBox)
    .slice(0, 2)
    .map(
      (e) =>
        `- "${e.query}": owned by ${domainOf(e.answerBox!.link)} — "${e.answerBox!.snippet.slice(0, 200)}"`
    );
  const gscLines = (gsc ?? [])
    .filter((r) => tokenOverlap(head.keyword, r.query) >= 0.5)
    .slice(0, 8)
    .map((r) => `"${r.query}" — ${r.impressions} impressions, avg position ${r.position}`);
  const clusterWinners = related.flatMap((e) => e.winners);
  const shape = winnerShape(clusterWinners);
  const targetH2 = clusterWinners.length
    ? clusterWinners.map((w) => w.h2Count).sort((a, b) => a - b)[Math.floor((clusterWinners.length - 1) / 2)]
    : 0;
  const winnerLines = clusterWinners
    .slice(0, 3)
    .map((w) => `#${w.rank} headings: ${w.headings.slice(0, 180)}`);

  const brief = {
    brand: u.brand,
    sector: u.sector,
    coreValueProposition: u.coreValueProposition,
    audience: u.audience,
    locations: u.locations,
    offerings: u.offerings,
    problemsSolved: u.problemsSolved,
    differentiators: u.differentiators,
  };

  const prompt = `You are an SEO content strategist. Design ONE page. Every text field you write MUST be in the language "${head.language}" — no mixed-language output, and never mix Latin and Arabic letters inside one word.

BUSINESS: ${JSON.stringify(brief)}
${ownerNotes ? `OWNER CONTEXT (ground truth): ${ownerNotes}\n` : ""}
THE PAGE: ${head.action.toUpperCase()} ${head.slug} — a ${head.pageType} page owning the topic "${head.keyword}" (${head.intent} intent).

REAL QUERIES THIS PAGE MUST WIN (verified demand — build tailQueries from these first, keeping their natural phrasing):
${realQueries.map((q) => `- "${q}"`).join("\n") || "- (none collected — infer realistic ones)"}
${paa.length ? `\nREAL QUESTIONS PEOPLE ASK (Google's "People also ask" for this topic — use these as FAQ entries / H2s verbatim where natural):\n${paa.map((p) => `- "${p.question}"`).join("\n")}` : ""}${answerBoxes.length ? `\nFEATURED SNIPPET (answer box) CURRENTLY SHOWN — this page's answer-first paragraph must beat it: ≤ 50 words, direct, states the fact first:\n${answerBoxes.join("\n")}` : ""}
${gscLines.length ? `\nTHIS SITE'S OWN SEARCH CONSOLE QUERIES FOR THIS TOPIC (proven demand):\n${gscLines.join("\n")}` : ""}${winnerLines.length ? `\nWHAT CURRENTLY WINS THIS TOPIC (top results' headings):\n${winnerLines.join("\n")}` : ""}${shape ? `\nWINNERS' SHAPE: ${shape}` : ""}

Rules:
- tailQueries: 4–8, drawn from the real queries above first; invent one only to fill an obvious gap.
- entities: 5–10 concrete concepts the page must cover for full topical coverage — the offering, its attributes (price factors, timeline, process, requirements), the audience, the location, alternatives.
- faq: 2–6 entries; "question" as a searcher would naturally ask it${paa.length ? ` — the people-also-ask questions above come first, kept verbatim` : ""}, "answerGuidance" listing the facts the FIRST sentence of the answer must state.
- outline: the page's H2 headings in order — several must directly ADDRESS the cluster's questions (natural phrasing beats echoing exact words).${targetH2 ? ` The pages winning this topic use about ${targetH2} H2s — match or slightly exceed that depth (at most 10).` : ""}
- title ≤ 60 characters with the head topic at the front; metaDescription 70–160 characters, written like ad copy.

Respond with STRICT JSON, nothing else:
{"title": "...", "metaDescription": "...", "tailQueries": ["..."], "entities": ["..."], "faq": [{"question": "...", "answerGuidance": "..."}], "outline": ["..."]}`;

  let raw: Record<string, unknown>;
  try {
    raw = await groqJson<Record<string, unknown>>(`page ${head.slug}`, prompt, 1400);
  } catch (err) {
    console.warn(
      `[strategy] page ${head.slug} failed — skipping:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }

  const faq: FaqItem[] = [];
  for (const f of Array.isArray(raw.faq) ? raw.faq : []) {
    const q = f as Record<string, unknown>;
    const question = str(q.question);
    if (!question) continue;
    faq.push({ question, answerGuidance: str(q.answerGuidance) });
  }
  return {
    action: head.action,
    slug: head.slug,
    title: str(raw.title),
    metaDescription: str(raw.metaDescription),
    pageType: head.pageType,
    intent: head.intent,
    language: head.language,
    headKeyword: head.keyword,
    clusterQueries: head.clusterQueries,
    tailQueries: strArr(raw.tailQueries).slice(0, 8),
    entities: strArr(raw.entities).slice(0, 10),
    faq: faq.slice(0, 6),
    outline: strArr(raw.outline).slice(0, 10),
  };
}

async function buildPlan(
  u: SiteUnderstanding,
  evidence: SerpEvidence[],
  existingPaths: string[],
  competitors: CompetitorProfile[],
  market: MarketOverview | null,
  ownerNotes?: string,
  gsc?: GscRow[] | null,
  onStep?: () => Promise<void> | void
): Promise<{ headKeywords: HeadKeyword[]; pages: PagePlan[] }> {
  const heads = await planHeads(u, evidence, existingPaths, competitors, market, ownerNotes, gsc);
  console.log(`[strategy] ${heads.length} head topics — planning one page per head (TPM-paced) …`);

  const pages: PagePlan[] = [];
  for (const head of heads) {
    const page = await planPage(u, head, evidence, gsc, ownerNotes);
    if (page) {
      pages.push(page);
      console.log(`[strategy]   ${page.action} ${page.slug} — ${page.tailQueries.length} tails, ${page.faq.length} FAQ`);
    }
    await onStep?.(); // lets a DB job report progress / abort on cancellation
  }
  if (pages.length === 0) throw new Error("No page plans produced");

  const headKeywords: HeadKeyword[] = heads.map(
    ({ keyword, intent, winnability, rationale }) => ({ keyword, intent, winnability, rationale })
  );
  return { headKeywords, pages };
}

/* Slugs must be lowercase ASCII kebab-case. Turkish romanizes cleanly via a
   char map + NFKD; Arabic doesn't — an Arabic slug loses most of its letters
   in romanization, so we fall back to the head keyword and finally to a
   stable /page-N placeholder the executing agent is told it can rename. */
const TR_CHARS: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };

function romanizedOrNull(raw: string): string | null {
  const s = raw
    .toLowerCase()
    .replace(/[çğıöşü]/g, (ch) => TR_CHARS[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\/-/g, "/")
    .replace(/-\//g, "/")
    .replace(/^-|-$/g, "");
  const kept = s.replace(/[^a-z0-9]/g, "").length;
  const total = (raw.match(/[\p{L}\p{N}]/gu) ?? []).length;
  // Losing half the letters means the source wasn't Latin-script — a partial
  // romanization like "/tut" (from a mixed-script hallucination) is garbage.
  if (kept < 3 || (total > 0 && kept / total < 0.5)) return null;
  return s;
}

function sanitizeSlug(slugRaw: string, headKeyword: string, index: number): string {
  const s = romanizedOrNull(slugRaw) ?? romanizedOrNull(headKeyword) ?? `page-${index + 1}`;
  return s.startsWith("/") ? s : `/${s}`;
}

/* ------------------------------------------------------------------------ */
/* 5. Near-duplicate pruning — no query targeted by two pages               */
/* ------------------------------------------------------------------------ */

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Same query in disguise: identical after normalization, or token-set
   Jaccard ≥ 0.85 (word order / punctuation / one filler word apart). */
function similarQuery(a: string, b: string): boolean {
  const na = normalizeQuery(a);
  const nb = normalizeQuery(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const sa = new Set(na.split(" "));
  const sb = new Set(nb.split(" "));
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union > 0 && inter / union >= 0.85;
}

/* Mutates the plan so no two pages compete for the same query space:
   1. head topics claim first — a later page whose head near-duplicates an
      earlier page's head IS the cannibalization this pass exists to prevent,
      so that page is dropped whole;
   2. tail queries dedupe across pages, and also against every head (a tail
      that restates another page's head topic belongs to that page);
   3. FAQ questions dedupe across pages, but MAY mirror a tail/head on their
      own page — answering your own cluster's question is the point;
   4. pages left with nothing to target, and duplicate slugs, are dropped.
   Returns how many items were removed. */
function dedupePlan(pages: PagePlan[]): number {
  let removed = 0;
  // Owner is the PagePlan object (not an index) so claims survive splices.
  const claimed: Array<{ text: string; owner: PagePlan }> = [];
  const claim = (text: string, owner: PagePlan, allowSameOwner: boolean): boolean => {
    for (const c of claimed) {
      if (!similarQuery(c.text, text)) continue;
      if (allowSameOwner && c.owner === owner) return true;
      removed++;
      return false;
    }
    claimed.push({ text, owner });
    return true;
  };

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p.headKeyword && !claim(p.headKeyword, p, false)) {
      pages.splice(i, 1);
      i--;
    }
  }
  for (const p of pages) {
    p.tailQueries = p.tailQueries.filter((q) => claim(q, p, false));
  }
  for (const p of pages) {
    p.faq = p.faq.filter((f) => claim(f.question, p, true));
  }

  const slugs = new Set<string>();
  for (let i = 0; i < pages.length; i++) {
    const emptied = pages[i].tailQueries.length === 0 && pages[i].faq.length === 0;
    if (emptied || slugs.has(pages[i].slug)) {
      pages.splice(i, 1);
      i--;
      removed++;
    } else {
      slugs.add(pages[i].slug);
    }
  }
  return removed;
}

/* ------------------------------------------------------------------------ */
/* 6. The deliverable — one master prompt for a coding agent                */
/* ------------------------------------------------------------------------ */

/* Tokens match if equal or one is a prefix of the other (≥4 chars) — Turkish
   suffixes ("yazılım"/"yazılımı", "işletme"/"işletmesi") break exact equality. */
function fuzzyTokenEq(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(short);
}

/* Overlap coefficient (shared tokens / smaller set) with fuzzy matching. */
function tokenOverlap(a: string, b: string): number {
  const ta = normalizeQuery(a).split(" ").filter(Boolean);
  const tb = normalizeQuery(b).split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  let shared = 0;
  for (const x of ta) if (tb.some((y) => fuzzyTokenEq(x, y))) shared++;
  return shared / Math.min(ta.length, tb.length);
}

/* The LLM is told to build tails from the collected autocomplete queries but
   mostly paraphrases them away — so after the plan lands, the code assigns
   every still-unclaimed verified query to the best-matching page itself:
   same language, strongest head-keyword overlap, intent agreement as a
   tiebreaker. Verified demand must not die in a prompt.
   Google's People-Also-Ask questions are verified demand of the same rank:
   they go through the same matching but land as FAQ entries (they ARE the
   questions), deduped against every existing FAQ/tail/head. A SERP whose
   query the planner already assigned to a page pulls its demand toward
   that page (+0.5) — it is that cluster's own evidence. */
const MAX_TAILS = 8;
const MAX_FAQ = 8;

function adoptVerifiedDemand(
  pages: PagePlan[],
  evidence: SerpEvidence[]
): { tails: number; faqs: number } {
  const adopted = { tails: 0, faqs: 0 };
  const taken: string[] = pages.flatMap((p) => [
    p.headKeyword,
    ...p.tailQueries,
    ...p.faq.map((f) => f.question),
  ]);

  for (const e of evidence) {
    const items: Array<{ text: string; paa?: { snippet: string; link: string } }> = [
      ...e.suggestions.map((text) => ({ text })),
      ...e.peopleAlsoAsk.map((p) => ({ text: p.question, paa: { snippet: p.snippet, link: p.link } })),
    ];
    for (const item of items) {
      const s = item.text;
      if (taken.some((t) => similarQuery(t, s))) continue;
      let best: PagePlan | null = null;
      let bestScore = 0;
      for (const p of pages) {
        if (p.language !== e.language) continue;
        if (item.paa ? p.faq.length >= MAX_FAQ : p.tailQueries.length >= MAX_TAILS) continue;
        const score =
          tokenOverlap(p.headKeyword, s) +
          (p.intent === e.intent ? 0.25 : 0) +
          (p.clusterQueries.some((q) => similarQuery(q, e.query)) ? 0.5 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      if (!best || bestScore < 0.75) continue; // unrelated to every page — leave it out
      if (item.paa) {
        const hint = item.paa.snippet.replace(/\s+/g, " ").trim().slice(0, 160).replace(/[.…\s]+$/, "");
        best.faq.push({
          question: s,
          answerGuidance:
            `the direct answer, stated with this business's own facts` +
            (hint ? ` (Google currently shows ${domainOf(item.paa.link)}: "${hint}…" — beat it, don't copy it)` : ""),
        });
        adopted.faqs++;
      } else {
        best.tailQueries.push(s);
        adopted.tails++;
      }
      taken.push(s);
    }
  }
  return adopted;
}

const FENCE = "```";

function composePrompt(args: {
  url: string;
  host: string;
  u: SiteUnderstanding;
  evidence: SerpEvidence[];
  competitors?: CompetitorProfile[];
  market?: MarketOverview | null;
  heads: HeadKeyword[];
  pages: PagePlan[];
  audit: AuditReport | null;
  ownerNotes?: string;
  gsc?: GscRow[] | null;
}): string {
  const { url, host, u, evidence, heads, pages, audit, ownerNotes, gsc } = args;
  const competitors = args.competitors ?? [];
  const market = args.market ?? null;
  const multilingual = u.languages.length > 1;

  const serpBlock = evidence.length
    ? evidence
        .map((e) => {
          const ours = e.error
            ? "SERP check failed"
            : e.siteRank
              ? `we rank **#${e.siteRank}**`
              : "**not in the top results**";
          const winners = e.results
            .slice(0, 3)
            .map((r) => `${r.domain} (#${r.rank})`)
            .join(", ");
          const snippet = e.answerBox ? `; featured snippet held by ${domainOf(e.answerBox.link)}` : "";
          return `- \`${e.query}\` (${e.intent}) — ${ours}${winners ? `; currently won by ${winners}` : ""}${snippet}`;
        })
        .join("\n")
    : "_No SERP checks completed for this run._";

  const headsBlock = heads.length
    ? heads
        .map((h) => `| ${h.keyword} | ${h.intent} | ${h.winnability} | ${h.rationale || "—"} |`)
        .join("\n")
    : "| — | — | — | — |";

  // The market map — lands inside §2 so the executing agent sees who the
  // pages must beat and what the market expects.
  const competitorsBlock = competitors.length
    ? `\n### The market (competitor sites were crawled)\n
Found via the commercial/transactional searches above plus ${market?.scanQueries.length ? `${market.scanQueries.length} provider-finding market scans (${market.scanQueries.map((q) => `\`${q}\``).join(", ")})` : "provider-finding market scans"} — informational and navigational SERPs excluded, those winners aren't the same business:\n
${competitors
  .map(
    (c) =>
      `**${c.domain}** (best rank #${c.bestRank}; found via ${c.appearsFor.map((q) => `\`${q}\``).join(", ")}) — ${c.summary}
- Targets: ${c.keywordsTargeted.join("; ")}
- Leads with: ${c.angles.join("; ")}
- Gaps to exploit: ${c.gaps.join("; ")}`
  )
  .join("\n\n")}\n${
        market
          ? `\n**Market read:** ${market.summary}\n
- **Table stakes** (every competitor offers these — a money page missing them loses by default): ${market.tableStakes.join("; ")}
- **Standard angles** (repeated across the market — claiming them no longer differentiates): ${market.standardAngles.join("; ")}
- **Openings** (nobody covers these well — lead with them): ${market.openings.join("; ")}\n`
          : ""
      }
A topic several competitors target is table stakes — the matching §4 page must cover it at least as completely as they do. Their gaps and the market openings are the differentiation: work each one into the relevant §4 page's copy and FAQ.\n`
    : "";

  // Demand provenance per tail: the site's own GSC data beats autocomplete,
  // which beats the strategist's inference. Marked visibly so the executing
  // agent knows which queries are verified and which are guesses.
  const typedDemand = evidence.flatMap((e) => [...e.suggestions, ...e.relatedSearches]);
  const paaDemand = evidence.flatMap((e) => e.peopleAlsoAsk.map((p) => p.question));
  const demandMark = (q: string): string => {
    const own = gsc?.find((r) => similarQuery(r.query, q));
    if (own) return ` ✓✓ (your own Search Console: ${own.impressions} impressions, avg position ${own.position})`;
    if (typedDemand.some((s) => similarQuery(s, q))) return " ✓ (verified: people type this into Google)";
    if (paaDemand.some((s) => similarQuery(s, q))) return " ✓PAA (Google's People Also Ask)";
    return "";
  };

  const paaClaimed: string[] = []; // PAA questions already listed for an earlier page
  const boxClaimed = new Set<SerpEvidence>(); // featured snippets already assigned to a page
  const pagesBlock = pages
    .map((p, i) => {
      const tails = p.tailQueries.map((q) => `  - "${q}"${demandMark(q)}`).join("\n");
      const entities = p.entities.join("; ");
      const outline = p.outline.map((o, n) => `  ${n + 1}. ${o}`).join("\n");
      const faq = p.faq
        .map((f) => `  - Q: "${f.question}"${demandMark(f.question)}\n    → the first sentence of the answer must state: ${f.answerGuidance || "the direct factual answer"}`)
        .join("\n");

      // Answer-engine targets: the PAA questions this page must answer and
      // the featured snippet it must take — the AEO surface of the cluster.
      // A question already in another page's FAQ, or listed for an earlier
      // page, belongs there — one question, one page (§9).
      const related = clusterEvidence(p.headKeyword, p.clusterQueries, evidence);
      const inOtherFaq = (q: string) =>
        pages.some((o) => o !== p && o.faq.some((f) => similarQuery(f.question, q)));
      const inOwnFaq = (q: string) => p.faq.some((f) => similarQuery(f.question, q));
      const paaQs = [
        ...p.faq.map((f) => f.question).filter((q) => paaDemand.some((s) => similarQuery(s, q))),
        ...clusterPaa(p.headKeyword, related, evidence).map((x) => x.question),
      ]
        .filter((q, n, all) => all.findIndex((o) => similarQuery(o, q)) === n)
        .filter((q) => !inOtherFaq(q) && !paaClaimed.some((c) => similarQuery(c, q)));
      paaClaimed.push(...paaQs);
      const boxes = related.filter((e) => e.answerBox && !boxClaimed.has(e));
      for (const e of boxes) boxClaimed.add(e);
      const aeo = [
        ...paaQs.map((q) => `  - Answer: "${q}" ✓PAA${inOwnFaq(q) ? " (FAQ entry below)" : ""}`),
        ...boxes.map(
          (e) =>
            `  - Featured snippet for \`${e.query}\` is held by **${domainOf(e.answerBox!.link)}**: "${e.answerBox!.snippet.slice(0, 220)}" — this page's answer-first paragraph must beat it: ≤ 50 words, direct, the fact stated in the first clause.`
        ),
      ].join("\n");

      // Target shape from the profiled winners of this cluster's SERPs.
      const ws = related.flatMap((e) => e.winners);
      let shapeLine = "";
      if (ws.length) {
        const words = ws.map((w) => w.wordCount).sort((a, b) => a - b);
        const h2s = ws.map((w) => w.h2Count).sort((a, b) => a - b);
        const half = (f: (w: WinnerProfile) => boolean) => ws.filter(f).length * 2 >= ws.length;
        const schema = [
          "FAQPage",
          ...(half((w) => w.hasHowToSchema) ? ["HowTo"] : []),
        ];
        const faqNote = half((w) => w.hasFaqSchema) ? "" : " (most winners lack it — an edge)";
        const lo = words[0].toLocaleString("en-US");
        const hi = words[words.length - 1].toLocaleString("en-US");
        shapeLine =
          `\n- target shape (from ${ws.length} profiled winner page(s): ${winnerShape(ws)}): ` +
          `${lo === hi ? `about ${lo}` : `${lo}–${hi}`} words, ` +
          `about ${h2s[Math.floor((h2s.length - 1) / 2)]} H2s; JSON-LD: ${schema.join(" + ")}${faqNote}; ` +
          (half((w) => w.hasPriceSignals)
            ? "prices MUST be shown on the page (the winners show them — use real figures or `TODO(owner)` per ground rule 3)."
            : "prices are optional (most winners don't show them).");
      }
      // The LLM sometimes ignores its length rules — annotate violations so
      // the executing agent fixes them instead of shipping them.
      const titleNote =
        p.title && p.title.length > 60
          ? ` — TODO: shorten to ≤60 chars (draft is ${p.title.length})`
          : "";
      const metaNote =
        p.metaDescription && (p.metaDescription.length < 70 || p.metaDescription.length > 160)
          ? ` — TODO: rewrite to 70–160 chars in the page's language (draft is ${p.metaDescription.length})`
          : "";
      return `### 4.${i + 1} ${p.action.toUpperCase()} \`${p.slug}\`${p.slug.startsWith("/page-") ? " — TODO: rename this placeholder slug to a kebab-case path matching the head keyword" : ""}
- type: ${p.pageType} · intent: ${p.intent} · language: ${p.language}
- head keyword: **${p.headKeyword}**
- \`<title>\` (≤60 chars): ${p.title || "TODO"}${titleNote}
- meta description (70–160 chars): ${p.metaDescription || "TODO"}${metaNote}
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
${tails || "  - (see FAQ)"}${shapeLine}
${aeo ? `- **Answer-engine targets** (Google's own questions and featured snippet for this cluster — each question gets a visible, answer-first passage or FAQ entry):\n${aeo}` : ""}
${entities ? `- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): ${entities}` : ""}
${outline ? `- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):\n${outline}` : ""}
${faq ? `- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):\n${faq}` : ""}`;
    })
    .join("\n\n");

  const auditBlock = audit
    ? [
        `Technical audit score: **${audit.score}/100** across ${audit.pages.length} audited page(s). Apply every fix below (ordered most severe first). "Where" lists the exact offending elements found.`,
        "",
        ...audit.findings.map((f, i) => {
          const lines = [
            `**6.${i + 1} [${f.severity.toUpperCase()}] ${f.label}** — ${f.issue}`,
            `- Fix: ${f.fix}`,
          ];
          if (f.specifics.length) lines.push(`- Where: ${f.specifics.slice(0, 4).join("; ")}`);
          if (f.pages.length)
            lines.push(
              `- Pages: ${f.pages.slice(0, 6).join(", ")}${f.pages.length > 6 ? ` +${f.pages.length - 6} more` : ""}`
            );
          return lines.join("\n");
        }),
        "",
        audit.passed.length
          ? `Already passing (don't regress these): ${audit.passed.join(" · ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : `_The technical audit was skipped or failed for this run. Run \`npm run seo:audit -- ${host}\` in the worker and apply its fixes as part of this brief._`;

  const llmsPages = pages
    .slice(0, 10)
    .map((p) => `- [${p.title || p.slug}](https://${host}${p.slug}): ${p.metaDescription || "…"}`)
    .join("\n");

  return `# SEO build brief — ${host}

You are an expert SEO engineer working inside the codebase of **${host}** (${u.brand}). Execute this brief completely: apply the technical fixes, set up the SEO infrastructure files, and create/update the pages. Everything below was derived from the live site, the live search results (Google, country **${u.marketCountry.toUpperCase()}**), and a technical audit run on ${new Date().toISOString().slice(0, 10)}.

## 0. Ground rules

1. Detect the framework first (Next.js App Router / Pages Router / other) and use its native idioms for metadata, robots, and sitemaps.
2. Reuse the existing design system, layout, and components — new pages must look native to the site, not bolted on.
3. Never invent business facts (prices, timelines, certifications, addresses). Pull them from the codebase or existing copy; where a fact is unknown, write \`TODO(owner): …\` and move on.
4. Work in reviewable chunks, in this order: infrastructure files (§7) → technical fixes (§6) → pages (§4).

## 1. What this site is

- **Brand:** ${u.brand}
- **Sector:** ${u.sector}${u.subSector ? ` — ${u.subSector}` : ""}
- **Core value proposition (lead with this on every page):** ${u.coreValueProposition || "TODO(owner)"}${ownerNotes ? `\n- **Owner context (ground truth):** ${ownerNotes}` : ""}
- **Audience:** ${u.audience || "TODO(owner)"}
- **Market:** ${u.locations} · **Search country:** ${u.marketCountry.toUpperCase()} · **Languages:** ${u.languages.join(", ")}
- **Offerings:** ${u.offerings.join("; ") || "TODO(owner)"}
- **Problems it solves:** ${u.problemsSolved.join("; ") || "TODO(owner)"}
- **Differentiators:** ${u.differentiators.join("; ") || "TODO(owner)"}

Current intent coverage: informational — ${u.intentNotes.informational || "n/a"}; commercial — ${u.intentNotes.commercial || "n/a"}; transactional — ${u.intentNotes.transactional || "n/a"}; navigational — ${u.intentNotes.navigational || "n/a"}.

## 2. Search landscape (live evidence)

These real searches were checked against the search results:

${serpBlock}

Where the site is absent, the pages in §4 exist to change that. Where it already ranks, the fixes and content upgrades protect and improve the position.${typedDemand.length ? ` In addition, **${typedDemand.length} real typed queries** were collected from Google Autocomplete and Google's related searches around these topics — §4 tail queries marked ✓ come from that verified demand, not from inference.` : ""}${paaDemand.length ? ` Google's **People Also Ask** boxes contributed **${paaDemand.length} real question(s)** — marked ✓PAA in §4.` : ""}
${(() => {
  if (gsc == null) return "\n_Search Console is not connected — connect it (worker/README.md) to ground future briefs in the site's own impression data._";
  if (gsc.length === 0)
    return "\n_Search Console is connected but Google has recorded **no impressions yet** — the site is starting from zero visibility. This brief is the baseline; re-run after the pages ship and index to track movement._";
  const striking = strikingDistance(gsc);
  const row = (r: GscRow) =>
    `| ${r.query} | ${r.impressions} | ${r.clicks} | ${r.position} | ${r.topPage ? pathOf(r.topPage) : "—"} |`;
  return `
### Your own Search Console data (last 90 days)

Google reported **${gsc.length} distinct queries** with impressions for this site. Queries marked ✓✓ in §4 come from this data — proven demand for this exact site.
${
  striking.length
    ? `
**Striking distance** — already ranking 8–30, the cheapest wins available; §4 prioritizes these:

| Query | Impressions | Clicks | Avg pos | Ranking page |
| --- | --- | --- | --- | --- |
${striking.slice(0, 12).map(row).join("\n")}`
    : `
Top queries by impressions:

| Query | Impressions | Clicks | Avg pos | Ranking page |
| --- | --- | --- | --- | --- |
${gsc.slice(0, 12).map(row).join("\n")}`
}`;
})()}
${competitorsBlock}
## 3. Head keywords to own

Winnability assumes a small, low-authority domain: "easy" means the current top results include forums/UGC/thin pages a new page can outrank; "hard" means established brands own the SERP — win those through the easier clusters first.

| Keyword | Intent | Winnability | Why |
| --- | --- | --- | --- |
${headsBlock}

## 4. Pages to create or update

Each page owns one **intent cluster**: a head topic plus representative queries. The queries are demand evidence — modern search retrieval (Google's ranking systems, AI Overviews, answer engines) matches passages by MEANING, entities, and topical completeness, not by exact phrase matching. So a page wins its cluster by fully covering its meaning, not by echoing the query strings. **Do not merge pages, and never let two pages cover the same cluster** — the assignments below are final and already deduplicated.

Demand markers: **✓✓** = the site's own Search Console data · **✓** = people type it into Google (autocomplete / related searches) · **✓PAA** = a question from Google's "People also ask" box · unmarked = the strategist's inference. "Target shape" is measured from the pages currently ranking for the cluster; "Answer-engine targets" are the questions and featured snippet Google already shows for it.

${pagesBlock}

## 5. Writing rules — every page, non-negotiable

These rules make pages semantically complete for modern retrieval, make sentences liftable verbatim into Google AI Overviews and AI assistants (ChatGPT/Perplexity/Claude), and convert humans.

1. **Write for meaning, not for strings.** Cover the cluster's questions and entities completely, in natural language with natural variation. Never repeat a keyword mechanically — retrieval is semantic, so phrase repetition adds nothing and reads as spam to modern rankers. A heading should clearly address a question from §4; natural phrasing beats verbatim query text.
2. **Answer first.** Under every question-style H2, the FIRST sentence must fully answer the question and stand alone out of context: name the subject explicitly (never open with "It", "We", or "This"), make one claim, stay under ~40 words. Elaboration comes after, never before — this is the passage AI Overviews lift.
3. **One fact per sentence.** Prices, timeframes, counts, and requirements each get their own short sentence — extractable units, not comma chains.
4. **Topical completeness.** Each page must cover every item in its §4 entities list — the offering, its attributes, process, price factors, who it's for, alternatives. That coverage is what lets one page rank for the whole cluster, including queries nobody predicted.
5. **Structure for extraction.** Numbered lists for steps and processes, tables for comparisons and prices, bold for key terms. Paragraphs of 2–3 sentences max.
6. **FAQ answers are 40–80 words**, self-contained, and open with a direct yes/no/number/definition. The visible Q&A text and the FAQPage JSON-LD must match verbatim — Google cross-checks, and a mismatch voids rich-result eligibility.
7. **Real facts only** (ground rule 3). A fabricated price lifted into an AI Overview is worse than no snippet.
8. **Language discipline.** Write each page entirely in its \`language\` from §4 — no mixed-language pages; keep terminology consistent with how its audience actually talks about the topic.
9. **Internal links as a topic cluster.** Link the informational pages to their money page and back, with descriptive anchors — never "click here". Every §4 page needs at least two internal links pointing at it; search engines read that link structure as topical authority.

## 6. Technical fixes (from the site audit)

${auditBlock}

## 7. SEO infrastructure files

**robots** — \`app/robots.ts\` in Next.js App Router (otherwise a static \`public/robots.txt\`), producing:

${FENCE}
User-agent: *
Allow: /

# AI / answer-engine crawlers — explicitly allowed so the site can be
# read and cited by AI Overviews and assistants.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://${host}/sitemap.xml
${FENCE}

**sitemap** — \`app/sitemap.ts\` (or generated \`sitemap.xml\`) listing every indexable page **including every §4 page**, with real \`lastModified\` dates. Declare it in robots as above.

**llms.txt** — serve at \`https://${host}/llms.txt\` (static file in \`public/\`). AI assistants use it as a curated map of the site:

${FENCE}
# ${u.brand}
> ${u.brand} — ${u.sector}${u.subSector ? ` (${u.subSector})` : ""}. ${u.offerings.slice(0, 4).join(", ")}. Serving ${u.locations}.

## Pages
- [Home](https://${host}/): what ${u.brand} does and who it serves
${llmsPages}
${FENCE}

**Per-page metadata** — on every page (including existing ones): a self-referencing canonical, the unique \`<title>\` and meta description from §4, \`og:title\` / \`og:description\` / \`og:image\` (1200×630) and \`twitter:card\`.${multilingual ? ` Because the site serves ${u.languages.join(" + ")}, add \`hreflang\` alternates linking each language version pair, plus \`x-default\`.` : ""}

**Structured data (JSON-LD)** —
- Sitewide: \`Organization\` (name, url, logo, \`sameAs\` social profiles${u.locations !== "global" ? `; use \`LocalBusiness\` with address/geo/openingHours if there is a physical presence in ${u.locations}` : ""}).
- Service/product landing pages (§4): \`Service\` or \`Product\` with name, description, provider, \`areaServed\`.
- Every page with a visible FAQ section: \`FAQPage\` mirroring the on-page Q&A verbatim.
- Pages deeper than one level: \`BreadcrumbList\`.

## 8. Off-page authority — owner checklist (append to the TODO list you output)

On-page work alone rarely beats established domains: most "hard" keywords in §3 are hard because of domain authority, which is built off-page. These are OWNER actions, not code — append each as \`TODO(owner): …\` to the final TODO list so nothing is lost:

1. **Google Business Profile**${u.locations !== "global" ? ` (critical for ${u.locations} searches with local intent)` : ""}: claim/create the profile, set the primary category to match §1, add photos, list the §1 offerings as services, and keep name/address/phone identical to the site. Ask every satisfied client for a review with a direct review link; reply to all of them.
2. **Citations**: list the business (with identical name/address/phone and a link) in the market's relevant directories — the general ones plus the sector's own${u.languages[0] && u.languages[0] !== "en" ? `, in ${u.languages[0]} where the directory supports it` : ""}. Consistency matters more than volume.
3. **Starter backlinks**: links from real, related sites — clients ("built by" credit), partners and suppliers, local chambers/associations, event or community sponsorships, and profile pages (GitHub/portfolio/social) pointing at the site. Never buy bulk links; a handful of real ones beats hundreds of junk ones.
4. **Review velocity**: a repeatable ask-for-review step in the delivery process (email/WhatsApp template with the direct link) so reviews accumulate steadily instead of in bursts.

## 9. Anti-duplication rules

1. Each intent cluster in §4 belongs to exactly one page — the assignment is final. Never create a second page whose *meaning* overlaps an existing cluster, even with different wording; semantic retrieval treats them as duplicates competing against each other.
2. Before creating any §4 "create" page, search the codebase for existing pages/sections already covering its head topic. If one exists, upgrade it in place (treat it as "update") instead of shipping a competitor to your own page.
3. If two existing pages already overlap on a topic, merge them into the stronger URL and 301-redirect the weaker one.
4. One canonical page per topic × intent × language. Language variants cross-reference via hreflang, never via duplicated same-language content.
5. Every page's title and meta description must be unique across the site.

## 10. Acceptance checklist

- [ ] Every §4 page is live, in the sitemap, and reachable through at least two internal links with descriptive anchors.
- [ ] Every §4 page: exactly one \`<h1>\`, title ≤ 60 chars, meta description 70–160 chars, self-referencing canonical.
- [ ] Every §4 cluster question is answered by a self-contained, answer-first passage (§5 rule 2), and every §4 entities list is fully covered (§5 rule 4).
- [ ] FAQPage JSON-LD matches the visible FAQ text verbatim on every page that has one.
- [ ] robots, sitemap, and llms.txt are deployed and reachable at their URLs.
- [ ] All §6 audit fixes are applied and none of the "already passing" checks regressed.
- [ ] No two pages target the same query; no duplicated titles/descriptions (§9).
- [ ] Every §8 off-page item appears as a TODO(owner) line in the final TODO list.
- [ ] All remaining \`TODO(owner):\` markers are collected in a list for the owner to fill in.
`;
}

/* ------------------------------------------------------------------------ */
/* MOCK_MODE — deterministic report, no network/Groq, real prompt assembly  */
/* ------------------------------------------------------------------------ */

function mockStrategy(inputUrl: string): StrategyReport {
  const url = normalizeInputUrl(inputUrl);
  let host = "example.com";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep default */
  }

  const understanding: SiteUnderstanding = {
    brand: "Example Studio",
    sector: "web design",
    subSector: "small-business websites",
    coreValueProposition: "fully custom websites built per client request, at a fixed price",
    languages: ["tr", "en"],
    audience: "small business owners in Istanbul who need a first website",
    locations: "Istanbul, Turkey",
    marketCountry: "tr",
    offerings: ["custom website design", "e-commerce setup", "SEO services"],
    problemsSolved: ["no online presence", "outdated site that loses customers"],
    differentiators: ["fixed pricing", "2-week delivery"],
    intentNotes: {
      informational: "a small blog",
      commercial: "a pricing page",
      transactional: "a contact form",
      navigational: "brand name in the title",
    },
  };

  const evidence: SerpEvidence[] = [
    {
      query: "web tasarım istanbul",
      intent: "commercial",
      language: "tr",
      siteRank: null,
      results: [
        { rank: 1, title: "Web Tasarım İstanbul — Rakip A", domain: "rakip-a.com" },
        { rank: 2, title: "İstanbul Web Ajansı", domain: "rakip-b.com" },
      ],
      winners: [
        {
          rank: 1,
          title: "Web Tasarım İstanbul",
          headings: "Hizmetler . Fiyatlar . SSS",
          wordCount: 1400,
          h2Count: 6,
          hasFaqSchema: true,
          hasHowToSchema: false,
          hasPriceSignals: true,
          publishedDate: "2026-03-01",
        },
      ],
      suggestions: ["web tasarım istanbul fiyat", "istanbul web tasarım firması tavsiye"],
      peopleAlsoAsk: [
        { question: "Web tasarım fiyatları ne kadar?", snippet: "Kurumsal web sitesi 15.000–60.000 TL arası…", link: "https://rakip-a.com/fiyatlar" },
      ],
      relatedSearches: ["web tasarım istanbul fiyat", "kurumsal web sitesi tasarımı"],
      answerBox: null,
    },
    {
      query: "web sitesi fiyatları ne kadar",
      intent: "informational",
      language: "tr",
      siteRank: 7,
      results: [{ rank: 1, title: "Web Sitesi Fiyatları 2026", domain: "rakip-c.com" }],
      winners: [],
      suggestions: ["web sitesi fiyatları ne kadar 2026", "web sitesi yıllık ücreti"],
      peopleAlsoAsk: [],
      relatedSearches: [],
      answerBox: { title: "Web Sitesi Fiyatları 2026", snippet: "Basit bir web sitesi 10.000 TL'den başlar…", link: "https://rakip-c.com/fiyatlar" },
    },
  ];

  const headKeywords: HeadKeyword[] = [
    {
      keyword: "web tasarım istanbul",
      intent: "commercial",
      winnability: "hard",
      rationale: "not in top results; winners are established agencies",
    },
    {
      keyword: "web sitesi fiyatları",
      intent: "informational",
      winnability: "medium",
      rationale: "already #7 — upgradable",
    },
  ];

  const pages: PagePlan[] = [
    {
      action: "create",
      slug: "/web-tasarim-istanbul",
      title: "Web Tasarım İstanbul — Sabit Fiyat | Example Studio",
      metaDescription:
        "İstanbul'da küçük işletmeler için sabit fiyatlı, 2 haftada teslim web tasarım hizmeti. Fiyatları görün, örnek işleri inceleyin.",
      pageType: "service",
      intent: "commercial",
      language: "tr",
      headKeyword: "web tasarım istanbul",
      clusterQueries: ["web tasarım istanbul", "web tasarım istanbul fiyat"],
      tailQueries: ["istanbul web tasarım firması tavsiye", "küçük işletme için web sitesi yaptırma"],
      entities: ["özel web tasarım", "sabit fiyat", "teslim süresi", "küçük işletmeler", "İstanbul"],
      faq: [
        {
          question: "İstanbul'da web sitesi yaptırmak ne kadar sürer?",
          answerGuidance: "the fixed 2-week delivery time, from brief to launch",
        },
      ],
      outline: ["İstanbul'da web tasarım hizmetimiz", "İstanbul'da web sitesi yaptırmak ne kadar sürer?"],
    },
    {
      action: "update",
      slug: "/fiyatlar",
      title: "Web Sitesi Fiyatları 2026 — Şeffaf Paketler",
      metaDescription:
        "Web sitesi fiyatları 2026: başlangıç, kurumsal ve e-ticaret paketlerinin net fiyatları ve neleri kapsadıkları.",
      pageType: "pricing",
      intent: "transactional",
      language: "tr",
      headKeyword: "web sitesi fiyatları",
      clusterQueries: ["web sitesi fiyatları ne kadar", "web sitesi yıllık ücreti"],
      tailQueries: ["web sitesi fiyatları ne kadar 2026", "e-ticaret sitesi kurma maliyeti"],
      entities: ["paket fiyatları", "e-ticaret maliyeti", "bakım ücreti", "fiyatı etkileyen faktörler"],
      faq: [
        {
          question: "Web sitesi fiyatları ne kadar?",
          answerGuidance: "the actual package price range with the starting figure first",
        },
      ],
      outline: ["Web sitesi fiyatları ne kadar?", "Paketlerin karşılaştırması"],
    },
  ];

  const gsc: GscRow[] = [
    { query: "web sitesi fiyatları ne kadar", topPage: `${url}/fiyatlar`, clicks: 3, impressions: 120, position: 11.4 },
    { query: "example studio", topPage: url, clicks: 25, impressions: 60, position: 1.2 },
  ];

  const competitors: CompetitorProfile[] = [
    {
      domain: "rakip-a.com",
      bestRank: 1,
      appearsFor: ["web tasarım istanbul"],
      pagesRead: 3,
      summary: "An Istanbul web agency selling package-priced sites to small businesses.",
      keywordsTargeted: ["web tasarım istanbul", "kurumsal web sitesi", "e-ticaret paketi"],
      angles: ["package pricing", "15 years in business"],
      gaps: ["no delivery-time promise", "no visible pricing page"],
    },
  ];

  const market: MarketOverview = {
    scanQueries: ["en iyi web tasarım firmaları istanbul"],
    summary:
      "A crowded local market of package-priced agencies competing on portfolio breadth; nobody promises delivery time or publishes prices.",
    tableStakes: ["portfolio page", "e-commerce packages", "responsive design"],
    standardAngles: ["years in business", "package pricing"],
    openings: ["fixed delivery time", "transparent public pricing"],
  };

  // Same post-plan pass as the real pipeline — exercises PAA → FAQ adoption.
  adoptVerifiedDemand(pages, evidence);

  const prompt = composePrompt({
    url,
    host,
    u: understanding,
    evidence,
    competitors,
    market,
    heads: headKeywords,
    pages,
    audit: null,
    gsc,
  });

  return {
    url,
    host,
    fetchedAt: new Date().toISOString(),
    understanding,
    searchesChecked: evidence,
    gsc,
    competitors,
    market,
    headKeywords,
    pages,
    duplicatesRemoved: 0,
    audit: null,
    prompt,
  };
}

/* ------------------------------------------------------------------------ */
/* Small utils                                                              */
/* ------------------------------------------------------------------------ */

function normalizeInputUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "unknown";
  }
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname || "/") + u.search;
  } catch {
    return url;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
