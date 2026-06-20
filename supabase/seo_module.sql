-- SEO keyword research module: research jobs + ranked keyword results.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts (seo_jobs /
-- seo_keywords) and worker/src/types.ts.
--
-- Same contract as the leads module: the admin panel reads with the anon key
-- (authenticated session, RLS below) and writes through server actions using
-- the service-role key. The crawler worker (worker/) polls seo_jobs with the
-- service-role key (bypasses RLS), scrapes the top ORGANIC Google results for
-- the seed query, crawls them, and writes ranked keywords back.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.seo_jobs (
  id             uuid primary key default gen_random_uuid(),
  seed           text not null,                 -- the query being researched
  region         text not null default 'tr',    -- Google gl (country) bias
  language       text not null default 'en',    -- Google hl interface language
  status         text not null default 'pending',
  progress       integer not null default 0,
  keywords_found integer not null default 0,
  ads_skipped    integer not null default 0,    -- sponsored results excluded
  pages_crawled  integer not null default 0,
  organic        jsonb not null default '[]',   -- OrganicResult[] learned from
  error          text,
  requested_by   uuid references auth.users (id),
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Same status lifecycle as scrape_jobs (the worker reuses it).
alter table public.seo_jobs
  drop constraint if exists seo_jobs_status_check;
alter table public.seo_jobs
  add constraint seo_jobs_status_check
    check (status in ('pending', 'running', 'done', 'failed', 'cancel_requested', 'cancelled'));

create table if not exists public.seo_keywords (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.seo_jobs (id) on delete cascade,
  keyword       text not null,
  score         integer not null default 0,
  frequency     integer,
  pages         integer,        -- distinct top pages the phrase appears on
  title_hits    integer,        -- top pages with it in <title>
  heading_hits  integer,        -- top pages with it in a heading
  meta_hits     integer,        -- top pages with it in meta description/keywords
  -- refined = a Groq-curated recommendation (intent/rationale set);
  -- otherwise a raw on-page-signal candidate.
  refined       boolean not null default false,
  intent        text,           -- informational | commercial | transactional | navigational
  rationale     text,
  rank          integer not null default 0,     -- display order within its set
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_jobs_status_idx       on public.seo_jobs (status);
create index if not exists seo_jobs_created_idx       on public.seo_jobs (created_at desc);
create index if not exists seo_keywords_job_id_idx    on public.seo_keywords (job_id);
create index if not exists seo_keywords_rank_idx      on public.seo_keywords (job_id, refined, rank);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table). No anon
-- access: internal data, must never reach the public site.

alter table public.seo_jobs     enable row level security;
alter table public.seo_keywords enable row level security;

drop policy if exists "seo_jobs admin read" on public.seo_jobs;
create policy "seo_jobs admin read"
  on public.seo_jobs for select to authenticated using (true);
drop policy if exists "seo_jobs admin insert" on public.seo_jobs;
create policy "seo_jobs admin insert"
  on public.seo_jobs for insert to authenticated with check (true);
drop policy if exists "seo_jobs admin update" on public.seo_jobs;
create policy "seo_jobs admin update"
  on public.seo_jobs for update to authenticated using (true);

drop policy if exists "seo_keywords admin read" on public.seo_keywords;
create policy "seo_keywords admin read"
  on public.seo_keywords for select to authenticated using (true);
drop policy if exists "seo_keywords admin insert" on public.seo_keywords;
create policy "seo_keywords admin insert"
  on public.seo_keywords for insert to authenticated with check (true);
drop policy if exists "seo_keywords admin update" on public.seo_keywords;
create policy "seo_keywords admin update"
  on public.seo_keywords for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Realtime: the admin panel subscribes to seo_jobs for live progress.
-- Adding a table to the publication twice errors, so guard it.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'seo_jobs'
  ) then
    alter publication supabase_realtime add table public.seo_jobs;
  end if;
end
$$;

-- If the block above fails (e.g. the publication doesn't exist on your
-- project), enable Realtime for seo_jobs manually:
-- Dashboard -> Database -> Replication -> supabase_realtime.
