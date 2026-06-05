-- Team members for the public /team page, managed from the admin panel.
-- Run this once in the Supabase SQL editor. Mirrors the shape in
-- src/lib/supabase/database.types.ts (team_members).

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null,
  bio         text,
  image_url   text,
  segment     text not null default 'associate'
                check (segment in ('cofounder', 'associate')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists team_members_segment_sort_idx
  on public.team_members (segment, sort_order);

alter table public.team_members enable row level security;

-- Public (anon) read — the public site reads with the anon key. Writes go
-- through the service-role key in the admin server actions, which bypasses RLS.
drop policy if exists "team_members public read" on public.team_members;
create policy "team_members public read"
  on public.team_members for select
  using (true);
