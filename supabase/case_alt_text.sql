-- Alt text for case-study screenshots.
--
-- Run this in the Supabase SQL editor. Order against the deploy doesn't
-- matter: content.ts reads project_features(*) rather than naming the
-- columns, so the code works whether or not they exist yet, and both
-- readers fall back to the old value (feature.title / "<client> preview").
--
-- Safe to re-run.
--
-- Why: CaseReel rendered every screenshot with alt={f.title}, which names the
-- feature ("One-tap logging") instead of describing the screen. Same for the
-- /work thumbnails, which all read "<client> preview".

alter table public.project_features
  add column if not exists alt text;

alter table public.projects
  add column if not exists thumbnail_alt text;

comment on column public.project_features.alt is
  'Alt text describing what the screenshot shows. Falls back to title when null.';
comment on column public.projects.thumbnail_alt is
  'Alt text describing what the cover screenshot shows. Falls back to "<client> preview" when null.';
