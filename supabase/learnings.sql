-- Learnings module: internal team knowledge base (markdown entries + images).
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).
-- Mirrors the shape in src/lib/supabase/database.types.ts (learnings).
--
-- The admin panel reads with the anon key (authenticated session, RLS below)
-- and writes through server actions using the service-role key.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.learnings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text not null default '',  -- one-line hook shown on index cards
  body         text not null default '',  -- markdown
  tags         text[] not null default '{}',
  author_email text not null,             -- snapshot, no FK: entries outlive accounts
  author_name  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- No updated_at trigger: like the rest of this codebase, updated_at is
-- maintained in code (server actions set it explicitly).

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists learnings_tags_idx    on public.learnings using gin (tags);
create index if not exists learnings_created_idx on public.learnings (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Any authenticated user is an admin in this project (no roles table), so
-- policies grant full access to `authenticated`. No anon access: this is
-- internal documentation and must never reach the public site.

alter table public.learnings enable row level security;

drop policy if exists "learnings admin read" on public.learnings;
create policy "learnings admin read"
  on public.learnings for select to authenticated using (true);
drop policy if exists "learnings admin insert" on public.learnings;
create policy "learnings admin insert"
  on public.learnings for insert to authenticated with check (true);
drop policy if exists "learnings admin update" on public.learnings;
create policy "learnings admin update"
  on public.learnings for update to authenticated using (true);
drop policy if exists "learnings admin delete" on public.learnings;
create policy "learnings admin delete"
  on public.learnings for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: public bucket for pasted/dropped screenshots in learning entries.
-- Public so markdown image URLs render with a plain <img> in the admin panel.
-- Uploads go through server actions with the service-role key (bypass RLS).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('learning-images', 'learning-images', true)
on conflict (id) do nothing;
