import { config } from "./config.js";
import { serpCacheGet, serpCacheKey, serpCacheSet } from "./serp-cache.js";

/*
  seo.ts — "what keywords got the top results to the top?"

  Given a seed query, this:
    1. fetches the top ORGANIC results from DuckDuckGo's HTML endpoint (Bing
       index) — ads-free, no key/CAPTCHA, just a plain fetch. The Google HTML
       SERP was abandoned: it CAPTCHAs every request, even real headed Chrome on
       a fresh IP, and Google's Custom Search API is closed to new projects;
    2. fetches each of those top pages and pulls their on-page text
       (title / meta / headings / body);
    3. ranks candidate keyword phrases by how the *winning* pages use them —
       raw frequency plus weight for appearing in titles, headings, meta, and
       across multiple top pages (a keyword many winners share is a stronger
       signal than one a single page repeats);
    4. (optional) hands the top candidates to Groq to dedupe synonyms, drop
       navigational/brand noise, and label search intent.

  Page fetches (step 2) use plain fetch with human pacing, every selector
  best-effort. Like draft.ts, the Groq pass degrades gracefully — no key or a
  bad response just falls back to the heuristic ranking. MOCK_MODE returns a
  deterministic report so the pipeline can be exercised offline.

  This is a standalone tool (run via `npm run seo`), not part of the
  scrape_jobs loop — it writes nothing to the DB.
*/

export interface OrganicResult {
  rank: number;
  title: string;
  url: string;
  domain: string;
}

/* Everything one SERP fetch yields. Serper returns far more than the ten
   blue links in the same single credit — "People also ask", related
   searches, the answer box (featured snippet — whoever owns it is the AEO
   target), and the knowledge panel. DuckDuckGo gives organic only, so those
   fields come back empty there; consumers must treat them as optional
   evidence, never required. */
export interface SerpPage {
  results: OrganicResult[];
  adsSkipped: number;
  source: "serper" | "duckduckgo";
  peopleAlsoAsk: Array<{ question: string; snippet: string; title: string; link: string }>;
  relatedSearches: string[];
  answerBox: { title: string; snippet: string; link: string } | null;
  knowledgeGraph: { title: string; type: string } | null;
  /* Credits this call cost (Serper's `credits` field — the price of the
     request, NOT a balance; the free pool's remaining balance is only visible
     on the serper.dev dashboard). Null on DuckDuckGo and on cache replays. */
  creditsUsed: number | null;
}

export interface SerpOptions {
  /* Organic results wanted. Defaults to config.seoTopN. Serper bills 1 credit
     for ≤10 and more above that, so callers asking for deep ranks pay for it. */
  topN?: number;
  /* Skip the SERP cache read (the fresh answer is still written back). For
     checks that must reflect the live SERP, e.g. a "did it move today?" probe. */
  noCache?: boolean;
  /* Also fetch Google's SERP features (People Also Ask, related searches,
     answer box). Serper drops all of them from any request that carries a
     country (`gl` / `location`) — verified live: the same Turkish query
     returns 4 PAA + 8 related with `hl` only and nothing with `gl=tr`. So a
     localised check needs a second, country-less call for the features —
     one more credit per query. Off by default; the strategy's per-query
     checks turn it on, rank tracking and market scans don't need it. */
  features?: boolean;
}

/* On-page text pulled from one fetched page, split by SEO signal.
   Exported: strategy.ts reuses it to read the target site itself. */
export interface PageText {
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  headings: string; // h1/h2/h3 joined
  body: string; // all visible text (visibleText)
  /* Main content only (mainText): body minus nav/header/footer/aside/forms/
     buttons/cookie banners. Optional so callers that build a PageText by
     hand (strategy.ts) keep compiling; extractCandidates falls back to body. */
  mainBody?: string;
}

export interface KeywordCandidate {
  keyword: string;
  words: number;
  frequency: number; // total body occurrences across all crawled pages
  pages: number; // distinct top pages it appears on
  titleHits: number; // top pages with it in <title>
  headingHits: number; // top pages with it in a heading
  metaHits: number; // top pages with it in meta description/keywords
  seedOverlap: boolean; // shares a (fuzzy) token with the seed query
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

  const organicAll = await scrapeOrganicResults(query, region, language, { topN });
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

  const candidates = extractCandidates(pages, query).slice(0, maxKeywords);
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

/* Exported: strategy.ts reuses the SERP scrape for its per-query checks.
   With SERPER_API_KEY set, real Google results come from serper.dev (the
   free 2,500-query allowance — no card on file, so it can never bill). Any
   Serper refusal (out of credits, bad key, rate limit) drops back to
   DuckDuckGo for that query rather than failing the job. */
export async function scrapeOrganicResults(
  query: string,
  region: string,
  language: string,
  opts: SerpOptions = {}
): Promise<SerpPage> {
  const topN = opts.topN ?? config.seoTopN;
  const key = serpCacheKey(query, region, language, topN);
  const trim = (p: SerpPage): SerpPage =>
    p.results.length > topN ? { ...p, results: p.results.slice(0, topN) } : p;

  if (!opts.noCache) {
    // A cached DuckDuckGo answer must not stand in for Google while Serper is
    // still usable — Bing's ranking is a different SERP, not a stale one.
    const serperUsable = Boolean(config.serperApiKey) && !serperPaused();
    const hit = await serpCacheGet(key, (p) => !(serperUsable && p.source !== "serper"));
    if (hit) {
      console.log(`[seo] SERP cache hit (${hit.layer}) for "${query}"`);
      return trim(hit.page);
    }
  }

  const page = await fetchSerpLive(query, region, language, topN);
  // Cache writes are best-effort and never throw (serp-cache.ts).
  await serpCacheSet(key, query, region, language, page);
  return opts.features ? withSerpFeatures(trim(page), query, language, opts) : trim(page);
}

/* Second pass for the SERP features a country-scoped Serper call omits: the
   same query with `hl` only (its own cache entry — gl=""), merged onto the
   localised ranking. Skipped when the first answer already carried features
   or wasn't Google at all (DuckDuckGo has none to add). */
async function withSerpFeatures(
  page: SerpPage,
  query: string,
  language: string,
  opts: SerpOptions
): Promise<SerpPage> {
  const hasFeatures = page.peopleAlsoAsk.length > 0 || page.relatedSearches.length > 0 || page.answerBox !== null;
  if (hasFeatures || page.source !== "serper") return page;
  try {
    const feat = await scrapeOrganicResults(query, "", language, { topN: 10, noCache: opts.noCache });
    if (feat.source !== "serper") return page;
    return {
      ...page,
      peopleAlsoAsk: feat.peopleAlsoAsk,
      relatedSearches: feat.relatedSearches,
      answerBox: feat.answerBox,
      knowledgeGraph: page.knowledgeGraph ?? feat.knowledgeGraph,
      creditsUsed: (page.creditsUsed ?? 0) + (feat.creditsUsed ?? 0) || null,
    };
  } catch (err) {
    console.warn(`[seo] SERP features call failed for "${query}":`, err instanceof Error ? err.message : err);
    return page;
  }
}

async function fetchSerpLive(
  query: string,
  region: string,
  language: string,
  topN: number
): Promise<SerpPage> {
  if (config.serperApiKey && !serperPaused()) {
    try {
      const page = await scrapeSerper(query, region, language, topN);
      noteSerperCredits(page.creditsUsed);
      return page;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Auth / quota errors won't fix themselves mid-run: stop asking for a
      // while. Serper sometimes reports these as a 200 whose body carries
      // only a message. Not forever, though — the worker runs for weeks, and
      // a topped-up balance or rotated key must be picked up without a
      // restart (and one bad request must not demote every later SERP to
      // DuckDuckGo for the process lifetime).
      if (/Serper (400|401|402|403)|credit|quota|api key|unauthori[sz]ed/i.test(msg)) {
        serperPausedUntil = Date.now() + SERPER_PAUSE_MS;
        console.warn(`[seo] Serper paused for ${SERPER_PAUSE_MS / 60000} min: ${msg}`);
      }
      console.warn(`[seo] Serper failed for "${query}" (${msg}) — falling back to DuckDuckGo`);
    }
  }
  return scrapeDuckDuckGo(query, region, language, topN);
}

const SERPER_PAUSE_MS = 60 * 60 * 1000;
let serperPausedUntil = 0;
const serperPaused = () => Date.now() < serperPausedUntil;

/* Google's gl/hl take bare ISO codes; anything else (an LLM's "tr-TR" or
   "turkish") makes Serper 400 — and that 400 would pause Serper. */
const isoCode = (v: string) => (/^[a-z]{2}$/i.test(v.trim()) ? v.trim().toLowerCase() : "");

/* Credit telemetry. Serper's search response never says what's left — only
   what the call cost — so this tracks SPEND per process: one log line every
   50 credits, and a loud warning once the session passes SERPER_CREDIT_BUDGET
   (the free pool is 2,500 and never refills; running dry silently degrades
   every SERP to DuckDuckGo). The real balance lives on the serper.dev
   dashboard. */
let creditsSpent = 0;
let lastLoggedSpend = 0;
let warnedBudget = false;

function noteSerperCredits(cost: number | null): void {
  if (cost === null) return;
  creditsSpent += cost;
  if (creditsSpent - lastLoggedSpend >= 50) {
    console.log(`[seo] Serper credits spent this session: ${creditsSpent}`);
    lastLoggedSpend = creditsSpent;
  }
  if (!warnedBudget && creditsSpent > config.serperCreditBudget) {
    console.warn(
      `[seo] ⚠ SERPER SPEND: ${creditsSpent} credits this session (budget ${config.serperCreditBudget}). ` +
        "Check the balance on serper.dev — at 0 every SERP check falls back to DuckDuckGo."
    );
    warnedBudget = true;
  }
}

/* Exported for the CLI summaries. */
export const serperCreditsSpent = () => creditsSpent;

/* Serper's /search payload — only the fields we read. `message`/`error`
   appear on refusals that still come back as HTTP 200. */
export interface SerperResponse {
  organic?: Array<{ title?: string; link?: string }>;
  peopleAlsoAsk?: Array<{ question?: string; snippet?: string; title?: string; link?: string }>;
  relatedSearches?: Array<{ query?: string }>;
  answerBox?: { title?: string; snippet?: string; answer?: string; link?: string };
  knowledgeGraph?: { title?: string; type?: string };
  credits?: number;
  message?: string;
  error?: string;
}

async function scrapeSerper(
  query: string,
  region: string,
  language: string,
  topN: number
): Promise<SerpPage> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": config.serperApiKey, "content-type": "application/json" },
    body: JSON.stringify({
      q: query,
      ...(isoCode(region) ? { gl: isoCode(region) } : {}),
      ...(isoCode(language) ? { hl: isoCode(language) } : {}),
      num: Math.min(topN, 10), // ≤10 results = 1 credit
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as SerperResponse;
  // No query in the error text: the caller pattern-matches it for quota words,
  // and a query like "credit card" must not trip that.
  return parseSerperResponse(data, topN);
}

/* Pure: Serper JSON → SerpPage. Throws when there are no usable organic
   results, surfacing Serper's own message (e.g. "Not enough credits") so the
   fallback log says *why* rather than just "0 results". */
export function parseSerperResponse(data: SerperResponse, topN: number): SerpPage {
  const results: OrganicResult[] = [];
  const seen = new Set<string>();
  for (const item of data.organic ?? []) {
    if (!item.link || !item.title || seen.has(item.link)) continue;
    let domain = "";
    try {
      domain = new URL(item.link).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    seen.add(item.link);
    results.push({ rank: results.length + 1, title: item.title, url: item.link, domain });
    if (results.length >= topN) break;
  }
  if (results.length === 0) {
    const why = (data.message || data.error || "").toString().trim().slice(0, 200);
    throw new Error(`Serper returned 0 organic results${why ? ` (Serper says: ${why})` : ""}`);
  }

  const peopleAlsoAsk = (data.peopleAlsoAsk ?? [])
    .filter((p) => typeof p.question === "string" && p.question.trim())
    .map((p) => ({
      question: p.question!.trim(),
      snippet: (p.snippet ?? "").trim(),
      title: (p.title ?? "").trim(),
      link: (p.link ?? "").trim(),
    }));
  const relatedSearches = (data.relatedSearches ?? [])
    .map((r) => (r.query ?? "").trim())
    .filter(Boolean);
  const ab = data.answerBox;
  const answerBox =
    ab && (ab.snippet || ab.answer)
      ? { title: (ab.title ?? "").trim(), snippet: (ab.snippet ?? ab.answer ?? "").trim(), link: (ab.link ?? "").trim() }
      : null;
  const kg = data.knowledgeGraph;
  const knowledgeGraph = kg?.title ? { title: kg.title.trim(), type: (kg.type ?? "").trim() } : null;

  return {
    results,
    adsSkipped: 0,
    source: "serper",
    peopleAlsoAsk,
    relatedSearches,
    answerBox,
    knowledgeGraph,
    creditsUsed: typeof data.credits === "number" ? data.credits : null,
  };
}

async function scrapeDuckDuckGo(
  query: string,
  region: string,
  language: string,
  topN: number
): Promise<SerpPage> {
  // DuckDuckGo's HTML endpoint: no key, no account, no JS, no CAPTCHA — just
  // server-rendered links we parse with a plain fetch. Results come from Bing's
  // index, which is plenty for keyword research. (Google's own HTML SERP
  // CAPTCHAs every scrape, even real headed Chrome on a fresh IP, and its
  // Custom Search API is closed to new projects.) `kl` biases by region the way
  // Google's `gl` did; DDG returns organic results only, so adsSkipped is 0.
  const kl = region ? `${region.toLowerCase()}-${region.toLowerCase()}` : "";
  const url =
    "https://html.duckduckgo.com/html/" +
    `?q=${encodeURIComponent(query)}` +
    (kl ? `&kl=${encodeURIComponent(kl)}` : "");

  const res = await fetch(url, {
    headers: {
      // DDG serves a blank page to header-less bots; a normal browser UA is
      // enough to get the real results.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": `${language},en;q=0.9`,
    },
  });
  if (!res.ok) throw new Error(`DuckDuckGo HTML ${res.status} for "${query}".`);
  const html = await res.text();

  const results: OrganicResult[] = [];
  const seen = new Set<string>();
  // Each organic result is <a class="result__a" href="…">Title</a>.
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && results.length < topN) {
    let href = decodeEntities(m[1]);
    // DDG wraps targets in /l/?uddg=<encoded real url> — unwrap it.
    const uddg = href.match(/[?&]uddg=([^&]+)/);
    if (uddg) {
      try {
        href = decodeURIComponent(uddg[1]);
      } catch {
        /* keep the wrapped href */
      }
    }
    if (!/^https?:\/\//i.test(href)) continue;

    let domain = "";
    try {
      domain = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (seen.has(href)) continue;
    seen.add(href);

    const title = stripTags(m[2]);
    if (!title) continue;
    results.push({ rank: results.length + 1, title, url: href, domain });
  }

  if (results.length === 0) {
    throw new Error(
      `0 results for "${query}" from DuckDuckGo — it may have rate-limited; retry later.`
    );
  }
  return {
    results,
    adsSkipped: 0,
    source: "duckduckgo",
    peopleAlsoAsk: [],
    relatedSearches: [],
    answerBox: null,
    knowledgeGraph: null,
    creditsUsed: null,
  };
}

/* ------------------------------------------------------------------------ */
/* 2. Fetch one top page and split its text by SEO signal                   */
/* ------------------------------------------------------------------------ */

/* Exported: strategy.ts reuses this to digest site + winner pages. */
export async function fetchPageText(url: string): Promise<PageText | null> {
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
      mainBody: mainText(html),
    };
  } catch (err) {
    console.warn(`[seo] failed to fetch ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* 3. Heuristic keyword extraction                                          */
/* ------------------------------------------------------------------------ */

/* Exported for tests. `seed` (optional) enables the seed-relevance boost. */
export function extractCandidates(pages: PageText[], seed = ""): KeywordCandidate[] {
  const total = pages.length || 1;
  const seedTokens = tokenize(seed).filter((t) => !STOPWORDS.has(t));
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
        seedOverlap: false,
        score: 0,
      };
      stats.set(key, c);
    }
    return c;
  };

  for (const page of pages) {
    // Main content, not chrome: menus/footers/cookie banners repeat on every
    // page and used to crowd real topical phrases out. A page whose text is
    // ALL chrome (mainBody empty) still counts via its full body.
    const text = page.mainBody?.trim() ? page.mainBody : page.body;
    const bodyCounts = ngramCounts(tokenize(text));
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

    // Seed relevance: phrases about what the searcher typed get ×1.5. No
    // overlap is ×1.0, not a penalty — long-tail discovery (phrases the
    // winners use that the seed never said) is half the point of the tool.
    c.seedOverlap = c.keyword
      .split(" ")
      .some((t) => seedTokens.some((s) => fuzzyTokenMatch(t, s)));
    const seedMult = c.seedOverlap ? 1.5 : 1;

    // Boilerplate: on EVERY crawled page yet never in any title, heading or
    // meta — that's site chrome mainText couldn't see (unlabelled divs,
    // "all rights reserved", widget text), not something the winners rank
    // *for*. ×0.3 rather than dropping it so a real-but-unheaded topic can
    // still surface on frequency. Needs ≥2 pages: with one, everything is
    // "on every page".
    const boilerplate =
      pages.length >= 2 &&
      c.pages === pages.length &&
      c.titleHits + c.headingHits + c.metaHits === 0;
    const boilerMult = boilerplate ? 0.3 : 1;

    c.score = Math.round(
      (c.frequency +
        c.titleHits * 5 +
        c.headingHits * 3 +
        c.metaHits * 2 +
        coverage * 10) *
        phraseBonus *
        seedMult *
        boilerMult
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
          ...config.groqExtraParams,
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

/* Lowercase unicode *letter* tokens; keeps Turkish/Arabic via \p{L}. Digits
   are excluded on purpose: real keywords are words, and allowing \p{N} let
   JSON/unicode-escape junk like "u0131" survive as a token. Exported for tests. */
export function tokenize(text: string): string[] {
  // Drop the combining dot (U+0307) that lowercasing Turkish "İ" inserts —
  // else "İstanbul" → "i"+◌̇+"stanbul" tokenises to a bogus "stanbul".
  return (text.toLowerCase().replace(/\u0307/g, "").match(/\p{L}+/gu) ?? []).filter(
    (t) => t.length >= 2 && t.length <= 30
  );
}

/* Same word modulo suffixes, without a stemmer: equal, or sharing a prefix
   of ≥4 chars that covers all of the shorter word except at most its last
   letter. That catches Turkish case/plural suffixes ("istanbul" ~
   "istanbulda", "diş"-length words need an exact match) and consonant
   softening ("kitap" ~ "kitabı"), while "dental" vs "dentist" or
   "internet" vs "international" stay distinct. */
export function fuzzyTokenMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  let p = 0;
  while (p < shorter && a[p] === b[p]) p++;
  return p >= 4 && p >= shorter - 1;
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
/* Exported: audit.ts reuses them for its static on-page checks.            */
/* ------------------------------------------------------------------------ */

export function firstMatch(html: string, re: RegExp): string {
  return html.match(re)?.[1] ?? "";
}

export function allMatches(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => m[1]);
}

/* <meta name="description"|"keywords" content="…"> in either attr order. */
export function metaContent(html: string, name: string): string {
  const a = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i")
  );
  if (a) return decodeEntities(a[1]);
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i")
  );
  return b ? decodeEntities(b[1]) : "";
}

/* Strip script/style/markup, leaving readable prose. */
export function visibleText(html: string): string {
  // Scope to <body> so <head> JSON-LD/meta/preload noise never enters the
  // text. If there's no <body> (rare), fall back to the whole document.
  const body = html.match(/<body[\s\S]*$/i)?.[0] ?? html;
  return stripTags(
    body
      // Paired non-prose regions first.
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<template[\s\S]*?<\/template>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // …then any *dangling* <script>/<style> whose closing tag fell outside
      // our byte cap (a truncated __NEXT_DATA__ blob is what leaked JSON keys
      // like "extraData"/"key" and ı escapes). Drop it to end-of-string.
      .replace(/<script[\s\S]*$/i, " ")
      .replace(/<style[\s\S]*$/i, " ")
  );
}

/*
  Like visibleText, but main content only: drops page chrome first —
  <nav>/<header>/<footer>/<aside>/<form>/<button>, any element with
  role="navigation|banner|contentinfo|complementary", and cookie/consent/GDPR
  containers (class or id mentioning cookie/consent/gdpr). Menus and footers
  repeat on every page, so in keyword extraction they outscored the actual
  topic. visibleText stays untouched — audit.ts measures the whole page.

  Regex limits (no DOM parser, by design): paired removal is non-greedy, so
  a wrapper that nests its OWN tag name closes early — e.g. a
  <div role="banner"> containing inner <div>s loses only up to the first
  </div>, and the rest leaks through as text. Same-name nesting is rare for
  the semantic tags (<nav>, <footer>…) and the leftovers are small, which
  is fine for frequency counting. <body>/<html>/<main> are never matched by
  the attribute rules — a `class="cookie-consent-enabled"` on <body> would
  otherwise wipe the page.
*/
export function mainText(html: string): string {
  let s = html.match(/<body[\s\S]*$/i)?.[0] ?? html;
  // Scripts/styles/comments first, so a "</nav>" inside JS can't misalign
  // the structural removals below.
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of ["nav", "header", "footer", "aside", "form", "button"]) {
    s = s.replace(new RegExp(`<${tag}(?=[\\s>/])[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), " ");
  }
  s = s.replace(
    /<(?!(?:body|html|main)\b)([a-z][a-z0-9-]*)\b[^>]*\brole\s*=\s*["']?(?:navigation|banner|contentinfo|complementary)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    " "
  );
  s = s.replace(
    /<(?!(?:body|html|main)\b)([a-z][a-z0-9-]*)\b[^>]*\b(?:class|id)\s*=\s*["'][^"']*(?:cookie|consent|gdpr)[^"']*["'][^>]*>[\s\S]*?<\/\1\s*>/gi,
    " "
  );
  return visibleText(s);
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
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
    { keyword: base, words: base.split(" ").length, frequency: 42, pages: 5, titleHits: 5, headingHits: 4, metaHits: 5, seedOverlap: true, score: 120 },
    { keyword: `best ${base}`, words: base.split(" ").length + 1, frequency: 18, pages: 4, titleHits: 2, headingHits: 3, metaHits: 2, seedOverlap: true, score: 88 },
    { keyword: `${base} prices`, words: base.split(" ").length + 1, frequency: 12, pages: 3, titleHits: 1, headingHits: 2, metaHits: 1, seedOverlap: true, score: 61 },
    { keyword: `${base} near me`, words: base.split(" ").length + 2, frequency: 9, pages: 3, titleHits: 0, headingHits: 1, metaHits: 1, seedOverlap: true, score: 47 },
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
