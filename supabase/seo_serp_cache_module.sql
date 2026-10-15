-- SEO SERP cache module: one row per SERP question the worker has asked
-- (normalized query × gl × hl × result-depth bucket), so repeated strategy
-- runs, rank checks and keyword runs reuse a fresh answer instead of spending
-- another serper.dev credit or tripping DuckDuckGo's rate limit.
-- Read/written by worker/src/serp-cache.ts; the worker treats rows older than
-- SEO_SERP_CACHE_HOURS (default 24) as misses and prunes rows older than 7
-- days once per process start.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Until it's applied the worker logs once and keeps only its in-memory cache.
--
-- WORKER-ONLY TABLE: accessed exclusively with the service-role key (which
-- bypasses RLS). RLS is enabled with NO policies on purpose — the admin panel
-- (anon key / authenticated session) has no business reading raw SERP
-- payloads, and nothing here should ever reach the public site.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.seo_serp_cache (
  key        text primary key,            -- serp|<normalized query>|<gl>|<hl>|<topN bucket>
  query      text not null,               -- normalized (trimmed, lowercased, single-spaced)
  gl         text not null default '',    -- region / country code
  hl         text not null default '',    -- interface language
  source     text not null,               -- serper | duckduckgo (a DDG row never stands in for Google)
  payload    jsonb not null,              -- the SerpPage (worker/src/seo.ts)
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_serp_cache_fetched_idx on public.seo_serp_cache (fetched_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Enabled, deliberately without policies: anon/authenticated get nothing;
-- the service-role worker bypasses RLS.

alter table public.seo_serp_cache enable row level security;

-- ---------------------------------------------------------------------------
-- Maintenance (the worker already does this; manual equivalent)
-- ---------------------------------------------------------------------------
-- delete from public.seo_serp_cache where fetched_at < now() - interval '7 days';
