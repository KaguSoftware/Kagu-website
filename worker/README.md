# Kagu Leads Worker

Standalone crawler for the internal lead-gen module. It polls the `scrape_jobs`
table, crawls Google Maps for the requested `category × district`, audits each
business's web presence, scores it, and writes `leads` + drafted
`lead_messages` back to Supabase. The admin panel (`/admin/leads`) is the
control room; **the database is the only contract between the two**.

The same process also runs the **SEO keyword tool** (see below): it polls
`seo_jobs` and writes ranked `seo_keywords`. One worker, two queues.

What this is **NOT**:

- Not part of the Next.js app. It is never built, bundled, or deployed with
  the site (root `tsconfig.json` and ESLint both exclude `worker/`).
- Not a mass-mailer. It drafts messages; a human reviews, copies, and sends
  them from their own email/WhatsApp.

## Requirements

- Node 20+
- `npm install` inside `worker/`
- For real crawling/screenshots: `npx playwright install chromium`

## Configuration

```sh
cp .env.example .env   # then fill in the values
```

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `SUPABASE_URL` | yes | — | Same project the admin panel uses |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | — | Service role (bypasses RLS). Keep this machine private. |
| `GROQ_API_KEY` | no | — | Groq key for outreach drafts. Unset = leads saved without drafts. |
| `GROQ_MODEL` | no | `openai/gpt-oss-120b` | Groq model used for drafting |
| `DRAFT_LANGUAGE` | no | `tr` | Outreach draft language: `tr` / `ar` / `en` |
| `MAX_LISTINGS` | no | `60` | Cap on listings collected per job |
| `POLL_INTERVAL_MS` | no | `15000` | Idle delay between polls for pending jobs |
| `MOCK_MODE` | no | `0` | `1` = deterministic fake leads, no crawling/LLM |
| `RUN_ONCE` | no | `0` | `1` = process at most one job, then exit |
| `SEO_TOP_N` | no | `10` | SEO tool: organic results crawled per query |
| `SEO_MAX_KEYWORDS` | no | `30` | SEO tool: keywords kept in the report |
| `SEO_REGION` | no | `tr` | SEO tool: Google `gl` region bias (country code) |
| `SEO_LANGUAGE` | no | `en` | SEO tool: Google `hl` interface language |
| `SEO_AUDIT_MAX_PAGES` | no | `12` | Site audit: page cap for the crawl (`--max-pages` overrides) |
| `PSI_API_KEY` | no | — | Speed insights: Google API key for a 25k/day quota (anonymous works, but sparsely) |
| `SEO_SPEED_RUNS` | no | `3` | Speed insights: Lighthouse runs per strategy, judged by the median (`--runs` overrides) |
| `SERPER_API_KEY` | no | — | serper.dev key (free tier: 2,500 queries, no card) → real Google results for SERP checks. Unset or refused → DuckDuckGo fallback |
| `SERPER_CREDIT_BUDGET` | no | `500` | Loud warning once one worker process has spent more Serper credits than this (spend is logged every ~50; Serper reports per-call cost, not balance — the balance is on serper.dev) |
| `SEO_SERP_CACHE_HOURS` | no | `24` | How long a cached SERP answer is reused (memory + `seo_serp_cache`) before re-fetching |
| `SEO_STRATEGY_SERP_QUERIES` | no | `10` | Strategy tool: candidate searches checked against the live SERP |
| `SEO_STRATEGY_SITE_PAGES` | no | `6` | Strategy tool: site pages read to understand the business |
| `SEO_STRATEGY_AUDIT_PAGES` | no | `6` | Strategy tool: page cap for its embedded audit (`--no-audit` skips) |
| `GROQ_TPM_LIMIT` | no | `8000` | Groq tokens/minute for `GROQ_MODEL`; the strategy tool paces to 90% of it (on-demand gpt-oss-120b = 8000) |
| `SEO_STRATEGY_WINNERS` | no | `3` | Strategy tool: top-ranking pages profiled per SERP check (shape: words, H2s, schema, prices, date); `--winners N` overrides, 0–5 |
| `GSC_KEY_FILE` | no | `gsc-key.json` | Search Console service-account key path (see setup below) |
| `GSC_SITE_URL` | no | `sc-domain:<host>` | Search Console property name if not a domain property |
| `SEO_PLAN_CHECK_DAYS` | no | `7` | Measurement loop: days between plan checks of each host's latest strategy |
| `SEO_FOLLOWUP_GRACE_DAYS` | no | `7` | Measurement loop: a planned `create` page only counts as "not shipped yet" this many days after the strategy finished |

`worker/.env` is auto-loaded at startup (by `src/config.ts`) for the worker
and every CLI tool — variables already present in the real environment win,
so a process manager's env (LaunchAgent, systemd `EnvironmentFile`) still
takes precedence.

## Run modes

```sh
npm start        # long-running loop (production mode on a VPS)
npm run once     # process one job and exit (cron-friendly)
npm run mock     # MOCK_MODE + RUN_ONCE: end-to-end test without crawling
npm run typecheck
```

## SEO keyword tool

Given a seed query it finds the keywords that got the current top-ranking
pages to the top. It runs two ways:

- **DB-driven** (like the leads pipeline): the worker also polls `seo_jobs` —
  queued from the admin panel's **SEO** tab (`/admin/leads/seo`) — and writes
  ranked rows to `seo_keywords`. Lead scrapes take priority; SEO jobs drain
  when the lead queue is idle. Cancel/Retry behave exactly like scrape jobs.
  Run `supabase/seo_module.sql` once to create the tables.
- **CLI** (ad-hoc, writes nothing to the DB):

  ```sh
  npm run seo -- "dentist istanbul"
  npm run seo -- --json "saç ekimi"      # machine-readable
  npm run seo:mock -- "dentist"          # offline, deterministic, no Google/Groq
  ```

How it works (`src/seo.ts`):

1. Fetches the top **organic** results — real Google via serper.dev when
   `SERPER_API_KEY` is set, else DuckDuckGo's HTML endpoint (also the fallback
   whenever Serper refuses; quota/auth refusals switch Serper off for the rest
   of the run). Ads never enter the list: they rank by spend, not SEO. Every
   answer goes through the **SERP cache** (`src/serp-cache.ts`): an in-process
   map plus the Supabase `seo_serp_cache` table, keyed by normalized query ×
   region × language × depth and fresh for `SEO_SERP_CACHE_HOURS`, so repeat
   runs don't burn credits. A cached DuckDuckGo answer is ignored while Serper
   works — Bing's ranking isn't Google's. Run
   `supabase/seo_serp_cache_module.sql` once to enable the shared layer;
   without it (or without Supabase creds, as in the CLIs) only the memory
   layer runs, silently.
2. Fetches each top page (plain `fetch`, no browser) and pulls its on-page
   text split by SEO signal: `<title>`, meta description/keywords, h1–h3
   headings, and the **main content** — body text minus nav/header/footer/
   aside/forms/buttons, ARIA landmark chrome and cookie/consent banners.
   Menus and footers repeat on every page and used to outscore the topic.
   (Regex-only, so a wrapper nesting its own tag name can leak a little.)
3. Ranks candidate 1–3 word keyword phrases by how the *winning* pages use
   them: raw frequency, plus weight for appearing in titles (×5), headings
   (×3), meta (×2), and across multiple top pages (cross-page coverage).
   Phrases sharing a word with the seed get ×1.5 (prefix-fuzzy, so Turkish
   suffixes like *istanbul*/*istanbulda* match); the rest aren't penalised —
   long-tail discovery is half the point. A phrase on **every** crawled page
   but in no title/heading/meta is leftover boilerplate → ×0.3. An
   English+Turkish stopword list trims phrase edges so results read like real
   search queries.
4. With `GROQ_API_KEY` set, hands the top candidates to Groq to dedupe
   synonyms, drop navigational/brand noise, and label search intent
   (informational / commercial / transactional / navigational). No key (or a
   bad response) just falls back to the heuristic ranking — same graceful
   degradation as outreach drafts.

No browser involved: SERPs come from APIs/plain HTML and pages from plain
`fetch` with human pacing. Watch the `[seo] Serper credits spent this
session: N` line — the free pool never refills, and past
`SERPER_CREDIT_BUDGET` in one process it warns loudly (the API reports what
each call cost, never the balance; that's on the serper.dev dashboard).
`npm test` runs the offline unit tests (vitest: Serper parsing, main-content
extraction, scoring, cache keys/TTL).

## SEO site audit

On-page audit for a **whole site** — crawls from the start URL (start page →
sitemap.xml URLs → internal links, breadth-first) and outputs an overall
score (0–100), per-category and per-page scores, and every issue found. Each
finding carries what's wrong, **why** it matters for ranking, **where**
exactly (the offending elements — heading texts, image files, CSS-selector
descriptions of tiny-font/overflow culprits, the LCP element), which pages it
affects, and the concrete fix. CLI-only, writes nothing to the DB, needs no
Supabase creds:

```sh
npm run seo:audit -- https://example.com
npm run seo:audit -- --single example.com/pricing    # just that one page
npm run seo:audit -- --max-pages 20 example.com      # crawl deeper (default 12)
npm run seo:audit -- --json example.com              # machine-readable
npm run seo:audit -- --static --single example.com   # no browser — static checks only (~1s; what plan tracking runs weekly)
```

How it works (`src/audit.ts`) — two passes per page:

1. **Static** (plain `fetch`): redirect chain, title/meta/canonical/robots
   directives, structured data (JSON-LD), render-blocking `<head>` resources,
   compression, mixed content. Site-level probes — robots.txt rules,
   sitemap contents, HTTP/2 via ALPN — run once and are shared by every page;
   a site-wide HEAD-status cache checks each internal link for 404 at most
   once per crawl (sampled, up to 10 per page).
2. **Rendered** (Playwright emulating a Pixel-class phone with 4G network +
   4× CPU throttling — Google indexes mobile-first): heading hierarchy as the
   renderer sees it, image alt/dimensions/lazy-loading, viewport/overflow/
   font-size/tap-target usability, JS-dependence of the content (raw vs
   rendered text), and lab web vitals (TTFB / LCP / CLS / page weight). One
   browser serves the crawl; each page gets a fresh context so metrics are
   cold-cache honest.

Ten weighted categories (headings, title & meta, content, mobile, speed,
images, indexability, links, structured data, **answer engines / AEO**);
checks score full/half/zero credit and inapplicable checks are excluded
rather than counted as passes.

The AEO category measures whether the page can be read and **cited by AI
assistants** (ChatGPT, Claude, Perplexity, Google AI Overviews): content
available in the raw HTML (AI crawlers never execute JS), robots.txt access
for GPTBot / OAI-SearchBot / ClaudeBot / PerplexityBot (path-aware, with an
info note when Google-Extended is blocked), an `llms.txt` at the site root
(SPA fallbacks that return HTML are caught), answer-first passages under
question-style headings (EN + TR question detection; flags first sentences
that are overlong or open with context-dependent words like "It"/"Bu"),
FAQPage/QAPage JSON-LD on pages that answer questions, and machine-readable
dates on content-heavy pages.
Identical issues merge across pages ("no canonical — on 12 of 12 pages").
If the browser pass fails the static checks still report — mobile/speed
categories just drop out of the score. Page cap via `--max-pages` or
`SEO_AUDIT_MAX_PAGES` (each page is a full throttled render, ≈20s/page).

## Speed insights

Page speed via **Google's PageSpeed Insights API** — the exact engine behind
pagespeed.web.dev. Each run executes Lighthouse on Google's own
infrastructure (a standardized throttled load, not this machine's network)
and, when the site has enough Chrome traffic, attaches **CrUX field data**:
the real-user Core Web Vitals that actually feed Google's ranking signal.
Works fully standalone (no Supabase creds needed); with creds present each
run also snapshots into speed history (below):

```sh
npm run seo:speed -- kagusoftware.com
npm run seo:speed -- --mobile example.com/pricing   # one strategy only
npm run seo:speed -- --runs 5 example.com           # bigger sample (default 3)
npm run seo:speed -- --json example.com             # machine-readable (progress → stderr)
npm run seo:speed -- --field-only example.com       # ~40-week real-user CWV trend, no Lighthouse
npm run seo:speed -- --site 8 example.com           # sample 8 pages from the sitemap
npm run seo:speed -- --vs competitor.com example.com  # side-by-side benchmark
npm run seo:speed -- --baseline before.json --budget score=90,lcp=2500 example.com
npm run seo:speed -- --prompt fixes.md example.com  # fix brief for a coding agent
```

Lighthouse is noisy — identical back-to-back runs can swing the performance
score by ±10. Each strategy therefore runs `SEO_SPEED_RUNS` times (default
3, `--runs` overrides; keep it odd) and the report **judges by the median**:
scores and lab metrics are per-item medians with the observed min–max spread
printed beside each metric, while the evidence (opportunities, diagnostics,
failed audits, field data) comes from the median run so its numbers stay
internally consistent. A failed run shrinks the sample instead of sinking
the report. Runtime and API quota scale with runs × strategies (~30s per
run).

Per strategy (mobile + desktop by default) the report prints:

- all four Lighthouse scores (0–100): **performance, accessibility, best
  practices, SEO**,
- **lab metrics** (FCP / LCP / TBT / CLS / Speed Index / TTFB) graded
  against Google's official good / needs-improvement / poor thresholds,
- **field data** (28-day CrUX p75: LCP / INP / CLS / FCP / TTFB) —
  page-level when available, origin-level as fallback, or a clear "not
  enough traffic yet" note,
- every performance **opportunity** with estimated ms/bytes savings and the
  exact offending resources, sorted biggest-win first,
- **diagnostics** — the LCP element, layout-shift culprits, main-thread and
  third-party cost,
- every failed **accessibility / best-practices / SEO audit** with the
  offending elements, sorted by score impact — each one directly fixable.

The API is free. Anonymous calls are fine for occasional use (per-IP rate
limit); set `PSI_API_KEY` in `.env` (plain Google Cloud API key with the
PageSpeed Insights API enabled) for 25k requests/day. Lab differs from the
`seo:audit` vitals because Google's reference hardware differs from this
machine — treat `seo:speed` as the canonical number and the audit's as a
directional cross-check.

### Speed history

The rank-tracking pattern applied to speed: run
`supabase/seo_speed_module.sql` once, and every default-mode CLI run saves
its medians to `seo_speed_snapshots` (seeding the URL into
`seo_speed_tracked_urls`). The idle worker re-checks each tracked URL weekly
(`src/speed-tracking.ts`, one URL per hourly attempt), the admin SEO tab
charts the trend, and a median performance drop of **more than 5 points** vs
the previous snapshot is flagged as a **REGRESSION** — so "did my last
deploy make it slower?" answers itself. `--no-save` skips persistence;
without Supabase creds the tool is unchanged.

`--field-only` reads the **CrUX History API** instead of running Lighthouse:
~40 weeks of weekly real-user p75s (LCP / INP / CLS / FCP / TTFB) per page
or origin, near-instant, on a quota separate from PSI — and it backfills
those weeks into speed history retroactively, so the effect of past deploys
shows up immediately. Needs `PSI_API_KEY` with the **Chrome UX Report API**
enabled (the CrUX API takes no anonymous calls). `--weeks N` shortens the
window.

### Deploy gate, site sampling, benchmarking, fix brief

- `--baseline before.json` — print per-score and per-metric deltas against a
  previously saved `--json` report (better/worse marked per Google's
  direction).
- `--budget score=90,lcp=2500,cls=0.1` — enforce minimum scores
  (`score`/`a11y`/`bp`/`seo`) and maximum metrics
  (`lcp`/`fcp`/`tbt`/`cls`/`si`/`ttfb`, ms) against the medians; any breach
  exits **2**, so a pre-push hook or post-deploy check against the Vercel
  preview URL is a one-liner.
- `--site [N]` — pull N URLs (default 6) from the sitemap (robots.txt →
  /sitemap.xml → homepage links), spread across path sections, and print a
  per-page score table worst-first plus the worst offender's top
  opportunities. Defaults to mobile-only single runs to keep the sample ~N
  PSI calls; `--budget` applies per page.
- `--vs competitor.com` — run both sites and print side-by-side medians
  (scores, lab metrics, field p75s) with a winner marker per row.
- `--prompt fixes.md` — convert the findings into an actionable brief for a
  coding agent (context, prioritized fixes with exact culprits, acceptance
  criteria from `--budget` or Google's thresholds, verification commands) —
  the same handoff `seo:strategy` formalizes with its master prompt.

## SEO strategy tool

The whole funnel in one command: **give it a URL, get back the master prompt
that makes the site rank.** **Requires `GROQ_API_KEY`** (understanding and
keyword generation are LLM passes; there is no heuristic fallback here).
It runs two ways:

- **DB-driven** (like the other queues): the worker also polls
  `seo_strategy_jobs` — queued from the admin panel's **SEO** tab
  (`/admin/leads/seo`) — and writes the full report (master prompt
  included) back onto the job row; the detail page renders it, embedded
  audit and all. Run `supabase/seo_strategy_module.sql` once to create the
  table. Lead scrapes, SEO research, and audits drain first.

  Completed strategies also seed weekly **rank tracking**
  (`src/rank-tracking.ts`): each planned page's head keyword (`kind`
  `head`) plus up to 5 of its cluster queries (`kind` `cluster`), tagged
  with the strategy's market country. When all queues are idle the worker
  re-checks a host's keywords weekly, **GSC-first**: one Search Console call
  (last 7 days) gives every keyword the site already has impressions for its
  real average position, impressions and clicks (`source` `gsc`, zero SERP
  credits). Only head keywords Search Console has no row for — or every head
  keyword when GSC isn't configured — fall back to a live SERP check in that
  keyword's own country (`source` `serp`). Cluster keywords never spend SERP
  credits: with GSC they get a zero-impression snapshot when Google showed
  nothing; without GSC they're skipped. The SEO tab shows the position, its
  source and impressions, with cluster keywords grouped under their host's
  heads. Run `supabase/seo_rank_module.sql` once to create its tables (re-run
  it after upgrading — it adds the `country` / `kind` / `source` /
  `position` / `impressions` / `clicks` columns idempotently). Until then
  the feature stays dormant (one log line, no errors); an un-upgraded module
  keeps working as head-only SERP checks.
  Each finished strategy is also measured weekly by **plan tracking** — see
  [Plan tracking & follow-up prompts](#plan-tracking--follow-up-prompts).
- **CLI** (ad-hoc, writes nothing to the DB, needs no Supabase creds):

```sh
npm run seo:strategy -- kagusoftware.com
npm run seo:strategy -- --context "our highlight: fully custom sites/systems/apps per request" kagusoftware.com
npm run seo:strategy -- --out brief.md example.com     # choose the output file
npm run seo:strategy -- --serp 6 example.com           # fewer live SERP checks
npm run seo:strategy -- --winners 5 example.com        # profile more top pages per search (default 3)
npm run seo:strategy -- --no-audit example.com         # skip the embedded audit
npm run seo:strategy -- --json example.com             # full report as JSON
npm run seo:strategy:mock -- example.com               # offline, deterministic
```

`--context` injects owner-supplied ground truth (what the business wants to
be known for) into the understanding and strategy passes — use it when the
site's own copy under-communicates the highlight.

How it works (`src/strategy.ts`):

1. **Reads the site itself** — homepage plus the most business-relevant
   internal pages (about/services/pricing/FAQ path heuristics, plain fetch;
   one unthrottled browser render as fallback for JS-only sites) — and has
   Groq state what the business actually is from the on-page content:
   sector, offerings, problems solved, audience, market, languages.
2. **Generates the searches** its customers would type, across all four
   intents (informational / commercial / transactional / navigational), in
   the site's own language(s).
3. **Checks each against the live SERP** (same layer as the keyword tool:
   Serper/Google when `SERPER_API_KEY` is set, DuckDuckGo fallback), in the
   site's own **market country** — Groq derives it (ISO code) from the
   site's locations, falling back to `SEO_REGION`, and it is the Google `gl`
   for every check and market scan. Each check records who ranks and whether
   the site appears at all; with Serper, Google's **People Also Ask**,
   **related searches** and **answer box** (featured snippet) arrive with
   the same call. Alongside each check it **pulls real typed demand from
   Google Autocomplete** (query + shortened seed + question-word expansions
   — the AnswerThePublic technique), which remains the free fallback for
   real typed questions when only DuckDuckGo is available. Autocomplete
   results are cached for the run, so vetting and the per-check probes
   never ask Google twice.
4. **Builds the strategy** — head topics worth owning plus a page plan where
   every page owns one intent *cluster*: representative long-tail queries
   (demand evidence, not strings to paste — modern retrieval is semantic)
   plus the entities the page must cover for full topical coverage, mapped
   to *update this existing path* or *create this slug*. Tail queries are
   sourced from the autocomplete/related-search demand first (marked ✓ in
   the brief), People-Also-Ask questions become FAQ entries (marked ✓PAA)
   and each page lists its **answer-engine targets** (those questions plus
   the featured snippet it must beat). The top `SEO_STRATEGY_WINNERS` pages
   per search are profiled — word count, H2 count, FAQ/HowTo schema, price
   signals, publish date — and each page gets that **target shape**
   (word-count range, H2 depth, schema, whether prices must show). Each
   head keyword gets a **winnability** grade (easy/medium/hard, judged from
   who currently ranks — forums/UGC in the top results mark a cluster a
   low-authority site can win), and a code-level near-duplicate pass
   guarantees no query cluster is split across two pages.
5. **Runs the technical audit** (`src/audit.ts`, capped smaller by default)
   so every fix ships inside the same deliverable.
6. **Writes one master prompt** (markdown) to hand to a coding agent: the
   pages with titles/outlines/FAQs, answer-first writing rules that make
   sentences liftable by Google AI Overviews and AI assistants, all audit
   fixes, `robots.txt` / `llms.txt` / sitemap / JSON-LD setup, and
   anti-duplication rules.

Runtime is dominated by the SERP pacing (~2–3s between queries), the
winner-page profiling (~1–2s per page, 3 per search by default — about
another 30–60s at the defaults) and the audit (~20s/page): roughly 4–7
minutes at the defaults.

### Search Console (free, strongly recommended)

With Google Search Console connected, the strategy tool also pulls the
site's **own real queries** — impressions, clicks, average position, and
which page carries each query, for the last 90 days. That is *proven* demand
for this exact site: the plan builds clusters around **striking-distance
queries** (already ranking 8–30 — lifting an existing page a few positions
is the cheapest traffic in SEO), and §4 tails backed by GSC are marked ✓✓
with their impression counts. The API is free and no client library is used
(`src/gsc.ts` signs the service-account JWT with `node:crypto` and makes one
REST call).

One-time setup (~5 minutes):

1. [Google Cloud Console](https://console.cloud.google.com) → any project →
   **APIs & Services → Enable APIs** → enable **Google Search Console API**.
2. **IAM & Admin → Service accounts → Create service account** (no roles
   needed) → **Keys → Add key → JSON** → save the file as
   `worker/gsc-key.json` (already gitignored).
3. [Search Console](https://search.google.com/search-console) → your
   property → **Settings → Users and permissions → Add user** → the service
   account's email (`…@….iam.gserviceaccount.com`), permission
   **Restricted** is enough.
4. If your property is URL-prefix rather than domain, set
   `GSC_SITE_URL=https://example.com/` in `.env`.

Search Console also powers the **measurement loop**: weekly rank checks
read positions from it first (no SERP credits for any keyword with
impressions), and plan tracking sums each planned page's cluster-query
impressions/clicks over the last 7 days against the strategy-time 90-day
baseline. One API call per host per pass in each case (`fetchGscQueryStats`
in `src/gsc.ts`, up to 5,000 query × page rows, matched to the planned
queries case/whitespace-insensitively).

Without the key file the tool logs one skip line and works as before; rank
tracking falls back to SERP checks for head keywords and plan tracking
leaves the impression columns empty.

### Plan tracking & follow-up prompts

The strategy is a one-shot plan; this loop checks whether it **shipped** and
whether it **moved**, and turns what's actionable into a short follow-up
prompt for the same coding agent.

**What runs when.** In the worker's idle block (after rank and speed
checks), `runDuePlanChecks` (`src/plan-tracking.ts`) wakes at most hourly,
picks ONE host whose latest `done` strategy hasn't been checked for
`SEO_PLAN_CHECK_DAYS` (default 7) and checks every planned page with plain
HTTP — no browser, **no SERP credits**:

- **shipped** — `GET origin + slug` (redirects followed) is 200 HTML; the
  final URL and status are kept
- **in sitemap** — robots.txt `Sitemap:` lines (or `/sitemap.xml`), one
  level of sitemap index followed, fetched once per pass
- **indexable** — no `noindex` in meta robots / `X-Robots-Tag`; canonical
  absent or self
- **title** — ≥ 60% of the head keyword's tokens (Turkish suffixes
  tolerated) in `<title>`
- **FAQ schema** — FAQPage JSON-LD present (only when the plan had ≥ 2 FAQs)
- **movement** — 7-day impressions / clicks / weighted avg position over the
  page's cluster queries + head keyword (one GSC call), and the baseline:
  the same queries in the strategy's own 90-day GSC rows × 7/90

Per-page audit issues are **not** collected yet: `audit.ts` only exposes
`auditSite()`, which always launches a browser; the `audit_issues` column
and the follow-up section are wired for when a static single-page entry
point exists. Rows land in `seo_plan_checks`.

**Follow-up prompts.** After each pass, `composeFollowup` (`src/followup.ts`
— deterministic, no LLM) builds a markdown brief when anything is
actionable:

1. **Not shipped yet** — `create` pages not answering 200, once the strategy
   is `SEO_FOLLOWUP_GRACE_DAYS` (default 7) old, each with its full brief
   (title, meta, head keyword, cluster, outline, FAQ) so the agent needs no
   original prompt; `update` pages that stopped answering are listed
   immediately.
2. **Shipped, but needs fixing** — not indexable / missing from the sitemap
   / title missing the head keyword / FAQPage schema missing, each with the
   exact fix.
3. **New audit issues** — issues (warn+) not in the strategy's audit for the
   same path (inactive until per-page audits are collected, see above).
4. **Moved backwards** — cluster impressions < 70% of a baseline ≥ 20, or
   avg position worse by > 3 since the previous check.
5. **Wins** (informational, last) — impressions ≥ 1.5× baseline (or ≥ 10
   from a zero baseline), or avg position moved into the top 10. Wins alone
   never produce a follow-up.

It ends with a **Verification** block (`npm run seo:audit -- --single …`
per affected page, `npm run seo:speed -- …`). A follow-up is stored in
`seo_strategy_followups` only when its fingerprint (sha256 of the sorted
section × slug pairs) differs from the latest one for that strategy — no
weekly copy of the same findings.

**Setup.** Run `supabase/seo_plan_module.sql` once (after
`seo_strategy_module.sql`), and re-run `supabase/seo_rank_module.sql` for
the GSC-first rank columns. Until the plan module exists the pass logs one
line and stays dormant. `MOCK_MODE` skips both passes.

**Where to see it.** The strategy's detail page (`/admin/leads/seo/<id>`)
shows **Plan status** (one row per planned page: shipped / indexable /
sitemap / title / FAQ badges, impressions 7d vs baseline, avg position, last
checked) and **Follow-up prompts** (newest first, with copy and `.md`
download, like the master prompt).

### systemd unit (VPS)

```ini
[Unit]
Description=Kagu leads worker
After=network-online.target

[Service]
WorkingDirectory=/opt/kagu/worker
EnvironmentFile=/opt/kagu/worker/.env
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### cron alternative

```cron
*/10 * * * * cd /opt/kagu/worker && env $(cat .env | xargs) npx tsx src/index.ts >> worker.log 2>&1
```

(uses `RUN_ONCE=1` in `.env` so each invocation drains one job and exits)

## Cancellation & retries

- **Cancel** in the panel sets the job to `cancel_requested`; the worker
  checks between leads, stops, and marks it `cancelled`. Leads already
  upserted stay.
- **Retry** (failed jobs) resets the job to `pending`. Re-processing is safe:
  leads upsert on `place_id` and drafting is skipped for leads that already
  have messages.
- Pipeline status and notes are never touched by the worker, so re-scrapes
  can't clobber sales work.

## Pipeline implementation notes

- `src/crawl.ts` — Playwright Google Maps crawl: human pacing, feed
  scrolling, place extraction, dedupe by place token, CAPTCHA abort (the job
  fails with a clear error; retry later from the panel). Google Maps markup
  is volatile — selectors are best-effort with null fallbacks, so a missing
  field never kills a lead. Requires `npx playwright install chromium`.
- `src/enrich.ts` — audits each site with one fetch (SSL / response time /
  viewport meta), detects facebook-only / linktree-only presences, and
  uploads a 1280×800 screenshot to the public `lead-screenshots` bucket.
  IG discovery via search scraping is deliberately skipped (block-prone);
  `instagram_*` only populate when the listing's website IS an IG profile.
- `src/draft.ts` — Groq chat completion (OpenAI-compatible, plain `fetch`)
  using `PROMPT_TEMPLATE`, JSON-forced response, one retry on malformed
  output, then the lead is saved without drafts.

`npm run mock` still exercises the entire pipeline with deterministic fake
data and no crawling/LLM calls.
