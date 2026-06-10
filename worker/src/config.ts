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
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
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
};
