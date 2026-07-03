/* Fail-fast env validation — a worker with a bad config should die loudly. */

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

  // --- SEO site audit (worker/src/audit.ts, run via `npm run seo:audit`) ---
  // Page cap for the site crawl; each page gets a full throttled mobile
  // render, so runtime is roughly maxPages × ~20s.
  seoAuditMaxPages: Number(process.env.SEO_AUDIT_MAX_PAGES) || 12,
};
