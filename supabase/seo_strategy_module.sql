-- SEO strategy module: strategy jobs queued from the admin panel, processed by
-- the crawler worker (worker/src/strategy.ts), full report — understanding,
-- SERP + demand evidence, head keywords, page plan, embedded audit, and the
-- master prompt — stored as one jsonb blob.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts (seo_strategy_jobs)
-- and worker/src/types.ts.
--
-- Same contract as the other modules: the admin panel reads with the anon key
-- (authenticated session, RLS below) and writes through server actions using
-- the service-role key. The worker polls seo_strategy_jobs with the
-- service-role key (bypasses RLS) and writes the report back onto the row.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.seo_strategy_jobs (
  id             uuid primary key default gen_random_uuid(),
  url            text not null,                 -- site to build the strategy for
  context        text,                          -- owner ground truth (--context)
  serp_queries   integer not null default 10,   -- candidate searches checked live
  audit_pages    integer not null default 6,    -- embedded audit cap (0 = skip)
  status         text not null default 'pending',
  progress       integer not null default 0,
  pages_planned  integer not null default 0,    -- set when done
  demand_queries integer not null default 0,    -- verified real queries collected
  audit_score    integer,                       -- embedded audit 0–100, null = skipped
  -- Full StrategyReport from worker/src/strategy.ts, master prompt included
  -- (report->>'prompt'). The detail page renders straight from it.
  report         jsonb,
  error          text,
  requested_by   uuid references auth.users (id),
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Same status lifecycle as scrape_jobs / seo_jobs (the worker reuses it).
alter table public.seo_strategy_jobs
  drop constraint if exists seo_strategy_jobs_status_check;
alter table public.seo_strategy_jobs
  add constraint seo_strategy_jobs_status_check
    check (status in ('pending', 'running', 'done', 'failed', 'cancel_requested', 'cancelled'));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_strategy_jobs_status_idx  on public.seo_strategy_jobs (status);
create index if not exists seo_strategy_jobs_created_idx on public.seo_strategy_jobs (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table). No anon
-- access: internal data, must never reach the public site.

alter table public.seo_strategy_jobs enable row level security;

drop policy if exists "seo_strategy_jobs admin read" on public.seo_strategy_jobs;
create policy "seo_strategy_jobs admin read"
  on public.seo_strategy_jobs for select to authenticated using (true);
drop policy if exists "seo_strategy_jobs admin insert" on public.seo_strategy_jobs;
create policy "seo_strategy_jobs admin insert"
  on public.seo_strategy_jobs for insert to authenticated with check (true);
drop policy if exists "seo_strategy_jobs admin update" on public.seo_strategy_jobs;
create policy "seo_strategy_jobs admin update"
  on public.seo_strategy_jobs for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Realtime: the admin panel subscribes to seo_strategy_jobs for live progress.
-- Adding a table to the publication twice errors, so guard it.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'seo_strategy_jobs'
  ) then
    alter publication supabase_realtime add table public.seo_strategy_jobs;
  end if;
end
$$;

-- If the block above fails (e.g. the publication doesn't exist on your
-- project), enable Realtime for seo_strategy_jobs manually:
-- Dashboard -> Database -> Replication -> supabase_realtime.
