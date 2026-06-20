import { chromium, type Browser, type Page } from "playwright";
import { config } from "./config.js";

/*
  seo.ts — "what keywords got the top results to the top?"

  Given a seed query, this:
    1. scrapes the Google results page for the top ORGANIC results, skipping
       sponsored/ad blocks (those rank by spend, not by SEO — counting them
       would poison the keyword signal);
    2. fetches each of those top pages and pulls their on-page text
       (title / meta / headings / body);
    3. ranks candidate keyword phrases by how the *winning* pages use them —
       raw frequency plus weight for appearing in titles, headings, meta, and
       across multiple top pages (a keyword many winners share is a stronger
       signal than one a single page repeats);
    4. (optional) hands the top candidates to Groq to dedupe synonyms, drop
       navigational/brand noise, and label search intent.

  Mirrors crawl.ts's ethos: one headless Chromium, human pacing, abort on
  CAPTCHA, every selector best-effort. Like draft.ts, the Groq pass degrades
  gracefully — no key or a bad response just falls back to the heuristic
  ranking. MOCK_MODE returns a deterministic report so the pipeline can be
  exercised offline.

  This is a standalone tool (run via `npm run seo`), not part of the
  scrape_jobs loop — it writes nothing to the DB.
*/

export interface OrganicResult {
  rank: number;
  title: string;
  url: string;
  domain: string;
}

/* On-page text pulled from one top-ranking page, split by SEO signal. */
interface PageText {
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  headings: string; // h1/h2/h3 joined
  body: string;
}

export interface KeywordCandidate {
  keyword: string;
  words: number;
  frequency: number; // total body occurrences across all crawled pages
  pages: number; // distinct top pages it appears on
  titleHits: number; // top pages with it in <title>
  headingHits: number; // top pages with it in a heading
  metaHits: number; // top pages with it in meta description/keywords
  score: number;
}

/* Groq's cleaned-up view of the candidates. */
export interface RefinedKeyword {
  keyword: string;
  intent: string; // informational | commercial | transactional | navigational
  rationale: string;
}

export interface SeoReport {
  seed: string;
  region: string;
  language: string;
  organic: OrganicResult[];
  adsSkipped: number;
  pagesCrawled: number;
  candidates: KeywordCandidate[];
  refined: RefinedKeyword[] | null; // null = Groq not run / unavailable
}

/* ------------------------------------------------------------------------ */

export interface ResearchOptions {
  /* Override the env/config defaults (used by DB-driven jobs, which carry
     their own region/language). Omitted fields fall back to `config`. */
  region?: string;
  language?: string;
  topN?: number;
  maxKeywords?: number;
  /* Called after each top page is crawled — lets a caller report progress and
     abort (by throwing) on job cancellation, exactly like crawlMaps. */
  onProgress?: (done: number, total: number) => Promise<void> | void;
}

export async function researchKeywords(
  seed: string,
  opts: ResearchOptions = {}
): Promise<SeoReport> {
  const query = seed.trim();
  if (!query) throw new Error("Seed query is empty.");

  const region = opts.region ?? config.seoRegion;
  const language = opts.language ?? config.seoLanguage;
  const topN = opts.topN ?? config.seoTopN;
  const maxKeywords = opts.maxKeywords ?? config.seoMaxKeywords;

  if (config.mockMode) return mockReport(query, region, language);

  const organicAll = await scrapeOrganicResults(query, region, language);
  const organic = organicAll.results.slice(0, topN);
  console.log(
    `[seo] ${organicAll.results.length} organic results ` +
      `(${organicAll.adsSkipped} sponsored skipped) — crawling top ${organic.length}`
  );

  const pages: PageText[] = [];
  for (let i = 0; i < organic.length; i++) {
    const page = await fetchPageText(organic[i].url);
    if (page) pages.push(page);
    await opts.onProgress?.(i + 1, organic.length); // may throw to cancel
    await sleep(rand(400, 1100)); // polite pacing between page fetches
  }
  console.log(`[seo] extracted text from ${pages.length}/${organic.length} pages`);

  const candidates = extractCandidates(pages).slice(0, maxKeywords);
  const refined = await refineWithGroq(query, candidates);

  return {
    seed: query,
    region,
    language,
    organic,
    adsSkipped: organicAll.adsSkipped,
    pagesCrawled: pages.length,
    candidates,
    refined,
  };
}

/* ------------------------------------------------------------------------ */
/* 1. Google SERP — organic results only                                    */
/* ------------------------------------------------------------------------ */

async function scrapeOrganicResults(
  query: string,
  region: string,
  language: string
): Promise<{ results: OrganicResult[]; adsSkipped: number }> {
  const browser: Browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1366, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // num=20 over-fetches so we still have ≥topN organic results after ads
    // and junk links are dropped.
    const url =
      `https://www.google.com/search?q=${encodeURIComponent(query)}` +
      `&hl=${encodeURIComponent(language)}` +
      `&gl=${encodeURIComponent(region)}&num=20`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    await dismissConsent(page);
    await assertNoCaptcha(page);
    await page.waitForSelector("#search, #rso, #main", { timeout: 20000 }).catch(() => {});

    const { results, adsSkipped } = await extractSerp(page);

    if (results.length === 0) {
      throw new Error(
        `0 organic results for "${query}" — page title was "${await page.title()}". ` +
          "Google may have served an interstitial or changed its markup; retry later."
      );
    }
    return { results, adsSkipped };
  } finally {
    await browser.close();
  }
}

/*
  Pull organic results out of the SERP DOM. Organic results live under #rso;
  sponsored blocks (#tads top, #tadsb/#bottomads bottom, anything marked
  [data-text-ad] or labelled "Sponsored"/"Ad"/"Reklam") live outside it — so
  scoping to #rso skips ads by construction, and we still count them for the
  report. Google's markup is volatile: this is best-effort with fallbacks.
*/
async function extractSerp(
  page: Page
): Promise<{ results: OrganicResult[]; adsSkipped: number }> {
  // Runs in the browser; DOM types aren't in the worker's tsconfig lib, so
  // reach globals via globalThis and type nodes as `any` (same workaround
  // crawl.ts uses with its `unknown` casts).
  return page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const doc: any = (globalThis as any).document;
    const loc: any = (globalThis as any).location;

    const isAdAncestor = (el: any): boolean => {
      for (let node: any = el; node; node = node.parentElement) {
        const id = node.id || "";
        if (/^(tads|tadsb|bottomads|tvcap)$/i.test(id)) return true;
        if (node.hasAttribute?.("data-text-ad")) return true;
        if (node.getAttribute?.("aria-label") === "Ads") return true;
      }
      return false;
    };

    // Count ad result links so the report can say "N sponsored skipped".
    let adsSkipped = 0;
    doc
      .querySelectorAll("#tads h3, #tadsb h3, #bottomads h3, [data-text-ad] h3")
      .forEach(() => {
        adsSkipped++;
      });

    const root: any =
      doc.querySelector("#rso") ||
      doc.querySelector("#search") ||
      doc.querySelector("#main") ||
      doc.body;

    const seen = new Set<string>();
    const results: { rank: number; title: string; url: string; domain: string }[] = [];

    root.querySelectorAll("h3").forEach((h3: any) => {
      const anchor: any = h3.closest("a[href]");
      if (!anchor) return;
      if (isAdAncestor(anchor)) return;

      let href: string = anchor.href;
      // Older results wrap the target in /url?q=… ; unwrap it.
      if (href.startsWith("/url?") || href.includes("/url?q=")) {
        try {
          const u = new URL(href, loc.origin);
          href = u.searchParams.get("q") || u.searchParams.get("url") || href;
        } catch {
          /* keep href */
        }
      }
      if (!/^https?:\/\//i.test(href)) return;

      let domain = "";
      try {
        domain = new URL(href).hostname.replace(/^www\./, "");
      } catch {
        return;
      }
      // Drop Google's own surfaces and cache/translate links.
      if (/(^|\.)google\.[a-z.]+$/i.test(domain)) return;
      if (/(webcache|translate)\.google/i.test(href)) return;
      const dedup = domain + "|" + href;
      if (seen.has(dedup)) return;
      seen.add(dedup);

      const title = (h3.textContent || "").trim();
      if (!title) return;
      results.push({ rank: results.length + 1, title, url: href, domain });
    });

    return { results, adsSkipped };
  });
}

/* ------------------------------------------------------------------------ */
/* 2. Fetch one top page and split its text by SEO signal                   */
/* ------------------------------------------------------------------------ */

async function fetchPageText(url: string): Promise<PageText | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; KaguSEO/1.0)" },
    });
    if (!res.ok) {
      console.warn(`[seo] ${res.status} fetching ${url}`);
      return null;
    }
    const ct = res.headers.get("content-type") || "";
    if (ct && !/html|text/i.test(ct)) return null; // skip PDFs/images/etc.

    const html = (await res.text()).slice(0, 600_000);

    return {
      url,
      title: stripTags(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
      metaDescription: metaContent(html, "description"),
      metaKeywords: metaContent(html, "keywords"),
      headings: allMatches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)
        .map(stripTags)
        .join(" . "),
      body: visibleText(html),
    };
  } catch (err) {
    console.warn(`[seo] failed to fetch ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* 3. Heuristic keyword extraction                                          */
/* ------------------------------------------------------------------------ */

function extractCandidates(pages: PageText[]): KeywordCandidate[] {
  const total = pages.length || 1;
  const stats = new Map<string, KeywordCandidate>();

  const touch = (key: string): KeywordCandidate => {
    let c = stats.get(key);
    if (!c) {
      c = {
        keyword: key,
        words: key.split(" ").length,
        frequency: 0,
        pages: 0,
        titleHits: 0,
        headingHits: 0,
        metaHits: 0,
        score: 0,
      };
      stats.set(key, c);
    }
    return c;
  };

  for (const page of pages) {
    const bodyCounts = ngramCounts(tokenize(page.body));
    const titleSet = ngramSet(tokenize(page.title));
    const headingSet = ngramSet(tokenize(page.headings));
    const metaSet = ngramSet(tokenize(`${page.metaDescription} ${page.metaKeywords}`));

    // A keyword present anywhere on this page counts toward its page coverage.
    const onThisPage = new Set<string>([
      ...bodyCounts.keys(),
      ...titleSet,
      ...headingSet,
      ...metaSet,
    ]);
    for (const key of onThisPage) {
      const c = touch(key);
      c.pages += 1;
      if (titleSet.has(key)) c.titleHits += 1;
      if (headingSet.has(key)) c.headingHits += 1;
      if (metaSet.has(key)) c.metaHits += 1;
    }
    for (const [key, n] of bodyCounts) touch(key).frequency += n;
  }

  const candidates: KeywordCandidate[] = [];
  for (const c of stats.values()) {
    // Drop one-off noise: keep phrases that recur or span multiple winners.
    if (c.frequency < 2 && c.pages < 2) continue;

    const coverage = c.pages / total; // 0..1 — share of winners using it
    const phraseBonus = 1 + 0.3 * (c.words - 1); // favour 2–3 word phrases
    c.score = Math.round(
      (c.frequency +
        c.titleHits * 5 +
        c.headingHits * 3 +
        c.metaHits * 2 +
        coverage * 10) *
        phraseBonus
    );
    candidates.push(c);
  }

  return candidates.sort(
    (a, b) => b.score - a.score || b.pages - a.pages || b.frequency - a.frequency
  );
}

/* ------------------------------------------------------------------------ */
/* 4. Groq refinement (optional, graceful)                                  */
/* ------------------------------------------------------------------------ */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
let warnedNoKey = false;

async function refineWithGroq(
  seed: string,
  candidates: KeywordCandidate[]
): Promise<RefinedKeyword[] | null> {
  if (candidates.length === 0) return null;
  if (!config.groqApiKey) {
    if (!warnedNoKey) {
      console.warn("[seo] GROQ_API_KEY not set — returning heuristic ranking only.");
      warnedNoKey = true;
    }
    return null;
  }

  // Feed the model the heuristic candidates + their signals so it ranks with
  // evidence rather than guessing. Cap the list to keep the prompt tight.
  const rows = candidates
    .slice(0, 40)
    .map(
      (c) =>
        `${c.keyword} | freq:${c.frequency} pages:${c.pages} ` +
        `title:${c.titleHits} heading:${c.headingHits} meta:${c.metaHits}`
    )
    .join("\n");

  const prompt = `You are an SEO keyword analyst. A crawler scraped the current top-ranking
organic pages for the seed query "${seed}" and extracted these candidate
keyword phrases with on-page signals (freq = total occurrences, pages = how
many of the top pages used it, title/heading/meta = how many used it there):

${rows}

Return the most valuable SEO keywords to target for this query. Rules:
- Merge synonyms/variants/plurals into ONE canonical phrase (keep the form a
  searcher would type).
- Drop navigational/brand/boilerplate noise (menu labels, "contact us",
  cookie text, single generic words with no intent).
- Prefer phrases the winning pages share (high pages count) and that sit in
  titles/headings.
- Order by how worthwhile they are to target.
- Label each with search intent: informational | commercial | transactional | navigational.

Respond with STRICT JSON, nothing else:
{"keywords": [{"keyword": "...", "intent": "...", "rationale": "one short clause"}]}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.groqApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.groqModel,
          temperature: 0.2,
          max_tokens: 1536,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        throw new Error(`Groq API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq response had no message content");

      const parsed = JSON.parse(text) as { keywords?: unknown };
      const list = Array.isArray(parsed.keywords) ? parsed.keywords : [];
      const refined: RefinedKeyword[] = [];
      for (const item of list) {
        const k = item as Record<string, unknown>;
        const keyword = typeof k.keyword === "string" ? k.keyword.trim() : "";
        if (!keyword) continue;
        refined.push({
          keyword,
          intent: typeof k.intent === "string" ? k.intent.trim() : "unknown",
          rationale: typeof k.rationale === "string" ? k.rationale.trim() : "",
        });
      }
      if (refined.length === 0) throw new Error("Groq returned no usable keywords");
      return refined;
    } catch (err) {
      console.warn(`[seo] Groq refine attempt ${attempt} failed:`, err);
    }
  }
  return null; // fall back to heuristic ranking
}

/* ------------------------------------------------------------------------ */
/* Tokenisation / n-grams                                                   */
/* ------------------------------------------------------------------------ */

const MAX_NGRAM = 3;

/* Lowercase unicode word tokens; keeps Turkish/Arabic letters via \p{L}. */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (t) => t.length >= 2 && t.length <= 30
  );
}

/* Map of n-gram → occurrence count for one text. */
function ngramCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let n = 1; n <= MAX_NGRAM; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const gram = tokens.slice(i, i + n);
      if (!keepGram(gram)) continue;
      const key = gram.join(" ");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function ngramSet(tokens: string[]): Set<string> {
  return new Set(ngramCounts(tokens).keys());
}

/* A keyword phrase is worth keeping only if its edges carry meaning. */
function keepGram(gram: string[]): boolean {
  if (gram.length === 0) return false;
  if (STOPWORDS.has(gram[0]) || STOPWORDS.has(gram[gram.length - 1])) return false;
  if (gram.every((w) => STOPWORDS.has(w))) return false;
  if (gram.every((w) => /^\d+$/.test(w))) return false; // pure numbers
  return true;
}

/* Compact English + Turkish stopword set (Istanbul market → mixed-language). */
const STOPWORDS = new Set<string>([
  // English
  "the","a","an","and","or","but","of","to","in","on","for","with","at","by",
  "from","as","is","are","was","were","be","been","being","it","its","this",
  "that","these","those","you","your","we","our","us","they","their","he","she",
  "his","her","i","me","my","do","does","did","has","have","had","will","would",
  "can","could","should","may","might","must","not","no","yes","if","then","than",
  "so","such","more","most","very","just","also","about","into","over","out","up",
  "down","off","all","any","some","each","other","new","get","got","here","there",
  "when","where","what","which","who","how","why","www","com","http","https","org",
  "net","page","home","menu","click","read","see","view","contact","us","info",
  // Turkish
  "ve","veya","ile","için","bir","bu","şu","o","da","de","ki","mi","mu","mı","mü",
  "çok","daha","en","gibi","ama","fakat","ancak","ya","ise","den","dan","ten","tan",
  "nin","nın","nun","nün","ın","in","un","ün","ler","lar","olarak","olan","var",
  "yok","ne","nasıl","neden","tüm","her","bazı","kendi","sizin","bizim","siz","biz",
]);

/* ------------------------------------------------------------------------ */
/* HTML text helpers (regex-only — no DOM parser dependency)                */
/* ------------------------------------------------------------------------ */

function firstMatch(html: string, re: RegExp): string {
  return html.match(re)?.[1] ?? "";
}

function allMatches(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => m[1]);
}

/* <meta name="description"|"keywords" content="…"> in either attr order. */
function metaContent(html: string, name: string): string {
  const a = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i")
  );
  if (a) return decodeEntities(a[1]);
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i")
  );
  return b ? decodeEntities(b[1]) : "";
}

/* Strip script/style/markup, leaving readable text. */
function visibleText(html: string): string {
  return stripTags(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
  );
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/* ------------------------------------------------------------------------ */
/* SERP scrape helpers (mirrors crawl.ts)                                    */
/* ------------------------------------------------------------------------ */

async function dismissConsent(page: Page): Promise<void> {
  try {
    const accept = page.getByRole("button", { name: /accept all|reject all|i agree/i }).first();
    if (await accept.count()) {
      await accept.click({ timeout: 5000 });
      await page.waitForLoadState("domcontentloaded");
      await sleep(rand(700, 1400));
    }
  } catch {
    /* no consent screen — fine */
  }
}

async function assertNoCaptcha(page: Page): Promise<void> {
  if (page.url().includes("/sorry/") || (await page.locator("iframe[src*='recaptcha']").count()) > 0) {
    throw new Error("Google CAPTCHA encountered — aborting. Wait before retrying.");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* ------------------------------------------------------------------------ */
/* MOCK_MODE — deterministic report, no Google/Groq calls                   */
/* ------------------------------------------------------------------------ */

function mockReport(seed: string, region: string, language: string): SeoReport {
  const base = seed.toLowerCase();
  const organic: OrganicResult[] = Array.from({ length: 5 }, (_, i) => ({
    rank: i + 1,
    title: `${titleCase(seed)} — Result ${i + 1}`,
    url: `https://example-${i + 1}.com/${base.replace(/\s+/g, "-")}`,
    domain: `example-${i + 1}.com`,
  }));

  const candidates: KeywordCandidate[] = [
    { keyword: base, words: base.split(" ").length, frequency: 42, pages: 5, titleHits: 5, headingHits: 4, metaHits: 5, score: 120 },
    { keyword: `best ${base}`, words: base.split(" ").length + 1, frequency: 18, pages: 4, titleHits: 2, headingHits: 3, metaHits: 2, score: 88 },
    { keyword: `${base} prices`, words: base.split(" ").length + 1, frequency: 12, pages: 3, titleHits: 1, headingHits: 2, metaHits: 1, score: 61 },
    { keyword: `${base} near me`, words: base.split(" ").length + 2, frequency: 9, pages: 3, titleHits: 0, headingHits: 1, metaHits: 1, score: 47 },
  ];

  return {
    seed,
    region,
    language,
    organic,
    adsSkipped: 3,
    pagesCrawled: 5,
    candidates,
    refined: [
      { keyword: base, intent: "commercial", rationale: "core query, on every winner's title" },
      { keyword: `best ${base}`, intent: "commercial", rationale: "comparison intent, strong heading presence" },
      { keyword: `${base} prices`, intent: "transactional", rationale: "buyers checking cost" },
      { keyword: `${base} near me`, intent: "transactional", rationale: "local intent" },
    ],
  };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
