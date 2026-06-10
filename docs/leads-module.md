# Leads Module

Internal lead generation for the studio: scrape Google Maps for businesses in
a chosen Istanbul district/category, audit their web presence, score them,
draft outreach, and track a sales pipeline — all from `/admin/leads`.

## Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Next.js admin panel     │         │  Crawler worker          │
│  /admin/leads (deployed) │         │  worker/ (VPS or local,  │
│                          │         │  NEVER deployed)         │
│  • request scrape jobs   │         │                          │
│  • watch jobs live       │         │  poll → claim job        │
│  • browse/filter leads   │         │  → crawl Google Maps     │
│  • review LLM drafts     │         │  → audit web presence    │
│  • pipeline tracking     │         │  → score → upsert leads  │
└────────────┬─────────────┘         │  → draft messages        │
             │                       └────────────┬─────────────┘
   anon key (reads, RLS)                          │
   service key (server actions)        service role key (writes)
             │                                    │
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase — THE ONLY CONTRACT BETWEEN PANEL AND WORKER          │
│                                                                 │
│  scrape_jobs ── leads ── lead_messages    (tables, RLS)         │
│  lead-screenshots                         (public storage)     │
│  Realtime publication: scrape_jobs, leads                       │
└─────────────────────────────────────────────────────────────────┘
```

The panel writes a `pending` row into `scrape_jobs`; the worker polls, claims
it atomically, does the work, and writes results back. Supabase Realtime
pushes job progress and new leads to the panel as they happen (with a
poll-refresh fallback when the websocket is unavailable).

## Environment variables

| Variable | Next.js app | Worker |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ (already set) | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (already set) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (already set) | — |
| `SUPABASE_URL` | — | ✅ same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ✅ service role key |
| `POLL_INTERVAL_MS` / `MOCK_MODE` / `RUN_ONCE` | — | optional (see `worker/.env.example`) |

No new env vars for the deployed site — the module reuses the existing keys.

## Setup

1. **Schema** — paste `supabase/leads_module.sql` into the Supabase SQL editor
   and run it. Idempotent: safe to re-run after edits. It creates the three
   tables, indexes, RLS policies, the public `lead-screenshots` bucket, and
   adds `scrape_jobs` + `leads` to the `supabase_realtime` publication.
   - If the realtime block errors on your project, enable it manually:
     Dashboard → Database → Replication → `supabase_realtime` → add
     `scrape_jobs` and `leads`.
   - Bucket fallback: Dashboard → Storage → New bucket → `lead-screenshots`,
     public.
2. **Panel** — nothing extra; deploy as usual. The Leads tab appears in the
   admin sidebar for any authenticated admin.
3. **Worker** — see `worker/README.md`. Quick smoke test:

   ```sh
   cd worker && npm install && cp .env.example .env  # fill in the two keys
   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run mock
   ```

   Then queue a job in the panel first (Jobs → New scrape) and watch it go
   pending → running → done live, with ~8 mock leads appearing in the list.

## Scoring

Implemented in `worker/src/score.ts` (clamped 0–100):

| Signal | Points |
| --- | --- |
| No website | +40 |
| Facebook-only or Linktree-only | +25 |
| No SSL | +15 |
| Not mobile-friendly | +20 |
| Slow site | +15 |
| Active Instagram but no website | +15 |
| More than 50 reviews | +10 |
| Rating below 3.5 | −10 |

## Pipeline semantics

- `lead.pipeline_status`: new → queued → contacted → replied → meeting →
  won/lost (+ do_not_contact). The worker never touches it — re-scrapes can't
  clobber sales state.
- `contacted_at` is stamped the first time a lead reaches `contacted`
  (including via "Mark as sent" on a message).
- Messages: draft → approved → sent (or rejected). "Mark as sent" also moves
  the lead to `contacted`. Sending itself is manual (copy → your own
  email/WhatsApp); this tool is deliberately not a mass-mailer.

## Remaining TODOs

- `worker/src/crawl.ts` — real Playwright Google Maps crawl (currently a
  detailed stub; MOCK_MODE works end-to-end).
- `worker/src/enrich.ts` — real SSL/mobile/speed audits + screenshot upload.
- `worker/src/draft.ts` — LLM call using the exported `PROMPT_TEMPLATE`.
- Leads list realtime currently does a debounced `router.refresh()` on any
  leads change; true row-level patching with server pagination is a possible
  later upgrade.
- `lead-screenshots` is a public bucket for plain `<img>` rendering; switch to
  signed URLs if screenshots ever become sensitive.
