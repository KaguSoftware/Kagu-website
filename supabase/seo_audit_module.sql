-- SEO site-audit module: audit jobs queued from the admin panel, processed by
-- the crawler worker (worker/src/audit.ts), full report stored as jsonb.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts (seo_audit_jobs)
-- and worker/src/types.ts.
--
-- Same contract as the other modules: the admin panel reads with the anon key
-- (authenticated session, RLS below) and writes through server actions using
-- the service-role key. The worker polls seo_audit_jobs with the service-role
-- key (bypasses RLS), crawls the site as a throttled mobile device, and writes
-- the scored report back onto the job row.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.seo_audit_jobs (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,                  -- start URL for the crawl
  max_pages     integer not null default 12,    -- crawl cap (each page = full mobile render)
  status        text not null default 'pending',
  progress      integer not null default 0,
  score         integer,                        -- overall 0–100, set when done
  pages_audited integer not null default 0,
  issues_found  integer not null default 0,
  -- Full AuditReport from worker/src/audit.ts: per-page scores/metrics,
  -- category scores, merged findings (issue/why/fix/specifics/pages), passed
  -- checks. One jsonb blob — the detail page renders straight from it.
  report        jsonb,
  error         text,
  requested_by  uuid references auth.users (id),
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Same status lifecycle as scrape_jobs / seo_jobs (the worker reuses it).
alter table public.seo_audit_jobs
  drop constraint if exists seo_audit_jobs_status_check;
alter table public.seo_audit_jobs
  add constraint seo_audit_jobs_status_check
    check (status in ('pending', 'running', 'done', 'failed', 'cancel_requested', 'cancelled'));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_audit_jobs_status_idx  on public.seo_audit_jobs (status);
create index if not exists seo_audit_jobs_created_idx on public.seo_audit_jobs (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table). No anon
-- access: internal data, must never reach the public site.

alter table public.seo_audit_jobs enable row level security;

drop policy if exists "seo_audit_jobs admin read" on public.seo_audit_jobs;
create policy "seo_audit_jobs admin read"
  on public.seo_audit_jobs for select to authenticated using (true);
drop policy if exists "seo_audit_jobs admin insert" on public.seo_audit_jobs;
create policy "seo_audit_jobs admin insert"
  on public.seo_audit_jobs for insert to authenticated with check (true);
drop policy if exists "seo_audit_jobs admin update" on public.seo_audit_jobs;
create policy "seo_audit_jobs admin update"
  on public.seo_audit_jobs for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Realtime: the admin panel subscribes to seo_audit_jobs for live progress.
-- Adding a table to the publication twice errors, so guard it.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'seo_audit_jobs'
  ) then
    alter publication supabase_realtime add table public.seo_audit_jobs;
  end if;
end
$$;

-- If the block above fails (e.g. the publication doesn't exist on your
-- project), enable Realtime for seo_audit_jobs manually:
-- Dashboard -> Database -> Replication -> supabase_realtime.
