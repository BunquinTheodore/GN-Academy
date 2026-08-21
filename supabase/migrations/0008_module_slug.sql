-- 0008: give modules a stable identity.
--
-- Chapters had no natural key, so the course loader matched them on title
-- within a certification. That works right up until someone edits a chapter
-- title: the loader then finds no match, inserts a SECOND module, and writes
-- the lessons underneath it as new rows. Every enrolled learner's
-- lesson_progress still points at the old lesson ids, so their chapter count
-- silently drops to zero, allLessonsDone flips to false, and the final
-- assignment re-locks for people who had already finished it.
--
-- A slug fixes the identity. It is nullable because the two hand-seeded
-- courses predate it and are matched by fixed UUIDs in supabase/seed.sql.

alter table public.modules add column slug text;

-- Unique per certification rather than globally: two courses may both
-- reasonably have a chapter called "getting-started".
create unique index modules_certification_slug_idx
  on public.modules (certification_id, slug)
  where slug is not null;
