-- SEO rank tracking module: weekly SERP position snapshots for the head
-- keywords of every strategy-analyzed host. Keywords are seeded automatically
-- when a strategy job completes (worker/src/seo-strategy-jobs.ts); the worker
-- re-checks each host's keywords when its latest snapshot is older than 7
-- days (worker/src/rank-tracking.ts) and the admin SEO tab charts movement.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts
-- (seo_tracked_keywords / seo_rank_snapshots) and worker/src/rank-tracking.ts.
--
-- Same contract as the other modules: the admin panel reads with the anon key
-- (authenticated session, RLS below); the worker seeds keywords and inserts
-- snapshots with the service-role key (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.seo_tracked_keywords (
  id         uuid primary key default gen_random_uuid(),
  host       text not null,               -- www-stripped, e.g. kagusoftware.com
  keyword    text not null,               -- head keyword from the page plan
  language   text not null default 'en',  -- SERP language for the check
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (host, keyword)
);

create table if not exists public.seo_rank_snapshots (
  id         uuid primary key default gen_random_uuid(),
  tracked_id uuid not null references public.seo_tracked_keywords (id) on delete cascade,
  rank       integer,                     -- position in organic results; null = not in top results
  checked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_tracked_keywords_host_idx on public.seo_tracked_keywords (host);
create index if not exists seo_rank_snapshots_tracked_idx on public.seo_rank_snapshots (tracked_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table). No anon
-- access: internal data, must never reach the public site.

alter table public.seo_tracked_keywords enable row level security;
alter table public.seo_rank_snapshots enable row level security;

drop policy if exists "seo_tracked_keywords admin read" on public.seo_tracked_keywords;
create policy "seo_tracked_keywords admin read"
  on public.seo_tracked_keywords for select to authenticated using (true);
drop policy if exists "seo_tracked_keywords admin update" on public.seo_tracked_keywords;
create policy "seo_tracked_keywords admin update"
  on public.seo_tracked_keywords for update to authenticated using (true);

drop policy if exists "seo_rank_snapshots admin read" on public.seo_rank_snapshots;
create policy "seo_rank_snapshots admin read"
  on public.seo_rank_snapshots for select to authenticated using (true);
