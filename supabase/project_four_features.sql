-- FOUR — the feature reel for /work/four.
--
-- Run supabase/case_alt_text.sql FIRST (this file writes project_features.alt
-- and projects.thumbnail_alt), then run this in the Supabase SQL editor.
-- Safe to re-run: the features are replaced wholesale, which is the same
-- strategy updateProject() in src/app/admin/_actions/projects.ts uses.
--
-- Until this runs, /work/four has no project_features rows, so CaseReel
-- renders a single frame (the thumbnail) and the page reads as one block of
-- text. That is the only thing separating it from the other case pages.
--
-- Note: /work and /work/four are on hourly ISR (revalidate = 3600). A raw SQL
-- write doesn't call revalidatePublic(), so the page picks this up within the
-- hour, or immediately if you save any project in /admin/projects once.

-- 1. Cover alt text. The thumbnail is the reel's establishing frame and the
--    /work card image; both fell back to "FOUR preview".
update public.projects
   set thumbnail_alt = 'FOUR''s home screen marked DEGRADED at 25 of 30 days up, with the thirty-day grid, the GYM and FOOD levers, and the line "down 1 day — do the minimum, get it back up."',
       updated_at    = now()
 where slug = 'four';

-- 2. Role. "full product" read like a client engagement; FOUR is ours.
--    Keeps the house "Design + build · <scope>" shape used by the other cases.
update public.projects
   set role       = 'Design + build · our own product',
       updated_at = now()
 where slug = 'four';

-- 3. The reel. Four features, each a portrait phone screenshot at 742x1600 —
--    device is inherited from projects.device ('mobile'), so CaseReel draws
--    the phone shell and skips the browser chrome.
delete from public.project_features
 where project_id = (select id from public.projects where slug = 'four');

insert into public.project_features (project_id, image, title, description, alt, device, sort_order)
select p.id, v.image, v.title, v.description, v.alt, null, v.sort_order
from public.projects p
cross join (values
  (
    '/cases/four/OneTapLog.png',
    'One-tap logging',
    'Tapping a lever logs the day; the sheet opens already marked logged. What sits under it is optional — a few phrases you wrote once, there to tap if you want them. No form, no rating, no deciding whether it counted.',
    'FOUR''s logging sheet: the Reading lever marked LOGGED TODAY above tappable presets — "20 pages before bed", "one chapter", "10 minutes with coffee" — plus a "something else" field and "remove today''s reading".',
    0
  ),
  (
    '/cases/four/ThirtyDayGrid.png',
    'The record, not a score',
    'History keeps the plain facts: days up all time, longest run, and the month laid out square by square. Gaps show as gaps. Nothing is averaged, ranked, or turned into a percentage you have to interpret.',
    'FOUR''s History screen: 18 days up all time, an 18-day longest run, August 2026 laid out as a grid of day squares with today outlined, and an incidents list below.',
    1
  ),
  (
    '/cases/four/Notification.png',
    'Notifications that notice',
    'The notification says what is actually true — down three days — instead of firing the same reminder at the same hour forever. It arrives because something changed, and it is specific enough to act on from the lock screen.',
    'An iPhone lock screen at 9:41 on Wednesday, August 6, showing a single FOUR notification that reads "DOWN 3 DAYS".',
    2
  ),
  (
    '/cases/four/Proof.png',
    'Proof instead of points',
    'The only thing a full month unlocks is a sentence. Days up uncover the message a square at a time — no badge, no points, no score attached to what you logged. Miss days and you simply see less of it.',
    'FOUR''s Proof screen at 31/31 for the month: a dense grid of small squares in which the logged days have uncovered the words "KEEP GOING".',
    3
  )
) as v(image, title, description, alt, sort_order)
where p.slug = 'four';
