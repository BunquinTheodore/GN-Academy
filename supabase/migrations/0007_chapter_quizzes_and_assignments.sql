-- 0007: chapter quizzes and reviewed assignments.
--
-- Until now a certification had exactly one assessment at the end, and passing
-- it issued the credential automatically. Two new shapes are needed:
--
--  * a short quiz attached to each MODULE, taken as you finish that chapter,
--    which is formative — you retake it until it sticks;
--  * a final ASSIGNMENT that a human reads. The credential is not a function
--    of a score any more; for these courses it is released when a reviewer
--    says the work is good enough.
--
-- The existing exam-only courses are untouched: requires_assignment defaults
-- to false and assessments without a module_id behave exactly as before.

-- ── chapter quizzes ─────────────────────────────────────────────────────────
alter table public.assessments
  add column module_id uuid references public.modules (id) on delete cascade;

create index assessments_module_idx on public.assessments (module_id);

-- 'chapter' is a distinct type rather than a flag because the credential
-- issuance path keys off it: passing a chapter quiz must never issue anything.
alter table public.assessments drop constraint assessments_type_check;
alter table public.assessments
  add constraint assessments_type_check
  check (type in ('knowledge', 'practical', 'simulation', 'diagnostic', 'chapter'));

-- ── assignments ─────────────────────────────────────────────────────────────
alter table public.certifications
  add column requires_assignment boolean not null default false;

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications (id) on delete cascade,
  title text not null,
  brief_mdx text not null,
  -- What the reviewer checks, shown to the learner too: someone should never
  -- have to guess what "good" means before spending two hours on it.
  criteria text[] not null default '{}',
  min_words integer not null default 200,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (certification_id)
);

alter table public.assignments enable row level security;

create policy "assignments of published certifications" on public.assignments
  for select using (
    is_published = true
    and exists (
      select 1 from public.certifications c
      where c.id = assignments.certification_id and c.is_published = true
    )
  );

create trigger assignments_touch_updated_at
  before update on public.assignments
  for each row execute function public.touch_updated_at();

-- ── submissions ─────────────────────────────────────────────────────────────
-- One row per learner per assignment; resubmitting after a revision request
-- updates it in place and the attempt counter goes up, so the history of how
-- many passes it took is not lost even though only the latest text is kept.
create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id text not null references public.profiles (id) on delete cascade,
  content text not null,
  link_url text,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'changes_requested', 'rejected')),
  attempt_count integer not null default 1,
  reviewer_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

alter table public.assignment_submissions enable row level security;

-- A learner may read their own submission and the reviewer's note. Writes go
-- through server actions: status and reviewer_note must never be settable by
-- the person being reviewed.
create policy "own submission select" on public.assignment_submissions
  for select using ( (auth.jwt() ->> 'sub') = user_id );

create index assignment_submissions_status_idx
  on public.assignment_submissions (status, submitted_at);

create trigger assignment_submissions_touch_updated_at
  before update on public.assignment_submissions
  for each row execute function public.touch_updated_at();
