-- SEO speed history module: Lighthouse + CrUX Core Web Vitals snapshots for
-- every URL the speed tool has been run on. A CLI run (`npm run seo:speed`)
-- seeds the URL and saves that report's medians; the worker re-checks each
-- tracked URL when its latest Lighthouse snapshot is older than 7 days
-- (worker/src/speed-tracking.ts) and the admin SEO tab charts the trend.
-- CrUX rows (source = 'crux') are weekly real-user p75s backfilled from the
-- CrUX History API (`npm run seo:speed -- --field-only <url>`), ~40 weeks deep.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts
-- (seo_speed_tracked_urls / seo_speed_snapshots) and worker/src/speed-tracking.ts.
--
-- Same contract as the other modules: the admin panel reads with the anon key
-- (authenticated session, RLS below); the worker/CLI seed URLs and insert
-- snapshots with the service-role key (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.seo_speed_tracked_urls (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,               -- normalized final URL the report ran against
  host       text not null,               -- www-stripped, e.g. kagusoftware.com
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (url)
);

create table if not exists public.seo_speed_snapshots (
  id             uuid primary key default gen_random_uuid(),
  tracked_id     uuid not null references public.seo_speed_tracked_urls (id) on delete cascade,
  strategy       text not null check (strategy in ('mobile', 'desktop')),
  -- 'lighthouse' = median of a lab run (scores + lab metrics filled);
  -- 'crux' = one weekly real-user CrUX History point (p75 metrics only).
  source         text not null default 'lighthouse' check (source in ('lighthouse', 'crux')),
  score          integer,                 -- median Lighthouse performance, 0-100
  accessibility  integer,
  best_practices integer,
  seo            integer,
  runs           integer,                 -- Lighthouse runs behind the medians
  fcp_ms         integer,
  lcp_ms         integer,
  tbt_ms         integer,                 -- lab only
  cls            numeric,
  si_ms          integer,                 -- lab only (Speed Index)
  ttfb_ms        integer,
  inp_ms         integer,                 -- field only (CrUX)
  -- Self-monitoring: set when this snapshot's performance score dropped more
  -- than 5 points vs the previous Lighthouse snapshot of the same URL+strategy.
  regression     boolean not null default false,
  checked_at     timestamptz not null default now(),
  -- Makes CrUX backfill idempotent: re-running --field-only upserts the same
  -- weekly points instead of duplicating them.
  unique (tracked_id, strategy, source, checked_at)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_speed_tracked_urls_host_idx on public.seo_speed_tracked_urls (host);
create index if not exists seo_speed_snapshots_tracked_idx on public.seo_speed_snapshots (tracked_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table). No anon
-- access: internal data, must never reach the public site.

alter table public.seo_speed_tracked_urls enable row level security;
alter table public.seo_speed_snapshots enable row level security;

drop policy if exists "seo_speed_tracked_urls admin read" on public.seo_speed_tracked_urls;
create policy "seo_speed_tracked_urls admin read"
  on public.seo_speed_tracked_urls for select to authenticated using (true);
drop policy if exists "seo_speed_tracked_urls admin update" on public.seo_speed_tracked_urls;
create policy "seo_speed_tracked_urls admin update"
  on public.seo_speed_tracked_urls for update to authenticated using (true);

drop policy if exists "seo_speed_snapshots admin read" on public.seo_speed_snapshots;
create policy "seo_speed_snapshots admin read"
  on public.seo_speed_snapshots for select to authenticated using (true);
