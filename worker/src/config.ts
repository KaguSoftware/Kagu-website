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
  // Google `gl` region bias (country code) and `hl` interface language.
  // hl is kept to a value with predictable DOM labels (default `en`).
  seoRegion: process.env.SEO_REGION ?? "tr",
  seoLanguage: process.env.SEO_LANGUAGE ?? "en",
};
