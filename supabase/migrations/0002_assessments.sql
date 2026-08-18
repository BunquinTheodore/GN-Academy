-- 0002: assessments, questions, attempts, leads
-- The AI Readiness Test (§8) plus the generic assessment engine reused by
-- certification exams in phase 3.

-- ── assessments ─────────────────────────────────────────────────────────────
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid,        -- FK added in the phase-3 migration that creates certifications
  slug text unique not null,
  title text not null,
  type text not null check (type in ('knowledge', 'practical', 'simulation', 'diagnostic')),
  passing_score integer,
  time_limit_minutes integer,
  question_count integer,
  max_attempts integer not null default 3,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessments enable row level security;

create policy "published assessments select" on public.assessments
  for select using ( is_published = true );

-- ── questions ───────────────────────────────────────────────────────────────
-- No select policy on purpose: rows carry correct_option_id and explanation.
-- The server reads them with the service role and serves stripped versions.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  prompt text not null,
  options jsonb not null,               -- [{ "id": "a", "text": "..." }, ...]
  correct_option_id text not null,
  competency text not null,
  explanation text,
  points integer not null default 1,
  sort_order integer not null default 0
);

alter table public.questions enable row level security;

create index questions_assessment_idx on public.questions (assessment_id, sort_order);

-- ── attempts ────────────────────────────────────────────────────────────────
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id text,                          -- NULL for anonymous takers (Firebase UID otherwise)
  anon_id text,
  email text,
  score integer,
  competency_scores jsonb,
  level text,
  recommended_path text,
  passed boolean,
  answers jsonb not null default '[]',   -- [{ "questionId": "...", "optionId": "a" }]
  ip_hash text,                          -- salted hash, rate limiting only (§14)
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.attempts enable row level security;

create index attempts_anon_idx on public.attempts (anon_id);
create index attempts_user_idx on public.attempts (user_id);

create policy "insert own attempt" on public.attempts
  for insert with check ( user_id is null or (auth.jwt() ->> 'sub') = user_id );

create policy "select own attempts" on public.attempts
  for select using ( (auth.jwt() ->> 'sub') = user_id );

-- Anonymous attempt reads/writes go through server routes that check the
-- anon_id cookie against the row, using the service role.

-- ── leads ───────────────────────────────────────────────────────────────────
-- Service-role only: no policies.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text,
  full_name text,
  source text not null default 'ai-test',
  career_path text,
  anon_id text,
  attempt_id uuid references public.attempts (id) on delete set null,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create index leads_email_idx on public.leads (email);
