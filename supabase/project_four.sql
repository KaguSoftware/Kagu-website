-- FOUR — our own iOS app, added to /work as the first file.
-- Run this in the Supabase SQL editor. Safe to re-run (idempotent):
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
--    else; block 4 normalises it to 1. The thumbnail is set separately in
--    block 6 so re-running this file can never clear it.
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
  lede     = 'Our own iOS app: pick your levers, log one small real thing a day, and fill a rolling thirty-day window. No streaks and no badges — a quiet week degrades the window rather than resetting a counter, so there is always a way back in.',
  body     = array[
               'FOUR is Kagu''s own app rather than a client build. It came out of a plain observation: the tools meant to keep you consistent are the first thing you drop when a week goes badly, because they are built to reward the weeks that go well.',
               'The whole system is one rule — log one small real thing a day, against levers you set yourself. Thirty days sit in a grid so the shape of a month reads at a glance, and notifications follow your actual activity instead of firing at the same hour whether you need them or not.',
               'No streaks and no badges, on purpose: a streak turns one missed day into a reason to stop, which is the opposite of useful. Miss a day here and the thirty-day window degrades rather than resets, and the app asks for the minimum instead of your best. The data stays yours — export or delete it at any time.'
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

-- 6. Thumbnail. public/cases/four/ThumbnailFour.jpeg is a 742x1600 screen
--    capture, the same geometry as the UpperDeck shot, so it fills the phone
--    frame's 9 / 19.5 aspect without cropping.
update public.projects
   set thumbnail  = '/cases/four/ThumbnailFour.jpeg',
       updated_at = now()
 where slug = 'four';
