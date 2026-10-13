-- Public contact messages from /contact, /marketing and /start-marketing.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the contact_requests block in src/lib/supabase/database.types.ts.
--
-- The public site inserts with the anon key (insert-only policy below); the
-- admin panel reads with an authenticated session and shows these alongside
-- project_inquiries in /admin/requests.

create table if not exists public.contact_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  company     text,                 -- "Company / project" field, optional
  message     text not null,
  source      text,                 -- which form sent it; see below
  status      text not null default 'new',
  created_at  timestamptz not null default now()
);

-- `source` tells the three public forms apart in /admin/requests. Added after
-- the table shipped, so it is nullable and added separately: rows written
-- before it existed read as null and the admin list labels them "Contact".
-- Until this column exists in your project, /start-marketing cannot insert at
-- all — run this file BEFORE deploying that page.
alter table public.contact_requests
  add column if not exists source text;

alter table public.contact_requests
  drop constraint if exists contact_requests_source_check;
alter table public.contact_requests
  add constraint contact_requests_source_check
    check (source is null or source in ('contact', 'marketing', 'start-marketing'));

alter table public.contact_requests
  drop constraint if exists contact_requests_status_check;
alter table public.contact_requests
  add constraint contact_requests_status_check
    check (status in ('new', 'contacted', 'archived'));

create index if not exists contact_requests_created_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;

-- Public site inserts with the anon key. Insert-only: no anon select/update/
-- delete, so submitted data can never be read back from the public site.
drop policy if exists "contact_requests public insert" on public.contact_requests;
create policy "contact_requests public insert"
  on public.contact_requests for insert to anon with check (true);

-- Any authenticated user is an admin in this project (see leads_module.sql).
drop policy if exists "contact_requests admin read" on public.contact_requests;
create policy "contact_requests admin read"
  on public.contact_requests for select to authenticated using (true);
drop policy if exists "contact_requests admin update" on public.contact_requests;
create policy "contact_requests admin update"
  on public.contact_requests for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Realtime: the admin sidebar badge and /admin/requests subscribe to changes
-- on contact_requests AND project_inquiries (the latter was never added to
-- the publication). Adding a table twice errors, so guard each one.
-- No `replica identity full` needed: the badge re-fetches counts instead of
-- diffing UPDATE payloads.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'contact_requests'
  ) then
    alter publication supabase_realtime add table public.contact_requests;
  end if;

  -- project_inquiries is created by project_inquiries.sql — skip (don't fail)
  -- if that script hasn't been run yet; re-run this file after it to enable
  -- realtime there too.
  if to_regclass('public.project_inquiries') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'project_inquiries'
  ) then
    alter publication supabase_realtime add table public.project_inquiries;
  end if;
end
$$;

-- If the block above fails (e.g. the publication doesn't exist on your
-- project), enable Realtime for contact_requests and project_inquiries
-- manually: Dashboard -> Database -> Replication -> supabase_realtime.
