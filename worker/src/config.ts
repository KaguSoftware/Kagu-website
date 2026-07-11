/* Fail-fast env validation — a worker with a bad config should die loudly. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* tsx does NOT load .env by itself. The leads worker gets its env from the
   LaunchAgent/systemd unit, but every ad-hoc CLI run (`npm run seo`,
   `seo:audit`, `seo:strategy`) was starting keyless even though worker/.env
   holds GROQ_API_KEY. Load it here once, at import time — variables already
   present in the real environment always win over the file. */
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^(["'])(.*)\1$/, "$2");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
} catch {
  /* no .env file — env must come from the shell or a process manager */
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

export const config = {
  // Getters (not eager) so the standalone SEO tool — which never touches the
  // DB — can run without Supabase creds. db.ts reads these at import time, so
  // the leads worker still fails fast on startup if they're missing.
  get supabaseUrl(): string {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 15000,
  mockMode: process.env.MOCK_MODE === "1",
  runOnce: process.env.RUN_ONCE === "1",

  // --- Anti-bot / stealth (worker/src/browser.ts) ---
  // Headless is harder to disguise than a real window. HEADFUL=1 runs headed
  // (the strongest tell-remover) at the cost of a visible browser window.
  headless: process.env.HEADFUL !== "1",
  // Which Chromium build to drive. "chrome" uses the real desktop install
  // (best fingerprint); set BROWSER_CHANNEL="" to force bundled Chromium.
  browserChannel: process.env.BROWSER_CHANNEL ?? "chrome",

  // Optional — drafting is skipped (with a warning) when unset, the panel
  // works fine without drafts.
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  // tr | ar | en — language the outreach drafts are written in.
  draftLanguage: (process.env.DRAFT_LANGUAGE ?? "tr") as "tr" | "ar" | "en",
  // Hard cap on listings collected per job (feed scrolling stops here).
  maxListings: Number(process.env.MAX_LISTINGS) || 60,

  // --- SEO keyword tool (worker/src/seo.ts, run via `npm run seo`) ---
  // How many organic (non-sponsored) results to crawl per seed query.
  seoTopN: Number(process.env.SEO_TOP_N) || 10,
  // Cap on keywords returned in the final report.
  seoMaxKeywords: Number(process.env.SEO_MAX_KEYWORDS) || 30,
  // Region bias (DuckDuckGo `kl`, derived from this) and interface language.
  seoRegion: process.env.SEO_REGION ?? "tr",
  seoLanguage: process.env.SEO_LANGUAGE ?? "en",

  // --- Speed insights (worker/src/speed.ts, run via `npm run seo:speed`) ---
  // Optional Google API key for the PageSpeed Insights API. Anonymous calls
  // work for occasional use (per-IP rate limit); a key raises the quota to
  // 25k/day. Plain API key — no OAuth/service account needed.
  psiApiKey: process.env.PSI_API_KEY ?? "",
  // Lighthouse runs per strategy; the report judges by the median (use odd
  // counts — 3 is the speed/stability sweet spot, 5 when it really matters).
  // `--runs` overrides per invocation. Each run ≈ 30s per strategy.
  seoSpeedRuns: Number(process.env.SEO_SPEED_RUNS) || 3,

  // --- SEO site audit (worker/src/audit.ts, run via `npm run seo:audit`) ---
  // Page cap for the site crawl; each page gets a full throttled mobile
  // render, so runtime is roughly maxPages × ~20s.
  seoAuditMaxPages: Number(process.env.SEO_AUDIT_MAX_PAGES) || 12,

  // --- Google Search Console (worker/src/gsc.ts, used by seo:strategy) ---
  // Path to a service-account JSON key (absolute, or relative to worker/).
  // Optional — unset falls back to worker/gsc-key.json, and if that file
  // doesn't exist the strategy tool simply skips the GSC evidence.
  gscKeyFile: process.env.GSC_KEY_FILE ?? "",
  // Search Console property: "sc-domain:example.com" (domain property) or
  // "https://example.com/" (URL-prefix property). Unset = sc-domain:<host>.
  gscSiteUrl: process.env.GSC_SITE_URL ?? "",

  // --- SEO strategy tool (worker/src/strategy.ts, run via `npm run seo:strategy`) ---
  // Candidate searches actually run against the SERP (each ≈ one DDG fetch
  // plus two winner-page fetches, with pacing between queries).
  seoStrategySerpQueries: Number(process.env.SEO_STRATEGY_SERP_QUERIES) || 10,
  // Site pages read (plain fetch) to understand what the business does.
  seoStrategySitePages: Number(process.env.SEO_STRATEGY_SITE_PAGES) || 6,
  // Page cap for the embedded technical audit (`--no-audit` skips it).
  seoStrategyAuditPages: Number(process.env.SEO_STRATEGY_AUDIT_PAGES) || 6,
};
