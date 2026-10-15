-- SEO plan-tracking module: closes the loop between a strategy and the live
-- site. A weekly pass (worker/src/plan-tracking.ts) takes the latest done
-- strategy per host and checks whether each planned page shipped, is indexable
-- and sitemapped, carries the head keyword and FAQ schema, and whether its
-- Search Console impressions moved against the strategy's baseline. The
-- results land in seo_plan_checks; worker/src/followup.ts then composes a
-- deterministic follow-up prompt per strategy into seo_strategy_followups.
-- Requires supabase/seo_strategy_module.sql first (seo_strategy_jobs).
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts
-- (seo_plan_checks / seo_strategy_followups).
--
-- Same contract as the other modules: the admin panel reads with the anon key
-- (authenticated session, RLS below); the worker inserts with the service-role
-- key (bypasses RLS), so there are no insert/update policies.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.seo_plan_checks (
  id                      uuid primary key default gen_random_uuid(),
  strategy_job_id         uuid not null references public.seo_strategy_jobs (id) on delete cascade,
  slug                    text not null,                  -- planned page path
  action                  text not null check (action in ('create', 'update')),
  checked_at              timestamptz not null default now(),
  shipped                 boolean not null default false, -- live page answers 2xx
  final_url               text,                           -- URL after redirects
  http_status             integer,                        -- null = unreachable
  in_sitemap              boolean,                        -- null = no sitemap found
  indexable               boolean,                        -- null = not shipped / not checked
  title_has_head          boolean,                        -- <title> contains the head keyword
  has_faq_schema          boolean,                        -- null = plan had < 2 FAQ entries (not required)
  impressions_7d          integer,                        -- null = Search Console not configured
  clicks_7d               integer,
  avg_position            numeric,
  baseline_impressions_7d integer,                        -- strategy's 90-day GSC baseline x 7/90; null = no baseline
  audit_issues            jsonb                           -- null = not audited; else [{severity,label,issue,fix}]
);

create table if not exists public.seo_strategy_followups (
  id              uuid primary key default gen_random_uuid(),
  strategy_job_id uuid not null references public.seo_strategy_jobs (id) on delete cascade,
  created_at      timestamptz not null default now(),
  summary         jsonb not null,                         -- SeoFollowupSummary
  prompt          text not null,                          -- the follow-up prompt to paste into the coding agent
  fingerprint     text not null                           -- hash of the findings; skip when unchanged
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists seo_plan_checks_job_idx
  on public.seo_plan_checks (strategy_job_id, checked_at desc);
create index if not exists seo_strategy_followups_job_idx
  on public.seo_strategy_followups (strategy_job_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table). No anon
-- access: internal data, must never reach the public site. Read-only for the
-- admin panel; the worker writes with the service-role key.

alter table public.seo_plan_checks enable row level security;
alter table public.seo_strategy_followups enable row level security;

drop policy if exists "seo_plan_checks admin read" on public.seo_plan_checks;
create policy "seo_plan_checks admin read"
  on public.seo_plan_checks for select to authenticated using (true);

drop policy if exists "seo_strategy_followups admin read" on public.seo_strategy_followups;
create policy "seo_strategy_followups admin read"
  on public.seo_strategy_followups for select to authenticated using (true);
