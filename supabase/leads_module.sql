-- Lead generation module: scrape jobs, scored leads, and outreach drafts.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts
-- (scrape_jobs / leads / lead_messages) and worker/src/types.ts.
--
-- The admin panel reads with the anon key (authenticated session, RLS below)
-- and writes through server actions using the service-role key. The crawler
-- worker (worker/) also uses the service-role key, so it bypasses RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.scrape_jobs (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,
  district      text not null,
  status        text not null default 'pending',
  progress      integer not null default 0,
  leads_found   integer not null default 0,
  error         text,
  requested_by  uuid references auth.users (id),
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.scrape_jobs
  drop constraint if exists scrape_jobs_status_check;
alter table public.scrape_jobs
  add constraint scrape_jobs_status_check
    check (status in ('pending', 'running', 'done', 'failed', 'cancel_requested', 'cancelled'));

create table if not exists public.leads (
  id                   uuid primary key default gen_random_uuid(),
  place_id             text not null unique,        -- Google Maps place id; dedup key
  name                 text not null,
  category             text,
  district             text,
  address              text,
  lat                  double precision,
  lng                  double precision,
  phone                text,
  website_url          text,                        -- null = no website (hottest signal)
  rating               numeric(2, 1),
  review_count         integer,
  instagram_handle     text,
  instagram_followers  integer,
  audit_flags          jsonb not null default '[]', -- AuditFlag[] (see database.types.ts)
  review_themes        jsonb not null default '[]', -- string[]
  screenshot_url       text,
  lead_score           integer not null default 0,
  pipeline_status      text not null default 'new',
  notes                text,
  source_job_id        uuid references public.scrape_jobs (id),
  contacted_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.leads
  drop constraint if exists leads_pipeline_status_check;
alter table public.leads
  add constraint leads_pipeline_status_check
    check (pipeline_status in ('new', 'queued', 'contacted', 'replied', 'meeting', 'won', 'lost', 'do_not_contact'));

create table if not exists public.lead_messages (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.leads (id) on delete cascade,
  channel        text not null default 'email',
  language       text not null default 'tr',
  subject        text,                              -- null for whatsapp variants
  body           text not null,
  variant_label  text,                              -- e.g. "Email A", "WhatsApp"
  status         text not null default 'draft',
  created_by     text not null default 'llm',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.lead_messages
  drop constraint if exists lead_messages_channel_check;
alter table public.lead_messages
  add constraint lead_messages_channel_check
    check (channel in ('email', 'whatsapp'));

alter table public.lead_messages
  drop constraint if exists lead_messages_language_check;
alter table public.lead_messages
  add constraint lead_messages_language_check
    check (language in ('tr', 'ar', 'en'));

alter table public.lead_messages
  drop constraint if exists lead_messages_status_check;
alter table public.lead_messages
  add constraint lead_messages_status_check
    check (status in ('draft', 'approved', 'rejected', 'sent'));

-- No updated_at trigger: like the rest of this codebase, updated_at is
-- maintained in code (server actions and the worker set it explicitly).

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists leads_district_idx        on public.leads (district);
create index if not exists leads_category_idx        on public.leads (category);
create index if not exists leads_score_idx           on public.leads (lead_score desc);
create index if not exists leads_pipeline_status_idx on public.leads (pipeline_status);
create index if not exists scrape_jobs_status_idx    on public.scrape_jobs (status);
create index if not exists lead_messages_status_idx  on public.lead_messages (status);
create index if not exists lead_messages_lead_id_idx on public.lead_messages (lead_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table), so
-- policies grant select/insert/update to `authenticated`. No anon access:
-- this is internal data and must never reach the public site.

alter table public.scrape_jobs   enable row level security;
alter table public.leads         enable row level security;
alter table public.lead_messages enable row level security;

drop policy if exists "scrape_jobs admin read" on public.scrape_jobs;
create policy "scrape_jobs admin read"
  on public.scrape_jobs for select to authenticated using (true);
drop policy if exists "scrape_jobs admin insert" on public.scrape_jobs;
create policy "scrape_jobs admin insert"
  on public.scrape_jobs for insert to authenticated with check (true);
drop policy if exists "scrape_jobs admin update" on public.scrape_jobs;
create policy "scrape_jobs admin update"
  on public.scrape_jobs for update to authenticated using (true);

drop policy if exists "leads admin read" on public.leads;
create policy "leads admin read"
  on public.leads for select to authenticated using (true);
drop policy if exists "leads admin insert" on public.leads;
create policy "leads admin insert"
  on public.leads for insert to authenticated with check (true);
drop policy if exists "leads admin update" on public.leads;
create policy "leads admin update"
  on public.leads for update to authenticated using (true);

drop policy if exists "lead_messages admin read" on public.lead_messages;
create policy "lead_messages admin read"
  on public.lead_messages for select to authenticated using (true);
drop policy if exists "lead_messages admin insert" on public.lead_messages;
create policy "lead_messages admin insert"
  on public.lead_messages for insert to authenticated with check (true);
drop policy if exists "lead_messages admin update" on public.lead_messages;
create policy "lead_messages admin update"
  on public.lead_messages for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: public bucket for website screenshots taken by the worker.
-- Public so screenshot_url renders with a plain <img> in the admin panel.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('lead-screenshots', 'lead-screenshots', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Realtime: the admin panel subscribes to scrape_jobs and leads changes.
-- Adding a table to the publication twice errors, so guard each one.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'scrape_jobs'
  ) then
    alter publication supabase_realtime add table public.scrape_jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end
$$;

-- If the block above fails (e.g. the publication doesn't exist on your
-- project), enable Realtime for scrape_jobs and leads manually:
-- Dashboard -> Database -> Replication -> supabase_realtime.
