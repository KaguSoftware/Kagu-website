-- Public project inquiries from /start-project (the package builder).
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the project_inquiries block in src/lib/supabase/database.types.ts.
--
-- The public site inserts with the anon key (insert-only policy below); the
-- admin panel reads with an authenticated session. The feature/type catalog
-- lives in src/components/start-project/catalog.ts — no DB-side check on
-- website_type/features so prices and the catalog stay editable in code.

create table if not exists public.project_inquiries (
  id              uuid primary key default gen_random_uuid(),
  website_type    text not null,
  features        jsonb not null default '[]'::jsonb,  -- string[] of feature ids
  base_price      integer not null,
  features_price  integer not null,
  total_price     integer not null,                    -- snapshot at submit time
  currency        text not null default 'USD',
  name            text not null,
  email           text not null,
  company         text,
  notes           text,
  status          text not null default 'new',
  created_at      timestamptz not null default now()
);

alter table public.project_inquiries
  drop constraint if exists project_inquiries_status_check;
alter table public.project_inquiries
  add constraint project_inquiries_status_check
    check (status in ('new', 'contacted', 'archived'));

create index if not exists project_inquiries_created_idx
  on public.project_inquiries (created_at desc);

alter table public.project_inquiries enable row level security;

-- Public site inserts with the anon key. Insert-only: no anon select/update/
-- delete, so submitted data can never be read back from the public site.
drop policy if exists "project_inquiries public insert" on public.project_inquiries;
create policy "project_inquiries public insert"
  on public.project_inquiries for insert to anon with check (true);

-- Any authenticated user is an admin in this project (see leads_module.sql).
drop policy if exists "project_inquiries admin read" on public.project_inquiries;
create policy "project_inquiries admin read"
  on public.project_inquiries for select to authenticated using (true);
drop policy if exists "project_inquiries admin update" on public.project_inquiries;
create policy "project_inquiries admin update"
  on public.project_inquiries for update to authenticated using (true);
