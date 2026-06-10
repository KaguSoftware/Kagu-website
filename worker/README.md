# Kagu Leads Worker

Standalone crawler for the internal lead-gen module. It polls the `scrape_jobs`
table, crawls Google Maps for the requested `category × district`, audits each
business's web presence, scores it, and writes `leads` + drafted
`lead_messages` back to Supabase. The admin panel (`/admin/leads`) is the
control room; **the database is the only contract between the two**.

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
| `GROQ_MODEL` | no | `llama-3.3-70b-versatile` | Groq model used for drafting |
| `DRAFT_LANGUAGE` | no | `tr` | Outreach draft language: `tr` / `ar` / `en` |
| `MAX_LISTINGS` | no | `60` | Cap on listings collected per job |
| `POLL_INTERVAL_MS` | no | `15000` | Idle delay between polls for pending jobs |
| `MOCK_MODE` | no | `0` | `1` = deterministic fake leads, no crawling/LLM |
| `RUN_ONCE` | no | `0` | `1` = process at most one job, then exit |

Note: `tsx` does **not** load `.env` by itself — export the vars in your
shell, use `env $(cat .env | xargs) npm start`, or point a process manager at
it (systemd `EnvironmentFile`, see below).

## Run modes

```sh
npm start        # long-running loop (production mode on a VPS)
npm run once     # process one job and exit (cron-friendly)
npm run mock     # MOCK_MODE + RUN_ONCE: end-to-end test without crawling
npm run typecheck
```

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
