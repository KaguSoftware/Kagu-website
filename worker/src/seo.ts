import { config } from "./config.js";

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
  while ((m = re.exec(html)) !== null && results.length < config.seoTopN) {
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
  return { results, adsSkipped: 0 };
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

/* Lowercase unicode *letter* tokens; keeps Turkish/Arabic via \p{L}. Digits
   are excluded on purpose: real keywords are words, and allowing \p{N} let
   JSON/unicode-escape junk like "u0131" survive as a token. */
function tokenize(text: string): string[] {
  // Drop the combining dot (U+0307) that lowercasing Turkish "İ" inserts —
  // else "İstanbul" → "i"+◌̇+"stanbul" tokenises to a bogus "stanbul".
  return (text.toLowerCase().replace(/\u0307/g, "").match(/\p{L}+/gu) ?? []).filter(
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
