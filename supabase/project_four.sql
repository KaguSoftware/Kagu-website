-- FOUR — our own iOS app, added to /work as the first file.
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent):
-- the insert is guarded, the content update is a plain overwrite, and the
-- ordering blocks renumber deterministically rather than shifting each time.
--
-- Shapes mirror the projects / clients blocks in
-- src/lib/supabase/database.types.ts. Field values match what
-- src/app/admin/_actions/projects.ts would have written from the admin form,
-- so a later edit through /admin/projects behaves normally.
--
-- Note: /work and / are on hourly ISR (revalidate = 3600). A raw SQL write
-- doesn't call revalidatePublic(), so the pages pick this up within the hour,
-- or immediately if you save any project in /admin/projects once.

-- 1. Client row. resolveClientId() in the admin action creates clients as
--    { name, slug: slugify(name) }; this matches that.
insert into public.clients (name, slug)
select 'FOUR', 'four'
where not exists (select 1 from public.clients where name = 'FOUR');

-- 2. Project row, inserted once. sort_order -1 parks it ahead of everything
--    else; block 4 normalises it to 1. thumbnail is deliberately left null —
--    with no thumbnail the /work card renders copy-only and /work/four falls
--    back to CaseCover, which is the site's own placeholder rather than a
--    broken image. See block 6 for the one-liner once the PNG lands.
insert into public.projects (
  client_id, slug, project, cover_bg, cover_label, sort_order, featured_order
)
select c.id, 'four', 'Daily log app', 'slate-ink', 'FOUR', -1, -1
from public.clients c
where c.name = 'FOUR'
  and not exists (select 1 from public.projects where slug = 'four');

-- 3. Content. Edit here and re-run to update; thumbnail is not touched so a
--    later re-run can't wipe it.
update public.projects set
  sector   = 'iOS · Productivity',
  year     = '2026',
  role     = 'Design + build · full product',
  stack    = array[
               'React Native',
               'Expo',
               'EAS',
               'Supabase',
               'RevenueCat',
               'Expo Push'
             ],
  url      = 'https://apps.apple.com/app/id6796259740',
  lede     = 'Our own iOS app: log one small real thing a day and watch it fill a thirty-day grid. No streaks, no badges, no scoring, and a way back in if you go quiet.',
  body     = array[
               'FOUR is Kagu''s own app rather than a client build. It came out of a plain observation: the tools meant to keep you consistent are the first thing you drop when a week goes badly, because they are built to reward the weeks that go well.',
               'The whole system is one rule — log one small real thing a day. One tap, no categories to pick, no quality score. Thirty days sit in a grid so the shape of a month reads at a glance, and notifications follow your actual activity instead of firing at the same hour whether you need them or not.',
               'No streaks, no badges and no points, on purpose: each of them turns a missed day into a penalty, and a penalty is the last thing that brings someone back. Go quiet for a while and FOUR offers a way back in rather than a broken counter. The data stays yours — export or delete it at any time.'
             ],
  device   = 'mobile',
  is_featured  = true,
  is_published = true,
  updated_at   = now()
where slug = 'four';

-- 4. /work order. Renumbers every project 1..n by its current order, which
--    lands FOUR (parked at -1) on 1 and shifts the existing four to 2..5.
--    Re-running is a no-op once FOUR already holds 1.
with ranked as (
  select id, row_number() over (order by sort_order, created_at) as rn
  from public.projects
)
update public.projects p
   set sort_order = r.rn,
       updated_at = now()
  from ranked r
 where p.id = r.id
   and p.sort_order is distinct from r.rn;

-- 5. Homepage Selected Work order, same trick over the featured set only.
with ranked as (
  select id,
         row_number() over (order by featured_order nulls last, sort_order) as rn
  from public.projects
  where is_featured
)
update public.projects p
   set featured_order = r.rn,
       updated_at     = now()
  from ranked r
 where p.id = r.id
   and p.featured_order is distinct from r.rn;

-- 6. Run this once public/cases/four/ThumbnailFour.png (742x1600) is committed.
--    Until then the card and case page use the built-in no-thumbnail fallback.
-- update public.projects
--    set thumbnail = '/cases/four/ThumbnailFour.png', updated_at = now()
--  where slug = 'four';
